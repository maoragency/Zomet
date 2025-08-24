import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Database connection pooling and monitoring service
 * Manages database connections, monitors performance, and handles connection optimization
 */

class DatabaseConnectionPool {
  constructor() {
    this.connections = new Map()
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      connectionErrors: []
    }
    this.queryMetrics = new Map()
    this.isMonitoring = false
    this.monitoringInterval = null
  }

  /**
   * Initialize connection pool monitoring
   */
  initialize() {
    if (!this.isMonitoring) {
      this.startMonitoring()
      this.setupConnectionHealthCheck()
    }
  }

  /**
   * Start monitoring database connections
   */
  startMonitoring() {
    this.isMonitoring = true
    
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectConnectionMetrics()
      this.cleanupOldMetrics()
    }, 30000)

    // Initial metrics collection
    this.collectConnectionMetrics()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
  }

  /**
   * Execute query with connection monitoring
   * @param {string} queryName - Name of the query for tracking
   * @param {Function} queryFn - Query function to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Query result with metrics
   */
  async executeQuery(queryName, queryFn, options = {}) {
    const startTime = Date.now()
    const connectionId = this.generateConnectionId()
    
    try {
      // Track connection start
      this.connections.set(connectionId, {
        queryName,
        startTime,
        status: 'active'
      })
      
      this.connectionStats.activeConnections++
      this.connectionStats.totalConnections++

      // Execute query with timeout
      const timeout = options.timeout || 30000 // 30 seconds default
      const result = await Promise.race([
        queryFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ])

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Update metrics
      this.updateQueryMetrics(queryName, executionTime, true)
      this.connectionStats.avgResponseTime = this.calculateAvgResponseTime()

      // Track slow queries
      if (executionTime > (options.slowQueryThreshold || 1000)) {
        this.connectionStats.slowQueries++
        logError(new Error(`Slow query detected: ${queryName}`), 'db_connection_pool', {
          queryName,
          executionTime,
          threshold: options.slowQueryThreshold || 1000
        })
      }

      // Clean up connection tracking
      this.connections.delete(connectionId)
      this.connectionStats.activeConnections--
      this.connectionStats.idleConnections++

      return createSuccessResponse(result, null, {
        executionTime,
        connectionId,
        queryName
      })

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Update error metrics
      this.updateQueryMetrics(queryName, executionTime, false)
      this.connectionStats.failedConnections++
      this.connectionStats.connectionErrors.push({
        queryName,
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime
      })

      // Keep only last 100 errors
      if (this.connectionStats.connectionErrors.length > 100) {
        this.connectionStats.connectionErrors = this.connectionStats.connectionErrors.slice(-100)
      }

      // Clean up connection tracking
      this.connections.delete(connectionId)
      this.connectionStats.activeConnections--

      logError(error, 'db_connection_pool', {
        queryName,
        executionTime,
        connectionId
      })

      throw error
    }
  }

  /**
   * Execute multiple queries in parallel with connection management
   * @param {Array} queries - Array of query objects
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Array of results
   */
  async executeParallel(queries, options = {}) {
    const maxConcurrency = options.maxConcurrency || 5
    const results = []
    
    // Process queries in batches to avoid overwhelming the connection pool
    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency)
      
      const batchPromises = batch.map(query => 
        this.executeQuery(query.name, query.queryFn, query.options)
      )
      
      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      } catch (error) {
        logError(error, 'db_connection_pool.executeParallel', {
          batchIndex: Math.floor(i / maxConcurrency),
          batchSize: batch.length
        })
        throw error
      }
    }
    
    return results
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      timestamp: new Date().toISOString(),
      queryMetrics: this.getTopQueries(),
      activeConnections: this.connections.size
    }
  }

  /**
   * Get top queries by various metrics
   * @returns {Object} Top queries statistics
   */
  getTopQueries() {
    const queries = Array.from(this.queryMetrics.entries()).map(([name, metrics]) => ({
      name,
      ...metrics
    }))

    return {
      slowest: queries
        .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
        .slice(0, 10),
      mostFrequent: queries
        .sort((a, b) => b.executionCount - a.executionCount)
        .slice(0, 10),
      mostErrors: queries
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 10)
    }
  }

  /**
   * Health check for database connections
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      const startTime = Date.now()
      
      // Simple query to test connection
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .single()

      const responseTime = Date.now() - startTime

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const health = {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        connectionStats: this.getConnectionStats()
      }

      // Determine health status based on metrics
      if (responseTime > 5000) {
        health.status = 'critical'
        health.issues = ['High response time']
      } else if (responseTime > 2000 || this.connectionStats.failedConnections > 10) {
        health.status = 'warning'
        health.issues = ['Elevated response time or connection failures']
      }

      return createSuccessResponse(health)
    } catch (error) {
      return handleApiError(error, 'db_connection_pool.healthCheck')
    }
  }

  /**
   * Optimize connection pool based on current metrics
   * @returns {Object} Optimization recommendations
   */
  optimizePool() {
    const stats = this.getConnectionStats()
    const recommendations = []

    // Analyze connection patterns
    if (stats.avgResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Average response time is high. Consider optimizing queries or increasing connection pool size.',
        metric: 'avgResponseTime',
        value: stats.avgResponseTime
      })
    }

    if (stats.slowQueries > 50) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High number of slow queries detected. Review query optimization.',
        metric: 'slowQueries',
        value: stats.slowQueries
      })
    }

    if (stats.failedConnections > stats.totalConnections * 0.1) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'High connection failure rate. Check network stability and database health.',
        metric: 'failedConnections',
        value: stats.failedConnections
      })
    }

    if (stats.activeConnections > 20) {
      recommendations.push({
        type: 'capacity',
        priority: 'medium',
        message: 'High number of active connections. Consider connection pooling optimization.',
        metric: 'activeConnections',
        value: stats.activeConnections
      })
    }

    return {
      timestamp: new Date().toISOString(),
      recommendations,
      currentStats: stats,
      optimizationScore: this.calculateOptimizationScore(stats)
    }
  }

  /**
   * Reset connection statistics
   */
  resetStats() {
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      connectionErrors: []
    }
    this.queryMetrics.clear()
  }

  // Private methods

  /**
   * Generate unique connection ID
   * @private
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Update query metrics
   * @private
   */
  updateQueryMetrics(queryName, executionTime, success) {
    if (!this.queryMetrics.has(queryName)) {
      this.queryMetrics.set(queryName, {
        executionCount: 0,
        totalExecutionTime: 0,
        avgExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        errorCount: 0,
        successCount: 0,
        lastExecuted: null
      })
    }

    const metrics = this.queryMetrics.get(queryName)
    metrics.executionCount++
    metrics.totalExecutionTime += executionTime
    metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.executionCount
    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime)
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime)
    metrics.lastExecuted = new Date().toISOString()

    if (success) {
      metrics.successCount++
    } else {
      metrics.errorCount++
    }
  }

  /**
   * Calculate average response time
   * @private
   */
  calculateAvgResponseTime() {
    const allMetrics = Array.from(this.queryMetrics.values())
    if (allMetrics.length === 0) return 0

    const totalTime = allMetrics.reduce((sum, metrics) => sum + metrics.totalExecutionTime, 0)
    const totalCount = allMetrics.reduce((sum, metrics) => sum + metrics.executionCount, 0)

    return totalCount > 0 ? Math.round(totalTime / totalCount) : 0
  }

  /**
   * Clean up old metrics
   * @private
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    
    for (const [queryName, metrics] of this.queryMetrics.entries()) {
      if (metrics.lastExecuted && new Date(metrics.lastExecuted).getTime() < oneHourAgo) {
        // Reset metrics for queries not executed in the last hour
        metrics.executionCount = Math.floor(metrics.executionCount * 0.9)
        metrics.totalExecutionTime = Math.floor(metrics.totalExecutionTime * 0.9)
        metrics.avgExecutionTime = metrics.executionCount > 0 ? 
          metrics.totalExecutionTime / metrics.executionCount : 0
      }
    }
  }

  /**
   * Setup connection health check
   * @private
   */
  setupConnectionHealthCheck() {
    // Run health check every 5 minutes
    setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        logError(error, 'db_connection_pool.healthCheck')
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Collect connection metrics from database
   * @private
   */
  async collectConnectionMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_database_stats')
      
      if (error) {
        logError(error, 'db_connection_pool.collectConnectionMetrics')
        return
      }

      // Update connection stats with database metrics
      if (data && data.connection_stats) {
        this.connectionStats.totalConnections = data.connection_stats.total_connections || 0
        this.connectionStats.activeConnections = data.connection_stats.active_connections || 0
        this.connectionStats.idleConnections = data.connection_stats.idle_connections || 0
      }
    } catch (error) {
      logError(error, 'db_connection_pool.collectConnectionMetrics')
    }
  }

  /**
   * Calculate optimization score
   * @private
   */
  calculateOptimizationScore(stats) {
    let score = 100

    // Deduct points for performance issues
    if (stats.avgResponseTime > 1000) score -= 20
    if (stats.avgResponseTime > 2000) score -= 30
    if (stats.slowQueries > 10) score -= 15
    if (stats.failedConnections > 5) score -= 25
    if (stats.activeConnections > 15) score -= 10

    return Math.max(0, score)
  }
}

// Create singleton instance
const dbConnectionPool = new DatabaseConnectionPool()

export const dbConnectionPoolService = {
  /**
   * Initialize the connection pool
   */
  initialize() {
    dbConnectionPool.initialize()
  },

  /**
   * Execute query with connection monitoring
   */
  async executeQuery(queryName, queryFn, options = {}) {
    return dbConnectionPool.executeQuery(queryName, queryFn, options)
  },

  /**
   * Execute multiple queries in parallel
   */
  async executeParallel(queries, options = {}) {
    return dbConnectionPool.executeParallel(queries, options)
  },

  /**
   * Get connection statistics
   */
  getStats() {
    return dbConnectionPool.getConnectionStats()
  },

  /**
   * Perform health check
   */
  async healthCheck() {
    return dbConnectionPool.healthCheck()
  },

  /**
   * Get optimization recommendations
   */
  optimize() {
    return dbConnectionPool.optimizePool()
  },

  /**
   * Reset statistics
   */
  resetStats() {
    dbConnectionPool.resetStats()
  },

  /**
   * Stop monitoring
   */
  stop() {
    dbConnectionPool.stopMonitoring()
  }
}

export default dbConnectionPoolService