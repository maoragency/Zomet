import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Real-time dashboard updates service
 * Handles live statistics, activity feeds, and system monitoring
 */
export const realTimeDashboardService = {
  // Active subscriptions
  subscriptions: new Map(),
  
  // Statistics cache
  statisticsCache: new Map(),
  cacheTimeout: 30000, // 30 seconds

  /**
   * Subscribe to real-time dashboard statistics
   * @param {Function} callback - Callback function for statistics updates
   * @param {Object} options - Subscription options
   * @returns {Object} Subscription object
   */
  subscribeToStatistics(callback, options = {}) {
    try {
      const channelName = 'dashboard-statistics'
      const channel = supabase.channel(channelName)

      // Subscribe to user changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => this.updateStatistics('users', callback)
      )

      // Subscribe to vehicle changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => this.updateStatistics('vehicles', callback)
      )

      // Subscribe to message changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => this.updateStatistics('messages', callback)
      )

      // Subscribe to activity logs
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          this.updateStatistics('activity', callback)
          if (options.onActivityUpdate) {
            options.onActivityUpdate(payload.new)
          }
        }
      )

      const subscription = channel.subscribe((status) => {
        if (options.onStatusChange) {
          options.onStatusChange(status)
        }
      })

      this.subscriptions.set(channelName, { subscription, channel, callback })

      // Initial statistics load
      this.loadAllStatistics(callback)

      return {
        subscription,
        channel,
        unsubscribe: () => {
          channel.unsubscribe()
          this.subscriptions.delete(channelName)
        }
      }
    } catch (error) {
      logError(error, 'realTimeDashboardService.subscribeToStatistics')
      throw error
    }
  },

  /**
   * Subscribe to real-time activity feed
   * @param {Function} callback - Callback function for activity updates
   * @param {Object} options - Subscription options
   * @returns {Object} Subscription object
   */
  subscribeToActivityFeed(callback, options = {}) {
    try {
      const channelName = 'activity-feed'
      const channel = supabase.channel(channelName)

      // Subscribe to activity logs
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        async (payload) => {
          // Enrich activity data
          const enrichedActivity = await this.enrichActivityData(payload.new)
          callback({
            type: 'new_activity',
            activity: enrichedActivity
          })
        }
      )

      // Subscribe to user presence changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          callback({
            type: 'presence_update',
            presence: payload.new
          })
        }
      )

      const subscription = channel.subscribe()

      this.subscriptions.set(channelName, { subscription, channel, callback })

      return {
        subscription,
        channel,
        unsubscribe: () => {
          channel.unsubscribe()
          this.subscriptions.delete(channelName)
        }
      }
    } catch (error) {
      logError(error, 'realTimeDashboardService.subscribeToActivityFeed')
      throw error
    }
  },

  /**
   * Subscribe to real-time user presence indicators
   * @param {Function} callback - Callback function for presence updates
   * @returns {Object} Subscription object
   */
  subscribeToUserPresence(callback) {
    try {
      const channelName = 'user-presence'
      const channel = supabase.channel(channelName)

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          callback({
            type: 'presence_change',
            user_id: payload.new.user_id,
            is_online: payload.new.is_online,
            status: payload.new.status,
            last_seen: payload.new.last_seen
          })
        }
      )

      const subscription = channel.subscribe()

      this.subscriptions.set(channelName, { subscription, channel, callback })

      return {
        subscription,
        channel,
        unsubscribe: () => {
          channel.unsubscribe()
          this.subscriptions.delete(channelName)
        }
      }
    } catch (error) {
      logError(error, 'realTimeDashboardService.subscribeToUserPresence')
      throw error
    }
  },

  /**
   * Load all dashboard statistics
   * @private
   */
  async loadAllStatistics(callback) {
    try {
      const statistics = await this.getDashboardStatistics()
      if (statistics.success) {
        callback({
          type: 'statistics_update',
          statistics: statistics.data
        })
      }
    } catch (error) {
      logError(error, 'realTimeDashboardService.loadAllStatistics')
    }
  },

  /**
   * Update specific statistics
   * @private
   */
  async updateStatistics(type, callback) {
    try {
      // Check cache first
      const cacheKey = `stats-${type}`
      const cached = this.statisticsCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return // Use cached data
      }

      let statistics = {}
      
      switch (type) {
        case 'users':
          statistics = await this.getUserStatistics()
          break
        case 'vehicles':
          statistics = await this.getVehicleStatistics()
          break
        case 'messages':
          statistics = await this.getMessageStatistics()
          break
        case 'activity':
          statistics = await this.getActivityStatistics()
          break
        default:
          statistics = await this.getDashboardStatistics()
      }

      if (statistics.success) {
        // Update cache
        this.statisticsCache.set(cacheKey, {
          data: statistics.data,
          timestamp: Date.now()
        })

        callback({
          type: 'statistics_update',
          statisticsType: type,
          statistics: statistics.data
        })
      }
    } catch (error) {
      logError(error, 'realTimeDashboardService.updateStatistics')
    }
  },

  /**
   * Get comprehensive dashboard statistics
   * @returns {Promise<Object>} Response with statistics
   */
  async getDashboardStatistics() {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_statistics')

      if (error) throw error

      return createSuccessResponse(data || {
        users: { total: 0, active: 0, new_today: 0 },
        vehicles: { total: 0, active: 0, new_today: 0 },
        messages: { total: 0, unread: 0, today: 0 },
        activity: { total_today: 0, unique_users_today: 0 }
      })
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getDashboardStatistics')
    }
  },

  /**
   * Get user statistics
   * @returns {Promise<Object>} Response with user statistics
   */
  async getUserStatistics() {
    try {
      const { data, error } = await supabase.rpc('get_user_stats')

      if (error) throw error

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getUserStatistics')
    }
  },

  /**
   * Get vehicle statistics
   * @returns {Promise<Object>} Response with vehicle statistics
   */
  async getVehicleStatistics() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('status, created_at')

      if (error) throw error

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const stats = {
        total: data.length,
        active: data.filter(v => v.status === 'active').length,
        pending: data.filter(v => v.status === 'pending').length,
        sold: data.filter(v => v.status === 'sold').length,
        new_today: data.filter(v => new Date(v.created_at) >= today).length
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getVehicleStatistics')
    }
  },

  /**
   * Get message statistics
   * @returns {Promise<Object>} Response with message statistics
   */
  async getMessageStatistics() {
    try {
      const { data, error } = await supabase.rpc('get_realtime_message_stats')

      if (error) throw error

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getMessageStatistics')
    }
  },

  /**
   * Get activity statistics
   * @returns {Promise<Object>} Response with activity statistics
   */
  async getActivityStatistics() {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, created_at, user_id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      const stats = {
        total_today: data.length,
        unique_users_today: new Set(data.map(a => a.user_id)).size,
        actions_breakdown: data.reduce((acc, activity) => {
          acc[activity.action] = (acc[activity.action] || 0) + 1
          return acc
        }, {})
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getActivityStatistics')
    }
  },

  /**
   * Get recent activity feed
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with activity feed
   */
  async getActivityFeed(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        userId = null,
        action = null,
        since = null
      } = options

      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (action) {
        query = query.eq('action', action)
      }

      if (since) {
        query = query.gte('created_at', since)
      }

      const { data, error } = await query

      if (error) throw error

      // Enrich activity data
      const enrichedData = await Promise.all(
        data.map(activity => this.enrichActivityData(activity))
      )

      return createSuccessResponse(enrichedData)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getActivityFeed')
    }
  },

  /**
   * Enrich activity data with additional context
   * @private
   */
  async enrichActivityData(activity) {
    try {
      const enriched = { ...activity }

      // Add resource details based on resource_type
      if (activity.resource_type && activity.resource_id) {
        switch (activity.resource_type) {
          case 'vehicle':
            const { data: vehicle } = await supabase
              .from('vehicles')
              .select('title, manufacturer, model')
              .eq('id', activity.resource_id)
              .single()
            
            if (vehicle) {
              enriched.resource_details = vehicle
            }
            break

          case 'message':
            const { data: message } = await supabase
              .from('messages')
              .select('subject, content')
              .eq('id', activity.resource_id)
              .single()
            
            if (message) {
              enriched.resource_details = {
                subject: message.subject,
                preview: message.content?.substring(0, 100) + '...'
              }
            }
            break
        }
      }

      return enriched
    } catch (error) {
      logError(error, 'realTimeDashboardService.enrichActivityData')
      return activity
    }
  },

  /**
   * Get online users count
   * @returns {Promise<Object>} Response with online users count
   */
  async getOnlineUsersCount() {
    try {
      const { count, error } = await supabase
        .from('user_presence')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)

      if (error) throw error

      return createSuccessResponse({ count: count || 0 })
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getOnlineUsersCount')
    }
  },

  /**
   * Get system health metrics
   * @returns {Promise<Object>} Response with system health
   */
  async getSystemHealth() {
    try {
      // This would typically check various system metrics
      const health = {
        database: 'healthy',
        realtime: 'healthy',
        storage: 'healthy',
        auth: 'healthy',
        timestamp: new Date().toISOString()
      }

      return createSuccessResponse(health)
    } catch (error) {
      return handleApiError(error, 'realTimeDashboardService.getSystemHealth')
    }
  },

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.subscriptions.forEach((subscription) => {
      subscription.channel.unsubscribe()
    })
    this.subscriptions.clear()
    this.statisticsCache.clear()
  }
}

export default realTimeDashboardService