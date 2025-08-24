import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AdminGuard Component
 * Protects admin routes and ensures only admin users can access them
 */
export default function AdminGuard({ children, fallbackPath = '/dashboard' }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  
  // Debug logging for admin guard
  console.log('🛡️ AdminGuard - Check:', {
    userEmail: user?.email,
    userRole: user?.role,
    isAdminFromHook: isAdmin,
    isAdminByEmail: user?.email === 'zometauto@gmail.com',
    loading
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is admin (either by role or hardcoded email)
  const isUserAdmin = isAdmin || (user && user.email === 'zometauto@gmail.com') || (user && user.role === 'admin');
  
  // Show access denied if not admin
  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">אין הרשאה</h2>
            <p className="text-gray-600 mb-6">
              אין לך הרשאות מנהל לגשת לאזור זה. אזור זה מיועד למנהלי המערכת בלבד.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.history.back()} 
                className="w-full"
                variant="outline"
              >
                חזרה
              </Button>
              <Button 
                onClick={() => window.location.href = fallbackPath} 
                className="w-full"
              >
                לוח הבקרה שלי
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">מידע אבטחה</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                ניסיון הגישה נרשם במערכת לצורכי אבטחה
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children if user is admin
  return children;
}

/**
 * Higher-order component for protecting admin routes
 */
export function withAdminAuth(Component) {
  return function AdminProtectedComponent(props) {
    return (
      <AdminGuard>
        <Component {...props} />
      </AdminGuard>
    );
  };
}

/**
 * Hook for checking admin access in components
 */
export function useAdminAccess() {
  const { user, loading, isAdmin } = useAuth();
  
  return {
    user,
    loading,
    isAdmin,
    hasAdminAccess: !!user && isAdmin,
    isLoading: loading
  };
}