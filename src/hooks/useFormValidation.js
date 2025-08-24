/**
 * React hooks for form validation and input sanitization
 * Provides real-time validation with Hebrew error messages
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  validateField, 
  validateForm, 
  hasFormErrors, 
  sanitizeFormInput,
  sanitizeObject 
} from '@/utils/validation'
import { logError, ERROR_SEVERITY } from '@/utils/errorHandler'

/**
 * Enhanced form validation hook
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationSchema - Validation schema
 * @param {Object} options - Hook options
 * @returns {Object} Form validation state and methods
 */
export const useFormValidation = (initialValues = {}, validationSchema = {}, options = {}) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    sanitizeOnChange = true,
    sanitizeOptions = {},
    onSubmit,
    onValidationError,
    debounceMs = 300
  } = options

  // Form state
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)

  // Debounced validation
  const [validationTimeout, setValidationTimeout] = useState(null)

  // Memoized validation state
  const isValid = useMemo(() => !hasFormErrors(errors), [errors])
  const hasBeenTouched = useMemo(() => Object.keys(touched).length > 0, [touched])

  /**
   * Validate a single field
   */
  const validateSingleField = useCallback((fieldName, value, allValues = values) => {
    const fieldRules = validationSchema[fieldName]
    if (!fieldRules) return null

    try {
      return validateField(value, fieldRules, allValues)
    } catch (error) {
      logError(
        error,
        'useFormValidation.validateSingleField',
        { fieldName, value: typeof value },
        ERROR_SEVERITY.LOW
      )
      return 'שגיאה בבדיקת הנתונים'
    }
  }, [validationSchema, values])

  /**
   * Validate all fields
   */
  const validateAllFields = useCallback((formValues = values) => {
    try {
      return validateForm(formValues, validationSchema)
    } catch (error) {
      logError(
        error,
        'useFormValidation.validateAllFields',
        { fieldsCount: Object.keys(formValues).length },
        ERROR_SEVERITY.MEDIUM
      )
      return { _form: 'שגיאה בבדיקת הטופס' }
    }
  }, [validationSchema, values])

  /**
   * Set field value with optional validation and sanitization
   */
  const setFieldValue = useCallback((fieldName, value, shouldValidate = validateOnChange) => {
    // Sanitize input if enabled
    let sanitizedValue = value
    if (sanitizeOnChange && typeof value === 'string') {
      sanitizedValue = sanitizeFormInput(value, sanitizeOptions)
    }

    // Update values
    setValues(prev => ({
      ...prev,
      [fieldName]: sanitizedValue
    }))

    // Clear previous validation timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    // Validate with debounce if enabled
    if (shouldValidate && debounceMs > 0) {
      const timeout = setTimeout(() => {
        const error = validateSingleField(fieldName, sanitizedValue, {
          ...values,
          [fieldName]: sanitizedValue
        })
        
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }))
      }, debounceMs)
      
      setValidationTimeout(timeout)
    } else if (shouldValidate) {
      // Immediate validation
      const error = validateSingleField(fieldName, sanitizedValue, {
        ...values,
        [fieldName]: sanitizedValue
      })
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }))
    }
  }, [
    validateOnChange,
    sanitizeOnChange,
    sanitizeOptions,
    debounceMs,
    validationTimeout,
    validateSingleField,
    values
  ])

  /**
   * Set multiple field values
   */
  const setFieldValues = useCallback((newValues, shouldValidate = validateOnChange) => {
    // Sanitize all values if enabled
    let sanitizedValues = newValues
    if (sanitizeOnChange) {
      sanitizedValues = sanitizeObject(newValues, sanitizeOptions)
    }

    // Update values
    setValues(prev => ({
      ...prev,
      ...sanitizedValues
    }))

    // Validate if enabled
    if (shouldValidate) {
      const updatedValues = { ...values, ...sanitizedValues }
      const newErrors = validateAllFields(updatedValues)
      setErrors(prev => ({
        ...prev,
        ...newErrors
      }))
    }
  }, [validateOnChange, sanitizeOnChange, sanitizeOptions, validateAllFields, values])

  /**
   * Handle field blur
   */
  const setFieldTouched = useCallback((fieldName, shouldValidate = validateOnBlur) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }))

    if (shouldValidate) {
      const error = validateSingleField(fieldName, values[fieldName])
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }))
    }
  }, [validateOnBlur, validateSingleField, values])

  /**
   * Clear field error
   */
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback((newInitialValues = initialValues) => {
    setValues(newInitialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    setSubmitCount(0)
    
    if (validationTimeout) {
      clearTimeout(validationTimeout)
      setValidationTimeout(null)
    }
  }, [initialValues, validationTimeout])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault()
    }

    setIsSubmitting(true)
    setSubmitCount(prev => prev + 1)

    try {
      // Validate all fields
      const formErrors = validateAllFields(values)
      setErrors(formErrors)

      // Mark all fields as touched
      const allTouched = Object.keys(validationSchema).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
      setTouched(allTouched)

      // If there are errors, call error handler and return
      if (hasFormErrors(formErrors)) {
        if (onValidationError) {
          onValidationError(formErrors, values)
        }
        return { success: false, errors: formErrors }
      }

      // Sanitize final values
      const sanitizedValues = sanitizeObject(values, {
        ...sanitizeOptions,
        stripHtml: true,
        normalizeWhitespace: true
      })

      // Call submit handler if provided
      if (onSubmit) {
        const result = await onSubmit(sanitizedValues)
        return { success: true, data: result }
      }

      return { success: true, data: sanitizedValues }
    } catch (error) {
      logError(
        error,
        'useFormValidation.handleSubmit',
        { 
          formFields: Object.keys(values),
          submitCount: submitCount + 1
        },
        ERROR_SEVERITY.MEDIUM
      )

      const submitError = { _form: 'שגיאה בשליחת הטופס. אנא נסה שוב.' }
      setErrors(submitError)
      
      if (onValidationError) {
        onValidationError(submitError, values)
      }

      return { success: false, errors: submitError }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    values,
    validationSchema,
    validateAllFields,
    onSubmit,
    onValidationError,
    sanitizeOptions,
    submitCount
  ])

  /**
   * Get field props for easy integration with form inputs
   */
  const getFieldProps = useCallback((fieldName) => ({
    name: fieldName,
    value: values[fieldName] || '',
    onChange: (e) => {
      const value = e.target ? e.target.value : e
      setFieldValue(fieldName, value)
    },
    onBlur: () => setFieldTouched(fieldName),
    error: touched[fieldName] ? errors[fieldName] : undefined,
    'aria-invalid': touched[fieldName] && errors[fieldName] ? 'true' : 'false',
    'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined
  }), [values, errors, touched, setFieldValue, setFieldTouched])

  /**
   * Get field error message
   */
  const getFieldError = useCallback((fieldName) => {
    return touched[fieldName] ? errors[fieldName] : undefined
  }, [errors, touched])

  /**
   * Check if field has error
   */
  const hasFieldError = useCallback((fieldName) => {
    return touched[fieldName] && !!errors[fieldName]
  }, [errors, touched])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout)
      }
    }
  }, [validationTimeout])

  return {
    // Values and state
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    submitCount,
    hasBeenTouched,

    // Field methods
    setFieldValue,
    setFieldValues,
    setFieldTouched,
    getFieldProps,
    getFieldError,
    hasFieldError,

    // Validation methods
    validateField: validateSingleField,
    validateForm: validateAllFields,
    clearFieldError,
    clearErrors,

    // Form methods
    handleSubmit,
    resetForm
  }
}

