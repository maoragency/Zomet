/**
 * Configuration for API integrations
 * Centralized configuration for all integration services
 */

// Default configuration for file uploads
export const UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_FILE_SIZE: 1024, // 1KB
  
  // Allowed file types
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ],
  
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  
  // Image optimization settings
  IMAGE_OPTIMIZATION: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'jpeg'
  },
  
  // Thumbnail settings
  THUMBNAIL_CONFIG: {
    width: 300,
    height: 200,
    quality: 0.7,
    format: 'jpeg'
  },
  
  // Storage bucket configuration
  STORAGE_BUCKET: 'vehicle-images',
  
  // Upload retry configuration
  RETRY_CONFIG: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  }
}

// Email service configuration
export const EMAIL_CONFIG = {
  // Default sender
  DEFAULT_FROM: 'noreply@zomet.co.il',
  
  // Email validation regex
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Retry configuration
  RETRY_CONFIG: {
    maxRetries: 2,
    retryDelay: 2000
  },
  
  // Edge function name
  EDGE_FUNCTION_NAME: 'send-email',
  
  // Email templates
  TEMPLATES: {
    CONTACT_INQUIRY: 'contact-inquiry',
    VEHICLE_INQUIRY: 'vehicle-inquiry',
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset'
  }
}

// LLM service configuration
export const LLM_CONFIG = {
  // Default model settings
  DEFAULT_MODEL: 'gpt-4',
  DEFAULT_MAX_TOKENS: 1000,
  DEFAULT_TEMPERATURE: 0.7,
  
  // Prompt validation
  MIN_PROMPT_LENGTH: 10,
  MAX_PROMPT_LENGTH: 10000,
  
  // Retry configuration
  RETRY_CONFIG: {
    maxRetries: 2,
    retryDelay: 3000
  },
  
  // Edge function name
  EDGE_FUNCTION_NAME: 'invoke-llm',
  
  // Context types
  CONTEXT_TYPES: {
    VEHICLE_PRICING: 'vehicle-pricing',
    CONTACT_INQUIRY: 'contact-inquiry',
    GENERAL_AUTO: 'general-automotive',
    MARKET_ANALYSIS: 'market-analysis'
  },
  
  // Fallback response confidence levels
  CONFIDENCE_LEVELS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.3
  }
}

// General integration configuration
export const INTEGRATION_CONFIG = {
  // Version information
  VERSION: '1.0.0',
  
  // Health check configuration
  HEALTH_CHECK: {
    timeout: 5000,
    retryAttempts: 1
  },
  
  // Error handling
  ERROR_HANDLING: {
    logErrors: true,
    includeStackTrace: process.env.NODE_ENV === 'development',
    enhanceErrors: true
  },
  
  // Rate limiting (if implemented)
  RATE_LIMITING: {
    enabled: false,
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000
  }
}

// Environment-specific overrides
export const getEnvironmentConfig = () => {
  const env = import.meta.env.VITE_APP_ENV || 'development'
  
  const configs = {
    development: {
      ...INTEGRATION_CONFIG,
      ERROR_HANDLING: {
        ...INTEGRATION_CONFIG.ERROR_HANDLING,
        logErrors: true,
        includeStackTrace: true
      }
    },
    
    production: {
      ...INTEGRATION_CONFIG,
      ERROR_HANDLING: {
        ...INTEGRATION_CONFIG.ERROR_HANDLING,
        logErrors: false,
        includeStackTrace: false
      }
    },
    
    test: {
      ...INTEGRATION_CONFIG,
      HEALTH_CHECK: {
        ...INTEGRATION_CONFIG.HEALTH_CHECK,
        timeout: 1000
      }
    }
  }
  
  return configs[env] || configs.development
}

// Validation schemas (basic)
export const VALIDATION_SCHEMAS = {
  uploadFile: {
    required: ['file'],
    optional: ['path', 'options', 'onProgress']
  },
  
  sendEmail: {
    required: ['to', 'subject', 'message'],
    optional: ['from', 'replyTo', 'attachments', 'options']
  },
  
  invokeLLM: {
    required: ['prompt'],
    optional: ['add_context_from_internet', 'model', 'max_tokens', 'temperature', 'context', 'options']
  }
}

// Error codes and messages
export const ERROR_CODES = {
  // File upload errors
  UPLOAD_FILE_REQUIRED: 'UPLOAD_001',
  UPLOAD_VALIDATION_FAILED: 'UPLOAD_002',
  UPLOAD_SIZE_EXCEEDED: 'UPLOAD_003',
  UPLOAD_TYPE_NOT_ALLOWED: 'UPLOAD_004',
  
  // Email errors
  EMAIL_INVALID_RECIPIENT: 'EMAIL_001',
  EMAIL_MISSING_FIELDS: 'EMAIL_002',
  EMAIL_SEND_FAILED: 'EMAIL_003',
  
  // LLM errors
  LLM_INVALID_PROMPT: 'LLM_001',
  LLM_PROMPT_TOO_SHORT: 'LLM_002',
  LLM_PROMPT_TOO_LONG: 'LLM_003',
  LLM_SERVICE_UNAVAILABLE: 'LLM_004',
  
  // General errors
  INVALID_PARAMETERS: 'GEN_001',
  SERVICE_UNAVAILABLE: 'GEN_002',
  RETRY_LIMIT_EXCEEDED: 'GEN_003'
}

export default {
  UPLOAD_CONFIG,
  EMAIL_CONFIG,
  LLM_CONFIG,
  INTEGRATION_CONFIG,
  VALIDATION_SCHEMAS,
  ERROR_CODES,
  getEnvironmentConfig
}