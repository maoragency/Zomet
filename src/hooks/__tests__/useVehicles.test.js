import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVehicles, useVehicle, useUserVehicles } from '../useVehicles.js'
import vehicleService from '@/services/vehicles'
import { mockVehicle, mockUser } from '@/test/utils'

// Mock the vehicle service
vi.mock('@/services/vehicles', () => ({
  default: {
    list: vi.fn(),
    filter: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementViews: vi.fn(),
    getByUser: vi.fn()
  }
}))

describe('vehicle hooks', () => {
  const mockVehicles = [
    mockVehicle,
    { ...mockVehicle, id: 'vehicle-2', make: 'Honda', status: 'נמכר' },
    { ...mockVehicle, id: 'vehicle-3', make: 'BMW', status: 'ממתין לתשלום' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    vehicleService.list.mockResolvedValue(mockVehicles)
    vehicleService.filter.mockResolvedValue(mockVehicles)
    vehicleService.search.mockResolvedValue(mockVehicles)
    vehicleService.getById.mockResolvedValue(mockVehicle)
    vehicleService.update.mockResolvedValue(mockVehicle)
    vehicleService.delete.mockResolvedValue(true)
    vehicleService.incrementViews.mockResolvedValue()
    vehicleService.getByUser.mockResolvedValue(mockVehicles)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useVehicles', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVehicles({ autoLoad: false }))

      expect(result.current.vehicles).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.lastUpdated).toBeNull()
    })

    it('should auto-load vehicles on mount', async () => {
      const { result } = renderHook(() => useVehicles())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.vehicles).toEqual(mockVehicles)
      expect(result.current.lastUpdated).toBeInstanceOf(Date)
      expect(vehicleService.list).toHaveBeenCalledWith('-created_date', 100)
    })

    it('should load vehicles with custom options', async () => {
      const options = {
        sortBy: 'price',
        limit: 50,
        autoLoad: true
      }

      renderHook(() => useVehicles(options))

      await waitFor(() => {
        expect(vehicleService.list).toHaveBeenCalledWith('price', 50)
      })
    })

    it('should use filters when provided', async () => {
      const options = {
        filters: { make: 'Toyota', year: 2020 },
        autoLoad: true
      }

      renderHook(() => useVehicles(options))

      await waitFor(() => {
        expect(vehicleService.filter).toHaveBeenCalledWith({ make: 'Toyota', year: 2020 }, '-created_date')
      })
    })

    it('should handle loading error', async () => {
      const error = new Error('Failed to load vehicles')
      vehicleService.list.mockRejectedValue(error)

      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.vehicles).toEqual([])
    })

    it('should refresh vehicles', async () => {
      const { result } = renderHook(() => useVehicles({ autoLoad: false }))

      await act(async () => {
        await result.current.refresh()
      })

      expect(vehicleService.list).toHaveBeenCalled()
      expect(result.current.vehicles).toEqual(mockVehicles)
    })

    it('should search vehicles', async () => {
      const { result } = renderHook(() => useVehicles({ autoLoad: false }))

      const searchParams = { make: 'Toyota', priceRange: [20000, 30000] }

      await act(async () => {
        await result.current.searchVehicles(searchParams)
      })

      expect(vehicleService.search).toHaveBeenCalledWith(searchParams)
      expect(result.current.vehicles).toEqual(mockVehicles)
    })

    it('should handle search error', async () => {
      const error = new Error('Search failed')
      vehicleService.search.mockRejectedValue(error)

      const { result } = renderHook(() => useVehicles({ autoLoad: false }))

      await act(async () => {
        await expect(result.current.searchVehicles({})).rejects.toThrow('Search failed')
      })

      expect(result.current.error).toBe(error)
      expect(result.current.vehicles).toEqual([])
    })

    it('should add vehicle to list', () => {
      const { result } = renderHook(() => useVehicles({ autoLoad: false }))

      const newVehicle = { ...mockVehicle, id: 'new-vehicle' }

      act(() => {
        result.current.addVehicle(newVehicle)
      })

      expect(result.current.vehicles).toEqual([newVehicle])
    })

    it('should update vehicle in list', async () => {
      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      const updates = { price: 30000 }

      act(() => {
        result.current.updateVehicle(mockVehicle.id, updates)
      })

      const updatedVehicle = result.current.vehicles.find(v => v.id === mockVehicle.id)
      expect(updatedVehicle.price).toBe(30000)
    })

    it('should remove vehicle from list', async () => {
      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      act(() => {
        result.current.removeVehicle(mockVehicle.id)
      })

      expect(result.current.vehicles).not.toContainEqual(
        expect.objectContaining({ id: mockVehicle.id })
      )
    })

    it('should get vehicle by ID', async () => {
      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      const vehicle = result.current.getVehicleById(mockVehicle.id)
      expect(vehicle).toEqual(mockVehicle)
    })

    it('should calculate stats correctly', async () => {
      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      expect(result.current.stats).toEqual({
        total: 3,
        forSale: 1, // mockVehicle has status 'למכירה'
        sold: 1,    // vehicle-2 has status 'נמכר'
        pending: 1  // vehicle-3 has status 'ממתין לתשלום'
      })
    })

    it('should group vehicles by type', async () => {
      const vehiclesWithTypes = [
        { ...mockVehicle, type: 'sedan' },
        { ...mockVehicle, id: 'vehicle-2', type: 'suv' },
        { ...mockVehicle, id: 'vehicle-3', type: 'sedan' }
      ]

      vehicleService.list.mockResolvedValue(vehiclesWithTypes)

      const { result } = renderHook(() => useVehicles())

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(vehiclesWithTypes)
      })

      expect(result.current.vehiclesByType).toEqual({
        sedan: [vehiclesWithTypes[0], vehiclesWithTypes[2]],
        suv: [vehiclesWithTypes[1]]
      })
    })
  })

  describe('useVehicle', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVehicle())

      expect(result.current.vehicle).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load vehicle by ID', async () => {
      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.vehicle).toEqual(mockVehicle)
      expect(vehicleService.getById).toHaveBeenCalledWith(mockVehicle.id)
    })

    it('should handle loading error', async () => {
      const error = new Error('Vehicle not found')
      vehicleService.getById.mockRejectedValue(error)

      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.vehicle).toBeNull()
    })

    it('should update vehicle', async () => {
      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(mockVehicle)
      })

      const updates = { price: 30000 }
      const updatedVehicle = { ...mockVehicle, ...updates }
      vehicleService.update.mockResolvedValue(updatedVehicle)

      let updateResult
      await act(async () => {
        updateResult = await result.current.updateVehicle(updates)
      })

      expect(vehicleService.update).toHaveBeenCalledWith(mockVehicle.id, updates)
      expect(result.current.vehicle).toEqual(updatedVehicle)
      expect(updateResult).toEqual(updatedVehicle)
    })

    it('should delete vehicle', async () => {
      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(mockVehicle)
      })

      let deleteResult
      await act(async () => {
        deleteResult = await result.current.deleteVehicle()
      })

      expect(vehicleService.delete).toHaveBeenCalledWith(mockVehicle.id)
      expect(result.current.vehicle).toBeNull()
      expect(deleteResult).toBe(true)
    })

    it('should increment views', async () => {
      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(mockVehicle)
      })

      await act(async () => {
        await result.current.incrementViews()
      })

      expect(vehicleService.incrementViews).toHaveBeenCalledWith(mockVehicle.id)
      expect(result.current.vehicle.views_count).toBe(1) // 0 + 1
    })

    it('should handle increment views error gracefully', async () => {
      const error = new Error('Increment failed')
      vehicleService.incrementViews.mockRejectedValue(error)

      const { result } = renderHook(() => useVehicle(mockVehicle.id))

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(mockVehicle)
      })

      // Should not throw error
      await act(async () => {
        await result.current.incrementViews()
      })

      expect(vehicleService.incrementViews).toHaveBeenCalledWith(mockVehicle.id)
    })

    it('should not load vehicle when no ID provided', () => {
      renderHook(() => useVehicle(null))

      expect(vehicleService.getById).not.toHaveBeenCalled()
    })

    it('should reload when vehicle ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ vehicleId }) => useVehicle(vehicleId),
        { initialProps: { vehicleId: mockVehicle.id } }
      )

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(mockVehicle)
      })

      expect(vehicleService.getById).toHaveBeenCalledTimes(1)

      // Change vehicle ID
      const newVehicleId = 'new-vehicle-id'
      const newVehicle = { ...mockVehicle, id: newVehicleId }
      vehicleService.getById.mockResolvedValue(newVehicle)

      rerender({ vehicleId: newVehicleId })

      await waitFor(() => {
        expect(result.current.vehicle).toEqual(newVehicle)
      })

      expect(vehicleService.getById).toHaveBeenCalledTimes(2)
      expect(vehicleService.getById).toHaveBeenLastCalledWith(newVehicleId)
    })
  })

  describe('useUserVehicles', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useUserVehicles())

      expect(result.current.vehicles).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load user vehicles', async () => {
      const { result } = renderHook(() => useUserVehicles(mockUser.email))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.vehicles).toEqual(mockVehicles)
      expect(vehicleService.getByUser).toHaveBeenCalledWith(mockUser.email)
    })

    it('should handle loading error', async () => {
      const error = new Error('Failed to load user vehicles')
      vehicleService.getByUser.mockRejectedValue(error)

      const { result } = renderHook(() => useUserVehicles(mockUser.email))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.vehicles).toEqual([])
    })

    it('should refresh user vehicles', async () => {
      const { result } = renderHook(() => useUserVehicles(mockUser.email))

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(vehicleService.getByUser).toHaveBeenCalledTimes(2)
    })

    it('should not load when no email provided', () => {
      renderHook(() => useUserVehicles(null))

      expect(vehicleService.getByUser).not.toHaveBeenCalled()
    })

    it('should reload when email changes', async () => {
      const { result, rerender } = renderHook(
        ({ userEmail }) => useUserVehicles(userEmail),
        { initialProps: { userEmail: mockUser.email } }
      )

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })

      expect(vehicleService.getByUser).toHaveBeenCalledTimes(1)

      // Change user email
      const newEmail = 'newuser@example.com'
      rerender({ userEmail: newEmail })

      await waitFor(() => {
        expect(vehicleService.getByUser).toHaveBeenCalledWith(newEmail)
      })

      expect(vehicleService.getByUser).toHaveBeenCalledTimes(2)
    })
  })
})