import { useCallback, useRef, useEffect } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

/**
 * Hook for making accessibility announcements to screen readers
 * Follows WCAG 2.1 guidelines for live regions
 */
export function useAccessibilityAnnouncer() {
  const { announcements, screenReaderMode } = useAccessibility();
  const politeRegionRef = useRef(null);
  const assertiveRegionRef = useRef(null);

  // Create live regions on mount
  useEffect(() => {
    if (!announcements) return;

    // Create polite live region
    if (!politeRegionRef.current) {
      const politeRegion = document.createElement('div');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'true');
      politeRegion.className = 'accessibility-status';
      politeRegion.id = 'accessibility-announcer-polite';
      document.body.appendChild(politeRegion);
      politeRegionRef.current = politeRegion;
    }

    // Create assertive live region
    if (!assertiveRegionRef.current) {
      const assertiveRegion = document.createElement('div');
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.className = 'accessibility-status';
      assertiveRegion.id = 'accessibility-announcer-assertive';
      document.body.appendChild(assertiveRegion);
      assertiveRegionRef.current = assertiveRegion;
    }

    // Cleanup on unmount
    return () => {
      if (politeRegionRef.current) {
        document.body.removeChild(politeRegionRef.current);
        politeRegionRef.current = null;
      }
      if (assertiveRegionRef.current) {
        document.body.removeChild(assertiveRegionRef.current);
        assertiveRegionRef.current = null;
      }
    };
  }, [announcements]);

  /**
   * Announce a message to screen readers
   * @param {string} message - The message to announce
   * @param {string} priority - 'polite' or 'assertive'
   * @param {number} delay - Delay before announcement (ms)
   */
  const announce = useCallback((message, priority = 'polite', delay = 100) => {
    if (!announcements || !message) return;

    const region = priority === 'assertive' ? assertiveRegionRef.current : politeRegionRef.current;
    
    if (!region) return;

    // Clear previous message
    region.textContent = '';

    // Announce new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      region.textContent = message;
      
      // Clear message after announcement to allow for repeated announcements
      setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, 1000);
    }, delay);
  }, [announcements]);

  /**
   * Announce navigation changes
   */
  const announceNavigation = useCallback((pageName) => {
    announce(`עבר לעמוד ${pageName}`, 'polite');
  }, [announce]);

  /**
   * Announce form validation errors
   */
  const announceError = useCallback((error) => {
    announce(`שגיאה: ${error}`, 'assertive');
  }, [announce]);

  /**
   * Announce successful actions
   */
  const announceSuccess = useCallback((message) => {
    announce(`הצלחה: ${message}`, 'polite');
  }, [announce]);

  /**
   * Announce loading states
   */
  const announceLoading = useCallback((isLoading, context = '') => {
    if (isLoading) {
      announce(`טוען ${context}...`, 'polite');
    } else {
      announce(`טעינה הושלמה ${context}`, 'polite');
    }
  }, [announce]);

  /**
   * Announce dynamic content changes
   */
  const announceContentChange = useCallback((message) => {
    announce(`התוכן השתנה: ${message}`, 'polite');
  }, [announce]);

  return {
    announce,
    announceNavigation,
    announceError,
    announceSuccess,
    announceLoading,
    announceContentChange,
  };
}

export default useAccessibilityAnnouncer;