import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
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
} from '../security.js'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

describe('security utilities', () => {
  let validator

  beforeEach(() => {
    vi.clearAllMocks()
    validator = new SecurityValidator()
    
    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null)
    mockSessionStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('SecurityValidator', () => {
    describe('getCurrentUser', () => {
      it('should return user from localStorage', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          is_active: true,
          email_verified: true
        }
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser))
        
        const result = validator.getCurrentUser()
        
        expect(result).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: ROLE_PERMISSIONS.user,
          isActive: true,
          emailVerified: true
        })
      })

      it('should return null when no user in localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue(null)
        
        const result = validator.getCurrentUser()
        
        expect(result).toBeNull()
      })

      it('should handle invalid JSON in localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-json')
        
        const result = validator.getCurrentUser()
        
        expect(result).toBeNull()
      })

      it('should set default role for user without role', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com'
        }
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser))
        
        const result = validator.getCurrentUser()
        
        expect(result.role).toBe('user')
        expect(result.permissions).toEqual(ROLE_PERMISSIONS.user)
      })
    })

    describe('getUserPermissions', () => {
      it('should return correct permissions for each role', () => {
        expect(validator.getUserPermissions('user')).toEqual(ROLE_PERMISSIONS.user)
        expect(validator.getUserPermissions('admin')).toEqual(ROLE_PERMISSIONS.admin)
        expect(validator.getUserPermissions('moderator')).toEqual(ROLE_PERMISSIONS.moderator)
      })

      it('should return empty array for unknown role', () => {
        expect(validator.getUserPermissions('unknown')).toEqual([])
      })
    })

    describe('hasPermission', () => {
      it('should return true for user with permission', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasPermission(PERMISSIONS.CREATE_VEHICLE, mockUser)
        
        expect(result).toBe(true)
      })

      it('should return false for user without permission', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasPermission(PERMISSIONS.MANAGE_SYSTEM_SETTINGS, mockUser)
        
        expect(result).toBe(false)
      })

      it('should return false for inactive user', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ROLE_PERMISSIONS.admin,
          isActive: false,
          emailVerified: true
        }
        
        const result = validator.hasPermission(PERMISSIONS.MANAGE_SYSTEM_SETTINGS, mockUser)
        
        expect(result).toBe(false)
      })

      it('should return false for unverified email on sensitive operations', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ROLE_PERMISSIONS.admin,
          isActive: true,
          emailVerified: false
        }
        
        const result = validator.hasPermission(PERMISSIONS.MANAGE_SYSTEM_SETTINGS, mockUser)
        
        expect(result).toBe(false)
      })

      it('should handle resource ownership context', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          isActive: true,
          emailVerified: true
        }
        
        // User owns the resource
        const ownResourceResult = validator.hasPermission(
          PERMISSIONS.EDIT_OWN_VEHICLE,
          mockUser,
          { resourceOwnerId: 'user-123' }
        )
        expect(ownResourceResult).toBe(true)
        
        // User doesn't own the resource and doesn't have elevated permission
        const userPermissions = validator.getUserPermissions(mockUser.role)
        console.log('User permissions:', userPermissions)
        console.log('Has EDIT_ANY_VEHICLE:', userPermissions.includes(PERMISSIONS.EDIT_ANY_VEHICLE))
        console.log('User ID:', mockUser.id)
        console.log('Resource Owner ID:', 'other-user')
        console.log('User owns resource:', 'other-user' === mockUser.id)
        
        const otherResourceResult = validator.hasPermission(
          PERMISSIONS.EDIT_OWN_VEHICLE,
          mockUser,
          { resourceOwnerId: 'other-user' }
        )
        console.log('Result:', otherResourceResult)
        expect(otherResourceResult).toBe(false)
      })

      it('should return false when no user provided and no current user', () => {
        mockLocalStorage.getItem.mockReturnValue(null)
        
        const result = validator.hasPermission(PERMISSIONS.CREATE_VEHICLE)
        
        expect(result).toBe(false)
      })
    })

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the permissions', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasAnyPermission([
          PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
          PERMISSIONS.CREATE_VEHICLE
        ], mockUser)
        
        expect(result).toBe(true)
      })

      it('should return false if user has none of the permissions', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasAnyPermission([
          PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
          PERMISSIONS.DELETE_ANY_VEHICLE
        ], mockUser)
        
        expect(result).toBe(false)
      })
    })

    describe('hasAllPermissions', () => {
      it('should return true if user has all permissions', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE, PERMISSIONS.EDIT_OWN_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasAllPermissions([
          PERMISSIONS.CREATE_VEHICLE,
          PERMISSIONS.EDIT_OWN_VEHICLE
        ], mockUser)
        
        expect(result).toBe(true)
      })

      it('should return false if user is missing any permission', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: [PERMISSIONS.CREATE_VEHICLE],
          isActive: true,
          emailVerified: true
        }
        
        const result = validator.hasAllPermissions([
          PERMISSIONS.CREATE_VEHICLE,
          PERMISSIONS.MANAGE_SYSTEM_SETTINGS
        ], mockUser)
        
        expect(result).toBe(false)
      })
    })

    describe('hasMinimumRole', () => {
      it('should return true for user with sufficient role level', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin'
        }
        
        expect(validator.hasMinimumRole('user', mockUser)).toBe(true)
        expect(validator.hasMinimumRole('moderator', mockUser)).toBe(true)
        expect(validator.hasMinimumRole('admin', mockUser)).toBe(true)
      })

      it('should return false for user with insufficient role level', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user'
        }
        
        expect(validator.hasMinimumRole('moderator', mockUser)).toBe(false)
        expect(validator.hasMinimumRole('admin', mockUser)).toBe(false)
      })

      it('should return false for unknown roles', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'unknown'
        }
        
        expect(validator.hasMinimumRole('user', mockUser)).toBe(false)
      })

      it('should return false when no user provided', () => {
        expect(validator.hasMinimumRole('user', null)).toBe(false)
      })
    })

    describe('checkRateLimit', () => {
      it('should allow requests within rate limit', () => {
        const key = 'user-123:login'
        const limit = { max: 5, window: 60000 }
        
        // First few requests should be allowed
        expect(validator.checkRateLimit(key, limit)).toBe(true)
        expect(validator.checkRateLimit(key, limit)).toBe(true)
        expect(validator.checkRateLimit(key, limit)).toBe(true)
      })

      it('should block requests exceeding rate limit', () => {
        const key = 'user-123:api'
        const limit = { max: 2, window: 60000 }
        
        // First two requests allowed
        expect(validator.checkRateLimit(key, limit)).toBe(true)
        expect(validator.checkRateLimit(key, limit)).toBe(true)
        
        // Third request should be blocked
        expect(validator.checkRateLimit(key, limit)).toBe(false)
      })

      it('should reset rate limit after window expires', () => {
        const key = 'user-123:reset'
        const limit = { max: 1, window: 100 } // 100ms window
        
        // First request allowed
        expect(validator.checkRateLimit(key, limit)).toBe(true)
        
        // Second request blocked
        expect(validator.checkRateLimit(key, limit)).toBe(false)
        
        // Wait for window to expire and try again
        return new Promise((resolve) => {
          setTimeout(() => {
            expect(validator.checkRateLimit(key, limit)).toBe(true)
            resolve()
          }, 150)
        })
      })
    })

    describe('validateSession', () => {
      it('should return false for non-existent session', () => {
        const result = validator.validateSession('non-existent-session')
        expect(result).toBe(false)
      })

      it('should return false for expired session', () => {
        const sessionId = 'expired-session'
        const expiredSession = {
          userId: 'user-123',
          expiresAt: Date.now() - 1000, // Expired 1 second ago
          ipAddress: '192.168.1.1',
          lastActivity: Date.now() - 3600000
        }
        
        validator.sessionStore.set(sessionId, expiredSession)
        
        const result = validator.validateSession(sessionId)
        expect(result).toBe(false)
        expect(validator.sessionStore.has(sessionId)).toBe(false) // Should be cleaned up
      })

      it('should return true for valid session', () => {
        const sessionId = 'valid-session'
        const validSession = {
          userId: 'user-123',
          expiresAt: Date.now() + 3600000, // Expires in 1 hour
          ipAddress: '192.168.1.1',
          lastActivity: Date.now() - 60000
        }
        
        validator.sessionStore.set(sessionId, validSession)
        
        const result = validator.validateSession(sessionId, { ipAddress: '192.168.1.1' })
        expect(result).toBe(true)
      })

      it('should log suspicious activity for IP changes', () => {
        const sessionId = 'ip-change-session'
        const session = {
          userId: 'user-123',
          expiresAt: Date.now() + 3600000,
          ipAddress: '192.168.1.1',
          lastActivity: Date.now() - 60000
        }
        
        validator.sessionStore.set(sessionId, session)
        
        // Mock logSecurityEvent
        const logSpy = vi.spyOn(validator, 'logSecurityEvent')
        
        const result = validator.validateSession(sessionId, { ipAddress: '192.168.1.2' })
        
        expect(result).toBe(true) // Session still valid
        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          expect.objectContaining({
            sessionId,
            userId: 'user-123',
            oldIp: '192.168.1.1',
            newIp: '192.168.1.2',
            reason: 'IP address changed'
          })
        )
      })
    })

    describe('logSecurityEvent', () => {
      it('should log security event with proper structure', () => {
        const eventType = SECURITY_EVENTS.LOGIN_SUCCESS
        const details = { userId: 'user-123', method: 'password' }
        
        // Mock storeSecurityEvent
        const storeSpy = vi.spyOn(validator, 'storeSecurityEvent')
        
        validator.logSecurityEvent(eventType, details)
        
        expect(storeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: eventType,
            timestamp: expect.any(String),
            details,
            userAgent: expect.any(String),
            ipAddress: 'unknown',
            sessionId: 'unknown'
          })
        )
      })

      it('should store security events in localStorage', () => {
        const event = {
          type: SECURITY_EVENTS.LOGIN_SUCCESS,
          timestamp: new Date().toISOString(),
          details: { userId: 'user-123' }
        }
        
        // Mock existing events
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
        
        validator.storeSecurityEvent(event)
        
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'security_events',
          expect.stringContaining(event.type)
        )
      })
    })

    describe('getSecurityEvents', () => {
      it('should return filtered security events', () => {
        const events = [
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: new Date().toISOString(),
            details: { userId: 'user-123' }
          },
          {
            type: SECURITY_EVENTS.LOGIN_FAILURE,
            timestamp: new Date().toISOString(),
            details: { userId: 'user-456' }
          }
        ]
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.getSecurityEvents({ eventType: SECURITY_EVENTS.LOGIN_SUCCESS })
        
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe(SECURITY_EVENTS.LOGIN_SUCCESS)
      })

      it('should filter by user ID', () => {
        const events = [
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: new Date().toISOString(),
            details: { userId: 'user-123' }
          },
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: new Date().toISOString(),
            details: { userId: 'user-456' }
          }
        ]
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.getSecurityEvents({ userId: 'user-123' })
        
        expect(result).toHaveLength(1)
        expect(result[0].details.userId).toBe('user-123')
      })

      it('should filter by date', () => {
        const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        const recentDate = new Date()
        
        const events = [
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: oldDate.toISOString(),
            details: { userId: 'user-123' }
          },
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: recentDate.toISOString(),
            details: { userId: 'user-123' }
          }
        ]
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const result = validator.getSecurityEvents({ since: yesterday.toISOString() })
        
        expect(result).toHaveLength(1)
        expect(new Date(result[0].timestamp)).toBeInstanceOf(Date)
      })
    })

    describe('detectSuspiciousActivity', () => {
      it('should detect multiple failed login attempts', () => {
        const events = Array(4).fill(null).map(() => ({
          type: SECURITY_EVENTS.LOGIN_FAILURE,
          timestamp: new Date().toISOString(),
          details: { userId: 'user-123' }
        }))
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.detectSuspiciousActivity('user-123')
        
        expect(result.isSuspicious).toBe(true)
        expect(result.reasons).toContain('Multiple failed login attempts')
        expect(result.riskLevel).toBe('high')
        expect(result.recommendations).toContain('Consider account lockout')
      })

      it('should detect multiple permission denied events', () => {
        const events = Array(6).fill(null).map(() => ({
          type: SECURITY_EVENTS.PERMISSION_DENIED,
          timestamp: new Date().toISOString(),
          details: { userId: 'user-123' }
        }))
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.detectSuspiciousActivity('user-123')
        
        expect(result.isSuspicious).toBe(true)
        expect(result.reasons).toContain('Multiple permission denied events')
        expect(result.riskLevel).toBe('medium')
        expect(result.recommendations).toContain('Review user permissions')
      })

      it('should detect multiple role changes', () => {
        const events = Array(3).fill(null).map(() => ({
          type: SECURITY_EVENTS.ROLE_CHANGE,
          timestamp: new Date().toISOString(),
          details: { userId: 'user-123' }
        }))
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.detectSuspiciousActivity('user-123')
        
        expect(result.isSuspicious).toBe(true)
        expect(result.reasons).toContain('Multiple role changes')
        expect(result.riskLevel).toBe('high')
        expect(result.recommendations).toContain('Investigate role change requests')
      })

      it('should return low risk for normal activity', () => {
        const events = [
          {
            type: SECURITY_EVENTS.LOGIN_SUCCESS,
            timestamp: new Date().toISOString(),
            details: { userId: 'user-123' }
          }
        ]
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(events))
        
        const result = validator.detectSuspiciousActivity('user-123')
        
        expect(result.isSuspicious).toBe(false)
        expect(result.riskLevel).toBe('low')
        expect(result.reasons).toHaveLength(0)
      })
    })

    describe('cleanup', () => {
      it('should clean up old rate limit data', () => {
        const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
        const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago
        
        validator.rateLimitStore.set('old-key', [oldTimestamp])
        validator.rateLimitStore.set('recent-key', [recentTimestamp])
        
        validator.cleanup()
        
        expect(validator.rateLimitStore.has('old-key')).toBe(false)
        expect(validator.rateLimitStore.has('recent-key')).toBe(true)
      })

      it('should clean up expired sessions', () => {
        const expiredSession = {
          userId: 'user-123',
          expiresAt: Date.now() - 1000,
          lastActivity: Date.now() - 3600000
        }
        
        const validSession = {
          userId: 'user-456',
          expiresAt: Date.now() + 3600000,
          lastActivity: Date.now() - 60000
        }
        
        validator.sessionStore.set('expired', expiredSession)
        validator.sessionStore.set('valid', validSession)
        
        validator.cleanup()
        
        expect(validator.sessionStore.has('expired')).toBe(false)
        expect(validator.sessionStore.has('valid')).toBe(true)
      })
    })
  })

  describe('convenience functions', () => {
    it('should call securityValidator methods', () => {
      const mockUser = {
        id: 'user-123',
        role: 'user',
        permissions: [PERMISSIONS.CREATE_VEHICLE],
        isActive: true,
        emailVerified: true
      }
      
      // Mock the global securityValidator
      const hasPermissionSpy = vi.spyOn(securityValidator, 'hasPermission').mockReturnValue(true)
      const hasAnyPermissionSpy = vi.spyOn(securityValidator, 'hasAnyPermission').mockReturnValue(true)
      const hasAllPermissionsSpy = vi.spyOn(securityValidator, 'hasAllPermissions').mockReturnValue(true)
      const hasMinimumRoleSpy = vi.spyOn(securityValidator, 'hasMinimumRole').mockReturnValue(true)
      const checkRateLimitSpy = vi.spyOn(securityValidator, 'checkRateLimit').mockReturnValue(true)
      const logSecurityEventSpy = vi.spyOn(securityValidator, 'logSecurityEvent')
      const getCurrentUserSpy = vi.spyOn(securityValidator, 'getCurrentUser').mockReturnValue(mockUser)
      
      // Test convenience functions
      expect(hasPermission(PERMISSIONS.CREATE_VEHICLE, mockUser)).toBe(true)
      expect(hasAnyPermission([PERMISSIONS.CREATE_VEHICLE], mockUser)).toBe(true)
      expect(hasAllPermissions([PERMISSIONS.CREATE_VEHICLE], mockUser)).toBe(true)
      expect(hasMinimumRole('user', mockUser)).toBe(true)
      expect(checkRateLimit('key', { max: 5, window: 60000 })).toBe(true)
      expect(getCurrentUser()).toBe(mockUser)
      
      logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, { userId: 'user-123' })
      
      // Verify calls
      expect(hasPermissionSpy).toHaveBeenCalledWith(PERMISSIONS.CREATE_VEHICLE, mockUser, undefined)
      expect(hasAnyPermissionSpy).toHaveBeenCalledWith([PERMISSIONS.CREATE_VEHICLE], mockUser, undefined)
      expect(hasAllPermissionsSpy).toHaveBeenCalledWith([PERMISSIONS.CREATE_VEHICLE], mockUser, undefined)
      expect(hasMinimumRoleSpy).toHaveBeenCalledWith('user', mockUser)
      expect(checkRateLimitSpy).toHaveBeenCalledWith('key', { max: 5, window: 60000 })
      expect(logSecurityEventSpy).toHaveBeenCalledWith(SECURITY_EVENTS.LOGIN_SUCCESS, { userId: 'user-123' })
      expect(getCurrentUserSpy).toHaveBeenCalled()
    })
  })

  describe('constants', () => {
    it('should have correct user roles hierarchy', () => {
      expect(USER_ROLES.GUEST.level).toBe(0)
      expect(USER_ROLES.USER.level).toBe(1)
      expect(USER_ROLES.MODERATOR.level).toBe(2)
      expect(USER_ROLES.ADMIN.level).toBe(3)
      expect(USER_ROLES.SUPER_ADMIN.level).toBe(4)
    })

    it('should have role permissions properly defined', () => {
      expect(ROLE_PERMISSIONS.user).toContain(PERMISSIONS.CREATE_VEHICLE)
      expect(ROLE_PERMISSIONS.admin).toContain(PERMISSIONS.MANAGE_SYSTEM_SETTINGS)
      expect(ROLE_PERMISSIONS.moderator).toContain(PERMISSIONS.APPROVE_VEHICLE)
    })

    it('should have rate limits defined', () => {
      expect(RATE_LIMITS.LOGIN_ATTEMPTS.max).toBe(5)
      expect(RATE_LIMITS.API_CALLS.max).toBe(100)
      expect(RATE_LIMITS.PASSWORD_RESET.max).toBe(3)
    })

    it('should have security events defined', () => {
      expect(SECURITY_EVENTS.LOGIN_SUCCESS).toBe('login_success')
      expect(SECURITY_EVENTS.PERMISSION_DENIED).toBe('permission_denied')
      expect(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY).toBe('suspicious_activity')
    })
  })
})