import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * Vehicle service for Supabase operations
 * Handles all vehicle-related database operations with comprehensive error handling
 */

export const vehicleService = {
  /**
   * Get all vehicles with optional sorting and limiting
   * @param {string} sortBy - Sort field (e.g., '-created_date', 'price')
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of vehicles
   */
  async list(sortBy = '-created_date', limit = 100) {
    try {
      let query = supabase
        .from('vehicles')
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

      if (limit && limit > 0) {
        query = query.limit(Math.min(limit, 1000)) // Cap at 1000 for performance
      }

      const { data, error } = await query

      if (error) {
        logError(error, 'vehicleService.list', { sortBy, limit })
        throw error
      }

      return data || []
    } catch (error) {
      console.error('List vehicles error:', error)
      throw error
    }
  },

  /**
   * Filter vehicles by criteria
   * @param {Object} filters - Filter criteria
   * @param {string} sortBy - Sort field (optional)
   * @returns {Promise<Array>} Filtered vehicles
   */
  async filter(filters = {}, sortBy = null) {
    try {
      let query = supabase
        .from('vehicles')
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
      console.error('Filter vehicles error:', error)
      throw error
    }
  },

  /**
   * Get a single vehicle by ID
   * @param {string} id - Vehicle UUID
   * @returns {Promise<Object>} Vehicle object
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get vehicle by ID error:', error)
      throw error
    }
  },

  /**
   * Create a new vehicle
   * @param {Object} vehicleData - Vehicle data
   * @returns {Promise<Object>} Created vehicle
   */
  async create(vehicleData) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to create vehicle')

      // Sanitize text inputs
      const sanitizedData = {
        ...vehicleData,
        title: sanitizeInput(vehicleData.title),
        description: vehicleData.description ? sanitizeInput(vehicleData.description) : null,
        location: vehicleData.location ? sanitizeInput(vehicleData.location) : null,
        contact_name: sanitizeInput(vehicleData.contact_name),
        contact_phone: sanitizeInput(vehicleData.contact_phone),
        contact_email: vehicleData.contact_email ? sanitizeInput(vehicleData.contact_email) : null,
        created_by: user.id // Use user.id to match the UUID foreign key constraint
      }

      const { data, error } = await supabase
        .from('vehicles')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        logError(error, 'vehicleService.create', { vehicleData: sanitizedData })
        throw error
      }

      return data
    } catch (error) {
      console.error('Create vehicle error:', error)
      throw error
    }
  },

  /**
   * Update an existing vehicle
   * @param {string} id - Vehicle UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated vehicle
   */
  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update vehicle error:', error)
      throw error
    }
  },

  /**
   * Delete a vehicle
   * @param {string} id - Vehicle UUID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete vehicle error:', error)
      throw error
    }
  },

  /**
   * Increment vehicle view count
   * @param {string} id - Vehicle UUID
   * @returns {Promise<void>}
   */
  async incrementViews(id) {
    try {
      // Use the database function for atomic increment
      const { error } = await supabase.rpc('increment_vehicle_views', {
        vehicle_id: id
      })

      if (error) throw error
    } catch (error) {
      console.error('Increment views error:', error)
      // Don't throw error for view counting - it's not critical
    }
  },

  /**
   * Search vehicles with advanced filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Matching vehicles
   */
  async search(searchParams = {}) {
    try {
      let query = supabase
        .from('vehicles')
        .select('*')

      const {
        category,
        manufacturer,
        location,
        yearRange,
        priceRange,
        kilometersRange,
        handRange,
        sortBy = '-created_at'
      } = searchParams

      // Apply filters
      if (category && category !== 'all') {
        query = query.eq('type', category)
      }

      if (manufacturer && manufacturer !== 'all') {
        if (manufacturer === 'חשמלי') {
          query = query.or('manufacturer.eq.חשמלי,engine_type.eq.חשמלי')
        } else {
          query = query.eq('manufacturer', manufacturer)
        }
      }

      if (location && location !== 'all') {
        // Handle regional searches
        const regionCities = {
          'צפון': ["חיפה", "טבריה", "צפת", "קריות", "עכו", "נהריה", "כרמיאל", "עפולה", "קצרין", "נצרת", "קרית שמונה"],
          'מרכז': ["תל אביב", "ירושלים", "ראשון לציון", "פתח תקווה", "חולון", "בת ים", "רמת גן", "בני ברק", "נתניה", "הרצליה", "כפר סבא", "רעננה", "לוד", "רמלה", "רחובות", "מודיעין", "אריאל", "השרון", "השפלה", "גוש דן"],
          'דרום': ["באר שבע", "אשדוד", "אשקלון", "אילת", "דימונה", "נתיבות", "אופקים", "שדרות", "קרית גת", "קרית מלאכי", "ערד"]
        }

        const cities = regionCities[location]
        if (cities) {
          const locationFilters = cities.map(city => `location.ilike.%${city}%`).join(',')
          query = query.or(locationFilters)
        }
      }

      // Range filters
      if (yearRange && yearRange.length === 2) {
        query = query.gte('year', yearRange[0]).lte('year', yearRange[1])
      }

      if (priceRange && priceRange.length === 2) {
        query = query.gte('price', priceRange[0]).lte('price', priceRange[1])
      }

      if (kilometersRange && kilometersRange.length === 2) {
        query = query.gte('kilometers', kilometersRange[0]).lte('kilometers', kilometersRange[1])
      }

      if (handRange && handRange.length === 2) {
        query = query.gte('hand', handRange[0]).lte('hand', handRange[1])
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
      console.error('Search vehicles error:', error)
      throw error
    }
  },

  /**
   * Get vehicles by user (for My Listings page)
   * @param {string} userId - User's ID (UUID) or email for backward compatibility
   * @param {string} sortBy - Sort field
   * @returns {Promise<Array>} User's vehicles
   */
  async getByUser(userId, sortBy = '-created_at') {
    try {
      // If userId looks like an email, get the user ID first
      let actualUserId = userId
      if (userId && userId.includes('@')) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', userId)
          .single()
        
        if (userError) throw userError
        actualUserId = userData.id
      }

      let query = supabase
        .from('vehicles')
        .select(`
          *,
          promotions:promotions(
            id,
            promotion_type,
            start_date,
            end_date,
            is_active,
            payment_status,
            price
          )
        `)
        .eq('created_by', actualUserId) // Use user ID to match the foreign key

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

      // Process promotion data
      const processedData = data.map(vehicle => ({
        ...vehicle,
        active_promotions: vehicle.promotions?.filter(p => 
          p.is_active && new Date(p.end_date) > new Date()
        ) || [],
        expired_promotions: vehicle.promotions?.filter(p => 
          new Date(p.end_date) <= new Date()
        ) || [],
        has_active_promotion: vehicle.promotions?.some(p => 
          p.is_active && new Date(p.end_date) > new Date()
        ) || false
      }))

      return processedData || []
    } catch (error) {
      console.error('Get vehicles by user error:', error)
      throw error
    }
  },

  /**
   * Get vehicles with promotion status
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with vehicles and promotion data or error
   */
  async getVehiclesWithPromotions(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        promotionType = null,
        isPromoted = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('vehicles')
        .select(`
          *,
          promotions:promotions(
            id,
            promotion_type,
            start_date,
            end_date,
            is_active,
            payment_status,
            price
          )
        `)

      // Apply promotion filters
      if (isPromoted !== null) {
        if (isPromoted) {
          // Only vehicles with active promotions
          query = query.not('promotions', 'is', null)
        } else {
          // Only vehicles without promotions
          query = query.is('promotions', null)
        }
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

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'vehicleService.getVehiclesWithPromotions', options)
        throw error
      }

      // Process and filter promotion data
      let processedData = data.map(vehicle => {
        const activePromotions = vehicle.promotions?.filter(p => 
          p.is_active && new Date(p.end_date) > new Date()
        ) || []

        return {
          ...vehicle,
          active_promotions: activePromotions,
          has_active_promotion: activePromotions.length > 0,
          promotion_type: activePromotions[0]?.promotion_type || null,
          promotion_expires: activePromotions[0]?.end_date || null
        }
      })

      // Apply promotion type filter after processing
      if (promotionType) {
        processedData = processedData.filter(vehicle => 
          vehicle.active_promotions.some(p => p.promotion_type === promotionType)
        )
      }

      return createSuccessResponse({
        vehicles: processedData,
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'vehicleService.getVehiclesWithPromotions')
    }
  },

  /**
   * Get promoted vehicles for homepage
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with promoted vehicles or error
   */
  async getPromotedVehicles(options = {}) {
    try {
      const {
        promotionType = null,
        limit = 10
      } = options

      let query = supabase
        .from('vehicles')
        .select(`
          *,
          promotions:promotions!inner(
            id,
            promotion_type,
            start_date,
            end_date,
            is_active,
            payment_status
          )
        `)
        .eq('promotions.is_active', true)
        .eq('promotions.payment_status', 'paid')
        .gte('promotions.end_date', new Date().toISOString())

      if (promotionType) {
        query = query.eq('promotions.promotion_type', promotionType)
      }

      // Sort by promotion type priority and creation date
      query = query.order('created_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        logError(error, 'vehicleService.getPromotedVehicles', options)
        throw error
      }

      // Process promotion data and sort by priority
      const processedData = data.map(vehicle => ({
        ...vehicle,
        promotion_priority: this.getPromotionPriority(vehicle.promotions[0]?.promotion_type),
        promotion_type: vehicle.promotions[0]?.promotion_type,
        promotion_expires: vehicle.promotions[0]?.end_date
      }))

      // Sort by promotion priority (premium > top > featured)
      processedData.sort((a, b) => b.promotion_priority - a.promotion_priority)

      return createSuccessResponse(processedData)
    } catch (error) {
      return handleApiError(error, 'vehicleService.getPromotedVehicles')
    }
  },

  /**
   * Get vehicle analytics with promotion data
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Response with vehicle analytics or error
   */
  async getVehicleAnalytics(vehicleId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          promotions:promotions(
            id,
            promotion_type,
            start_date,
            end_date,
            is_active,
            payment_status,
            price
          )
        `)
        .eq('id', vehicleId)
        .single()

      if (error) {
        logError(error, 'vehicleService.getVehicleAnalytics', { vehicleId })
        throw error
      }

      // Check if user owns the vehicle or is admin
      const isOwner = vehicle.created_by === user.id
      const isAdmin = await this.checkAdminPermission(user)
      
      if (!isOwner && !isAdmin) {
        throw new Error('אין לך הרשאה לצפות בנתונים אלה')
      }

      const daysSinceCreated = Math.ceil((new Date() - new Date(vehicle.created_at)) / (1000 * 60 * 60 * 24))
      const activePromotions = vehicle.promotions?.filter(p => 
        p.is_active && new Date(p.end_date) > new Date()
      ) || []
      const expiredPromotions = vehicle.promotions?.filter(p => 
        new Date(p.end_date) <= new Date()
      ) || []

      const analytics = {
        vehicle_id: vehicleId,
        basic_info: {
          title: vehicle.title,
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          status: vehicle.status,
          created_at: vehicle.created_at,
          days_active: daysSinceCreated
        },
        performance: {
          total_views: vehicle.views || 0,
          total_contacts: vehicle.contact_clicks || 0,
          daily_avg_views: daysSinceCreated > 0 ? Math.round((vehicle.views || 0) / daysSinceCreated) : 0,
          daily_avg_contacts: daysSinceCreated > 0 ? Math.round((vehicle.contact_clicks || 0) / daysSinceCreated) : 0,
          contact_rate: vehicle.views > 0 ? Math.round(((vehicle.contact_clicks || 0) / vehicle.views) * 100) : 0
        },
        promotions: {
          total_promotions: vehicle.promotions?.length || 0,
          active_promotions: activePromotions.length,
          expired_promotions: expiredPromotions.length,
          total_spent: vehicle.promotions?.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.price, 0) || 0,
          current_promotion: activePromotions[0] || null,
          promotion_history: vehicle.promotions || []
        },
        insights: {
          performance_trend: this.calculatePerformanceTrend(vehicle),
          promotion_effectiveness: this.calculatePromotionEffectiveness(vehicle),
          recommendations: this.generateVehicleRecommendations(vehicle)
        }
      }

      return createSuccessResponse(analytics)
    } catch (error) {
      return handleApiError(error, 'vehicleService.getVehicleAnalytics')
    }
  },

  /**
   * Bulk update vehicle status (admin function)
   * @param {Array} vehicleIds - Array of vehicle IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Response with updated vehicles or error
   */
  async bulkUpdateVehicleStatus(vehicleIds, status) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן רכבים בכמות')
      }

      const { data, error } = await supabase
        .from('vehicles')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', vehicleIds)
        .select()

      if (error) {
        logError(error, 'vehicleService.bulkUpdateVehicleStatus', { vehicleIds, status })
        throw error
      }

      // Log activity for each vehicle
      for (const vehicleId of vehicleIds) {
        await this.logActivity(user.id, 'vehicle_status_updated', 'vehicle', vehicleId, { new_status: status })
      }

      return createSuccessResponse(data, `${data.length} רכבים עודכנו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'vehicleService.bulkUpdateVehicleStatus')
    }
  },

  // Helper methods

  /**
   * Get promotion priority for sorting
   * @private
   */
  getPromotionPriority(promotionType) {
    const priorities = {
      'premium': 3,
      'top': 2,
      'featured': 1
    }
    return priorities[promotionType] || 0
  },

  /**
   * Calculate performance trend
   * @private
   */
  calculatePerformanceTrend(vehicle) {
    const daysSinceCreated = Math.ceil((new Date() - new Date(vehicle.created_at)) / (1000 * 60 * 60 * 24))
    const dailyViews = daysSinceCreated > 0 ? (vehicle.views || 0) / daysSinceCreated : 0
    
    if (dailyViews > 20) return 'excellent'
    if (dailyViews > 10) return 'good'
    if (dailyViews > 5) return 'average'
    if (dailyViews > 1) return 'below_average'
    return 'poor'
  },

  /**
   * Calculate promotion effectiveness
   * @private
   */
  calculatePromotionEffectiveness(vehicle) {
    const promotions = vehicle.promotions || []
    if (promotions.length === 0) return null

    const totalSpent = promotions.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.price, 0)
    const totalViews = vehicle.views || 0
    const totalContacts = vehicle.contact_clicks || 0

    if (totalSpent === 0) return null

    return {
      cost_per_view: totalViews > 0 ? Math.round((totalSpent / totalViews) * 100) / 100 : 0,
      cost_per_contact: totalContacts > 0 ? Math.round((totalSpent / totalContacts) * 100) / 100 : 0,
      roi_estimate: this.calculateROI(totalSpent, totalContacts, vehicle.price)
    }
  },

  /**
   * Calculate ROI estimate
   * @private
   */
  calculateROI(spent, contacts, vehiclePrice) {
    if (spent === 0 || contacts === 0) return 0
    
    // Assume 10% conversion rate and 5% commission
    const estimatedSales = contacts * 0.1
    const estimatedRevenue = estimatedSales * vehiclePrice * 0.05
    
    return estimatedRevenue > 0 ? Math.round(((estimatedRevenue - spent) / spent) * 100) : -100
  },

  /**
   * Generate vehicle recommendations
   * @private
   */
  generateVehicleRecommendations(vehicle) {
    const recommendations = []
    const daysSinceCreated = Math.ceil((new Date() - new Date(vehicle.created_at)) / (1000 * 60 * 60 * 24))
    const dailyViews = daysSinceCreated > 0 ? (vehicle.views || 0) / daysSinceCreated : 0
    const hasActivePromotion = vehicle.promotions?.some(p => 
      p.is_active && new Date(p.end_date) > new Date()
    )

    if (dailyViews < 5 && !hasActivePromotion) {
      recommendations.push({
        type: 'promotion',
        priority: 'high',
        message: 'שקול לקדם את הרכב להגדלת החשיפה',
        action: 'create_promotion'
      })
    }

    if (daysSinceCreated > 30 && (vehicle.views || 0) < 50) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        message: 'שקול לעדכן את תיאור הרכב או התמונות',
        action: 'update_content'
      })
    }

    if ((vehicle.contact_clicks || 0) === 0 && (vehicle.views || 0) > 20) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        message: 'יש הרבה צפיות אך אין פניות - שקול לבדוק את המחיר',
        action: 'review_pricing'
      })
    }

    return recommendations
  },

  /**
   * Check if user has admin permission (helper method)
   * @private
   */
  async checkAdminPermission(user) {
    try {
      // Check if user is the system admin
      if (user.email === 'zometauto@gmail.com') {
        return true
      }

      // Check user role in database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) return false

      return userProfile?.role === 'admin' || userProfile?.role === 'moderator'
    } catch (error) {
      logError(error, 'vehicleService.checkAdminPermission')
      return false
    }
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
      logError(error, 'vehicleService.logActivity')
    }
  }
}

export default vehicleService