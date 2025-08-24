import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { userService } from '../users.js'
import { supabase } from '@/lib/supabase'
import { mockUser, mockAdminUser, mockSupabaseResponse, createMockService } from '@/test/utils'

// Mock the supabase module
vi.mock('@/lib/supabase')

// Mock error handler utilities
vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn((error, context) => ({ success: false, error, context })),
  logError: vi.fn(),
  validateRequiredFields: vi.fn(() => true),
  validateEmail: vi.fn(() => true),
  validatePhone: vi.fn(() => true),
  sanitizeInput: vi.fn((input) => input),
  createSuccessResponse: vi.fn((data, message) => ({ success: true, data, message }))
}))

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('me', () => {
    it('should get current user profile successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await userService.me()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUser)
    })

    it('should create profile if not exists', async () => {
      const authUser = { 
        id: mockUser.id, 
        email: mockUser.email,
        user_metadata: { full_name: 'Test User', phone: '0501234567' }
      }
      
      supabase.auth.getUser.mockResolvedValue({ data: { user: authUser }, error: null })
      
      // Mock profile not found error
      const notFoundError = { code: 'PGRST116', message: 'No rows found' }
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: notFoundError })
          })
        })
      })

      // Mock successful profile creation
      supabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await userService.me()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUser)
    })

    it('should handle authentication error', async () => {
      const authError = new Error('No authenticated user')
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: authError })

      const result = await userService.me()

      expect(result.success).toBe(false)
      expect(result.error).toBe(authError)
    })
  })

  describe('getById', () => {
    it('should get user by ID successfully', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await userService.getById(mockUser.id)

      expect(result).toEqual(mockUser)
    })

    it('should handle user not found', async () => {
      const notFoundError = new Error('User not found')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: notFoundError })
          })
        })
      })

      await expect(userService.getById('invalid-id')).rejects.toThrow('User not found')
    })
  })

  describe('getByEmail', () => {
    it('should get user by email successfully', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await userService.getByEmail(mockUser.email)

      expect(result).toEqual(mockUser)
    })
  })

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { full_name: 'Updated Name', phone: '0509876543' }
      const updatedUser = { ...mockUser, ...updates }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null })
            })
          })
        })
      })

      const result = await userService.updateProfile(updates)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedUser)
    })

    it('should handle update error', async () => {
      const updateError = new Error('Update failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: updateError })
            })
          })
        })
      })

      const result = await userService.updateProfile({ full_name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(updateError)
    })
  })

  describe('getUserStats', () => {
    it('should get user statistics successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Mock vehicle stats
      const mockVehicles = [
        { status: 'למכירה' },
        { status: 'למכירה' },
        { status: 'נמכר' },
        { status: 'ממתין לתשלום' }
      ]
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
        })
      })

      // Mock buyer requests
      const mockBuyerRequests = [{ id: '1' }, { id: '2' }]
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBuyerRequests, error: null })
        })
      })

      const result = await userService.getUserStats()

      expect(result.total_vehicles).toBe(4)
      expect(result.active_vehicles).toBe(2)
      expect(result.sold_vehicles).toBe(1)
      expect(result.pending_vehicles).toBe(1)
      expect(result.buyer_requests).toBe(2)
    })
  })

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const mockSearchResults = [mockUser, mockAdminUser]
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockSearchResults, error: null })
            })
          })
        })
      })

      const result = await userService.searchUsers('test', 5)

      expect(result).toEqual(mockSearchResults)
    })

    it('should handle search error', async () => {
      const searchError = new Error('Search failed')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: searchError })
            })
          })
        })
      })

      await expect(userService.searchUsers('test')).rejects.toThrow('Search failed')
    })
  })

  describe('getAllUsers', () => {
    it('should get all users for admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)

      const mockUsers = [mockUser, mockAdminUser]
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: mockUsers, error: null, count: 2 })
          })
        })
      })

      const result = await userService.getAllUsers()

      expect(result.success).toBe(true)
      expect(result.data.users).toEqual(mockUsers)
      expect(result.data.pagination.total).toBe(2)
    })

    it('should deny access for non-admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(false)

      const result = await userService.getAllUsers()

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('אין לך הרשאה')
    })
  })

  describe('updateUserRole', () => {
    it('should update user role for admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)
      
      // Mock logActivity
      vi.spyOn(userService, 'logActivity').mockResolvedValue()

      const updatedUser = { ...mockUser, role: 'moderator' }
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null })
            })
          })
        })
      })

      const result = await userService.updateUserRole(mockUser.id, 'moderator')

      expect(result.success).toBe(true)
      expect(result.data.role).toBe('moderator')
    })

    it('should prevent self-demotion', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)

      const result = await userService.updateUserRole(mockAdminUser.id, 'user')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('לא ניתן להוריד את עצמך')
    })

    it('should reject invalid role', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)

      const result = await userService.updateUserRole(mockUser.id, 'invalid_role')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('תפקיד לא חוקי')
    })
  })

  describe('setUserActiveStatus', () => {
    it('should activate user for admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)
      
      // Mock logActivity
      vi.spyOn(userService, 'logActivity').mockResolvedValue()

      const activatedUser = { ...mockUser, is_active: true }
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: activatedUser, error: null })
            })
          })
        })
      })

      const result = await userService.setUserActiveStatus(mockUser.id, true)

      expect(result.success).toBe(true)
      expect(result.data.is_active).toBe(true)
    })

    it('should prevent self-deactivation', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)

      const result = await userService.setUserActiveStatus(mockAdminUser.id, false)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('לא ניתן להשבית את החשבון שלך')
    })
  })

  describe('getUserActivityAnalytics', () => {
    it('should get user activity analytics', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      // Mock activity logs
      const mockActivities = [
        { action: 'login', resource_type: 'auth', created_at: '2024-01-01T00:00:00Z' },
        { action: 'create_vehicle', resource_type: 'vehicle', created_at: '2024-01-02T00:00:00Z' }
      ]

      // Mock user profile
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { email: mockUser.email }, error: null })
          })
        })
      })

      // Mock activity logs query
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: mockActivities, error: null })
            })
          })
        })
      })

      // Mock vehicles query
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })

      // Mock messages query
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })

      // Mock groupBy and groupByTimePeriod methods
      vi.spyOn(userService, 'groupBy').mockReturnValue({ login: 1, create_vehicle: 1 })
      vi.spyOn(userService, 'groupByTimePeriod').mockReturnValue([
        { date: '2024-01-01', count: 1 },
        { date: '2024-01-02', count: 1 }
      ])

      const result = await userService.getUserActivityAnalytics()

      expect(result.success).toBe(true)
      expect(result.data.activity.total_actions).toBe(2)
      expect(result.data.user_id).toBe(mockUser.id)
    })

    it('should deny access to other user analytics for non-admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(false)

      const result = await userService.getUserActivityAnalytics('other-user-id')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('אין לך הרשאה')
    })
  })

  describe('bulkUpdateUsers', () => {
    it('should bulk update users for admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)
      
      // Mock logActivity
      vi.spyOn(userService, 'logActivity').mockResolvedValue()

      const userIds = [mockUser.id, 'other-user-id']
      const updates = { is_active: false }
      const updatedUsers = [
        { ...mockUser, is_active: false },
        { id: 'other-user-id', is_active: false }
      ]

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: updatedUsers, error: null })
          })
        })
      })

      const result = await userService.bulkUpdateUsers(userIds, updates)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedUsers)
    })

    it('should prevent self-modification in bulk', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(userService, 'checkAdminPermission').mockResolvedValue(true)

      const userIds = [mockAdminUser.id, mockUser.id]
      const result = await userService.bulkUpdateUsers(userIds, { is_active: false })

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('לא ניתן לכלול את עצמך')
    })
  })

  describe('getRolesAndPermissions', () => {
    it('should get roles and permissions', async () => {
      const result = await userService.getRolesAndPermissions()

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('user')
      expect(result.data).toHaveProperty('moderator')
      expect(result.data).toHaveProperty('admin')
      expect(result.data.admin.permissions).toContain('all_permissions')
    })
  })

  describe('hasPermission', () => {
    it('should check permission for current user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'user' }, error: null })
          })
        })
      })

      // Mock getRolesAndPermissions
      vi.spyOn(userService, 'getRolesAndPermissions').mockResolvedValue({
        success: true,
        data: {
          user: { permissions: ['read_own_profile', 'update_own_profile'] }
        }
      })

      const result = await userService.hasPermission('read_own_profile')

      expect(result.success).toBe(true)
      expect(result.data.hasPermission).toBe(true)
      expect(result.data.role).toBe('user')
    })

    it('should return true for admin with any permission', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
          })
        })
      })

      const result = await userService.hasPermission('any_permission')

      expect(result.success).toBe(true)
      expect(result.data.hasPermission).toBe(true)
      expect(result.data.role).toBe('admin')
    })
  })

  describe('helper methods', () => {
    describe('checkAdminPermission', () => {
      it('should return true for system admin email', async () => {
        const systemAdmin = { ...mockAdminUser, email: 'zometauto@gmail.com' }
        const result = await userService.checkAdminPermission(systemAdmin)

        expect(result).toBe(true)
      })

      it('should return true for admin role', async () => {
        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
            })
          })
        })

        const result = await userService.checkAdminPermission(mockAdminUser)

        expect(result).toBe(true)
      })

      it('should return false for regular user', async () => {
        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { role: 'user' }, error: null })
            })
          })
        })

        const result = await userService.checkAdminPermission(mockUser)

        expect(result).toBe(false)
      })
    })

    describe('groupBy', () => {
      it('should group array by field', () => {
        const data = [
          { action: 'login' },
          { action: 'login' },
          { action: 'logout' }
        ]

        const result = userService.groupBy(data, 'action')

        expect(result).toEqual({ login: 2, logout: 1 })
      })
    })

    describe('groupByTimePeriod', () => {
      it('should group by day', () => {
        const data = [
          { created_at: '2024-01-01T10:00:00Z' },
          { created_at: '2024-01-01T15:00:00Z' },
          { created_at: '2024-01-02T10:00:00Z' }
        ]

        const result = userService.groupByTimePeriod(data, 'day')

        expect(result).toEqual([
          { date: '2024-01-01', count: 2 },
          { date: '2024-01-02', count: 1 }
        ])
      })
    })
  })
})