/**
 * Comprehensive validated form component
 * Provides complete form validation with error handling and sanitization
 */

import React, { forwardRef } from 'react'
import { AlertTriangle, CheckCircle, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useFormValidation } from '@/hooks/useFormValidation'
import { hasFormErrors } from '@/utils/validation'
import { useErrorNotification } from '@/components/ErrorNotification'

/**
 * Form validation progress indicator
 */
const ValidationProgress = ({ errors, schema, touched }) => {
  const totalFields = Object.keys(schema).length
  const touchedFields = Object.keys(touched).length
  const validFields = touchedFields - Object.keys(errors).length
  
  const progress = totalFields > 0 ? (validFields / totalFields) * 100 : 0
  const isComplete = progress === 100 && touchedFields === totalFields

  if (touchedFields === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">התקדמות מילוי הטופס</span>
        <span className={cn(
          'font-medium',
          isComplete ? 'text-green-600' : 'text-blue-600'
        )}>
          {validFields}/{totalFields} שדות תקינים
        </span>
      </div>
      <Progress 
        value={progress} 
        className={cn(
          'h-2',
          isComplete && 'bg-green-100'
        )}
      />
    </div>
  )
}

/**
 * Form error summary
 */
const ErrorSummary = ({ errors, onFieldFocus }) => {
  const errorEntries = Object.entries(errors).filter(([_, error]) => error)
  
  if (errorEntries.length === 0) return null

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium text-red-800">
            יש לתקן את השגיאות הבאות:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {errorEntries.map(([fieldName, error]) => (
              <li key={fieldName}>
                <button
                  type="button"
                  className="underline hover:no-underline"
                  onClick={() => onFieldFocus && onFieldFocus(fieldName)}
                >
                  {error}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Form success message
 */
const SuccessMessage = ({ message, onDismiss }) => {
  if (!message) return null

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-green-800">{message}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Main validated form component
 */
const ValidatedForm = forwardRef(({
  // Form configuration
  initialValues = {},
  validationSchema = {},
  onSubmit,
  onValidationError,
  
  // Form options
  validateOnChange = true,
  validateOnBlur = true,
  sanitizeOnChange = true,
  sanitizeOptions = {},
  debounceMs = 300,
  
  // UI options
  title,
  description,
  showProgress = false,
  showErrorSummary = true,
  showSuccessMessage = true,
  
  // Submit button options
  submitText = 'שמור',
  submitIcon: SubmitIcon = Save,
  submitVariant = 'default',
  submitSize = 'default',
  disableSubmitOnInvalid = true,
  
  // Reset button options
  showResetButton = false,
  resetText = 'איפוס',
  resetVariant = 'outline',
  
  // Layout options
  className,
  cardClassName,
  headerClassName,
  contentClassName,
  footerClassName,
  
  // Event handlers
  onReset,
  onFieldFocus,
  
  // Children and render props
  children,
  renderHeader,
  renderFooter,
  renderBeforeSubmit,
  
  ...props
}, ref) => {
  const { showError, showSuccess } = useErrorNotification()
  const [successMessage, setSuccessMessage] = React.useState(null)
  const [isSubmitSuccess, setIsSubmitSuccess] = React.useState(false)

  // Form validation hook
  const form = useFormValidation(initialValues, validationSchema, {
    validateOnChange,
    validateOnBlur,
    sanitizeOnChange,
    sanitizeOptions,
    debounceMs,
    onSubmit: async (values) => {
      try {
        const result = await onSubmit?.(values)
        setIsSubmitSuccess(true)
        setSuccessMessage(result?.message || 'הטופס נשמר בהצלחה')
        
        if (showSuccessMessage) {
          showSuccess(result?.message || 'הטופס נשמר בהצלחה')
        }
        
        return result
      } catch (error) {
        setIsSubmitSuccess(false)
        showError(error.message || 'שגיאה בשמירת הטופס')
        throw error
      }
    },
    onValidationError: (errors, values) => {
      setIsSubmitSuccess(false)
      onValidationError?.(errors, values)
      
      if (showErrorSummary) {
        showError('יש לתקן את השגיאות בטופס')
      }
    }
  })

  // Handle form reset
  const handleReset = () => {
    form.resetForm()
    setSuccessMessage(null)
    setIsSubmitSuccess(false)
    onReset?.()
  }

  // Handle field focus (for error summary)
  const handleFieldFocus = (fieldName) => {
    const element = document.getElementById(fieldName) || 
                   document.querySelector(`[name="${fieldName}"]`)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    onFieldFocus?.(fieldName)
  }

  // Dismiss success message
  const dismissSuccessMessage = () => {
    setSuccessMessage(null)
    setIsSubmitSuccess(false)
  }

  const hasErrors = hasFormErrors(form.errors)
  const canSubmit = !form.isSubmitting && (!disableSubmitOnInvalid || form.isValid)

  return (
    <Card className={cn('w-full', cardClassName)}>
      {(title || description || renderHeader) && (
        <CardHeader className={headerClassName}>
          {renderHeader ? (
            renderHeader(form)
          ) : (
            <>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </>
          )}
        </CardHeader>
      )}
      
      <CardContent className={cn('space-y-6', contentClassName)}>
        {/* Validation progress */}
        {showProgress && (
          <ValidationProgress 
            errors={form.errors}
            schema={validationSchema}
            touched={form.touched}
          />
        )}
        
        {/* Success message */}
        {showSuccessMessage && (
          <SuccessMessage 
            message={successMessage}
            onDismiss={dismissSuccessMessage}
          />
        )}
        
        {/* Error summary */}
        {showErrorSummary && form.submitCount > 0 && (
          <ErrorSummary 
            errors={form.errors}
            onFieldFocus={handleFieldFocus}
          />
        )}
        
        {/* Form content */}
        <form
          ref={ref}
          onSubmit={form.handleSubmit}
          className={cn('space-y-4', className)}
          noValidate
          {...props}
        >
          {typeof children === 'function' ? children(form) : children}
          
          {/* Before submit content */}
          {renderBeforeSubmit && renderBeforeSubmit(form)}
          
          {/* Form actions */}
          <div className={cn(
            'flex items-center justify-between pt-4 border-t',
            footerClassName
          )}>
            <div className="flex items-center space-x-2 space-x-reverse">
              {/* Submit button */}
              <Button
                type="submit"
                variant={submitVariant}
                size={submitSize}
                disabled={!canSubmit}
                className="min-w-[120px]"
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <SubmitIcon className="w-4 h-4 ml-2" />
                    {submitText}
                  </>
                )}
              </Button>
              
              {/* Reset button */}
              {showResetButton && (
                <Button
                  type="button"
                  variant={resetVariant}
                  onClick={handleReset}
                  disabled={form.isSubmitting}
                >
                  {resetText}
                </Button>
              )}
            </div>
            
            {/* Form status */}
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
              {form.isSubmitting && (
                <span className="flex items-center">
                  <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                  שומר...
                </span>
              )}
              {isSubmitSuccess && (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  נשמר
                </span>
              )}
              {hasErrors && form.submitCount > 0 && (
                <span className="flex items-center text-red-600">
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  יש שגיאות
                </span>
              )}
            </div>
          </div>
          
          {/* Custom footer */}
          {renderFooter && renderFooter(form)}
        </form>
      </CardContent>
    </Card>
  )
})

ValidatedForm.displayName = 'ValidatedForm'

/**
 * Simple form wrapper without card styling
 */
export const SimpleValidatedForm = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <ValidatedForm
      ref={ref}
      cardClassName="border-0 shadow-none"
      headerClassName="px-0 pb-4"
      contentClassName="px-0"
      className={className}
      {...props}
    >
      {children}
    </ValidatedForm>
  )
})

