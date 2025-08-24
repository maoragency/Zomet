import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authService, validatePasswordStrength } from '../auth.js'
import { supabase } from '@/lib/supabase'
import { mockUser, mockAdminUser, mockSupabaseResponse, mockSuccessfulQuery, mockFailedQuery } from '@/test/utils'

// Mock the supabase module
vi.mock('@/lib/supabase')

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validatePasswordStrength', () => {
    it('should validate strong password correctly', () => {
      const result = validatePasswordStrength('StrongPass123!')
      
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe(100)
      expect(result.checks.length).toBe(true)
      expect(result.checks.uppercase).toBe(true)
      expect(result.checks.lowercase).toBe(true)
      expect(result.checks.number).toBe(true)
      expect(result.checks.special).toBe(true)
      expect(result.message).toBe('חזקה מאוד')
    })

    it('should validate weak password correctly', () => {
      const result = validatePasswordStrength('weak')
      
      expect(result.isValid).toBe(false)
      expect(result.strength).toBe(20)
      expect(result.checks.length).toBe(false)
      expect(result.checks.uppercase).toBe(false)
      expect(result.checks.lowercase).toBe(true)
      expect(result.checks.number).toBe(false)
      expect(result.checks.special).toBe(false)
      expect(result.message).toBe('חלשה מאוד')
    })

    it('should validate medium strength password', () => {
      const result = validatePasswordStrength('Password123')
      
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe(80)
      expect(result.checks.length).toBe(true)
      expect(result.checks.uppercase).toBe(true)
      expect(result.checks.lowercase).toBe(true)
      expect(result.checks.number).toBe(true)
      expect(result.checks.special).toBe(false)
      expect(result.message).toBe('חזקה')
    })
  })

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const mockSignUpResponse = {
        data: { user: mockUser, session: null },
        error: null
      }

      supabase.auth.signUp.mockResolvedValue(mockSignUpResponse)
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await authService.signUp('test@example.com', 'StrongPass123!', {
        full_name: 'Test User',
        phone: '0501234567'
      })

      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass123!',
        options: {
          data: { full_name: 'Test User', phone: '0501234567' },
          emailRedirectTo: expect.stringContaining('/Login')
        }
      })
    })

    it('should reject weak password', async () => {
      const result = await authService.signUp('test@example.com', 'weak', {})

      expect(result.user).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('הסיסמה חלשה מדי')
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should handle signup error', async () => {
      const mockError = new Error('Email already registered')
      supabase.auth.signUp.mockResolvedValue({ data: null, error: mockError })

      const result = await authService.signUp('test@example.com', 'StrongPass123!', {})

      expect(result.user).toBeNull()
      expect(result.error).toBe(mockError)
    })

    it('should set admin role for admin email', async () => {
      const mockSignUpResponse = {
        data: { user: { ...mockAdminUser, email: 'zometauto@gmail.com' }, session: null },
        error: null
      }

      supabase.auth.signUp.mockResolvedValue(mockSignUpResponse)
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockAdminUser, error: null })
        })
      })
      supabase.from.mockReturnValue({ insert: mockInsert })

      await authService.signUp('zometauto@gmail.com', 'StrongPass123!', {})

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          role: 'admin',
          email: 'zometauto@gmail.com'
        })
      ])
    })
  })

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockSignInResponse = {
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null
      }

      supabase.auth.signInWithPassword.mockResolvedValue(mockSignInResponse)
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
            })
          })
        })
      })
      supabase.rpc.mockResolvedValue({ data: null, error: null })

      const result = await authService.signIn('test@example.com', 'password123')

      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual({ access_token: 'token' })
      expect(result.error).toBeNull()
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should handle signin error', async () => {
      const mockError = new Error('Invalid credentials')
      supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: mockError })

      const result = await authService.signIn('test@example.com', 'wrongpassword')

      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.signOut.mockResolvedValue({ error: null })

      const result = await authService.signOut()

      expect(result.error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle signout error', async () => {
      const mockError = new Error('Signout failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.signOut.mockResolvedValue({ error: mockError })

      const result = await authService.signOut()

      expect(result.error).toBe(mockError)
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const result = await authService.getCurrentUser()

      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle get user error', async () => {
      const mockError = new Error('No user found')
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: mockError })

      const result = await authService.getCurrentUser()

      expect(result.user).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('getCurrentSession', () => {
    it('should get current session successfully', async () => {
      const mockSession = { access_token: 'token', user: mockUser }
      supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const result = await authService.getCurrentSession()

      expect(result.session).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('should handle get session error', async () => {
      const mockError = new Error('No session found')
      supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: mockError })

      const result = await authService.getCurrentSession()

      expect(result.session).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('resetPassword', () => {
    it('should send reset password email successfully', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      const result = await authService.resetPassword('test@example.com')

      expect(result.error).toBeNull()
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: expect.stringContaining('/ResetPassword') }
      )
    })

    it('should handle reset password error', async () => {
      const mockError = new Error('Email not found')
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: mockError })

      const result = await authService.resetPassword('test@example.com')

      expect(result.error).toBe(mockError)
    })
  })

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.updateUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const result = await authService.updatePassword('NewStrongPass123!')

      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewStrongPass123!'
      })
    })

    it('should reject weak password', async () => {
      const result = await authService.updatePassword('weak')

      expect(result.user).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('הסיסמה חלשה מדי')
      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    })

    it('should handle update password error', async () => {
      const mockError = new Error('Update failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.updateUser.mockResolvedValue({ data: null, error: mockError })

      const result = await authService.updatePassword('NewStrongPass123!')

      expect(result.user).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await authService.getUserProfile()

      expect(result.profile).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should get specific user profile by ID', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })

      const result = await authService.getUserProfile(mockUser.id)

      expect(result.profile).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle profile not found', async () => {
      const mockError = new Error('Profile not found')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      })

      const result = await authService.getUserProfile()

      expect(result.profile).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { full_name: 'Updated Name', phone: '0509876543' }
      const updatedUser = { ...mockUser, ...updates }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null })
            })
          })
        })
      })

      const result = await authService.updateUserProfile(updates)

      expect(result.profile).toEqual(updatedUser)
      expect(result.error).toBeNull()
    })

    it('should handle update profile error', async () => {
      const mockError = new Error('Update failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: mockError })
            })
          })
        })
      })

      const result = await authService.updateUserProfile({ full_name: 'New Name' })

      expect(result.profile).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('hasRole', () => {
    it('should check user role successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'user' }, error: null })
          })
        })
      })

      const result = await authService.hasRole('user')

      expect(result.hasRole).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return false for different role', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'user' }, error: null })
          })
        })
      })

      const result = await authService.hasRole('admin')

      expect(result.hasRole).toBe(false)
      expect(result.error).toBeNull()
    })
  })

  describe('isAdmin', () => {
    it('should identify admin by role', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'admin', email: 'admin@example.com' }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.isAdmin()

      expect(result.isAdmin).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should identify admin by email', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'user', email: 'zometauto@gmail.com' }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.isAdmin()

      expect(result.isAdmin).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return false for regular user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'user', email: 'test@example.com' }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.isAdmin()

      expect(result.isAdmin).toBe(false)
      expect(result.error).toBeNull()
    })
  })

  describe('getUserPermissions', () => {
    it('should get admin permissions', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'admin', email: 'admin@example.com', is_active: true }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.getUserPermissions()

      expect(result.permissions).toContain('read_all_users')
      expect(result.permissions).toContain('manage_system_settings')
      expect(result.permissions).toContain('view_audit_logs')
      expect(result.error).toBeNull()
    })

    it('should get user permissions', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'user', email: 'test@example.com', is_active: true }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.getUserPermissions()

      expect(result.permissions).toContain('read_own_profile')
      expect(result.permissions).toContain('update_own_profile')
      expect(result.permissions).not.toContain('read_all_users')
      expect(result.error).toBeNull()
    })

    it('should return empty permissions for inactive user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { role: 'user', email: 'test@example.com', is_active: false }, 
              error: null 
            })
          })
        })
      })

      const result = await authService.getUserPermissions()

      expect(result.permissions).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('hasPermission', () => {
    it('should check permission successfully', async () => {
      // Mock getUserPermissions to return specific permissions
      vi.spyOn(authService, 'getUserPermissions').mockResolvedValue({
        permissions: ['read_own_profile', 'update_own_profile'],
        error: null
      })

      const result = await authService.hasPermission('read_own_profile')

      expect(result.hasPermission).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return false for missing permission', async () => {
      vi.spyOn(authService, 'getUserPermissions').mockResolvedValue({
        permissions: ['read_own_profile'],
        error: null
      })

      const result = await authService.hasPermission('manage_users')

      expect(result.hasPermission).toBe(false)
      expect(result.error).toBeNull()
    })
  })

  describe('checkEmailVerification', () => {
    it('should check email verification status', async () => {
      const verifiedUser = { ...mockUser, email_confirmed_at: '2024-01-01T00:00:00Z' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null })
      
      // Mock updateUserProfile
      vi.spyOn(authService, 'updateUserProfile').mockResolvedValue({
        profile: { ...mockUser, email_verified: true },
        error: null
      })

      const result = await authService.checkEmailVerification()

      expect(result.isVerified).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return false for unverified email', async () => {
      const unverifiedUser = { ...mockUser, email_confirmed_at: null }
      supabase.auth.getUser.mockResolvedValue({ data: { user: unverifiedUser }, error: null })

      const result = await authService.checkEmailVerification()

      expect(result.isVerified).toBe(false)
      expect(result.error).toBeNull()
    })
  })

  describe('resendEmailVerification', () => {
    it('should resend email verification successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.resend.mockResolvedValue({ error: null })

      const result = await authService.resendEmailVerification()

      expect(result.error).toBeNull()
      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: mockUser.email,
        options: {
          emailRedirectTo: expect.stringContaining('/Login')
        }
      })
    })

    it('should handle resend error', async () => {
      const mockError = new Error('Resend failed')
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      supabase.auth.resend.mockResolvedValue({ error: mockError })

      const result = await authService.resendEmailVerification()

      expect(result.error).toBe(mockError)
    })
  })
})