/**
 * Comprehensive security and access control validation utilities
 * Provides role-based access control, permission checking, and security monitoring
 */

import { logError, ERROR_SEVERITY, ERROR_CATEGORIES } from './errorHandler'

/**
 * User roles hierarchy (higher number = more permissions)
 */
export const USER_ROLES = {
  GUEST: { name: 'guest', level: 0, label: 'אורח' },
  USER: { name: 'user', level: 1, label: 'משתמש' },
  MODERATOR: { name: 'moderator', level: 2, label: 'מנהל תוכן' },
  ADMIN: { name: 'admin', level: 3, label: 'מנהל מערכת' },
  SUPER_ADMIN: { name: 'super_admin', level: 4, label: 'מנהל על' }
}

/**
 * System permissions
 */
export const PERMISSIONS = {
  // User management
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  MANAGE_USER_ROLES: 'manage_user_roles',
  
  // Vehicle management
  VIEW_VEHICLES: 'view_vehicles',
  CREATE_VEHICLE: 'create_vehicle',
  EDIT_OWN_VEHICLE: 'edit_own_vehicle',
  EDIT_ANY_VEHICLE: 'edit_any_vehicle',
  DELETE_OWN_VEHICLE: 'delete_own_vehicle',
  DELETE_ANY_VEHICLE: 'delete_any_vehicle',
  APPROVE_VEHICLE: 'approve_vehicle',
  
  // Promotion management
  VIEW_PROMOTIONS: 'view_promotions',
  CREATE_PROMOTION: 'create_promotion',
  MANAGE_PROMOTIONS: 'manage_promotions',
  
  // System administration
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_AUDIT_LOGS: 'manage_audit_logs',
  
  // Messaging
  SEND_MESSAGES: 'send_messages',
  VIEW_ALL_MESSAGES: 'view_all_messages',
  MODERATE_MESSAGES: 'moderate_messages',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_DETAILED_ANALYTICS: 'view_detailed_analytics',
  EXPORT_DATA: 'export_data'
}

/**
 * Base permissions for each role
 */
const USER_PERMISSIONS = [
  PERMISSIONS.VIEW_VEHICLES,
  PERMISSIONS.CREATE_VEHICLE,
  PERMISSIONS.EDIT_OWN_VEHICLE,
  PERMISSIONS.DELETE_OWN_VEHICLE,
  PERMISSIONS.SEND_MESSAGES,
  PERMISSIONS.CREATE_PROMOTION
];

const MODERATOR_PERMISSIONS = [
  ...USER_PERMISSIONS,
  PERMISSIONS.VIEW_USERS,
  PERMISSIONS.EDIT_ANY_VEHICLE,
  PERMISSIONS.APPROVE_VEHICLE,
  PERMISSIONS.VIEW_PROMOTIONS,
  PERMISSIONS.MODERATE_MESSAGES,
  PERMISSIONS.VIEW_ANALYTICS
];

const ADMIN_PERMISSIONS = [
  ...MODERATOR_PERMISSIONS,
  PERMISSIONS.DELETE_ANY_VEHICLE,
  PERMISSIONS.MANAGE_PROMOTIONS,
  PERMISSIONS.VIEW_ADMIN_DASHBOARD,
  PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
  PERMISSIONS.VIEW_AUDIT_LOGS,
  PERMISSIONS.VIEW_ALL_MESSAGES,
  PERMISSIONS.VIEW_DETAILED_ANALYTICS,
  PERMISSIONS.EXPORT_DATA
];

const SUPER_ADMIN_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.MANAGE_USER_ROLES,
  PERMISSIONS.MANAGE_AUDIT_LOGS
];

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.GUEST.name]: [],
  [USER_ROLES.USER.name]: USER_PERMISSIONS,
  [USER_ROLES.MODERATOR.name]: MODERATOR_PERMISSIONS,
  [USER_ROLES.ADMIN.name]: ADMIN_PERMISSIONS,
  [USER_ROLES.SUPER_ADMIN.name]: SUPER_ADMIN_PERMISSIONS
}

/**
 * Security event types for monitoring
 */
