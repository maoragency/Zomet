/**
 * Comprehensive error handling utilities for Supabase operations
 * Provides consistent error handling and user-friendly messages in Hebrew
 * Enhanced with retry mechanisms, error recovery, and advanced logging
 */

/**
 * Error severity levels for logging and monitoring
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

/**
 * Error categories for better classification
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  NETWORK: 'network',
  VALIDATION: 'validation',
  STORAGE: 'storage',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system'
}

/**
 * Retry configuration for different operation types
 */
export const RETRY_CONFIG = {
  DEFAULT: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  NETWORK: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 8000,
    backoffMultiplier: 1.5,
    jitter: true
  },
  DATABASE: {
    maxRetries: 3,
    baseDelay: 1500,
    maxDelay: 12000,
    backoffMultiplier: 2,
    jitter: false
  },
  STORAGE: {
    maxRetries: 4,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2.5,
    jitter: true
  }
}

/**
 * Database error codes and their Hebrew translations
 */
const ERROR_MESSAGES = {
  // Authentication errors
  'invalid_credentials': 'פרטי התחברות שגויים',
  'email_not_confirmed': 'יש לאמת את כתובת האימייל',
  'user_not_found': 'משתמש לא נמצא',
  'weak_password': 'הסיסמה חלשה מדי',
  'email_already_registered': 'כתובת האימייל כבר רשומה במערכת',
  'signup_disabled': 'הרשמה מושבתת כרגע',
  'invalid_email': 'כתובת אימייל לא תקינה',
  'session_expired': 'פג תוקף ההתחברות, יש להתחבר מחדש',

  // Database errors
  'PGRST116': 'רשומה לא נמצאה',
  'PGRST301': 'אין הרשאה לגשת לנתונים',
  'PGRST204': 'אין תוצאות',
  '23505': 'הנתונים כבר קיימים במערכת',
  '23503': 'לא ניתן למחוק - קיימות התייחסויות לנתונים',
  '23502': 'שדה חובה חסר',
  '42501': 'אין הרשאה לבצע פעולה זו',
  '42P01': 'טבלה לא נמצאה',
  '08006': 'בעיית חיבור למסד הנתונים',

  // Storage errors
  'storage/object-not-found': 'קובץ לא נמצא',
  'storage/unauthorized': 'אין הרשאה לגשת לקובץ',
  'storage/invalid-checksum': 'קובץ פגום',
  'storage/invalid-content-type': 'סוג קובץ לא נתמך',
  'storage/payload-too-large': 'הקובץ גדול מדי',
  'storage/quota-exceeded': 'חרגת ממכסת האחסון',

  // Network errors
  'network_error': 'בעיית חיבור לאינטרנט',
  'timeout': 'הפעולה ארכה יותר מדי זמן',
  'server_error': 'שגיאת שרת, אנא נסה שוב מאוחר יותר',

  // Validation errors
  'validation_error': 'נתונים לא תקינים',
  'required_field': 'שדה חובה חסר',
  'invalid_format': 'פורמט לא תקין',
  'value_too_long': 'הערך ארוך מדי',
  'value_too_short': 'הערך קצר מדי',
  'invalid_range': 'הערך מחוץ לטווח המותר',

  // Business logic errors
  'insufficient_permissions': 'אין לך הרשאות מספיקות לביצוע פעולה זו',
  'resource_not_found': 'המשאב המבוקש לא נמצא',
  'operation_not_allowed': 'פעולה זו אינה מותרת',
  'quota_exceeded': 'חרגת מהמכסה המותרת',
  'rate_limit_exceeded': 'חרגת ממספר הבקשות המותר',
  'maintenance_mode': 'המערכת נמצאת במצב תחזוקה',

  // System errors
  'service_unavailable': 'השירות אינו זמין כרגע',
  'internal_error': 'שגיאה פנימית במערכת',
  'configuration_error': 'שגיאת הגדרות מערכת',
  'dependency_error': 'שגיאה בשירות חיצוני'
}

/**
 * Default error message for unknown errors
 */
const DEFAULT_ERROR_MESSAGE = 'אירעה שגיאה לא צפויה. אנא נסה שוב.'

/**
 * Enhanced retry mechanism with exponential backoff and jitter
 * @param {Function} operation - Async operation to retry
 * @param {Object} config - Retry configuration
 * @param {string} context - Context for logging
 * @returns {Promise} Result of the operation
 */
