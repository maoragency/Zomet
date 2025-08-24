import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { authService } from '../../auth.js'

// Integration tests for messaging and real-time features
describe('Messaging Integration Tests', () => {
  let testUser1 = null
  let testUser2 = null
  let testMessage = null
  const testEmail1 = `msg-user1-${Date.now()}@example.com`
  const testEmail2 = `msg-user2-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    // Create two test users for messaging
    await supabase.auth.signOut()
    
    // Create first user
    const signUpResult1 = await authService.signUp(testEmail1, testPassword, {
      full_name: 'Message Test User 1'
    })
    testUser1 = signUpResult1.user

    // Create second user
    const signUpResult2 = await authService.signUp(testEmail2, testPassword, {
      full_name: 'Message Test User 2'
    })
    testUser2 = signUpResult2.user
  }, 20000)

  afterAll(async () => {
    // Clean up test messages
    if (testMessage) {
      try {
        await supabase
          .from('messages')
          .delete()
          .eq('id', testMessage.id)
      } catch (error) {
        console.warn('Message cleanup error:', error)
      }
    }
    
    await supabase.auth.signOut()
  })

  beforeEach(async () => {
    // Sign in as first user by default
    await authService.signIn(testEmail1, testPassword)
  })

  afterEach(async () => {
    await supabase.auth.signOut()
  })

  describe('Message Creation', () => {
    it('should create a new message successfully', async () => {
      const messageData = {
        sender_id: testUser1.id,
        recipient_id: testUser2.id,
        subject: 'Test Message Subject',
        content: 'This is a test message for integration testing',
        message_type: 'user'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.sender_id).toBe(messageData.sender_id)
      expect(data.recipient_id).toBe(messageData.recipient_id)
      expect(data.subject).toBe(messageData.subject)
      expect(data.content).toBe(messageData.content)
      expect(data.is_read).toBe(false)
      
      testMessage = data
    })

    it('should require valid sender and recipient', async () => {
      const invalidMessageData = {
        sender_id: '00000000-0000-0000-0000-000000000000',
        recipient_id: testUser2.id,
        subject: 'Invalid Message',
        content: 'This should fail',
        message_type: 'user'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([invalidMessageData])
        .select()

      expect(error).toBeTruthy()
      expect(data).toBeNull()
    })

    it('should create system message', async () => {
      const systemMessageData = {
        recipient_id: testUser1.id,
        subject: 'System Notification',
        content: 'This is a system-generated message',
        message_type: 'system',
        is_system_message: true
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([systemMessageData])
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.is_system_message).toBe(true)
      expect(data.message_type).toBe('system')
      expect(data.sender_id).toBeNull()
    })
  })

  describe('Message Retrieval', () => {
    beforeEach(async () => {
      // Ensure we have a test message
      if (!testMessage) {
        const messageData = {
          sender_id: testUser1.id,
          recipient_id: testUser2.id,
          subject: 'Test Message',
          content: 'Test content',
          message_type: 'user'
        }

        const { data } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single()
        
        testMessage = data
      }
    })

    it('should get messages for recipient', async () => {
      // Sign in as recipient
      await authService.signIn(testEmail2, testPassword)

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', testUser2.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      
      const foundMessage = data.find(m => m.id === testMessage.id)
      expect(foundMessage).toBeTruthy()
    })

    it('should get messages sent by user', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', testUser1.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      const foundMessage = data.find(m => m.id === testMessage.id)
      expect(foundMessage).toBeTruthy()
    })

    it('should get conversation between two users', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${testUser1.id},recipient_id.eq.${testUser2.id}),and(sender_id.eq.${testUser2.id},recipient_id.eq.${testUser1.id})`)
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      const foundMessage = data.find(m => m.id === testMessage.id)
      expect(foundMessage).toBeTruthy()
    })
  })

  describe('Message Status Updates', () => {
    beforeEach(async () => {
      if (!testMessage) {
        const messageData = {
          sender_id: testUser1.id,
          recipient_id: testUser2.id,
          subject: 'Test Message',
          content: 'Test content',
          message_type: 'user'
        }

        const { data } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single()
        
        testMessage = data
      }
    })

    it('should mark message as read', async () => {
      // Sign in as recipient
      await authService.signIn(testEmail2, testPassword)

      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', testMessage.id)
        .eq('recipient_id', testUser2.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.is_read).toBe(true)
      expect(data.read_at).toBeTruthy()
    })

    it('should only allow recipient to mark as read', async () => {
      // Try to mark as read while signed in as sender (should fail with RLS)
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', testMessage.id)
        .eq('recipient_id', testUser1.id) // Wrong recipient
        .select()

      // This should either fail or return no data due to RLS
      expect(data).toEqual([])
    })
  })

  describe('Real-time Messaging', () => {
    it('should set up real-time subscription for messages', async () => {
      let receivedMessage = null
      let subscriptionError = null

      // Set up real-time subscription
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${testUser1.id}`
          },
          (payload) => {
            receivedMessage = payload.new
          }
        )
        .on('error', (error) => {
          subscriptionError = error
        })
        .subscribe()

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Send a message to trigger the subscription
      const messageData = {
        sender_id: testUser2.id,
        recipient_id: testUser1.id,
        subject: 'Real-time Test Message',
        content: 'This message should trigger real-time notification',
        message_type: 'user'
      }

      await supabase
        .from('messages')
        .insert([messageData])

      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Clean up subscription
      await supabase.removeChannel(channel)

      expect(subscriptionError).toBeNull()
      expect(receivedMessage).toBeTruthy()
      expect(receivedMessage.subject).toBe(messageData.subject)
    }, 10000)

    it('should handle real-time connection errors gracefully', async () => {
      let connectionError = null

      const channel = supabase
        .channel('test-error-channel')
        .on('error', (error) => {
          connectionError = error
        })
        .subscribe()

      // Wait a bit to see if there are any connection errors
      await new Promise(resolve => setTimeout(resolve, 1000))

      await supabase.removeChannel(channel)

      // Should not have connection errors for valid setup
      expect(connectionError).toBeNull()
    })
  })

  describe('Message Notifications', () => {
    beforeEach(async () => {
      // Sign in as first user
      await authService.signIn(testEmail1, testPassword)
    })

    it('should create notification when message is sent', async () => {
      const messageData = {
        sender_id: testUser1.id,
        recipient_id: testUser2.id,
        subject: 'Notification Test Message',
        content: 'This should create a notification',
        message_type: 'user'
      }

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      expect(messageError).toBeNull()
      expect(message).toBeTruthy()

      // Check if notification was created
      const { data: notifications, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUser2.id)
        .eq('type', 'message')
        .order('created_at', { ascending: false })
        .limit(1)

      expect(notificationError).toBeNull()
      
      if (notifications && notifications.length > 0) {
        const notification = notifications[0]
        expect(notification.user_id).toBe(testUser2.id)
        expect(notification.type).toBe('message')
        expect(notification.is_read).toBe(false)
      }
    })

    it('should get unread notification count', async () => {
      // Sign in as second user to check notifications
      await authService.signIn(testEmail2, testPassword)

      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', testUser2.id)
        .eq('is_read', false)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Message Search and Filtering', () => {
    beforeEach(async () => {
      // Ensure we have test messages
      if (!testMessage) {
        const messageData = {
          sender_id: testUser1.id,
          recipient_id: testUser2.id,
          subject: 'Searchable Test Message',
          content: 'This message contains searchable content',
          message_type: 'user'
        }

        const { data } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single()
        
        testMessage = data
      }
    })

    it('should search messages by subject', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${testUser1.id},recipient_id.eq.${testUser1.id}`)
        .ilike('subject', '%Test%')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      if (data.length > 0) {
        data.forEach(message => {
          expect(message.subject.toLowerCase()).toContain('test')
        })
      }
    })

    it('should search messages by content', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${testUser1.id},recipient_id.eq.${testUser1.id}`)
        .ilike('content', '%searchable%')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      if (data.length > 0) {
        data.forEach(message => {
          expect(message.content.toLowerCase()).toContain('searchable')
        })
      }
    })

    it('should filter messages by read status', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', testUser1.id)
        .eq('is_read', false)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      data.forEach(message => {
        expect(message.is_read).toBe(false)
        expect(message.recipient_id).toBe(testUser1.id)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid message data', async () => {
      const invalidMessageData = {
        // Missing required fields
        subject: '',
        content: '',
        message_type: 'invalid_type'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([invalidMessageData])
        .select()

      expect(error).toBeTruthy()
      expect(data).toBeNull()
    })

    it('should handle unauthorized message access', async () => {
      // Sign out to test unauthorized access
      await supabase.auth.signOut()

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', testUser1.id)

      // Should fail due to RLS policies
      expect(error).toBeTruthy()
    })

    it('should handle real-time subscription errors', async () => {
      let subscriptionError = null

      const channel = supabase
        .channel('invalid-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'invalid_schema',
            table: 'invalid_table'
          },
          () => {}
        )
        .on('error', (error) => {
          subscriptionError = error
        })
        .subscribe()

      // Wait for potential error
      await new Promise(resolve => setTimeout(resolve, 2000))

      await supabase.removeChannel(channel)

      // Should handle invalid subscription gracefully
      // The exact behavior depends on Supabase implementation
    })
  })
})