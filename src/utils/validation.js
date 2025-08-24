/**
 * Comprehensive form validation and input sanitization utilities
 * Provides client-side validation with Hebrew error messages
 * Includes XSS prevention and injection attack protection
 */

import { sanitizeInput, ERROR_MESSAGES } from './errorHandler'

/**
 * Validation rule types
 */
export const VALIDATION_RULES = {
  REQUIRED: 'required',
  EMAIL: 'email',
  PHONE: 'phone',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern',
  NUMERIC: 'numeric',
  POSITIVE_NUMBER: 'positiveNumber',
  INTEGER: 'integer',
  URL: 'url',
  DATE: 'date',
  FUTURE_DATE: 'futureDate',
  PAST_DATE: 'pastDate',
  STRONG_PASSWORD: 'strongPassword',
  CONFIRM_PASSWORD: 'confirmPassword',
  HEBREW_TEXT: 'hebrewText',
  ENGLISH_TEXT: 'englishText',
  ALPHANUMERIC: 'alphanumeric',
  NO_SPECIAL_CHARS: 'noSpecialChars',
  SAFE_HTML: 'safeHtml',
  FILE_SIZE: 'fileSize',
  FILE_TYPE: 'fileType',
  CUSTOM: 'custom'
}

/**
 * Hebrew validation error messages
 */
