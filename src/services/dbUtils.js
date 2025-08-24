/**
 * Database utilities and helper functions
 * Common operations and utilities for Supabase database interactions
 */

import { supabase } from '@/lib/supabase'
import { handleApiError, logError, createSuccessResponse } from '@/utils/errorHandler'

/**
 * Generic CRUD operations that can be used for any table
 */
export const genericCrud = {
  /**
   * Generic list operation for any table
   * @param {string} tableName - Name of the table
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with data or error
   */
  async list(tableName, options = {}) {
    try {
      const {
        select = '*',
        filters = {},
        orderBy = 'created_at',
        ascending = false,
        limit = 100,
        offset = 0
      } = options

      let query = supabase
        .from(tableName)
        .select(select)

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'object' && value.operator) {
            // Support for complex filters like { operator: 'gte', value: 100 }
            query = query[value.operator](key, value.value)
          } else {
            query = query.eq(key, value)
          }
        }
      })

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending })
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        logError(error, `genericCrud.list - ${tableName}`, options)
        throw error
      }

      return createSuccessResponse({
        data: data || [],
        count,
        pagination: {
          limit,
          offset,
          hasMore: count ? count > offset + limit : false
        }
      })
    } catch (error) {
      return handleApiError(error, `genericCrud.list - ${tableName}`)
    }
  },

  /**
   * Generic get by ID operation
   * @param {string} tableName - Name of the table
   * @param {string} id - Record ID
   * @param {string} select - Fields to select
   * @returns {Promise<Object>} Response with data or error
   */
  async getById(tableName, id, select = '*') {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .eq('id', id)
        .single()

      if (error) {
        logError(error, `genericCrud.getById - ${tableName}`, { id })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, `genericCrud.getById - ${tableName}`)
    }
  },

  /**
   * Generic create operation
   * @param {string} tableName - Name of the table
   * @param {Object} data - Data to insert
   * @param {string} select - Fields to return
   * @returns {Promise<Object>} Response with created data or error
   */
  async create(tableName, data, select = '*') {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert([data])
        .select(select)
        .single()

      if (error) {
        logError(error, `genericCrud.create - ${tableName}`, { data })
        throw error
      }

      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error, `genericCrud.create - ${tableName}`)
    }
  },

  /**
   * Generic update operation
   * @param {string} tableName - Name of the table
   * @param {string} id - Record ID
   * @param {Object} updates - Updates to apply
   * @param {string} select - Fields to return
   * @returns {Promise<Object>} Response with updated data or error
   */
  async update(tableName, id, updates, select = '*') {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select(select)
        .single()

      if (error) {
        logError(error, `genericCrud.update - ${tableName}`, { id, updates })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, `genericCrud.update - ${tableName}`)
    }
  },

  /**
   * Generic delete operation
   * @param {string} tableName - Name of the table
   * @param {string} id - Record ID
   * @returns {Promise<Object>} Response with success status or error
   */
  async delete(tableName, id) {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) {
        logError(error, `genericCrud.delete - ${tableName}`, { id })
        throw error
      }

      return createSuccessResponse({ deleted: true, id })
    } catch (error) {
      return handleApiError(error, `genericCrud.delete - ${tableName}`)
    }
  }
}

/**
 * Database query builder utilities
 */
export const queryBuilder = {
  /**
   * Build a complex filter query
   * @param {Object} baseQuery - Base Supabase query
   * @param {Object} filters - Filter object
   * @returns {Object} Modified query
   */
  applyFilters(baseQuery, filters) {
    let query = baseQuery

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return

      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === 'object') {
        // Handle complex filters
        if (value.operator && value.value !== undefined) {
          query = query[value.operator](key, value.value)
        } else if (value.like) {
          query = query.ilike(key, `%${value.like}%`)
        } else if (value.range && Array.isArray(value.range) && value.range.length === 2) {
          query = query.gte(key, value.range[0]).lte(key, value.range[1])
        }
      } else {
        query = query.eq(key, value)
      }
    })

    return query
  },

  /**
   * Apply sorting to query
   * @param {Object} baseQuery - Base Supabase query
   * @param {string} sortBy - Sort field (can start with - for descending)
   * @returns {Object} Modified query
   */
  applySorting(baseQuery, sortBy) {
    if (!sortBy) return baseQuery

    const isDescending = sortBy.startsWith('-')
    const field = isDescending ? sortBy.substring(1) : sortBy
    const ascending = !isDescending

    // Map common field aliases
    const fieldMap = {
      'created_date': 'created_at',
      'updated_date': 'updated_at'
    }
    const dbField = fieldMap[field] || field

    return baseQuery.order(dbField, { ascending })
  },

  /**
   * Apply pagination to query
   * @param {Object} baseQuery - Base Supabase query
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Items per page
   * @returns {Object} Modified query
   */
  applyPagination(baseQuery, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize
    return baseQuery.range(offset, offset + pageSize - 1)
  }
}