/**
 * Simple field validation hook for individual inputs
 * @param {*} value - Field value
 * @param {Array} rules - Validation rules
 * @param {Object} options - Hook options
 * @returns {Object} Field validation state
 */
export const useFieldValidation = (value, rules = [], options = {}) => {
  const {
    validateOnChange = true,
    debounceMs = 300,
    allValues = {}
  } = options

  const [error, setError] = useState(null)
  const [isTouched, setIsTouched] = useState(false)
  const [validationTimeout, setValidationTimeout] = useState(null)

  const validate = useCallback(() => {
    try {
      const validationError = validateField(value, rules, allValues)
      setError(validationError)
      return validationError
    } catch (err) {
      logError(
        err,
        'useFieldValidation.validate',
        { value: typeof value, rulesCount: rules.length },
        ERROR_SEVERITY.LOW
      )
      const fallbackError = 'שגיאה בבדיקת הנתונים'
      setError(fallbackError)
      return fallbackError
    }
  }, [value, rules, allValues])

  // Validate on value change with debounce
  useEffect(() => {
    if (!validateOnChange || !isTouched) return

    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    if (debounceMs > 0) {
      const timeout = setTimeout(validate, debounceMs)
      setValidationTimeout(timeout)
    } else {
      validate()
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout)
      }
    }
  }, [value, validateOnChange, isTouched, debounceMs, validate, validationTimeout])

  const touch = useCallback(() => {
    setIsTouched(true)
    if (!validateOnChange) {
      validate()
    }
  }, [validateOnChange, validate])

  const reset = useCallback(() => {
    setError(null)
    setIsTouched(false)
    if (validationTimeout) {
      clearTimeout(validationTimeout)
      setValidationTimeout(null)
    }
  }, [validationTimeout])

  return {
    error: isTouched ? error : null,
    isValid: !error,
    isTouched,
    validate,
    touch,
    reset
  }
}

/**
 * Hook for async validation (e.g., checking if email exists)
 * @param {Function} asyncValidator - Async validation function
 * @param {*} value - Value to validate
 * @param {Object} options - Hook options
 * @returns {Object} Async validation state
 */
export const useAsyncValidation = (asyncValidator, value, options = {}) => {
  const {
    debounceMs = 500,
    dependencies = [],
    enabled = true
  } = options

  const [state, setState] = useState({
    isValidating: false,
    error: null,
    isValid: null
  })

  const [validationTimeout, setValidationTimeout] = useState(null)

  const validate = useCallback(async () => {
    if (!enabled || !value) {
      setState({ isValidating: false, error: null, isValid: null })
      return
    }

    setState(prev => ({ ...prev, isValidating: true }))

    try {
      const result = await asyncValidator(value)
      setState({
        isValidating: false,
        error: result.error || null,
        isValid: result.isValid
      })
    } catch (error) {
      logError(
        error,
        'useAsyncValidation.validate',
        { value: typeof value },
        ERROR_SEVERITY.LOW
      )
      setState({
        isValidating: false,
        error: 'שגיאה בבדיקת הנתונים',
        isValid: false
      })
    }
  }, [asyncValidator, value, enabled])

  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    if (debounceMs > 0) {
      const timeout = setTimeout(validate, debounceMs)
      setValidationTimeout(timeout)
    } else {
      validate()
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout)
      }
    }
  }, [value, ...dependencies, validate, debounceMs, validationTimeout])

  return state
}

export default {
  useFormValidation,
  useFieldValidation,
  useAsyncValidation
}