SimpleValidatedForm.displayName = 'SimpleValidatedForm'

/**
 * Multi-step form component
 */
export const MultiStepValidatedForm = ({
  steps = [],
  currentStep = 0,
  onStepChange,
  onComplete,
  ...props
}) => {
  const [activeStep, setActiveStep] = React.useState(currentStep)
  const currentStepData = steps[activeStep]

  const handleNext = async (formData) => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1)
      onStepChange?.(activeStep + 1, formData)
    } else {
      await onComplete?.(formData)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1)
      onStepChange?.(activeStep - 1)
    }
  }

  if (!currentStepData) return null

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-2 space-x-reverse">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center',
              index < steps.length - 1 && 'ml-4'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              index === activeStep && 'bg-blue-600 text-white',
              index < activeStep && 'bg-green-600 text-white',
              index > activeStep && 'bg-gray-200 text-gray-600'
            )}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 mx-2',
                index < activeStep ? 'bg-green-600' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Current step form */}
      <ValidatedForm
        {...props}
        {...currentStepData}
        onSubmit={handleNext}
        renderFooter={(form) => (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={activeStep === 0 || form.isSubmitting}
            >
              הקודם
            </Button>
            <Button
              type="submit"
              disabled={!form.isValid || form.isSubmitting}
            >
              {form.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : activeStep === steps.length - 1 ? (
                'סיום'
              ) : (
                'הבא'
              )}
            </Button>
          </div>
        )}
      />
    </div>
  )
}

export default ValidatedForm