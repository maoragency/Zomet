/**
 * API Entities Layer - Supabase Implementation
 * Provides entity classes that wrap Supabase services with cohesive methods
 * Provides clean entity abstraction over Supabase services
 */

import vehicleService from '@/services/vehicles'
import userService from '@/services/users'
import buyerRequestService from '@/services/buyerRequests'
import pricingPlanService from '@/services/pricingPlans'

/**
 * Vehicle Entity Class
 * Handles all vehicle-related operations
 */
export class Vehicle {
  /**
   * List vehicles with optional sorting and limiting
   * @param {string} sortBy - Sort field (e.g., '-created_date', 'price')
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of vehicles
   */
  static async list(sortBy = '-created_date', limit = 100) {
    return await vehicleService.list(sortBy, limit)
  }

  /**
   * Filter vehicles by criteria
   * @param {Object} filters - Filter criteria
   * @param {string} sortBy - Sort field (optional)
   * @returns {Promise<Array>} Filtered vehicles
   */
  static async filter(filters = {}, sortBy = null) {
    return await vehicleService.filter(filters, sortBy)
  }

  /**
   * Get a single vehicle by ID
   * @param {string} id - Vehicle UUID
   * @returns {Promise<Object>} Vehicle object
   */
  static async getById(id) {
    return await vehicleService.getById(id)
  }

  /**
   * Create a new vehicle
   * @param {Object} vehicleData - Vehicle data
   * @returns {Promise<Object>} Created vehicle
   */
  static async create(vehicleData) {
    return await vehicleService.create(vehicleData)
  }

  /**
   * Update an existing vehicle
   * @param {string} id - Vehicle UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated vehicle
   */
  static async update(id, updates) {
    return await vehicleService.update(id, updates)
  }

  /**
   * Delete a vehicle
   * @param {string} id - Vehicle UUID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    return await vehicleService.delete(id)
  }

  /**
   * Search vehicles with advanced filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Matching vehicles
   */
  static async search(searchParams = {}) {
    return await vehicleService.search(searchParams)
  }

  /**
   * Get vehicles by user
   * @param {string} userEmail - User's email address
   * @param {string} sortBy - Sort field
   * @returns {Promise<Array>} User's vehicles
   */
  static async getByUser(userEmail, sortBy = '-created_at') {
    return await vehicleService.getByUser(userEmail, sortBy)
  }

  /**
   * Increment vehicle view count
   * @param {string} id - Vehicle UUID
   * @returns {Promise<void>}
   */
  static async incrementViews(id) {
    return await vehicleService.incrementViews(id)
  }
}

/**
 * User Entity Class
 * Handles all user-related operations
 */
export class User {
  /**
   * Get current user profile (equivalent to User.me())
   * @returns {Promise<Object>} Current user profile
   */
  static async me() {
    return await userService.me()
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User profile
   */
  static async getById(userId) {
    return await userService.getById(userId)
  }

  /**
   * Get user profile by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User profile
   */
  static async getByEmail(email) {
    return await userService.getByEmail(email)
  }

  /**
   * Update current user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  static async updateProfile(updates) {
    return await userService.updateProfile(updates)
  }

  /**
   * Create user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  static async createProfile(profileData) {
    return await userService.createProfile(profileData)
  }

  /**
   * Delete user profile
   * @param {string} userId - User UUID (optional)
   * @returns {Promise<boolean>} Success status
   */
  static async deleteProfile(userId = null) {
    return await userService.deleteProfile(userId)
  }

  /**
   * Get user statistics
   * @param {string} userId - User UUID (optional)
   * @returns {Promise<Object>} User statistics
   */
  static async getUserStats(userId = null) {
    return await userService.getUserStats(userId)
  }

  /**
   * Check if user exists by email
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} Whether user exists
   */
  static async userExists(email) {
    return await userService.userExists(email)
  }

  /**
   * Search users (admin function)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Matching users
   */
  static async searchUsers(searchTerm, limit = 10) {
    return await userService.searchUsers(searchTerm, limit)
  }
}

/**
 * BuyerRequest Entity Class
 * Handles all buyer request operations
 */
export class BuyerRequest {
  /**
   * List buyer requests with optional sorting and limiting
   * @param {string} sortBy - Sort field
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of buyer requests
   */
  static async list(sortBy = '-created_date', limit = 100) {
    return await buyerRequestService.list(sortBy, limit)
  }

