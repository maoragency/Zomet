import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Notification service for Supabase operations
 * Handles system notifications with multiple delivery channels and preferences
 */

export const notificationService = {
  /**
   * Create a notification for a user
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Response with created notification or error
   */
  async createNotification(notificationData) {
    try {
      // Validate required fields
      const validation = validateRequiredFields(notificationData, ['user_id', 'title', 'content', 'type'])
      if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
      }

      const sanitizedData = {
        user_id: notificationData.user_id,
        title: sanitizeInput(notificationData.title),
        content: sanitizeInput(notificationData.content),
        type: notificationData.type,
        priority: notificationData.priority || 'normal',
        action_url: notificationData.action_url || null,
        action_text: notificationData.action_text ? sanitizeInput(notificationData.action_text) : null,
        related_resource_type: notificationData.related_resource_type || null,
        related_resource_id: notificationData.related_resource_id || null,
        metadata: notificationData.metadata || {},
        expires_at: notificationData.expires_at || null
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([sanitizedData])
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .single()

      if (error) {
        logError(error, 'notificationService.createNotification', { notificationData: sanitizedData })
        throw error
      }

      // Check user preferences and send via appropriate channels
      await this.processNotificationDelivery(data)

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'notificationService.createNotification')
    }
  },

  /**
   * Get user notifications
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with notifications or error
   */
  async getUserNotifications(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        page = 1,
        pageSize = 20,
        type = null,
        isRead = null,
        priority = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)

      // Apply filters
      if (type) {
        query = query.eq('type', type)
      }
      if (isRead !== null) {
        query = query.eq('is_read', isRead)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }

      // Filter out expired notifications
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

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
        logError(error, 'notificationService.getUserNotifications', options)
        throw error
      }

      return createSuccessResponse({
        notifications: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'notificationService.getUserNotifications')
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Response with updated notification or error
   */
  async markAsRead(notificationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        logError(error, 'notificationService.markAsRead', { notificationId })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'notificationService.markAsRead')
    }
  },

  /**
   * Mark all notifications as read for user
   * @returns {Promise<Object>} Response with updated notifications or error
   */
  async markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .select()

      if (error) {
        logError(error, 'notificationService.markAllAsRead')
        throw error
      }

      return createSuccessResponse(data, `${data.length} התראות סומנו כנקראו`)
    } catch (error) {
      return handleApiError(error, 'notificationService.markAllAsRead')
    }
  },

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Response with success status or error
   */
  async deleteNotification(notificationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        logError(error, 'notificationService.deleteNotification', { notificationId })
        throw error
      }

      return createSuccessResponse({ deleted: true }, 'התראה נמחקה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'notificationService.deleteNotification')
    }
  },

  /**
   * Get unread notification count
   * @returns {Promise<Object>} Response with unread count or error
   */
  async getUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

      if (error) {
        logError(error, 'notificationService.getUnreadCount')
        throw error
      }

      return createSuccessResponse({ count: count || 0 })
    } catch (error) {
      return handleApiError(error, 'notificationService.getUnreadCount')
    }
  },

  /**
   * Get notification statistics
   * @returns {Promise<Object>} Response with notification statistics or error
   */
  async getNotificationStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('type, priority, is_read, created_at')
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

      if (error) throw error

      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        read: notifications.filter(n => n.is_read).length,
        byType: {},
        byPriority: {
          high: notifications.filter(n => n.priority === 'high').length,
          normal: notifications.filter(n => n.priority === 'normal').length,
          low: notifications.filter(n => n.priority === 'low').length
        },
        recent: notifications.filter(n => {
          const createdAt = new Date(n.created_at)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return createdAt > dayAgo
        }).length
      }

      // Count by type
      notifications.forEach(n => {
        stats.byType[n.type] = (stats.byType[n.type] || 0) + 1
      })

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'notificationService.getNotificationStats')
    }
  },

  /**
   * Get user notification preferences
   * @returns {Promise<Object>} Response with preferences or error
   */
  async getNotificationPreferences() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        logError(error, 'notificationService.getNotificationPreferences')
        throw error
      }

      // Return default preferences if none exist
      const defaultPreferences = {
        user_id: user.id,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        notification_types: {
          vehicle_approved: true,
          vehicle_rejected: true,
          message_received: true,
          promotion_expiring: true,
          system_maintenance: true,
          account_security: true
        },
        quiet_hours: {
          enabled: false,
          start_time: '22:00',
          end_time: '08:00'
        },
        frequency: {
          instant: ['message_received', 'account_security'],
          daily: ['promotion_expiring'],
          weekly: ['system_maintenance']
        }
      }

      return createSuccessResponse(data || defaultPreferences)
    } catch (error) {
      return handleApiError(error, 'notificationService.getNotificationPreferences')
    }
  },

  /**
   * Update user notification preferences
   * @param {Object} preferences - Notification preferences
   * @returns {Promise<Object>} Response with updated preferences or error
   */
  async updateNotificationPreferences(preferences) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert([{
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        logError(error, 'notificationService.updateNotificationPreferences', { preferences })
        throw error
      }

      return createSuccessResponse(data, 'העדפות התראות עודכנו בהצלחה')
    } catch (error) {
      return handleApiError(error, 'notificationService.updateNotificationPreferences')
    }
  },

  /**
   * Send bulk notifications to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Response with created notifications or error
   */
  async sendBulkNotifications(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: sanitizeInput(notificationData.title),
        content: sanitizeInput(notificationData.content),
        type: notificationData.type,
        priority: notificationData.priority || 'normal',
        action_url: notificationData.action_url || null,
        action_text: notificationData.action_text ? sanitizeInput(notificationData.action_text) : null,
        related_resource_type: notificationData.related_resource_type || null,
        related_resource_id: notificationData.related_resource_id || null,
        metadata: notificationData.metadata || {},
        expires_at: notificationData.expires_at || null
      }))

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        logError(error, 'notificationService.sendBulkNotifications', { userIds, notificationData })
        throw error
      }

      // Process delivery for each notification
      for (const notification of data) {
        await this.processNotificationDelivery(notification)
      }

      return createSuccessResponse(data, `${data.length} התראות נשלחו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'notificationService.sendBulkNotifications')
    }
  },

  /**
   * Subscribe to real-time notification updates
   * @param {Function} callback - Callback function for new notifications
   * @returns {Object} Subscription object
   */
  subscribeToNotifications(callback) {
    try {
      const { data: { user } } = supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          callback
        )
        .subscribe()

      return subscription
    } catch (error) {
      logError(error, 'notificationService.subscribeToNotifications')
      throw error
    }
  },

  /**
   * Process notification delivery based on user preferences
   * @private
   * @param {Object} notification - Notification object
   */
  async processNotificationDelivery(notification) {
    try {
      // Get user preferences
      const preferencesResponse = await this.getNotificationPreferences()
      if (!preferencesResponse.success) return

      const preferences = preferencesResponse.data

      // Check if notification type is enabled
      if (!preferences.notification_types[notification.type]) {
        return
      }

      // Check quiet hours
      if (preferences.quiet_hours?.enabled && this.isQuietHours(preferences.quiet_hours)) {
        // Queue for later delivery or skip based on priority
        if (notification.priority !== 'high') {
          return
        }
      }

      // Send via enabled channels
      const deliveryPromises = []

      if (preferences.email_notifications) {
        deliveryPromises.push(this.sendEmailNotification(notification))
      }

      if (preferences.push_notifications) {
        deliveryPromises.push(this.sendPushNotification(notification))
      }

      if (preferences.sms_notifications && notification.priority === 'high') {
        deliveryPromises.push(this.sendSMSNotification(notification))
      }

      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      logError(error, 'notificationService.processNotificationDelivery')
    }
  },

  /**
   * Check if current time is within quiet hours
   * @private
   * @param {Object} quietHours - Quiet hours configuration
   * @returns {boolean} Whether it's quiet hours
   */
  isQuietHours(quietHours) {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = quietHours.start_time.split(':').map(Number)
    const [endHour, endMin] = quietHours.end_time.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime
    }
  },

  /**
   * Send email notification (placeholder for future implementation)
   * @private
   * @param {Object} notification - Notification object
   */
  async sendEmailNotification(notification) {
    // Placeholder for email service integration
    logError(new Error('Email notifications not implemented yet'), 'notificationService.sendEmailNotification')
  },

  /**
   * Send push notification (placeholder for future implementation)
   * @private
   * @param {Object} notification - Notification object
   */
  async sendPushNotification(notification) {
    // Placeholder for push notification service integration
    logError(new Error('Push notifications not implemented yet'), 'notificationService.sendPushNotification')
  },

  /**
   * Send SMS notification (placeholder for future implementation)
   * @private
   * @param {Object} notification - Notification object
   */
  async sendSMSNotification(notification) {
    // Placeholder for SMS service integration
    logError(new Error('SMS notifications not implemented yet'), 'notificationService.sendSMSNotification')
  }
}

export default notificationService