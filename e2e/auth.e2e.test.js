import { test, expect } from '@playwright/test'

// E2E tests for authentication workflows
test.describe('Authentication Workflows', () => {
  const testEmail = `e2e-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testName = 'E2E Test User'
  const testPhone = '0501234567'

  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test.describe('User Registration Flow', () => {
    test('should complete full registration workflow', async ({ page }) => {
      // Navigate to signup page
      await page.click('text=הרשמה')
      await expect(page).toHaveURL(/.*signup/i)

      // Fill registration form
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.fill('input[name="confirmPassword"]', testPassword)
      await page.fill('input[name="fullName"]', testName)
      await page.fill('input[name="phone"]', testPhone)

      // Accept terms and conditions
      await page.check('input[type="checkbox"]')

      // Submit registration
      await page.click('button[type="submit"]')

      // Should redirect to verification page or dashboard
      await expect(page).toHaveURL(/.*login|.*dashboard/i)

      // Should show success message
      await expect(page.locator('text=הרשמה הושלמה בהצלחה')).toBeVisible({ timeout: 10000 })
    })

    test('should validate required fields', async ({ page }) => {
      await page.click('text=הרשמה')
      
      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Should show validation errors
      await expect(page.locator('text=שדה זה הוא חובה')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.click('text=הרשמה')
      
      await page.fill('input[name="email"]', 'invalid-email')
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')

      // Should show email validation error
      await expect(page.locator('text=כתובת אימייל לא תקינה')).toBeVisible()
    })

    test('should validate password strength', async ({ page }) => {
      await page.click('text=הרשמה')
      
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', 'weak')
      await page.click('button[type="submit"]')

      // Should show password strength error
      await expect(page.locator('text=הסיסמה חלשה מדי')).toBeVisible()
    })

    test('should validate password confirmation', async ({ page }) => {
      await page.click('text=הרשמה')
      
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.fill('input[name="confirmPassword"]', 'different-password')
      await page.click('button[type="submit"]')

      // Should show password mismatch error
      await expect(page.locator('text=הסיסמאות אינן תואמות')).toBeVisible()
    })
  })

  test.describe('User Login Flow', () => {
    test.beforeAll(async ({ browser }) => {
      // Create a test user for login tests
      const page = await browser.newPage()
      await page.goto('/')
      await page.click('text=הרשמה')
      
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.fill('input[name="confirmPassword"]', testPassword)
      await page.fill('input[name="fullName"]', testName)
      await page.fill('input[name="phone"]', testPhone)
      await page.check('input[type="checkbox"]')
      await page.click('button[type="submit"]')
      
      await page.close()
    })

    test('should login with valid credentials', async ({ page }) => {
      await page.click('text=התחברות')
      await expect(page).toHaveURL(/.*login/i)

      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard|.*home/i)
      
      // Should show user menu or profile
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should reject invalid credentials', async ({ page }) => {
      await page.click('text=התחברות')
      
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', 'wrong-password')
      await page.click('button[type="submit"]')

      // Should show error message
      await expect(page.locator('text=פרטי התחברות שגויים')).toBeVisible()
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/i)
    })

    test('should validate required login fields', async ({ page }) => {
      await page.click('text=התחברות')
      
      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Should show validation errors
      await expect(page.locator('text=שדה זה הוא חובה')).toBeVisible()
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should initiate password reset', async ({ page }) => {
      await page.click('text=התחברות')
      await page.click('text=שכחת סיסמה')

      await expect(page).toHaveURL(/.*forgot-password|.*reset/i)

      await page.fill('input[name="email"]', testEmail)
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=נשלח אימייל לאיפוס סיסמה')).toBeVisible()
    })

    test('should validate email for password reset', async ({ page }) => {
      await page.click('text=התחברות')
      await page.click('text=שכחת סיסמה')

      await page.fill('input[name="email"]', 'invalid-email')
      await page.click('button[type="submit"]')

      // Should show validation error
      await expect(page.locator('text=כתובת אימייל לא תקינה')).toBeVisible()
    })
  })

  test.describe('User Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login before profile tests
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      // Wait for login to complete
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should access and update profile', async ({ page }) => {
      // Navigate to profile
      await page.click('text=פרופיל')
      await expect(page).toHaveURL(/.*profile/i)

      // Update profile information
      await page.fill('input[name="fullName"]', 'Updated Test User')
      await page.fill('input[name="phone"]', '0509876543')
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=פרופיל עודכן בהצלחה')).toBeVisible()
    })

    test('should change password', async ({ page }) => {
      await page.click('text=פרופיל')
      await page.click('text=שינוי סיסמה')

      const newPassword = 'NewTestPassword123!'
      await page.fill('input[name="currentPassword"]', testPassword)
      await page.fill('input[name="newPassword"]', newPassword)
      await page.fill('input[name="confirmNewPassword"]', newPassword)
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=סיסמה שונתה בהצלחה')).toBeVisible()
    })
  })

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login before logout test
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should logout successfully', async ({ page }) => {
      // Click logout
      await page.click('text=התנתקות')

      // Should redirect to home page
      await expect(page).toHaveURL('/')
      
      // Should show login/signup options again
      await expect(page.locator('text=התחברות')).toBeVisible()
      await expect(page.locator('text=הרשמה')).toBeVisible()
    })
  })

  test.describe('Authentication State Persistence', () => {
    test('should maintain login state on page refresh', async ({ page }) => {
      // Login
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })

      // Refresh page
      await page.reload()

      // Should still be logged in
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should redirect to login when accessing protected pages', async ({ page }) => {
      // Try to access protected page without login
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/i)
      
      // Should show message about needing to login
      await expect(page.locator('text=נדרשת התחברות')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Test mobile login
      await page.click('text=התחברות')
      
      // Form should be visible and usable on mobile
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')

      // Should work on mobile
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('text=התחברות')
      
      // Navigate using keyboard
      await page.keyboard.press('Tab') // Email field
      await page.keyboard.type(testEmail)
      await page.keyboard.press('Tab') // Password field
      await page.keyboard.type(testPassword)
      await page.keyboard.press('Tab') // Submit button
      await page.keyboard.press('Enter')

      // Should login successfully
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('text=התחברות')
      
      // Check for accessibility attributes
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label')
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label')
      
      // Check for form validation ARIA attributes
      await page.click('button[type="submit"]')
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})