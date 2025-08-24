/**
 * Database Services Index
 * Unified export for all Supabase database services
 */

// Import all services
import { vehicleService } from './vehicles'
import { userService } from './users'
import { buyerRequestService } from './buyerRequests'
import { pricingPlanService } from './pricingPlans'
import { authService } from './auth'
import { storageService } from './storage'
import { messagingService } from './messaging'
import { notificationService } from './notifications'
import { promotionService } from './promotions'
import { analyticsService } from './analytics'
import { auditService } from './audit'
import { systemSettingsService } from './systemSettings'

// Import error handling utilities
import {
  handleApiError,
  handleValidationError,
  withErrorHandling,
  logError,
  createSuccessResponse,
  createErrorResponse,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  sanitizeInput
} from '@/utils/errorHandler'

/**
 * Database service layer providing CRUD operations for all entities
 * All methods return standardized response objects with success/error status
 */
export const db = {
  // Vehicle operations
  vehicles: vehicleService,
  
  // User operations
  users: userService,
  
  // Buyer request operations
  buyerRequests: buyerRequestService,
  
  // Pricing plan operations
  pricingPlans: pricingPlanService,
  
  // Authentication operations
  auth: authService,
  
  // Storage operations
  storage: storageService,
  
  // Messaging operations
  messaging: messagingService,
  
  // Notification operations
  notifications: notificationService,
  
  // Promotion operations
  promotions: promotionService,
  
  // Analytics operations
  analytics: analyticsService,
  
  // Audit operations
  audit: auditService,
  
  // System settings operations
  systemSettings: systemSettingsService
}

/**
 * Error handling utilities
 */
export const errorUtils = {
  handleApiError,
  handleValidationError,
  withErrorHandling,
  logError,
  createSuccessResponse,
  createErrorResponse,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  sanitizeInput
}

/**
 * Database health check
 * Tests connection to Supabase and basic functionality
 */
export const healthCheck = async () => {
  try {
    // Import supabase client
    const { supabase } = await import('@/lib/supabase')
    
    // Test basic database connection
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('count')
      .limit(1)

    if (error) throw error

    return createSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return handleApiError(error, 'database.healthCheck')
  }
}

/**
 * Batch operations utility
 * Allows performing multiple database operations in sequence
 */
export const batch = {
  /**
   * Execute multiple operations in sequence
   * @param {Array} operations - Array of operation functions
   * @returns {Promise<Object>} Results of all operations
   */
  async execute(operations) {
    const results = []
    const errors = []

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]()
        results.push({ index: i, success: true, data: result })
      } catch (error) {
        const errorResult = handleApiError(error, `batch.execute[${i}]`)
        errors.push({ index: i, ...errorResult })
        results.push({ index: i, success: false, error: errorResult })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: operations.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length
      }
    }
  }
}

// Export individual services for direct access
export {
  vehicleService,
  userService,
  buyerRequestService,
  pricingPlanService,
  authService,
  storageService,
  messagingService,
  notificationService,
  promotionService,
  analyticsService,
  auditService,
  systemSettingsService
}

// Export default as the main db object
export default db