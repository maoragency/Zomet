/**
 * Optimized Message Queue Service
 * Handles message queuing, batching, and high-volume scenarios for real-time features
 */

import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

class MessageQueue {
  constructor(options = {}) {
    this.queues = new Map()
    this.processors = new Map()
    this.batchTimers = new Map()
    this.config = {
      maxQueueSize: 10000,
      batchSize: 50,
      batchTimeout: 1000,
      processingDelay: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      enablePriority: true,
      enableBatching: true,
      enableCompression: false,
      ...options
    }
    this.stats = {
      totalMessages: 0,
      processedMessages: 0,
      failedMessages: 0,
      droppedMessages: 0,
      batchesProcessed: 0
    }
  }

  /**
   * Add message to queue
   */
  enqueue(queueName, message, options = {}) {
    try {
      if (!this.queues.has(queueName)) {
        this.createQueue(queueName)
      }

      const queue = this.queues.get(queueName)
      
      // Check queue size limit
      if (queue.messages.length >= this.config.maxQueueSize) {
        this.handleQueueOverflow(queueName, queue)
      }

      const queuedMessage = {
        id: this.generateMessageId(),
        data: message,
        timestamp: Date.now(),
        priority: options.priority || 'normal',
        retryCount: 0,
        maxRetries: options.maxRetries || this.config.retryAttempts,
        delay: options.delay || 0,
        metadata: options.metadata || {}
      }

      // Insert based on priority if enabled
      if (this.config.enablePriority) {
        this.insertByPriority(queue.messages, queuedMessage)
      } else {
        queue.messages.push(queuedMessage)
      }

      this.stats.totalMessages++
      
      // Start processing if not already running
      if (!queue.processing) {
        this.startProcessing(queueName)
      }

      return queuedMessage.id
    } catch (error) {
      logError(error, 'MessageQueue.enqueue')
      throw error
    }
  }

  /**
   * Create new queue
   */
  createQueue(queueName) {
    const queue = {
      name: queueName,
      messages: [],
      processing: false,
      processor: null,
      batchProcessor: null,
      stats: {
        processed: 0,
        failed: 0,
        dropped: 0
      }
    }

    this.queues.set(queueName, queue)
    return queue
  }

  /**
   * Insert message by priority
   */
  insertByPriority(messages, message) {
    const priorities = { high: 3, normal: 2, low: 1 }
    const messagePriority = priorities[message.priority] || 2

    let insertIndex = messages.length
    for (let i = 0; i < messages.length; i++) {
      const existingPriority = priorities[messages[i].priority] || 2
      if (messagePriority > existingPriority) {
        insertIndex = i
        break
      }
    }

    messages.splice(insertIndex, 0, message)
  }

  /**
   * Handle queue overflow
   */
  handleQueueOverflow(queueName, queue) {
    // Drop oldest low priority messages first
    const lowPriorityIndex = queue.messages.findIndex(m => m.priority === 'low')
    if (lowPriorityIndex !== -1) {
      const dropped = queue.messages.splice(lowPriorityIndex, 1)[0]
      this.stats.droppedMessages++
      queue.stats.dropped++
      return
    }

    // Drop oldest normal priority message
    const normalPriorityIndex = queue.messages.findIndex(m => m.priority === 'normal')
    if (normalPriorityIndex !== -1) {
      const dropped = queue.messages.splice(normalPriorityIndex, 1)[0]
      this.stats.droppedMessages++
      queue.stats.dropped++
      return
    }

    // If only high priority messages, drop oldest
    if (queue.messages.length > 0) {
      const dropped = queue.messages.shift()
      this.stats.droppedMessages++
      queue.stats.dropped++
    }
  }