export const retryWithBackoff = async (operation, config = RETRY_CONFIG.DEFAULT, context = '') => {
  let lastError
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier, jitter } = config

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 1) {
        logError(
          new Error(`Operation succeeded after ${attempt} attempts`),
          `${context}.retry_success`,
          { attempt, maxRetries },
          ERROR_SEVERITY.LOW
        )
      }
      
      return result
    } catch (error) {
      lastError = error
      
      // Don't retry certain types of errors
      if (isNonRetryableError(error)) {
        logError(error, `${context}.non_retryable`, { attempt }, ERROR_SEVERITY.MEDIUM)
        throw error
      }

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5)
        }

        logError(
          error,
          `${context}.retry_attempt`,
          { attempt, maxRetries, nextRetryIn: delay },
          ERROR_SEVERITY.LOW
        )

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Log final failure
  logError(
    lastError,
    `${context}.retry_exhausted`,
    { maxRetries },
    ERROR_SEVERITY.HIGH
  )

  throw lastError
}

/**
 * Check if an error should not be retried
 * @param {Error} error - Error to check
 * @returns {boolean} Whether the error is non-retryable
 */
const isNonRetryableError = (error) => {
  // Authentication and authorization errors shouldn't be retried
  if (error.code === 'PGRST301' || error.code === '42501') return true
  if (error.message?.includes('invalid login credentials')) return true
  if (error.message?.includes('unauthorized')) return true
  
  // Validation errors shouldn't be retried
  if (error.code === '23502' || error.code === '23505') return true
  
  // Client errors (4xx) generally shouldn't be retried
  if (error.status >= 400 && error.status < 500) return true
  
  return false
}

/**
 * Enhanced API error handler with categorization and severity
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted error response
 */
