import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vehicleService } from '../vehicles.js'
import { supabase } from '@/lib/supabase'
import { mockUser, mockVehicle, mockPromotion, mockSupabaseResponse } from '@/test/utils'

// Mock the supabase module
vi.mock('@/lib/supabase')

// Mock error handler utilities
vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn((error, context) => ({ success: false, error, context })),
  logError: vi.fn(),
  validateRequiredFields: vi.fn(() => true),
  sanitizeInput: vi.fn((input) => input),
  createSuccessResponse: vi.fn((data, message) => ({ success: true, data, message }))
}))

describe('vehicleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('list', () => {
    it('should list vehicles with default sorting', async () => {
      const mockVehicles = [mockVehicle, { ...mockVehicle, id: 'vehicle-2' }]
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
          })
        })
      })

      const result = await vehicleService.list()

      expect(result).toEqual(mockVehicles)
      expect(supabase.from).toHaveBeenCalledWith('vehicles')
    })

    it('should handle custom sorting', async () => {
      const mockVehicles = [mockVehicle]
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
          })
        })
      })

      const result = await vehicleService.list('price', 50)

      expect(result).toEqual(mockVehicles)
    })

    it('should handle list error', async () => {
      const listError = new Error('Database error')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: listError })
          })
        })
      })

      await expect(vehicleService.list()).rejects.toThrow('Database error')
    })
  })

  describe('filter', () => {
    it('should filter vehicles by criteria', async () => {
      const mockVehicles = [mockVehicle]
      const filters = { make: 'Toyota', year: 2020 }
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
        })
      })

      const result = await vehicleService.filter(filters)

      expect(result).toEqual(mockVehicles)
    })

    it('should handle empty filters', async () => {
      const mockVehicles = [mockVehicle]
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
      })

      const result = await vehicleService.filter({})

      expect(result).toEqual(mockVehicles)
    })
  })

  describe('getById', () => {
    it('should get vehicle by ID successfully', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null })
          })
        })
      })

      const result = await vehicleService.getById(mockVehicle.id)

      expect(result).toEqual(mockVehicle)
    })

    it('should handle vehicle not found', async () => {
      const notFoundError = new Error('Vehicle not found')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: notFoundError })
          })
        })
      })

      await expect(vehicleService.getById('invalid-id')).rejects.toThrow('Vehicle not found')
    })
  })

  describe('create', () => {
    it('should create vehicle successfully', async () => {
      const vehicleData = {
        title: 'Test Vehicle',
        description: 'Test description',
        contact_name: 'Test User',
        contact_phone: '0501234567',
        price: 25000
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null })
          })
        })
      })

      const result = await vehicleService.create(vehicleData)

      expect(result).toEqual(mockVehicle)
      expect(supabase.from).toHaveBeenCalledWith('vehicles')
    })

    it('should handle unauthenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(vehicleService.create({})).rejects.toThrow('User must be authenticated')
    })

    it('should handle create error', async () => {
      const createError = new Error('Create failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: createError })
          })
        })
      })

      await expect(vehicleService.create({})).rejects.toThrow('Create failed')
    })
  })

  describe('update', () => {
    it('should update vehicle successfully', async () => {
      const updates = { price: 30000, description: 'Updated description' }
      const updatedVehicle = { ...mockVehicle, ...updates }

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedVehicle, error: null })
            })
          })
        })
      })

      const result = await vehicleService.update(mockVehicle.id, updates)

      expect(result).toEqual(updatedVehicle)
    })

    it('should handle update error', async () => {
      const updateError = new Error('Update failed')
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: updateError })
            })
          })
        })
      })

      await expect(vehicleService.update(mockVehicle.id, {})).rejects.toThrow('Update failed')
    })
  })

  describe('delete', () => {
    it('should delete vehicle successfully', async () => {
      supabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await vehicleService.delete(mockVehicle.id)

      expect(result).toBe(true)
    })

    it('should handle delete error', async () => {
      const deleteError = new Error('Delete failed')
      supabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: deleteError })
        })
      })

      await expect(vehicleService.delete(mockVehicle.id)).rejects.toThrow('Delete failed')
    })
  })

  describe('incrementViews', () => {
    it('should increment views successfully', async () => {
      supabase.rpc.mockResolvedValue({ error: null })

      await vehicleService.incrementViews(mockVehicle.id)

      expect(supabase.rpc).toHaveBeenCalledWith('increment_vehicle_views', {
        vehicle_id: mockVehicle.id
      })
    })

    it('should handle increment views error gracefully', async () => {
      const incrementError = new Error('Increment failed')
      supabase.rpc.mockResolvedValue({ error: incrementError })

      // Should not throw error
      await expect(vehicleService.incrementViews(mockVehicle.id)).resolves.toBeUndefined()
    })
  })

  describe('search', () => {
    it('should search vehicles with basic parameters', async () => {
      const mockVehicles = [mockVehicle]
      const searchParams = {
        category: 'sedan',
        manufacturer: 'Toyota',
        location: 'תל אביב'
      }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
        })
      })

      const result = await vehicleService.search(searchParams)

      expect(result).toEqual(mockVehicles)
    })

    it('should handle regional search', async () => {
      const mockVehicles = [mockVehicle]
      const searchParams = { location: 'מרכז' }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
          })
        })
      })

      const result = await vehicleService.search(searchParams)

      expect(result).toEqual(mockVehicles)
    })

    it('should handle range filters', async () => {
      const mockVehicles = [mockVehicle]
      const searchParams = {
        yearRange: [2018, 2022],
        priceRange: [20000, 30000],
        kilometersRange: [0, 100000]
      }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
        })
      })

      const result = await vehicleService.search(searchParams)

      expect(result).toEqual(mockVehicles)
    })

    it('should handle electric vehicle search', async () => {
      const mockVehicles = [mockVehicle]
      const searchParams = { manufacturer: 'חשמלי' }

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null })
          })
        })
      })

      const result = await vehicleService.search(searchParams)

      expect(result).toEqual(mockVehicles)
    })
  })

  describe('getByUser', () => {
    it('should get vehicles by user ID', async () => {
      const mockVehiclesWithPromotions = [{
        ...mockVehicle,
        promotions: [mockPromotion]
      }]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVehiclesWithPromotions, error: null })
          })
        })
      })

      const result = await vehicleService.getByUser(mockUser.id)

      expect(result[0]).toHaveProperty('active_promotions')
      expect(result[0]).toHaveProperty('has_active_promotion')
      expect(result[0].has_active_promotion).toBe(true)
    })

    it('should handle user email lookup', async () => {
      const mockVehiclesWithPromotions = [{ ...mockVehicle, promotions: [] }]

      // Mock user lookup by email
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: mockUser.id }, error: null })
          })
        })
      })

      // Mock vehicles query
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVehiclesWithPromotions, error: null })
          })
        })
      })

      const result = await vehicleService.getByUser(mockUser.email)

      expect(result[0]).toHaveProperty('active_promotions')
      expect(result[0].has_active_promotion).toBe(false)
    })

    it('should handle user lookup error', async () => {
      const userError = new Error('User not found')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: userError })
          })
        })
      })

      await expect(vehicleService.getByUser('invalid@email.com')).rejects.toThrow('User not found')
    })
  })

  describe('getVehiclesWithPromotions', () => {
    it('should get vehicles with promotion data', async () => {
      const mockVehiclesWithPromotions = [{
        ...mockVehicle,
        promotions: [mockPromotion]
      }]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ 
              data: mockVehiclesWithPromotions, 
              error: null, 
              count: 1 
            })
          })
        })
      })

      const result = await vehicleService.getVehiclesWithPromotions()

      expect(result.success).toBe(true)
      expect(result.data.vehicles[0]).toHaveProperty('active_promotions')
      expect(result.data.vehicles[0]).toHaveProperty('has_active_promotion')
      expect(result.data.pagination.total).toBe(1)
    })

    it('should filter by promotion type', async () => {
      const mockVehiclesWithPromotions = [{
        ...mockVehicle,
        promotions: [{ ...mockPromotion, promotion_type: 'featured' }]
      }]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ 
              data: mockVehiclesWithPromotions, 
              error: null, 
              count: 1 
            })
          })
        })
      })

      const result = await vehicleService.getVehiclesWithPromotions({
        promotionType: 'featured'
      })

      expect(result.success).toBe(true)
      expect(result.data.vehicles).toHaveLength(1)
    })
  })

  describe('getPromotedVehicles', () => {
    it('should get promoted vehicles for homepage', async () => {
      const mockPromotedVehicles = [{
        ...mockVehicle,
        promotions: [{ ...mockPromotion, promotion_type: 'premium' }]
      }]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockPromotedVehicles, error: null })
            })
          })
        })
      })

      const result = await vehicleService.getPromotedVehicles()

      expect(result.success).toBe(true)
      expect(result.data[0]).toHaveProperty('promotion_priority')
      expect(result.data[0]).toHaveProperty('promotion_type')
    })

    it('should filter by promotion type', async () => {
      const mockPromotedVehicles = [{
        ...mockVehicle,
        promotions: [{ ...mockPromotion, promotion_type: 'featured' }]
      }]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockPromotedVehicles, error: null })
            })
          })
        })
      })

      const result = await vehicleService.getPromotedVehicles({ promotionType: 'featured' })

      expect(result.success).toBe(true)
      expect(result.data[0].promotion_type).toBe('featured')
    })
  })

  describe('getVehicleAnalytics', () => {
    it('should get vehicle analytics for owner', async () => {
      const vehicleWithPromotions = {
        ...mockVehicle,
        created_by: mockUser.id,
        views: 100,
        contact_clicks: 10,
        promotions: [mockPromotion]
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: vehicleWithPromotions, error: null })
          })
        })
      })

      // Mock helper methods
      vi.spyOn(vehicleService, 'calculatePerformanceTrend').mockReturnValue('good')
      vi.spyOn(vehicleService, 'calculatePromotionEffectiveness').mockReturnValue({
        cost_per_view: 0.5,
        cost_per_contact: 5,
        roi_estimate: 50
      })
      vi.spyOn(vehicleService, 'generateVehicleRecommendations').mockReturnValue([])

      const result = await vehicleService.getVehicleAnalytics(mockVehicle.id)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('basic_info')
      expect(result.data).toHaveProperty('performance')
      expect(result.data).toHaveProperty('promotions')
      expect(result.data).toHaveProperty('insights')
      expect(result.data.performance.total_views).toBe(100)
      expect(result.data.performance.total_contacts).toBe(10)
    })

    it('should deny access for non-owner non-admin', async () => {
      const otherUserVehicle = { ...mockVehicle, created_by: 'other-user-id' }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: otherUserVehicle, error: null })
          })
        })
      })

      // Mock checkAdminPermission
      vi.spyOn(vehicleService, 'checkAdminPermission').mockResolvedValue(false)

      const result = await vehicleService.getVehicleAnalytics(mockVehicle.id)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('אין לך הרשאה')
    })
  })

  describe('bulkUpdateVehicleStatus', () => {
    it('should bulk update vehicle status for admin', async () => {
      const vehicleIds = [mockVehicle.id, 'vehicle-2']
      const updatedVehicles = [
        { ...mockVehicle, status: 'approved' },
        { id: 'vehicle-2', status: 'approved' }
      ]

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(vehicleService, 'checkAdminPermission').mockResolvedValue(true)
      
      // Mock logActivity
      vi.spyOn(vehicleService, 'logActivity').mockResolvedValue()

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: updatedVehicles, error: null })
          })
        })
      })

      const result = await vehicleService.bulkUpdateVehicleStatus(vehicleIds, 'approved')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedVehicles)
    })

    it('should deny access for non-admin', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Mock checkAdminPermission
      vi.spyOn(vehicleService, 'checkAdminPermission').mockResolvedValue(false)

      const result = await vehicleService.bulkUpdateVehicleStatus([mockVehicle.id], 'approved')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('אין לך הרשאה')
    })
  })

  describe('helper methods', () => {
    describe('getPromotionPriority', () => {
      it('should return correct priority for promotion types', () => {
        expect(vehicleService.getPromotionPriority('premium')).toBe(3)
        expect(vehicleService.getPromotionPriority('top')).toBe(2)
        expect(vehicleService.getPromotionPriority('featured')).toBe(1)
        expect(vehicleService.getPromotionPriority('unknown')).toBe(0)
      })
    })

    describe('calculatePerformanceTrend', () => {
      it('should calculate performance trend correctly', () => {
        const excellentVehicle = { 
          ...mockVehicle, 
          views: 500, 
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        }
        
        const result = vehicleService.calculatePerformanceTrend(excellentVehicle)
        expect(result).toBe('excellent')

        const poorVehicle = { 
          ...mockVehicle, 
          views: 5, 
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        }
        
        const poorResult = vehicleService.calculatePerformanceTrend(poorVehicle)
        expect(poorResult).toBe('below_average')
      })
    })

    describe('calculatePromotionEffectiveness', () => {
      it('should calculate promotion effectiveness', () => {
        const vehicleWithPromotions = {
          ...mockVehicle,
          views: 100,
          contact_clicks: 10,
          price: 25000,
          promotions: [
            { ...mockPromotion, payment_status: 'paid', price: 50 },
            { ...mockPromotion, payment_status: 'paid', price: 100 }
          ]
        }

        const result = vehicleService.calculatePromotionEffectiveness(vehicleWithPromotions)

        expect(result.cost_per_view).toBe(1.5) // 150 / 100
        expect(result.cost_per_contact).toBe(15) // 150 / 10
        expect(result).toHaveProperty('roi_estimate')
      })

      it('should return null for no promotions', () => {
        const vehicleWithoutPromotions = { ...mockVehicle, promotions: [] }
        
        const result = vehicleService.calculatePromotionEffectiveness(vehicleWithoutPromotions)
        
        expect(result).toBeNull()
      })
    })

    describe('generateVehicleRecommendations', () => {
      it('should recommend promotion for low-view vehicle', () => {
        const lowViewVehicle = {
          ...mockVehicle,
          views: 20,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          promotions: []
        }

        const result = vehicleService.generateVehicleRecommendations(lowViewVehicle)

        expect(result).toContainEqual(
          expect.objectContaining({
            type: 'promotion',
            priority: 'high',
            action: 'create_promotion'
          })
        )
      })

      it('should recommend content update for old vehicle', () => {
        const oldVehicle = {
          ...mockVehicle,
          views: 30,
          created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
          promotions: []
        }

        const result = vehicleService.generateVehicleRecommendations(oldVehicle)

        expect(result).toContainEqual(
          expect.objectContaining({
            type: 'content',
            priority: 'medium',
            action: 'update_content'
          })
        )
      })

      it('should recommend pricing review for high views no contacts', () => {
        const highViewNoContactVehicle = {
          ...mockVehicle,
          views: 50,
          contact_clicks: 0,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          promotions: []
        }

        const result = vehicleService.generateVehicleRecommendations(highViewNoContactVehicle)

        expect(result).toContainEqual(
          expect.objectContaining({
            type: 'pricing',
            priority: 'medium',
            action: 'review_pricing'
          })
        )
      })
    })

    describe('checkAdminPermission', () => {
      it('should return true for system admin email', async () => {
        const systemAdmin = { ...mockUser, email: 'zometauto@gmail.com' }
        const result = await vehicleService.checkAdminPermission(systemAdmin)

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

        const result = await vehicleService.checkAdminPermission(mockUser)

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

        const result = await vehicleService.checkAdminPermission(mockUser)

        expect(result).toBe(false)
      })
    })
  })
})