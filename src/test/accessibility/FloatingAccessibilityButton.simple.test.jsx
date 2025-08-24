import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import FloatingAccessibilityButton from '@/components/accessibility/FloatingAccessibilityButton';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock announceToScreenReader
vi.mock('@/utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

describe('FloatingAccessibilityButton - Basic Tests', () => {
  it('should render the floating accessibility button', () => {
    render(
      <AccessibilityProvider>
        <FloatingAccessibilityButton />
      </AccessibilityProvider>
    );

    // Check if button exists
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <AccessibilityProvider>
        <FloatingAccessibilityButton />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('title');
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    expect(() => {
      render(
        <AccessibilityProvider>
          <FloatingAccessibilityButton />
        </AccessibilityProvider>
      );
    }).not.toThrow();
  });

  it('should render with responsive classes', () => {
    render(
      <AccessibilityProvider>
        <FloatingAccessibilityButton />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('w-14');
    expect(button.className).toContain('h-14');
  });
});