export const handleApiError = (error, context = '', metadata = {}) => {
  const errorInfo = analyzeError(error)
  
  // Log the error with appropriate severity
  logError(error, context, metadata, errorInfo.severity)

  // Determine if error should trigger recovery mechanisms
  if (errorInfo.category === ERROR_CATEGORIES.NETWORK && errorInfo.isRecoverable) {
    // Could trigger circuit breaker or fallback mechanisms here
    console.warn(`Recoverable ${errorInfo.category} error in ${context}`)
  }

  return {
    success: false,
    error: {
      message: errorInfo.message,
      code: errorInfo.code,
      category: errorInfo.category,
      severity: errorInfo.severity,
      isRecoverable: errorInfo.isRecoverable,
      details: errorInfo.details,
      context,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Analyze error to determine category, severity, and recovery options
 * @param {Error} error - Error to analyze
 * @returns {Object} Error analysis
 */
const analyzeError = (error) => {
  let message = DEFAULT_ERROR_MESSAGE
  let code = 'unknown_error'
  let category = ERROR_CATEGORIES.SYSTEM
  let severity = ERROR_SEVERITY.MEDIUM
  let isRecoverable = false
  let details = null

  if (error) {
    // Handle Supabase auth errors
    if (error.message) {
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('invalid login credentials')) {
        message = ERROR_MESSAGES.invalid_credentials
        code = 'invalid_credentials'
        category = ERROR_CATEGORIES.AUTHENTICATION
        severity = ERROR_SEVERITY.LOW
        isRecoverable = false
      } else if (errorMessage.includes('email not confirmed')) {
        message = ERROR_MESSAGES.email_not_confirmed
        code = 'email_not_confirmed'
        category = ERROR_CATEGORIES.AUTHENTICATION
        severity = ERROR_SEVERITY.MEDIUM
        isRecoverable = true
      } else if (errorMessage.includes('user not found')) {
        message = ERROR_MESSAGES.user_not_found
        code = 'user_not_found'
        category = ERROR_CATEGORIES.AUTHENTICATION
        severity = ERROR_SEVERITY.LOW
        isRecoverable = false
      } else if (errorMessage.includes('password')) {
        message = ERROR_MESSAGES.weak_password
        code = 'weak_password'
        category = ERROR_CATEGORIES.VALIDATION
        severity = ERROR_SEVERITY.LOW
        isRecoverable = true
      } else if (errorMessage.includes('email') && errorMessage.includes('already')) {
        message = ERROR_MESSAGES.email_already_registered
        code = 'email_already_registered'
        category = ERROR_CATEGORIES.VALIDATION
        severity = ERROR_SEVERITY.LOW
        isRecoverable = false
      } else if (errorMessage.includes('signup') && errorMessage.includes('disabled')) {
        message = ERROR_MESSAGES.signup_disabled
        code = 'signup_disabled'
        category = ERROR_CATEGORIES.BUSINESS_LOGIC
        severity = ERROR_SEVERITY.MEDIUM
        isRecoverable = false
      } else if (errorMessage.includes('invalid email')) {
        message = ERROR_MESSAGES.invalid_email
        code = 'invalid_email'
        category = ERROR_CATEGORIES.VALIDATION
        severity = ERROR_SEVERITY.LOW
        isRecoverable = true
      } else if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        message = ERROR_MESSAGES.session_expired
        code = 'session_expired'
        category = ERROR_CATEGORIES.AUTHENTICATION
        severity = ERROR_SEVERITY.MEDIUM
        isRecoverable = true
      } else if (errorMessage.includes('rate limit')) {
        message = ERROR_MESSAGES.rate_limit_exceeded
        code = 'rate_limit_exceeded'
        category = ERROR_CATEGORIES.BUSINESS_LOGIC
        severity = ERROR_SEVERITY.MEDIUM
        isRecoverable = true
      }
    }

    // Handle Supabase database errors
    if (error.code) {
      if (ERROR_MESSAGES[error.code]) {
        message = ERROR_MESSAGES[error.code]
        code = error.code
        category = ERROR_CATEGORIES.DATABASE
        
        // Set severity based on error type
        if (error.code === 'PGRST301' || error.code === '42501') {
          severity = ERROR_SEVERITY.MEDIUM
          category = ERROR_CATEGORIES.AUTHORIZATION
          isRecoverable = false
        } else if (error.code === '23505' || error.code === '23502') {
          severity = ERROR_SEVERITY.LOW
          category = ERROR_CATEGORIES.VALIDATION
          isRecoverable = true
        } else if (error.code === '08006') {
          severity = ERROR_SEVERITY.HIGH
          category = ERROR_CATEGORIES.DATABASE
          isRecoverable = true
        }
      }
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      message = ERROR_MESSAGES.network_error
      code = 'network_error'
      category = ERROR_CATEGORIES.NETWORK
      severity = ERROR_SEVERITY.HIGH
      isRecoverable = true
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      message = ERROR_MESSAGES.timeout
      code = 'timeout'
      category = ERROR_CATEGORIES.NETWORK
      severity = ERROR_SEVERITY.MEDIUM
      isRecoverable = true
    }

    // Handle server errors (5xx)
    if (error.status >= 500) {
      message = ERROR_MESSAGES.server_error
      code = 'server_error'
      category = ERROR_CATEGORIES.SYSTEM
      severity = ERROR_SEVERITY.HIGH
      isRecoverable = true
    }

    // Handle storage errors
    if (error.message?.includes('storage/')) {
      category = ERROR_CATEGORIES.STORAGE
      severity = ERROR_SEVERITY.MEDIUM
      isRecoverable = true
    }

    // Store original error details for debugging
    details = {
      originalMessage: error.message,
      originalCode: error.code,
      status: error.status,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
  }

  return {
    message,
    code,
    category,
    severity,
    isRecoverable,
    details
  }
}

/**
 * Handle validation errors
 * @param {Object} validationErrors - Validation error object
 * @returns {Object} Formatted validation error response
 */
export const handleValidationError = (validationErrors) => {
  console.error('Validation Error:', validationErrors)

  const errors = {}
  
  if (typeof validationErrors === 'object') {
    Object.entries(validationErrors).forEach(([field, error]) => {
      if (typeof error === 'string') {
        errors[field] = error
      } else if (error.message) {
        errors[field] = error.message
      } else {
        errors[field] = ERROR_MESSAGES.validation_error
      }
    })
  }

  return {
    success: false,
    error: {
      message: ERROR_MESSAGES.validation_error,
      code: 'validation_error',
      fields: errors
    }
  }
}

/**
 * Enhanced wrapper for async functions with error handling and retry logic
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error reporting
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped function
 */
export const withErrorHandling = (fn, context, options = {}) => {
  const {
    retryConfig = null,
    fallback = null,
    timeout = null,
    validateResult = null
  } = options

  return async (...args) => {
    const operation = async () => {
      let result

      // Apply timeout if specified
      if (timeout) {
        result = await Promise.race([
          fn(...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ])
      } else {
        result = await fn(...args)
      }

      // Validate result if validator provided
      if (validateResult && !validateResult(result)) {
        throw new Error('Result validation failed')
      }

      return result
    }

    try {
      let result
      
      // Apply retry logic if configured
      if (retryConfig) {
        result = await retryWithBackoff(operation, retryConfig, context)
      } else {
        result = await operation()
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      // Try fallback if available
      if (fallback) {
        try {
          const fallbackResult = await fallback(error, ...args)
          logError(
            new Error(`Fallback used for ${context}`),
            `${context}.fallback_success`,
            { originalError: error.message },
            ERROR_SEVERITY.MEDIUM
          )
          return {
            success: true,
            data: fallbackResult,
            usedFallback: true
          }
        } catch (fallbackError) {
          logError(
            fallbackError,
            `${context}.fallback_failed`,
            { originalError: error.message },
            ERROR_SEVERITY.HIGH
          )
        }
      }

      return handleApiError(error, context)
    }
  }
}

/**
 * Circuit breaker pattern implementation for preventing cascade failures
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 60000
    this.monitoringPeriod = options.monitoringPeriod || 10000
    
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.lastFailureTime = null
    this.successCount = 0
  }

  async execute(operation, context = '') {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        logError(
          new Error('Circuit breaker transitioning to HALF_OPEN'),
          `${context}.circuit_breaker`,
          { state: this.state },
          ERROR_SEVERITY.MEDIUM
        )
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked')
      }
    }

    try {
      const result = await operation()
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++
        if (this.successCount >= 3) {
          this.state = 'CLOSED'
          this.failureCount = 0
          logError(
            new Error('Circuit breaker reset to CLOSED'),
            `${context}.circuit_breaker`,
            { state: this.state },
            ERROR_SEVERITY.LOW
          )
        }
      } else {
        this.failureCount = Math.max(0, this.failureCount - 1)
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN'
        logError(
          new Error('Circuit breaker opened due to failures'),
          `${context}.circuit_breaker`,
          { 
            state: this.state, 
            failureCount: this.failureCount,
            threshold: this.failureThreshold 
          },
          ERROR_SEVERITY.HIGH
        )
      }

      throw error
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = null
    this.successCount = 0
  }
}

/**
 * Global circuit breakers for different services
 */
export const circuitBreakers = {
  database: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 }),
  storage: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
  external: new CircuitBreaker({ failureThreshold: 10, resetTimeout: 120000 })
}

/**
 * Enhanced error logging with severity levels and monitoring integration
 * @param {Error} error - Error to log
 * @param {string} context - Context where error occurred
 * @param {Object} metadata - Additional metadata
 * @param {string} severity - Error severity level
 */
export const logError = (error, context = '', metadata = {}, severity = ERROR_SEVERITY.MEDIUM) => {
  const errorInfo = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    severity,
    context,
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    },
    metadata,
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null,
      timestamp: Date.now()
    },
    user: getCurrentUserInfo(),
    session: getSessionInfo()
  }

  // Console logging with appropriate level
  const logMethod = getLogMethod(severity)
  logMethod('Error Log:', errorInfo)

  // Store error in local storage for debugging (development only)
  if (import.meta.env.DEV) {
    storeErrorLocally(errorInfo)
  }

  // Send to monitoring service in production
  if (import.meta.env.PROD) {
    sendToMonitoringService(errorInfo)
  }

  // Trigger alerts for critical errors
  if (severity === ERROR_SEVERITY.CRITICAL) {
    triggerCriticalErrorAlert(errorInfo)
  }

  return errorInfo.id
}

