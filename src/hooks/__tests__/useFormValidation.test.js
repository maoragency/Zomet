import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFormValidation, useFieldValidation, useAsyncValidation } from '../useFormValidation.js'
import { validationRules } from '@/utils/validation'

// Mock the validation utilities
vi.mock('@/utils/validation', () => ({
  validateField: vi.fn(),
  validateForm: vi.fn(),
  hasFormErrors: vi.fn(),
  sanitizeFormInput: vi.fn((input) => input),
  sanitizeObject: vi.fn((obj) => obj),
  validationRules: {
    required: () => ({ type: 'required', message: 'שדה זה הוא חובה' }),
    email: () => ({ type: 'email', message: 'כתובת אימייל לא תקינה' }),
    minLength: (min) => ({ type: 'minLength', min, message: `הערך קצר מדי (מינימום ${min} תווים)` })
  }
}))

// Mock error handler
vi.mock('@/utils/errorHandler', () => ({
  logError: vi.fn(),
  ERROR_SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  }
}))

describe('form validation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useFormValidation', () => {
    const initialValues = {
      email: '',
      password: '',
      name: ''
    }

    const validationSchema = {
      email: [validationRules.required(), validationRules.email()],
      password: [validationRules.required(), validationRules.minLength(8)],
      name: [validationRules.required()]
    }

    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      expect(result.current.values).toEqual(initialValues)
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.isValid).toBe(true)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitCount).toBe(0)
      expect(result.current.hasBeenTouched).toBe(false)
    })

    it('should set field value', async () => {
      const { validateField, hasFormErrors } = await import('@/utils/validation')
      validateField.mockReturnValue(null)
      hasFormErrors.mockReturnValue(false)

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      act(() => {
        result.current.setFieldValue('email', 'test@example.com')
      })

      expect(result.current.values.email).toBe('test@example.com')
    })

    it('should validate field on change when enabled', async () => {
      const { validateField, hasFormErrors } = await import('@/utils/validation')
      validateField.mockReturnValue('כתובת אימייל לא תקינה')
      hasFormErrors.mockReturnValue(true)

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { validateOnChange: true, debounceMs: 0 })
      )

      act(() => {
        result.current.setFieldValue('email', 'invalid-email')
      })

      await waitFor(() => {
        expect(result.current.errors.email).toBe('כתובת אימייל לא תקינה')
      })

      expect(validateField).toHaveBeenCalledWith(
        'invalid-email',
        validationSchema.email,
        expect.objectContaining({ email: 'invalid-email' })
      )
    })

    it('should debounce validation when debounceMs > 0', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('כתובת אימייל לא תקינה')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { validateOnChange: true, debounceMs: 100 })
      )

      act(() => {
        result.current.setFieldValue('email', 'invalid-email')
      })

      // Should not validate immediately
      expect(validateField).not.toHaveBeenCalled()

      // Should validate after debounce
      await waitFor(() => {
        expect(validateField).toHaveBeenCalled()
      }, { timeout: 200 })
    })

    it('should set multiple field values', async () => {
      const { validateForm, hasFormErrors } = await import('@/utils/validation')
      validateForm.mockReturnValue({})
      hasFormErrors.mockReturnValue(false)

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      const newValues = {
        email: 'test@example.com',
        name: 'Test User'
      }

      act(() => {
        result.current.setFieldValues(newValues)
      })

      expect(result.current.values.email).toBe('test@example.com')
      expect(result.current.values.name).toBe('Test User')
      expect(result.current.values.password).toBe('') // Should keep existing value
    })

    it('should set field as touched', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue(null)

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      act(() => {
        result.current.setFieldTouched('email')
      })

      expect(result.current.touched.email).toBe(true)
      expect(result.current.hasBeenTouched).toBe(true)
    })

    it('should validate field on blur when enabled', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('שדה זה הוא חובה')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { validateOnBlur: true })
      )

      act(() => {
        result.current.setFieldTouched('email', true)
      })

      expect(result.current.errors.email).toBe('שדה זה הוא חובה')
      expect(validateField).toHaveBeenCalledWith('', validationSchema.email)
    })

    it('should clear field error', () => {
      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Set an error first
      act(() => {
        result.current.setFieldValue('email', 'invalid')
      })

      // Clear the error
      act(() => {
        result.current.clearFieldError('email')
      })

      expect(result.current.errors.email).toBeUndefined()
    })

    it('should clear all errors', () => {
      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Set errors first (simulate)
      act(() => {
        result.current.setFieldValue('email', 'invalid')
        result.current.setFieldValue('password', 'short')
      })

      // Clear all errors
      act(() => {
        result.current.clearErrors()
      })

      expect(result.current.errors).toEqual({})
    })

    it('should reset form', () => {
      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Make some changes
      act(() => {
        result.current.setFieldValue('email', 'test@example.com')
        result.current.setFieldTouched('email')
      })

      // Reset form
      act(() => {
        result.current.resetForm()
      })

      expect(result.current.values).toEqual(initialValues)
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitCount).toBe(0)
    })

    it('should handle form submission successfully', async () => {
      const { validateForm, hasFormErrors, sanitizeObject } = await import('@/utils/validation')
      validateForm.mockReturnValue({})
      hasFormErrors.mockReturnValue(false)
      sanitizeObject.mockReturnValue({ email: 'test@example.com', password: 'password123', name: 'Test User' })

      const onSubmit = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { onSubmit })
      )

      // Set valid values
      act(() => {
        result.current.setFieldValues({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
      })

      let submitResult
      await act(async () => {
        submitResult = await result.current.handleSubmit()
      })

      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitCount).toBe(1)
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
      expect(submitResult.success).toBe(true)
    })

    it('should handle form submission with validation errors', async () => {
      const { validateForm, hasFormErrors } = await import('@/utils/validation')
      const formErrors = { email: 'כתובת אימייל לא תקינה', password: 'הערך קצר מדי' }
      validateForm.mockReturnValue(formErrors)
      hasFormErrors.mockReturnValue(true)

      const onValidationError = vi.fn()

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { onValidationError })
      )

      let submitResult
      await act(async () => {
        submitResult = await result.current.handleSubmit()
      })

      expect(result.current.errors).toEqual(formErrors)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitCount).toBe(1)
      expect(onValidationError).toHaveBeenCalledWith(formErrors, initialValues)
      expect(submitResult.success).toBe(false)
      expect(submitResult.errors).toEqual(formErrors)
    })

    it('should handle form submission error', async () => {
      const { validateForm, hasFormErrors, sanitizeObject } = await import('@/utils/validation')
      validateForm.mockReturnValue({})
      hasFormErrors.mockReturnValue(false)
      sanitizeObject.mockReturnValue(initialValues)

      const onSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))
      const onValidationError = vi.fn()

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { onSubmit, onValidationError })
      )

      let submitResult
      await act(async () => {
        submitResult = await result.current.handleSubmit()
      })

      expect(result.current.errors._form).toBe('שגיאה בשליחת הטופס. אנא נסה שוב.')
      expect(result.current.isSubmitting).toBe(false)
      expect(onValidationError).toHaveBeenCalled()
      expect(submitResult.success).toBe(false)
    })

    it('should get field props for form inputs', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('שדה זה הוא חובה')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Touch the field to show error
      act(() => {
        result.current.setFieldTouched('email')
      })

      const fieldProps = result.current.getFieldProps('email')

      expect(fieldProps).toEqual({
        name: 'email',
        value: '',
        onChange: expect.any(Function),
        onBlur: expect.any(Function),
        error: 'שדה זה הוא חובה',
        'aria-invalid': 'true',
        'aria-describedby': 'email-error'
      })
    })

    it('should get field error', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('שדה זה הוא חובה')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Should return undefined for untouched field
      expect(result.current.getFieldError('email')).toBeUndefined()

      // Touch the field
      act(() => {
        result.current.setFieldTouched('email')
      })

      expect(result.current.getFieldError('email')).toBe('שדה זה הוא חובה')
    })

    it('should check if field has error', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('שדה זה הוא חובה')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema)
      )

      // Should return false for untouched field
      expect(result.current.hasFieldError('email')).toBe(false)

      // Touch the field
      act(() => {
        result.current.setFieldTouched('email')
      })

      expect(result.current.hasFieldError('email')).toBe(true)
    })

    it('should sanitize input when enabled', async () => {
      const { sanitizeFormInput } = await import('@/utils/validation')
      sanitizeFormInput.mockReturnValue('sanitized-input')

      const { result } = renderHook(() => 
        useFormValidation(initialValues, validationSchema, { sanitizeOnChange: true })
      )

      act(() => {
        result.current.setFieldValue('name', '<script>alert("xss")</script>')
      })

      expect(sanitizeFormInput).toHaveBeenCalledWith('<script>alert("xss")</script>', {})
      expect(result.current.values.name).toBe('sanitized-input')
    })
  })

  describe('useFieldValidation', () => {
    const rules = [validationRules.required(), validationRules.email()]

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFieldValidation('', rules))

      expect(result.current.error).toBeNull()
      expect(result.current.isValid).toBe(true)
      expect(result.current.isTouched).toBe(false)
    })

    it('should validate field value', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('כתובת אימייל לא תקינה')

      const { result } = renderHook(() => useFieldValidation('invalid-email', rules))

      let validationResult
      act(() => {
        validationResult = result.current.validate()
      })

      expect(validateField).toHaveBeenCalledWith('invalid-email', rules, {})
      expect(validationResult).toBe('כתובת אימייל לא תקינה')
    })

    it('should touch field and show error', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('שדה זה הוא חובה')

      const { result } = renderHook(() => useFieldValidation('', rules))

      act(() => {
        result.current.touch()
      })

      expect(result.current.isTouched).toBe(true)
      expect(result.current.error).toBe('שדה זה הוא חובה')
      expect(result.current.isValid).toBe(false)
    })

    it('should reset field state', () => {
      const { result } = renderHook(() => useFieldValidation('', rules))

      // Touch and validate first
      act(() => {
        result.current.touch()
      })

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.isTouched).toBe(false)
    })

    it('should validate on change when enabled and touched', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('כתובת אימייל לא תקינה')

      const { result, rerender } = renderHook(
        ({ value }) => useFieldValidation(value, rules, { validateOnChange: true, debounceMs: 0 }),
        { initialProps: { value: '' } }
      )

      // Touch the field first
      act(() => {
        result.current.touch()
      })

      // Change value
      rerender({ value: 'invalid-email' })

      await waitFor(() => {
        expect(result.current.error).toBe('כתובת אימייל לא תקינה')
      })
    })

    it('should debounce validation', async () => {
      const { validateField } = await import('@/utils/validation')
      validateField.mockReturnValue('כתובת אימייל לא תקינה')

      const { result, rerender } = renderHook(
        ({ value }) => useFieldValidation(value, rules, { validateOnChange: true, debounceMs: 100 }),
        { initialProps: { value: '' } }
      )

      // Touch the field first
      act(() => {
        result.current.touch()
      })

      // Change value
      rerender({ value: 'invalid-email' })

      // Should not validate immediately
      expect(validateField).toHaveBeenCalledTimes(1) // Only from touch()

      // Should validate after debounce
      await waitFor(() => {
        expect(validateField).toHaveBeenCalledTimes(2)
      }, { timeout: 200 })
    })
  })

  describe('useAsyncValidation', () => {
    const mockAsyncValidator = vi.fn()

    beforeEach(() => {
      mockAsyncValidator.mockClear()
    })

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAsyncValidation(mockAsyncValidator, ''))

      expect(result.current.isValidating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isValid).toBeNull()
    })

    it('should validate async', async () => {
      mockAsyncValidator.mockResolvedValue({ isValid: true, error: null })

      const { result } = renderHook(() => 
        useAsyncValidation(mockAsyncValidator, 'test@example.com', { debounceMs: 0 })
      )

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(result.current.isValid).toBe(true)
      expect(result.current.error).toBeNull()
      expect(mockAsyncValidator).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle async validation error', async () => {
      mockAsyncValidator.mockResolvedValue({ isValid: false, error: 'Email already exists' })

      const { result } = renderHook(() => 
        useAsyncValidation(mockAsyncValidator, 'existing@example.com', { debounceMs: 0 })
      )

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(result.current.isValid).toBe(false)
      expect(result.current.error).toBe('Email already exists')
    })

    it('should handle async validator exception', async () => {
      mockAsyncValidator.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => 
        useAsyncValidation(mockAsyncValidator, 'test@example.com', { debounceMs: 0 })
      )

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(result.current.isValid).toBe(false)
      expect(result.current.error).toBe('שגיאה בבדיקת הנתונים')
    })

    it('should not validate when disabled', () => {
      const { result } = renderHook(() => 
        useAsyncValidation(mockAsyncValidator, 'test@example.com', { enabled: false })
      )

      expect(mockAsyncValidator).not.toHaveBeenCalled()
      expect(result.current.isValidating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isValid).toBeNull()
    })

    it('should not validate empty value', () => {
      const { result } = renderHook(() => 
        useAsyncValidation(mockAsyncValidator, '')
      )

      expect(mockAsyncValidator).not.toHaveBeenCalled()
      expect(result.current.isValidating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isValid).toBeNull()
    })

    it('should debounce validation', async () => {
      mockAsyncValidator.mockResolvedValue({ isValid: true, error: null })

      const { result, rerender } = renderHook(
        ({ value }) => useAsyncValidation(mockAsyncValidator, value, { debounceMs: 100 }),
        { initialProps: { value: 'test@example.com' } }
      )

      // Should not validate immediately
      expect(mockAsyncValidator).not.toHaveBeenCalled()

      // Should validate after debounce
      await waitFor(() => {
        expect(mockAsyncValidator).toHaveBeenCalledWith('test@example.com')
      }, { timeout: 200 })

      expect(result.current.isValid).toBe(true)
    })

    it('should revalidate when dependencies change', async () => {
      mockAsyncValidator.mockResolvedValue({ isValid: true, error: null })

      const { rerender } = renderHook(
        ({ deps }) => useAsyncValidation(mockAsyncValidator, 'test@example.com', { 
          debounceMs: 0, 
          dependencies: deps 
        }),
        { initialProps: { deps: ['dep1'] } }
      )

      await waitFor(() => {
        expect(mockAsyncValidator).toHaveBeenCalledTimes(1)
      })

      // Change dependencies
      rerender({ deps: ['dep2'] })

      await waitFor(() => {
        expect(mockAsyncValidator).toHaveBeenCalledTimes(2)
      })
    })
  })
})