const VALIDATION_MESSAGES = {
  [VALIDATION_RULES.REQUIRED]: 'שדה זה הוא חובה',
  [VALIDATION_RULES.EMAIL]: 'כתובת אימייל לא תקינה',
  [VALIDATION_RULES.PHONE]: 'מספר טלפון לא תקין',
  [VALIDATION_RULES.MIN_LENGTH]: 'הערך קצר מדי (מינימום {min} תווים)',
  [VALIDATION_RULES.MAX_LENGTH]: 'הערך ארוך מדי (מקסימום {max} תווים)',
  [VALIDATION_RULES.PATTERN]: 'פורמט לא תקין',
  [VALIDATION_RULES.NUMERIC]: 'יש להזין מספר בלבד',
  [VALIDATION_RULES.POSITIVE_NUMBER]: 'יש להזין מספר חיובי',
  [VALIDATION_RULES.INTEGER]: 'יש להזין מספר שלם',
  [VALIDATION_RULES.URL]: 'כתובת אתר לא תקינה',
  [VALIDATION_RULES.DATE]: 'תאריך לא תקין',
  [VALIDATION_RULES.FUTURE_DATE]: 'התאריך חייב להיות בעתיד',
  [VALIDATION_RULES.PAST_DATE]: 'התאריך חייב להיות בעבר',
  [VALIDATION_RULES.STRONG_PASSWORD]: 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר',
  [VALIDATION_RULES.CONFIRM_PASSWORD]: 'הסיסמאות אינן תואמות',
  [VALIDATION_RULES.HEBREW_TEXT]: 'יש להזין טקסט בעברית בלבד',
  [VALIDATION_RULES.ENGLISH_TEXT]: 'יש להזין טקסט באנגלית בלבד',
  [VALIDATION_RULES.ALPHANUMERIC]: 'יש להזין אותיות ומספרים בלבד',
  [VALIDATION_RULES.NO_SPECIAL_CHARS]: 'אסור להזין תווים מיוחדים',
  [VALIDATION_RULES.SAFE_HTML]: 'הטקסט מכיל תוכן לא בטוח',
  [VALIDATION_RULES.FILE_SIZE]: 'גודל הקובץ חורג מהמותר',
  [VALIDATION_RULES.FILE_TYPE]: 'סוג קובץ לא נתמך'
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_IL: /^0[2-9]\d{7,8}$/,
  HEBREW: /^[\u0590-\u05FF\s\d.,!?'"()-]+$/,
  ENGLISH: /^[a-zA-Z\s\d.,!?'"()-]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_HEBREW: /^[\u0590-\u05FFa-zA-Z0-9\s]+$/,
  NO_SPECIAL_CHARS: /^[a-zA-Z0-9\u0590-\u05FF\s]+$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  NUMERIC: /^\d+(\.\d+)?$/,
  INTEGER: /^\d+$/,
  POSITIVE_NUMBER: /^[1-9]\d*(\.\d+)?$/
}

/**
 * Validation rule creators
 */
export const validationRules = {
  required: (message) => ({
    type: VALIDATION_RULES.REQUIRED,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.REQUIRED]
  }),

  email: (message) => ({
    type: VALIDATION_RULES.EMAIL,
    pattern: VALIDATION_PATTERNS.EMAIL,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.EMAIL]
  }),

  phone: (message) => ({
    type: VALIDATION_RULES.PHONE,
    pattern: VALIDATION_PATTERNS.PHONE_IL,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.PHONE]
  }),

  minLength: (min, message) => ({
    type: VALIDATION_RULES.MIN_LENGTH,
    min,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.MIN_LENGTH].replace('{min}', min)
  }),

  maxLength: (max, message) => ({
    type: VALIDATION_RULES.MAX_LENGTH,
    max,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.MAX_LENGTH].replace('{max}', max)
  }),

  pattern: (pattern, message) => ({
    type: VALIDATION_RULES.PATTERN,
    pattern,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.PATTERN]
  }),

  numeric: (message) => ({
    type: VALIDATION_RULES.NUMERIC,
    pattern: VALIDATION_PATTERNS.NUMERIC,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.NUMERIC]
  }),

  positiveNumber: (message) => ({
    type: VALIDATION_RULES.POSITIVE_NUMBER,
    pattern: VALIDATION_PATTERNS.POSITIVE_NUMBER,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.POSITIVE_NUMBER]
  }),

  integer: (message) => ({
    type: VALIDATION_RULES.INTEGER,
    pattern: VALIDATION_PATTERNS.INTEGER,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.INTEGER]
  }),

  url: (message) => ({
    type: VALIDATION_RULES.URL,
    pattern: VALIDATION_PATTERNS.URL,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.URL]
  }),

  strongPassword: (message) => ({
    type: VALIDATION_RULES.STRONG_PASSWORD,
    pattern: VALIDATION_PATTERNS.STRONG_PASSWORD,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.STRONG_PASSWORD]
  }),

  confirmPassword: (passwordField, message) => ({
    type: VALIDATION_RULES.CONFIRM_PASSWORD,
    compareField: passwordField,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.CONFIRM_PASSWORD]
  }),

  hebrewText: (message) => ({
    type: VALIDATION_RULES.HEBREW_TEXT,
    pattern: VALIDATION_PATTERNS.HEBREW,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.HEBREW_TEXT]
  }),

  englishText: (message) => ({
    type: VALIDATION_RULES.ENGLISH_TEXT,
    pattern: VALIDATION_PATTERNS.ENGLISH,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.ENGLISH_TEXT]
  }),

  alphanumeric: (message) => ({
    type: VALIDATION_RULES.ALPHANUMERIC,
    pattern: VALIDATION_PATTERNS.ALPHANUMERIC_HEBREW,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.ALPHANUMERIC]
  }),

  noSpecialChars: (message) => ({
    type: VALIDATION_RULES.NO_SPECIAL_CHARS,
    pattern: VALIDATION_PATTERNS.NO_SPECIAL_CHARS,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.NO_SPECIAL_CHARS]
  }),

  fileSize: (maxSizeBytes, message) => ({
    type: VALIDATION_RULES.FILE_SIZE,
    maxSize: maxSizeBytes,
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.FILE_SIZE]
  }),

  fileType: (allowedTypes, message) => ({
    type: VALIDATION_RULES.FILE_TYPE,
    allowedTypes: Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes],
    message: message || VALIDATION_MESSAGES[VALIDATION_RULES.FILE_TYPE]
  }),

  custom: (validator, message) => ({
    type: VALIDATION_RULES.CUSTOM,
    validator,
    message: message || 'ערך לא תקין'
  })
}

