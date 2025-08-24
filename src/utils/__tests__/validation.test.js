import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateField,
  validateForm,
  hasFormErrors,
  sanitizeFormInput,
  sanitizeObject,
  validationRules,
  commonSchemas,
  VALIDATION_RULES,
  VALIDATION_PATTERNS
} from '../validation.js'

describe('validation utilities', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      const rules = [validationRules.required()]
      
      expect(validateField('', rules)).toBe('שדה זה הוא חובה')
      expect(validateField(null, rules)).toBe('שדה זה הוא חובה')
      expect(validateField(undefined, rules)).toBe('שדה זה הוא חובה')
      expect(validateField('   ', rules)).toBe('שדה זה הוא חובה')
      expect(validateField('valid', rules)).toBeNull()
    })

    it('should validate email format', () => {
      const rules = [validationRules.email()]
      
      expect(validateField('invalid-email', rules)).toBe('כתובת אימייל לא תקינה')
      expect(validateField('test@', rules)).toBe('כתובת אימייל לא תקינה')
      expect(validateField('@example.com', rules)).toBe('כתובת אימייל לא תקינה')
      expect(validateField('test@example.com', rules)).toBeNull()
      expect(validateField('user.name+tag@example.co.il', rules)).toBeNull()
    })

    it('should validate phone numbers', () => {
      const rules = [validationRules.phone()]
      
      expect(validateField('123', rules)).toBe('מספר טלפון לא תקין')
      expect(validateField('01234567', rules)).toBe('מספר טלפון לא תקין')
      expect(validateField('0501234567', rules)).toBeNull()
      expect(validateField('050-123-4567', rules)).toBeNull()
      expect(validateField('050 123 4567', rules)).toBeNull()
      expect(validateField('0312345678', rules)).toBeNull()
    })

    it('should validate minimum length', () => {
      const rules = [validationRules.minLength(5)]
      
      expect(validateField('abc', rules)).toBe('הערך קצר מדי (מינימום 5 תווים)')
      expect(validateField('abcd', rules)).toBe('הערך קצר מדי (מינימום 5 תווים)')
      expect(validateField('abcde', rules)).toBeNull()
      expect(validateField('abcdef', rules)).toBeNull()
    })

    it('should validate maximum length', () => {
      const rules = [validationRules.maxLength(10)]
      
      expect(validateField('12345678901', rules)).toBe('הערך ארוך מדי (מקסימום 10 תווים)')
      expect(validateField('1234567890', rules)).toBeNull()
      expect(validateField('123456789', rules)).toBeNull()
    })

    it('should validate numeric values', () => {
      const rules = [validationRules.numeric()]
      
      expect(validateField('abc', rules)).toBe('יש להזין מספר בלבד')
      expect(validateField('12a', rules)).toBe('יש להזין מספר בלבד')
      expect(validateField('123', rules)).toBeNull()
      expect(validateField('123.45', rules)).toBeNull()
      expect(validateField('0', rules)).toBeNull()
    })

    it('should validate positive numbers', () => {
      const rules = [validationRules.positiveNumber()]
      
      expect(validateField('0', rules)).toBe('יש להזין מספר חיובי')
      expect(validateField('-5', rules)).toBe('יש להזין מספר חיובי')
      expect(validateField('5', rules)).toBeNull()
      expect(validateField('5.5', rules)).toBeNull()
    })

    it('should validate integers', () => {
      const rules = [validationRules.integer()]
      
      expect(validateField('5.5', rules)).toBe('יש להזין מספר שלם')
      expect(validateField('abc', rules)).toBe('יש להזין מספר שלם')
      expect(validateField('5', rules)).toBeNull()
      expect(validateField('0', rules)).toBeNull()
    })

    it('should validate URLs', () => {
      const rules = [validationRules.url()]
      
      expect(validateField('not-a-url', rules)).toBe('כתובת אתר לא תקינה')
      expect(validateField('http://', rules)).toBe('כתובת אתר לא תקינה')
      expect(validateField('https://example.com', rules)).toBeNull()
      expect(validateField('http://www.example.com/path?query=1', rules)).toBeNull()
    })

    it('should validate strong passwords', () => {
      const rules = [validationRules.strongPassword()]
      
      expect(validateField('weak', rules)).toBe('הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר')
      expect(validateField('password', rules)).toBe('הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר')
      expect(validateField('Password', rules)).toBe('הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר')
      expect(validateField('Password123', rules)).toBe('הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר')
      expect(validateField('Password123!', rules)).toBeNull()
    })

    it('should validate password confirmation', () => {
      const rules = [validationRules.confirmPassword('password')]
      const allValues = { password: 'mypassword', confirmPassword: 'different' }
      
      expect(validateField('different', rules, allValues)).toBe('הסיסמאות אינן תואמות')
      expect(validateField('mypassword', rules, allValues)).toBeNull()
    })

    it('should validate custom rules', () => {
      const customValidator = (value) => value === 'valid'
      const rules = [validationRules.custom(customValidator, 'ערך לא תקין')]
      
      expect(validateField('invalid', rules)).toBe('ערך לא תקין')
      expect(validateField('valid', rules)).toBeNull()
    })

    it('should validate file size', () => {
      const rules = [validationRules.fileSize(1024)] // 1KB limit
      const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' })
      const largeFile = new File(['x'.repeat(2000)], 'large.txt', { type: 'text/plain' })
      
      Object.defineProperty(smallFile, 'size', { value: 500 })
      Object.defineProperty(largeFile, 'size', { value: 2000 })
      
      expect(validateField(largeFile, rules)).toBe('גודל הקובץ חורג מהמותר')
      expect(validateField(smallFile, rules)).toBeNull()
    })

    it('should validate file types', () => {
      const rules = [validationRules.fileType(['jpg', 'png', 'image/jpeg'])]
      const jpgFile = new File([''], 'image.jpg', { type: 'image/jpeg' })
      const txtFile = new File([''], 'document.txt', { type: 'text/plain' })
      
      expect(validateField(txtFile, rules)).toBe('סוג קובץ לא נתמך')
      expect(validateField(jpgFile, rules)).toBeNull()
    })

    it('should handle multiple validation rules', () => {
      const rules = [
        validationRules.required(),
        validationRules.minLength(5),
        validationRules.maxLength(20),
        validationRules.email()
      ]
      
      expect(validateField('', rules)).toBe('שדה זה הוא חובה')
      expect(validateField('abc', rules)).toBe('הערך קצר מדי (מינימום 5 תווים)')
      expect(validateField('abcde', rules)).toBe('כתובת אימייל לא תקינה')
      expect(validateField('test@example.com', rules)).toBeNull()
    })
  })

  describe('validateForm', () => {
    it('should validate entire form', () => {
      const values = {
        email: 'invalid-email',
        password: 'weak',
        name: ''
      }
      
      const schema = {
        email: [validationRules.required(), validationRules.email()],
        password: [validationRules.required(), validationRules.minLength(8)],
        name: [validationRules.required()]
      }
      
      const errors = validateForm(values, schema)
      
      expect(errors.email).toBe('כתובת אימייל לא תקינה')
      expect(errors.password).toBe('הערך קצר מדי (מינימום 8 תווים)')
      expect(errors.name).toBe('שדה זה הוא חובה')
    })

    it('should return empty object for valid form', () => {
      const values = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        name: 'John Doe'
      }
      
      const schema = {
        email: [validationRules.required(), validationRules.email()],
        password: [validationRules.required(), validationRules.strongPassword()],
        name: [validationRules.required(), validationRules.minLength(2)]
      }
      
      const errors = validateForm(values, schema)
      
      expect(Object.keys(errors)).toHaveLength(0)
    })
  })

  describe('hasFormErrors', () => {
    it('should return true when errors exist', () => {
      const errors = { email: 'Invalid email', password: 'Too short' }
      expect(hasFormErrors(errors)).toBe(true)
    })

    it('should return false when no errors', () => {
      const errors = {}
      expect(hasFormErrors(errors)).toBe(false)
    })
  })

  describe('sanitizeFormInput', () => {
    it('should sanitize basic XSS attempts', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeFormInput(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello')
    })

    it('should remove null bytes', () => {
      const input = 'Hello\x00World'
      const result = sanitizeFormInput(input)
      expect(result).toBe('HelloWorld')
    })

    it('should remove control characters', () => {
      const input = 'Hello\x01\x02World'
      const result = sanitizeFormInput(input)
      expect(result).toBe('HelloWorld')
    })

    it('should trim whitespace by default', () => {
      const input = '  Hello World  '
      const result = sanitizeFormInput(input)
      expect(result).toBe('Hello World')
    })

    it('should not trim when disabled', () => {
      const input = '  Hello World  '
      const result = sanitizeFormInput(input, { trim: false })
      expect(result).toBe('  Hello World  ')
    })

    it('should normalize whitespace when requested', () => {
      const input = 'Hello    World\n\nTest'
      const result = sanitizeFormInput(input, { normalizeWhitespace: true })
      expect(result).toBe('Hello World Test')
    })

    it('should strip HTML when requested', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      const result = sanitizeFormInput(input, { stripHtml: true })
      expect(result).toBe('Hello World')
    })

    it('should limit length when specified', () => {
      const input = 'This is a very long string'
      const result = sanitizeFormInput(input, { maxLength: 10 })
      expect(result).toBe('This is a ')
    })

    it('should handle non-string input', () => {
      expect(sanitizeFormInput(123)).toBe(123)
      expect(sanitizeFormInput(null)).toBe(null)
      expect(sanitizeFormInput(undefined)).toBe(undefined)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize object properties recursively', () => {
      const obj = {
        name: '<script>alert("xss")</script>John',
        details: {
          email: 'test@example.com',
          bio: '<p>Hello</p>'
        },
        tags: ['<script>', 'normal tag']
      }
      
      const result = sanitizeObject(obj, { stripHtml: true })
      
      expect(result.name).toBe('John')
      expect(result.details.email).toBe('test@example.com')
      expect(result.details.bio).toBe('Hello')
      expect(result.tags[0]).toBe('')
      expect(result.tags[1]).toBe('normal tag')
    })

    it('should handle null and undefined values', () => {
      expect(sanitizeObject(null)).toBe(null)
      expect(sanitizeObject(undefined)).toBe(undefined)
    })

    it('should handle arrays', () => {
      const arr = ['<script>test</script>', 'normal', { name: '<b>bold</b>' }]
      const result = sanitizeObject(arr, { stripHtml: true })
      
      expect(result[0]).toBe('test')
      expect(result[1]).toBe('normal')
      expect(result[2].name).toBe('bold')
    })

    it('should sanitize object keys', () => {
      const obj = {
        '<script>key</script>': 'value',
        'normal_key': 'value2'
      }
      
      const result = sanitizeObject(obj, { stripHtml: true })
      
      expect(result['key']).toBe('value')
      expect(result['normal_key']).toBe('value2')
      expect(result['<script>key</script>']).toBeUndefined()
    })
  })

  describe('common schemas', () => {
    describe('userRegistration', () => {
      it('should validate valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          fullName: 'John Doe',
          phone: '0501234567'
        }
        
        const errors = validateForm(validData, commonSchemas.userRegistration)
        expect(Object.keys(errors)).toHaveLength(0)
      })

      it('should catch registration validation errors', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'weak',
          confirmPassword: 'different',
          fullName: 'A',
          phone: '123'
        }
        
        const errors = validateForm(invalidData, commonSchemas.userRegistration)
        
        expect(errors.email).toBeTruthy()
        expect(errors.password).toBeTruthy()
        expect(errors.confirmPassword).toBeTruthy()
        expect(errors.fullName).toBeTruthy()
        expect(errors.phone).toBeTruthy()
      })
    })

    describe('userLogin', () => {
      it('should validate login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword'
        }
        
        const errors = validateForm(validData, commonSchemas.userLogin)
        expect(Object.keys(errors)).toHaveLength(0)
      })

      it('should require email and password', () => {
        const invalidData = {
          email: '',
          password: ''
        }
        
        const errors = validateForm(invalidData, commonSchemas.userLogin)
        
        expect(errors.email).toBeTruthy()
        expect(errors.password).toBeTruthy()
      })
    })

    describe('vehicleListing', () => {
      it('should validate vehicle listing data', () => {
        const validData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 50000,
          description: 'This is a great car with excellent condition and low mileage.'
        }
        
        const errors = validateForm(validData, commonSchemas.vehicleListing)
        expect(Object.keys(errors)).toHaveLength(0)
      })

      it('should validate year range', () => {
        const invalidData = {
          make: 'Toyota',
          model: 'Camry',
          year: 1800, // Too old
          price: 25000,
          mileage: 50000,
          description: 'Valid description'
        }
        
        const errors = validateForm(invalidData, commonSchemas.vehicleListing)
        expect(errors.year).toBeTruthy()
      })

      it('should validate price limits', () => {
        const invalidData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 20000000, // Too expensive
          mileage: 50000,
          description: 'Valid description'
        }
        
        const errors = validateForm(invalidData, commonSchemas.vehicleListing)
        expect(errors.price).toBeTruthy()
      })

      it('should validate mileage range', () => {
        const invalidData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          price: 25000,
          mileage: 2000000, // Too high
          description: 'Valid description'
        }
        
        const errors = validateForm(invalidData, commonSchemas.vehicleListing)
        expect(errors.mileage).toBeTruthy()
      })
    })

    describe('contactForm', () => {
      it('should validate contact form data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Question about your service',
          message: 'I would like to know more about your services and pricing.'
        }
        
        const errors = validateForm(validData, commonSchemas.contactForm)
        expect(Object.keys(errors)).toHaveLength(0)
      })

      it('should require minimum message length', () => {
        const invalidData = {
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Question',
          message: 'Short' // Too short
        }
        
        const errors = validateForm(invalidData, commonSchemas.contactForm)
        expect(errors.message).toBeTruthy()
      })
    })
  })

  describe('validation patterns', () => {
    it('should have correct email pattern', () => {
      expect(VALIDATION_PATTERNS.EMAIL.test('test@example.com')).toBe(true)
      expect(VALIDATION_PATTERNS.EMAIL.test('invalid-email')).toBe(false)
    })

    it('should have correct phone pattern', () => {
      expect(VALIDATION_PATTERNS.PHONE_IL.test('0501234567')).toBe(true)
      expect(VALIDATION_PATTERNS.PHONE_IL.test('123456789')).toBe(false)
    })

    it('should have correct Hebrew pattern', () => {
      expect(VALIDATION_PATTERNS.HEBREW.test('שלום עולם')).toBe(true)
      expect(VALIDATION_PATTERNS.HEBREW.test('Hello World')).toBe(false)
    })

    it('should have correct English pattern', () => {
      expect(VALIDATION_PATTERNS.ENGLISH.test('Hello World')).toBe(true)
      expect(VALIDATION_PATTERNS.ENGLISH.test('שלום עולם')).toBe(false)
    })

    it('should have correct strong password pattern', () => {
      expect(VALIDATION_PATTERNS.STRONG_PASSWORD.test('StrongPass123!')).toBe(true)
      expect(VALIDATION_PATTERNS.STRONG_PASSWORD.test('weakpass')).toBe(false)
    })

    it('should have correct URL pattern', () => {
      expect(VALIDATION_PATTERNS.URL.test('https://example.com')).toBe(true)
      expect(VALIDATION_PATTERNS.URL.test('not-a-url')).toBe(false)
    })
  })
})