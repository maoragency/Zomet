/**
 * Database Services Test Suite
 * Tests all database service operations and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { vehicleService } from '../vehicles'
import { userService } from '../users'
import { buyerRequestService } from '../buyerRequests'
import { pricingPlanService } from '../pricingPlans'
import { db, healthCheck } from '../index'
import { handleApiError, validateRequiredFields } from '../../utils/errorHandler'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [mockVehicle], error: null }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockVehicle, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockVehicle, error: null }))
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [mockVehicle], error: null }))
        })),
        limit: vi.fn(() => Promise.resolve({ data: [mockVehicle], error: null }))
      }))
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null 
      }))
    }
  }
}))

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '0501234567',
  created_at: '2024-01-01T00:00:00Z'
}

const mockVehicle = {
  id: 'test-vehicle-id',
  title: 'Test Vehicle',
  type: 'רכב פרטי',
  manufacturer: 'טויוטה',
  model: 'קורולה',
  year: 2020,
  price: 100000,
  contact_name: 'Test Contact',
  contact_phone: '0501234567',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z'
}

const mockBuyerRequest = {
  id: 'test-request-id',
  title: 'Looking for Toyota',
  description: 'Need a reliable car',
  budget_min: 50000,
  budget_max: 150000,
  contact_name: 'Test Buyer',
  contact_phone: '0501234567',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z'
}

const mockPricingPlan = {
  id: 'test-plan-id',
  name: 'Basic Plan',
  price: 0,
  features: ['Basic listing', 'Contact info'],
  duration_days: 30,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z'
}

describe('Database Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Vehicle Service', () => {
    it('should list vehicles successfully', async () => {
      const result = await vehicleService.list()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual([mockVehicle])
    })

    it('should create a vehicle successfully', async () => {
      const vehicleData = {
        title: 'New Vehicle',
        type: 'רכב פרטי',
        manufacturer: 'טויוטה',
        model: 'קורולה',
        year: 2023,
        price: 120000,
        contact_name: 'Test Contact',
        contact_phone: '0501234567'
      }

      const result = await vehicleService.create(vehicleData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockVehicle)
      expect(result.message).toBe('רכב נוסף בהצלחה')
    })

    it('should validate required fields when creating vehicle', async () => {
      const incompleteData = {
        title: 'Test Vehicle'
        // Missing required fields
      }

      const result = await vehicleService.create(incompleteData)
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('validation_error')
    })

    it('should handle search with filters', async () => {
      const searchParams = {
        category: 'רכב פרטי',
        manufacturer: 'טויוטה',
        priceRange: [50000, 150000]
      }

      const result = await vehicleService.search(searchParams)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual([mockVehicle])
    })
  })

  describe('User Service', () => {
    it('should get current user profile', async () => {
      const result = await userService.me()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUser)
    })

    it('should update user profile successfully', async () => {
      const updates = {
        full_name: 'Updated Name',
        phone: '0507654321'
      }

      const result = await userService.updateProfile(updates)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('פרופיל עודכן בהצלחה')
    })

    it('should validate email format when updating profile', async () => {
      const updates = {
        email: 'invalid-email'
      }

      const result = await userService.updateProfile(updates)
      
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid email format')
    })
  })

  describe('Buyer Request Service', () => {
    it('should create buyer request successfully', async () => {
      const requestData = {
        title: 'Looking for car',
        description: 'Need reliable vehicle',
        budget_min: 50000,
        budget_max: 100000,
        contact_name: 'Test Buyer',
        contact_phone: '0501234567'
      }

      const result = await buyerRequestService.create(requestData)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('בקשת קונה נוספה בהצלחה')
    })

    it('should list buyer requests with filters', async () => {
      const filters = { status: 'פעיל' }
      
      const result = await buyerRequestService.filter(filters)
      
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('Pricing Plan Service', () => {
    it('should list active pricing plans', async () => {
      const result = await pricingPlanService.list(true)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual([mockVehicle]) // Mock returns vehicle data
    })

    it('should create pricing plan successfully', async () => {
      const planData = {
        name: 'Premium Plan',
        price: 99,
        features: ['Premium listing', 'Priority support'],
        duration_days: 30
      }

      const result = await pricingPlanService.create(planData)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('תוכנית תמחור נוספה בהצלחה')
    })
  })

  describe('Database Index', () => {
    it('should export all services correctly', () => {
      expect(db.vehicles).toBeDefined()
      expect(db.users).toBeDefined()
      expect(db.buyerRequests).toBeDefined()
      expect(db.pricingPlans).toBeDefined()
      expect(db.auth).toBeDefined()
      expect(db.storage).toBeDefined()
    })

    it('should perform health check', async () => {
      const result = await healthCheck()
      
      expect(result.success).toBe(true)
      expect(result.data.status).toBe('healthy')
      expect(result.data.database).toBe('connected')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors correctly', () => {
      const error = new Error('Test error')
      error.code = 'PGRST116'
      
      const result = handleApiError(error, 'test context')
      
      expect(result.success).toBe(false)
      expect(result.error.message).toBe('רשומה לא נמצאה')
      expect(result.error.context).toBe('test context')
    })

    it('should validate required fields', () => {
      const data = { title: 'Test' }
      const requiredFields = ['title', 'price', 'contact_name']
      
      const result = validateRequiredFields(data, requiredFields)
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('validation_error')
      expect(result.error.fields.price).toBeDefined()
      expect(result.error.fields.contact_name).toBeDefined()
    })
  })
})

describe('Error Handler Utilities', () => {
  it('should handle authentication errors', () => {
    const error = new Error('Invalid login credentials')
    const result = handleApiError(error)
    
    expect(result.success).toBe(false)
    expect(result.error.message).toBe('פרטי התחברות שגויים')
    expect(result.error.code).toBe('invalid_credentials')
  })

  it('should handle database constraint errors', () => {
    const error = new Error('Duplicate key')
    error.code = '23505'
    
    const result = handleApiError(error)
    
    expect(result.success).toBe(false)
    expect(result.error.message).toBe('הנתונים כבר קיימים במערכת')
    expect(result.error.code).toBe('23505')
  })

  it('should handle network errors', () => {
    const error = new Error('Network error')
    error.name = 'NetworkError'
    
    const result = handleApiError(error)
    
    expect(result.success).toBe(false)
    expect(result.error.message).toBe('בעיית חיבור לאינטרנט')
    expect(result.error.code).toBe('network_error')
  })

  it('should provide default error message for unknown errors', () => {
    const error = new Error('Unknown error')
    
    const result = handleApiError(error)
    
    expect(result.success).toBe(false)
    expect(result.error.message).toBe('אירעה שגיאה לא צפויה. אנא נסה שוב.')
    expect(result.error.code).toBe('unknown_error')
  })
})