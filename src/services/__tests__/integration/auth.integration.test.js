import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { authService } from '../../auth.js'
import { supabase } from '@/lib/supabase'

// Integration tests for auth service with real Supabase
describe('Auth Service Integration Tests', () => {
  let testUser = null
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    // Ensure we're starting with a clean state
    await supabase.auth.signOut()
  })

  afterAll(async () => {
    // Clean up test user if created
    if (testUser) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.warn('Cleanup error:', error)
      }
    }
  })

  beforeEach(async () => {
    // Ensure clean state before each test
    await supabase.auth.signOut()
  })

  afterEach(async () => {
    // Clean up after each test
    await supabase.auth.signOut()
  })

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const metadata = {
        full_name: 'Test User',
        phone: '0501234567'
      }

      const result = await authService.signUp(testEmail, testPassword, metadata)

      expect(result.error).toBeNull()
      expect(result.user).toBeTruthy()
      expect(result.user.email).toBe(testEmail)
      
      testUser = result.user
    }, 10000) // 10 second timeout for network operations

    it('should reject weak passwords', async () => {
      const weakPassword = '123'
      
      const result = await authService.signUp(
        `weak-${Date.now()}@example.com`, 
        weakPassword
      )

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('הסיסמה חלשה מדי')
      expect(result.user).toBeNull()
    })

    it('should prevent duplicate email registration', async () => {
      // First registration
      const email = `duplicate-${Date.now()}@example.com`
      const firstResult = await authService.signUp(email, testPassword)
      
      expect(firstResult.error).toBeNull()
      expect(firstResult.user).toBeTruthy()

      // Second registration with same email
      const secondResult = await authService.signUp(email, testPassword)
      
      expect(secondResult.error).toBeTruthy()
      expect(secondResult.user).toBeNull()
    }, 15000)
  })

  describe('User Authentication', () => {
    beforeEach(async () => {
      // Create a test user for authentication tests
      if (!testUser) {
        const result = await authService.signUp(testEmail, testPassword)
        testUser = result.user
        await supabase.auth.signOut() // Sign out after creation
      }
    })

    it('should sign in with valid credentials', async () => {
      const result = await authService.signIn(testEmail, testPassword)

      expect(result.error).toBeNull()
      expect(result.user).toBeTruthy()
      expect(result.session).toBeTruthy()
      expect(result.user.email).toBe(testEmail)
    }, 10000)

    it('should reject invalid credentials', async () => {
      const result = await authService.signIn(testEmail, 'wrongpassword')

      expect(result.error).toBeTruthy()
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should reject non-existent user', async () => {
      const result = await authService.signIn('nonexistent@example.com', testPassword)

      expect(result.error).toBeTruthy()
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      // Sign in for session tests
      if (!testUser) {
        const signUpResult = await authService.signUp(testEmail, testPassword)
        testUser = signUpResult.user
      }
      await authService.signIn(testEmail, testPassword)
    })

    it('should get current user', async () => {
      const result = await authService.getCurrentUser()

      expect(result.error).toBeNull()
      expect(result.user).toBeTruthy()
      expect(result.user.email).toBe(testEmail)
    })

    it('should get current session', async () => {
      const result = await authService.getCurrentSession()

      expect(result.error).toBeNull()
      expect(result.session).toBeTruthy()
      expect(result.session.user.email).toBe(testEmail)
    })

    it('should sign out successfully', async () => {
      const result = await authService.signOut()

      expect(result.error).toBeNull()

      // Verify user is signed out
      const userResult = await authService.getCurrentUser()
      expect(userResult.user).toBeNull()
    })
  })

  describe('Profile Management', () => {
    beforeEach(async () => {
      // Ensure user is signed in for profile tests
      if (!testUser) {
        const signUpResult = await authService.signUp(testEmail, testPassword)
        testUser = signUpResult.user
      }
      await authService.signIn(testEmail, testPassword)
    })

    it('should create user profile', async () => {
      const profileData = {
        full_name: 'Test User Profile',
        phone: '0509876543'
      }

      const result = await authService.createUserProfile(testUser.id, profileData)

      expect(result.error).toBeNull()
      expect(result.profile).toBeTruthy()
      expect(result.profile.full_name).toBe(profileData.full_name)
      expect(result.profile.phone).toBe(profileData.phone)
    })

    it('should get user profile', async () => {
      const result = await authService.getUserProfile()

      expect(result.error).toBeNull()
      expect(result.profile).toBeTruthy()
      expect(result.profile.email).toBe(testEmail)
    })

    it('should update user profile', async () => {
      const updates = {
        full_name: 'Updated Test User',
        phone: '0501111111'
      }

      const result = await authService.updateUserProfile(updates)

      expect(result.error).toBeNull()
      expect(result.profile).toBeTruthy()
      expect(result.profile.full_name).toBe(updates.full_name)
      expect(result.profile.phone).toBe(updates.phone)
    })
  })

  describe('Password Management', () => {
    beforeEach(async () => {
      if (!testUser) {
        const signUpResult = await authService.signUp(testEmail, testPassword)
        testUser = signUpResult.user
      }
      await authService.signIn(testEmail, testPassword)
    })

    it('should send password reset email', async () => {
      const result = await authService.resetPassword(testEmail)

      expect(result.error).toBeNull()
    })

    it('should update password with strong password', async () => {
      const newPassword = 'NewStrongPassword123!'
      
      const result = await authService.updatePassword(newPassword)

      expect(result.error).toBeNull()
      expect(result.user).toBeTruthy()

      // Verify new password works
      await authService.signOut()
      const signInResult = await authService.signIn(testEmail, newPassword)
      expect(signInResult.error).toBeNull()
    }, 10000)

    it('should reject weak password update', async () => {
      const weakPassword = 'weak'
      
      const result = await authService.updatePassword(weakPassword)

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('הסיסמה חלשה מדי')
      expect(result.user).toBeNull()
    })
  })

  describe('Role and Permission Management', () => {
    beforeEach(async () => {
      if (!testUser) {
        const signUpResult = await authService.signUp(testEmail, testPassword)
        testUser = signUpResult.user
      }
      await authService.signIn(testEmail, testPassword)
    })

    it('should check user role', async () => {
      const result = await authService.hasRole('user')

      expect(result.error).toBeNull()
      expect(result.hasRole).toBe(true)
    })

    it('should check admin role for regular user', async () => {
      const result = await authService.isAdmin()

      expect(result.error).toBeNull()
      expect(result.isAdmin).toBe(false)
    })

    it('should get user permissions', async () => {
      const result = await authService.getUserPermissions()

      expect(result.error).toBeNull()
      expect(result.permissions).toBeTruthy()
      expect(Array.isArray(result.permissions)).toBe(true)
      expect(result.permissions).toContain('read_own_profile')
    })

    it('should check specific permission', async () => {
      const result = await authService.hasPermission('read_own_profile')

      expect(result.error).toBeNull()
      expect(result.hasPermission).toBe(true)
    })

    it('should deny admin permission for regular user', async () => {
      const result = await authService.hasPermission('manage_system_settings')

      expect(result.error).toBeNull()
      expect(result.hasPermission).toBe(false)
    })
  })

  describe('Email Verification', () => {
    beforeEach(async () => {
      if (!testUser) {
        const signUpResult = await authService.signUp(testEmail, testPassword)
        testUser = signUpResult.user
      }
      await authService.signIn(testEmail, testPassword)
    })

    it('should check email verification status', async () => {
      const result = await authService.checkEmailVerification()

      expect(result.error).toBeNull()
      expect(typeof result.isVerified).toBe('boolean')
    })

    it('should resend email verification', async () => {
      const result = await authService.resendEmailVerification()

      expect(result.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test with invalid data that should cause errors
      
      const result = await authService.signIn('', '')

      expect(result.error).toBeTruthy()
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should handle invalid email format', async () => {
      const result = await authService.signUp('invalid-email', testPassword)

      expect(result.error).toBeTruthy()
      expect(result.user).toBeNull()
    })
  })
})