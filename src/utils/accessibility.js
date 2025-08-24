// Accessibility utility functions

/**
 * Announce a message to screen readers and accessibility tools
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  // Create announcement element
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
  
  // Also trigger custom event for visual announcements
  document.dispatchEvent(new CustomEvent('accessibility-announce', {
    detail: { message, priority }
  }));
}

/**
 * Set focus to an element with announcement
 * @param {HTMLElement|string} element - Element or selector
 * @param {string} message - Optional announcement message
 */
export function setAccessibleFocus(element, message) {
  const targetElement = typeof element === 'string' 
    ? document.querySelector(element) 
    : element;
    
  if (!targetElement) return;
  
  targetElement.focus();
  
  if (message) {
    announceToScreenReader(message);
  }
}

/**
 * Add skip link functionality
 * @param {string} targetId - ID of target element
 * @param {string} linkText - Text for skip link
 */
export function addSkipLink(targetId, linkText) {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = linkText;
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAccessibleFocus(`#${targetId}`, `עבר ל${linkText}`);
  });
  
  document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast() {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get appropriate ARIA label for element
 * @param {string} text - Base text
 * @param {object} context - Additional context
 */
export function getAriaLabel(text, context = {}) {
  let label = text;
  
  if (context.required) {
    label += ' (שדה חובה)';
  }
  
  if (context.error) {
    label += ` (שגיאה: ${context.error})`;
  }
  
  if (context.description) {
    label += ` (${context.description})`;
  }
  
  return label;
}

/**
 * Create accessible button with proper ARIA attributes
 * @param {object} options - Button options
 */
export function createAccessibleButton(options = {}) {
  const {
    text,
    onClick,
    ariaLabel,
    ariaDescribedBy,
    disabled = false,
    className = ''
  } = options;
  
  const button = document.createElement('button');
  button.textContent = text;
  button.className = className;
  button.disabled = disabled;
  
  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }
  
  if (ariaDescribedBy) {
    button.setAttribute('aria-describedby', ariaDescribedBy);
  }
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  return button;
}

/**
 * Manage keyboard navigation
 */
export class KeyboardNavigationManager {
  constructor() {
    this.focusableElements = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])'
    ].join(', ');
  }
  
  getFocusableElements(container = document) {
    return Array.from(container.querySelectorAll(this.focusableElements));
  }
  
  trapFocus(container) {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      if (e.key === 'Escape') {
        this.releaseFocus();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
  
  releaseFocus() {
    // Return focus to previously focused element
    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
      this.previouslyFocused = null;
    }
  }
  
  saveFocus() {
    this.previouslyFocused = document.activeElement;
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrastChecker {
  static getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  static getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
  
  static meetsWCAG(color1, color2, level = 'AA') {
    const ratio = this.getContrastRatio(color1, color2);
    return level === 'AAA' ? ratio >= 7 : ratio >= 4.5;
  }
}

/**
 * Text-to-speech utilities
 */
export class TextToSpeech {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.loadVoices();
  }
  
  loadVoices() {
    const voices = this.synth.getVoices();
    // Prefer Hebrew voice
    this.voice = voices.find(voice => voice.lang.startsWith('he')) || voices[0];
  }
  
  speak(text, options = {}) {
    if (!this.synth) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    this.synth.speak(utterance);
  }
  
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

// Export singleton instances
export const keyboardNav = new KeyboardNavigationManager();
export const tts = new TextToSpeech();

// Initialize accessibility utilities
export function initializeAccessibility() {
  // Add global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Alt + A: Toggle accessibility menu
    if (e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const accessibilityButton = document.querySelector('[aria-label*="הגדרות נגישות"]');
      if (accessibilityButton) {
        accessibilityButton.click();
        announceToScreenReader('תפריט נגישות נפתח');
      }
    }
    
    // Alt + H: Go to main content
    if (e.altKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      setAccessibleFocus('#main-content', 'עבר לתוכן הראשי');
    }
    
    // Alt + N: Go to navigation
    if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      setAccessibleFocus('#main-navigation', 'עבר לניווט הראשי');
    }
    
    // Alt + S: Go to search
    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      setAccessibleFocus('#search', 'עבר לחיפוש');
    }
    
    // Alt + F: Go to footer
    if (e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setAccessibleFocus('#footer', 'עבר לכותרת תחתונה');
    }
  });
  
  // Announce page changes
  let currentPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      setTimeout(() => {
        const title = document.title;
        announceToScreenReader(`עמוד חדש נטען: ${title}`);
      }, 100);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}