export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PERMISSION_DENIED: 'permission_denied',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  ROLE_CHANGE: 'role_change',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  DATA_EXPORT: 'data_export',
  ADMIN_ACTION: 'admin_action'
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  PASSWORD_RESET: { max: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
  API_CALLS: { max: 100, window: 60 * 1000 }, // 100 calls per minute
  MESSAGE_SENDING: { max: 10, window: 60 * 1000 }, // 10 messages per minute
  FILE_UPLOADS: { max: 20, window: 60 * 60 * 1000 } // 20 uploads per hour
}

/**
 * Security validation class
 */
export class SecurityValidator {
  constructor() {
    this.rateLimitStore = new Map()
    this.suspiciousActivityStore = new Map()
    this.sessionStore = new Map()
  }

  /**
   * Get current user from session/token
   * @returns {Object|null} Current user object
   */
  getCurrentUser() {
    try {
      // Try to get user from localStorage (in real app, this would be from secure token)
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return {
          id: user.id,
          email: user.email,
          role: user.role || USER_ROLES.USER.name,
          permissions: this.getUserPermissions(user.role || USER_ROLES.USER.name),
          isActive: user.is_active !== false,
          emailVerified: user.email_verified === true
        }
      }
    } catch (error) {
      logError(
        error,
        'SecurityValidator.getCurrentUser',
        {},
        ERROR_SEVERITY.LOW
      )
    }
    return null
  }

  /**
   * Get permissions for a role
   * @param {string} role - User role
   * @returns {Array} Array of permissions
   */
  getUserPermissions(role) {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @param {Object} user - User object (optional, uses current user if not provided)
   * @param {Object} context - Additional context for permission check
   * @returns {boolean} Whether user has permission
   */
  hasPermission(permission, user = null, context = {}) {
    const currentUser = user || this.getCurrentUser()
    
    if (!currentUser) {
      this.logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
        permission,
        context,
        reason: 'No authenticated user'
      })
      return false
    }

    // Check if user account is active
    if (!currentUser.isActive) {
      this.logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
        userId: currentUser.id,
        permission,
        context,
        reason: 'Account inactive'
      })
      return false
    }

    // Check if email is verified for sensitive operations
    const sensitivePermissions = [
      PERMISSIONS.DELETE_ANY_VEHICLE,
      PERMISSIONS.MANAGE_USER_ROLES,
      PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
      PERMISSIONS.VIEW_AUDIT_LOGS
    ]
    
    if (sensitivePermissions.includes(permission) && !currentUser.emailVerified) {
      this.logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
        userId: currentUser.id,
        permission,
        context,
        reason: 'Email not verified'
      })
      return false
    }

    // Check role-based permissions
    const userPermissions = currentUser.permissions || this.getUserPermissions(currentUser.role)
    const hasBasicPermission = userPermissions.includes(permission)

    // Additional context-based checks
    if (hasBasicPermission && context.resourceOwnerId) {
      // For "own" permissions, check if user owns the resource
      if (permission.includes('_own_') && context.resourceOwnerId !== currentUser.id) {
        // Check if user has the "any" version of the permission
        const anyPermission = permission.replace('_own_', '_any_')
        if (!userPermissions.includes(anyPermission)) {
          this.logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
            userId: currentUser.id,
            permission,
            context,
            reason: 'Not resource owner and no elevated permission'
          })
          return false
        }
      }
    }

    if (!hasBasicPermission) {
      this.logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
        userId: currentUser.id,
        permission,
        context,
        reason: 'Insufficient role permissions'
      })
    }

    return hasBasicPermission
  }

  /**
   * Check if user has any of the specified permissions
   * @param {Array} permissions - Array of permissions to check
   * @param {Object} user - User object (optional)
   * @param {Object} context - Additional context
   * @returns {boolean} Whether user has any of the permissions
   */
  hasAnyPermission(permissions, user = null, context = {}) {
    return permissions.some(permission => this.hasPermission(permission, user, context))
  }

  /**
   * Check if user has all of the specified permissions
   * @param {Array} permissions - Array of permissions to check
   * @param {Object} user - User object (optional)
   * @param {Object} context - Additional context
   * @returns {boolean} Whether user has all permissions
   */
  hasAllPermissions(permissions, user = null, context = {}) {
    return permissions.every(permission => this.hasPermission(permission, user, context))
  }

  /**
   * Check if user has minimum role level
   * @param {string} requiredRole - Required role name
   * @param {Object} user - User object (optional)
   * @returns {boolean} Whether user has sufficient role level
   */
  hasMinimumRole(requiredRole, user = null) {
    const currentUser = user || this.getCurrentUser()
    
    if (!currentUser) return false

    const userRole = USER_ROLES[currentUser.role.toUpperCase()]
    const requiredRoleObj = USER_ROLES[requiredRole.toUpperCase()]

    if (!userRole || !requiredRoleObj) return false

    return userRole.level >= requiredRoleObj.level
  }

  /**
   * Rate limiting check
   * @param {string} key - Rate limit key (e.g., user ID + action)
   * @param {Object} limit - Rate limit configuration
   * @returns {boolean} Whether action is allowed
   */
  checkRateLimit(key, limit) {
    const now = Date.now()
    const windowStart = now - limit.window

    // Get or create rate limit entry
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, [])
    }

    const attempts = this.rateLimitStore.get(key)
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart)
    this.rateLimitStore.set(key, recentAttempts)

    // Check if limit exceeded
    if (recentAttempts.length >= limit.max) {
      this.logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
        key,
        attempts: recentAttempts.length,
        limit: limit.max,
        window: limit.window,
        reason: 'Rate limit exceeded'
      })
      return false
    }

    // Add current attempt
    recentAttempts.push(now)
    this.rateLimitStore.set(key, recentAttempts)

    return true
  }

  /**
   * Validate session security
   * @param {string} sessionId - Session ID
   * @param {Object} context - Session context
   * @returns {boolean} Whether session is valid
   */
  validateSession(sessionId, context = {}) {
    if (!sessionId) return false

    const session = this.sessionStore.get(sessionId)
    if (!session) return false

    const now = Date.now()

    // Check session expiry
    if (session.expiresAt && now > session.expiresAt) {
      this.sessionStore.delete(sessionId)
      this.logSecurityEvent(SECURITY_EVENTS.LOGOUT, {
        sessionId,
        reason: 'Session expired'
      })
      return false
    }

    // Check for suspicious activity (e.g., IP change, user agent change)
    if (context.ipAddress && session.ipAddress && context.ipAddress !== session.ipAddress) {
      this.logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
        sessionId,
        userId: session.userId,
        oldIp: session.ipAddress,
        newIp: context.ipAddress,
        reason: 'IP address changed'
      })
      // Don't invalidate session but log for monitoring
    }

    // Update session activity
    session.lastActivity = now
    this.sessionStore.set(sessionId, session)

    return true
  }

  /**
   * Log security events
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(eventType, details = {}) {
    const securityEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      ipAddress: details.ipAddress || 'unknown',
      sessionId: details.sessionId || 'unknown'
    }

    // Determine severity based on event type
    let severity = ERROR_SEVERITY.LOW
    const highSeverityEvents = [
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      SECURITY_EVENTS.ACCOUNT_LOCKED
    ]
    
    if (highSeverityEvents.includes(eventType)) {
      severity = ERROR_SEVERITY.HIGH
    }

    logError(
      new Error(`Security Event: ${eventType}`),
      'SecurityValidator.logSecurityEvent',
      securityEvent,
      severity
    )

    // Store in security event log (in production, this would go to a secure audit log)
    this.storeSecurityEvent(securityEvent)
  }

  /**
   * Store security event (placeholder for production implementation)
   * @param {Object} event - Security event
   */
  storeSecurityEvent(event) {
    try {
      const events = JSON.parse(localStorage.getItem('security_events') || '[]')
      events.unshift(event)
      
      // Keep only last 100 events in localStorage
      if (events.length > 100) {
        events.splice(100)
      }
      
      localStorage.setItem('security_events', JSON.stringify(events))
    } catch (error) {
    }
  }

  /**
   * Get security events for monitoring
   * @param {Object} filters - Event filters
   * @returns {Array} Array of security events
   */
  getSecurityEvents(filters = {}) {
    try {
      const events = JSON.parse(localStorage.getItem('security_events') || '[]')
      
      let filteredEvents = events
      
      if (filters.eventType) {
        filteredEvents = filteredEvents.filter(event => event.type === filters.eventType)
      }
      
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(event => 
          event.details.userId === filters.userId
        )
      }
      
      if (filters.since) {
        const sinceDate = new Date(filters.since)
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.timestamp) >= sinceDate
        )
      }
      
      return filteredEvents
    } catch (error) {
      logError(
        error,
        'SecurityValidator.getSecurityEvents',
        filters,
        ERROR_SEVERITY.LOW
      )
      return []
    }
  }

  /**
   * Detect suspicious activity patterns
   * @param {string} userId - User ID to check
   * @returns {Object} Suspicious activity analysis
   */
  detectSuspiciousActivity(userId) {
    const events = this.getSecurityEvents({ userId })
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const recentEvents = events.filter(event => 
      now - new Date(event.timestamp).getTime() < oneHour
    )

    const analysis = {
      isSuspicious: false,
      reasons: [],
      riskLevel: 'low',
      recommendations: []
    }

    // Check for multiple failed login attempts
    const failedLogins = recentEvents.filter(event => 
      event.type === SECURITY_EVENTS.LOGIN_FAILURE
    ).length

    if (failedLogins >= 3) {
      analysis.isSuspicious = true
      analysis.reasons.push('Multiple failed login attempts')
      analysis.riskLevel = 'high'
      analysis.recommendations.push('Consider account lockout')
    }

    // Check for permission denied events
    const permissionDenied = recentEvents.filter(event => 
      event.type === SECURITY_EVENTS.PERMISSION_DENIED
    ).length

    if (permissionDenied >= 5) {
      analysis.isSuspicious = true
      analysis.reasons.push('Multiple permission denied events')
      analysis.riskLevel = analysis.riskLevel === 'high' ? 'high' : 'medium'
      analysis.recommendations.push('Review user permissions')
    }

    // Check for rapid role changes
    const roleChanges = recentEvents.filter(event => 
      event.type === SECURITY_EVENTS.ROLE_CHANGE
    ).length

    if (roleChanges >= 2) {
      analysis.isSuspicious = true
      analysis.reasons.push('Multiple role changes')
      analysis.riskLevel = 'high'
      analysis.recommendations.push('Investigate role change requests')
    }

    return analysis
  }

  /**
   * Clean up old rate limit and session data
   */
  cleanup() {
    const now = Date.now()
    
    // Clean up rate limit store
    for (const [key, attempts] of this.rateLimitStore.entries()) {
      const recentAttempts = attempts.filter(timestamp => 
        now - timestamp < 24 * 60 * 60 * 1000 // Keep 24 hours
      )
      
      if (recentAttempts.length === 0) {
        this.rateLimitStore.delete(key)
      } else {
        this.rateLimitStore.set(key, recentAttempts)
      }
    }
    
    // Clean up expired sessions
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.expiresAt && now > session.expiresAt) {
        this.sessionStore.delete(sessionId)
      }
    }
  }
}

// Global security validator instance
export const securityValidator = new SecurityValidator()

// Convenience functions
export const hasPermission = (permission, user, context) => 
  securityValidator.hasPermission(permission, user, context)

export const hasAnyPermission = (permissions, user, context) => 
  securityValidator.hasAnyPermission(permissions, user, context)

export const hasAllPermissions = (permissions, user, context) => 
  securityValidator.hasAllPermissions(permissions, user, context)

export const hasMinimumRole = (role, user) => 
  securityValidator.hasMinimumRole(role, user)

export const checkRateLimit = (key, limit) => 
  securityValidator.checkRateLimit(key, limit)

export const logSecurityEvent = (eventType, details) => 
  securityValidator.logSecurityEvent(eventType, details)

export const getCurrentUser = () => 
  securityValidator.getCurrentUser()

// Initialize cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    securityValidator.cleanup()
  }, 60 * 60 * 1000) // Clean up every hour
}

export default {
  SecurityValidator,
  securityValidator,
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SECURITY_EVENTS,
  RATE_LIMITS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasMinimumRole,
  checkRateLimit,
  logSecurityEvent,
  getCurrentUser
}