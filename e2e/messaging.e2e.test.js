import { test, expect } from '@playwright/test'

// E2E tests for messaging and notification workflows
test.describe('Messaging and Notifications Workflows', () => {
  const testUser1Email = `msg-user1-${Date.now()}@example.com`
  const testUser2Email = `msg-user2-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testName1 = 'Message User 1'
  const testName2 = 'Message User 2'

  test.beforeAll(async ({ browser }) => {
    // Create two test users for messaging
    const page = await browser.newPage()
    await page.goto('/')
    
    // Create first user
    await page.click('text=הרשמה')
    await page.fill('input[name="email"]', testUser1Email)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.fill('input[name="fullName"]', testName1)
    await page.fill('input[name="phone"]', '0501234567')
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')
    
    // Logout and create second user
    await page.click('text=התנתקות')
    await page.click('text=הרשמה')
    await page.fill('input[name="email"]', testUser2Email)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.fill('input[name="fullName"]', testName2)
    await page.fill('input[name="phone"]', '0509876543')
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')
    
    await page.close()
  })

  test.describe('Direct Messaging', () => {
    test.beforeEach(async ({ page }) => {
      // Login as first user
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should send a direct message', async ({ page }) => {
      // Navigate to messages
      await page.click('text=הודעות')
      await expect(page).toHaveURL(/.*messages/i)

      // Click compose new message
      await page.click('button:has-text("הודעה חדשה")')
      
      // Fill message form
      await page.fill('input[name="recipient"]', testUser2Email)
      await page.fill('input[name="subject"]', 'בדיקת הודעה')
      await page.fill('textarea[name="content"]', 'זוהי הודעת בדיקה לבדיקת מערכת ההודעות')
      
      // Send message
      await page.click('button[type="submit"]')
      
      // Should show success message
      await expect(page.locator('text=הודעה נשלחה בהצלחה')).toBeVisible()
      
      // Should appear in sent messages
      await page.click('text=הודעות שנשלחו')
      await expect(page.locator('text=בדיקת הודעה')).toBeVisible()
    })

    test('should receive and read messages', async ({ page, browser }) => {
      // First, send a message as user 1
      await page.click('text=הודעות')
      await page.click('button:has-text("הודעה חדשה")')
      await page.fill('input[name="recipient"]', testUser2Email)
      await page.fill('input[name="subject"]', 'הודעה לקריאה')
      await page.fill('textarea[name="content"]', 'הודעה זו נועדה לבדיקת קריאת הודעות')
      await page.click('button[type="submit"]')
      
      // Logout and login as user 2
      await page.click('text=התנתקות')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser2Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
      
      // Check for new message notification
      await expect(page.locator('.notification-badge')).toBeVisible()
      
      // Navigate to messages
      await page.click('text=הודעות')
      
      // Should see unread message
      await expect(page.locator('text=הודעה לקריאה')).toBeVisible()
      await expect(page.locator('.unread-message')).toBeVisible()
      
      // Click to read message
      await page.click('text=הודעה לקריאה')
      
      // Should show message content
      await expect(page.locator('text=הודעה זו נועדה לבדיקת קריאת הודעות')).toBeVisible()
      
      // Message should be marked as read
      await expect(page.locator('.read-message')).toBeVisible()
    })

    test('should reply to messages', async ({ page }) => {
      // Navigate to messages and open a conversation
      await page.click('text=הודעות')
      await page.click('.message-item').first()
      
      // Click reply
      await page.click('button:has-text("השב")')
      
      // Fill reply
      await page.fill('textarea[name="replyContent"]', 'זוהי תשובה להודעה המקורית')
      await page.click('button:has-text("שלח תשובה")')
      
      // Should show success message
      await expect(page.locator('text=תשובה נשלחה בהצלחה')).toBeVisible()
      
      // Should appear in conversation thread
      await expect(page.locator('text=זוהי תשובה להודעה המקורית')).toBeVisible()
    })

    test('should search messages', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Use search functionality
      await page.fill('input[name="messageSearch"]', 'בדיקה')
      await page.click('button:has-text("חיפוש")')
      
      // Should show filtered results
      await expect(page.locator('text=בדיקת הודעה')).toBeVisible()
    })

    test('should delete messages', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Select message to delete
      await page.check('.message-checkbox').first()
      await page.click('button:has-text("מחק")')
      
      // Confirm deletion
      await page.click('button:has-text("אישור")')
      
      // Should show success message
      await expect(page.locator('text=הודעה נמחקה בהצלחה')).toBeVisible()
    })
  })

  test.describe('Vehicle Inquiry Messages', () => {
    test.beforeEach(async ({ page }) => {
      // Login as first user and create a vehicle listing
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
      
      // Create a vehicle listing
      await page.click('text=הוסף רכב')
      await page.selectOption('select[name="make"]', 'Toyota')
      await page.fill('input[name="model"]', 'Camry')
      await page.fill('input[name="year"]', '2020')
      await page.fill('input[name="price"]', '25000')
      await page.fill('input[name="contactName"]', testName1)
      await page.fill('input[name="contactPhone"]', '0501234567')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=רכב נוסף בהצלחה')).toBeVisible({ timeout: 10000 })
    })

    test('should send inquiry about vehicle', async ({ page, browser }) => {
      // Logout and login as second user
      await page.click('text=התנתקות')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser2Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
      
      // Browse vehicles and contact seller
      await page.click('text=רכבים')
      await page.click('.vehicle-card').first()
      
      // Click contact seller
      await page.click('button:has-text("צור קשר")')
      
      // Fill inquiry form
      await page.fill('input[name="inquirerName"]', testName2)
      await page.fill('input[name="inquirerPhone"]', '0509876543')
      await page.fill('textarea[name="inquiryMessage"]', 'מעוניין ברכב, אשמח לפרטים נוספים ולתיאום פגישה')
      
      await page.click('button:has-text("שלח פנייה")')
      
      // Should show success message
      await expect(page.locator('text=פנייה נשלחה בהצלחה')).toBeVisible()
    })

    test('should receive vehicle inquiry notification', async ({ page, browser }) => {
      // Create inquiry as user 2 first
      await page.click('text=התנתקות')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser2Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await page.click('text=רכבים')
      await page.click('.vehicle-card').first()
      await page.click('button:has-text("צור קשר")')
      await page.fill('input[name="inquirerName"]', testName2)
      await page.fill('input[name="inquirerPhone"]', '0509876543')
      await page.fill('textarea[name="inquiryMessage"]', 'פנייה בנוגע לרכב')
      await page.click('button:has-text("שלח פנייה")')
      
      // Switch back to user 1 (vehicle owner)
      await page.click('text=התנתקות')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      // Should see notification
      await expect(page.locator('.notification-badge')).toBeVisible()
      
      // Check messages
      await page.click('text=הודעות')
      await expect(page.locator('text=פנייה בנוגע לרכב')).toBeVisible()
    })
  })

  test.describe('Real-time Notifications', () => {
    test('should show real-time message notifications', async ({ page, browser }) => {
      // Open two browser contexts for real-time testing
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()
      
      // Login user 2 in second context
      await page2.goto('/')
      await page2.click('text=התחברות')
      await page2.fill('input[name="email"]', testUser2Email)
      await page2.fill('input[name="password"]', testPassword)
      await page2.click('button[type="submit"]')
      
      await expect(page2.locator('text=שלום')).toBeVisible({ timeout: 10000 })
      
      // Send message from user 1
      await page.click('text=הודעות')
      await page.click('button:has-text("הודעה חדשה")')
      await page.fill('input[name="recipient"]', testUser2Email)
      await page.fill('input[name="subject"]', 'הודעה בזמן אמת')
      await page.fill('textarea[name="content"]', 'בדיקת התראה בזמן אמת')
      await page.click('button[type="submit"]')
      
      // User 2 should receive real-time notification
      await expect(page2.locator('.notification-toast')).toBeVisible({ timeout: 10000 })
      await expect(page2.locator('text=הודעה חדשה התקבלה')).toBeVisible()
      
      await context2.close()
    })

    test('should update message status in real-time', async ({ page, browser }) => {
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()
      
      // Setup second user
      await page2.goto('/')
      await page2.click('text=התחברות')
      await page2.fill('input[name="email"]', testUser2Email)
      await page2.fill('input[name="password"]', testPassword)
      await page2.click('button[type="submit"]')
      
      // Send message from user 1
      await page.click('text=הודעות')
      await page.click('button:has-text("הודעה חדשה")')
      await page.fill('input[name="recipient"]', testUser2Email)
      await page.fill('input[name="subject"]', 'בדיקת סטטוס')
      await page.fill('textarea[name="content"]', 'בדיקת עדכון סטטוס הודעה')
      await page.click('button[type="submit"]')
      
      // Check sent messages shows as delivered
      await page.click('text=הודעות שנשלחו')
      await expect(page.locator('.message-status-delivered')).toBeVisible()
      
      // User 2 reads the message
      await page2.click('text=הודעות')
      await page2.click('text=בדיקת סטטוס')
      
      // User 1 should see message as read
      await page.reload()
      await expect(page.locator('.message-status-read')).toBeVisible()
      
      await context2.close()
    })
  })

  test.describe('Notification Preferences', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should manage notification preferences', async ({ page }) => {
      // Navigate to notification settings
      await page.click('text=פרופיל')
      await page.click('text=הגדרות התראות')
      
      // Should show notification preferences
      await expect(page.locator('input[name="emailNotifications"]')).toBeVisible()
      await expect(page.locator('input[name="smsNotifications"]')).toBeVisible()
      await expect(page.locator('input[name="pushNotifications"]')).toBeVisible()
      
      // Update preferences
      await page.uncheck('input[name="emailNotifications"]')
      await page.check('input[name="smsNotifications"]')
      await page.click('button[type="submit"]')
      
      // Should show success message
      await expect(page.locator('text=הגדרות עודכנו בהצלחה')).toBeVisible()
    })

    test('should respect notification preferences', async ({ page, browser }) => {
      // Disable email notifications
      await page.click('text=פרופיל')
      await page.click('text=הגדרות התראות')
      await page.uncheck('input[name="emailNotifications"]')
      await page.click('button[type="submit"]')
      
      // Send message from another user
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()
      
      await page2.goto('/')
      await page2.click('text=התחברות')
      await page2.fill('input[name="email"]', testUser2Email)
      await page2.fill('input[name="password"]', testPassword)
      await page2.click('button[type="submit"]')
      
      await page2.click('text=הודעות')
      await page2.click('button:has-text("הודעה חדשה")')
      await page2.fill('input[name="recipient"]', testUser1Email)
      await page2.fill('input[name="subject"]', 'בדיקת העדפות')
      await page2.fill('textarea[name="content"]', 'הודעה לבדיקת העדפות התראות')
      await page2.click('button[type="submit"]')
      
      // User 1 should still receive in-app notification but not email
      await expect(page.locator('.notification-badge')).toBeVisible()
      
      await context2.close()
    })
  })

  test.describe('Message Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should organize messages by folders', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Should show message folders
      await expect(page.locator('text=תיבת דואר נכנס')).toBeVisible()
      await expect(page.locator('text=הודעות שנשלחו')).toBeVisible()
      await expect(page.locator('text=טיוטות')).toBeVisible()
      await expect(page.locator('text=זבל')).toBeVisible()
      
      // Test folder navigation
      await page.click('text=הודעות שנשלחו')
      await expect(page).toHaveURL(/.*sent/i)
      
      await page.click('text=טיוטות')
      await expect(page).toHaveURL(/.*drafts/i)
    })

    test('should save message as draft', async ({ page }) => {
      await page.click('text=הודעות')
      await page.click('button:has-text("הודעה חדשה")')
      
      // Fill partial message
      await page.fill('input[name="recipient"]', testUser2Email)
      await page.fill('input[name="subject"]', 'טיוטת הודעה')
      await page.fill('textarea[name="content"]', 'זוהי טיוטה של הודעה')
      
      // Save as draft
      await page.click('button:has-text("שמור כטיוטה")')
      
      // Should show success message
      await expect(page.locator('text=טיוטה נשמרה בהצלחה')).toBeVisible()
      
      // Should appear in drafts folder
      await page.click('text=טיוטות')
      await expect(page.locator('text=טיוטת הודעה')).toBeVisible()
    })

    test('should mark messages as spam', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Select message
      await page.check('.message-checkbox').first()
      
      // Mark as spam
      await page.click('button:has-text("סמן כזבל")')
      
      // Should move to spam folder
      await page.click('text=זבל')
      await expect(page.locator('.spam-message')).toBeVisible()
    })

    test('should bulk manage messages', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Select multiple messages
      await page.check('.select-all-messages')
      
      // Bulk delete
      await page.click('button:has-text("מחק נבחרים")')
      await page.click('button:has-text("אישור")')
      
      // Should show success message
      await expect(page.locator('text=הודעות נמחקו בהצלחה')).toBeVisible()
    })
  })

  test.describe('Mobile Messaging', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      // Test mobile messaging interface
      await page.click('text=הודעות')
      
      // Should show mobile-friendly layout
      await expect(page.locator('.mobile-message-list')).toBeVisible()
      
      // Test mobile message composition
      await page.click('button:has-text("+")')
      await expect(page.locator('.mobile-compose-form')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.click('text=התחברות')
      await page.fill('input[name="email"]', testUser1Email)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Navigate using keyboard
      await page.keyboard.press('Tab') // First message
      await page.keyboard.press('Enter') // Open message
      
      // Should open message details
      await expect(page.locator('.message-content')).toBeVisible()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Check for accessibility attributes
      await expect(page.locator('[role="main"]')).toBeVisible()
      await expect(page.locator('[aria-label="רשימת הודעות"]')).toBeVisible()
      await expect(page.locator('[aria-label="כתיבת הודעה חדשה"]')).toBeVisible()
    })

    test('should support screen readers', async ({ page }) => {
      await page.click('text=הודעות')
      
      // Check for screen reader friendly elements
      await expect(page.locator('[aria-live="polite"]')).toBeVisible()
      await expect(page.locator('[role="alert"]')).toBeVisible()
    })
  })
})