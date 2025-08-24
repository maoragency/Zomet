/**
 * Optimized Real-time Connection Manager
 * Manages WebSocket connections, connection pooling, and resource optimization
 */

import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

class RealTimeConnectionManager {
  constructor() {
    this.connections = new Map()
    this.connectionPool = new Map()
    this.subscriptions = new Map()
    this.messageQueue = new Map()
    this.batchTimers = new Map()
    this.reconnectAttempts = new Map()
    this.isOnline = navigator.onLine
    this.config = {
      maxConnections: 5,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      batchDelay: 100,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      messageQueueSize: 1000,
      enableCompression: true,
      enableBatching: true
    }
    
    this.setupNetworkListeners()
    this.startHeartbeat()
  }

  /**
   * Create optimized connection with pooling
   */
  async createConnection(channelName, options = {}) {
    try {
      // Check if connection already exists
      if (this.connections.has(channelName)) {
        return this.connections.get(channelName)
      }

      // Check connection pool limit
      if (this.connections.size >= this.config.maxConnections) {
        await this.optimizeConnections()
      }

      const connectionConfig = {
        ...options,
        config: {
          broadcast: { self: false },
          presence: { key: options.presenceKey || channelName },
          ...options.config
        }
      }

      const channel = supabase.channel(channelName, connectionConfig)
      
      const connection = {
        channel,
        channelName,
        status: 'connecting',
        lastActivity: Date.now(),
        subscriptions: new Set(),
        messageCount: 0,
        errorCount: 0,
        options: connectionConfig
      }

      // Setup connection monitoring
      this.setupConnectionMonitoring(connection)
      
      // Store connection
      this.connections.set(channelName, connection)
      
      // Subscribe to connection
      const subscription = channel.subscribe((status) => {
        connection.status = status
        connection.lastActivity = Date.now()
        
        if (status === 'SUBSCRIBED') {
          this.resetReconnectAttempts(channelName)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.handleConnectionError(channelName, status)
        }
        
        options.onStatusChange?.(status, channelName)
      })

      connection.subscription = subscription

      return connection
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.createConnection')
      throw error
    }
  }

  /**
   * Subscribe to real-time events with optimization
   */
  async subscribe(channelName, eventConfig, callback, options = {}) {
    try {
      const connection = await this.createConnection(channelName, options)
      
      const subscriptionId = `${channelName}_${Date.now()}_${Math.random()}`
      
      // Setup event handler with batching if enabled
      const eventHandler = this.config.enableBatching ? 
        this.createBatchedHandler(channelName, callback, options) :
        callback

      // Subscribe to event
      connection.channel.on(
        'postgres_changes',
        eventConfig,
        (payload) => {
          connection.messageCount++
          connection.lastActivity = Date.now()
          
          // Add to message queue if batching is enabled
          if (this.config.enableBatching) {
            this.addToMessageQueue(channelName, payload, eventHandler)
          } else {
            eventHandler(payload)
          }
        }
      )

      // Store subscription reference
      connection.subscriptions.add(subscriptionId)
      this.subscriptions.set(subscriptionId, {
        channelName,
        eventConfig,
        callback,
        options,
        createdAt: Date.now()
      })

      return {
        subscriptionId,
        connection,
        unsubscribe: () => this.unsubscribe(subscriptionId)
      }
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.subscribe')
      throw error
    }
  }

  /**
   * Create batched event handler
   */
  createBatchedHandler(channelName, callback, options) {
    return (payload) => {
      const batchKey = `${channelName}_${payload.eventType || 'default'}`
      
      if (!this.messageQueue.has(batchKey)) {
        this.messageQueue.set(batchKey, [])
      }
      
      this.messageQueue.get(batchKey).push(payload)
      
      // Clear existing timer
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey))
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        const messages = this.messageQueue.get(batchKey) || []
        this.messageQueue.delete(batchKey)
        this.batchTimers.delete(batchKey)
        
