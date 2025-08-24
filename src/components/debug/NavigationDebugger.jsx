import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES, isValidRoute } from '@/utils';

/**
 * Safe Navigation debugger component
 */
const SafeNavigationDebugger = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const testRoutes = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'Add Vehicle', path: ROUTES.ADD_VEHICLE },
    { name: 'Vehicle Details', path: ROUTES.VEHICLE_DETAILS },
    { name: 'My Listings', path: ROUTES.MY_LISTINGS },
    { name: 'Login', path: ROUTES.LOGIN },
    { name: 'Dashboard', path: ROUTES.DASHBOARD }
  ];

  const handleTestNavigation = (path) => {
    console.log(`Testing navigation to: ${path}`);
    try {
      navigate(path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white shadow-lg border-2 border-red-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-red-600">Navigation Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs">
          <div><strong>Current Path:</strong> {location.pathname}</div>
          <div><strong>Search:</strong> {location.search}</div>
          <div><strong>Valid Route:</strong> {isValidRoute(location.pathname) ? '✅' : '❌'}</div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs font-semibold">Test Navigation:</div>
          {testRoutes.map((route) => (
            <Button
              key={route.path}
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleTestNavigation(route.path)}
            >
              {route.name} ({route.path})
            </Button>
          ))}
        </div>
        
        <Button
          variant="destructive"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            localStorage.setItem('hideNavigationDebugger', 'true');
            window.location.reload();
          }}
        >
          Hide Debugger
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Main NavigationDebugger component with error handling
 */
export const NavigationDebugger = () => {
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Check if debugger is disabled
  if (typeof window !== 'undefined' && localStorage.getItem('hideNavigationDebugger') === 'true') {
    return null;
  }

  try {
    return <SafeNavigationDebugger />;
  } catch (error) {
    console.warn('NavigationDebugger error:', error);
    return null;
  }
};

export default NavigationDebugger;