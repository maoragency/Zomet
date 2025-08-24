/**
 * Global Error Notification System
 * Displays user-friendly error notifications with recovery options
 */

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ERROR_SEVERITY, ERROR_CATEGORIES } from '@/utils/errorHandler'

/**
 * Individual error notification component
 */
const ErrorNotificationItem = ({ 
  error, 
  onDismiss, 
  onRetry, 
  showRetry = false,
  autoHide = true,
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(duration / 1000)

  useEffect(() => {
    if (!autoHide || error.severity === ERROR_SEVERITY.CRITICAL) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsVisible(false)
          setTimeout(onDismiss, 300) // Allow fade out animation
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoHide, duration, error.severity, onDismiss])

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.LOW:
        return 'border-blue-200 bg-gradient-to-r from-blue-50 to-amber-50 text-blue-800'
      case ERROR_SEVERITY.MEDIUM:
        return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case ERROR_SEVERITY.HIGH:
        return 'border-orange-200 bg-orange-50 text-orange-800'
      case ERROR_SEVERITY.CRITICAL:
        return 'border-red-200 bg-red-50 text-red-800'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
      case ERROR_SEVERITY.HIGH:
        return <AlertTriangle className="h-4 w-4" />
      case ERROR_SEVERITY.MEDIUM:
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (!isVisible) return null

  return (
    <Card className={`mb-2 transition-all duration-300 ${getSeverityStyles(error.severity)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 space-x-reverse">
            <div className="flex-shrink-0">
              {getSeverityIcon(error.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {error.message}
              </p>
              {error.context && (
                <p className="text-xs opacity-75 mt-1">
                  מקום: {error.context}
                </p>
              )}
              {error.id && import.meta.env.DEV && (
                <p className="text-xs opacity-50 mt-1 font-mono">
                  ID: {error.id}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            {showRetry && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRetry}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 ml-1" />
                נסה שוב
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {autoHide && error.severity !== ERROR_SEVERITY.CRITICAL && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-current h-1 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / (duration / 1000)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Network status indicator
 */
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <Alert className="mb-2 border-red-200 bg-red-50">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="text-red-800">
        אין חיבור לאינטרנט. בדוק את החיבור שלך.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Main error notification container
 */
const ErrorNotification = () => {
  const [errors, setErrors] = useState([])
  const [retryCallbacks, setRetryCallbacks] = useState(new Map())

  useEffect(() => {
    // Listen for global error events
    const handleGlobalError = (event) => {
      const error = {
        id: `global_${Date.now()}`,
        message: event.detail.message || 'אירעה שגיאה לא צפויה',
        severity: event.detail.severity || ERROR_SEVERITY.MEDIUM,
        category: event.detail.category || ERROR_CATEGORIES.SYSTEM,
        context: event.detail.context || 'global',
        timestamp: Date.now(),
        isRecoverable: event.detail.isRecoverable || false
      }

      setErrors(prev => [error, ...prev.slice(0, 4)]) // Keep max 5 errors

      // Store retry callback if provided
      if (event.detail.onRetry) {
        setRetryCallbacks(prev => new Map(prev).set(error.id, event.detail.onRetry))
      }
    }

    // Listen for critical error events
    const handleCriticalError = (event) => {
      const error = {
        id: event.detail.id,
        message: event.detail.message,
        severity: ERROR_SEVERITY.CRITICAL,
        category: ERROR_CATEGORIES.SYSTEM,
        context: 'critical',
        timestamp: Date.now(),
        isRecoverable: false
      }

      setErrors(prev => [error, ...prev])
    }

    // Listen for network error recovery
    const handleNetworkRecovery = () => {
      const recoveryMessage = {
        id: `recovery_${Date.now()}`,
        message: 'החיבור לאינטרנט חזר',
        severity: ERROR_SEVERITY.LOW,
        category: ERROR_CATEGORIES.NETWORK,
        context: 'network_recovery',
        timestamp: Date.now(),
        isRecoverable: false
      }

      setErrors(prev => [recoveryMessage, ...prev.slice(0, 4)])
    }

    window.addEventListener('globalError', handleGlobalError)
    window.addEventListener('criticalError', handleCriticalError)
    window.addEventListener('online', handleNetworkRecovery)

    return () => {
      window.removeEventListener('globalError', handleGlobalError)
      window.removeEventListener('criticalError', handleCriticalError)
      window.removeEventListener('online', handleNetworkRecovery)
    }
  }, [])

  const dismissError = (errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId))
    setRetryCallbacks(prev => {
      const newMap = new Map(prev)
      newMap.delete(errorId)
      return newMap
    })
  }

  const retryError = (errorId) => {
    const retryCallback = retryCallbacks.get(errorId)
    if (retryCallback) {
      retryCallback()
      dismissError(errorId)
    }
  }

  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto" dir="rtl">
      <NetworkStatus />
      {errors.map(error => (
        <ErrorNotificationItem
          key={error.id}
          error={error}
          onDismiss={() => dismissError(error.id)}
          onRetry={retryCallbacks.has(error.id) ? () => retryError(error.id) : null}
          showRetry={error.isRecoverable && retryCallbacks.has(error.id)}
          autoHide={error.severity !== ERROR_SEVERITY.CRITICAL}
          duration={error.severity === ERROR_SEVERITY.LOW ? 3000 : 5000}
        />
      ))}
    </div>
  )
}

/**
 * Hook for showing error notifications
 */
export const useErrorNotification = () => {
  const showError = React.useCallback((error, options = {}) => {
    const event = new CustomEvent('globalError', {
      detail: {
        message: error.message || error,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
        category: options.category || ERROR_CATEGORIES.SYSTEM,
        context: options.context || 'unknown',
        isRecoverable: options.isRecoverable || false,
        onRetry: options.onRetry
      }
    })

    window.dispatchEvent(event)
  }, [])

  const showSuccess = React.useCallback((message, options = {}) => {
    const event = new CustomEvent('globalError', {
      detail: {
        message,
        severity: ERROR_SEVERITY.LOW,
        category: ERROR_CATEGORIES.SYSTEM,
        context: options.context || 'success',
        isRecoverable: false
      }
    })

    window.dispatchEvent(event)
  }, [])

  return { showError, showSuccess }
}

export default ErrorNotification