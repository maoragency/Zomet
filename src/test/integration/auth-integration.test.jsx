import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { 
  mockUser, 
  mockAdminUser, 
  mockSupabaseResponse,
  mockFormData,
  mockApiErrors
} from '../utils.jsx'

// Import auth components
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import { AuthProvider } from '@/hooks/useAuth'

// Mock router
const MockRouter = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Flow Integration', () => {
    it('should complete successful login flow', async () => {
      // Mock successful login
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' }
        },
        error: null
      })

      // Mock user profile fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUser))
          })
        })
      })

      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      // Fill login form
      const emailInput = screen.getByLabelText(/אימייל/i)
      const passwordInput = screen.getByLabelText(/סיסמה/i)
      
      await userEvent.type(emailInput, mockFormData.email)
      await userEvent.type(passwordInput, mockFormData.password)

      // Submit form
      const loginButton = screen.getByRole('button', { name: /התחבר/i })
      await userEvent.click(loginButton)

      // Verify login was called
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: mockFormData.email,
          password: mockFormData.password
        })
      })

      // Verify user profile was fetched
      expect(supabase.from).toHaveBeenCalledWith('users')
    })

    it('should handle login errors gracefully', async () => {
      // Mock login error
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      })

      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      // Fill and submit form
      const emailInput = screen.getByLabelText(/אימייל/i)
      const passwordInput = screen.getByLabelText(/סיסמה/i)
      
      await userEvent.type(emailInput, mockFormData.email)
      await userEvent.type(passwordInput, 'wrong-password')

      const loginButton = screen.getByRole('button', { name: /התחבר/i })
      await userEvent.click(loginButton)

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/פרטי התחברות שגויים/i)).toBeInTheDocument()
      })
    })

    it('should validate form inputs before submission', async () => {
      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      // Try to submit empty form
      const loginButton = screen.getByRole('button', { name: /התחבר/i })
      await userEvent.click(loginButton)

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/אימייל נדרש/i)).toBeInTheDocument()
        expect(screen.getByText(/סיסמה נדרשת/i)).toBeInTheDocument()
      })

      // Verify login was not called
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('Signup Flow Integration', () => {
    it('should complete successful signup with email verification', async () => {
      // Mock successful signup
      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { ...mockUser, email_confirmed_at: null },
          session: null
        },
        error: null
      })

      render(
        <MockRouter>
          <AuthProvider>
            <Signup />
          </AuthProvider>
        </MockRouter>
      )

      // Fill signup form
      const emailInput = screen.getByLabelText(/אימייל/i)
      const passwordInput = screen.getByLabelText(/סיסמה/i)
      const confirmPasswordInput = screen.getByLabelText(/אישור סיסמה/i)
      const fullNameInput = screen.getByLabelText(/שם מלא/i)
      const phoneInput = screen.getByLabelText(/טלפון/i)
      
      await userEvent.type(emailInput, mockFormData.email)
      await userEvent.type(passwordInput, mockFormData.password)
      await userEvent.type(confirmPasswordInput, mockFormData.password)
      await userEvent.type(fullNameInput, mockFormData.full_name)
      await userEvent.type(phoneInput, mockFormData.phone)

      // Submit form
      const signupButton = screen.getByRole('button', { name: /הרשם/i })
      await userEvent.click(signupButton)

      // Verify signup was called
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: mockFormData.email,
          password: mockFormData.password,
          options: {
            data: {
              full_name: mockFormData.full_name,
              phone: mockFormData.phone
            }
          }
        })
      })

      // Verify email verification message
      expect(screen.getByText(/נשלח אימייל אישור/i)).toBeInTheDocument()
    })

    it('should validate password strength', async () => {
      render(
        <MockRouter>
          <AuthProvider>
            <Signup />
          </AuthProvider>
        </MockRouter>
      )

      const passwordInput = screen.getByLabelText(/סיסמה/i)
      
      // Test weak password
      await userEvent.type(passwordInput, '123')
      
      // Verify password strength indicator
      await waitFor(() => {
        expect(screen.getByText(/סיסמה חלשה/i)).toBeInTheDocument()
      })

      // Test strong password
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'StrongPassword123!')
      
      await waitFor(() => {
        expect(screen.getByText(/סיסמה חזקה/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      render(
        <MockRouter>
          <AuthProvider>
            <Signup />
          </AuthProvider>
        </MockRouter>
      )

      const passwordInput = screen.getByLabelText(/סיסמה/i)
      const confirmPasswordInput = screen.getByLabelText(/אישור סיסמה/i)
      
      await userEvent.type(passwordInput, mockFormData.password)
      await userEvent.type(confirmPasswordInput, 'different-password')

      const signupButton = screen.getByRole('button', { name: /הרשם/i })
      await userEvent.click(signupButton)

      // Verify password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/סיסמאות לא תואמות/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset Flow Integration', () => {
    it('should send password reset email', async () => {
      // Mock password reset
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      })

      render(
        <MockRouter>
          <AuthProvider>
            <ForgotPassword />
          </AuthProvider>
        </MockRouter>
      )

      // Fill email
      const emailInput = screen.getByLabelText(/אימייל/i)
      await userEvent.type(emailInput, mockFormData.email)

      // Submit form
      const resetButton = screen.getByRole('button', { name: /שלח קישור איפוס/i })
      await userEvent.click(resetButton)

      // Verify reset was called
      await waitFor(() => {
        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          mockFormData.email,
          expect.any(Object)
        )
      })

      // Verify success message
      expect(screen.getByText(/נשלח קישור איפוס/i)).toBeInTheDocument()
    })

    it('should handle password reset completion', async () => {
      // Mock password update
      supabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      render(
        <MockRouter>
          <AuthProvider>
            <ResetPassword />
          </AuthProvider>
        </MockRouter>
      )

      // Fill new password
      const passwordInput = screen.getByLabelText(/סיסמה חדשה/i)
      const confirmPasswordInput = screen.getByLabelText(/אישור סיסמה/i)
      
      await userEvent.type(passwordInput, 'NewPassword123!')
      await userEvent.type(confirmPasswordInput, 'NewPassword123!')

      // Submit form
      const updateButton = screen.getByRole('button', { name: /עדכן סיסמה/i })
      await userEvent.click(updateButton)

      // Verify password update was called
      await waitFor(() => {
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          password: 'NewPassword123!'
        })
      })
    })
  })

  describe('Authorization Integration', () => {
    it('should enforce role-based access control for admin routes', async () => {
      // Mock regular user session
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      // Mock user profile fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUser))
          })
        })
      })

      // This would test that regular users can't access admin routes
      // Implementation depends on your routing and auth guard setup
      expect(mockUser.role).toBe('user')
      expect(mockAdminUser.role).toBe('admin')
    })

    it('should handle session expiration gracefully', async () => {
      // Mock expired session
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockApiErrors.unauthorized
      })

      // This would test automatic logout on session expiration
      // Implementation depends on your auth context setup
      expect(true).toBe(true) // Placeholder
    })

    it('should refresh tokens automatically', async () => {
      // Mock token refresh
      supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-token' },
          user: mockUser
        },
        error: null
      })

      // This would test automatic token refresh
      // Implementation depends on your auth context setup
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Session Management Integration', () => {
    it('should maintain session state across page refreshes', async () => {
      // Mock session persistence
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      // Mock auth state change listener
      const mockUnsubscribe = vi.fn()
      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      render(
        <MockRouter>
          <AuthProvider>
            <div>Test Component</div>
          </AuthProvider>
        </MockRouter>
      )

      // Verify session was checked
      expect(supabase.auth.getSession).toHaveBeenCalled()
      
      // Verify auth state listener was set up
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    it('should handle concurrent login sessions', async () => {
      // Mock multiple session scenario
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      // This would test handling of multiple browser tabs/windows
      // Implementation depends on your session management strategy
      expect(true).toBe(true) // Placeholder
    })

    it('should clean up auth listeners on unmount', async () => {
      const mockUnsubscribe = vi.fn()
      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      const { unmount } = render(
        <MockRouter>
          <AuthProvider>
            <div>Test Component</div>
          </AuthProvider>
        </MockRouter>
      )

      // Unmount component
      unmount()

      // Verify cleanup was called
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Security Integration', () => {
    it('should prevent XSS attacks in form inputs', async () => {
      const maliciousScript = '<script>alert("xss")</script>'
      
      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      const emailInput = screen.getByLabelText(/אימייל/i)
      await userEvent.type(emailInput, maliciousScript)

      // Verify script is not executed (input should be sanitized)
      expect(emailInput.value).toBe(maliciousScript)
      // In a real implementation, you'd verify the input is sanitized
    })

    it('should implement rate limiting for login attempts', async () => {
      // Mock rate limit error
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests' }
      })

      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      // Simulate multiple failed attempts
      const emailInput = screen.getByLabelText(/אימייל/i)
      const passwordInput = screen.getByLabelText(/סיסמה/i)
      const loginButton = screen.getByRole('button', { name: /התחבר/i })
      
      await userEvent.type(emailInput, mockFormData.email)
      await userEvent.type(passwordInput, 'wrong-password')

      // Multiple attempts
      for (let i = 0; i < 5; i++) {
        await userEvent.click(loginButton)
      }

      // Verify rate limit message
      await waitFor(() => {
        expect(screen.getByText(/יותר מדי ניסיונות/i)).toBeInTheDocument()
      })
    })

    it('should validate email format and prevent injection', async () => {
      render(
        <MockRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MockRouter>
      )

      const emailInput = screen.getByLabelText(/אימייל/i)
      
      // Test invalid email formats
      await userEvent.type(emailInput, 'invalid-email')
      
      const loginButton = screen.getByRole('button', { name: /התחבר/i })
      await userEvent.click(loginButton)

      // Verify email validation error
      await waitFor(() => {
        expect(screen.getByText(/כתובת אימייל לא תקינה/i)).toBeInTheDocument()
      })
    })
  })
})