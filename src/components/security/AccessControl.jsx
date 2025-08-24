/**
 * React components for access control and security validation
 * Provides role-based access control for UI components
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Lock, Shield, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  hasMinimumRole,
  getCurrentUser,
  logSecurityEvent,
  SECURITY_EVENTS,
  USER_ROLES
} from '@/utils/security'

/**
 * Higher-order component for route protection
 * @param {React.Component} Component - Component to protect
 * @param {Object} options - Protection options
 * @returns {React.Component} Protected component
 */
export const withAccessControl = (Component, options = {}) => {
  const {
    requiredPermissions = [],
    requiredRole = null,
    requireAll = false, // If true, user must have ALL permissions; if false, ANY permission
    redirectTo = '/login',
    fallback = null,
    onAccessDenied = null
  } = options

  const ProtectedComponent = (props) => {
    const location = useLocation()
    const currentUser = getCurrentUser()

    // Check if user is authenticated
    if (!currentUser) {
      logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
        component: Component.name,
        requiredPermissions,
        requiredRole,
        path: location.pathname
      })

      return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    // Check role requirement
    if (requiredRole && !hasMinimumRole(requiredRole, currentUser)) {
      logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
        userId: currentUser.id,
        component: Component.name,
        requiredRole,
        userRole: currentUser.role,
        path: location.pathname
      })

      if (onAccessDenied) {
        onAccessDenied('insufficient_role', { requiredRole, userRole: currentUser.role })
      }

      return fallback || <AccessDenied reason="insufficient_role" />
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      const hasAccess = requireAll 
        ? hasAllPermissions(requiredPermissions, currentUser)
        : hasAnyPermission(requiredPermissions, currentUser)

      if (!hasAccess) {
        logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
          userId: currentUser.id,
          component: Component.name,
          requiredPermissions,
          userPermissions: currentUser.permissions,
          path: location.pathname
        })

        if (onAccessDenied) {
          onAccessDenied('insufficient_permissions', { requiredPermissions })
        }

        return fallback || <AccessDenied reason="insufficient_permissions" />
      }
    }

    return <Component {...props} />
  }

  ProtectedComponent.displayName = `withAccessControl(${Component.displayName || Component.name})`
  return ProtectedComponent
}

/**
 * Component that conditionally renders children based on permissions
 */
export const PermissionGate = ({
  permissions = [],
  role = null,
  requireAll = false,
  fallback = null,
  showFallback = true,
  onAccessDenied = null,
  children
}) => {
  const currentUser = getCurrentUser()

  // If no user, don't render anything
  if (!currentUser) {
    return showFallback ? (fallback || <AccessDenied reason="not_authenticated" />) : null
  }

  // Check role requirement
  if (role && !hasMinimumRole(role, currentUser)) {
    if (onAccessDenied) {
      onAccessDenied('insufficient_role', { requiredRole: role, userRole: currentUser.role })
    }
    return showFallback ? (fallback || <AccessDenied reason="insufficient_role" />) : null
  }

  // Check permission requirements
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions, currentUser)
      : hasAnyPermission(permissions, currentUser)

    if (!hasAccess) {
      if (onAccessDenied) {
        onAccessDenied('insufficient_permissions', { requiredPermissions: permissions })
      }
      return showFallback ? (fallback || <AccessDenied reason="insufficient_permissions" />) : null
    }
  }

  return children
}

/**
 * Hook for checking permissions in functional components
 */
export const usePermissions = () => {
  const currentUser = getCurrentUser()

  const checkPermission = React.useCallback((permission, context = {}) => {
    return hasPermission(permission, currentUser, context)
  }, [currentUser])

  const checkAnyPermission = React.useCallback((permissions, context = {}) => {
    return hasAnyPermission(permissions, currentUser, context)
  }, [currentUser])

  const checkAllPermissions = React.useCallback((permissions, context = {}) => {
    return hasAllPermissions(permissions, currentUser, context)
  }, [currentUser])

  const checkRole = React.useCallback((role) => {
    return hasMinimumRole(role, currentUser)
  }, [currentUser])

  return {
    user: currentUser,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    hasRole: checkRole,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === USER_ROLES.ADMIN.name || currentUser?.role === USER_ROLES.SUPER_ADMIN.name,
    isModerator: currentUser?.role === USER_ROLES.MODERATOR.name || currentUser?.role === USER_ROLES.ADMIN.name || currentUser?.role === USER_ROLES.SUPER_ADMIN.name
  }
}

/**
 * Access denied component
 */
