import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Messaging service for Supabase operations
 * Handles internal messaging system with real-time capabilities
 */

export const messagingService = {
  /**
   * Send a message to a user
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Response with created message or error
   */
  async sendMessage(messageData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to send messages')

      // Validate required fields
      const validation = validateRequiredFields(messageData, ['recipient_id', 'content'])
      if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
      }

      // Sanitize content
      const sanitizedData = {
        sender_id: user.id,
        recipient_id: messageData.recipient_id,
        subject: messageData.subject ? sanitizeInput(messageData.subject) : null,
        content: sanitizeInput(messageData.content),
        message_type: messageData.message_type || 'user',
        related_vehicle_id: messageData.related_vehicle_id || null,
        is_system_message: messageData.is_system_message || false
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([sanitizedData])
        .select(`
          *,
          sender:sender_id(id, full_name, email),
          recipient:recipient_id(id, full_name, email),
          related_vehicle:related_vehicle_id(id, title, manufacturer, model)
        `)
        .single()

      if (error) {
        logError(error, 'messagingService.sendMessage', { messageData: sanitizedData })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'message_sent', 'message', data.id, {
        recipient_id: messageData.recipient_id,
        subject: messageData.subject
      })

      return createSuccessResponse(data, 'הודעה נשלחה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'messagingService.sendMessage')
    }
  },

  /**
   * Get user's inbox messages
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with messages or error
   */
  async getInbox(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        page = 1,
        pageSize = 20,
        messageType = null,
        isRead = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, full_name, email),
          related_vehicle:related_vehicle_id(id, title, manufacturer, model)
        `)
        .eq('recipient_id', user.id)

      // Apply filters
      if (messageType) {
        query = query.eq('message_type', messageType)
      }
      if (isRead !== null) {
        query = query.eq('is_read', isRead)
      }

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const ascending = !isDescending
      query = query.order(field, { ascending })

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'messagingService.getInbox', options)
        throw error
      }

      return createSuccessResponse({
        messages: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'messagingService.getInbox')
    }
  },

  /**
   * Get user's sent messages
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with messages or error
   */
  async getSentMessages(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        page = 1,
        pageSize = 20,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('messages')
        .select(`
          *,
          recipient:recipient_id(id, full_name, email),
          related_vehicle:related_vehicle_id(id, title, manufacturer, model)
        `)
        .eq('sender_id', user.id)

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const ascending = !isDescending
      query = query.order(field, { ascending })

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'messagingService.getSentMessages', options)
        throw error
      }

      return createSuccessResponse({
        messages: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'messagingService.getSentMessages')
    }
  },

  /**
   * Get conversation between two users
   * @param {string} otherUserId - Other user's ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with conversation messages or error
   */
  async getConversation(otherUserId, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        page = 1,
        pageSize = 50,
        sortBy = 'created_at'
      } = options

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, full_name, email),
          recipient:recipient_id(id, full_name, email),
          related_vehicle:related_vehicle_id(id, title, manufacturer, model)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const ascending = !isDescending
      query = query.order(field, { ascending })

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'messagingService.getConversation', { otherUserId, options })
        throw error
      }

      return createSuccessResponse({
        messages: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'messagingService.getConversation')
    }
  },

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Response with updated message or error
   */
  async markAsRead(messageId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('recipient_id', user.id) // Ensure user can only mark their own messages as read
        .select()
        .single()

      if (error) {
        logError(error, 'messagingService.markAsRead', { messageId })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'messagingService.markAsRead')
    }
  },

  /**
   * Mark multiple messages as read
   * @param {Array} messageIds - Array of message IDs
   * @returns {Promise<Object>} Response with updated messages or error
   */
  async markMultipleAsRead(messageIds) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .eq('recipient_id', user.id)
        .select()

      if (error) {
        logError(error, 'messagingService.markMultipleAsRead', { messageIds })
        throw error
      }

      return createSuccessResponse(data, `${data.length} הודעות סומנו כנקראו`)
    } catch (error) {
      return handleApiError(error, 'messagingService.markMultipleAsRead')
    }
  },

  /**
   * Delete message (soft delete - mark as deleted)
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Response with success status or error
   */
  async deleteMessage(messageId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is sender or recipient
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      if (message.sender_id !== user.id && message.recipient_id !== user.id) {
        throw new Error('אין לך הרשאה למחוק הודעה זו')
      }

      // For now, we'll do hard delete. In production, consider soft delete
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) {
        logError(error, 'messagingService.deleteMessage', { messageId })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'message_deleted', 'message', messageId)

      return createSuccessResponse({ deleted: true }, 'הודעה נמחקה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'messagingService.deleteMessage')
    }
  },

  /**
   * Get unread message count
   * @returns {Promise<Object>} Response with unread count or error
   */
  async getUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) {
        logError(error, 'messagingService.getUnreadCount')
        throw error
      }

      return createSuccessResponse({ count: count || 0 })
    } catch (error) {
      return handleApiError(error, 'messagingService.getUnreadCount')
    }
  },

  /**
   * Send system message to user
   * @param {string} recipientId - Recipient user ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Response with created message or error
   */
  async sendSystemMessage(recipientId, messageData) {
    try {
      const sanitizedData = {
        sender_id: null, // System messages have no sender
        recipient_id: recipientId,
        subject: messageData.subject ? sanitizeInput(messageData.subject) : null,
        content: sanitizeInput(messageData.content),
        message_type: 'system',
        is_system_message: true,
        related_vehicle_id: messageData.related_vehicle_id || null
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([sanitizedData])
        .select(`
          *,
          recipient:recipient_id(id, full_name, email),
          related_vehicle:related_vehicle_id(id, title, manufacturer, model)
        `)
        .single()

      if (error) {
        logError(error, 'messagingService.sendSystemMessage', { recipientId, messageData: sanitizedData })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'messagingService.sendSystemMessage')
    }
  },

  /**
   * Get message statistics for user
   * @returns {Promise<Object>} Response with message statistics or error
   */
  async getMessageStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Get inbox stats
      const { data: inboxStats, error: inboxError } = await supabase
        .from('messages')
        .select('is_read, message_type')
        .eq('recipient_id', user.id)

      if (inboxError) throw inboxError

      // Get sent stats
      const { count: sentCount, error: sentError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)

      if (sentError) throw sentError

      const stats = {
        inbox: {
          total: inboxStats.length,
          unread: inboxStats.filter(m => !m.is_read).length,
          read: inboxStats.filter(m => m.is_read).length,
          system: inboxStats.filter(m => m.message_type === 'system').length,
          user: inboxStats.filter(m => m.message_type === 'user').length
        },
        sent: {
          total: sentCount || 0
        }
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'messagingService.getMessageStats')
    }
  },

  /**
   * Subscribe to real-time message updates with enhanced features
   * @param {Function} callback - Callback function for new messages
   * @param {Object} options - Subscription options
   * @returns {Object} Subscription object with enhanced features
   */
  subscribeToMessages(callback, options = {}) {
    try {
      const { data: { user } } = supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const channelName = options.channelName || `messages-${user.id}`
      const channel = supabase.channel(channelName)

      // Subscribe to new messages
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          // Enhance payload with additional data
          const enhancedPayload = {
            ...payload,
            timestamp: new Date().toISOString(),
            type: 'new_message'
          }
          callback(enhancedPayload)
        }
      )

      // Subscribe to message updates (read receipts)
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          const enhancedPayload = {
            ...payload,
            timestamp: new Date().toISOString(),
            type: 'message_updated'
          }
          callback(enhancedPayload)
        }
      )

      const subscription = channel.subscribe((status) => {
        if (options.onStatusChange) {
          options.onStatusChange(status)
        }
      })

      return {
        subscription,
        channel,
        unsubscribe: () => channel.unsubscribe()
      }
    } catch (error) {
      logError(error, 'messagingService.subscribeToMessages')
      throw error
    }
  },

  /**
   * Subscribe to conversation-specific real-time updates
   * @param {string} conversationId - Conversation ID
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription object
   */
  subscribeToConversation(conversationId, callback) {
    try {
      const { data: { user } } = supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const channel = supabase.channel(`conversation-${conversationId}`)

      // Subscribe to new messages in conversation
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${user.id}))`
        },
        (payload) => callback({ ...payload, type: 'new_message' })
      )

      // Subscribe to typing indicators
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callback({ ...payload, type: 'typing_indicator' })
      )

      // Subscribe to read receipts
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${user.id}))`
        },
        (payload) => callback({ ...payload, type: 'read_receipt' })
      )

      const subscription = channel.subscribe()

      return {
        subscription,
        channel,
        unsubscribe: () => channel.unsubscribe()
      }
    } catch (error) {
      logError(error, 'messagingService.subscribeToConversation')
      throw error
    }
  },

  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   * @param {boolean} isTyping - Whether user is typing
   * @returns {Promise<Object>} Response
   */
  async sendTypingIndicator(conversationId, isTyping) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      return createSuccessResponse({ typing: isTyping })
    } catch (error) {
      return handleApiError(error, 'messagingService.sendTypingIndicator')
    }
  },

  /**
   * Update user presence status
   * @param {boolean} isOnline - Whether user is online
   * @returns {Promise<Object>} Response
   */
  async updatePresence(isOnline) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })

      if (error) throw error

      return createSuccessResponse({ online: isOnline })
    } catch (error) {
      return handleApiError(error, 'messagingService.updatePresence')
    }
  },

  /**
   * Get user presence status
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Response with presence data
   */
  async getUserPresence(userId) {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const presence = data || { is_online: false, last_seen: null }
      
      // Consider user online if last seen within 5 minutes
      const isRecentlyActive = presence.last_seen && 
        (new Date() - new Date(presence.last_seen)) < 5 * 60 * 1000

      return createSuccessResponse({
        ...presence,
        is_online: presence.is_online || isRecentlyActive
      })
    } catch (error) {
      return handleApiError(error, 'messagingService.getUserPresence')
    }
  },

  /**
   * Mark message as delivered
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Response
   */
  async markAsDelivered(messageId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('messages')
        .update({ 
          delivered_at: new Date().toISOString(),
          delivery_status: 'delivered'
        })
        .eq('id', messageId)
        .eq('recipient_id', user.id)
        .select()
        .single()

      if (error) throw error

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'messagingService.markAsDelivered')
    }
  },

  /**
   * Get message delivery status
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Response with delivery status
   */
  async getDeliveryStatus(messageId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('messages')
        .select('delivery_status, delivered_at, is_read, created_at')
        .eq('id', messageId)
        .eq('sender_id', user.id) // Only sender can check delivery status
        .single()

      if (error) throw error

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'messagingService.getDeliveryStatus')
    }
  },

  /**
   * Log user activity (helper method)
   * @private
   */
  async logActivity(userId, action, resourceType, resourceId, details = {}) {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details
        }])
    } catch (error) {
      // Don't throw error for activity logging - it's not critical
      logError(error, 'messagingService.logActivity')
    }
  }
}

export default messagingService