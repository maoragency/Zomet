import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  validateEmail,
  validatePhone,
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * User service for Supabase operations
 * Handles user profile management and user-related operations with comprehensive error handling
 */

export const userService = {
  /**
   * Get current user profile (equivalent to User.me())
   * @returns {Promise<Object>} Response with current user profile or error
   */
  async me() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        logError(authError, 'userService.me - auth check')
        throw authError
      }
      if (!user) throw new Error('No authenticated user')

      // Get user profile from users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            email: user.email,
            full_name: sanitizeInput(user.user_metadata?.full_name || ''),
            phone: user.user_metadata?.phone || ''
          }

          // Validate email if provided
          if (newProfile.email && !validateEmail(newProfile.email)) {
            throw new Error('Invalid email format')
          }

          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single()

          if (createError) {
            logError(createError, 'userService.me - create profile', { newProfile })
            throw createError
          }
          return createSuccessResponse(createdProfile)
        }
        logError(error, 'userService.me - get profile')
        throw error
      }

      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error, 'userService.me')
    }
  },

  /**
   * Get user profile by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User profile
   */
  async getById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user by ID error:', error)
      throw error
    }
  },

  /**
   * Get user profile by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User profile
   */
  async getByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user by email error:', error)
      throw error
    }
  },

  /**
   * Update current user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Response with updated profile or error
   */
  async updateProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Validate email if being updated
      if (updates.email && !validateEmail(updates.email)) {
        throw new Error('Invalid email format')
      }

      // Validate phone if being updated
      if (updates.phone && !validatePhone(updates.phone)) {
        throw new Error('Invalid phone format')
      }

      // Sanitize text inputs
      const sanitizedUpdates = {}
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitizedUpdates[key] = sanitizeInput(value)
        } else {
          sanitizedUpdates[key] = value
        }
      })

      const { data, error } = await supabase
        .from('users')
        .update(sanitizedUpdates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        logError(error, 'userService.updateProfile', { updates: sanitizedUpdates })
        throw error
      }

      return createSuccessResponse(data, 'פרופיל עודכן בהצלחה')
    } catch (error) {
      return handleApiError(error, 'userService.updateProfile')
    }
  },

  /**
   * Create user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([profileData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Create profile error:', error)
      throw error
    }
  },

  /**
   * Delete user profile
   * @param {string} userId - User UUID (optional, uses current user if not provided)
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfile(userId = null) {
    try {
      let targetUserId = userId
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No authenticated user')
        targetUserId = user.id
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', targetUserId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete profile error:', error)
      throw error
    }
  },

  /**
   * Get user statistics
   * @param {string} userId - User UUID (optional, uses current user if not provided)
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId = null) {
    try {
      let targetUserId = userId
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No authenticated user')
        targetUserId = user.id
      }

      // Get vehicle count by status
      const { data: vehicleStats, error: vehicleError } = await supabase
        .from('vehicles')
        .select('status')
        .eq('created_by', targetUserId)

      if (vehicleError) throw vehicleError

      // Get buyer request count
      const { data: buyerRequests, error: buyerError } = await supabase
        .from('buyer_requests')
        .select('id')
        .eq('created_by', targetUserId)

      if (buyerError) throw buyerError

      // Calculate statistics
      const stats = {
        total_vehicles: vehicleStats.length,
        active_vehicles: vehicleStats.filter(v => v.status === 'למכירה').length,
        sold_vehicles: vehicleStats.filter(v => v.status === 'נמכר').length,
        pending_vehicles: vehicleStats.filter(v => v.status === 'ממתין לתשלום').length,
        buyer_requests: buyerRequests.length
      }

      return stats
    } catch (error) {
      console.error('Get user stats error:', error)
      throw error
    }
  },

  /**
   * Check if user exists by email
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} Whether user exists
   */
  async userExists(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Check user exists error:', error)
      return false
    }
  },

  /**
   * Search users (admin function)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Matching users
   */
  async searchUsers(searchTerm, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, created_at')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(limit)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Search users error:', error)
      throw error
    }
  },

  /**
   * Get all users with filtering and pagination (admin function)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with users or error
   */
  async getAllUsers(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לצפות ברשימת המשתמשים')
      }

      const {
        page = 1,
        pageSize = 20,
        role = null,
        isActive = null,
        isVerified = null,
        searchTerm = null,
        sortBy = '-created_at'
      } = options

      let query = supabase
        .from('users')
        .select('*')

      // Apply filters
      if (role) {
        query = query.eq('role', role)
      }
      if (isActive !== null) {
        query = query.eq('is_active', isActive)
      }
      if (isVerified !== null) {
        query = query.eq('email_verified', isVerified)
      }
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
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
        logError(error, 'userService.getAllUsers', options)
        throw error
      }

      return createSuccessResponse({
        users: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'userService.getAllUsers')
    }
  },

  /**
   * Update user role (admin function)
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @returns {Promise<Object>} Response with updated user or error
   */
  async updateUserRole(userId, newRole) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן תפקידי משתמשים')
      }

      // Validate role
      const validRoles = ['user', 'admin', 'moderator']
      if (!validRoles.includes(newRole)) {
        throw new Error('תפקיד לא חוקי')
      }

      // Prevent self-demotion from admin
      if (userId === user.id && newRole !== 'admin') {
        throw new Error('לא ניתן להוריד את עצמך מתפקיד מנהל')
      }

      const { data, error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        logError(error, 'userService.updateUserRole', { userId, newRole })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, 'user_role_updated', 'user', userId, {
        old_role: data.role,
        new_role: newRole
      })

      return createSuccessResponse(data, 'תפקיד המשתמש עודכן בהצלחה')
    } catch (error) {
      return handleApiError(error, 'userService.updateUserRole')
    }
  },

  /**
   * Activate/Deactivate user (admin function)
   * @param {string} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Response with updated user or error
   */
  async setUserActiveStatus(userId, isActive) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן סטטוס משתמשים')
      }

      // Prevent self-deactivation
      if (userId === user.id && !isActive) {
        throw new Error('לא ניתן להשבית את החשבון שלך')
      }

      const { data, error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        logError(error, 'userService.setUserActiveStatus', { userId, isActive })
        throw error
      }

      // Log activity
      await this.logActivity(user.id, isActive ? 'user_activated' : 'user_deactivated', 'user', userId)

      return createSuccessResponse(data, isActive ? 'משתמש הופעל בהצלחה' : 'משתמש הושבת בהצלחה')
    } catch (error) {
      return handleApiError(error, 'userService.setUserActiveStatus')
    }
  },

  /**
   * Get user activity analytics
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Response with user activity analytics or error
   */
  async getUserActivityAnalytics(userId = null, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      let targetUserId = userId
      
      // If no userId provided, use current user
      if (!targetUserId) {
        targetUserId = user.id
      } else {
        // If userId provided, check admin permission
        const isAdmin = await this.checkAdminPermission(user)
        if (!isAdmin && targetUserId !== user.id) {
          throw new Error('אין לך הרשאה לצפות בפעילות משתמש זה')
        }
      }

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

      // Get user's activity logs
      const { data: activities, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (activityError) throw activityError

      // Get user's vehicles
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single()

      if (profileError) throw profileError

      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('created_by', targetUserId)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (vehicleError) throw vehicleError

      // Get user's messages
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${targetUserId},recipient_id.eq.${targetUserId}`)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)

      if (messageError) throw messageError

      // Calculate analytics
      const analytics = {
        user_id: targetUserId,
        period: period,
        date_range: dateFilter,
        activity: {
          total_actions: activities.length,
          by_action: this.groupBy(activities, 'action'),
          by_resource: this.groupBy(activities, 'resource_type'),
          timeline: this.groupByTimePeriod(activities, 'day')
        },
        vehicles: {
          total: vehicles.length,
          by_status: this.groupBy(vehicles, 'status'),
          total_views: vehicles.reduce((sum, v) => sum + (v.views || 0), 0),
          total_contacts: vehicles.reduce((sum, v) => sum + (v.contact_clicks || 0), 0)
        },
        messages: {
          total: messages.length,
          sent: messages.filter(m => m.sender_id === targetUserId).length,
          received: messages.filter(m => m.recipient_id === targetUserId).length,
          by_type: this.groupBy(messages, 'message_type')
        },
        engagement: {
          active_days: new Set(activities.map(a => a.created_at.substring(0, 10))).size,
          avg_actions_per_day: activities.length > 0 ? 
            Math.round(activities.length / Math.max(1, new Set(activities.map(a => a.created_at.substring(0, 10))).size)) : 0
        }
      }

      return createSuccessResponse(analytics)
    } catch (error) {
      return handleApiError(error, 'userService.getUserActivityAnalytics')
    }
  },

  /**
   * Bulk update users (admin function)
   * @param {Array} userIds - Array of user IDs
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Response with updated users or error
   */
  async bulkUpdateUsers(userIds, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן משתמשים בכמות')
      }

      // Prevent self-modification in bulk operations
      if (userIds.includes(user.id)) {
        throw new Error('לא ניתן לכלול את עצמך בעדכון קבוצתי')
      }

      const sanitizedUpdates = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('users')
        .update(sanitizedUpdates)
        .in('id', userIds)
        .select()

      if (error) {
        logError(error, 'userService.bulkUpdateUsers', { userIds, updates })
        throw error
      }

      // Log activity for each user
      for (const userId of userIds) {
        await this.logActivity(user.id, 'user_bulk_updated', 'user', userId, updates)
      }

      return createSuccessResponse(data, `${data.length} משתמשים עודכנו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'userService.bulkUpdateUsers')
    }
  },

  /**
   * Get user roles and permissions
   * @returns {Promise<Object>} Response with roles and permissions or error
   */
  async getRolesAndPermissions() {
    try {
      const roles = {
        user: {
          name: 'משתמש',
          description: 'משתמש רגיל עם הרשאות בסיסיות',
          permissions: [
            'create_vehicle',
            'edit_own_vehicle',
            'delete_own_vehicle',
            'send_message',
            'view_own_profile',
            'edit_own_profile'
          ]
        },
        moderator: {
          name: 'מנהל תוכן',
          description: 'מנהל תוכן עם הרשאות מורחבות',
          permissions: [
            'create_vehicle',
            'edit_own_vehicle',
            'delete_own_vehicle',
            'send_message',
            'view_own_profile',
            'edit_own_profile',
            'moderate_vehicles',
            'moderate_messages',
            'view_user_list',
            'view_reports'
          ]
        },
        admin: {
          name: 'מנהל מערכת',
          description: 'מנהל מערכת עם הרשאות מלאות',
          permissions: [
            'all_permissions',
            'manage_users',
            'manage_system_settings',
            'view_audit_logs',
            'manage_promotions',
            'access_admin_dashboard'
          ]
        }
      }

      return createSuccessResponse(roles)
    } catch (error) {
      return handleApiError(error, 'userService.getRolesAndPermissions')
    }
  },

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<Object>} Response with permission status or error
   */
  async hasPermission(permission, userId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      let targetUserId = userId || user.id

      // Get user role
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', targetUserId)
        .single()

      if (error) throw error

      const userRole = userProfile?.role || 'user'
      
      // Admin has all permissions
      if (userRole === 'admin') {
        return createSuccessResponse({ hasPermission: true, role: userRole })
      }

      // Get role permissions
      const rolesResponse = await this.getRolesAndPermissions()
      const roles = rolesResponse.data
      const rolePermissions = roles[userRole]?.permissions || []

      const hasPermission = rolePermissions.includes(permission) || rolePermissions.includes('all_permissions')

      return createSuccessResponse({ hasPermission, role: userRole, permissions: rolePermissions })
    } catch (error) {
      return handleApiError(error, 'userService.hasPermission')
    }
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
      logError(error, 'userService.checkAdminPermission')
      return false
    }
  },

  /**
   * Group array by field (helper method)
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
   * Group data by time period (helper method)
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
      logError(error, 'userService.logActivity')
    }
  }
}

export default userService