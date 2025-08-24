import { test, expect } from '@playwright/test';

test.describe('Floating Accessibility Button E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test.describe('Desktop Tests', () => {
    test('should display floating accessibility button', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeVisible();
    });

    test('should expand when clicked', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
    });

    test('should be draggable', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      // Get initial position
      const initialBox = await button.boundingBox();
      
      // Drag the button
      await button.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
      await page.mouse.up();
      
      // Check new position
      const newBox = await button.boundingBox();
      expect(newBox.x).not.toBe(initialBox.x);
      expect(newBox.y).not.toBe(initialBox.y);
    });

    test('should minimize and restore', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      // Minimize
      const minimizeButton = page.locator('[aria-label="מזער"]');
      await minimizeButton.click();
      
      // Check minimized state
      const minimizedButton = page.locator('[aria-label*="לחץ לשחזור"]');
      await expect(minimizedButton).toBeVisible();
      
      // Restore
      await minimizedButton.click();
      const restoredButton = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(restoredButton).toBeVisible();
    });

    test('should handle keyboard shortcuts', async ({ page }) => {
      // Alt+Shift+A to toggle panel
      await page.keyboard.press('Alt+Shift+A');
      
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
      
      // Escape to close
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
    });

    test('should toggle accessibility features', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      // Toggle main accessibility
      const mainToggle = page.locator('[aria-label*="הפעל או בטל מצב נגישות"]');
      await mainToggle.click();
      
      // Check if accessibility is enabled
      const body = page.locator('body');
      await expect(body).toHaveClass(/accessibility-enabled/);
    });

    test('should show close confirmation dialog', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      const closeButton = page.locator('[aria-label="הסתר כפתור"]');
      await closeButton.click();
      
      const dialog = page.locator('text=הסתרת כפתור נגישות');
      await expect(dialog).toBeVisible();
    });

    test('should temporarily hide button', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      const closeButton = page.locator('[aria-label="הסתר כפתור"]');
      await closeButton.click();
      
      const temporaryHideButton = page.locator('text=הסתר זמנית').first();
      await temporaryHideButton.click();
      
      // Button should be hidden
      await expect(button).not.toBeVisible();
      
      // Temporary show button should appear
      const showButton = page.locator('text=נגישות');
      await expect(showButton).toBeVisible();
    });

    test('should persist position after page reload', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      // Drag to new position
      const initialBox = await button.boundingBox();
      await button.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 200, initialBox.y + 200);
      await page.mouse.up();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check if position is maintained
      const reloadedButton = page.locator('[aria-label*="כפתור נגישות צף"]');
      const newBox = await reloadedButton.boundingBox();
      
      expect(Math.abs(newBox.x - (initialBox.x + 200))).toBeLessThan(10);
      expect(Math.abs(newBox.y - (initialBox.y + 200))).toBeLessThan(10);
    });
  });

  test.describe('Mobile Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('should display on mobile', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeVisible();
    });

    test('should be touch-friendly', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      // Check minimum touch target size (44px)
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    });

    test('should expand properly on mobile', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.tap();
      
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
      
      // Panel should not exceed viewport
      const panelBox = await panel.boundingBox();
      const viewport = page.viewportSize();
      
      expect(panelBox.width).toBeLessThanOrEqual(viewport.width * 0.9);
      expect(panelBox.height).toBeLessThanOrEqual(viewport.height * 0.8);
    });

    test('should handle touch drag', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      const initialBox = await button.boundingBox();
      
      // Touch drag
      await page.touchscreen.tap(initialBox.x + initialBox.width/2, initialBox.y + initialBox.height/2);
      await page.touchscreen.tap(initialBox.x + 100, initialBox.y + 100);
      
      // Position should change
      const newBox = await button.boundingBox();
      expect(newBox.x).not.toBe(initialBox.x);
    });
  });

  test.describe('Tablet Tests', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad

    test('should display properly on tablet', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeVisible();
    });

    test('should handle both touch and mouse interactions', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      // Touch interaction
      await button.tap();
      let panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
      
      // Close panel
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      
      // Mouse interaction
      await button.click();
      panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab to the button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeFocused();
      
      // Enter to activate
      await page.keyboard.press('Enter');
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      await expect(button).toHaveAttribute('aria-label');
      await expect(button).toHaveAttribute('title');
    });

    test('should work with screen reader simulation', async ({ page }) => {
      // Enable screen reader mode
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      const screenReaderToggle = page.locator('[aria-label*="הפעל או בטל מצב קורא מסך"]');
      await screenReaderToggle.click();
      
      // Check if screen reader class is applied
      const body = page.locator('body');
      await expect(body).toHaveClass(/accessibility-screen-reader/);
    });

    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      // Check if reduced motion class is applied
      const body = page.locator('body');
      await expect(body).toHaveClass(/accessibility-reduced-motion/);
    });

    test('should work with high contrast mode', async ({ page }) => {
      // Enable high contrast
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await button.click();
      
      const contrastToggle = page.locator('[aria-label*="הפעל או בטל ניגודיות גבוהה"]');
      await contrastToggle.click();
      
      // Check if high contrast class is applied
      const body = page.locator('body');
      await expect(body).toHaveClass(/accessibility-high-contrast/);
    });
  });

  test.describe('Performance Tests', () => {
    test('should not affect page load performance', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(5000);
      
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeVisible();
    });

    test('should handle rapid interactions', async ({ page }) => {
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await button.click();
        await page.waitForTimeout(100);
      }
      
      // Should still be functional
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
    });

    test('should maintain smooth scrolling with button visible', async ({ page }) => {
      // Scroll down and up multiple times
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, 1000));
        await page.waitForTimeout(100);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
      }
      
      // Button should still be visible and functional
      const button = page.locator('[aria-label*="כפתור נגישות צף"]');
      await expect(button).toBeVisible();
      await button.click();
      
      const panel = page.locator('text=מרכז נגישות');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);
        
        const button = page.locator('[aria-label*="כפתור נגישות צף"]');
        await expect(button).toBeVisible();
        
        await button.click();
        const panel = page.locator('text=מרכז נגישות');
        await expect(panel).toBeVisible();
      });
    });
  });
});