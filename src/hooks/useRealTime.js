import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Custom hook for managing real-time connections and subscriptions
 * Provides centralized real-time functionality with connection management
 */
export const useRealTime = () => {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const subscriptionsRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Connection status monitoring
  useEffect(() => {
    if (!user) return

    const handleConnectionChange = (status) => {
      setIsConnected(status === 'SUBSCRIBED')
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnectionError('Connection lost')
        handleReconnect()
      } else if (status === 'SUBSCRIBED') {
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }
    }

    // Monitor connection status
    const channel = supabase.channel('connection-monitor')
    channel.on('system', {}, handleConnectionChange)
    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Reconnection logic
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionError('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1
      // Resubscribe to all active channels
      subscriptionsRef.current.forEach((subscription, key) => {
        subscription.unsubscribe()
        const newSubscription = subscription.subscribe()
        subscriptionsRef.current.set(key, newSubscription)
      })
    }, delay)
  }, [])

  // Subscribe to a channel with automatic cleanup
  const subscribe = useCallback((channelName, config, callback) => {
    if (!user) return null

    const channel = supabase.channel(channelName)
    
    // Configure the subscription based on config
    if (config.table) {
      channel.on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter
        },
        callback
      )
    }

    // Subscribe and store reference
    const subscription = channel.subscribe()
    subscriptionsRef.current.set(channelName, subscription)

    return subscription
  }, [user])

  // Unsubscribe from a specific channel
  const unsubscribe = useCallback((channelName) => {
    const subscription = subscriptionsRef.current.get(channelName)
    if (subscription) {
      subscription.unsubscribe()
      subscriptionsRef.current.delete(channelName)
    }
  }, [])

  // Cleanup all subscriptions
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach((subscription) => {
      subscription.unsubscribe()
    })
    subscriptionsRef.current.clear()
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    cleanup
  }
}

/**
 * Hook for real-time messaging functionality
 */
export const useRealTimeMessages = () => {
  const { user } = useAuth()
  const { subscribe, unsubscribe } = useRealTime()
  const [newMessages, setNewMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState(new Map())
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return

    const handleNewMessage = (payload) => {
      if (payload.eventType === 'INSERT') {
        setNewMessages(prev => [...prev, payload.new])
      }
    }

    const subscription = subscribe(
      `messages-${user.id}`,
      {
        table: 'messages',
        event: 'INSERT',
        filter: `recipient_id=eq.${user.id}`
      },
      handleNewMessage
    )

    return () => {
      unsubscribe(`messages-${user.id}`)
    }
  }, [user, subscribe, unsubscribe])

  // Subscribe to typing indicators
  useEffect(() => {
    if (!user) return

    const handleTypingUpdate = (payload) => {
      const { user_id, is_typing, conversation_id } = payload
      
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        if (is_typing) {
          newMap.set(user_id, { conversation_id, timestamp: Date.now() })
        } else {
          newMap.delete(user_id)
        }
        return newMap
      })
    }

    const subscription = subscribe(
      `typing-${user.id}`,
      {
        table: 'typing_indicators',
        event: '*'
      },
      handleTypingUpdate
    )

    // Clean up old typing indicators
    const cleanupInterval = setInterval(() => {
      setTypingUsers(prev => {
        const newMap = new Map()
        const now = Date.now()
        prev.forEach((value, key) => {
          if (now - value.timestamp < 5000) { // 5 seconds timeout
            newMap.set(key, value)
          }
        })
        return newMap
      })
    }, 1000)

    return () => {
      unsubscribe(`typing-${user.id}`)
      clearInterval(cleanupInterval)
    }
  }, [user, subscribe, unsubscribe])

  // Subscribe to user presence
  useEffect(() => {
    if (!user) return

    const handlePresenceUpdate = (payload) => {
      const { user_id, is_online } = payload
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        if (is_online) {
          newSet.add(user_id)
        } else {
          newSet.delete(user_id)
        }
        return newSet
      })
    }

    const subscription = subscribe(
      `presence-${user.id}`,
      {
        table: 'user_presence',
        event: '*'
      },
      handlePresenceUpdate
    )

    return () => {
      unsubscribe(`presence-${user.id}`)
    }
  }, [user, subscribe, unsubscribe])

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (conversationId, isTyping) => {
    if (!user) return

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }, [user])

  // Update user presence
  const updatePresence = useCallback(async (isOnline) => {
    if (!user) return

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [user])

  // Clear new messages
  const clearNewMessages = useCallback(() => {
    setNewMessages([])
  }, [])

  return {
    newMessages,
    typingUsers,
    onlineUsers,
    sendTypingIndicator,
    updatePresence,
    clearNewMessages
  }
}

/**
 * Hook for real-time notifications
 */
export const useRealTimeNotifications = () => {
  const { user } = useAuth()
  const { subscribe, unsubscribe } = useRealTime()
  const [newNotifications, setNewNotifications] = useState([])
  const [notificationQueue, setNotificationQueue] = useState([])

  // Subscribe to new notifications
  useEffect(() => {
    if (!user) return

    const handleNewNotification = (payload) => {
      if (payload.eventType === 'INSERT') {
        const notification = payload.new
        
        // Add to queue for batching
        setNotificationQueue(prev => [...prev, notification])
        
        // Add to new notifications
        setNewNotifications(prev => [...prev, notification])
      }
    }

    const subscription = subscribe(
      `notifications-${user.id}`,
      {
        table: 'notifications',
        event: 'INSERT',
        filter: `user_id=eq.${user.id}`
      },
      handleNewNotification
    )

    return () => {
      unsubscribe(`notifications-${user.id}`)
    }
  }, [user, subscribe, unsubscribe])

  // Process notification queue in batches
  useEffect(() => {
    if (notificationQueue.length === 0) return

    const timer = setTimeout(() => {
      // Process batch of notifications
      const batch = [...notificationQueue]
      setNotificationQueue([])
      
      // Group by priority and type
      const priorityGroups = batch.reduce((groups, notif) => {
        const key = `${notif.priority}-${notif.type}`
        if (!groups[key]) groups[key] = []
        groups[key].push(notif)
        return groups
      }, {})

      // Handle each priority group
      Object.entries(priorityGroups).forEach(([key, notifications]) => {
        const [priority, type] = key.split('-')
        handleNotificationBatch(notifications, priority, type)
      })
    }, 1000) // 1 second batching delay

    return () => clearTimeout(timer)
  }, [notificationQueue])

  // Handle notification batch
  const handleNotificationBatch = (notifications, priority, type) => {
    // Show browser notification for high priority
    if (priority === 'high' && 'Notification' in window && Notification.permission === 'granted') {
      const title = notifications.length === 1 
        ? notifications[0].title 
        : `${notifications.length} התראות חדשות`
      
      const body = notifications.length === 1
        ? notifications[0].content
        : `יש לך ${notifications.length} התראות חדשות`

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `batch-${type}`,
        renotify: true
      })
    }

    // Play sound for message notifications
    if (type === 'message' && notifications.length > 0) {
      playNotificationSound()
    }
  }

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      })
    } catch (error) {
      // Ignore audio errors
    }
  }

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  // Clear new notifications
  const clearNewNotifications = useCallback(() => {
    setNewNotifications([])
  }, [])

  return {
    newNotifications,
    requestNotificationPermission,
    clearNewNotifications
  }
}

export default useRealTime