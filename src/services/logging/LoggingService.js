/**
 * Comprehensive Logging Service
 * Handles all application logging, error tracking, and performance monitoring
 */

class LoggingService {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.context = {};
    this.errorQueue = [];
    this.maxQueueSize = 100;
    
    this.initializeErrorHandlers();
  }

  /**
   * Get current log level from environment
   */
  getLogLevel() {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
    const envLevel = import.meta.env.VITE_LOG_LEVEL || 'INFO';
    return levels[envLevel] || levels.INFO;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Set user context for logging
   */
  setUser(userId, userInfo = {}) {
    this.userId = userId;
    this.context.user = { id: userId, ...userInfo };
  }

  /**
   * Create log entry
   */
  createLogEntry(level, message, data = {}, error = null) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: { ...this.context },
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    if (this.logLevel <= 0) {
      const entry = this.createLogEntry('DEBUG', message, data);
      console.debug('🐛', message, entry);
    }
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    if (this.logLevel <= 1) {
      const entry = this.createLogEntry('INFO', message, data);
      console.info('ℹ️', message, entry);
    }
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    if (this.logLevel <= 2) {
      const entry = this.createLogEntry('WARN', message, data);
      console.warn('⚠️', message, entry);
    }
  }

  /**
   * Log error message
   */
  error(message, error = null, data = {}) {
    if (this.logLevel <= 3) {
      const entry = this.createLogEntry('ERROR', message, data, error);
      console.error('❌', message, entry);
      this.queueError(entry);
    }
  }

  /**
   * Log critical error
   */
  critical(message, error = null, data = {}) {
    const entry = this.createLogEntry('CRITICAL', message, data, error);
    console.error('🚨', message, entry);
    this.queueError(entry);
  }

  /**
   * Queue error for batch processing
   */
  queueError(entry) {
    this.errorQueue.push(entry);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Initialize global error handlers
   */
  initializeErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason);
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorQueue.length,
      recentErrors: this.errorQueue.slice(-10),
      sessionId: this.sessionId
    };
  }

  /**
   * Clear error queue
   */
  clearErrors() {
    this.errorQueue = [];
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default loggingService;