/**
 * Database transaction utilities
 */
export const transactions = {
  /**
   * Execute multiple operations in a transaction-like manner
   * Note: Supabase doesn't support true transactions in the client,
   * but this provides rollback-like functionality
   * @param {Array} operations - Array of operation functions
   * @returns {Promise<Object>} Results of all operations
   */
  async execute(operations) {
    const results = []
    const rollbackOperations = []

    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i]
        const result = await operation.execute()
        
        results.push({
          index: i,
          operation: operation.name || `operation_${i}`,
          success: result.success,
          data: result.data
        })

        // Store rollback operation if provided
        if (operation.rollback) {
          rollbackOperations.unshift(operation.rollback)
        }

        // If operation failed, rollback previous operations
        if (!result.success) {
          await this.rollback(rollbackOperations)
          throw new Error(`Transaction failed at operation ${i}: ${result.error?.message}`)
        }
      }

      return createSuccessResponse({
        results,
        summary: {
          total: operations.length,
          successful: results.length,
          failed: 0
        }
      })
    } catch (error) {
      return handleApiError(error, 'transactions.execute')
    }
  },

  /**
   * Execute rollback operations
   * @param {Array} rollbackOperations - Array of rollback functions
   */
  async rollback(rollbackOperations) {
    for (const rollbackOp of rollbackOperations) {
      try {
        await rollbackOp()
      } catch (rollbackError) {
        logError(rollbackError, 'transactions.rollback')
        // Continue with other rollback operations even if one fails
      }
    }
  }
}

/**
 * Database statistics and analytics utilities
 */
export const analytics = {
  /**
   * Get table row count
   * @param {string} tableName - Name of the table
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Response with count or error
   */
  async getCount(tableName, filters = {}) {
    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      // Apply filters
      query = queryBuilder.applyFilters(query, filters)

      const { count, error } = await query

      if (error) {
        logError(error, `analytics.getCount - ${tableName}`, { filters })
        throw error
      }

      return createSuccessResponse({ count })
    } catch (error) {
      return handleApiError(error, `analytics.getCount - ${tableName}`)
    }
  },

  /**
   * Get aggregated statistics for a table
   * @param {string} tableName - Name of the table
   * @param {string} field - Field to aggregate
   * @param {Array} aggregations - Array of aggregation functions ['sum', 'avg', 'min', 'max']
   * @returns {Promise<Object>} Response with statistics or error
   */
  async getAggregates(tableName, field, aggregations = ['count']) {
    try {
      const selectFields = aggregations.map(agg => `${agg}(${field})`).join(',')
      
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .single()

      if (error) {
        logError(error, `analytics.getAggregates - ${tableName}`, { field, aggregations })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, `analytics.getAggregates - ${tableName}`)
    }
  }
}

/**
 * Database maintenance utilities
 */
export const maintenance = {
  /**
   * Clean up old records based on date
   * @param {string} tableName - Name of the table
   * @param {string} dateField - Date field to check
   * @param {number} daysOld - Number of days old
   * @returns {Promise<Object>} Response with cleanup results or error
   */
  async cleanupOldRecords(tableName, dateField = 'created_at', daysOld = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .lt(dateField, cutoffDate.toISOString())
        .select('id')

      if (error) {
        logError(error, `maintenance.cleanupOldRecords - ${tableName}`, { dateField, daysOld })
        throw error
      }

      return createSuccessResponse({
        deleted: data?.length || 0,
        cutoffDate: cutoffDate.toISOString()
      })
    } catch (error) {
      return handleApiError(error, `maintenance.cleanupOldRecords - ${tableName}`)
    }
  }
}

export default {
  genericCrud,
  queryBuilder,
  transactions,
  analytics,
  maintenance
}