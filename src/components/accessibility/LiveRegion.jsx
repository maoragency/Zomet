import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

/**
 * Live Region component for screen reader announcements
 * Implements WCAG 2.1 live regions for dynamic content
 */
export function LiveRegion({ 
  message, 
  priority = 'polite', 
  atomic = true,
  relevant = 'additions text',
  className,
  clearDelay = 1000,
  ...props 
}) {
  const { announcements, screenReaderMode } = useAccessibility();
  const regionRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!announcements || !message) return;

    const region = regionRef.current;
    if (!region) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the message
    region.textContent = message;

    // Clear the message after delay to allow for repeated announcements
    if (clearDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, clearDelay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, announcements, clearDelay]);

  if (!announcements) return null;

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(
        'live-region',
        // Hide visually but keep accessible to screen readers
        'absolute left-[-10000px] w-[1px] h-[1px] overflow-hidden',
        // Show in screen reader mode for debugging
        screenReaderMode && 'static w-auto h-auto overflow-visible bg-blue-100 border border-blue-300 p-2 rounded text-sm',
        className
      )}
      {...props}
    />
  );
}

/**
 * Status Region for status messages
 */
export function StatusRegion({ children, className, ...props }) {
  return (
    <LiveRegion
      message={children}
      priority="polite"
      className={cn('status-region', className)}
      {...props}
    />
  );
}

/**
 * Alert Region for urgent messages
 */
export function AlertRegion({ children, className, ...props }) {
  return (
    <LiveRegion
      message={children}
      priority="assertive"
      className={cn('alert-region', className)}
      {...props}
    />
  );
}

/**
 * Loading Announcer component
 */
export function LoadingAnnouncer({ 
  isLoading, 
  loadingMessage = 'טוען...', 
  completeMessage = 'טעינה הושלמה',
  className 
}) {
  const message = isLoading ? loadingMessage : completeMessage;
  
  return (
    <StatusRegion className={className}>
      {isLoading ? loadingMessage : ''}
    </StatusRegion>
  );
}

/**
 * Navigation Announcer component
 */
export function NavigationAnnouncer({ 
  currentPage, 
  className 
}) {
  const message = currentPage ? `עבר לעמוד ${currentPage}` : '';
  
  return (
    <StatusRegion className={className}>
      {message}
    </StatusRegion>
  );
}

/**
 * Form Status Announcer component
 */
export function FormStatusAnnouncer({ 
  status, 
  message, 
  className 
}) {
  const Component = status === 'error' ? AlertRegion : StatusRegion;
  
  return (
    <Component className={className}>
      {message}
    </Component>
  );
}

export default LiveRegion;