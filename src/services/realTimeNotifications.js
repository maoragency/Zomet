import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Real-time notifications service
 * Handles real-time notification delivery, queuing, and batching
 */
export const realTimeNotificationsService = {
  // Notification queue for batching
  notificationQueue: new Map(),
  batchTimeout: null,
  subscribers: new Map(),

  /**
   * Subscribe to real-time notifications
   * @param {string} userId - User ID to subscribe for
   * @param {Function} callback - Callback function for notifications
   * @param {Object} options - Subscription options
   * @returns {Object} Subscription object
   */
  subscribeToNotifications(userId, callback, options = {}) {
    try {
      const channelName = `notifications-${userId}`
      const channel = supabase.channel(channelName)

      // Subscribe to new notifications
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.handleNewNotification(payload.new, callback, options)
        }
      )

      // Subscribe to notification updates
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback({
            type: 'notification_updated',
            notification: payload.new,
            old: payload.old
          })
        }
      )

      const subscription = channel.subscribe((status) => {
        if (options.onStatusChange) {
          options.onStatusChange(status)
        }
      })

      // Store subscription reference
      this.subscribers.set(userId, { subscription, channel, callback, options })

      return {
        subscription,
        channel,
        unsubscribe: () => {
          channel.unsubscribe()
          this.subscribers.delete(userId)
        }
      }
    } catch (error) {
      logError(error, 'realTimeNotificationsService.subscribeToNotifications')
      throw error
    }
  },

  /**
   * Handle new notification with queuing and batching
   * @private
   */
  handleNewNotification(notification, callback, options) {
    // Add to queue for batching
    const queueKey = `${notification.user_id}-${notification.type}`
    
    if (!this.notificationQueue.has(queueKey)) {
      this.notificationQueue.set(queueKey, [])
    }
    
    this.notificationQueue.get(queueKey).push(notification)

    // Set up batch processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatchedNotifications(callback, options)
    }, options.batchDelay || 1000)

    // For high priority notifications, process immediately
    if (notification.priority === 'high' || notification.type === 'urgent') {
      this.processNotificationImmediately(notification, callback, options)
    }
  },

  /**
   * Process batched notifications
   * @private
   */
  processBatchedNotifications(callback, options) {
    const batches = new Map(this.notificationQueue)
    this.notificationQueue.clear()

    batches.forEach((notifications, queueKey) => {
      const [userId, type] = queueKey.split('-')
      
      if (notifications.length === 1) {
        // Single notification
        this.processNotificationImmediately(notifications[0], callback, options)
      } else {
        // Batch notification
        callback({
          type: 'notification_batch',
          notifications,
          count: notifications.length,
          notificationType: type,
          userId
        })

        // Show browser notification for batch
        this.showBrowserNotification({
          title: `${notifications.length} התראות חדשות`,
          body: `יש לך ${notifications.length} התראות חדשות מסוג ${this.getTypeDisplayName(type)}`,
          tag: `batch-${type}`,
          data: { notifications, type: 'batch' }
        }, options)
      }
    })
  },

  /**
   * Process single notification immediately
   * @private
   */
  processNotificationImmediately(notification, callback, options) {
    callback({
      type: 'new_notification',
      notification
    })

    // Show browser notification
    this.showBrowserNotification({
      title: notification.title,
      body: notification.content,
      tag: `notification-${notification.id}`,
      data: { notification, type: 'single' }
    }, options)

    // Play sound for certain types
    if (this.shouldPlaySound(notification, options)) {
      this.playNotificationSound(notification.type)
    }
  },

  /**
   * Show browser notification
   * @private
   */
  showBrowserNotification(notificationData, options) {
    if (!options.enableBrowserNotifications) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(notificationData.title, {
        body: notificationData.body,
        icon: '/favicon.ico',
        tag: notificationData.tag,
        renotify: true,
        requireInteraction: notificationData.data?.notification?.priority === 'high',
        data: notificationData.data
      })

      // Handle notification click
      notification.onclick = () => {
        window.focus()
        if (options.onNotificationClick) {
          options.onNotificationClick(notificationData.data)
        }
        notification.close()
      }

      // Auto-close after delay
      setTimeout(() => {
        notification.close()
      }, options.autoCloseDelay || 5000)

    } catch (error) {
      logError(error, 'realTimeNotificationsService.showBrowserNotification')
    }
  },

  /**
   * Play notification sound
   * @private
   */
  playNotificationSound(type) {
    try {
      const soundMap = {
        message: '/sounds/message.mp3',
        system: '/sounds/system.mp3',
        alert: '/sounds/alert.mp3',
        default: '/sounds/notification.mp3'
      }

      const soundFile = soundMap[type] || soundMap.default
      const audio = new Audio(soundFile)
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      })
    } catch (error) {
      // Ignore audio errors
    }
  },

  /**
   * Check if sound should be played
   * @private
   */
  shouldPlaySound(notification, options) {
    if (!options.enableSounds) return false
    if (options.mutedTypes?.includes(notification.type)) return false
    if (notification.priority === 'low') return false
    return true
  },

  /**
   * Get display name for notification type
   * @private
   */
  getTypeDisplayName(type) {
    const typeNames = {
      message: 'הודעות',
      system: 'מערכת',
      ad_inquiry: 'פניות למודעות',
      ad_approved: 'אישור מודעות',
      ad_rejected: 'דחיית מודעות',
      promotion: 'קידום מודעות',
      payment: 'תשלומים',
      alert: 'התראות'
    }
    return typeNames[type] || type
  },

  /**
   * Send notification to user
   * @param {string} userId - Target user ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Response
   */
  async sendNotification(userId, notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type: notificationData.type || 'system',
          title: notificationData.title,
          content: notificationData.content,
          priority: notificationData.priority || 'medium',
          category: notificationData.category || 'general',
          related_id: notificationData.related_id || null,
          metadata: notificationData.metadata || {},
          expires_at: notificationData.expires_at || null
        }])
        .select()
        .single()

      if (error) throw error

      return createSuccessResponse(data, 'התראה נשלחה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.sendNotification')
    }
  },

  /**
   * Send bulk notifications
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Object>} Response
   */
  async sendBulkNotifications(notifications) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications.map(notif => ({
          user_id: notif.user_id,
          type: notif.type || 'system',
          title: notif.title,
          content: notif.content,
          priority: notif.priority || 'medium',
          category: notif.category || 'general',
          related_id: notif.related_id || null,
          metadata: notif.metadata || {},
          expires_at: notif.expires_at || null
        })))
        .select()

      if (error) throw error

      return createSuccessResponse(data, `${data.length} התראות נשלחו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.sendBulkNotifications')
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Response
   */
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) throw error

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.markAsRead')
    }
  },

  /**
   * Mark multiple notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @returns {Promise<Object>} Response
   */
  async markMultipleAsRead(notificationIds) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds)
        .select()

      if (error) throw error

      return createSuccessResponse(data, `${data.length} התראות סומנו כנקראו`)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.markMultipleAsRead')
    }
  },

  /**
   * Get notification preferences for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Response with preferences
   */
  async getNotificationPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Default preferences if none exist
      const defaultPreferences = {
        email_notifications: true,
        browser_notifications: true,
        sound_notifications: true,
        message_notifications: true,
        system_notifications: true,
        ad_notifications: true,
        promotion_notifications: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      }

      return createSuccessResponse(data || defaultPreferences)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.getNotificationPreferences')
    }
  },

  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences object
   * @returns {Promise<Object>} Response
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return createSuccessResponse(data, 'העדפות התראות עודכנו בהצלחה')
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.updateNotificationPreferences')
    }
  },

  /**
   * Request browser notification permission
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      logError(error, 'realTimeNotificationsService.requestNotificationPermission')
      return false
    }
  },

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Response with statistics
   */
  async getNotificationStats(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, is_read, priority, created_at')
        .eq('user_id', userId)

      if (error) throw error

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.is_read).length,
        read: data.filter(n => n.is_read).length,
        byType: {},
        byPriority: {
          high: data.filter(n => n.priority === 'high').length,
          medium: data.filter(n => n.priority === 'medium').length,
          low: data.filter(n => n.priority === 'low').length
        },
        recent: data.filter(n => {
          const created = new Date(n.created_at)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return created > dayAgo
        }).length
      }

      // Count by type
      data.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      })

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.getNotificationStats')
    }
  },

  /**
   * Clean up expired notifications
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Response
   */
  async cleanupExpiredNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('expires_at', new Date().toISOString())
        .select()

      if (error) throw error

      return createSuccessResponse(data, `${data.length} התראות פגות תוקף נמחקו`)
    } catch (error) {
      return handleApiError(error, 'realTimeNotificationsService.cleanupExpiredNotifications')
    }
  },

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.subscribers.forEach((subscriber) => {
      subscriber.channel.unsubscribe()
    })
    this.subscribers.clear()
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }
    
    this.notificationQueue.clear()
  }
}

export default realTimeNotificationsService