/**
 * Validate a single field against its rules
 * @param {*} value - Value to validate
 * @param {Array} rules - Array of validation rules
 * @param {Object} allValues - All form values (for cross-field validation)
 * @returns {string|null} Error message or null if valid
 */
export const validateField = (value, rules = [], allValues = {}) => {
  // Convert value to string for most validations
  const stringValue = value?.toString() || ''
  const trimmedValue = stringValue.trim()

  for (const rule of rules) {
    switch (rule.type) {
      case VALIDATION_RULES.REQUIRED:
        if (!value || trimmedValue === '') {
          return rule.message
        }
        break

      case VALIDATION_RULES.EMAIL:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.PHONE:
        if (trimmedValue) {
          const cleanPhone = trimmedValue.replace(/[-\s]/g, '')
          if (!rule.pattern.test(cleanPhone)) {
            return rule.message
          }
        }
        break

      case VALIDATION_RULES.MIN_LENGTH:
        if (trimmedValue && trimmedValue.length < rule.min) {
          return rule.message
        }
        break

      case VALIDATION_RULES.MAX_LENGTH:
        if (trimmedValue && trimmedValue.length > rule.max) {
          return rule.message
        }
        break

      case VALIDATION_RULES.PATTERN:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.NUMERIC:
      case VALIDATION_RULES.POSITIVE_NUMBER:
      case VALIDATION_RULES.INTEGER:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.URL:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.DATE:
        if (trimmedValue) {
          const date = new Date(trimmedValue)
          if (isNaN(date.getTime())) {
            return rule.message
          }
        }
        break

      case VALIDATION_RULES.FUTURE_DATE:
        if (trimmedValue) {
          const date = new Date(trimmedValue)
          if (isNaN(date.getTime()) || date <= new Date()) {
            return rule.message
          }
        }
        break

      case VALIDATION_RULES.PAST_DATE:
        if (trimmedValue) {
          const date = new Date(trimmedValue)
          if (isNaN(date.getTime()) || date >= new Date()) {
            return rule.message
          }
        }
        break

      case VALIDATION_RULES.STRONG_PASSWORD:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.CONFIRM_PASSWORD:
        if (trimmedValue !== allValues[rule.compareField]) {
          return rule.message
        }
        break

      case VALIDATION_RULES.HEBREW_TEXT:
      case VALIDATION_RULES.ENGLISH_TEXT:
      case VALIDATION_RULES.ALPHANUMERIC:
      case VALIDATION_RULES.NO_SPECIAL_CHARS:
        if (trimmedValue && !rule.pattern.test(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.SAFE_HTML:
        if (trimmedValue && containsUnsafeContent(trimmedValue)) {
          return rule.message
        }
        break

      case VALIDATION_RULES.FILE_SIZE:
        if (value instanceof File && value.size > rule.maxSize) {
          return rule.message
        }
        break

      case VALIDATION_RULES.FILE_TYPE:
        if (value instanceof File) {
          const fileType = value.type.toLowerCase()
          const fileName = value.name.toLowerCase()
          const fileExtension = fileName.split('.').pop()
          
          const isAllowed = rule.allowedTypes.some(type => 
            fileType.includes(type.toLowerCase()) || 
            fileName.endsWith(`.${type.toLowerCase()}`) ||
            fileExtension === type.toLowerCase()
          )
          
          if (!isAllowed) {
            return rule.message
          }
        }
        break

      case VALIDATION_RULES.CUSTOM:
        if (rule.validator && !rule.validator(value, allValues)) {
          return rule.message
        }
        break
    }
  }

  return null
}

/**
 * Validate entire form
 * @param {Object} values - Form values
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation errors
 */
export const validateForm = (values, schema) => {
  const errors = {}

  Object.keys(schema).forEach(fieldName => {
    const fieldRules = schema[fieldName]
    const fieldValue = values[fieldName]
    
    const error = validateField(fieldValue, fieldRules, values)
    if (error) {
      errors[fieldName] = error
    }
  })

  return errors
}

/**
 * Check if form has any errors
 * @param {Object} errors - Validation errors object
 * @returns {boolean} Whether form has errors
 */
export const hasFormErrors = (errors) => {
  return Object.keys(errors).length > 0
}

/**
 * Advanced input sanitization
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
export const sanitizeFormInput = (input, options = {}) => {
  if (typeof input !== 'string') return input

  let sanitized = input

  // Basic XSS prevention (already in errorHandler, but enhanced here)
  sanitized = sanitizeInput(sanitized)

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Trim whitespace if requested
  if (options.trim !== false) {
    sanitized = sanitized.trim()
  }

  // Normalize whitespace
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ')
  }

  // Remove HTML tags if requested
  if (options.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Limit length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }

  return sanitized
}

/**
 * Check for unsafe content in HTML
 * @param {string} html - HTML content to check
 * @returns {boolean} Whether content is unsafe
 */
const containsUnsafeContent = (html) => {
  const unsafePatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<form\b[^>]*>/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ]

  return unsafePatterns.some(pattern => pattern.test(html))
}

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj, options = {}) => {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'string') {
    return sanitizeFormInput(obj, options)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }
  
  if (typeof obj === 'object') {
    const sanitized = {}
    Object.keys(obj).forEach(key => {
      const sanitizedKey = sanitizeFormInput(key, { stripHtml: true, trim: true })
      sanitized[sanitizedKey] = sanitizeObject(obj[key], options)
    })
    return sanitized
  }
  
  return obj
}

