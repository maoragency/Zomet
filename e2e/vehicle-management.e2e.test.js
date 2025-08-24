import { test, expect } from '@playwright/test'

// E2E tests for vehicle management workflows
test.describe('Vehicle Management Workflows', () => {
  const testEmail = `vehicle-e2e-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testName = 'Vehicle Test User'

  // Test vehicle data
  const testVehicle = {
    make: 'Toyota',
    model: 'Camry',
    year: '2020',
    price: '25000',
    mileage: '50000',
    fuelType: 'בנזין',
    transmission: 'אוטומטי',
    color: 'לבן',
    description: 'רכב במצב מעולה, שמור וללא תאונות. בעלים יחיד מקפיד על תחזוקה שוטפת.',
    contactName: 'Test User',
    contactPhone: '0501234567',
    location: 'תל אביב'
  }

  test.beforeAll(async ({ browser }) => {
    // Create and login test user
    const page = await browser.newPage()
    await page.goto('/')
    
    // Register user
    await page.click('text=הרשמה')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.fill('input[name="fullName"]', testName)
    await page.fill('input[name="phone"]', '0501234567')
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')
    
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/')
    await page.click('text=התחברות')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    
    // Wait for login to complete
    await expect(page.locator('text=שלום')).toBeVisible({ timeout: 10000 })
  })

  test.describe('Vehicle Listing Creation', () => {
    test('should create a new vehicle listing successfully', async ({ page }) => {
      // Navigate to add vehicle page
      await page.click('text=הוסף רכב')
      await expect(page).toHaveURL(/.*add-vehicle|.*vehicle.*add/i)

      // Fill basic vehicle information
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', testVehicle.model)
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)
      await page.fill('input[name="mileage"]', testVehicle.mileage)

      // Fill additional details
      await page.selectOption('select[name="fuelType"]', testVehicle.fuelType)
      await page.selectOption('select[name="transmission"]', testVehicle.transmission)
      await page.selectOption('select[name="color"]', testVehicle.color)
      await page.fill('textarea[name="description"]', testVehicle.description)

      // Fill contact information
      await page.fill('input[name="contactName"]', testVehicle.contactName)
      await page.fill('input[name="contactPhone"]', testVehicle.contactPhone)
      await page.fill('input[name="location"]', testVehicle.location)

      // Submit the form
      await page.click('button[type="submit"]')

      // Should show success message and redirect
      await expect(page.locator('text=רכב נוסף בהצלחה')).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL(/.*my-listings|.*dashboard/i)
    })

    test('should validate required fields', async ({ page }) => {
      await page.click('text=הוסף רכב')
      
      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Should show validation errors
      await expect(page.locator('text=שדה זה הוא חובה')).toBeVisible()
    })

    test('should validate numeric fields', async ({ page }) => {
      await page.click('text=הוסף רכב')
      
      // Fill with invalid data
      await page.fill('input[name="year"]', 'invalid-year')
      await page.fill('input[name="price"]', 'invalid-price')
      await page.fill('input[name="mileage"]', 'invalid-mileage')
      await page.click('button[type="submit"]')

      // Should show validation errors
      await expect(page.locator('text=יש להזין מספר תקין')).toBeVisible()
    })

    test('should validate year range', async ({ page }) => {
      await page.click('text=הוסף רכב')
      
      await page.fill('input[name="year"]', '1800')
      await page.click('button[type="submit"]')

      // Should show year validation error
      await expect(page.locator('text=שנת ייצור לא תקינה')).toBeVisible()
    })

    test('should handle image upload', async ({ page }) => {
      await page.click('text=הוסף רכב')
      
      // Fill basic required fields
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', testVehicle.model)
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)

      // Upload image
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-car.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      })

      // Should show image preview
      await expect(page.locator('img[alt*="preview"]')).toBeVisible()
    })
  })

  test.describe('Vehicle Listing Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test vehicle first
      await page.click('text=הוסף רכב')
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', testVehicle.model)
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)
      await page.fill('input[name="mileage"]', testVehicle.mileage)
      await page.fill('input[name="contactName"]', testVehicle.contactName)
      await page.fill('input[name="contactPhone"]', testVehicle.contactPhone)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=רכב נוסף בהצלחה')).toBeVisible({ timeout: 10000 })
    })

    test('should view my listings', async ({ page }) => {
      // Navigate to my listings
      await page.click('text=המודעות שלי')
      await expect(page).toHaveURL(/.*my-listings/i)

      // Should show the created vehicle
      await expect(page.locator(`text=${testVehicle.make} ${testVehicle.model}`)).toBeVisible()
      await expect(page.locator(`text=${testVehicle.year}`)).toBeVisible()
      await expect(page.locator(`text=₪${testVehicle.price}`)).toBeVisible()
    })

    test('should edit vehicle listing', async ({ page }) => {
      await page.click('text=המודעות שלי')
      
      // Click edit on the first vehicle
      await page.click('button:has-text("עריכה")').first()
      await expect(page).toHaveURL(/.*edit/i)

      // Update vehicle information
      const updatedPrice = '27000'
      await page.fill('input[name="price"]', updatedPrice)
      await page.fill('textarea[name="description"]', 'תיאור מעודכן לרכב')
      
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=רכב עודכן בהצלחה')).toBeVisible()
      
      // Should show updated information
      await expect(page.locator(`text=₪${updatedPrice}`)).toBeVisible()
    })

    test('should delete vehicle listing', async ({ page }) => {
      await page.click('text=המודעות שלי')
      
      // Click delete on the first vehicle
      await page.click('button:has-text("מחיקה")').first()
      
      // Confirm deletion in modal
      await page.click('button:has-text("אישור")')

      // Should show success message
      await expect(page.locator('text=רכב נמחק בהצלחה')).toBeVisible()
      
      // Vehicle should no longer be visible
      await expect(page.locator(`text=${testVehicle.make} ${testVehicle.model}`)).not.toBeVisible()
    })

    test('should change vehicle status', async ({ page }) => {
      await page.click('text=המודעות שלי')
      
      // Change status to sold
      await page.click('select[name="status"]').first()
      await page.selectOption('select[name="status"]', 'נמכר')
      
      // Should update status
      await expect(page.locator('text=נמכר')).toBeVisible()
    })
  })

  test.describe('Vehicle Search and Browse', () => {
    test('should browse all vehicles', async ({ page }) => {
      // Navigate to vehicles page
      await page.click('text=רכבים')
      await expect(page).toHaveURL(/.*vehicles|.*browse/i)

      // Should show vehicle listings
      await expect(page.locator('.vehicle-card')).toBeVisible()
      
      // Should show search filters
      await expect(page.locator('select[name="make"]')).toBeVisible()
      await expect(page.locator('input[name="priceMin"]')).toBeVisible()
      await expect(page.locator('input[name="priceMax"]')).toBeVisible()
    })

    test('should search vehicles by make', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Filter by make
      await page.selectOption('select[name="make"]', 'Toyota')
      await page.click('button:has-text("חיפוש")')

      // Should show filtered results
      await expect(page.locator('text=Toyota')).toBeVisible()
    })

    test('should search vehicles by price range', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Set price range
      await page.fill('input[name="priceMin"]', '20000')
      await page.fill('input[name="priceMax"]', '30000')
      await page.click('button:has-text("חיפוש")')

      // Should show vehicles in price range
      const priceElements = page.locator('.vehicle-price')
      const count = await priceElements.count()
      
      for (let i = 0; i < count; i++) {
        const priceText = await priceElements.nth(i).textContent()
        const price = parseInt(priceText.replace(/[^\d]/g, ''))
        expect(price).toBeGreaterThanOrEqual(20000)
        expect(price).toBeLessThanOrEqual(30000)
      }
    })

    test('should search vehicles by year range', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Set year range
      await page.fill('input[name="yearMin"]', '2018')
      await page.fill('input[name="yearMax"]', '2022')
      await page.click('button:has-text("חיפוש")')

      // Should show vehicles in year range
      const yearElements = page.locator('.vehicle-year')
      const count = await yearElements.count()
      
      for (let i = 0; i < count; i++) {
        const yearText = await yearElements.nth(i).textContent()
        const year = parseInt(yearText)
        expect(year).toBeGreaterThanOrEqual(2018)
        expect(year).toBeLessThanOrEqual(2022)
      }
    })

    test('should sort vehicles by price', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Sort by price ascending
      await page.selectOption('select[name="sortBy"]', 'price-asc')
      
      // Check if sorted correctly
      const priceElements = page.locator('.vehicle-price')
      const count = await priceElements.count()
      
      if (count > 1) {
        for (let i = 1; i < count; i++) {
          const prevPrice = parseInt(await priceElements.nth(i-1).textContent().replace(/[^\d]/g, ''))
          const currentPrice = parseInt(await priceElements.nth(i).textContent().replace(/[^\d]/g, ''))
          expect(currentPrice).toBeGreaterThanOrEqual(prevPrice)
        }
      }
    })
  })

  test.describe('Vehicle Details and Contact', () => {
    test('should view vehicle details', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Click on first vehicle
      await page.click('.vehicle-card').first()
      await expect(page).toHaveURL(/.*vehicle.*details/i)

      // Should show vehicle details
      await expect(page.locator('.vehicle-title')).toBeVisible()
      await expect(page.locator('.vehicle-price')).toBeVisible()
      await expect(page.locator('.vehicle-description')).toBeVisible()
      await expect(page.locator('.contact-info')).toBeVisible()
    })

    test('should contact seller', async ({ page }) => {
      await page.click('text=רכבים')
      await page.click('.vehicle-card').first()
      
      // Click contact button
      await page.click('button:has-text("צור קשר")')
      
      // Should show contact modal or form
      await expect(page.locator('.contact-modal')).toBeVisible()
      
      // Fill contact form
      await page.fill('input[name="name"]', 'Interested Buyer')
      await page.fill('input[name="phone"]', '0509876543')
      await page.fill('textarea[name="message"]', 'מעוניין ברכב, אשמח לפרטים נוספים')
      
      await page.click('button:has-text("שלח הודעה")')
      
      // Should show success message
      await expect(page.locator('text=הודעה נשלחה בהצלחה')).toBeVisible()
    })

    test('should increment view count', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Get initial view count
      const viewCountBefore = await page.locator('.view-count').first().textContent()
      
      // View vehicle details
      await page.click('.vehicle-card').first()
      await page.goBack()
      
      // Check if view count increased
      const viewCountAfter = await page.locator('.view-count').first().textContent()
      expect(parseInt(viewCountAfter)).toBeGreaterThan(parseInt(viewCountBefore))
    })
  })

  test.describe('Vehicle Promotions', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test vehicle for promotion tests
      await page.click('text=הוסף רכב')
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', testVehicle.model)
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)
      await page.fill('input[name="contactName"]', testVehicle.contactName)
      await page.fill('input[name="contactPhone"]', testVehicle.contactPhone)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=רכב נוסף בהצלחה')).toBeVisible({ timeout: 10000 })
    })

    test('should promote vehicle listing', async ({ page }) => {
      await page.click('text=המודעות שלי')
      
      // Click promote button
      await page.click('button:has-text("קדם מודעה")').first()
      
      // Should show promotion options
      await expect(page.locator('.promotion-options')).toBeVisible()
      
      // Select promotion type
      await page.click('input[value="featured"]')
      await page.click('button:has-text("המשך לתשלום")')
      
      // Should redirect to payment or show payment form
      await expect(page).toHaveURL(/.*payment|.*checkout/i)
    })

    test('should view promotion analytics', async ({ page }) => {
      await page.click('text=המודעות שלי')
      
      // Click analytics button
      await page.click('button:has-text("סטטיסטיקות")').first()
      
      // Should show analytics data
      await expect(page.locator('.analytics-dashboard')).toBeVisible()
      await expect(page.locator('.view-count')).toBeVisible()
      await expect(page.locator('.contact-count')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Test mobile vehicle browsing
      await page.click('text=רכבים')
      
      // Should show mobile-friendly layout
      await expect(page.locator('.vehicle-card')).toBeVisible()
      
      // Test mobile search
      await page.click('button:has-text("סינון")')
      await expect(page.locator('.mobile-filters')).toBeVisible()
    })

    test('should handle mobile vehicle creation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.click('text=הוסף רכב')
      
      // Form should be usable on mobile
      await expect(page.locator('select[name="make"]')).toBeVisible()
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', testVehicle.model)
      
      // Should be able to scroll and complete form
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load vehicle listings quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.click('text=רכבים')
      await expect(page.locator('.vehicle-card')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    test('should handle large number of vehicles', async ({ page }) => {
      await page.click('text=רכבים')
      
      // Should implement pagination or infinite scroll
      await expect(page.locator('.pagination, .load-more')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      await page.click('text=רכבים')
      
      // Should show error message
      await expect(page.locator('text=בעיית חיבור')).toBeVisible()
      
      // Restore connection
      await page.context().setOffline(false)
    })

    test('should handle form submission errors', async ({ page }) => {
      await page.click('text=הוסף רכב')
      
      // Fill form with potentially problematic data
      await page.selectOption('select[name="make"]', testVehicle.make)
      await page.fill('input[name="model"]', '<script>alert("xss")</script>')
      await page.fill('input[name="year"]', testVehicle.year)
      await page.fill('input[name="price"]', testVehicle.price)
      
      await page.click('button[type="submit"]')
      
      // Should handle XSS attempt gracefully
      await expect(page.locator('text=נתונים לא תקינים')).toBeVisible()
    })
  })
})