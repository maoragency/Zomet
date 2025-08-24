import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Analytics service for Supabase operations
 * Handles system-wide metrics, KPIs, reporting, and business intelligence
 */

export const analyticsService = {
  /**
   * Get system overview statistics
   * @returns {Promise<Object>} Response with system stats or error
   */
  async getSystemOverview() {
    try {
      // Get user statistics
      const { data: userStats, error: userError } = await supabase
        .rpc('get_user_stats')

      if (userError) throw userError

      // Get vehicle statistics
      const { data: vehicleStats, error: vehicleError } = await supabase
        .from('vehicles')
        .select('status, created_at, views, contact_clicks')

      if (vehicleError) throw vehicleError

      // Get promotion statistics
      const { data: promotionStats, error: promotionError } = await supabase
        .from('promotions')
        .select('payment_status, price, is_active, created_at')

      if (promotionError) throw promotionError

      // Get message statistics
      const { data: messageStats, error: messageError } = await supabase
        .from('messages')
        .select('created_at, is_read, message_type')

      if (messageError) throw messageError

      // Calculate overview metrics
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const overview = {
        users: {
          total: userStats[0]?.total_users || 0,
          active: userStats[0]?.active_users || 0,
          verified: userStats[0]?.verified_users || 0,
          new_today: userStats[0]?.new_users_today || 0,
          new_this_week: vehicleStats.filter(v => new Date(v.created_at) >= thisWeek).length,
          new_this_month: vehicleStats.filter(v => new Date(v.created_at) >= thisMonth).length
        },
        vehicles: {
          total: vehicleStats.length,
          active: vehicleStats.filter(v => v.status === 'למכירה').length,
          sold: vehicleStats.filter(v => v.status === 'נמכר').length,
          pending: vehicleStats.filter(v => v.status === 'ממתין לתשלום').length,
          new_today: vehicleStats.filter(v => new Date(v.created_at) >= today).length,
          new_this_week: vehicleStats.filter(v => new Date(v.created_at) >= thisWeek).length,
          new_this_month: vehicleStats.filter(v => new Date(v.created_at) >= thisMonth).length,
          total_views: vehicleStats.reduce((sum, v) => sum + (v.views || 0), 0),
          total_contacts: vehicleStats.reduce((sum, v) => sum + (v.contact_clicks || 0), 0)
        },
        promotions: {
          total: promotionStats.length,
          active: promotionStats.filter(p => p.is_active).length,
          revenue: promotionStats.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.price, 0),
          pending_revenue: promotionStats.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + p.price, 0),
          new_today: promotionStats.filter(p => new Date(p.created_at) >= today).length,
          new_this_week: promotionStats.filter(p => new Date(p.created_at) >= thisWeek).length,
          new_this_month: promotionStats.filter(p => new Date(p.created_at) >= thisMonth).length
        },
        messages: {
          total: messageStats.length,
          unread: messageStats.filter(m => !m.is_read).length,
          system: messageStats.filter(m => m.message_type === 'system').length,
          user: messageStats.filter(m => m.message_type === 'user').length,
          new_today: messageStats.filter(m => new Date(m.created_at) >= today).length,
          new_this_week: messageStats.filter(m => new Date(m.created_at) >= thisWeek).length,
          new_this_month: messageStats.filter(m => new Date(m.created_at) >= thisMonth).length
        }
      }

      return createSuccessResponse(overview)
    } catch (error) {
      return handleApiError(error, 'analyticsService.getSystemOverview')
    }
  },

  /**
   * Get user analytics for dashboard
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Response with user analytics or error
   */
  async getUserAnalytics(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        startDate = null,
        endDate = null,
        period = '30d'
      } = options

      // Calculate date range
      let dateFilter = {}
      if (startDate && endDate) {
        dateFilter = { start: startDate, end: endDate }
      } else {
        const now = new Date()
        const days = parseInt(period.replace('d', ''))
        dateFilter = {
          start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
          end: now.toISOString()
        }
      }

      // Get user's vehicles
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (vehicleError) throw vehicleError

      // Get user's promotions
      const { data: promotions, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (promotionError) throw promotionError

      // Get user's messages
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (messageError) throw messageError

      // Get user's activity
      const { data: activities, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (activityError) throw activityError

      const analytics = {
        period: period,
        date_range: dateFilter,
        vehicles: {
          total: vehicles.length,
          by_status: this.groupBy(vehicles, 'status'),
          total_views: vehicles.reduce((sum, v) => sum + (v.views || 0), 0),
          total_contacts: vehicles.reduce((sum, v) => sum + (v.contact_clicks || 0), 0),
          avg_views_per_vehicle: vehicles.length > 0 ? 
            Math.round(vehicles.reduce((sum, v) => sum + (v.views || 0), 0) / vehicles.length) : 0,
          avg_contacts_per_vehicle: vehicles.length > 0 ? 
            Math.round(vehicles.reduce((sum, v) => sum + (v.contact_clicks || 0), 0) / vehicles.length) : 0
        },
        promotions: {
          total: promotions.length,
          active: promotions.filter(p => p.is_active).length,
          by_type: this.groupBy(promotions, 'promotion_type'),
          by_status: this.groupBy(promotions, 'payment_status'),
          total_spent: promotions.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.price, 0),
          pending_amount: promotions.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + p.price, 0)
        },
        messages: {
          total: messages.length,
          sent: messages.filter(m => m.sender_id === user.id).length,
          received: messages.filter(m => m.recipient_id === user.id).length,
          by_type: this.groupBy(messages, 'message_type')
        },
        activity: {
          total: activities.length,
          by_action: this.groupBy(activities, 'action'),
          by_resource: this.groupBy(activities, 'resource_type')
        }
      }

      return createSuccessResponse(analytics)
    } catch (error) {
      return handleApiError(error, 'analyticsService.getUserAnalytics')
    }
  },

  /**
   * Get vehicle performance analytics
   * @param {string} vehicleId - Vehicle ID (optional, gets all user vehicles if not provided)
   * @returns {Promise<Object>} Response with vehicle analytics or error
   */
  async getVehicleAnalytics(vehicleId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('created_by', user.id)

      if (vehicleId) {
        query = query.eq('id', vehicleId)
      }

      const { data: vehicles, error } = await query

      if (error) {
        logError(error, 'analyticsService.getVehicleAnalytics', { vehicleId })
        throw error
      }

      if (vehicleId && vehicles.length === 0) {
        throw new Error('רכב לא נמצא או שאין לך הרשאה לצפות בו')
      }

      const analytics = vehicles.map(vehicle => {
        const daysSinceCreated = Math.ceil((new Date() - new Date(vehicle.created_at)) / (1000 * 60 * 60 * 24))
        
        return {
          vehicle_id: vehicle.id,
          title: vehicle.title,
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          status: vehicle.status,
          created_at: vehicle.created_at,
          days_active: daysSinceCreated,
          performance: {
            total_views: vehicle.views || 0,
            total_contacts: vehicle.contact_clicks || 0,
            daily_avg_views: daysSinceCreated > 0 ? Math.round((vehicle.views || 0) / daysSinceCreated) : 0,
            daily_avg_contacts: daysSinceCreated > 0 ? Math.round((vehicle.contact_clicks || 0) / daysSinceCreated) : 0,
            contact_rate: vehicle.views > 0 ? Math.round(((vehicle.contact_clicks || 0) / vehicle.views) * 100) : 0,
            views_per_day_trend: this.calculateTrend(vehicle.views || 0, daysSinceCreated),
            contacts_per_day_trend: this.calculateTrend(vehicle.contact_clicks || 0, daysSinceCreated)
          },
          ranking: {
            views_rank: 0, // Will be calculated after all vehicles are processed
            contacts_rank: 0,
            price_competitiveness: this.calculatePriceCompetitiveness(vehicle)
          }
        }
      })

      // Calculate rankings
      analytics.sort((a, b) => b.performance.total_views - a.performance.total_views)
      analytics.forEach((item, index) => {
        item.ranking.views_rank = index + 1
      })

      analytics.sort((a, b) => b.performance.total_contacts - a.performance.total_contacts)
      analytics.forEach((item, index) => {
        item.ranking.contacts_rank = index + 1
      })

      // Sort back to original order
      analytics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return createSuccessResponse(vehicleId ? analytics[0] : analytics)
    } catch (error) {
      return handleApiError(error, 'analyticsService.getVehicleAnalytics')
    }
  },

  /**
   * Get time-series data for charts
   * @param {Object} options - Chart options
   * @returns {Promise<Object>} Response with time-series data or error
   */
  async getTimeSeriesData(options = {}) {
    try {
      const {
        metric = 'vehicles',
        period = '30d',
        groupBy = 'day',
        startDate = null,
        endDate = null
      } = options

      // Calculate date range
      let dateFilter = {}
      if (startDate && endDate) {
        dateFilter = { start: startDate, end: endDate }
      } else {
        const now = new Date()
        const days = parseInt(period.replace('d', ''))
        dateFilter = {
          start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
          end: now.toISOString()
        }
      }

      let tableName = 'vehicles'
      let selectFields = 'created_at'

      switch (metric) {
        case 'users':
          tableName = 'users'
          break
        case 'promotions':
          tableName = 'promotions'
          break
        case 'messages':
          tableName = 'messages'
          break
        case 'activities':
          tableName = 'activity_logs'
          break
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)
        .order('created_at', { ascending: true })

      if (error) {
        logError(error, 'analyticsService.getTimeSeriesData', options)
        throw error
      }

      // Group data by time period
      const timeSeriesData = this.groupByTimePeriod(data, groupBy)

      return createSuccessResponse({
        metric,
        period,
        groupBy,
        date_range: dateFilter,
        data: timeSeriesData
      })
    } catch (error) {
      return handleApiError(error, 'analyticsService.getTimeSeriesData')
    }
  },

  /**
   * Generate comprehensive report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Response with report data or error
   */
  async generateReport(options = {}) {
    try {
      const {
        reportType = 'overview',
        startDate = null,
        endDate = null,
        format = 'json'
      } = options

      let reportData = {}

      switch (reportType) {
        case 'overview':
          reportData = await this.generateOverviewReport(startDate, endDate)
          break
        case 'user_activity':
          reportData = await this.generateUserActivityReport(startDate, endDate)
          break
        case 'vehicle_performance':
          reportData = await this.generateVehiclePerformanceReport(startDate, endDate)
          break
        case 'promotion_effectiveness':
          reportData = await this.generatePromotionEffectivenessReport(startDate, endDate)
          break
        case 'revenue':
          reportData = await this.generateRevenueReport(startDate, endDate)
          break
        default:
          throw new Error('Invalid report type')
      }

      const report = {
        type: reportType,
        generated_at: new Date().toISOString(),
        date_range: {
          start: startDate,
          end: endDate
        },
        format,
        data: reportData
      }

      if (format === 'csv') {
        report.csv_data = this.convertToCSV(reportData)
      }

      return createSuccessResponse(report)
    } catch (error) {
      return handleApiError(error, 'analyticsService.generateReport')
    }
  },

  /**
   * Get performance monitoring data
   * @returns {Promise<Object>} Response with performance metrics or error
   */
  async getPerformanceMetrics() {
    try {
      // Get database performance metrics
      const { data: dbStats, error: dbError } = await supabase
        .rpc('get_database_stats')

      if (dbError && dbError.code !== '42883') { // Function might not exist
        logError(dbError, 'analyticsService.getPerformanceMetrics - database stats')
      }

      // Get table sizes and counts
      const tables = ['users', 'vehicles', 'promotions', 'messages', 'activity_logs', 'notifications']
      const tableStats = {}

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          if (!error) {
            tableStats[table] = { count: count || 0 }
          }
        } catch (err) {
          tableStats[table] = { count: 0, error: err.message }
        }
      }

      // Calculate system health metrics
      const totalRecords = Object.values(tableStats).reduce((sum, stat) => sum + (stat.count || 0), 0)
      const avgResponseTime = await this.measureAverageResponseTime()

      const metrics = {
        database: {
          total_records: totalRecords,
          table_stats: tableStats,
          avg_response_time: avgResponseTime,
          health_status: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'critical'
        },
        system: {
          uptime: process.uptime ? Math.floor(process.uptime()) : null,
          memory_usage: process.memoryUsage ? process.memoryUsage() : null,
          timestamp: new Date().toISOString()
        },
        alerts: []
      }

      // Generate alerts based on metrics
      if (avgResponseTime > 3000) {
        metrics.alerts.push({
          type: 'performance',
          severity: 'high',
          message: 'זמן תגובה גבוה מהרגיל',
          value: avgResponseTime
        })
      }

      if (totalRecords > 100000) {
        metrics.alerts.push({
          type: 'capacity',
          severity: 'medium',
          message: 'מספר הרשומות במסד הנתונים גבוה',
          value: totalRecords
        })
      }

      return createSuccessResponse(metrics)
    } catch (error) {
      return handleApiError(error, 'analyticsService.getPerformanceMetrics')
    }
  },

  /**
   * Export data in various formats
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Response with exported data or error
   */
  async exportData(options = {}) {
    try {
      const {
        dataType = 'vehicles',
        format = 'csv',
        startDate = null,
        endDate = null,
        filters = {}
      } = options

      let query = supabase.from(dataType).select('*')

      // Apply date filters
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value)
        }
      })

      const { data, error } = await query

      if (error) {
        logError(error, 'analyticsService.exportData', options)
        throw error
      }

      let exportedData = data

      if (format === 'csv') {
        exportedData = this.convertToCSV(data)
      } else if (format === 'xlsx') {
        // Placeholder for Excel export
        exportedData = { message: 'Excel export not implemented yet', data }
      }

      return createSuccessResponse({
        format,
        dataType,
        recordCount: data.length,
        exportedAt: new Date().toISOString(),
        data: exportedData
      })
    } catch (error) {
      return handleApiError(error, 'analyticsService.exportData')
    }
  },

  // Helper methods

  /**
   * Group array by field
   * @private
   */
  groupBy(array, field) {
    return array.reduce((groups, item) => {
      const key = item[field] || 'unknown'
      groups[key] = (groups[key] || 0) + 1
      return groups
    }, {})
  },

  /**
   * Group data by time period
   * @private
   */
  groupByTimePeriod(data, groupBy) {
    const groups = {}
    
    data.forEach(item => {
      const date = new Date(item.created_at)
      let key

      switch (groupBy) {
        case 'hour':
          key = date.toISOString().substring(0, 13) + ':00:00.000Z'
          break
        case 'day':
          key = date.toISOString().substring(0, 10)
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().substring(0, 10)
          break
        case 'month':
          key = date.toISOString().substring(0, 7)
          break
        default:
          key = date.toISOString().substring(0, 10)
      }

      groups[key] = (groups[key] || 0) + 1
    })

    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  },

  /**
   * Calculate trend
   * @private
   */
  calculateTrend(value, days) {
    if (days <= 1) return 'new'
    const dailyAvg = value / days
    if (dailyAvg > 10) return 'high'
    if (dailyAvg > 5) return 'medium'
    if (dailyAvg > 1) return 'low'
    return 'very_low'
  },

  /**
   * Calculate price competitiveness
   * @private
   */
  calculatePriceCompetitiveness(vehicle) {
    // Simplified price competitiveness calculation
    // In a real scenario, this would compare with similar vehicles
    const price = vehicle.price || 0
    if (price < 50000) return 'competitive'
    if (price < 100000) return 'average'
    if (price < 200000) return 'premium'
    return 'luxury'
  },

  /**
   * Measure average response time
   * @private
   */
  async measureAverageResponseTime() {
    const measurements = []
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      try {
        await supabase.from('users').select('count').limit(1)
        measurements.push(Date.now() - start)
      } catch (error) {
        measurements.push(5000) // Assume 5s for failed requests
      }
    }

    return Math.round(measurements.reduce((sum, time) => sum + time, 0) / measurements.length)
  },

  /**
   * Convert data to CSV format
   * @private
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  },

  /**
   * Generate overview report
   * @private
   */
  async generateOverviewReport(startDate, endDate) {
    const overview = await this.getSystemOverview()
    return overview.success ? overview.data : {}
  },

  /**
   * Generate user activity report
   * @private
   */
  async generateUserActivityReport(startDate, endDate) {
    // Implementation for user activity report
    return { message: 'User activity report not implemented yet' }
  },

  /**
   * Generate vehicle performance report
   * @private
   */
  async generateVehiclePerformanceReport(startDate, endDate) {
    // Implementation for vehicle performance report
    return { message: 'Vehicle performance report not implemented yet' }
  },

  /**
   * Generate promotion effectiveness report
   * @private
   */
  async generatePromotionEffectivenessReport(startDate, endDate) {
    // Implementation for promotion effectiveness report
    return { message: 'Promotion effectiveness report not implemented yet' }
  },

  /**
   * Generate revenue report
   * @private
   */
  async generateRevenueReport(startDate, endDate) {
    // Implementation for revenue report
    return { message: 'Revenue report not implemented yet' }
  }
}

export default analyticsService