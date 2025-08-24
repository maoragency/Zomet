import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { vehicleService } from '../../vehicles.js'
import { authService } from '../../auth.js'
import { supabase } from '@/lib/supabase'

// Integration tests for vehicle service with real Supabase
describe('Vehicle Service Integration Tests', () => {
  let testUser = null
  let testVehicle = null
  const testEmail = `vehicle-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    // Create test user for vehicle operations
    await supabase.auth.signOut()
    const signUpResult = await authService.signUp(testEmail, testPassword, {
      full_name: 'Vehicle Test User'
    })
    testUser = signUpResult.user
    
    // Sign in the test user
    await authService.signIn(testEmail, testPassword)
  }, 15000)

  afterAll(async () => {
    // Clean up test data
    if (testVehicle) {
      try {
        await vehicleService.delete(testVehicle.id)
      } catch (error) {
        console.warn('Vehicle cleanup error:', error)
      }
    }
    
    // Sign out
    await supabase.auth.signOut()
  })

  beforeEach(async () => {
    // Ensure user is signed in for each test
    const { session } = await authService.getCurrentSession()
    if (!session) {
      await authService.signIn(testEmail, testPassword)
    }
  })

  describe('Vehicle Creation', () => {
    it('should create a new vehicle successfully', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        mileage: 50000,
        fuel_type: 'gasoline',
        transmission: 'automatic',
        color: 'white',
        description: 'Test vehicle for integration testing',
        contact_name: 'Test User',
        contact_phone: '0501234567',
        status: 'למכירה'
      }

      const result = await vehicleService.create(vehicleData)

      expect(result).toBeTruthy()
      expect(result.make).toBe(vehicleData.make)
      expect(result.model).toBe(vehicleData.model)
      expect(result.year).toBe(vehicleData.year)
      expect(result.price).toBe(vehicleData.price)
      expect(result.created_by).toBe(testUser.id)
      
      testVehicle = result
    }, 10000)

    it('should require authentication for vehicle creation', async () => {
      // Sign out first
      await supabase.auth.signOut()

      const vehicleData = {
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        price: 22000
      }

      await expect(vehicleService.create(vehicleData)).rejects.toThrow()

      // Sign back in for other tests
      await authService.signIn(testEmail, testPassword)
    })
  })

  describe('Vehicle Retrieval', () => {
    beforeEach(async () => {
      // Ensure we have a test vehicle
      if (!testVehicle) {
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'Test vehicle',
          contact_name: 'Test User',
          contact_phone: '0501234567'
        }
        testVehicle = await vehicleService.create(vehicleData)
      }
    })

    it('should list all vehicles', async () => {
      const vehicles = await vehicleService.list()

      expect(Array.isArray(vehicles)).toBe(true)
      expect(vehicles.length).toBeGreaterThan(0)
      
      // Find our test vehicle
      const foundVehicle = vehicles.find(v => v.id === testVehicle.id)
      expect(foundVehicle).toBeTruthy()
    })

    it('should get vehicle by ID', async () => {
      const vehicle = await vehicleService.getById(testVehicle.id)

      expect(vehicle).toBeTruthy()
      expect(vehicle.id).toBe(testVehicle.id)
      expect(vehicle.make).toBe(testVehicle.make)
      expect(vehicle.model).toBe(testVehicle.model)
    })

    it('should handle non-existent vehicle ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      
      await expect(vehicleService.getById(fakeId)).rejects.toThrow()
    })

    it('should get vehicles by user', async () => {
      const vehicles = await vehicleService.getByUser(testUser.id)

      expect(Array.isArray(vehicles)).toBe(true)
      expect(vehicles.length).toBeGreaterThan(0)
      
      // All vehicles should belong to the test user
      vehicles.forEach(vehicle => {
        expect(vehicle.created_by).toBe(testUser.id)
      })
    })
  })

  describe('Vehicle Search and Filtering', () => {
    beforeEach(async () => {
      if (!testVehicle) {
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'Test vehicle',
          contact_name: 'Test User',
          contact_phone: '0501234567'
        }
        testVehicle = await vehicleService.create(vehicleData)
      }
    })

    it('should filter vehicles by criteria', async () => {
      const filters = {
        make: 'Toyota'
      }

      const vehicles = await vehicleService.filter(filters)

      expect(Array.isArray(vehicles)).toBe(true)
      vehicles.forEach(vehicle => {
        expect(vehicle.make).toBe('Toyota')
      })
    })

    it('should search vehicles with advanced parameters', async () => {
      const searchParams = {
        manufacturer: 'Toyota',
        yearRange: [2018, 2022],
        priceRange: [20000, 30000]
      }

      const vehicles = await vehicleService.search(searchParams)

      expect(Array.isArray(vehicles)).toBe(true)
      // Should find our test vehicle if it matches criteria
      const foundVehicle = vehicles.find(v => v.id === testVehicle.id)
      if (foundVehicle) {
        expect(foundVehicle.make).toBe('Toyota')
        expect(foundVehicle.year).toBeGreaterThanOrEqual(2018)
        expect(foundVehicle.year).toBeLessThanOrEqual(2022)
        expect(foundVehicle.price).toBeGreaterThanOrEqual(20000)
        expect(foundVehicle.price).toBeLessThanOrEqual(30000)
      }
    })

    it('should return empty results for non-matching criteria', async () => {
      const searchParams = {
        manufacturer: 'NonExistentBrand',
        yearRange: [1900, 1910]
      }

      const vehicles = await vehicleService.search(searchParams)

      expect(Array.isArray(vehicles)).toBe(true)
      expect(vehicles.length).toBe(0)
    })
  })

  describe('Vehicle Updates', () => {
    beforeEach(async () => {
      if (!testVehicle) {
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'Test vehicle',
          contact_name: 'Test User',
          contact_phone: '0501234567'
        }
        testVehicle = await vehicleService.create(vehicleData)
      }
    })

    it('should update vehicle successfully', async () => {
      const updates = {
        price: 23000,
        description: 'Updated test vehicle description',
        mileage: 55000
      }

      const updatedVehicle = await vehicleService.update(testVehicle.id, updates)

      expect(updatedVehicle).toBeTruthy()
      expect(updatedVehicle.id).toBe(testVehicle.id)
      expect(updatedVehicle.price).toBe(updates.price)
      expect(updatedVehicle.description).toBe(updates.description)
      expect(updatedVehicle.mileage).toBe(updates.mileage)
      
      // Update our test vehicle reference
      testVehicle = updatedVehicle
    })

    it('should handle partial updates', async () => {
      const originalPrice = testVehicle.price
      const updates = {
        description: 'Only description updated'
      }

      const updatedVehicle = await vehicleService.update(testVehicle.id, updates)

      expect(updatedVehicle.description).toBe(updates.description)
      expect(updatedVehicle.price).toBe(originalPrice) // Should remain unchanged
      expect(updatedVehicle.make).toBe(testVehicle.make) // Should remain unchanged
    })

    it('should handle non-existent vehicle update', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const updates = { price: 30000 }

      await expect(vehicleService.update(fakeId, updates)).rejects.toThrow()
    })
  })

  describe('Vehicle Views and Analytics', () => {
    beforeEach(async () => {
      if (!testVehicle) {
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'Test vehicle',
          contact_name: 'Test User',
          contact_phone: '0501234567'
        }
        testVehicle = await vehicleService.create(vehicleData)
      }
    })

    it('should increment vehicle views', async () => {
      // Get initial view count
      const initialVehicle = await vehicleService.getById(testVehicle.id)
      const initialViews = initialVehicle.views || 0

      // Increment views
      await vehicleService.incrementViews(testVehicle.id)

      // Check if views increased
      const updatedVehicle = await vehicleService.getById(testVehicle.id)
      expect(updatedVehicle.views).toBe(initialViews + 1)
    })

    it('should handle multiple view increments', async () => {
      const initialVehicle = await vehicleService.getById(testVehicle.id)
      const initialViews = initialVehicle.views || 0

      // Increment views multiple times
      await vehicleService.incrementViews(testVehicle.id)
      await vehicleService.incrementViews(testVehicle.id)
      await vehicleService.incrementViews(testVehicle.id)

      const updatedVehicle = await vehicleService.getById(testVehicle.id)
      expect(updatedVehicle.views).toBe(initialViews + 3)
    })
  })

  describe('Vehicle Deletion', () => {
    it('should delete vehicle successfully', async () => {
      // Create a vehicle specifically for deletion test
      const vehicleData = {
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        price: 20000,
        mileage: 60000,
        description: 'Vehicle to be deleted',
        contact_name: 'Test User',
        contact_phone: '0501234567'
      }

      const vehicleToDelete = await vehicleService.create(vehicleData)
      expect(vehicleToDelete).toBeTruthy()

      // Delete the vehicle
      const deleteResult = await vehicleService.delete(vehicleToDelete.id)
      expect(deleteResult).toBe(true)

      // Verify vehicle is deleted
      await expect(vehicleService.getById(vehicleToDelete.id)).rejects.toThrow()
    })

    it('should handle non-existent vehicle deletion', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      
      await expect(vehicleService.delete(fakeId)).rejects.toThrow()
    })
  })

  describe('Vehicle Sorting and Pagination', () => {
    beforeEach(async () => {
      // Ensure we have multiple test vehicles for sorting tests
      if (!testVehicle) {
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'Test vehicle',
          contact_name: 'Test User',
          contact_phone: '0501234567'
        }
        testVehicle = await vehicleService.create(vehicleData)
      }
    })

    it('should sort vehicles by price ascending', async () => {
      const vehicles = await vehicleService.list('price', 10)

      expect(Array.isArray(vehicles)).toBe(true)
      
      if (vehicles.length > 1) {
        for (let i = 1; i < vehicles.length; i++) {
          expect(vehicles[i].price).toBeGreaterThanOrEqual(vehicles[i - 1].price)
        }
      }
    })

    it('should sort vehicles by creation date descending', async () => {
      const vehicles = await vehicleService.list('-created_at', 10)

      expect(Array.isArray(vehicles)).toBe(true)
      
      if (vehicles.length > 1) {
        for (let i = 1; i < vehicles.length; i++) {
          const currentDate = new Date(vehicles[i].created_at)
          const previousDate = new Date(vehicles[i - 1].created_at)
          expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime())
        }
      }
    })

    it('should limit results correctly', async () => {
      const limit = 3
      const vehicles = await vehicleService.list('-created_at', limit)

      expect(Array.isArray(vehicles)).toBe(true)
      expect(vehicles.length).toBeLessThanOrEqual(limit)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, test with invalid data
      const invalidVehicleData = {
        // Missing required fields
        make: '',
        model: '',
        year: 'invalid',
        price: 'not-a-number'
      }

      await expect(vehicleService.create(invalidVehicleData)).rejects.toThrow()
    })

    it('should handle unauthorized access', async () => {
      // Sign out to test unauthorized access
      await supabase.auth.signOut()

      await expect(vehicleService.create({
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000
      })).rejects.toThrow()

      // Sign back in
      await authService.signIn(testEmail, testPassword)
    })
  })
})