import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Query performance analyzer service
 * Analyzes query patterns, suggests optimizations, and monitors performance
 */

export const queryAnalyzerService = {
  /**
   * Analyze query performance and suggest optimizations
   * @param {string} tableName - Table to analyze
   * @returns {Promise<Object>} Analysis results with optimization suggestions
   */
  async analyzeTablePerformance(tableName) {
    try {
      const analysis = {
        tableName,
        timestamp: new Date().toISOString(),
        tableStats: {},
        indexAnalysis: {},
        queryPatterns: {},
        optimizationSuggestions: []
      }

      // Get table statistics
      analysis.tableStats = await this.getTableStatistics(tableName)
      
      // Analyze indexes
      analysis.indexAnalysis = await this.analyzeIndexUsage(tableName)
      
      // Analyze common query patterns
      analysis.queryPatterns = await this.analyzeQueryPatterns(tableName)
      
      // Generate optimization suggestions
      analysis.optimizationSuggestions = this.generateOptimizationSuggestions(
        analysis.tableStats,
        analysis.indexAnalysis,
        analysis.queryPatterns
      )

      return createSuccessResponse(analysis)
    } catch (error) {
      return handleApiError(error, 'queryAnalyzerService.analyzeTablePerformance')
    }
  },

  /**
   * Get comprehensive table statistics
   * @param {string} tableName - Table name
   * @returns {Promise<Object>} Table statistics
   */
  async getTableStatistics(tableName) {
    try {
      // Get row count
      const { count: rowCount, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: recentCount, error: recentError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo)

      if (recentError && recentError.code !== 'PGRST116') {
        logError(recentError, 'queryAnalyzer.getTableStatistics.recent')
      }

      return {
        totalRows: rowCount || 0,
        recentRows: recentCount || 0,
        growthRate: rowCount > 0 ? ((recentCount || 0) / rowCount) * 100 : 0,
        estimatedSize: this.estimateTableSize(rowCount || 0, tableName)
      }
    } catch (error) {
      logError(error, 'queryAnalyzer.getTableStatistics')
      return {
        totalRows: 0,
        recentRows: 0,
        growthRate: 0,
        estimatedSize: 0
      }
    }
  },

  /**
   * Analyze index usage patterns
   * @param {string} tableName - Table name
   * @returns {Object} Index analysis
   */
  async analyzeIndexUsage(tableName) {
    try {
      // This would typically query pg_stat_user_indexes
      // For now, we'll return suggested indexes based on table structure
      const suggestedIndexes = this.getSuggestedIndexes(tableName)
      
      return {
        existingIndexes: [], // Would be populated from database
        suggestedIndexes,
        indexEfficiency: this.calculateIndexEfficiency(tableName),
        missingIndexes: this.identifyMissingIndexes(tableName)
      }
    } catch (error) {
      logError(error, 'queryAnalyzer.analyzeIndexUsage')
      return {
        existingIndexes: [],
        suggestedIndexes: [],
        indexEfficiency: 0,
        missingIndexes: []
      }
    }
  },

  /**
   * Analyze common query patterns for a table
   * @param {string} tableName - Table name
   * @returns {Object} Query pattern analysis
   */
  analyzeQueryPatterns(tableName) {
    const patterns = {
      vehicles: {
        commonFilters: ['status', 'type', 'manufacturer', 'price', 'year'],
        sortColumns: ['created_at', 'price', 'year', 'views_count'],
        joinTables: ['promotions', 'users'],
        searchColumns: ['title', 'description', 'location'],
        frequentOperations: ['SELECT', 'UPDATE views_count', 'INSERT']
      },
      users: {
        commonFilters: ['email', 'role', 'is_active', 'email_verified'],
        sortColumns: ['created_at', 'last_login', 'login_count'],
        joinTables: ['vehicles', 'messages', 'activity_logs'],
        searchColumns: ['email', 'full_name'],
        frequentOperations: ['SELECT', 'UPDATE', 'INSERT']
      },
      messages: {
        commonFilters: ['recipient_id', 'sender_id', 'is_read', 'message_type'],
        sortColumns: ['created_at'],
        joinTables: ['users', 'vehicles'],
        searchColumns: ['subject', 'content'],
        frequentOperations: ['SELECT', 'INSERT', 'UPDATE is_read']
      },
      promotions: {
        commonFilters: ['vehicle_id', 'is_active', 'payment_status', 'promotion_type'],
        sortColumns: ['created_at', 'end_date', 'start_date'],
        joinTables: ['vehicles', 'users'],
        searchColumns: [],
        frequentOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      },
      activity_logs: {
        commonFilters: ['user_id', 'action', 'resource_type', 'created_at'],
        sortColumns: ['created_at'],
        joinTables: ['users'],
        searchColumns: ['action'],
        frequentOperations: ['SELECT', 'INSERT']
      }
    }

    return patterns[tableName] || {
      commonFilters: [],
      sortColumns: ['created_at'],
      joinTables: [],
      searchColumns: [],
      frequentOperations: ['SELECT']
    }
  },

  /**
   * Generate optimization suggestions based on analysis
   * @param {Object} tableStats - Table statistics
   * @param {Object} indexAnalysis - Index analysis
   * @param {Object} queryPatterns - Query patterns
   * @returns {Array} Optimization suggestions
   */
  generateOptimizationSuggestions(tableStats, indexAnalysis, queryPatterns) {
    const suggestions = []

    // Table size suggestions
    if (tableStats.totalRows > 100000) {
      suggestions.push({
        type: 'partitioning',
        priority: 'medium',
        title: 'Consider Table Partitioning',
        description: `Table has ${tableStats.totalRows.toLocaleString()} rows. Consider partitioning by date or other criteria.`,
        impact: 'high',
        effort: 'high'
      })
    }

    // Growth rate suggestions
    if (tableStats.growthRate > 10) {
      suggestions.push({
        type: 'monitoring',
        priority: 'medium',
        title: 'High Growth Rate Detected',
        description: `Table is growing at ${tableStats.growthRate.toFixed(2)}% per day. Monitor storage and performance.`,
        impact: 'medium',
        effort: 'low'
      })
    }

    // Index suggestions
    if (indexAnalysis.missingIndexes.length > 0) {
      suggestions.push({
        type: 'indexing',
        priority: 'high',
        title: 'Missing Critical Indexes',
        description: `Add indexes for: ${indexAnalysis.missingIndexes.join(', ')}`,
        impact: 'high',
        effort: 'low',
        sqlCommands: indexAnalysis.missingIndexes
      })
    }

    // Query pattern suggestions
    if (queryPatterns.searchColumns.length > 0) {
      suggestions.push({
        type: 'full_text_search',
        priority: 'medium',
        title: 'Full-Text Search Optimization',
        description: `Consider adding GIN indexes for full-text search on: ${queryPatterns.searchColumns.join(', ')}`,
        impact: 'medium',
        effort: 'medium'
      })
    }

    // Join optimization suggestions
    if (queryPatterns.joinTables.length > 2) {
      suggestions.push({
        type: 'join_optimization',
        priority: 'medium',
        title: 'Join Optimization',
        description: `Frequently joined with ${queryPatterns.joinTables.length} tables. Consider denormalization for read-heavy operations.`,
        impact: 'medium',
        effort: 'high'
      })
    }

    return suggestions
  },

  /**
   * Get suggested indexes for a table
   * @param {string} tableName - Table name
   * @returns {Array} Suggested index SQL commands
   */
  getSuggestedIndexes(tableName) {
    const indexSuggestions = {
      vehicles: [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_status_type ON vehicles(status, type)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_price_range ON vehicles(price) WHERE status = \'למכירה\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_year_range ON vehicles(year) WHERE status = \'למכירה\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_manufacturer_model ON vehicles(manufacturer, model)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_location_search ON vehicles USING gin(to_tsvector(\'hebrew\', location))',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_created_by_status ON vehicles(created_by, status)'
      ],
      users: [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active ON users(role, is_active)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login DESC) WHERE is_active = true',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users(email_verified, created_at)'
      ],
      messages: [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, created_at DESC) WHERE is_read = false',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type_recipient ON messages(message_type, recipient_id, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_vehicle_related ON messages(related_vehicle_id) WHERE related_vehicle_id IS NOT NULL'
      ],
      promotions: [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotions_vehicle_active ON promotions(vehicle_id, is_active, end_date)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotions_active_type ON promotions(promotion_type, end_date DESC) WHERE is_active = true',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotions_payment_status ON promotions(payment_status, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotions_created_by_active ON promotions(created_by, is_active, end_date)'
      ],
      activity_logs: [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_action ON activity_logs(user_id, action, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_resource ON activity_logs(resource_type, resource_id, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_created_at_only ON activity_logs(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_success ON activity_logs(success, created_at DESC)'
      ]
    }

    return indexSuggestions[tableName] || []
  },

  /**
   * Calculate index efficiency score
   * @param {string} tableName - Table name
   * @returns {number} Efficiency score (0-100)
   */
  calculateIndexEfficiency(tableName) {
    // This would typically analyze actual index usage statistics
    // For now, return a score based on table characteristics
    const baseScores = {
      vehicles: 75, // Has some indexes but could be optimized
      users: 80,    // Well indexed for common operations
      messages: 70, // Needs conversation-specific indexes
      promotions: 65, // Missing some composite indexes
      activity_logs: 60 // Needs better time-based indexing
    }

    return baseScores[tableName] || 50
  },

  /**
   * Identify missing critical indexes
   * @param {string} tableName - Table name
   * @returns {Array} Missing index SQL commands
   */
  identifyMissingIndexes(tableName) {
    // Return high-priority missing indexes
    const criticalIndexes = {
      vehicles: [
        'CREATE INDEX CONCURRENTLY idx_vehicles_search_optimized ON vehicles(status, type, manufacturer, price, created_at DESC) WHERE status = \'למכירה\''
      ],
      messages: [
        'CREATE INDEX CONCURRENTLY idx_messages_inbox_optimized ON messages(recipient_id, is_read, created_at DESC)'
      ],
      promotions: [
        'CREATE INDEX CONCURRENTLY idx_promotions_active_optimized ON promotions(vehicle_id, is_active, payment_status, end_date) WHERE is_active = true'
      ]
    }

    return criticalIndexes[tableName] || []
  },

  /**
   * Estimate table size in bytes
   * @param {number} rowCount - Number of rows
   * @param {string} tableName - Table name
   * @returns {number} Estimated size in bytes
   */
  estimateTableSize(rowCount, tableName) {
    // Rough estimates based on average row sizes
    const avgRowSizes = {
      vehicles: 2048,    // ~2KB per vehicle (with images array)
      users: 512,       // ~512B per user
      messages: 1024,   // ~1KB per message
      promotions: 256,  // ~256B per promotion
      activity_logs: 512 // ~512B per log entry
    }

    const avgRowSize = avgRowSizes[tableName] || 512
    return rowCount * avgRowSize
  },

  /**
   * Analyze slow queries and suggest optimizations
   * @param {Array} slowQueries - Array of slow query objects
   * @returns {Promise<Object>} Analysis with optimization suggestions
   */
  async analyzeSlowQueries(slowQueries) {
    try {
      const analysis = {
        totalSlowQueries: slowQueries.length,
        avgExecutionTime: 0,
        queryCategories: {},
        optimizationSuggestions: []
      }

      if (slowQueries.length === 0) {
        return createSuccessResponse(analysis)
      }

      // Calculate average execution time
      analysis.avgExecutionTime = slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length

      // Categorize queries
      slowQueries.forEach(query => {
        const category = this.categorizeQuery(query.queryName)
        if (!analysis.queryCategories[category]) {
          analysis.queryCategories[category] = {
            count: 0,
            totalTime: 0,
            avgTime: 0,
            queries: []
          }
        }
        analysis.queryCategories[category].count++
        analysis.queryCategories[category].totalTime += query.executionTime
        analysis.queryCategories[category].queries.push(query)
      })

      // Calculate averages for categories
      Object.values(analysis.queryCategories).forEach(category => {
        category.avgTime = category.totalTime / category.count
      })

      // Generate optimization suggestions
      analysis.optimizationSuggestions = this.generateSlowQueryOptimizations(analysis.queryCategories)

      return createSuccessResponse(analysis)
    } catch (error) {
      return handleApiError(error, 'queryAnalyzerService.analyzeSlowQueries')
    }
  },

  /**
   * Categorize query by type
   * @param {string} queryName - Query name
   * @returns {string} Query category
   */
  categorizeQuery(queryName) {
    if (queryName.includes('search') || queryName.includes('filter')) return 'search'
    if (queryName.includes('analytics') || queryName.includes('stats')) return 'analytics'
    if (queryName.includes('inbox') || queryName.includes('message')) return 'messaging'
    if (queryName.includes('promotion')) return 'promotions'
    if (queryName.includes('user')) return 'user_management'
    return 'other'
  },

  /**
   * Generate optimization suggestions for slow queries
   * @param {Object} queryCategories - Categorized slow queries
   * @returns {Array} Optimization suggestions
   */
  generateSlowQueryOptimizations(queryCategories) {
    const suggestions = []

    Object.entries(queryCategories).forEach(([category, data]) => {
      if (data.avgTime > 2000) { // Queries taking more than 2 seconds
        switch (category) {
          case 'search':
            suggestions.push({
              type: 'indexing',
              priority: 'high',
              title: 'Optimize Search Queries',
              description: `Search queries averaging ${data.avgTime.toFixed(0)}ms. Add composite indexes for common search patterns.`,
              category,
              impact: 'high',
              effort: 'medium'
            })
            break
          case 'analytics':
            suggestions.push({
              type: 'caching',
              priority: 'medium',
              title: 'Cache Analytics Results',
              description: `Analytics queries averaging ${data.avgTime.toFixed(0)}ms. Implement result caching.`,
              category,
              impact: 'medium',
              effort: 'low'
            })
            break
          case 'messaging':
            suggestions.push({
              type: 'pagination',
              priority: 'medium',
              title: 'Optimize Message Queries',
              description: `Message queries averaging ${data.avgTime.toFixed(0)}ms. Implement better pagination and indexing.`,
              category,
              impact: 'medium',
              effort: 'medium'
            })
            break
        }
      }
    })

    return suggestions
  },

  /**
   * Generate performance report for all tables
   * @returns {Promise<Object>} Comprehensive performance report
   */
  async generatePerformanceReport() {
    try {
      const tables = ['vehicles', 'users', 'messages', 'promotions', 'activity_logs']
      const report = {
        timestamp: new Date().toISOString(),
        overallScore: 0,
        tableAnalyses: {},
        globalSuggestions: [],
        summary: {}
      }

      // Analyze each table
      for (const table of tables) {
        const analysis = await this.analyzeTablePerformance(table)
        if (analysis.success) {
          report.tableAnalyses[table] = analysis.data
        }
      }

      // Calculate overall performance score
      const scores = Object.values(report.tableAnalyses)
        .map(analysis => analysis.indexAnalysis.indexEfficiency)
        .filter(score => score > 0)
      
      report.overallScore = scores.length > 0 ? 
        Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0

      // Generate global suggestions
      report.globalSuggestions = this.generateGlobalOptimizations(report.tableAnalyses)

      // Create summary
      report.summary = {
        tablesAnalyzed: tables.length,
        totalOptimizationSuggestions: Object.values(report.tableAnalyses)
          .reduce((sum, analysis) => sum + analysis.optimizationSuggestions.length, 0),
        highPrioritySuggestions: Object.values(report.tableAnalyses)
          .reduce((sum, analysis) => 
            sum + analysis.optimizationSuggestions.filter(s => s.priority === 'high').length, 0),
        overallHealthStatus: report.overallScore >= 80 ? 'excellent' : 
                           report.overallScore >= 60 ? 'good' : 
                           report.overallScore >= 40 ? 'fair' : 'poor'
      }

      return createSuccessResponse(report)
    } catch (error) {
      return handleApiError(error, 'queryAnalyzerService.generatePerformanceReport')
    }
  },

  /**
   * Generate global optimization suggestions
   * @param {Object} tableAnalyses - All table analyses
   * @returns {Array} Global optimization suggestions
   */
  generateGlobalOptimizations(tableAnalyses) {
    const suggestions = []
    const allSuggestions = Object.values(tableAnalyses)
      .flatMap(analysis => analysis.optimizationSuggestions)

    // Count suggestion types
    const suggestionCounts = {}
    allSuggestions.forEach(suggestion => {
      suggestionCounts[suggestion.type] = (suggestionCounts[suggestion.type] || 0) + 1
    })

    // Generate global suggestions based on patterns
    if (suggestionCounts.indexing >= 3) {
      suggestions.push({
        type: 'global_indexing',
        priority: 'high',
        title: 'Database-Wide Index Optimization',
        description: 'Multiple tables need index optimization. Consider a comprehensive indexing strategy.',
        impact: 'high',
        effort: 'medium'
      })
    }

    if (suggestionCounts.partitioning >= 2) {
      suggestions.push({
        type: 'global_partitioning',
        priority: 'medium',
        title: 'Database Partitioning Strategy',
        description: 'Multiple large tables detected. Implement a partitioning strategy.',
        impact: 'high',
        effort: 'high'
      })
    }

    return suggestions
  }
}

export default queryAnalyzerService