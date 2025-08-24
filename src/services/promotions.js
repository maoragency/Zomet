import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Promotion service for Supabase operations
 * Handles promotion campaigns, analytics, and package management
 */

export const promotionService = {
  /**
   * Create a new promotion for a vehicle
   * @param {Object} promotionData - Promotion data
   * @returns {Promise<Object>} Response with created promotion or error
   */
  async createPromotion(promotionData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to create promotion')

      // Validate required fields
      const validation = validateRequiredFields(promotionData, ['vehicle_id', 'promotion_type', 'duration_days'])
      if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
      }

      // Verify user owns the vehicle
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('created_by')
        .eq('id', promotionData.vehicle_id)
        .single()

      if (vehicleError) throw vehicleError
      if (vehicle.created_by !== user.id) {
        throw new Error('אין לך הרשאה לקדם רכב זה')
      }

      // Calculate promotion price and end date
      const promotionPrices = {
        featured: 50,
        top: 100,
        premium: 200
      }

      const endDate = new Date()
      endDate.setDate(endDate.getDate() + promotionData.duration_days)

      const sanitizedData = {
        vehicle_id: promotionData.vehicle_id,
        promotion_type: promotionData.promotion_type,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        price: promotionPrices[promotionData.promotion_type] || 50,
        is_active: true,
        payment_status: 'pending',
        created_by: user.id,
        metadata: {
          duration_days: promotionData.duration_days,
          auto_renew: promotionData.auto_renew || false,
          ...promotionData.metadata
        }
      }

      const { data, error } = await supabase
        .from('promotions')
        .insert([sanitizedData])
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model, year, price),
          creator:created_by(id, full_name, email)
        `)
        .single()

      if (error) {
        logError(error, 'promotionService.createPromotion', { promotionData: sanitizedData })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'promotion_created', 'promotion', data.id, {
        vehicle_id: promotionData.vehicle_id,
        promotion_type: promotionData.promotion_type,
        price: data.price
      })

      return createSuccessResponse(data, 'קידום נוצר בהצלחה')
    } catch (error) {
      return handleApiError(error, 'promotionService.createPromotion')
    }
  },

  /**
   * Get user's promotions
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with promotions or error
   */
  async getUserPromotions(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        page = 1,
        pageSize = 20,
        status = null,
        promotionType = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('promotions')
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model, year, price, status, images)
        `)
        .eq('created_by', user.id)

      // Apply filters
      if (status) {
        if (status === 'active') {
          query = query.eq('is_active', true).gte('end_date', new Date().toISOString())
        } else if (status === 'expired') {
          query = query.lt('end_date', new Date().toISOString())
        } else if (status === 'inactive') {
          query = query.eq('is_active', false)
        }
      }

      if (promotionType) {
        query = query.eq('promotion_type', promotionType)
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
        logError(error, 'promotionService.getUserPromotions', options)
        throw error
      }

      return createSuccessResponse({
        promotions: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'promotionService.getUserPromotions')
    }
  },

  /**
   * Get promotion by ID
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<Object>} Response with promotion or error
   */
  async getPromotionById(promotionId) {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model, year, price, status, images, created_by),
          creator:created_by(id, full_name, email)
        `)
        .eq('id', promotionId)
        .single()

      if (error) {
        logError(error, 'promotionService.getPromotionById', { promotionId })
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'promotionService.getPromotionById')
    }
  },

  /**
   * Update promotion
   * @param {string} promotionId - Promotion ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Response with updated promotion or error
   */
  async updatePromotion(promotionId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Verify user owns the promotion
      const { data: promotion, error: fetchError } = await supabase
        .from('promotions')
        .select('created_by')
        .eq('id', promotionId)
        .single()

      if (fetchError) throw fetchError
      if (promotion.created_by !== user.id) {
        throw new Error('אין לך הרשאה לעדכן קידום זה')
      }

      const { data, error } = await supabase
        .from('promotions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId)
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model, year, price),
          creator:created_by(id, full_name, email)
        `)
        .single()

      if (error) {
        logError(error, 'promotionService.updatePromotion', { promotionId, updates })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'promotion_updated', 'promotion', promotionId, updates)

      return createSuccessResponse(data, 'קידום עודכן בהצלחה')
    } catch (error) {
      return handleApiError(error, 'promotionService.updatePromotion')
    }
  },

  /**
   * Activate promotion (mark as paid and active)
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<Object>} Response with activated promotion or error
   */
  async activatePromotion(promotionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('promotions')
        .update({
          is_active: true,
          payment_status: 'paid',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId)
        .eq('created_by', user.id)
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model)
        `)
        .single()

      if (error) {
        logError(error, 'promotionService.activatePromotion', { promotionId })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'promotion_activated', 'promotion', promotionId)

      return createSuccessResponse(data, 'קידום הופעל בהצלחה')
    } catch (error) {
      return handleApiError(error, 'promotionService.activatePromotion')
    }
  },

  /**
   * Deactivate promotion
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<Object>} Response with deactivated promotion or error
   */
  async deactivatePromotion(promotionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('promotions')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId)
        .eq('created_by', user.id)
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model)
        `)
        .single()

      if (error) {
        logError(error, 'promotionService.deactivatePromotion', { promotionId })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'promotion_deactivated', 'promotion', promotionId)

      return createSuccessResponse(data, 'קידום הושבת בהצלחה')
    } catch (error) {
      return handleApiError(error, 'promotionService.deactivatePromotion')
    }
  },

  /**
   * Extend promotion duration
   * @param {string} promotionId - Promotion ID
   * @param {number} additionalDays - Additional days to extend
   * @returns {Promise<Object>} Response with extended promotion or error
   */
  async extendPromotion(promotionId, additionalDays) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Get current promotion
      const { data: promotion, error: fetchError } = await supabase
        .from('promotions')
        .select('end_date, created_by')
        .eq('id', promotionId)
        .single()

      if (fetchError) throw fetchError
      if (promotion.created_by !== user.id) {
        throw new Error('אין לך הרשאה לעדכן קידום זה')
      }

      // Calculate new end date
      const currentEndDate = new Date(promotion.end_date)
      const newEndDate = new Date(currentEndDate)
      newEndDate.setDate(newEndDate.getDate() + additionalDays)

      const { data, error } = await supabase
        .from('promotions')
        .update({
          end_date: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId)
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model)
        `)
        .single()

      if (error) {
        logError(error, 'promotionService.extendPromotion', { promotionId, additionalDays })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'promotion_extended', 'promotion', promotionId, {
        additional_days: additionalDays,
        new_end_date: newEndDate.toISOString()
      })

      return createSuccessResponse(data, `קידום הוארך ב-${additionalDays} ימים`)
    } catch (error) {
      return handleApiError(error, 'promotionService.extendPromotion')
    }
  },

  /**
   * Get promotion analytics for user
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Response with analytics or error
   */
  async getPromotionAnalytics(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const {
        startDate = null,
        endDate = null,
        promotionType = null
      } = options

      let query = supabase
        .from('promotions')
        .select(`
          *,
          vehicle:vehicle_id(id, title, views, contact_clicks)
        `)
        .eq('created_by', user.id)

      // Apply date filters
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (promotionType) {
        query = query.eq('promotion_type', promotionType)
      }

      const { data: promotions, error } = await query

      if (error) {
        logError(error, 'promotionService.getPromotionAnalytics', options)
        throw error
      }

      // Calculate analytics
      const analytics = {
        total_promotions: promotions.length,
        active_promotions: promotions.filter(p => p.is_active && new Date(p.end_date) > new Date()).length,
        expired_promotions: promotions.filter(p => new Date(p.end_date) <= new Date()).length,
        total_spent: promotions.reduce((sum, p) => sum + (p.payment_status === 'paid' ? p.price : 0), 0),
        by_type: {},
        by_status: {
          pending: promotions.filter(p => p.payment_status === 'pending').length,
          paid: promotions.filter(p => p.payment_status === 'paid').length,
          failed: promotions.filter(p => p.payment_status === 'failed').length,
          refunded: promotions.filter(p => p.payment_status === 'refunded').length
        },
        performance: {
          total_views: promotions.reduce((sum, p) => sum + (p.vehicle?.views || 0), 0),
          total_contacts: promotions.reduce((sum, p) => sum + (p.vehicle?.contact_clicks || 0), 0),
          avg_views_per_promotion: 0,
          avg_contacts_per_promotion: 0
        }
      }

      // Count by type
      promotions.forEach(p => {
        analytics.by_type[p.promotion_type] = (analytics.by_type[p.promotion_type] || 0) + 1
      })

      // Calculate averages
      if (analytics.total_promotions > 0) {
        analytics.performance.avg_views_per_promotion = Math.round(analytics.performance.total_views / analytics.total_promotions)
        analytics.performance.avg_contacts_per_promotion = Math.round(analytics.performance.total_contacts / analytics.total_promotions)
      }

      return createSuccessResponse(analytics)
    } catch (error) {
      return handleApiError(error, 'promotionService.getPromotionAnalytics')
    }
  },

  /**
   * Get promotion packages (pricing tiers)
   * @returns {Promise<Object>} Response with promotion packages or error
   */
  async getPromotionPackages() {
    try {
      const packages = [
        {
          id: 'featured',
          name: 'מוצג',
          description: 'הרכב שלך יוצג באזור המוצגים בעמוד הראשי',
          price: 50,
          duration_days: 7,
          features: [
            'הצגה באזור המוצגים',
            'סימון מיוחד ברשימת הרכבים',
            'עדיפות בתוצאות החיפוש'
          ],
          color: 'blue',
          popular: false
        },
        {
          id: 'top',
          name: 'עליון',
          description: 'הרכב שלך יוצג בראש רשימת הרכבים',
          price: 100,
          duration_days: 14,
          features: [
            'הצגה בראש הרשימה',
            'סימון "עליון" מיוחד',
            'הצגה באזור המוצגים',
            'עדיפות גבוהה בחיפוש'
          ],
          color: 'orange',
          popular: true
        },
        {
          id: 'premium',
          name: 'פרימיום',
          description: 'החבילה המקסימלית לחשיפה מרבית',
          price: 200,
          duration_days: 30,
          features: [
            'הצגה בראש הרשימה',
            'סימון "פרימיום" מיוחד',
            'הצגה באזור המוצגים',
            'עדיפות מקסימלית בחיפוש',
            'הדגשה בצבע מיוחד',
            'תמיכה טכנית מועדפת'
          ],
          color: 'purple',
          popular: false
        }
      ]

      return createSuccessResponse(packages)
    } catch (error) {
      return handleApiError(error, 'promotionService.getPromotionPackages')
    }
  },

  /**
   * Get expiring promotions for user
   * @param {number} daysAhead - Days ahead to check for expiration
   * @returns {Promise<Object>} Response with expiring promotions or error
   */
  async getExpiringPromotions(daysAhead = 3) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const checkDate = new Date()
      checkDate.setDate(checkDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          vehicle:vehicle_id(id, title, manufacturer, model)
        `)
        .eq('created_by', user.id)
        .eq('is_active', true)
        .lte('end_date', checkDate.toISOString())
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })

      if (error) {
        logError(error, 'promotionService.getExpiringPromotions', { daysAhead })
        throw error
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return handleApiError(error, 'promotionService.getExpiringPromotions')
    }
  },

  /**
   * Get promotion performance metrics
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<Object>} Response with performance metrics or error
   */
  async getPromotionPerformance(promotionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data: promotion, error } = await supabase
        .from('promotions')
        .select(`
          *,
          vehicle:vehicle_id(id, title, views, contact_clicks, created_at)
        `)
        .eq('id', promotionId)
        .eq('created_by', user.id)
        .single()

      if (error) {
        logError(error, 'promotionService.getPromotionPerformance', { promotionId })
        throw error
      }

      // Calculate performance metrics
      const startDate = new Date(promotion.start_date)
      const endDate = new Date(promotion.end_date)
      const now = new Date()
      const isActive = promotion.is_active && now < endDate

      const daysActive = Math.min(
        Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)),
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      )

      const performance = {
        promotion_id: promotionId,
        is_active: isActive,
        days_active: daysActive,
        days_remaining: isActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0,
        total_views: promotion.vehicle?.views || 0,
        total_contacts: promotion.vehicle?.contact_clicks || 0,
        daily_avg_views: daysActive > 0 ? Math.round((promotion.vehicle?.views || 0) / daysActive) : 0,
        daily_avg_contacts: daysActive > 0 ? Math.round((promotion.vehicle?.contact_clicks || 0) / daysActive) : 0,
        contact_rate: promotion.vehicle?.views > 0 ? 
          Math.round(((promotion.vehicle?.contact_clicks || 0) / promotion.vehicle.views) * 100) : 0,
        roi_estimate: this.calculateROI(promotion),
        cost_per_view: promotion.price > 0 && promotion.vehicle?.views > 0 ? 
          Math.round((promotion.price / promotion.vehicle.views) * 100) / 100 : 0,
        cost_per_contact: promotion.price > 0 && promotion.vehicle?.contact_clicks > 0 ? 
          Math.round((promotion.price / promotion.vehicle.contact_clicks) * 100) / 100 : 0
      }

      return createSuccessResponse(performance)
    } catch (error) {
      return handleApiError(error, 'promotionService.getPromotionPerformance')
    }
  },

  /**
   * Calculate ROI estimate for promotion
   * @private
   * @param {Object} promotion - Promotion object
   * @returns {number} ROI estimate percentage
   */
  calculateROI(promotion) {
    // Simple ROI calculation based on contacts vs cost
    // In a real scenario, this would be more sophisticated
    const contacts = promotion.vehicle?.contact_clicks || 0
    const cost = promotion.price || 0
    
    if (cost === 0) return 0
    
    // Assume each contact has a 10% chance of sale and average profit margin
    const estimatedSales = contacts * 0.1
    const estimatedRevenue = estimatedSales * (promotion.vehicle?.price || 0) * 0.05 // 5% commission
    
    return estimatedRevenue > 0 ? Math.round(((estimatedRevenue - cost) / cost) * 100) : -100
  },

  /**
   * Log user activity (helper method)
   * @private
   */
  async logActivity(userId, action, resourceType, resourceId, details = {}) {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details
        }])
    } catch (error) {
      // Don't throw error for activity logging - it's not critical
      logError(error, 'promotionService.logActivity')
    }
  }
}

export default promotionService