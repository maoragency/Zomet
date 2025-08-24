import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Audit service for Supabase operations
 * Handles comprehensive action logging, security monitoring, and compliance reporting
 */

export const auditService = {
  /**
   * Log an audit event
   * @param {Object} auditData - Audit event data
   * @returns {Promise<Object>} Response with logged audit event or error
   */
  async logAuditEvent(auditData) {
    try {
      // Validate required fields
      const validation = validateRequiredFields(auditData, ['action', 'table_name'])
      if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      
      const sanitizedData = {
        user_id: user?.id || null,
        action: sanitizeInput(auditData.action),
        table_name: sanitizeInput(auditData.table_name),
        record_id: auditData.record_id || null,
        old_values: auditData.old_values || null,
        new_values: auditData.new_values || null,
        ip_address: auditData.ip_address || null,
        user_agent: auditData.user_agent || null,
        metadata: auditData.metadata || {},
        severity: auditData.severity || 'info',
        category: auditData.category || 'general'
      }

      const { data, error } = await supabase
        .from('audit_logs')
        .insert([sanitizedData])
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .single()

      if (error) {
        logError(error, 'auditService.logAuditEvent', { auditData: sanitizedData })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'auditService.logAuditEvent')
    }
  },

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with audit logs or error
   */
  async getAuditLogs(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 50,
        userId = null,
        action = null,
        tableName = null,
        severity = null,
        category = null,
        startDate = null,
        endDate = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (action) {
        query = query.eq('action', action)
      }
      if (tableName) {
        query = query.eq('table_name', tableName)
      }
      if (severity) {
        query = query.eq('severity', severity)
      }
      if (category) {
        query = query.eq('category', category)
      }
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
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
        logError(error, 'auditService.getAuditLogs', options)
        throw error
      }

      return createSuccessResponse({
        logs: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'auditService.getAuditLogs')
    }
  },

  /**
   * Get audit statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Response with audit statistics or error
   */
  async getAuditStatistics(options = {}) {
    try {
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

      let query = supabase
        .from('audit_logs')
        .select('action, table_name, severity, category, user_id, created_at')

      if (dateFilter.start) {
        query = query.gte('created_at', dateFilter.start)
      }
      if (dateFilter.end) {
        query = query.lte('created_at', dateFilter.end)
      }

      const { data: logs, error } = await query

      if (error) {
        logError(error, 'auditService.getAuditStatistics', options)
        throw error
      }

      // Calculate statistics
      const stats = {
        total_events: logs.length,
        by_action: this.groupBy(logs, 'action'),
        by_table: this.groupBy(logs, 'table_name'),
        by_severity: this.groupBy(logs, 'severity'),
        by_category: this.groupBy(logs, 'category'),
        by_user: this.groupBy(logs, 'user_id'),
        timeline: this.groupByTimePeriod(logs, 'day'),
        top_users: this.getTopUsers(logs),
        security_events: logs.filter(log => log.category === 'security').length,
        error_events: logs.filter(log => log.severity === 'error').length,
        warning_events: logs.filter(log => log.severity === 'warning').length
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'auditService.getAuditStatistics')
    }
  },

  /**
   * Get user activity trail
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with user activity trail or error
   */
  async getUserActivityTrail(userId, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 50,
        startDate = null,
        endDate = null,
        action = null
      } = options

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .eq('user_id', userId)

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (action) {
        query = query.eq('action', action)
      }

      // Apply sorting and pagination
      query = query.order('created_at', { ascending: false })
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'auditService.getUserActivityTrail', { userId, options })
        throw error
      }

      return createSuccessResponse({
        user_id: userId,
        activities: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'auditService.getUserActivityTrail')
    }
  },

  /**
   * Get security events
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with security events or error
   */
  async getSecurityEvents(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 50,
        severity = null,
        startDate = null,
        endDate = null
      } = options

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .eq('category', 'security')

      // Apply filters
      if (severity) {
        query = query.eq('severity', severity)
      }
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      // Apply sorting and pagination
      query = query.order('created_at', { ascending: false })
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'auditService.getSecurityEvents', options)
        throw error
      }

      return createSuccessResponse({
        events: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'auditService.getSecurityEvents')
    }
  },

  /**
   * Generate compliance report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Response with compliance report or error
   */
  async generateComplianceReport(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        reportType = 'full',
        format = 'json'
      } = options

      // Calculate date range
      let dateFilter = {}
      if (startDate && endDate) {
        dateFilter = { start: startDate, end: endDate }
      } else {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString()
        }
      }

      // Get audit logs for the period
      const auditResponse = await this.getAuditLogs({
        startDate: dateFilter.start,
        endDate: dateFilter.end,
        pageSize: 10000 // Get all records for report
      })

      if (!auditResponse.success) {
        throw new Error('Failed to fetch audit logs for compliance report')
      }

      const logs = auditResponse.data.logs

      // Generate compliance metrics
      const report = {
        report_type: reportType,
        generated_at: new Date().toISOString(),
        period: {
          start: dateFilter.start,
          end: dateFilter.end
        },
        summary: {
          total_events: logs.length,
          unique_users: new Set(logs.map(log => log.user_id).filter(Boolean)).size,
          security_events: logs.filter(log => log.category === 'security').length,
          failed_operations: logs.filter(log => log.severity === 'error').length,
          data_modifications: logs.filter(log => ['INSERT', 'UPDATE', 'DELETE'].includes(log.action)).length
        },
        compliance_checks: {
          data_access_logged: logs.filter(log => log.action === 'SELECT').length > 0,
          data_modifications_logged: logs.filter(log => ['INSERT', 'UPDATE', 'DELETE'].includes(log.action)).length > 0,
          user_authentication_logged: logs.filter(log => log.action.includes('login')).length > 0,
          security_events_monitored: logs.filter(log => log.category === 'security').length >= 0,
          audit_trail_complete: logs.length > 0
        },
        risk_assessment: {
          high_risk_events: logs.filter(log => log.severity === 'critical').length,
          medium_risk_events: logs.filter(log => log.severity === 'warning').length,
          suspicious_activities: logs.filter(log => 
            log.category === 'security' && log.severity !== 'info'
          ).length
        },
        recommendations: this.generateComplianceRecommendations(logs)
      }

      if (format === 'csv') {
        report.csv_data = this.convertLogsToCSV(logs)
      }

      return createSuccessResponse(report)
    } catch (error) {
      return handleApiError(error, 'auditService.generateComplianceReport')
    }
  },

  /**
   * Monitor for suspicious activities
   * @param {Object} options - Monitoring options
   * @returns {Promise<Object>} Response with suspicious activities or error
   */
  async monitorSuspiciousActivities(options = {}) {
    try {
      const {
        timeWindow = '1h',
        thresholds = {
          failed_logins: 5,
          rapid_requests: 100,
          unusual_access_patterns: 10
        }
      } = options

      const now = new Date()
      const windowStart = new Date(now.getTime() - this.parseTimeWindow(timeWindow))

      const { data: recentLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        logError(error, 'auditService.monitorSuspiciousActivities', options)
        throw error
      }

      const suspiciousActivities = []

      // Check for failed login attempts
      const failedLogins = recentLogs.filter(log => 
        log.action === 'login_failed' || log.action === 'authentication_failed'
      )
      const failedLoginsByUser = this.groupBy(failedLogins, 'user_id')
      
      Object.entries(failedLoginsByUser).forEach(([userId, count]) => {
        if (count >= thresholds.failed_logins) {
          suspiciousActivities.push({
            type: 'excessive_failed_logins',
            severity: 'high',
            user_id: userId,
            count,
            threshold: thresholds.failed_logins,
            detected_at: new Date().toISOString()
          })
        }
      })

      // Check for rapid requests from same user
      const requestsByUser = this.groupBy(recentLogs, 'user_id')
      Object.entries(requestsByUser).forEach(([userId, count]) => {
        if (count >= thresholds.rapid_requests) {
          suspiciousActivities.push({
            type: 'rapid_requests',
            severity: 'medium',
            user_id: userId,
            count,
            threshold: thresholds.rapid_requests,
            detected_at: new Date().toISOString()
          })
        }
      })

      // Check for unusual access patterns
      const accessPatterns = this.analyzeAccessPatterns(recentLogs)
      accessPatterns.forEach(pattern => {
        if (pattern.anomaly_score > thresholds.unusual_access_patterns) {
          suspiciousActivities.push({
            type: 'unusual_access_pattern',
            severity: 'medium',
            ...pattern,
            detected_at: new Date().toISOString()
          })
        }
      })

      return createSuccessResponse({
        monitoring_window: timeWindow,
        window_start: windowStart.toISOString(),
        window_end: now.toISOString(),
        total_events_analyzed: recentLogs.length,
        suspicious_activities: suspiciousActivities,
        risk_level: this.calculateRiskLevel(suspiciousActivities)
      })
    } catch (error) {
      return handleApiError(error, 'auditService.monitorSuspiciousActivities')
    }
  },

  /**
   * Clean up old audit logs
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Response with cleanup results or error
   */
  async cleanupOldAuditLogs(options = {}) {
    try {
      const {
        retentionDays = 365,
        batchSize = 1000,
        dryRun = false
      } = options

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Count logs to be deleted
      const { count: totalToDelete, error: countError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())

      if (countError) {
        logError(countError, 'auditService.cleanupOldAuditLogs - count', options)
        throw countError
      }

      if (dryRun) {
        return createSuccessResponse({
          dry_run: true,
          cutoff_date: cutoffDate.toISOString(),
          logs_to_delete: totalToDelete || 0,
          estimated_batches: Math.ceil((totalToDelete || 0) / batchSize)
        })
      }

      let deletedCount = 0
      let batchCount = 0

      while (deletedCount < (totalToDelete || 0)) {
        const { data: batch, error: deleteError } = await supabase
          .from('audit_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString())
          .limit(batchSize)
          .select('id')

        if (deleteError) {
          logError(deleteError, 'auditService.cleanupOldAuditLogs - delete batch', { batchCount })
          break
        }

        deletedCount += batch?.length || 0
        batchCount++

        // Add small delay between batches to avoid overwhelming the database
        if (batch?.length === batchSize) {
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          break // Last batch was smaller than batchSize, we're done
        }
      }

      // Log the cleanup operation
      await this.logAuditEvent({
        action: 'audit_logs_cleanup',
        table_name: 'audit_logs',
        metadata: {
          retention_days: retentionDays,
          cutoff_date: cutoffDate.toISOString(),
          deleted_count: deletedCount,
          batch_count: batchCount
        },
        category: 'maintenance',
        severity: 'info'
      })

      return createSuccessResponse({
        cutoff_date: cutoffDate.toISOString(),
        total_deleted: deletedCount,
        batches_processed: batchCount,
        retention_days: retentionDays
      }, `${deletedCount} רשומות ביקורת נמחקו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'auditService.cleanupOldAuditLogs')
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
   * Get top users by activity
   * @private
   */
  getTopUsers(logs) {
    const userCounts = this.groupBy(logs, 'user_id')
    return Object.entries(userCounts)
      .map(([userId, count]) => ({ user_id: userId, event_count: count }))
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 10)
  },

  /**
   * Parse time window string to milliseconds
   * @private
   */
  parseTimeWindow(timeWindow) {
    const unit = timeWindow.slice(-1)
    const value = parseInt(timeWindow.slice(0, -1))
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      case 'w': return value * 7 * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // Default to 1 hour
    }
  },

  /**
   * Analyze access patterns for anomalies
   * @private
   */
  analyzeAccessPatterns(logs) {
    // Simplified anomaly detection
    const patterns = []
    const userActions = {}

    logs.forEach(log => {
      if (!userActions[log.user_id]) {
        userActions[log.user_id] = []
      }
      userActions[log.user_id].push(log)
    })

    Object.entries(userActions).forEach(([userId, userLogs]) => {
      const uniqueActions = new Set(userLogs.map(log => log.action)).size
      const uniqueTables = new Set(userLogs.map(log => log.table_name)).size
      const timeSpan = new Date(Math.max(...userLogs.map(log => new Date(log.created_at)))) - 
                      new Date(Math.min(...userLogs.map(log => new Date(log.created_at))))

      // Simple anomaly scoring
      let anomalyScore = 0
      if (uniqueActions > 10) anomalyScore += 5
      if (uniqueTables > 5) anomalyScore += 3
      if (timeSpan < 60000 && userLogs.length > 20) anomalyScore += 7 // Many actions in short time

      if (anomalyScore > 0) {
        patterns.push({
          user_id: userId,
          anomaly_score: anomalyScore,
          unique_actions: uniqueActions,
          unique_tables: uniqueTables,
          total_events: userLogs.length,
          time_span_ms: timeSpan
        })
      }
    })

    return patterns
  },

  /**
   * Calculate overall risk level
   * @private
   */
  calculateRiskLevel(suspiciousActivities) {
    if (suspiciousActivities.length === 0) return 'low'
    
    const highSeverityCount = suspiciousActivities.filter(a => a.severity === 'high').length
    const mediumSeverityCount = suspiciousActivities.filter(a => a.severity === 'medium').length

    if (highSeverityCount > 0) return 'high'
    if (mediumSeverityCount > 2) return 'medium'
    return 'low'
  },

  /**
   * Generate compliance recommendations
   * @private
   */
  generateComplianceRecommendations(logs) {
    const recommendations = []

    if (logs.filter(log => log.category === 'security').length === 0) {
      recommendations.push({
        type: 'security_monitoring',
        priority: 'high',
        message: 'יש להגביר את ניטור אירועי האבטחה'
      })
    }

    if (logs.filter(log => log.severity === 'error').length > logs.length * 0.1) {
      recommendations.push({
        type: 'error_rate',
        priority: 'medium',
        message: 'שיעור השגיאות גבוה - יש לבדוק את יציבות המערכת'
      })
    }

    if (new Set(logs.map(log => log.user_id).filter(Boolean)).size < 2) {
      recommendations.push({
        type: 'user_diversity',
        priority: 'low',
        message: 'מספר המשתמשים הפעילים נמוך'
      })
    }

    return recommendations
  },

  /**
   * Convert logs to CSV format
   * @private
   */
  convertLogsToCSV(logs) {
    if (!logs || logs.length === 0) return ''

    const headers = ['created_at', 'user_id', 'action', 'table_name', 'severity', 'category']
    const csvRows = [headers.join(',')]

    logs.forEach(log => {
      const values = headers.map(header => {
        const value = log[header] || ''
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }
}

export default auditService