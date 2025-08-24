import { useState, useEffect, useCallback, useMemo } from 'react'
import vehicleService from '@/services/vehicles'

/**
 * useVehicles Hook
 * Provides vehicle data fetching, caching, and management
 */
export function useVehicles(options = {}) {
  const {
    sortBy = '-created_date',
    limit = 100,
    autoLoad = true,
    filters = {}
  } = options

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  /**
   * Load vehicles with current options
   */
  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let data
      if (Object.keys(filters).length > 0) {
        data = await vehicleService.filter(filters, sortBy)
      } else {
        data = await vehicleService.list(sortBy, limit)
      }

      setVehicles(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading vehicles:', err)
      setError(err)
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [sortBy, limit, filters])

  /**
   * Refresh vehicles data
   */
  const refresh = useCallback(() => {
    return loadVehicles()
  }, [loadVehicles])

  /**
   * Search vehicles with advanced filters
   */
  const searchVehicles = useCallback(async (searchParams) => {
    try {
      setLoading(true)
      setError(null)

      const data = await vehicleService.search(searchParams)
      setVehicles(data)
      setLastUpdated(new Date())
      
      return data
    } catch (err) {
      console.error('Error searching vehicles:', err)
      setError(err)
      setVehicles([])
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Add a new vehicle to the list
   */
  const addVehicle = useCallback((newVehicle) => {
    setVehicles(prev => [newVehicle, ...prev])
  }, [])

  /**
   * Update a vehicle in the list
   */
  const updateVehicle = useCallback((vehicleId, updates) => {
    setVehicles(prev => 
      prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, ...updates }
          : vehicle
      )
    )
  }, [])

  /**
   * Remove a vehicle from the list
   */
  const removeVehicle = useCallback((vehicleId) => {
    setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId))
  }, [])

  /**
   * Get vehicle by ID from current list
   */
  const getVehicleById = useCallback((vehicleId) => {
    return vehicles.find(vehicle => vehicle.id === vehicleId)
  }, [vehicles])

  // Auto-load vehicles on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadVehicles()
    }
  }, [autoLoad, loadVehicles])

  // Memoized computed values
  const stats = useMemo(() => {
    const total = vehicles.length
    const forSale = vehicles.filter(v => v.status === 'למכירה').length
    const sold = vehicles.filter(v => v.status === 'נמכר').length
    const pending = vehicles.filter(v => v.status === 'ממתין לתשלום').length

    return {
      total,
      forSale,
      sold,
      pending
    }
  }, [vehicles])

  const vehiclesByType = useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      const type = vehicle.type || 'אחר'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(vehicle)
      return acc
    }, {})
  }, [vehicles])

  return {
    vehicles,
    loading,
    error,
    lastUpdated,
    stats,
    vehiclesByType,
    loadVehicles,
    refresh,
    searchVehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    getVehicleById
  }
}

/**
 * useVehicle Hook
 * For managing a single vehicle
 */
export function useVehicle(vehicleId) {
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Load vehicle by ID
   */
  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return

    try {
      setLoading(true)
      setError(null)

      const data = await vehicleService.getById(vehicleId)
      setVehicle(data)
    } catch (err) {
      console.error('Error loading vehicle:', err)
      setError(err)
      setVehicle(null)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  /**
   * Update vehicle
   */
  const updateVehicle = useCallback(async (updates) => {
    if (!vehicleId) return

    try {
      const updatedVehicle = await vehicleService.update(vehicleId, updates)
      setVehicle(updatedVehicle)
      return updatedVehicle
    } catch (err) {
      console.error('Error updating vehicle:', err)
      throw err
    }
  }, [vehicleId])

  /**
   * Delete vehicle
   */
  const deleteVehicle = useCallback(async () => {
    if (!vehicleId) return

    try {
      await vehicleService.delete(vehicleId)
      setVehicle(null)
      return true
    } catch (err) {
      console.error('Error deleting vehicle:', err)
      throw err
    }
  }, [vehicleId])

  /**
   * Increment view count
   */
  const incrementViews = useCallback(async () => {
    if (!vehicleId) return

    try {
      await vehicleService.incrementViews(vehicleId)
      // Update local state
      setVehicle(prev => prev ? {
        ...prev,
        views_count: (prev.views_count || 0) + 1
      } : null)
    } catch (err) {
      console.error('Error incrementing views:', err)
      // Don't throw error for view counting
    }
  }, [vehicleId])

  // Auto-load vehicle on mount
  useEffect(() => {
    if (vehicleId) {
      loadVehicle()
    }
  }, [vehicleId, loadVehicle])

  return {
    vehicle,
    loading,
    error,
    loadVehicle,
    updateVehicle,
    deleteVehicle,
    incrementViews
  }
}

/**
 * useUserVehicles Hook
 * For managing vehicles belonging to a specific user
 */
export function useUserVehicles(userEmail) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Load user's vehicles
   */
  const loadUserVehicles = useCallback(async () => {
    if (!userEmail) return

    try {
      setLoading(true)
      setError(null)

      const data = await vehicleService.getByUser(userEmail)
      setVehicles(data)
    } catch (err) {
      console.error('Error loading user vehicles:', err)
      setError(err)
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  /**
   * Refresh user's vehicles
   */
  const refresh = useCallback(() => {
    return loadUserVehicles()
  }, [loadUserVehicles])

  // Auto-load on mount
  useEffect(() => {
    if (userEmail) {
      loadUserVehicles()
    }
  }, [userEmail, loadUserVehicles])

  return {
    vehicles,
    loading,
    error,
    loadUserVehicles,
    refresh
  }
}

export default useVehicles