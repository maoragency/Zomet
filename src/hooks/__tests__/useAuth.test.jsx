import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth, useRequireAuth, useIsAdmin, usePermissions, useRoles } from '../useAuth.jsx'
import authService from '@/services/auth'
import { mockUser, mockAdminUser } from '@/test/utils'

// Mock the auth service
vi.mock('@/services/auth', () => ({
  default: {
    getCurrentSession: vi.fn(),
    getUserProfile: vi.fn(),
    getUserPermissions: vi.fn(),
    isAdmin: vi.fn(),
    checkEmailVerification: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUserProfile: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    resendEmailVerification: vi.fn(),
    hasRole: vi.fn(),
    hasPermission: vi.fn()
  }
}))

describe('useAuth hooks', () => {
  const mockSession = {
    user: mockUser,
    access_token: 'mock-token'
  }

  const mockSubscription = {
    unsubscribe: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    authService.getCurrentSession.mockResolvedValue({ session: null })
    authService.getUserProfile.mockResolvedValue({ profile: mockUser, error: null })
    authService.getUserPermissions.mockResolvedValue({ permissions: ['read_own_profile'], error: null })
    authService.isAdmin.mockResolvedValue({ isAdmin: false, error: null })
    authService.checkEmailVerification.mockResolvedValue({ isVerified: true, error: null })
    authService.onAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AuthProvider and useAuth', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should load initial session and user data', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
      expect(authService.getUserProfile).toHaveBeenCalled()
      expect(authService.getUserPermissions).toHaveBeenCalledWith(mockUser.id)
      expect(authService.isAdmin).toHaveBeenCalledWith(mockUser.id)
      expect(authService.checkEmailVerification).toHaveBeenCalled()
    })

    it('should handle auth state changes', async () => {
      const authStateCallback = vi.fn()
      authService.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback.mockImplementation(callback)
        return { data: { subscription: mockSubscription } }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate auth state change
      await act(async () => {
        await authStateCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should handle sign up', async () => {
      const signUpResult = { user: mockUser, session: mockSession, error: null }
      authService.signUp.mockResolvedValue(signUpResult)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResponse
      await act(async () => {
        signUpResponse = await result.current.signUp('test@example.com', 'password123', { full_name: 'Test User' })
      })

      expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', { full_name: 'Test User' })
      expect(signUpResponse).toEqual(signUpResult)
    })

    it('should handle sign up error', async () => {
      const signUpError = new Error('Email already exists')
      authService.signUp.mockResolvedValue({ user: null, session: null, error: signUpError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.signUp('test@example.com', 'password123')).rejects.toThrow('Email already exists')
      })
    })

    it('should handle sign in', async () => {
      const signInResult = { user: mockUser, session: mockSession, error: null }
      authService.signIn.mockResolvedValue(signInResult)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResponse
      await act(async () => {
        signInResponse = await result.current.signIn('test@example.com', 'password123')
      })

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(signInResponse).toEqual(signInResult)
    })

    it('should handle sign out', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.signOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(authService.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should handle profile update', async () => {
      const updatedProfile = { ...mockUser, full_name: 'Updated Name' }
      authService.updateUserProfile.mockResolvedValue({ profile: updatedProfile, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const updates = { full_name: 'Updated Name' }
      let updateResponse
      await act(async () => {
        updateResponse = await result.current.updateProfile(updates)
      })

      expect(authService.updateUserProfile).toHaveBeenCalledWith(updates)
      expect(result.current.user).toEqual(updatedProfile)
      expect(updateResponse.profile).toEqual(updatedProfile)
    })

    it('should handle password reset', async () => {
      authService.resetPassword.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.resetPassword('test@example.com')
      })

      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle password update', async () => {
      authService.updatePassword.mockResolvedValue({ user: mockUser, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updatePassword('newpassword123')
      })

      expect(authService.updatePassword).toHaveBeenCalledWith('newpassword123')
    })

    it('should handle email verification resend', async () => {
      authService.resendEmailVerification.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.resendEmailVerification()
      })

      expect(authService.resendEmailVerification).toHaveBeenCalled()
    })

    it('should check user role', async () => {
      authService.hasRole.mockResolvedValue({ hasRole: true, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let hasRole
      await act(async () => {
        hasRole = await result.current.hasRole('admin')
      })

      expect(authService.hasRole).toHaveBeenCalledWith('admin', null)
      expect(hasRole).toBe(true)
    })

    it('should check user permission', async () => {
      authService.hasPermission.mockResolvedValue({ hasPermission: true, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let hasPermission
      await act(async () => {
        hasPermission = await result.current.hasPermission('create_vehicle')
      })

      expect(authService.hasPermission).toHaveBeenCalledWith('create_vehicle', null)
      expect(hasPermission).toBe(true)
    })

    it('should check email verification', async () => {
      authService.checkEmailVerification.mockResolvedValue({ isVerified: true, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let isVerified
      await act(async () => {
        isVerified = await result.current.checkEmailVerification()
      })

      expect(authService.checkEmailVerification).toHaveBeenCalled()
      expect(isVerified).toBe(true)
      expect(result.current.isEmailVerified).toBe(true)
    })

    it('should set admin status correctly', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.isAdmin.mockResolvedValue({ isAdmin: true, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true)
      })
    })

    it('should set permissions correctly', async () => {
      const mockPermissions = ['create_vehicle', 'edit_own_vehicle']
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.getUserPermissions.mockResolvedValue({ permissions: mockPermissions, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.permissions).toEqual(mockPermissions)
      })
    })

    it('should handle errors gracefully', async () => {
      authService.getCurrentSession.mockRejectedValue(new Error('Session error'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')
    })
  })

  describe('useRequireAuth', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

    it('should return authentication status', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })

      const { result } = renderHook(() => useRequireAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should return false for unauthenticated user', async () => {
      const { result } = renderHook(() => useRequireAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('useIsAdmin', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

    it('should return admin status', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.isAdmin.mockResolvedValue({ isAdmin: true, error: null })

      const { result } = renderHook(() => useIsAdmin(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true)
      })

      expect(result.current.user).toEqual(mockUser)
    })

    it('should return false for non-admin user', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.isAdmin.mockResolvedValue({ isAdmin: false, error: null })

      const { result } = renderHook(() => useIsAdmin(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false)
      })
    })
  })

  describe('usePermissions', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

    it('should return user permissions', async () => {
      const mockPermissions = ['create_vehicle', 'edit_own_vehicle']
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.getUserPermissions.mockResolvedValue({ permissions: mockPermissions, error: null })

      const { result } = renderHook(() => usePermissions(), { wrapper })

      await waitFor(() => {
        expect(result.current.permissions).toEqual(mockPermissions)
      })

      expect(typeof result.current.hasPermission).toBe('function')
    })
  })

  describe('useRoles', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

    it('should return role checking functions', async () => {
      authService.getCurrentSession.mockResolvedValue({ session: mockSession })
      authService.isAdmin.mockResolvedValue({ isAdmin: true, error: null })

      const { result } = renderHook(() => useRoles(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true)
      })

      expect(typeof result.current.hasRole).toBe('function')
    })
  })
})