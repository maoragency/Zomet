import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AuthGuard component to protect routes that require authentication
 */
export default function AuthGuard({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Navigate 
        to="/Login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">אין הרשאה</h2>
          <p className="text-gray-600 max-w-md">
            אין לך הרשאה לגשת לעמוד זה. נדרשות הרשאות מנהל.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            חזור לעמוד הקודם
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return children;
}

/**
 * Higher-order component version of AuthGuard
 */
export function withAuthGuard(Component, requireAdmin = false) {
  return function AuthGuardedComponent(props) {
    return (
      <AuthGuard requireAdmin={requireAdmin}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}