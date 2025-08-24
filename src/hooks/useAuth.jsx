import { useState, useEffect, useContext, createContext } from 'react'
import authService from '@/services/auth'

/**
 * Authentication Context
 */
const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  permissions: [],
  isEmailVerified: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  resendEmailVerification: async () => {},
  hasRole: async () => {},
  hasPermission: async () => {},
  checkEmailVerification: async () => {}
})

/**
 * Authentication Provider Component
 * Wraps the app to provide authentication state and methods
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  // Helper function to load user permissions
  const loadUserPermissions = async (userId) => {
    try {
      const { permissions: userPermissions, error: permError } = await authService.getUserPermissions(userId)
      if (!permError) {
        setPermissions(userPermissions)
      }

      const { isAdmin: userIsAdmin, error: adminError } = await authService.isAdmin(userId)
      if (!adminError) {
        setIsAdmin(userIsAdmin)
      } else {
        // Fallback check for admin email
        const { data: { user } } = await authService.getCurrentSession()
        if (user && user.email === 'zometauto@gmail.com') {
          setIsAdmin(true)
        }
      }
    } catch (error) {
      console.error('Error loading user permissions:', error)
    }
  }

  // Simple admin fix function
  const fixAdminRole = async () => {
    try {
      console.log('🔧 fixAdminRole: Starting admin role fix...')
      const { data: { user } } = await authService.getCurrentSession()
      console.log('🔧 fixAdminRole: Current session user:', user?.email)
      
      if (user?.email === 'zometauto@gmail.com') {
        console.log('🔧 fixAdminRole: Updating user profile to admin...')
        // Try to update the user profile to admin
        const updateResult = await authService.updateUserProfile({
          role: 'admin',
          is_active: true,
          email_verified: true
        })
        console.log('🔧 fixAdminRole: Update result:', updateResult)
        return updateResult
      }
      console.log('❌ fixAdminRole: Not admin email:', user?.email)
      return { success: false, error: 'Not admin email' }
    } catch (error) {
      console.error('❌ fixAdminRole: Error fixing admin role:', error)
      return { success: false, error: error.message }
    }
  }

  // Helper function to check email verification status
  const checkEmailVerificationStatus = async () => {
    try {
      const { isVerified, error } = await authService.checkEmailVerification()
      if (!error) {
        setIsEmailVerified(isVerified)
      }
    } catch (error) {
      console.error('Error checking email verification:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session } = await authService.getCurrentSession()
        setSession(session)
        
        if (session?.user) {
          // Get user profile
          try {
            console.log('Loading user profile for:', session.user.email)
            const profileResult = await authService.getUserProfile()
            console.log('Profile result:', profileResult)
            
            if (profileResult.profile) {
              console.log('User profile loaded:', profileResult.profile.email)
              
              // Auto-fix admin role if needed
              if (session.user.email === 'zometauto@gmail.com' && profileResult.profile.role !== 'admin') {
                console.log('🔧 Admin user detected with wrong role, fixing...', {
                  email: session.user.email,
                  currentRole: profileResult.profile.role,
                  expectedRole: 'admin'
                })
                const fixResult = await fixAdminRole()
                if (fixResult.success && fixResult.profile) {
                  console.log('✅ Admin role fixed successfully:', fixResult.profile.role)
                  setUser(fixResult.profile)
                } else {
                  console.log('❌ Admin role fix failed, using original profile')
                  setUser(profileResult.profile)
                }
              } else {
                console.log('✅ User role is correct:', {
                  email: session.user.email,
                  role: profileResult.profile.role,
                  isAdmin: profileResult.profile.role === 'admin' || session.user.email === 'zometauto@gmail.com'
                })
                setUser(profileResult.profile)
              }
            } else if (profileResult.error) {
              console.log('Profile not found, creating new profile...')
              
              // For admin user, create a temporary profile object
              if (session.user.email === 'zometauto@gmail.com') {
                console.log('🔧 Creating temporary admin profile for zometauto@gmail.com')
                const tempAdminProfile = {
                  id: session.user.id,
                  email: session.user.email,
                  full_name: 'מנהל מערכת צומת',
                  phone: '',
                  role: 'admin',
                  is_active: true,
                  email_verified: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                console.log('✅ Using temporary admin profile:', tempAdminProfile)
                setUser(tempAdminProfile)
              } else {
                // Try to create profile for regular users
                const createResult = await authService.createUserProfile(session.user.id, {
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || '',
                  phone: session.user.user_metadata?.phone || '',
                  role: 'user',
                  is_active: true,
                  email_verified: session.user.email_confirmed_at !== null
                })
                
                if (createResult.profile) {
                  console.log('Profile created successfully:', createResult.profile.email)
                  setUser(createResult.profile)
                } else {
                  console.error('Failed to create profile, using auth user:', createResult.error)
                  setUser(session.user)
                }
              }
            }
            
            // Load user permissions and admin status
            await loadUserPermissions(session.user.id)
            
            // Force admin status for zometauto@gmail.com
            if (session.user.email === 'zometauto@gmail.com') {
              console.log('🔧 Forcing admin status for zometauto@gmail.com in initial session')
              setIsAdmin(true)
            }
            
            // Check email verification status
            await checkEmailVerificationStatus()
          } catch (error) {
            console.error('Error loading user profile:', error)
            setUser(session.user)
            
            // Even if profile loading fails, force admin for zometauto@gmail.com
            if (session.user.email === 'zometauto@gmail.com') {
              console.log('🔧 Forcing admin status for zometauto@gmail.com even after profile error')
              setIsAdmin(true)
            }
          }
        } else {
          console.log('No session, clearing user state')
          setUser(null)
          setIsAdmin(false)
          setPermissions([])
          setIsEmailVerified(false)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        setSession(session)
        
        if (session?.user) {
          try {
            console.log('Loading profile after auth change for:', session.user.email)
            const profileResult = await authService.getUserProfile()
            
            if (profileResult.profile) {
              console.log('Profile loaded after auth change:', profileResult.profile.email)
              
              // Auto-fix admin role if needed
              if (session.user.email === 'zometauto@gmail.com' && profileResult.profile.role !== 'admin') {
                console.log('Admin user detected with wrong role after auth change, fixing...')
                const fixResult = await fixAdminRole()
                if (fixResult.success && fixResult.profile) {
                  setUser(fixResult.profile)
                } else {
                  setUser(profileResult.profile)
                }
              } else {
                setUser(profileResult.profile)
              }
            } else {
              console.log('Profile not found after auth change, creating...')
              
              // For admin user, create a temporary profile object
              if (session.user.email === 'zometauto@gmail.com') {
                console.log('🔧 Creating temporary admin profile after auth change for zometauto@gmail.com')
                const tempAdminProfile = {
                  id: session.user.id,
                  email: session.user.email,
                  full_name: 'מנהל מערכת צומת',
                  phone: '',
                  role: 'admin',
                  is_active: true,
                  email_verified: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                console.log('✅ Using temporary admin profile after auth change:', tempAdminProfile)
                setUser(tempAdminProfile)
              } else {
                // Try to create profile for regular users
                const createResult = await authService.createUserProfile(session.user.id, {
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || '',
                  phone: session.user.user_metadata?.phone || '',
                  role: 'user',
                  is_active: true,
                  email_verified: session.user.email_confirmed_at !== null
                })
                
                if (createResult.profile) {
                  console.log('Profile created after auth change:', createResult.profile.email)
                  setUser(createResult.profile)
                } else {
                  console.error('Failed to create profile after auth change, using auth user')
                  setUser(session.user)
                }
              }
            }
            
            // Load user permissions and admin status
            await loadUserPermissions(session.user.id)
            
            // Force admin status for zometauto@gmail.com
            if (session.user.email === 'zometauto@gmail.com') {
              console.log('🔧 Forcing admin status for zometauto@gmail.com after auth change')
              setIsAdmin(true)
            }
            
            // Check email verification status
            await checkEmailVerificationStatus()
          } catch (error) {
            console.error('Error loading user profile after auth change:', error)
            setUser(session.user)
            
            // Even if profile loading fails, force admin for zometauto@gmail.com
            if (session.user.email === 'zometauto@gmail.com') {
              console.log('🔧 Forcing admin status for zometauto@gmail.com even after auth change error')
              setIsAdmin(true)
            }
          }
        } else {
          console.log('No session after auth change, clearing user state')
          setUser(null)
          setIsAdmin(false)
          setPermissions([])
          setIsEmailVerified(false)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  /**
   * Sign up a new user
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true)
      const result = await authService.signUp(email, password, metadata)
      
      if (result.error) {
        return { error: result.error, user: null, session: null }
      }

      return result
    } catch (error) {
      console.error('Sign up error:', error)
      return { error, user: null, session: null }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in user
   */
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const result = await authService.signIn(email, password)
      
      if (result.error) {
        return { error: result.error, user: null, session: null }
      }

      // Wait a moment for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 500))

      return result
    } catch (error) {
      console.error('Sign in error:', error)
      return { error, user: null, session: null }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out user
   */
  const signOut = async () => {
    try {
      setLoading(true)
      const result = await authService.signOut()
      
      if (result.error) {
        throw result.error
      }

      setUser(null)
      setSession(null)
      
      return result
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    try {
      const result = await authService.updateUserProfile(updates)
      
      if (result.error) {
        throw result.error
      }

      setUser(result.profile)
      return result
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    try {
      const result = await authService.resetPassword(email)
      
      if (result.error) {
        throw result.error
      }

      return result
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  /**
   * Update password
   */
  const updatePassword = async (newPassword) => {
    try {
      const result = await authService.updatePassword(newPassword)
      
      if (result.error) {
        throw result.error
      }

      return result
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }

  /**
   * Resend email verification
   */
  const resendEmailVerification = async () => {
    try {
      const result = await authService.resendEmailVerification()
      
      if (result.error) {
        throw result.error
      }

      return result
    } catch (error) {
      console.error('Resend email verification error:', error)
      throw error
    }
  }

  /**
   * Check if user has specific role
   */
  const hasRole = async (role, userId = null) => {
    try {
      const result = await authService.hasRole(role, userId)
      
      if (result.error) {
        throw result.error
      }

      return result.hasRole
    } catch (error) {
      console.error('Check role error:', error)
      return false
    }
  }

  /**
   * Check if user has specific permission
   */
  const hasPermission = async (permission, userId = null) => {
    try {
      const result = await authService.hasPermission(permission, userId)
      
      if (result.error) {
        throw result.error
      }

      return result.hasPermission
    } catch (error) {
      console.error('Check permission error:', error)
      return false
    }
  }

  /**
   * Check email verification status
   */
  const checkEmailVerification = async () => {
    try {
      const result = await authService.checkEmailVerification()
      
      if (result.error) {
        throw result.error
      }

      setIsEmailVerified(result.isVerified)
      return result.isVerified
    } catch (error) {
      console.error('Check email verification error:', error)
      return false
    }
  }

  /**
   * Get user security status
   */
  const getUserSecurityStatus = async (userId = null) => {
    try {
      const result = await authService.getUserSecurityStatus(userId);
      
      if (result.error) {
        throw result.error;
      }

      return result.securityStatus;
    } catch (error) {
      console.error('Get user security status error:', error);
      return null;
    }
  };

  /**
   * Get recent security events
   */
  const getRecentSecurityEvents = async (limit = 10) => {
    try {
      const result = await authService.getRecentSecurityEvents(limit);
      
      if (result.error) {
        throw result.error;
      }

      return result.events;
    } catch (error) {
      console.error('Get recent security events error:', error);
      return [];
    }
  };

  /**
   * Enable two-factor authentication
   */
  const enableTwoFactor = async () => {
    try {
      const result = await authService.enableTwoFactor();
      
      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (error) {
      console.error('Enable two-factor error:', error);
      throw error;
    }
  };

  /**
   * Disable two-factor authentication
   */
  const disableTwoFactor = async () => {
    try {
      const result = await authService.disableTwoFactor();
      
      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (error) {
      console.error('Disable two-factor error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    permissions,
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    hasRole,
    hasPermission,
    checkEmailVerification,
    getUserSecurityStatus,
    getRecentSecurityEvents,
    enableTwoFactor,
    disableTwoFactor
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth Hook
 * Provides authentication state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth()
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800"></div>
          <p className="ml-4 text-lg">טוען...</p>
        </div>
      )
    }
    
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">נדרשת התחברות</h2>
            <p className="text-gray-600">עליך להיות מחובר כדי לגשת לעמוד זה.</p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

/**
 * Hook for checking if user is authenticated
 */
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isLoading: loading
  }
}

/**
 * Hook for checking if user is admin
 */
export function useIsAdmin() {
  const { user, isAdmin } = useAuth()
  
  return {
    isAdmin,
    user
  }
}

/**
 * Hook for checking user permissions
 */
export function usePermissions() {
  const { permissions, hasPermission } = useAuth()
  
  return {
    permissions,
    hasPermission
  }
}

/**
 * Hook for role-based access control
 */
export function useRoles() {
  const { hasRole, isAdmin } = useAuth()
  
  return {
    hasRole,
    isAdmin
  }
}

export default useAuth