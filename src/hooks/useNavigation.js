import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { safeNavigate, isValidRoute, ROUTES } from '@/utils';

/**
 * Custom hook for safe navigation with error handling and validation
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Safe navigation function
  const navigateTo = useCallback((path, options = {}) => {
    safeNavigate(navigate, path, options);
  }, [navigate]);

  // Go back with fallback
  const goBack = useCallback((fallback = ROUTES.HOME) => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigateTo(fallback);
      }
    } catch (error) {
      console.error('Go back error:', error);
      navigateTo(fallback, { replace: true });
    }
  }, [navigate, navigateTo]);

  // Go forward with error handling
  const goForward = useCallback(() => {
    try {
      navigate(1);
    } catch (error) {
      console.error('Go forward error:', error);
    }
  }, [navigate]);

  // Replace current route
  const replace = useCallback((path) => {
    navigateTo(path, { replace: true });
  }, [navigateTo]);

  // Check if current route is active
  const isActive = useCallback((path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Get current route info
  const currentRoute = useMemo(() => ({
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    isValid: isValidRoute(location.pathname)
  }), [location]);

  // Navigation helpers for common routes
  const helpers = useMemo(() => ({
    toHome: () => navigateTo(ROUTES.HOME),
    toLogin: () => navigateTo(ROUTES.LOGIN),
    toDashboard: () => navigateTo(ROUTES.DASHBOARD),
    toAddVehicle: () => navigateTo(ROUTES.ADD_VEHICLE),
    toMyListings: () => navigateTo(ROUTES.MY_LISTINGS),
    toVehicleDetails: (id) => navigateTo(ROUTES.VEHICLE_DETAILS, { state: { vehicleId: id } }),
    toCheckout: (vehicleId) => navigateTo(`${ROUTES.CHECKOUT}?vehicleId=${vehicleId}`),
    toPaymentSuccess: (vehicleId) => navigateTo(`${ROUTES.PAYMENT_SUCCESS}?vehicleId=${vehicleId}`)
  }), [navigateTo]);

  return {
    // Core navigation functions
    navigateTo,
    goBack,
    goForward,
    replace,
    
    // Route checking
    isActive,
    currentRoute,
    
    // Helper functions
    ...helpers
  };
};

export default useNavigation;