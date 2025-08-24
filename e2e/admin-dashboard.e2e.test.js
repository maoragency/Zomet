import { test, expect } from '@playwright/test'

// E2E tests for admin dashboard workflows
test.describe('Admin Dashboard Workflows', () => {
  const adminEmail = 'zometauto@gmail.com' // System admin email
  const adminPassword = 'AdminPassword123!'
  const testUserEmail = `admin-test-user-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  test.beforeAll(async ({ browser }) => {
    // Create a test user for admin operations
    const page = await browser.newPage()
    await page.goto('/')
    
    await page.click('text=הרשמה')
    await page.fill('input[name="email"]', testUserEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.fill('input[name="fullName"]', 'Admin Test User')
    await page.fill('input[name="phone"]', '0501234567')
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')
    
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/')
    await page.click('text=התחברות')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[name="password"]', adminPassword)
    await page.click('button[type="submit"]')
    
    // Wait for admin dashboard to load
    await expect(page.locator('text=לוח בקרה')).toBeVisible({ timeout: 10000 })
  })

  test.describe('Dashboard Overview', () => {
    test('should display admin dashboard with key metrics', async ({ page }) => {
      // Navigate to admin dashboard
      await page.click('text=לוח בקרה')
      await expect(page).toHaveURL(/.*admin.*dashboard/i)

      // Should show key metrics
      await expect(page.locator('.metric-card')).toHaveCount(4) // Total users, vehicles, messages, revenue
      
      // Check specific metrics
      await expect(page.locator('text=סך המשתמשים')).toBeVisible()
      await expect(page.locator('text=סך הרכבים')).toBeVisible()
      await expect(page.locator('text=הודעות פעילות')).toBeVisible()
      await expect(page.locator('text=הכנסות חודשיות')).toBeVisible()
      
      // Should show charts and graphs
      await expect(page.locator('.analytics-chart')).toBeVisible()
      await expect(page.locator('.activity-timeline')).toBeVisible()
    })

    test('should show real-time statistics', async ({ page }) => {
      await page.click('text=לוח בקרה')
      
      // Should show real-time data
      await expect(page.locator('.real-time-stats')).toBeVisible()
      await expect(page.locator('text=משתמשים מחוברים כעת')).toBeVisible()
      await expect(page.locator('text=פעילות אחרונה')).toBeVisible()
    })

    test('should filter dashboard by date range', async ({ page }) => {
      await page.click('text=לוח בקרה')
      
      // Change date range
      await page.click('.date-range-picker')
      await page.click('text=שבוע אחרון')
      
      // Should update metrics
      await expect(page.locator('.loading-spinner')).toBeVisible()
      await expect(page.locator('.loading-spinner')).not.toBeVisible()
      
      // Metrics should be updated
      await expect(page.locator('.metric-updated')).toBeVisible()
    })
  })

  test.describe('User Management', () => {
    test('should view and manage users', async ({ page }) => {
      // Navigate to user management
      await page.click('text=ניהול משתמשים')
      await expect(page).toHaveURL(/.*admin.*users/i)

      // Should show user list
      await expect(page.locator('.user-table')).toBeVisible()
      await expect(page.locator('th:has-text("אימייל")')).toBeVisible()
      await expect(page.locator('th:has-text("שם מלא")')).toBeVisible()
      await expect(page.locator('th:has-text("תפקיד")')).toBeVisible()
      await expect(page.locator('th:has-text("סטטוס")')).toBeVisible()
      
      // Should show our test user
      await expect(page.locator(`text=${testUserEmail}`)).toBeVisible()
    })

    test('should search and filter users', async ({ page }) => {
      await page.click('text=ניהול משתמשים')
      
      // Search for specific user
      await page.fill('input[name="userSearch"]', testUserEmail)
      await page.click('button:has-text("חיפוש")')
      
      // Should show filtered results
      await expect(page.locator(`text=${testUserEmail}`)).toBeVisible()
      
      // Filter by role
      await page.selectOption('select[name="roleFilter"]', 'user')
      
      // Should show only regular users
      const userRows = page.locator('.user-row')
      const count = await userRows.count()
      for (let i = 0; i < count; i++) {
        await expect(userRows.nth(i).locator('.user-role')).toHaveText('משתמש')
      }
    })

    test('should edit user details', async ({ page }) => {
      await page.click('text=ניהול משתמשים')
      
      // Find test user and click edit
      const userRow = page.locator(`tr:has-text("${testUserEmail}")`)
      await userRow.locator('button:has-text("עריכה")').click()
      
      // Should open edit modal
      await expect(page.locator('.edit-user-modal')).toBeVisible()
      
      // Update user details
      await page.fill('input[name="fullName"]', 'Updated Admin Test User')
      await page.selectOption('select[name="role"]', 'moderator')
      await page.click('button:has-text("שמור שינויים")')
      
      // Should show success message
      await expect(page.locator('text=משתמש עודכן בהצלחה')).toBeVisible()
      
      // Should reflect changes in table
      await expect(page.locator('text=Updated Admin Test User')).toBeVisible()
      await expect(page.locator('text=מנהל תוכן')).toBeVisible()
    })

    test('should deactivate and reactivate users', async ({ page }) => {
      await page.click('text=ניהול משתמשים')
      
      // Find test user and deactivate
      const userRow = page.locator(`tr:has-text("${testUserEmail}")`)
      await userRow.locator('button:has-text("השבת")').click()
      
      // Confirm deactivation
      await page.click('button:has-text("אישור")')
      
      // Should show success message
      await expect(page.locator('text=משתמש הושבת בהצלחה')).toBeVisible()
      
      // Should show as inactive
      await expect(userRow.locator('.status-inactive')).toBeVisible()
      
      // Reactivate user
      await userRow.locator('button:has-text("הפעל")').click()
      await page.click('button:has-text("אישור")')
      
      // Should show as active again
      await expect(page.locator('text=משתמש הופעל בהצלחה')).toBeVisible()
      await expect(userRow.locator('.status-active')).toBeVisible()
    })

    test('should bulk manage users', async ({ page }) => {
      await page.click('text=ניהול משתמשים')
      
      // Select multiple users
      await page.check('.select-all-users')
      
      // Bulk action
      await page.selectOption('select[name="bulkAction"]', 'deactivate')
      await page.click('button:has-text("בצע פעולה")')
      
      // Confirm bulk action
      await page.click('button:has-text("אישור")')
      
      // Should show success message
      await expect(page.locator('text=פעולה בוצעה בהצלחה')).toBeVisible()
    })
  })

  test.describe('Vehicle Management', () => {
    test('should view and moderate vehicle listings', async ({ page }) => {
      // Navigate to vehicle management
      await page.click('text=ניהול רכבים')
      await expect(page).toHaveURL(/.*admin.*vehicles/i)

      // Should show vehicle list with admin controls
      await expect(page.locator('.vehicle-admin-table')).toBeVisible()
      await expect(page.locator('th:has-text("כותרת")')).toBeVisible()
      await expect(page.locator('th:has-text("מחיר")')).toBeVisible()
      await expect(page.locator('th:has-text("סטטוס")')).toBeVisible()
      await expect(page.locator('th:has-text("פעולות")')).toBeVisible()
    })

    test('should approve pending vehicle listings', async ({ page }) => {
      await page.click('text=ניהול רכבים')
      
      // Filter by pending status
      await page.selectOption('select[name="statusFilter"]', 'pending')
      
      // Approve first pending vehicle
      await page.click('button:has-text("אשר")').first()
      
      // Should show success message
      await expect(page.locator('text=רכב אושר בהצלחה')).toBeVisible()
      
      // Should update status
      await expect(page.locator('.status-approved')).toBeVisible()
    })

    test('should reject inappropriate listings', async ({ page }) => {
      await page.click('text=ניהול רכבים')
      
      // Reject a listing
      await page.click('button:has-text("דחה")').first()
      
      // Should show rejection reason modal
      await expect(page.locator('.rejection-modal')).toBeVisible()
      
      // Fill rejection reason
      await page.fill('textarea[name="rejectionReason"]', 'תמונות לא ברורות ומידע חסר')
      await page.click('button:has-text("דחה מודעה")')
      
      // Should show success message
      await expect(page.locator('text=מודעה נדחתה')).toBeVisible()
    })

    test('should edit vehicle details as admin', async ({ page }) => {
      await page.click('text=ניהול רכבים')
      
      // Edit first vehicle
      await page.click('button:has-text("עריכה")').first()
      
      // Should open edit form
      await expect(page.locator('.admin-edit-vehicle-form')).toBeVisible()
      
      // Make changes
      await page.fill('input[name="price"]', '30000')
      await page.fill('textarea[name="adminNotes"]', 'מחיר עודכן על ידי מנהל')
      await page.click('button:has-text("שמור שינויים")')
      
      // Should show success message
      await expect(page.locator('text=רכב עודכן בהצלחה')).toBeVisible()
    })

    test('should manage featured listings', async ({ page }) => {
      await page.click('text=ניהול רכבים')
      
      // Feature a vehicle
      await page.click('button:has-text("הצג בראש")').first()
      
      // Should show success message
      await expect(page.locator('text=רכב הוצג בראש הדף')).toBeVisible()
      
      // Should show featured badge
      await expect(page.locator('.featured-badge')).toBeVisible()
    })
  })

  test.describe('Analytics and Reports', () => {
    test('should view comprehensive analytics', async ({ page }) => {
      // Navigate to analytics
      await page.click('text=דוחות וניתוחים')
      await expect(page).toHaveURL(/.*admin.*analytics/i)

      // Should show various analytics sections
      await expect(page.locator('.user-analytics')).toBeVisible()
      await expect(page.locator('.vehicle-analytics')).toBeVisible()
      await expect(page.locator('.revenue-analytics')).toBeVisible()
      await expect(page.locator('.engagement-analytics')).toBeVisible()
    })

    test('should generate custom reports', async ({ page }) => {
      await page.click('text=דוחות וניתוחים')
      
      // Create custom report
      await page.click('button:has-text("דוח מותאם")')
      
      // Configure report parameters
      await page.selectOption('select[name="reportType"]', 'user-activity')
      await page.fill('input[name="startDate"]', '2024-01-01')
      await page.fill('input[name="endDate"]', '2024-12-31')
      await page.check('input[name="includeCharts"]')
      
      await page.click('button:has-text("צור דוח")')
      
      // Should generate and display report
      await expect(page.locator('.custom-report')).toBeVisible()
      await expect(page.locator('.report-chart')).toBeVisible()
    })

    test('should export reports', async ({ page }) => {
      await page.click('text=דוחות וניתוחים')
      
      // Export user report
      await page.click('button:has-text("ייצא לאקסל")')
      
      // Should trigger download
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("הורד קובץ")')
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.xlsx')
    })

    test('should view real-time activity logs', async ({ page }) => {
      await page.click('text=דוחות וניתוחים')
      await page.click('text=לוג פעילות')
      
      // Should show activity log
      await expect(page.locator('.activity-log')).toBeVisible()
      await expect(page.locator('.log-entry')).toBeVisible()
      
      // Should be able to filter logs
      await page.selectOption('select[name="logLevel"]', 'error')
      await page.click('button:has-text("סנן")')
      
      // Should show filtered results
      await expect(page.locator('.error-log-entry')).toBeVisible()
    })
  })

  test.describe('System Settings', () => {
    test('should manage system configuration', async ({ page }) => {
      // Navigate to system settings
      await page.click('text=הגדרות מערכת')
      await expect(page).toHaveURL(/.*admin.*settings/i)

      // Should show various setting categories
      await expect(page.locator('.general-settings')).toBeVisible()
      await expect(page.locator('.email-settings')).toBeVisible()
      await expect(page.locator('.payment-settings')).toBeVisible()
      await expect(page.locator('.security-settings')).toBeVisible()
    })

    test('should update general settings', async ({ page }) => {
      await page.click('text=הגדרות מערכת')
      
      // Update site settings
      await page.fill('input[name="siteName"]', 'זומט אוטו - מעודכן')
      await page.fill('textarea[name="siteDescription"]', 'תיאור מעודכן לאתר')
      await page.check('input[name="maintenanceMode"]')
      
      await page.click('button:has-text("שמור הגדרות")')
      
      // Should show success message
      await expect(page.locator('text=הגדרות נשמרו בהצלחה')).toBeVisible()
    })

    test('should configure email templates', async ({ page }) => {
      await page.click('text=הגדרות מערכת')
      await page.click('text=תבניות אימייל')
      
      // Edit welcome email template
      await page.click('button:has-text("עריכה")').first()
      
      // Should open template editor
      await expect(page.locator('.email-template-editor')).toBeVisible()
      
      // Update template
      await page.fill('input[name="subject"]', 'ברוכים הבאים לזומט אוטו!')
      await page.fill('textarea[name="body"]', 'תוכן מעודכן לאימייל ברכה')
      
      await page.click('button:has-text("שמור תבנית")')
      
      // Should show success message
      await expect(page.locator('text=תבנית עודכנה בהצלחה')).toBeVisible()
    })

    test('should manage payment settings', async ({ page }) => {
      await page.click('text=הגדרות מערכת')
      await page.click('text=הגדרות תשלום')
      
      // Update payment configuration
      await page.fill('input[name="paypalClientId"]', 'updated-paypal-client-id')
      await page.check('input[name="enableCreditCard"]')
      await page.fill('input[name="commissionRate"]', '5')
      
      await page.click('button:has-text("שמור הגדרות תשלום")')
      
      // Should show success message
      await expect(page.locator('text=הגדרות תשלום עודכנו')).toBeVisible()
    })
  })

  test.describe('Content Moderation', () => {
    test('should review reported content', async ({ page }) => {
      // Navigate to content moderation
      await page.click('text=ניהול תוכן')
      await expect(page).toHaveURL(/.*admin.*moderation/i)

      // Should show reported content queue
      await expect(page.locator('.moderation-queue')).toBeVisible()
      await expect(page.locator('.reported-item')).toBeVisible()
    })

    test('should handle content reports', async ({ page }) => {
      await page.click('text=ניהול תוכן')
      
      // Review first reported item
      await page.click('.reported-item').first()
      
      // Should show report details
      await expect(page.locator('.report-details')).toBeVisible()
      
      // Take action on report
      await page.click('button:has-text("אשר דיווח")')
      await page.fill('textarea[name="moderationNote"]', 'תוכן לא מתאים - הוסר')
      await page.click('button:has-text("הסר תוכן")')
      
      // Should show success message
      await expect(page.locator('text=תוכן הוסר בהצלחה')).toBeVisible()
    })

    test('should manage blocked users', async ({ page }) => {
      await page.click('text=ניהול תוכן')
      await page.click('text=משתמשים חסומים')
      
      // Should show blocked users list
      await expect(page.locator('.blocked-users-list')).toBeVisible()
      
      // Unblock a user
      await page.click('button:has-text("בטל חסימה")').first()
      await page.click('button:has-text("אישור")')
      
      // Should show success message
      await expect(page.locator('text=חסימה בוטלה בהצלחה')).toBeVisible()
    })
  })

  test.describe('Backup and Maintenance', () => {
    test('should manage system backups', async ({ page }) => {
      // Navigate to backup settings
      await page.click('text=גיבוי ותחזוקה')
      await expect(page).toHaveURL(/.*admin.*backup/i)

      // Should show backup options
      await expect(page.locator('.backup-controls')).toBeVisible()
      
      // Create manual backup
      await page.click('button:has-text("צור גיבוי ידני")')
      
      // Should show backup progress
      await expect(page.locator('.backup-progress')).toBeVisible()
      
      // Should complete successfully
      await expect(page.locator('text=גיבוי הושלם בהצלחה')).toBeVisible({ timeout: 30000 })
    })

    test('should schedule automatic backups', async ({ page }) => {
      await page.click('text=גיבוי ותחזוקה')
      
      // Configure automatic backups
      await page.check('input[name="enableAutoBackup"]')
      await page.selectOption('select[name="backupFrequency"]', 'daily')
      await page.fill('input[name="backupTime"]', '02:00')
      
      await page.click('button:has-text("שמור הגדרות גיבוי")')
      
      // Should show success message
      await expect(page.locator('text=הגדרות גיבוי נשמרו')).toBeVisible()
    })

    test('should perform system maintenance', async ({ page }) => {
      await page.click('text=גיבוי ותחזוקה')
      await page.click('text=תחזוקת מערכת')
      
      // Run database cleanup
      await page.click('button:has-text("נקה מסד נתונים")')
      await page.click('button:has-text("אישור")')
      
      // Should show cleanup progress
      await expect(page.locator('.cleanup-progress')).toBeVisible()
      
      // Should complete successfully
      await expect(page.locator('text=ניקוי הושלם בהצלחה')).toBeVisible({ timeout: 30000 })
    })
  })

  test.describe('Security and Permissions', () => {
    test('should manage admin permissions', async ({ page }) => {
      // Navigate to security settings
      await page.click('text=אבטחה והרשאות')
      await expect(page).toHaveURL(/.*admin.*security/i)

      // Should show permission management
      await expect(page.locator('.permission-matrix')).toBeVisible()
      
      // Update role permissions
      await page.check('input[name="moderator-delete-users"]')
      await page.click('button:has-text("עדכן הרשאות")')
      
      // Should show success message
      await expect(page.locator('text=הרשאות עודכנו בהצלחה')).toBeVisible()
    })

    test('should view security logs', async ({ page }) => {
      await page.click('text=אבטחה והרשאות')
      await page.click('text=לוג אבטחה')
      
      // Should show security events
      await expect(page.locator('.security-log')).toBeVisible()
      await expect(page.locator('.security-event')).toBeVisible()
      
      // Filter by event type
      await page.selectOption('select[name="eventType"]', 'login_failure')
      await page.click('button:has-text("סנן")')
      
      // Should show filtered events
      await expect(page.locator('.login-failure-event')).toBeVisible()
    })

    test('should configure security policies', async ({ page }) => {
      await page.click('text=אבטחה והרשאות')
      await page.click('text=מדיניות אבטחה')
      
      // Update security settings
      await page.fill('input[name="maxLoginAttempts"]', '3')
      await page.fill('input[name="sessionTimeout"]', '30')
      await page.check('input[name="requireTwoFactor"]')
      
      await page.click('button:has-text("שמור מדיניות")')
      
      // Should show success message
      await expect(page.locator('text=מדיניות אבטחה עודכנה')).toBeVisible()
    })
  })

  test.describe('Mobile Admin Interface', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', adminEmail)
      await page.fill('input[name="password"]', adminPassword)
      await page.click('button[type="submit"]')
      
      // Should show mobile admin interface
      await expect(page.locator('.mobile-admin-menu')).toBeVisible()
      
      // Test mobile navigation
      await page.click('.mobile-menu-toggle')
      await expect(page.locator('.mobile-admin-sidebar')).toBeVisible()
      
      // Test mobile dashboard
      await page.click('text=לוח בקרה')
      await expect(page.locator('.mobile-dashboard')).toBeVisible()
    })
  })
})