  /**
   * Filter buyer requests by criteria
   * @param {Object} filters - Filter criteria
   * @param {string} sortBy - Sort field (optional)
   * @returns {Promise<Array>} Filtered buyer requests
   */
  static async filter(filters = {}, sortBy = null) {
    return await buyerRequestService.filter(filters, sortBy)
  }

  /**
   * Get a single buyer request by ID
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Buyer request object
   */
  static async getById(id) {
    return await buyerRequestService.getById(id)
  }

  /**
   * Create a new buyer request
   * @param {Object} requestData - Buyer request data
   * @returns {Promise<Object>} Created buyer request
   */
  static async create(requestData) {
    return await buyerRequestService.create(requestData)
  }

  /**
   * Update an existing buyer request
   * @param {string} id - Buyer request UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated buyer request
   */
  static async update(id, updates) {
    return await buyerRequestService.update(id, updates)
  }

  /**
   * Delete a buyer request
   * @param {string} id - Buyer request UUID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    return await buyerRequestService.delete(id)
  }

  /**
   * Get buyer requests by user
   * @param {string} userEmail - User's email address
   * @param {string} sortBy - Sort field
   * @returns {Promise<Array>} User's buyer requests
   */
  static async getByUser(userEmail, sortBy = '-created_at') {
    return await buyerRequestService.getByUser(userEmail, sortBy)
  }

  /**
   * Search buyer requests
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Matching buyer requests
   */
  static async search(searchParams = {}) {
    return await buyerRequestService.search(searchParams)
  }

  /**
   * Get active buyer requests
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Active buyer requests
   */
  static async getActive(limit = 50) {
    return await buyerRequestService.getActive(limit)
  }

  /**
   * Close a buyer request
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Updated buyer request
   */
  static async close(id) {
    return await buyerRequestService.close(id)
  }

  /**
   * Mark buyer request as completed
   * @param {string} id - Buyer request UUID
   * @returns {Promise<Object>} Updated buyer request
   */
  static async complete(id) {
    return await buyerRequestService.complete(id)
  }
}

/**
 * PricingPlan Entity Class
 * Handles all pricing plan operations
 */
export class PricingPlan {
  /**
   * Get all pricing plans
   * @param {boolean} activeOnly - Whether to return only active plans
   * @returns {Promise<Array>} Array of pricing plans
   */
  static async list(activeOnly = true) {
    return await pricingPlanService.list(activeOnly)
  }

  /**
   * Get a single pricing plan by ID
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<Object>} Pricing plan object
   */
  static async getById(id) {
    return await pricingPlanService.getById(id)
  }

  /**
   * Get pricing plan by name
   * @param {string} name - Plan name
   * @returns {Promise<Object>} Pricing plan object
   */
  static async getByName(name) {
    return await pricingPlanService.getByName(name)
  }

  /**
   * Create a new pricing plan (admin only)
   * @param {Object} planData - Pricing plan data
   * @returns {Promise<Object>} Created pricing plan
   */
  static async create(planData) {
    return await pricingPlanService.create(planData)
  }

  /**
   * Update an existing pricing plan (admin only)
   * @param {string} id - Pricing plan UUID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated pricing plan
   */
  static async update(id, updates) {
    return await pricingPlanService.update(id, updates)
  }

  /**
   * Delete a pricing plan (admin only)
   * @param {string} id - Pricing plan UUID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    return await pricingPlanService.delete(id)
  }

  /**
   * Get pricing plans by price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @returns {Promise<Array>} Matching pricing plans
   */
  static async getByPriceRange(minPrice, maxPrice) {
    return await pricingPlanService.getByPriceRange(minPrice, maxPrice)
  }

  /**
   * Get free pricing plans
   * @returns {Promise<Array>} Free pricing plans
   */
  static async getFree() {
    return await pricingPlanService.getFree()
  }

  /**
   * Get premium pricing plans
   * @returns {Promise<Array>} Premium pricing plans
   */
  static async getPremium() {
    return await pricingPlanService.getPremium()
  }

  /**
   * Search pricing plans by features
   * @param {string} feature - Feature to search for
   * @returns {Promise<Array>} Matching pricing plans
   */
  static async searchByFeature(feature) {
    return await pricingPlanService.searchByFeature(feature)
  }
}

// Export all entities
export default {
  Vehicle,
  User,
  BuyerRequest,
  PricingPlan
}