/**
 * Common validation schemas for forms
 */
export const commonSchemas = {
  // User registration form
  userRegistration: {
    email: [
      validationRules.required(),
      validationRules.email(),
      validationRules.maxLength(255)
    ],
    password: [
      validationRules.required(),
      validationRules.strongPassword(),
      validationRules.minLength(8),
      validationRules.maxLength(128)
    ],
    confirmPassword: [
      validationRules.required(),
      validationRules.confirmPassword('password')
    ],
    fullName: [
      validationRules.required(),
      validationRules.minLength(2),
      validationRules.maxLength(100),
      validationRules.noSpecialChars()
    ],
    phone: [
      validationRules.phone(),
      validationRules.maxLength(15)
    ]
  },

  // User login form
  userLogin: {
    email: [
      validationRules.required(),
      validationRules.email()
    ],
    password: [
      validationRules.required(),
      validationRules.minLength(1)
    ]
  },

  // Vehicle listing form
  vehicleListing: {
    make: [
      validationRules.required(),
      validationRules.minLength(2),
      validationRules.maxLength(50)
    ],
    model: [
      validationRules.required(),
      validationRules.minLength(1),
      validationRules.maxLength(50)
    ],
    year: [
      validationRules.required(),
      validationRules.integer(),
      validationRules.custom(
        (value) => value >= 1900 && value <= new Date().getFullYear() + 1,
        'שנת ייצור לא תקינה'
      )
    ],
    price: [
      validationRules.required(),
      validationRules.positiveNumber(),
      validationRules.custom(
        (value) => value <= 10000000,
        'המחיר גבוה מדי'
      )
    ],
    mileage: [
      validationRules.required(),
      validationRules.numeric(),
      validationRules.custom(
        (value) => value >= 0 && value <= 1000000,
        'קילומטראז לא תקין'
      )
    ],
    description: [
      validationRules.required(),
      validationRules.minLength(10),
      validationRules.maxLength(2000)
    ]
  },

  // Contact form
  contactForm: {
    name: [
      validationRules.required(),
      validationRules.minLength(2),
      validationRules.maxLength(100)
    ],
    email: [
      validationRules.required(),
      validationRules.email()
    ],
    subject: [
      validationRules.required(),
      validationRules.minLength(5),
      validationRules.maxLength(200)
    ],
    message: [
      validationRules.required(),
      validationRules.minLength(10),
      validationRules.maxLength(2000)
    ]
  }
}

export default {
  validateField,
  validateForm,
  hasFormErrors,
  sanitizeFormInput,
  sanitizeObject,
  validationRules,
  commonSchemas,
  VALIDATION_RULES,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES
}