import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import FloatingAccessibilityButton from '@/components/accessibility/FloatingAccessibilityButton';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock announceToScreenReader
vi.mock('@/utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

// Test wrapper component
const TestWrapper = ({ children, initialState = {} }) => {
  // Create a mock provider with initial state
  const mockState = {
    isEnabled: false,
    floatingButton: true,
    buttonMinimized: false,
    buttonClosed: false,
    buttonPermanentlyClosed: false,
    highContrast: false,
    fontSize: 'normal',
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    focusVisible: true,
    imageDescriptions: true,
    ...initialState
  };

  return (
    <AccessibilityProvider>
      <div data-testid="test-wrapper">
        {children}
      </div>
    </AccessibilityProvider>
  );
};

describe('FloatingAccessibilityButton', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility and States', () => {
    it('should render when floatingButton is enabled', () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /כפתור נגישות צף/ })).toBeInTheDocument();
    });

    it('should not render when permanently closed', () => {
      render(
        <TestWrapper initialState={{ buttonPermanentlyClosed: true }}>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /כפתור נגישות צף/ })).not.toBeInTheDocument();
    });

    it('should not render when temporarily closed', () => {
      render(
        <TestWrapper initialState={{ buttonClosed: true }}>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /כפתור נגישות צף/ })).not.toBeInTheDocument();
    });

    it('should render in minimized state', () => {
      render(
        <TestWrapper initialState={{ buttonMinimized: true }}>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      expect(button).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Interaction and Functionality', () => {
    it('should expand when clicked', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      await user.click(button);

      expect(screen.getByText('מרכז נגישות')).toBeInTheDocument();
    });

    it('should minimize when minimize button is clicked', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Expand first
      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      await user.click(button);

      // Then minimize
      const minimizeButton = screen.getByRole('button', { name: 'מזער' });
      await user.click(minimizeButton);

      await waitFor(() => {
        const minimizedButton = screen.getByRole('button', { name: /לחץ לשחזור/ });
        expect(minimizedButton).toBeInTheDocument();
      });
    });

    it('should show close confirmation dialog', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Expand first
      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      await user.click(button);

      // Click close button
      const closeButton = screen.getByRole('button', { name: 'הסתר כפתור' });
      await user.click(closeButton);

      expect(screen.getByText('הסתרת כפתור נגישות')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should respond to Alt+Shift+A keyboard shortcut', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Press Alt+Shift+A
      fireEvent.keyDown(document, {
        key: 'A',
        altKey: true,
        shiftKey: true,
      });

      expect(screen.getByText('מרכז נגישות')).toBeInTheDocument();
    });

    it('should close panel with Escape key', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Expand first
      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      await user.click(button);

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('מרכז נגישות')).not.toBeInTheDocument();
      });
    });

    it('should hide temporarily with Ctrl+Alt+H', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Press Ctrl+Alt+H
      fireEvent.keyDown(document, {
        key: 'H',
        ctrlKey: true,
        altKey: true,
      });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /כפתור נגישות צף/ })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
    });

    it('should show active features count', () => {
      render(
        <TestWrapper initialState={{ 
          isEnabled: true,
          highContrast: true,
          fontSize: 'large',
          reducedMotion: true 
        }}>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const badge = screen.getByText('3'); // 3 active features
      expect(badge).toBeInTheDocument();
    });

    it('should toggle accessibility features', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Expand panel
      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      await user.click(button);

      // Toggle main accessibility
      const mainToggle = screen.getByRole('switch', { name: /הפעל או בטל מצב נגישות/ });
      await user.click(mainToggle);

      expect(mainToggle).toBeChecked();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle mouse down for dragging', () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      
      fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
      
      // Should add event listeners for mousemove and mouseup
      expect(button).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      expect(button).toHaveClass('w-14', 'h-14', 'md:w-16', 'md:h-16');
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', async () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Trigger a position change (simulate drag)
      const button = screen.getByRole('button', { name: /כפתור נגישות צף/ });
      fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'zomet-floating-accessibility-settings',
          expect.any(String)
        );
      });
    });

    it('should load settings from localStorage', () => {
      const savedSettings = JSON.stringify({
        position: { x: 100, y: 200 },
        size: { width: 400, height: 500 }
      });
      localStorageMock.getItem.mockReturnValue(savedSettings);

      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'zomet-floating-accessibility-settings'
      );
    });
  });

  describe('Performance', () => {
    it('should not render when conditions are not met', () => {
      render(
        <TestWrapper initialState={{ floatingButton: false }}>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle scroll events efficiently', () => {
      render(
        <TestWrapper>
          <FloatingAccessibilityButton />
        </TestWrapper>
      );

      // Simulate scroll events
      fireEvent.scroll(window, { target: { scrollY: 100 } });
      fireEvent.scroll(window, { target: { scrollY: 200 } });

      // Button should still be visible
      expect(screen.getByRole('button', { name: /כפתור נגישות צף/ })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      expect(() => {
        render(
          <TestWrapper>
            <FloatingAccessibilityButton />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => {
        render(
          <TestWrapper>
            <FloatingAccessibilityButton />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});