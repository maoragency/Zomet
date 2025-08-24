/**
 * Subscription Optimization Service
 * Optimizes real-time subscriptions, manages subscription lifecycle, and reduces resource usage
 */

import { realTimeOptimizationService } from './realTimeConnectionManager'
import { messageQueueService } from './messageQueue'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

class SubscriptionOptimizer {
  constructor() {
    this.subscriptions = new Map()
    this.subscriptionGroups = new Map()
    this.activeUsers = new Set()
    this.config = {
      maxSubscriptionsPerUser: 10,
      subscriptionTimeout: 5 * 60 * 1000, // 5 minutes
      batchSubscriptions: true,
      enableDeduplication: true,
      enableThrottling: true,
      throttleDelay: 100,
      enablePrioritization: true
    }
    this.stats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      optimizedSubscriptions: 0,
      deduplicatedSubscriptions: 0
    }
    
    this.setupCleanupInterval()
  }

  /**
   * Create optimized subscription
   */
  async createSubscription(userId, subscriptionConfig, callback, options = {}) {
    try {
      const subscriptionId = this.generateSubscriptionId(userId, subscriptionConfig)
      
      // Check for existing subscription
      if (this.config.enableDeduplication && this.subscriptions.has(subscriptionId)) {
        const existing = this.subscriptions.get(subscriptionId)
        existing.callbacks.add(callback)
        existing.lastAccessed = Date.now()
        this.stats.deduplicatedSubscriptions++
        
        return {
          subscriptionId,
          isOptimized: true,
          unsubscribe: () => this.removeCallback(subscriptionId, callback)
        }
      }

      // Check subscription limits
      const userSubscriptions = this.getUserSubscriptions(userId)
      if (userSubscriptions.length >= this.config.maxSubscriptionsPerUser) {
        await this.optimizeUserSubscriptions(userId)
      }

      // Create subscription group if batching is enabled
      const groupKey = this.getSubscriptionGroupKey(subscriptionConfig)
      if (this.config.batchSubscriptions && this.subscriptionGroups.has(groupKey)) {
        return this.addToSubscriptionGroup(groupKey, userId, callback, options)
      }

      // Create new subscription
      const subscription = await this.createNewSubscription(
        subscriptionId,
        userId,
        subscriptionConfig,
        callback,
        options
      )

      // Add to subscription group if batching is enabled
      if (this.config.batchSubscriptions) {
        this.createSubscriptionGroup(groupKey, subscription)
      }

      this.stats.totalSubscriptions++
      this.stats.activeSubscriptions++

      return {
        subscriptionId,
        subscription,
        unsubscribe: () => this.unsubscribe(subscriptionId)
      }
    } catch (error) {
      logError(error, 'SubscriptionOptimizer.createSubscription')
      throw error
    }
  }

  /**
   * Create new subscription
   */
  async createNewSubscription(subscriptionId, userId, config, callback, options) {
    const optimizedCallback = this.createOptimizedCallback(callback, options)
    
    const realTimeSubscription = await realTimeOptimizationService.subscribe(
      config.channelName,
      config.eventConfig,
      optimizedCallback,
      {
        ...options,
        batchDelay: this.config.throttleDelay
      }
    )

    const subscription = {
      id: subscriptionId,
      userId,
      config,
      callbacks: new Set([callback]),
      realTimeSubscription,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      messageCount: 0,
      options
    }

    this.subscriptions.set(subscriptionId, subscription)
    this.activeUsers.add(userId)

    return subscription
  }

  /**
   * Create optimized callback with throttling and prioritization
   */
  createOptimizedCallback(originalCallback, options) {
    let lastCallTime = 0
    let pendingCall = null

    return (data) => {
      const now = Date.now()
      
      // Apply throttling if enabled
      if (this.config.enableThrottling) {
        const timeSinceLastCall = now - lastCallTime
        
        if (timeSinceLastCall < this.config.throttleDelay) {
          // Throttle the call
          if (pendingCall) {
            clearTimeout(pendingCall)
          }
          
          pendingCall = setTimeout(() => {
            originalCallback(data)
            lastCallTime = Date.now()
            pendingCall = null
          }, this.config.throttleDelay - timeSinceLastCall)
          
          return
        }
      }

      // Apply prioritization if enabled
      if (this.config.enablePrioritization && options.priority) {
        const priority = this.getPriorityLevel(data, options.priority)
        
        if (priority === 'high') {
          // Process immediately
          originalCallback(data)
          lastCallTime = now
        } else {
          // Queue for batch processing
          messageQueueService.enqueue('subscription_callbacks', {
            callback: originalCallback,
            data
          }, { priority })
        }
      } else {
        originalCallback(data)
        lastCallTime = now
      }
    }
  }

  /**
   * Get priority level for data
   */
  getPriorityLevel(data, priorityConfig) {
    if (typeof priorityConfig === 'function') {
      return priorityConfig(data)
    }
    
    if (typeof priorityConfig === 'object') {
      // Check priority rules
      for (const [condition, priority] of Object.entries(priorityConfig)) {
        if (this.evaluateCondition(data, condition)) {
          return priority
        }
      }
    }
    
    return 'normal'
  }

  /**
   * Evaluate priority condition
   */
  evaluateCondition(data, condition) {
    try {
      // Simple condition evaluation
      if (condition.includes('type')) {
        const expectedType = condition.split('=')[1]
        return data.type === expectedType
      }
      
      if (condition.includes('priority')) {
        const expectedPriority = condition.split('=')[1]
        return data.priority === expectedPriority
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Create subscription group for batching
   */
  createSubscriptionGroup(groupKey, subscription) {
    if (!this.subscriptionGroups.has(groupKey)) {
      this.subscriptionGroups.set(groupKey, {
        key: groupKey,
        subscriptions: new Set(),
        callbacks: new Map(),
        masterSubscription: null,
        createdAt: Date.now()
      })
    }

    const group = this.subscriptionGroups.get(groupKey)
    group.subscriptions.add(subscription.id)
    
    if (!group.masterSubscription) {
      group.masterSubscription = subscription
    }
  }

  /**
   * Add to existing subscription group
   */
  addToSubscriptionGroup(groupKey, userId, callback, options) {
    const group = this.subscriptionGroups.get(groupKey)
    const callbackId = this.generateCallbackId(userId, callback)
    
    group.callbacks.set(callbackId, {
      userId,
      callback: this.createOptimizedCallback(callback, options),
      options,
      createdAt: Date.now()
    })

    this.stats.optimizedSubscriptions++

    return {
      subscriptionId: `${groupKey}_${callbackId}`,
      isGrouped: true,
      unsubscribe: () => this.removeFromGroup(groupKey, callbackId)
    }
  }

  /**
   * Remove callback from group
   */
  removeFromGroup(groupKey, callbackId) {
    const group = this.subscriptionGroups.get(groupKey)
    if (group) {
      group.callbacks.delete(callbackId)
      
      // If no more callbacks, remove group
      if (group.callbacks.size === 0) {
        if (group.masterSubscription) {
          this.unsubscribe(group.masterSubscription.id)
        }
        this.subscriptionGroups.delete(groupKey)
      }
    }
  }

  /**
   * Generate subscription group key
   */
  getSubscriptionGroupKey(config) {
    return `${config.channelName}_${JSON.stringify(config.eventConfig)}`
  }

  /**
   * Generate subscription ID
   */
  generateSubscriptionId(userId, config) {
    const configHash = this.hashConfig(config)
    return `sub_${userId}_${configHash}`
  }

  /**
   * Generate callback ID
   */
  generateCallbackId(userId, callback) {
    return `cb_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Hash configuration for deduplication
   */
  hashConfig(config) {
    const str = JSON.stringify(config)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get user subscriptions
   */
  getUserSubscriptions(userId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId)
  }

  /**
   * Optimize user subscriptions
   */
  async optimizeUserSubscriptions(userId) {
    const userSubs = this.getUserSubscriptions(userId)
    
    // Sort by last accessed time (oldest first)
    userSubs.sort((a, b) => a.lastAccessed - b.lastAccessed)
    
    // Remove oldest subscriptions
    const toRemove = userSubs.slice(0, userSubs.length - this.config.maxSubscriptionsPerUser + 1)
    
    for (const subscription of toRemove) {
      await this.unsubscribe(subscription.id)
    }
  }

  /**
   * Unsubscribe from subscription
   */
  async unsubscribe(subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId)
      if (!subscription) return

      // Unsubscribe from real-time service
      if (subscription.realTimeSubscription) {
        subscription.realTimeSubscription.unsubscribe()
      }

      // Remove from subscriptions
      this.subscriptions.delete(subscriptionId)
      this.stats.activeSubscriptions--

      // Check if user has no more subscriptions
      const userSubs = this.getUserSubscriptions(subscription.userId)
      if (userSubs.length === 0) {
        this.activeUsers.delete(subscription.userId)
      }

      // Remove from subscription groups
      for (const [groupKey, group] of this.subscriptionGroups.entries()) {
        if (group.subscriptions.has(subscriptionId)) {
          group.subscriptions.delete(subscriptionId)
          
          if (group.subscriptions.size === 0) {
            this.subscriptionGroups.delete(groupKey)
          }
        }
      }
    } catch (error) {
      logError(error, 'SubscriptionOptimizer.unsubscribe')
    }
  }

  /**
   * Remove callback from subscription
   */
  removeCallback(subscriptionId, callback) {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.callbacks.delete(callback)
      
      // If no more callbacks, unsubscribe
      if (subscription.callbacks.size === 0) {
        this.unsubscribe(subscriptionId)
      }
    }
  }

  /**
   * Setup cleanup interval
   */
  setupCleanupInterval() {
    setInterval(() => {
      this.cleanupStaleSubscriptions()
    }, 60000) // Run every minute
  }

  /**
   * Cleanup stale subscriptions
   */
  cleanupStaleSubscriptions() {
    const now = Date.now()
    const staleSubscriptions = []

    for (const [id, subscription] of this.subscriptions.entries()) {
      const age = now - subscription.lastAccessed
      
      if (age > this.config.subscriptionTimeout) {
        staleSubscriptions.push(id)
      }
    }

    // Remove stale subscriptions
    staleSubscriptions.forEach(id => {
      this.unsubscribe(id)
    })

    // Cleanup empty subscription groups
    for (const [groupKey, group] of this.subscriptionGroups.entries()) {
      if (group.callbacks.size === 0 && group.subscriptions.size === 0) {
        this.subscriptionGroups.delete(groupKey)
      }
    }
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeUsers: this.activeUsers.size,
      subscriptionGroups: this.subscriptionGroups.size,
      avgSubscriptionsPerUser: this.activeUsers.size > 0 ? 
        this.stats.activeSubscriptions / this.activeUsers.size : 0,
      optimizationRate: this.stats.totalSubscriptions > 0 ? 
        (this.stats.optimizedSubscriptions / this.stats.totalSubscriptions) * 100 : 0
    }
  }

  /**
   * Configure optimizer
   */
  configure(config) {
    Object.assign(this.config, config)
  }

  /**
   * Cleanup all subscriptions and resources
   */
  cleanup() {
    // Unsubscribe from all subscriptions
    for (const subscriptionId of this.subscriptions.keys()) {
      this.unsubscribe(subscriptionId)
    }

    // Clear all data structures
    this.subscriptions.clear()
    this.subscriptionGroups.clear()
    this.activeUsers.clear()

    // Reset stats
    this.stats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      optimizedSubscriptions: 0,
      deduplicatedSubscriptions: 0
    }
  }
}

// Create singleton instance
const subscriptionOptimizer = new SubscriptionOptimizer()

// Setup message queue processor for subscription callbacks
messageQueueService.setProcessor('subscription_callbacks', async (messages) => {
  messages.forEach(message => {
    try {
      message.callback(message.data)
    } catch (error) {
      logError(error, 'SubscriptionOptimizer.callbackProcessor')
    }
  })
}, { enableBatching: true, batchSize: 20, batchTimeout: 50 })

// Subscription optimizer service
export const subscriptionOptimizerService = {
  /**
   * Create optimized subscription
   */
  async subscribe(userId, subscriptionConfig, callback, options = {}) {
    return subscriptionOptimizer.createSubscription(userId, subscriptionConfig, callback, options)
  },

  /**
   * Unsubscribe
   */
  async unsubscribe(subscriptionId) {
    return subscriptionOptimizer.unsubscribe(subscriptionId)
  },

  /**
   * Get optimization statistics
   */
  getStats() {
    return subscriptionOptimizer.getStats()
  },

  /**
   * Configure optimizer
   */
  configure(config) {
    subscriptionOptimizer.configure(config)
  },

  /**
   * Cleanup all resources
   */
  cleanup() {
    subscriptionOptimizer.cleanup()
  }
}

export default subscriptionOptimizerService