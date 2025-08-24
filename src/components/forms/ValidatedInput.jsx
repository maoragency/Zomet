/**
 * Enhanced form input components with built-in validation
 * Provides consistent validation UI and error handling
 */

import React, { forwardRef } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFieldValidation, useAsyncValidation } from '@/hooks/useFormValidation'
import { sanitizeFormInput } from '@/utils/validation'

/**
 * Base validated input component
 */
const ValidatedInput = forwardRef(({
  label,
  error,
  success,
  helperText,
  required = false,
  className,
  containerClassName,
  labelClassName,
  errorClassName,
  helperClassName,
  showValidationIcon = true,
  isValidating = false,
  children,
  ...props
}, ref) => {
  const hasError = !!error
  const hasSuccess = !!success && !hasError
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn('space-y-2', containerClassName)} dir="rtl">
      {label && (
        <Label 
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600',
            hasSuccess && 'text-green-600',
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {React.cloneElement(children, {
          id: inputId,
          ref,
          className: cn(
            'w-full',
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            showValidationIcon && (hasError || hasSuccess || isValidating) && 'pl-10',
            className
          ),
          'aria-invalid': hasError ? 'true' : 'false',
          'aria-describedby': cn(
            error && `${inputId}-error`,
            helperText && `${inputId}-helper`
          ),
          ...props
        })}
        
        {showValidationIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {isValidating && (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            )}
            {!isValidating && hasError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {!isValidating && hasSuccess && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={`${inputId}-error`}
          className={cn('text-sm text-red-600', errorClassName)}
          role="alert"
        >
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p 
          id={`${inputId}-helper`}
          className={cn('text-sm text-gray-500', helperClassName)}
        >
          {helperText}
        </p>
      )}
    </div>
  )
})

ValidatedInput.displayName = 'ValidatedInput'

/**
 * Text input with validation
 */
export const ValidatedTextInput = forwardRef(({
  validationRules = [],
  sanitizeOptions = {},
  asyncValidator,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
  allValues = {},
  onValidationChange,
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || '')
  const [showPassword, setShowPassword] = React.useState(false)
  
  const isPasswordType = props.type === 'password'
  const inputType = isPasswordType && showPassword ? 'text' : props.type

  // Sync validation
  const {
    error: syncError,
    isValid: isSyncValid,
    isTouched,
    touch,
    validate: validateSync
  } = useFieldValidation(value, validationRules, {
    validateOnChange,
    debounceMs,
    allValues
  })

  // Async validation
  const {
    error: asyncError,
    isValid: isAsyncValid,
    isValidating
  } = useAsyncValidation(asyncValidator, value, {
    debounceMs: debounceMs + 200, // Slightly longer debounce for async
    enabled: !!asyncValidator && isSyncValid && isTouched
  })

  // Combined validation state
  const error = syncError || asyncError
  const isValid = isSyncValid && (asyncValidator ? isAsyncValid : true)
  const success = isTouched && isValid && !isValidating

  // Handle value change
  const handleChange = (e) => {
    let newValue = e.target.value

    // Sanitize input
    if (Object.keys(sanitizeOptions).length > 0) {
      newValue = sanitizeFormInput(newValue, sanitizeOptions)
    }

    setValue(newValue)
    
    if (props.onChange) {
      props.onChange({ ...e, target: { ...e.target, value: newValue } })
    }
  }

  // Handle blur
  const handleBlur = (e) => {
    touch()
    if (props.onBlur) {
      props.onBlur(e)
    }
  }

  // Notify parent of validation changes
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        isValid,
        error,
        isValidating,
        isTouched
      })
    }
  }, [isValid, error, isValidating, isTouched, onValidationChange])

  return (
    <ValidatedInput
      error={error}
      success={success}
      isValidating={isValidating}
      {...props}
    >
      <div className="relative">
        <Input
          ref={ref}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={isPasswordType ? 'pl-10' : ''}
        />
        {isPasswordType && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )}
      </div>
    </ValidatedInput>
  )
})

ValidatedTextInput.displayName = 'ValidatedTextInput'

/**
 * Textarea with validation
 */
