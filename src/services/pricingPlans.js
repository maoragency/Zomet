import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Pricing Plans service for Supabase operations
 * Handles pricing plan management and operations with comprehensive error handling
 */

export const pricingPlanService = {
  /**
   * Get all pricing plans
   * @param {boolean} activeOnly - Whether to return only active plans
   * @returns {Promise<Object>} Response with pricing plans or error
   */
  async list(activeOnly = true) {
    try {
      let query = supabase
        .from('pricing_plans')
        .select('*')
        .order('price', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        logError(error, 'pricingPlanService.list', { activeOnly })
        throw error
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return handleApiError(error, 'pricingPlanService.list')
    }
  },

  /**
   * Get a single pricing plan by ID
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<Object>} Pricing plan object
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get pricing plan by ID error:', error)
      throw error
    }
  },

  /**
   * Get pricing plan by name
   * @param {string} name - Plan name
   * @returns {Promise<Object>} Pricing plan object
   */
  async getByName(name) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('name', name)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get pricing plan by name error:', error)
      throw error
    }
  },

  /**
   * Create a new pricing plan (admin only)
   * @param {Object} planData - Pricing plan data
   * @returns {Promise<Object>} Response with created pricing plan or error
   */
  async create(planData) {
    try {
      // Validate required fields
      const requiredFields = ['name', 'price']
      const validationError = validateRequiredFields(planData, requiredFields)
      if (validationError) return validationError

      // Sanitize text inputs
      const sanitizedData = {
        ...planData,
        name: sanitizeInput(planData.name),
        features: planData.features ? planData.features.map(f => sanitizeInput(f)) : []
      }

      const { data, error } = await supabase
        .from('pricing_plans')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        logError(error, 'pricingPlanService.create', { planData: sanitizedData })
        throw error
      }

      return createSuccessResponse(data, 'תוכנית תמחור נוספה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'pricingPlanService.create')
    }
  },

  /**
   * Update an existing pricing plan (admin only)
   * @param {string} id - Pricing plan UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated pricing plan
   */
  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update pricing plan error:', error)
      throw error
    }
  },

  /**
   * Delete a pricing plan (admin only)
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete pricing plan error:', error)
      throw error
    }
  },

  /**
   * Activate a pricing plan
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<Object>} Updated pricing plan
   */
  async activate(id) {
    try {
      return await this.update(id, { is_active: true })
    } catch (error) {
      console.error('Activate pricing plan error:', error)
      throw error
    }
  },

  /**
   * Deactivate a pricing plan
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<Object>} Updated pricing plan
   */
  async deactivate(id) {
    try {
      return await this.update(id, { is_active: false })
    } catch (error) {
      console.error('Deactivate pricing plan error:', error)
      throw error
    }
  },

  /**
   * Get pricing plans by price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @returns {Promise<Array>} Matching pricing plans
   */
  async getByPriceRange(minPrice, maxPrice) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get pricing plans by price range error:', error)
      throw error
    }
  },

  /**
   * Get free pricing plans
   * @returns {Promise<Array>} Free pricing plans
   */
  async getFree() {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('price', 0)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get free pricing plans error:', error)
      throw error
    }
  },

  /**
   * Get premium pricing plans (price > 0)
   * @returns {Promise<Array>} Premium pricing plans
   */
  async getPremium() {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .gt('price', 0)
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get premium pricing plans error:', error)
      throw error
    }
  },

  /**
   * Search pricing plans by features
   * @param {string} feature - Feature to search for
   * @returns {Promise<Array>} Matching pricing plans
   */
  async searchByFeature(feature) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .contains('features', [feature])
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Search pricing plans by feature error:', error)
      throw error
    }
  }
}

export default pricingPlanService