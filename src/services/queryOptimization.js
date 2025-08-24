import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Query optimization service for database performance
 * Implements caching, query optimization, and performance monitoring
 */

// In-memory cache for frequently accessed data
const queryCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes default TTL

export const queryOptimizationService = {
  /**
   * Execute query with caching
   * @param {string} cacheKey - Unique cache key
   * @param {Function} queryFn - Function that returns the query promise
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<Object>} Cached or fresh query result
   */
  async executeWithCache(cacheKey, queryFn, ttl = CACHE_TTL) {
    try {
      // Check cache first
      const cached = queryCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < ttl) {
        return createSuccessResponse(cached.data, 'Data retrieved from cache')
      }

      // Execute query
      const startTime = Date.now()
      const result = await queryFn()
      const executionTime = Date.now() - startTime

      // Cache the result
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        executionTime
      })

      // Log slow queries
      if (executionTime > 1000) {
        logError(new Error(`Slow query detected: ${cacheKey}`), 'queryOptimization', {
          cacheKey,
          executionTime,
          threshold: 1000
        })
      }

      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error, 'queryOptimizationService.executeWithCache')
    }
  },

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match cache keys
   */
  invalidateCache(pattern) {
    try {
      const keysToDelete = []
      for (const key of queryCache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => queryCache.delete(key))
    } catch (error) {
      logError(error, 'queryOptimizationService.invalidateCache')
    }
  },

  /**
   * Clear all cache
   */
  clearCache() {
    queryCache.clear()
  },

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const stats = {
      size: queryCache.size,
      entries: [],
      totalMemory: 0
    }

    for (const [key, value] of queryCache.entries()) {
      const entry = {
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp,
        executionTime: value.executionTime,
        size: JSON.stringify(value.data).length
      }
      stats.entries.push(entry)
      stats.totalMemory += entry.size
    }

    return stats
  },

  /**
   * Optimized user statistics query
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatsOptimized() {
    return this.executeWithCache('user_stats', async () => {
      const { data, error } = await supabase.rpc('get_user_stats_optimized')
      if (error) throw error
      return data
    }, 2 * 60 * 1000) // 2 minutes cache
  },

  /**
   * Optimized vehicle search with pagination and caching
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchVehiclesOptimized(searchParams = {}) {
    const cacheKey = `vehicle_search_${JSON.stringify(searchParams)}`
    
    return this.executeWithCache(cacheKey, async () => {
      const {
        category,
        manufacturer,
        location,
        yearRange,
        priceRange,
        kilometersRange,
        handRange,
        sortBy = '-created_at',
        page = 1,
        pageSize = 20
      } = searchParams

      // Use optimized search function
      const { data, error } = await supabase.rpc('search_vehicles_optimized', {
        p_category: category,
        p_manufacturer: manufacturer,
        p_location: location,
        p_year_min: yearRange?.[0],
        p_year_max: yearRange?.[1],
        p_price_min: priceRange?.[0],
        p_price_max: priceRange?.[1],
        p_kilometers_min: kilometersRange?.[0],
        p_kilometers_max: kilometersRange?.[1],
        p_hand_min: handRange?.[0],
        p_hand_max: handRange?.[1],
        p_sort_by: sortBy,
        p_page: page,
        p_page_size: pageSize
      })

      if (error) throw error
      return data
    }, 1 * 60 * 1000) // 1 minute cache for search results
  },

  /**
   * Optimized promoted vehicles query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Promoted vehicles
   */
  async getPromotedVehiclesOptimized(options = {}) {
    const cacheKey = `promoted_vehicles_${JSON.stringify(options)}`
    
    return this.executeWithCache(cacheKey, async () => {
      const { data, error } = await supabase.rpc('get_promoted_vehicles_optimized', {
        p_promotion_type: options.promotionType,
        p_limit: options.limit || 10
      })

      if (error) throw error
      return data
    }, 30 * 1000) // 30 seconds cache for promoted content
  },

  /**
   * Optimized user activity analytics
   * @param {string} userId - User ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} User analytics
   */
  async getUserAnalyticsOptimized(userId, options = {}) {
    const cacheKey = `user_analytics_${userId}_${JSON.stringify(options)}`
    
    return this.executeWithCache(cacheKey, async () => {
      const { data, error } = await supabase.rpc('get_user_analytics_optimized', {
        p_user_id: userId,
        p_start_date: options.startDate,
        p_end_date: options.endDate,
        p_period: options.period || '30d'
      })

      if (error) throw error
      return data
    }, 5 * 60 * 1000) // 5 minutes cache for analytics
  },

  /**
   * Optimized message inbox query
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Inbox messages
   */
  async getInboxOptimized(userId, options = {}) {
    const cacheKey = `inbox_${userId}_${JSON.stringify(options)}`
    
    return this.executeWithCache(cacheKey, async () => {
      const { data, error } = await supabase.rpc('get_inbox_optimized', {
        p_user_id: userId,
        p_message_type: options.messageType,
        p_is_read: options.isRead,
        p_page: options.page || 1,
        p_page_size: options.pageSize || 20
      })

      if (error) throw error
      return data
    }, 30 * 1000) // 30 seconds cache for messages
  },

  /**
   * Batch query executor for multiple related queries
   * @param {Array} queries - Array of query objects
   * @returns {Promise<Array>} Array of results
   */
  async executeBatch(queries) {
    try {
      const promises = queries.map(async (query) => {
        try {
          if (query.useCache) {
            return await this.executeWithCache(query.cacheKey, query.queryFn, query.ttl)
          } else {
            const result = await query.queryFn()
            return createSuccessResponse(result)
          }
        } catch (error) {
          return handleApiError(error, `batch_query_${query.name}`)
        }
      })

      const results = await Promise.all(promises)
      return results
    } catch (error) {
      return handleApiError(error, 'queryOptimizationService.executeBatch')
    }
  },

  /**
   * Preload frequently accessed data
   * @returns {Promise<void>}
   */
  async preloadFrequentData() {
    try {
      const preloadQueries = [
        {
          name: 'user_stats',
          cacheKey: 'user_stats',
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_stats_optimized')
            if (error) throw error
            return data
          },
          useCache: true,
          ttl: 2 * 60 * 1000
        },
        {
          name: 'promoted_vehicles',
          cacheKey: 'promoted_vehicles_{}',
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_promoted_vehicles_optimized', {
              p_limit: 10
            })
            if (error) throw error
            return data
          },
          useCache: true,
          ttl: 30 * 1000
        },
        {
          name: 'system_settings',
          cacheKey: 'system_settings_public',
          queryFn: async () => {
            const { data, error } = await supabase
              .from('system_settings')
              .select('setting_key, setting_value')
              .eq('is_public', true)
            if (error) throw error
            return data
          },
          useCache: true,
          ttl: 10 * 60 * 1000
        }
      ]

      await this.executeBatch(preloadQueries)
    } catch (error) {
      logError(error, 'queryOptimizationService.preloadFrequentData')
    }
  },

  /**
   * Monitor query performance
   * @param {string} queryName - Query name for tracking
   * @param {Function} queryFn - Query function to monitor
   * @returns {Promise<Object>} Query result with performance metrics
   */
  async monitorQuery(queryName, queryFn) {
    const startTime = Date.now()
    const startMemory = process.memoryUsage?.()?.heapUsed || 0

    try {
      const result = await queryFn()
      const endTime = Date.now()
      const endMemory = process.memoryUsage?.()?.heapUsed || 0

      const metrics = {
        queryName,
        executionTime: endTime - startTime,
        memoryUsed: endMemory - startMemory,
        timestamp: new Date().toISOString(),
        success: true
      }

      // Log performance metrics
      if (metrics.executionTime > 1000) {
        logError(new Error(`Slow query: ${queryName}`), 'performance_monitor', metrics)
      }

      return createSuccessResponse(result, null, { performance: metrics })
    } catch (error) {
      const endTime = Date.now()
      const metrics = {
        queryName,
        executionTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }

      logError(error, 'performance_monitor', metrics)
      throw error
    }
  },

  /**
   * Optimize query by adding appropriate indexes
   * @param {string} tableName - Table name
   * @param {Array} columns - Columns to index
   * @returns {Promise<Object>} Index creation result
   */
  async suggestIndexes(tableName, columns) {
    try {
      // This would analyze query patterns and suggest indexes
      // For now, return common index suggestions
      const suggestions = {
        vehicles: [
          'CREATE INDEX IF NOT EXISTS idx_vehicles_search ON vehicles(status, type, manufacturer, price, created_at)',
          'CREATE INDEX IF NOT EXISTS idx_vehicles_location_search ON vehicles USING gin(to_tsvector(\'hebrew\', location))',
          'CREATE INDEX IF NOT EXISTS idx_vehicles_full_text ON vehicles USING gin(to_tsvector(\'hebrew\', title || \' \' || description))'
        ],
        messages: [
          'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at)',
          'CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read, created_at)'
        ],
        promotions: [
          'CREATE INDEX IF NOT EXISTS idx_promotions_active_search ON promotions(is_active, payment_status, end_date, promotion_type)',
          'CREATE INDEX IF NOT EXISTS idx_promotions_vehicle_active ON promotions(vehicle_id, is_active, end_date)'
        ],
        activity_logs: [
          'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON activity_logs(user_id, created_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_activity_logs_action_time ON activity_logs(action, created_at DESC)'
        ]
      }

      return createSuccessResponse({
        table: tableName,
        suggested_indexes: suggestions[tableName] || [],
        note: 'These indexes should be created by a database administrator'
      })
    } catch (error) {
      return handleApiError(error, 'queryOptimizationService.suggestIndexes')
    }
  },

  /**
   * Connection pool monitoring
   * @returns {Promise<Object>} Connection pool statistics
   */
  async getConnectionStats() {
    try {
      // This would monitor Supabase connection pool
      // For now, return mock data structure
      const stats = {
        active_connections: 0,
        idle_connections: 0,
        max_connections: 100,
        connection_errors: 0,
        avg_query_time: 0,
        slow_queries: 0,
        timestamp: new Date().toISOString()
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error, 'queryOptimizationService.getConnectionStats')
    }
  }
}

export default queryOptimizationService