export const AccessDenied = ({ 
  reason = 'insufficient_permissions',
  title,
  description,
  showContactSupport = true,
  showGoBack = true,
  onGoBack,
  onContactSupport
}) => {
  const getContent = () => {
    switch (reason) {
      case 'not_authenticated':
        return {
          title: title || 'נדרשת התחברות',
          description: description || 'עליך להתחבר כדי לגשת לעמוד זה',
          icon: Lock
        }
      case 'insufficient_role':
        return {
          title: title || 'אין הרשאה',
          description: description || 'אין לך את התפקיד הנדרש לגישה לעמוד זה',
          icon: Shield
        }
      case 'insufficient_permissions':
        return {
          title: title || 'אין הרשאות מספיקות',
          description: description || 'אין לך את ההרשאות הנדרשות לגישה לעמוד זה',
          icon: AlertTriangle
        }
      default:
        return {
          title: title || 'גישה נדחתה',
          description: description || 'אין לך הרשאה לגשת לעמוד זה',
          icon: AlertTriangle
        }
    }
  }

  const content = getContent()
  const Icon = content.icon

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack()
    } else {
      window.history.back()
    }
  }

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport()
    } else {
      // Default contact support action
      window.location.href = 'mailto:support@example.com?subject=בקשת הרשאה'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {content.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {content.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              אם אתה מאמין שזו שגיאה, אנא פנה למנהל המערכת.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            {showGoBack && (
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="w-full"
              >
                חזור
              </Button>
            )}

            {showContactSupport && (
              <Button 
                variant="ghost" 
                onClick={handleContactSupport}
                className="w-full text-sm"
              >
                פנה לתמיכה
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Component for displaying user role badge
 */
export const RoleBadge = ({ 
  user = null, 
  showLabel = true,
  className = '',
  size = 'default'
}) => {
  const currentUser = user || getCurrentUser()
  
  if (!currentUser) return null

  const roleObj = Object.values(USER_ROLES).find(r => r.name === currentUser.role)
  if (!roleObj) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  const roleColors = {
    [USER_ROLES.GUEST.name]: 'bg-gray-100 text-gray-800',
    [USER_ROLES.USER.name]: 'bg-blue-100 text-blue-800',
    [USER_ROLES.MODERATOR.name]: 'bg-green-100 text-green-800',
    [USER_ROLES.ADMIN.name]: 'bg-purple-100 text-purple-800',
    [USER_ROLES.SUPER_ADMIN.name]: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${sizeClasses[size]}
      ${roleColors[currentUser.role]}
      ${className}
    `}>
      {showLabel && roleObj.label}
    </span>
  )
}

/**
 * Component for sensitive data that requires permission to view
 */
export const SensitiveData = ({
  permission,
  role = null,
  children,
  placeholder = '***',
  showToggle = false,
  onAccessAttempt = null
}) => {
  const [isRevealed, setIsRevealed] = React.useState(false)
  const { hasPermission: checkPermission, hasRole } = usePermissions()

  const hasAccess = React.useMemo(() => {
    if (role && !hasRole(role)) return false
    if (permission && !checkPermission(permission)) return false
    return true
  }, [permission, role, checkPermission, hasRole])

  const handleToggle = () => {
    if (!hasAccess) {
      if (onAccessAttempt) {
        onAccessAttempt(permission || role)
      }
      logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
        component: 'SensitiveData',
        permission,
        role,
        action: 'toggle_reveal'
      })
      return
    }

    setIsRevealed(!isRevealed)
  }

  if (!hasAccess && !showToggle) {
    return <span className="text-gray-400">{placeholder}</span>
  }

  if (showToggle) {
    return (
      <div className="inline-flex items-center gap-2">
        <span>
          {hasAccess && isRevealed ? children : placeholder}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-6 w-6 p-0"
        >
          {isRevealed ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
    )
  }

  return hasAccess ? children : <span className="text-gray-400">{placeholder}</span>
}

/**
 * Component for admin-only debug information
 */
export const DebugInfo = ({ data, title = 'Debug Info' }) => {
  const { isAdmin } = usePermissions()

  if (!isAdmin || import.meta.env.PROD) return null

  return (
    <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
      <summary className="cursor-pointer font-medium text-gray-700">
        {title}
      </summary>
      <pre className="mt-2 whitespace-pre-wrap text-left overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}

export default {
  withAccessControl,
  PermissionGate,
  usePermissions,
  AccessDenied,
  RoleBadge,
  SensitiveData,
  DebugInfo
}