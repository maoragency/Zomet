import { useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

/**
 * Hook for enhanced keyboard navigation support
 * Implements WCAG 2.1 keyboard navigation guidelines
 */
export function useKeyboardNavigation() {
  const { keyboardNavigation, focusVisible } = useAccessibility();
  const trapRef = useRef(null);

  /**
   * Get all focusable elements within a container
   */
  const getFocusableElements = useCallback((container = document) => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'iframe',
      'object',
      'embed',
      'area[href]',
      'summary'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        // Check if element is visible and not hidden
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
      });
  }, []);

  /**
   * Focus trap for modal dialogs and dropdowns
   */
  const createFocusTrap = useCallback((container) => {
    if (!keyboardNavigation || !container) return null;

    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardNavigation, getFocusableElements]);

  /**
   * Skip links functionality
   */
  const createSkipLinks = useCallback(() => {
    if (!keyboardNavigation) return;

    const skipLinksContainer = document.getElementById('skip-links');
    if (skipLinksContainer) return; // Already exists

    const skipLinks = document.createElement('div');
    skipLinks.id = 'skip-links';
    skipLinks.className = 'skip-links';
    skipLinks.setAttribute('role', 'navigation');
    skipLinks.setAttribute('aria-label', 'קישורי דילוג');

    const mainContent = document.querySelector('main');
    const navigation = document.querySelector('nav');
    const footer = document.querySelector('footer');

    const links = [];

    if (mainContent) {
      links.push({
        href: '#main-content',
        text: 'דלג לתוכן הראשי',
        target: mainContent
      });
    }

    if (navigation) {
      links.push({
        href: '#main-navigation',
        text: 'דלג לניווט',
        target: navigation
      });
    }

    if (footer) {
      links.push({
        href: '#footer',
        text: 'דלג לכותרת תחתונה',
        target: footer
      });
    }

    links.forEach(({ href, text, target }) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.className = 'skip-link';
      
      link.addEventListener('click', (e) => {
        e.preventDefault();
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      skipLinks.appendChild(link);
    });

    document.body.insertBefore(skipLinks, document.body.firstChild);
  }, [keyboardNavigation]);

  /**
   * Arrow key navigation for lists and grids
   */
  const useArrowNavigation = useCallback((containerRef, options = {}) => {
    const {
      direction = 'both', // 'horizontal', 'vertical', 'both'
      wrap = true,
      itemSelector = '[role="option"], [role="menuitem"], [role="gridcell"], button, a'
    } = options;

    useEffect(() => {
      if (!keyboardNavigation || !containerRef.current) return;

      const container = containerRef.current;
      const items = Array.from(container.querySelectorAll(itemSelector));

      const handleKeyDown = (e) => {
        const currentIndex = items.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (e.key) {
          case 'ArrowDown':
            if (direction === 'vertical' || direction === 'both') {
              e.preventDefault();
              nextIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
            }
            break;
          case 'ArrowUp':
            if (direction === 'vertical' || direction === 'both') {
              e.preventDefault();
              nextIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
            }
            break;
          case 'ArrowRight':
            if (direction === 'horizontal' || direction === 'both') {
              e.preventDefault();
              nextIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
            }
            break;
          case 'ArrowLeft':
            if (direction === 'horizontal' || direction === 'both') {
              e.preventDefault();
              nextIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
            }
            break;
          case 'Home':
            e.preventDefault();
            nextIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            nextIndex = items.length - 1;
            break;
        }

        if (nextIndex !== currentIndex && items[nextIndex]) {
          items[nextIndex].focus();
        }
      };

      container.addEventListener('keydown', handleKeyDown);

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }, [keyboardNavigation, containerRef, direction, wrap, itemSelector]);
  }, [keyboardNavigation]);

  /**
   * Escape key handler for closing modals/dropdowns
   */
  const useEscapeKey = useCallback((callback, isActive = true) => {
    useEffect(() => {
      if (!keyboardNavigation || !isActive) return;

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          callback();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [callback, isActive, keyboardNavigation]);
  }, [keyboardNavigation]);

  /**
   * Focus management for dynamic content
   */
  const manageFocus = useCallback((element, options = {}) => {
    if (!keyboardNavigation || !element) return;

    const { 
      preventScroll = false, 
      restoreFocus = true,
      announceChange = false 
    } = options;

    const previouslyFocused = document.activeElement;

    // Set tabindex if needed
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1');
    }

    // Focus the element
    element.focus({ preventScroll });

    // Announce focus change if requested
    if (announceChange && element.textContent) {
      const announcement = `פוקוס עבר ל: ${element.textContent}`;
      // This would use the announcer hook
      console.log(announcement); // Placeholder
    }

    // Return function to restore focus
    return () => {
      if (restoreFocus && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [keyboardNavigation]);

  /**
   * Initialize keyboard navigation features
   */
  useEffect(() => {
    if (!keyboardNavigation) return;

    createSkipLinks();

    // Add keyboard event listeners for global shortcuts
    const handleGlobalKeyDown = (e) => {
      // Alt + 1: Focus main content
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        const main = document.querySelector('main');
        if (main) {
          manageFocus(main, { announceChange: true });
        }
      }

      // Alt + 2: Focus navigation
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        const nav = document.querySelector('nav');
        if (nav) {
          manageFocus(nav, { announceChange: true });
        }
      }

      // Alt + 3: Focus search
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        const search = document.querySelector('[role="search"], input[type="search"]');
        if (search) {
          manageFocus(search, { announceChange: true });
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [keyboardNavigation, createSkipLinks, manageFocus]);

  return {
    createFocusTrap,
    useArrowNavigation,
    useEscapeKey,
    manageFocus,
    getFocusableElements,
  };
}

export default useKeyboardNavigation;