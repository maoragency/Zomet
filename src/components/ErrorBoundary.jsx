/**
 * Enhanced Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 * Integrates with the enhanced error handling system
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logError, ERROR_SEVERITY, errorMonitoring } from '@/utils/errorHandler'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error with enhanced error handling
    const errorId = logError(
      error,
      `ErrorBoundary.${this.props.context || 'unknown'}`,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.context || 'unknown',
        retryCount: this.state.retryCount,
        props: this.props.logProps ? this.props : undefined
      },
      ERROR_SEVERITY.HIGH
    )

    this.setState({
      error,
      errorInfo,
      errorId,
      hasError: true
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }))

    // Call optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry(this.state.retryCount + 1)
    }
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    }

    // In a real implementation, this would send to a bug tracking system
    
    // Copy to clipboard for easy reporting
    navigator.clipboard?.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('פרטי השגיאה הועתקו ללוח. אנא שלח אותם לצוות התמיכה.')
      })
      .catch(() => {
        alert('לא ניתן להעתיק את פרטי השגיאה. אנא צלם מסך ושלח לצוות התמיכה.')
      })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry)
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                אירעה שגיאה לא צפויה
              </CardTitle>
              <CardDescription className="text-gray-600">
                משהו השתבש באפליקציה. אנא נסה שוב או פנה לתמיכה.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error ID for support */}
              {this.state.errorId && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    מזהה שגיאה: <code className="bg-gray-100 px-1 rounded text-xs">{this.state.errorId}</code>
                  </AlertDescription>
                </Alert>
              )}

              {/* Retry count warning */}
              {this.state.retryCount > 0 && (
                <Alert>
                  <AlertDescription className="text-sm text-amber-700">
                    ניסיון {this.state.retryCount + 1} מתוך 3
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {/* Retry button - disabled after 3 attempts */}
                <Button 
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  {this.state.retryCount >= 3 ? 'הגעת למספר הניסיונות המקסימלי' : 'נסה שוב'}
                </Button>

                {/* Go home button */}
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="w-4 h-4 ml-2" />
                  חזור לעמוד הבית
                </Button>

                {/* Report error button */}
                <Button 
                  variant="ghost" 
                  onClick={this.handleReportError}
                  className="w-full text-sm"
                >
                  <Bug className="w-4 h-4 ml-2" />
                  דווח על השגיאה
                </Button>
              </div>

              {/* Development mode error details */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    פרטי שגיאה (מצב פיתוח)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-left overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap components with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Error boundary options
 * @returns {React.Component} Wrapped component
 */
export const withErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary
      context={options.context || Component.name}
      onError={options.onError}
      onRetry={options.onRetry}
      fallback={options.fallback}
      logProps={options.logProps}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * Hook for handling errors in functional components
 * @param {string} context - Context for error logging
 * @returns {Function} Error handler function
 */
export const useErrorHandler = (context = 'unknown') => {
  const handleError = React.useCallback((error, metadata = {}) => {
    logError(
      error,
      `useErrorHandler.${context}`,
      metadata,
      ERROR_SEVERITY.MEDIUM
    )
  }, [context])

  return handleError
}

/**
 * Hook for error recovery
 * @param {Function} operation - Operation that might fail
 * @param {Object} options - Recovery options
 * @returns {Object} Recovery state and functions
 */
export const useErrorRecovery = (operation, options = {}) => {
  const [state, setState] = React.useState({
    isLoading: false,
    error: null,
    retryCount: 0,
    data: null
  })

  const { maxRetries = 3, retryDelay = 1000, context = 'unknown' } = options

  const execute = React.useCallback(async (...args) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await operation(...args)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        data: result, 
        error: null,
        retryCount: 0 
      }))
      return result
    } catch (error) {
      logError(error, `useErrorRecovery.${context}`, { retryCount: state.retryCount })
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error,
        retryCount: prev.retryCount + 1 
      }))
      throw error
    }
  }, [operation, context, state.retryCount])

  const retry = React.useCallback(async (...args) => {
    if (state.retryCount >= maxRetries) {
      throw new Error('Maximum retry attempts reached')
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay * state.retryCount))
    
    return execute(...args)
  }, [execute, state.retryCount, maxRetries, retryDelay])

  const reset = React.useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      data: null
    })
  }, [])

  return {
    ...state,
    execute,
    retry,
    reset,
    canRetry: state.retryCount < maxRetries
  }
}

export default ErrorBoundary