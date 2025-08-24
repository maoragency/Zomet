import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

/**
 * Enhanced Button component with accessibility features
 * Implements WCAG 2.1 AA guidelines for interactive elements
 */
export const AccessibleButton = forwardRef(({
  children,
  className,
  disabled = false,
  loading = false,
  loadingText = 'טוען...',
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaHaspopup,
  ariaPressed,
  onClick,
  onKeyDown,
  type = 'button',
  variant = 'default',
  size = 'default',
  ...props
}, ref) => {
  const { isEnabled, screenReaderMode, keyboardNavigation } = useAccessibility();

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const handleKeyDown = (e) => {
    if (!keyboardNavigation) return;

    // Enhanced keyboard support
    if (e.key === 'Enter' || e.key === ' ') {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }
      
      // Prevent default for space to avoid page scroll
      if (e.key === ' ') {
        e.preventDefault();
      }
      
      // Trigger click for space key
      if (e.key === ' ' && onClick) {
        onClick(e);
      }
    }

    onKeyDown?.(e);
  };

  const accessibilityProps = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHaspopup,
    'aria-pressed': ariaPressed,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
  };

  // Remove undefined values
  Object.keys(accessibilityProps).forEach(key => {
    if (accessibilityProps[key] === undefined) {
      delete accessibilityProps[key];
    }
  });

  return (
    <Button
      ref={ref}
      type={type}
      variant={variant}
      size={size}
      className={cn(
        // Base accessibility classes
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Enhanced focus for accessibility mode
        isEnabled && 'accessibility-enhanced-focus',
        // Screen reader optimizations
        screenReaderMode && 'accessibility-screen-reader-optimized',
        // Loading state
        loading && 'opacity-70 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span 
            className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;