/**
 * Generate unique error ID for tracking
 * @returns {string} Unique error ID
 */
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get appropriate console log method based on severity
 * @param {string} severity - Error severity
 * @returns {Function} Console log method
 */
const getLogMethod = (severity) => {
  switch (severity) {
    case ERROR_SEVERITY.LOW:
      return console.info
    case ERROR_SEVERITY.MEDIUM:
      return console.warn
    case ERROR_SEVERITY.HIGH:
    case ERROR_SEVERITY.CRITICAL:
      return console.error
    default:
      return console.log
  }
}

/**
 * Get current user information for error context
 * @returns {Object|null} User information
 */
const getCurrentUserInfo = () => {
  try {
    // Try to get user info from auth context or local storage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  } catch (e) {
    // Ignore errors getting user info
  }
  return null
}

/**
 * Get session information for error context
 * @returns {Object} Session information
 */
const getSessionInfo = () => {
  try {
    return {
      sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      startTime: sessionStorage.getItem('sessionStart') || Date.now(),
      pageLoadTime: performance.now()
    }
  } catch (e) {
    return {
      sessionId: 'unknown',
      startTime: Date.now(),
      pageLoadTime: 0
    }
  }
}

/**
 * Store error locally for development debugging
 * @param {Object} errorInfo - Error information
 */