export const ValidatedTextarea = forwardRef(({
  validationRules = [],
  sanitizeOptions = {},
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
  allValues = {},
  onValidationChange,
  maxLength,
  showCharCount = false,
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || '')

  const {
    error,
    isValid,
    isTouched,
    touch
  } = useFieldValidation(value, validationRules, {
    validateOnChange,
    debounceMs,
    allValues
  })

  const success = isTouched && isValid
  const charCount = value.length
  const isNearLimit = maxLength && charCount > maxLength * 0.8

  const handleChange = (e) => {
    let newValue = e.target.value

    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength)
    }

    // Sanitize input
    if (Object.keys(sanitizeOptions).length > 0) {
      newValue = sanitizeFormInput(newValue, sanitizeOptions)
    }

    setValue(newValue)
    
    if (props.onChange) {
      props.onChange({ ...e, target: { ...e.target, value: newValue } })
    }
  }

  const handleBlur = (e) => {
    touch()
    if (props.onBlur) {
      props.onBlur(e)
    }
  }

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        isValid,
        error,
        isValidating: false,
        isTouched
      })
    }
  }, [isValid, error, isTouched, onValidationChange])

  return (
    <ValidatedInput
      error={error}
      success={success}
      {...props}
    >
      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={maxLength}
        />
        {showCharCount && maxLength && (
          <div className={cn(
            'absolute bottom-2 left-2 text-xs',
            isNearLimit ? 'text-orange-500' : 'text-gray-400'
          )}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    </ValidatedInput>
  )
})

ValidatedTextarea.displayName = 'ValidatedTextarea'

/**
 * Select input with validation
 */
export const ValidatedSelect = forwardRef(({
  validationRules = [],
  validateOnChange = true,
  validateOnBlur = true,
  allValues = {},
  onValidationChange,
  options = [],
  placeholder = 'בחר אפשרות...',
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || '')

  const {
    error,
    isValid,
    isTouched,
    touch
  } = useFieldValidation(value, validationRules, {
    validateOnChange,
    allValues
  })

  const success = isTouched && isValid

  const handleChange = (e) => {
    const newValue = e.target.value
    setValue(newValue)
    
    if (props.onChange) {
      props.onChange(e)
    }
  }

  const handleBlur = (e) => {
    touch()
    if (props.onBlur) {
      props.onBlur(e)
    }
  }

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        isValid,
        error,
        isValidating: false,
        isTouched
      })
    }
  }, [isValid, error, isTouched, onValidationChange])

  return (
    <ValidatedInput
      error={error}
      success={success}
      {...props}
    >
      <select
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ValidatedInput>
  )
})

ValidatedSelect.displayName = 'ValidatedSelect'

/**
 * File input with validation
 */
export const ValidatedFileInput = forwardRef(({
  validationRules = [],
  validateOnChange = true,
  allValues = {},
  onValidationChange,
  accept,
  multiple = false,
  maxSize,
  allowedTypes = [],
  onFileSelect,
  ...props
}, ref) => {
  const [files, setFiles] = React.useState(null)

  const {
    error,
    isValid,
    isTouched,
    touch
  } = useFieldValidation(files, validationRules, {
    validateOnChange,
    allValues
  })

  const success = isTouched && isValid && files

  const handleChange = (e) => {
    const selectedFiles = multiple ? Array.from(e.target.files) : e.target.files[0]
    setFiles(selectedFiles)
    touch()
    
    if (onFileSelect) {
      onFileSelect(selectedFiles)
    }
    
    if (props.onChange) {
      props.onChange(e)
    }
  }

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        isValid,
        error,
        isValidating: false,
        isTouched
      })
    }
  }, [isValid, error, isTouched, onValidationChange])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <ValidatedInput
      error={error}
      success={success}
      {...props}
    >
      <div className="space-y-2">
        <Input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="file:ml-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r from-blue-50 to-amber-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {files && (
          <div className="text-sm text-gray-600">
            {multiple ? (
              <div>
                <p>נבחרו {files.length} קבצים:</p>
                <ul className="list-disc list-inside mt-1">
                  {files.map((file, index) => (
                    <li key={index}>
                      {file.name} ({formatFileSize(file.size)})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>
                {files.name} ({formatFileSize(files.size)})
              </p>
            )}
          </div>
        )}
        
        {maxSize && (
          <p className="text-xs text-gray-500">
            גודל מקסימלי: {formatFileSize(maxSize)}
          </p>
        )}
        
        {allowedTypes.length > 0 && (
          <p className="text-xs text-gray-500">
            סוגי קבצים מותרים: {allowedTypes.join(', ')}
          </p>
        )}
      </div>
    </ValidatedInput>
  )
})

ValidatedFileInput.displayName = 'ValidatedFileInput'

export {
  ValidatedInput,
  ValidatedTextInput,
  ValidatedTextarea,
  ValidatedSelect,
  ValidatedFileInput
}