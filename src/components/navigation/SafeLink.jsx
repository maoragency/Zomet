import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { safeNavigate, isValidRoute, ROUTES } from '@/utils';

/**
 * SafeLink component that provides error handling and validation for navigation
 */
export const SafeLink = ({ 
  to, 
  children, 
  className, 
  onClick, 
  replace = false,
  fallback = ROUTES.HOME,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // If default prevented, don't navigate
    if (e.defaultPrevented) {
      return;
    }

    // Validate route
    if (!isValidRoute(to)) {
      console.warn(`Invalid route detected: ${to}, falling back to: ${fallback}`);
      e.preventDefault();
      safeNavigate(navigate, fallback, { replace });
      return;
    }
  };

  return (
    <Link 
      to={to} 
      className={className} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
};

/**
 * SafeNavigateButton component for programmatic navigation with error handling
 */
export const SafeNavigateButton = ({ 
  to, 
  children, 
  className, 
  onClick, 
  replace = false,
  fallback = ROUTES.HOME,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    try {
      // Call custom onClick if provided
      if (onClick) {
        onClick(e);
      }

      // Navigate safely
      safeNavigate(navigate, to, { replace });
    } catch (error) {
      console.error('Navigation error:', error);
      safeNavigate(navigate, fallback, { replace: true });
    }
  };

  return (
    <button 
      className={className} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default SafeLink;