const storeErrorLocally = (errorInfo) => {
  try {
    const errors = JSON.parse(localStorage.getItem('dev_errors') || '[]')
    errors.unshift(errorInfo)
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors.splice(50)
    }
    
    localStorage.setItem('dev_errors', JSON.stringify(errors))
  } catch (e) {
    console.warn('Failed to store error locally:', e)
  }
}

/**
 * Send error to monitoring service
 * @param {Object} errorInfo - Error information
 */
const sendToMonitoringService = async (errorInfo) => {
  try {
    // In a real implementation, this would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging endpoint
    
    // Example implementation:
    /*
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorInfo)
    })
    */
    
    console.info('Error would be sent to monitoring service:', errorInfo.id)
  } catch (e) {
    console.warn('Failed to send error to monitoring service:', e)
  }
}

/**
 * Trigger alert for critical errors
 * @param {Object} errorInfo - Error information
 */
const triggerCriticalErrorAlert = (errorInfo) => {
  try {
    // In a real implementation, this could:
    // - Send email alerts
    // - Trigger Slack notifications
    // - Create incident tickets
    // - Send SMS alerts
    
    console.error('CRITICAL ERROR ALERT:', errorInfo)
    
    // Could also show user-facing notification for critical errors
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('criticalError', {
        detail: {
          id: errorInfo.id,
          message: 'אירעה שגיאה קריטית במערכת. צוות התמיכה קיבל התראה.'
        }
      }))
    }
  } catch (e) {
    console.warn('Failed to trigger critical error alert:', e)
  }
}

/**
 * Create a standardized success response
 * @param {*} data - Response data
 * @param {string} message - Success message (optional)
 * @returns {Object} Formatted success response
 */
export const createSuccessResponse = (data, message = null) => {
  return {
    success: true,
    data,
    message
  }
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {*} details - Additional error details
 * @returns {Object} Formatted error response
 */
export const createErrorResponse = (message, code = 'unknown_error', details = null) => {
  return {
    success: false,
    error: {
      message,
      code,
      details
    }
  }
}

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object|null} Validation error or null if valid
 */
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {}
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = ERROR_MESSAGES.required_field
    }
  })

  return Object.keys(errors).length > 0 ? handleValidationError(errors) : null
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (Israeli format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone is valid
 */
export const validatePhone = (phone) => {
  // Israeli phone number formats: 05X-XXXXXXX, 0X-XXXXXXX, etc.
  const phoneRegex = /^0[2-9]\d{7,8}$/
  return phoneRegex.test(phone.replace(/[-\s]/g, ''))
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Enhanced error recovery mechanisms
 */
export const errorRecovery = {
  /**
   * Attempt to recover from authentication errors
   * @param {Error} error - Authentication error
   * @returns {Promise<boolean>} Whether recovery was successful
   */
  async recoverFromAuthError(error) {
    try {
      if (error.code === 'session_expired') {
        // Try to refresh the session
        const { supabase } = await import('@/lib/supabase')
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        
        if (!refreshError && data.session) {
          logError(
            new Error('Session recovered successfully'),
            'errorRecovery.recoverFromAuthError',
            { originalError: error.message },
            ERROR_SEVERITY.LOW
          )
          return true
        }
      }
    } catch (recoveryError) {
      logError(
        recoveryError,
        'errorRecovery.recoverFromAuthError.failed',
        { originalError: error.message },
        ERROR_SEVERITY.MEDIUM
      )
    }
    
    return false
  },

  /**
   * Attempt to recover from network errors
   * @param {Error} error - Network error
   * @returns {Promise<boolean>} Whether recovery was successful
   */
  async recoverFromNetworkError(error) {
    try {
      // Check if network is available
      if (navigator.onLine === false) {
        // Wait for network to come back online
        return new Promise((resolve) => {
          const handleOnline = () => {
            window.removeEventListener('online', handleOnline)
            logError(
              new Error('Network recovered'),
              'errorRecovery.recoverFromNetworkError',
              { originalError: error.message },
              ERROR_SEVERITY.LOW
            )
            resolve(true)
          }
          
          window.addEventListener('online', handleOnline)
          
          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('online', handleOnline)
            resolve(false)
          }, 30000)
        })
      }
    } catch (recoveryError) {
      logError(
        recoveryError,
        'errorRecovery.recoverFromNetworkError.failed',
        { originalError: error.message },
        ERROR_SEVERITY.MEDIUM
      )
    }
    
    return false
  }
}

