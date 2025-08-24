import React from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

/**
 * Skip Links component for keyboard navigation
 * Implements WCAG 2.1 bypass blocks guideline
 */
export function SkipLinks({ className }) {
  const { keyboardNavigation } = useAccessibility();

  if (!keyboardNavigation) return null;

  const skipLinks = [
    {
      href: '#main-content',
      text: 'דלג לתוכן הראשי',
      key: 'main',
      shortcut: 'Alt+H'
    },
    {
      href: '#main-navigation',
      text: 'דלג לניווט הראשי',
      key: 'nav',
      shortcut: 'Alt+N'
    },
    {
      href: '#search',
      text: 'דלג לחיפוש',
      key: 'search',
      shortcut: 'Alt+S'
    },
    {
      href: '#footer',
      text: 'דלג לכותרת תחתונה',
      key: 'footer',
      shortcut: 'Alt+F'
    }
  ];

  const handleSkipClick = (e, href) => {
    e.preventDefault();
    
    const targetId = href.substring(1); // Remove #
    const target = document.getElementById(targetId) || 
                  document.querySelector(`[data-skip-target="${targetId}"]`) ||
                  document.querySelector(href);
    
    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      
      // Focus and scroll to target
      target.focus();
      target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Remove tabindex after focus to restore natural tab order
      setTimeout(() => {
        if (target.getAttribute('tabindex') === '-1') {
          target.removeAttribute('tabindex');
        }
      }, 100);
    }
  };

  return (
    <nav 
      className={cn(
        'skip-links',
        'fixed top-0 left-0 z-[9999]',
        'bg-gray-900 text-white',
        'p-2 rounded-br-md',
        'transform -translate-y-full',
        'focus-within:translate-y-0',
        'transition-transform duration-200',
        className
      )}
      aria-label="קישורי דילוג"
      role="navigation"
    >
      <ul className="flex flex-col gap-1">
        {skipLinks.map(({ href, text, key, shortcut }) => (
          <li key={key}>
            <a
              href={href}
              className={cn(
                'skip-link',
                'block px-3 py-2',
                'text-sm font-medium',
                'text-white no-underline',
                'bg-gray-900 hover:bg-gray-800',
                'focus:bg-gray-800 focus:outline-none',
                'focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900',
                'rounded transition-colors',
                'whitespace-nowrap'
              )}
              onClick={(e) => handleSkipClick(e, href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSkipClick(e, href);
                }
              }}
              title={`${text} (${shortcut})`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{text}</span>
                <span className="text-xs opacity-75 bg-gray-700 px-1 rounded">
                  {shortcut}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Skip Target component to mark sections for skip links
 */
export function SkipTarget({ 
  id, 
  children, 
  as: Component = 'div',
  className,
  ...props 
}) {
  return (
    <Component
      id={id}
      data-skip-target={id}
      className={cn('skip-target', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export default SkipLinks;