        if (messages.length > 0) {
          if (messages.length === 1) {
            callback(messages[0])
          } else {
            callback({
              type: 'batch',
              messages,
              count: messages.length,
              batchKey
            })
          }
        }
      }, options.batchDelay || this.config.batchDelay)
      
      this.batchTimers.set(batchKey, timer)
    }
  }

  /**
   * Add message to queue with size management
   */
  addToMessageQueue(channelName, payload, handler) {
    const queueKey = `${channelName}_queue`
    
    if (!this.messageQueue.has(queueKey)) {
      this.messageQueue.set(queueKey, [])
    }
    
    const queue = this.messageQueue.get(queueKey)
    queue.push({ payload, handler, timestamp: Date.now() })
    
    // Manage queue size
    if (queue.length > this.config.messageQueueSize) {
      const removed = queue.shift()
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId)
      if (!subscription) return

      const connection = this.connections.get(subscription.channelName)
      if (connection) {
        connection.subscriptions.delete(subscriptionId)
        
        // If no more subscriptions, consider closing connection
        if (connection.subscriptions.size === 0) {
          this.scheduleConnectionCleanup(subscription.channelName)
        }
      }

      this.subscriptions.delete(subscriptionId)
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.unsubscribe')
    }
  }

  /**
   * Optimize connections by closing idle ones
   */
  async optimizeConnections() {
    const now = Date.now()
    const idleThreshold = 5 * 60 * 1000 // 5 minutes
    
    for (const [channelName, connection] of this.connections.entries()) {
      const isIdle = (now - connection.lastActivity) > idleThreshold
      const hasNoSubscriptions = connection.subscriptions.size === 0
      
      if (isIdle || hasNoSubscriptions) {
        await this.closeConnection(channelName)
      }
    }
  }

  /**
   * Close specific connection
   */
  async closeConnection(channelName) {
    try {
      const connection = this.connections.get(channelName)
      if (!connection) return

      // Unsubscribe from channel
      connection.channel.unsubscribe()
      
      // Clear any pending timers
      const batchKeys = Array.from(this.batchTimers.keys())
        .filter(key => key.startsWith(channelName))
      
      batchKeys.forEach(key => {
        clearTimeout(this.batchTimers.get(key))
        this.batchTimers.delete(key)
      })

      // Remove from connections
      this.connections.delete(channelName)
      
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.closeConnection')
    }
  }

  /**
   * Schedule connection cleanup
   */
  scheduleConnectionCleanup(channelName) {
    setTimeout(() => {
      const connection = this.connections.get(channelName)
      if (connection && connection.subscriptions.size === 0) {
        this.closeConnection(channelName)
      }
    }, 30000) // 30 seconds delay
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring(connection) {
    // Monitor connection health
    const healthCheck = setInterval(() => {
      if (connection.status === 'SUBSCRIBED') {
        // Send ping to keep connection alive
        connection.channel.send({
          type: 'ping',
          timestamp: Date.now()
        })
      }
    }, this.config.heartbeatInterval)

    connection.healthCheck = healthCheck
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(channelName, error) {
    try {
      const attempts = this.reconnectAttempts.get(channelName) || 0
      
      if (attempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts.set(channelName, attempts + 1)
        
        const delay = this.config.reconnectDelay * Math.pow(2, attempts) // Exponential backoff
        
        `)
        
        setTimeout(() => {
          this.reconnectConnection(channelName)
        }, delay)
      } else {
        console.error(`Max reconnection attempts reached for ${channelName}`)
        this.closeConnection(channelName)
      }
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.handleConnectionError')
    }
  }

  /**
   * Reconnect connection
   */
  async reconnectConnection(channelName) {
    try {
      const connection = this.connections.get(channelName)
      if (!connection) return

      // Close existing connection
      connection.channel.unsubscribe()
      
      // Create new connection with same options
      const newConnection = await this.createConnection(channelName, connection.options)
      
      // Restore subscriptions
      for (const subscriptionId of connection.subscriptions) {
        const subscription = this.subscriptions.get(subscriptionId)
        if (subscription) {
          newConnection.channel.on(
            'postgres_changes',
            subscription.eventConfig,
            subscription.callback
          )
        }
      }
      
    } catch (error) {
      logError(error, 'RealTimeConnectionManager.reconnectConnection')
    }
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts(channelName) {
    this.reconnectAttempts.delete(channelName)
  }

  /**
   * Setup network listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.reconnectAllConnections()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseConnections()
      } else {
        this.resumeConnections()
      }
    })
  }

  /**
   * Reconnect all connections
   */
  async reconnectAllConnections() {
    for (const channelName of this.connections.keys()) {
      await this.reconnectConnection(channelName)
    }
  }

  /**
   * Pause connections when page is hidden
   */
  pauseConnections() {
    for (const connection of this.connections.values()) {
      if (connection.healthCheck) {
        clearInterval(connection.healthCheck)
      }
    }
  }

  /**
   * Resume connections when page is visible
   */
  resumeConnections() {
    for (const connection of this.connections.values()) {
      this.setupConnectionMonitoring(connection)
    }
  }

  /**
   * Start heartbeat for connection health
   */
  startHeartbeat() {
    setInterval(() => {
      this.checkConnectionHealth()
    }, this.config.heartbeatInterval)
  }

  /**
   * Check health of all connections
   */
  checkConnectionHealth() {
    const now = Date.now()
    
    for (const [channelName, connection] of this.connections.entries()) {
      const timeSinceActivity = now - connection.lastActivity
      
      // Check for stale connections
      if (timeSinceActivity > this.config.heartbeatInterval * 2) {
        this.handleConnectionError(channelName, 'stale_connection')
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      totalSubscriptions: this.subscriptions.size,
      totalMessages: 0,
      totalErrors: 0,
      connections: {}
    }

    for (const [channelName, connection] of this.connections.entries()) {
      if (connection.status === 'SUBSCRIBED') {
        stats.activeConnections++
      }
      
      stats.totalMessages += connection.messageCount
      stats.totalErrors += connection.errorCount
      
      stats.connections[channelName] = {
        status: connection.status,
        subscriptions: connection.subscriptions.size,
        messageCount: connection.messageCount,
        errorCount: connection.errorCount,
        lastActivity: connection.lastActivity
      }
    }

    return stats
  }

  /**
   * Cleanup all connections and resources
   */
  cleanup() {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer)
    }
    this.batchTimers.clear()

    // Close all connections
    for (const channelName of this.connections.keys()) {
      this.closeConnection(channelName)
    }

    // Clear all data structures
    this.connections.clear()
    this.subscriptions.clear()
    this.messageQueue.clear()
    this.reconnectAttempts.clear()
  }
}

// Create singleton instance
const connectionManager = new RealTimeConnectionManager()

// Real-time optimization service
export const realTimeOptimizationService = {
  /**
   * Create optimized subscription
   */
  async subscribe(channelName, eventConfig, callback, options = {}) {
    return connectionManager.subscribe(channelName, eventConfig, callback, options)
  },

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId) {
    connectionManager.unsubscribe(subscriptionId)
  },

  /**
   * Get connection statistics
   */
  getStats() {
    return connectionManager.getConnectionStats()
  },

  /**
   * Optimize connections
   */
  async optimize() {
    return connectionManager.optimizeConnections()
  },

  /**
   * Configure connection manager
   */
  configure(config) {
    Object.assign(connectionManager.config, config)
  },

  /**
   * Cleanup all resources
   */
  cleanup() {
    connectionManager.cleanup()
  }
}

export default realTimeOptimizationService