/**
 * Error monitoring and analytics
 */
export const errorMonitoring = {
  /**
   * Get error statistics for monitoring dashboard
   * @param {number} timeframe - Timeframe in milliseconds
   * @returns {Object} Error statistics
   */
  getErrorStats(timeframe = 24 * 60 * 60 * 1000) { // Default: 24 hours
    try {
      const errors = JSON.parse(localStorage.getItem('dev_errors') || '[]')
      const cutoff = Date.now() - timeframe
      
      const recentErrors = errors.filter(error => 
        new Date(error.timestamp).getTime() > cutoff
      )

      const stats = {
        total: recentErrors.length,
        bySeverity: {},
        byCategory: {},
        byContext: {},
        trends: []
      }

      // Count by severity
      Object.values(ERROR_SEVERITY).forEach(severity => {
        stats.bySeverity[severity] = recentErrors.filter(e => e.severity === severity).length
      })

      // Count by category (if available)
      recentErrors.forEach(error => {
        const category = error.error?.category || 'unknown'
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
        
        const context = error.context || 'unknown'
        stats.byContext[context] = (stats.byContext[context] || 0) + 1
      })

      return stats
    } catch (e) {
      console.warn('Failed to get error stats:', e)
      return {
        total: 0,
        bySeverity: {},
        byCategory: {},
        byContext: {},
        trends: []
      }
    }
  },

  /**
   * Clear old error logs
   * @param {number} maxAge - Maximum age in milliseconds
   */
  clearOldErrors(maxAge = 7 * 24 * 60 * 60 * 1000) { // Default: 7 days
    try {
      const errors = JSON.parse(localStorage.getItem('dev_errors') || '[]')
      const cutoff = Date.now() - maxAge
      
      const recentErrors = errors.filter(error => 
        new Date(error.timestamp).getTime() > cutoff
      )

      localStorage.setItem('dev_errors', JSON.stringify(recentErrors))
      
      const removedCount = errors.length - recentErrors.length
      if (removedCount > 0) {
        console.info(`Cleared ${removedCount} old error logs`)
      }
    } catch (e) {
      console.warn('Failed to clear old errors:', e)
    }
  }
}

/**
 * Initialize error handling system
 */
export const initializeErrorHandling = () => {
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError(
        new Error(event.reason),
        'global.unhandledrejection',
        { 
          promise: event.promise,
          reason: event.reason 
        },
        ERROR_SEVERITY.HIGH
      )
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      logError(
        new Error(event.message),
        'global.javascript_error',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        },
        ERROR_SEVERITY.HIGH
      )
    })

    // Clean up old errors periodically
    setInterval(() => {
      errorMonitoring.clearOldErrors()
    }, 60 * 60 * 1000) // Every hour
  }

  console.info('Enhanced error handling system initialized')
}

export default {
  // Core functions
  handleApiError,
  handleValidationError,
  withErrorHandling,
  logError,
  createSuccessResponse,
  createErrorResponse,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  sanitizeInput,
  
  // Enhanced functions
  retryWithBackoff,
  CircuitBreaker,
  circuitBreakers,
  errorRecovery,
  errorMonitoring,
  initializeErrorHandling,
  
  // Constants
  ERROR_MESSAGES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  RETRY_CONFIG
}