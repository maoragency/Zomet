import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Buyer Request service for Supabase operations
 * Handles buyer request management and operations with comprehensive error handling
 */

export const buyerRequestService = {
  /**
   * Get all buyer requests with optional sorting and limiting
   * @param {string} sortBy - Sort field (e.g., '-created_date', 'title')
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of buyer requests
   */
  async list(sortBy = '-created_date', limit = 100) {
    try {
      let query = supabase
        .from('buyer_requests')
        .select('*')

      // Handle sorting
      if (sortBy) {
        const isDescending = sortBy.startsWith('-')
        const field = isDescending ? sortBy.substring(1) : sortBy
        const order = isDescending ? { ascending: false } : { ascending: true }
        
        // Map field names to database columns
        const fieldMap = {
          'created_date': 'created_at',
          'updated_date': 'updated_at'
        }
        const dbField = fieldMap[field] || field
        
        query = query.order(dbField, order)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('List buyer requests error:', error)
      throw error
    }
  },

  /**
   * Filter buyer requests by criteria
   * @param {Object} filters - Filter criteria
   * @param {string} sortBy - Sort field (optional)
   * @returns {Promise<Array>} Filtered buyer requests
   */
  async filter(filters = {}, sortBy = null) {
    try {
      let query = supabase
        .from('buyer_requests')
        .select('*')

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value)
        }
      })

      // Handle sorting
      if (sortBy) {
        const isDescending = sortBy.startsWith('-')
        const field = isDescending ? sortBy.substring(1) : sortBy
        const order = isDescending ? { ascending: false } : { ascending: true }
        
        const fieldMap = {
          'created_date': 'created_at',
          'updated_date': 'updated_at'
        }
        const dbField = fieldMap[field] || field
        
        query = query.order(dbField, order)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Filter buyer requests error:', error)
      throw error
    }
  },

  /**
   * Get a single buyer request by ID
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Buyer request object
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('buyer_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get buyer request by ID error:', error)
      throw error
    }
  },

  /**
   * Create a new buyer request
   * @param {Object} requestData - Buyer request data
   * @returns {Promise<Object>} Response with created buyer request or error
   */
  async create(requestData) {
    try {
      // Validate required fields
      const requiredFields = ['title', 'contact_name', 'contact_phone']
      const validationError = validateRequiredFields(requestData, requiredFields)
      if (validationError) return validationError

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to create buyer request')

      // Sanitize text inputs
      const sanitizedData = {
        ...requestData,
        title: sanitizeInput(requestData.title),
        description: requestData.description ? sanitizeInput(requestData.description) : null,
        contact_name: sanitizeInput(requestData.contact_name),
        contact_phone: sanitizeInput(requestData.contact_phone),
        contact_email: requestData.contact_email ? sanitizeInput(requestData.contact_email) : null,
        created_by: user.id
      }

      const { data, error } = await supabase
        .from('buyer_requests')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        logError(error, 'buyerRequestService.create', { requestData: sanitizedData })
        throw error
      }

      return createSuccessResponse(data, 'בקשת קונה נוספה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'buyerRequestService.create')
    }
  },

  /**
   * Update an existing buyer request
   * @param {string} id - Buyer request UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated buyer request
   */
  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('buyer_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update buyer request error:', error)
      throw error
    }
  },

  /**
   * Delete a buyer request
   * @param {string} id - Buyer request UUID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('buyer_requests')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete buyer request error:', error)
      throw error
    }
  },

  /**
   * Get buyer requests by user
   * @param {string} userEmail - User's email address
   * @param {string} sortBy - Sort field
   * @returns {Promise<Array>} User's buyer requests
   */
  async getByUser(userEmail, sortBy = '-created_at') {
    try {
      // First get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single()

      if (userError) throw userError

      let query = supabase
        .from('buyer_requests')
        .select('*')
        .eq('created_by', userData.id)

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const order = isDescending ? { ascending: false } : { ascending: true }
      
      const fieldMap = {
        'created_date': 'created_at',
        'updated_date': 'updated_at'
      }
      const dbField = fieldMap[field] || field
      
      query = query.order(dbField, order)

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get buyer requests by user error:', error)
      throw error
    }
  },

  /**
   * Search buyer requests
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Matching buyer requests
   */
  async search(searchParams = {}) {
    try {
      let query = supabase
        .from('buyer_requests')
        .select('*')

      const {
        title,
        budgetRange,
        status = 'פעיל',
        sortBy = '-created_at'
      } = searchParams

      // Apply filters
      if (title) {
        query = query.ilike('title', `%${title}%`)
      }

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      if (budgetRange && budgetRange.length === 2) {
        query = query.gte('budget_min', budgetRange[0]).lte('budget_max', budgetRange[1])
      }

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const order = isDescending ? { ascending: false } : { ascending: true }
      
      const fieldMap = {
        'created_date': 'created_at',
        'updated_date': 'updated_at'
      }
      const dbField = fieldMap[field] || field
      
      query = query.order(dbField, order)

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Search buyer requests error:', error)
      throw error
    }
  },

  /**
   * Get active buyer requests (status = 'פעיל')
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Active buyer requests
   */
  async getActive(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('buyer_requests')
        .select('*')
        .eq('status', 'פעיל')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get active buyer requests error:', error)
      throw error
    }
  },

  /**
   * Close a buyer request (set status to 'סגור')
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Updated buyer request
   */
  async close(id) {
    try {
      return await this.update(id, { status: 'סגור' })
    } catch (error) {
      console.error('Close buyer request error:', error)
      throw error
    }
  },

  /**
   * Mark buyer request as completed (set status to 'הושלם')
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Updated buyer request
   */
  async complete(id) {
    try {
      return await this.update(id, { status: 'הושלם' })
    } catch (error) {
      console.error('Complete buyer request error:', error)
      throw error
    }
  }
}

export default buyerRequestService