  /**
   * Set message processor for queue
   */
  setProcessor(queueName, processor, options = {}) {
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName)
    }

    const queue = this.queues.get(queueName)
    
    if (options.enableBatching && this.config.enableBatching) {
      queue.batchProcessor = processor
      queue.batchOptions = {
        batchSize: options.batchSize || this.config.batchSize,
        batchTimeout: options.batchTimeout || this.config.batchTimeout
      }
    } else {
      queue.processor = processor
    }

    this.processors.set(queueName, { processor, options })
  }

  /**
   * Start processing queue
   */
  async startProcessing(queueName) {
    const queue = this.queues.get(queueName)
    if (!queue || queue.processing) return

    queue.processing = true

    try {
      if (queue.batchProcessor) {
        await this.processBatched(queueName)
      } else {
        await this.processSequential(queueName)
      }
    } catch (error) {
      logError(error, 'MessageQueue.startProcessing')
    } finally {
      queue.processing = false
    }
  }

  /**
   * Process messages sequentially
   */
  async processSequential(queueName) {
    const queue = this.queues.get(queueName)
    
    while (queue.messages.length > 0) {
      const message = queue.messages.shift()
      
      try {
        // Check if message should be delayed
        if (message.delay > 0 && Date.now() - message.timestamp < message.delay) {
          // Re-queue with updated delay
          message.delay = message.delay - (Date.now() - message.timestamp)
          this.insertByPriority(queue.messages, message)
          await this.sleep(this.config.processingDelay)
          continue
        }

        // Process message
        if (queue.processor) {
          await queue.processor(message.data, message.metadata)
        }

        this.stats.processedMessages++
        queue.stats.processed++
      } catch (error) {
        await this.handleProcessingError(queueName, message, error)
      }

      // Small delay to prevent overwhelming
      await this.sleep(this.config.processingDelay)
    }
  }

  /**
   * Process messages in batches
   */
  async processBatched(queueName) {
    const queue = this.queues.get(queueName)
    const batchOptions = queue.batchOptions

    while (queue.messages.length > 0) {
      const batch = []
      const batchSize = Math.min(batchOptions.batchSize, queue.messages.length)

      // Collect batch
      for (let i = 0; i < batchSize; i++) {
        const message = queue.messages.shift()
        if (message) {
          batch.push(message)
        }
      }

      if (batch.length === 0) break

      try {
        // Process batch
        if (queue.batchProcessor) {
          await queue.batchProcessor(
            batch.map(m => m.data),
            batch.map(m => m.metadata)
          )
        }

        this.stats.processedMessages += batch.length
        this.stats.batchesProcessed++
        queue.stats.processed += batch.length
      } catch (error) {
        // Handle batch processing error
        for (const message of batch) {
          await this.handleProcessingError(queueName, message, error)
        }
      }

      // Delay between batches
      await this.sleep(batchOptions.batchTimeout)
    }
  }

  /**
   * Handle processing errors with retry logic
   */
  async handleProcessingError(queueName, message, error) {
    const queue = this.queues.get(queueName)
    
    message.retryCount++
    
    if (message.retryCount <= message.maxRetries) {
      // Calculate exponential backoff delay
      const retryDelay = this.config.retryDelay * Math.pow(2, message.retryCount - 1)
      message.delay = retryDelay
      message.timestamp = Date.now()
      
      // Re-queue for retry
      this.insertByPriority(queue.messages, message)
      
      `)
    } else {
      // Max retries exceeded
      this.stats.failedMessages++
      queue.stats.failed++
      
      logError(error, 'MessageQueue.handleProcessingError', {
        messageId: message.id,
        queueName,
        retryCount: message.retryCount
      })
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueName) {
    if (!this.queues.has(queueName)) {
      return null
    }

    const queue = this.queues.get(queueName)
    return {
      name: queueName,
      size: queue.messages.length,
      processing: queue.processing,
      stats: queue.stats,
      oldestMessage: queue.messages.length > 0 ? 
        Date.now() - queue.messages[queue.messages.length - 1].timestamp : 0
    }
  }

  /**
   * Get overall statistics
   */
  getOverallStats() {
    const queueStats = {}
    for (const [name, queue] of this.queues.entries()) {
      queueStats[name] = this.getQueueStats(name)
    }

    return {
      ...this.stats,
      queues: queueStats,
      totalQueues: this.queues.size,
      totalQueuedMessages: Array.from(this.queues.values())
        .reduce((sum, queue) => sum + queue.messages.length, 0)
    }
  }

  /**
   * Clear queue
   */
  clearQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      const clearedCount = queue.messages.length
      queue.messages = []
      return clearedCount
    }
    return 0
  }

  /**
   * Pause queue processing
   */
  pauseQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      queue.processing = false
    }
  }

  /**
   * Resume queue processing
   */
  resumeQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue && !queue.processing) {
      this.startProcessing(queueName)
    }
  }

  /**
   * Remove queue
   */
  removeQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      // Clear any pending batch timer
      if (this.batchTimers.has(queueName)) {
        clearTimeout(this.batchTimers.get(queueName))
        this.batchTimers.delete(queueName)
      }
      
      this.queues.delete(queueName)
      this.processors.delete(queueName)
      return true
    }
    return false
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cleanup all queues and resources
   */
  cleanup() {
    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer)
    }
    this.batchTimers.clear()

    // Clear all queues
    this.queues.clear()
    this.processors.clear()

    // Reset stats
    this.stats = {
      totalMessages: 0,
      processedMessages: 0,
      failedMessages: 0,
      droppedMessages: 0,
      batchesProcessed: 0
    }
  }
}

// Create singleton instance
const messageQueue = new MessageQueue()

// Message queue service
export const messageQueueService = {
  /**
   * Add message to queue
   */
  enqueue(queueName, message, options = {}) {
    return messageQueue.enqueue(queueName, message, options)
  },

  /**
   * Set processor for queue
   */
  setProcessor(queueName, processor, options = {}) {
    messageQueue.setProcessor(queueName, processor, options)
  },

  /**
   * Get queue statistics
   */
  getStats(queueName = null) {
    if (queueName) {
      return messageQueue.getQueueStats(queueName)
    }
    return messageQueue.getOverallStats()
  },

  /**
   * Clear queue
   */
  clearQueue(queueName) {
    return messageQueue.clearQueue(queueName)
  },

  /**
   * Pause queue
   */
  pauseQueue(queueName) {
    messageQueue.pauseQueue(queueName)
  },

  /**
   * Resume queue
   */
  resumeQueue(queueName) {
    messageQueue.resumeQueue(queueName)
  },

  /**
   * Configure queue system
   */
  configure(config) {
    Object.assign(messageQueue.config, config)
  },

  /**
   * Cleanup all resources
   */
  cleanup() {
    messageQueue.cleanup()
  }
}

export default messageQueueService