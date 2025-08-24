import { supabase } from '@/lib/supabase'
import { safeAuthCall, safeSupabaseCall, getSupabaseErrorMessage } from '@/utils/supabaseHelpers'

/**
 * Authentication service for Supabase
 * Handles user authentication, session management, user profile operations,
 * email verification, password validation, and security event logging
 */

/**
 * Password strength validation utility
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with strength score and checks
 */
export const validatePasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const strength = Object.values(checks).filter(Boolean).length;
  const strengthPercentage = (strength / 5) * 100;
  
  return {
    isValid: strengthPercentage >= 60, // Require at least 3 out of 5 criteria
    strength: strengthPercentage,
    checks,
    message: getPasswordStrengthMessage(strengthPercentage)
  };
};

/**
 * Get password strength message
 * @param {number} strength - Strength percentage
 * @returns {string} Strength message
 */
const getPasswordStrengthMessage = (strength) => {
  if (strength < 20) return 'חלשה מאוד';
  if (strength < 40) return 'חלשה';
  if (strength < 60) return 'בינונית';
  if (strength < 80) return 'חזקה';
  return 'חזקה מאוד';
};

/**
 * Get client fingerprint for security tracking
 * @returns {string} Client fingerprint
 */
const getClientFingerprint = () => {
  try {
    // Safe canvas fingerprinting with fallback for testing environments
    let canvasFingerprint = 'fallback';
    
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Client fingerprint', 2, 2);
        canvasFingerprint = canvas.toDataURL();
      }
    }
    
    return btoa(JSON.stringify({
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'test-agent',
      language: typeof navigator !== 'undefined' ? navigator.language : 'he',
      canvasFingerprint,
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'test-platform',
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
      screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '1920x1080',
      timestamp: Date.now()
    })).substring(0, 32);
  } catch (error) {
    console.warn('Fingerprint generation failed, using fallback:', error.message);
    return btoa('fallback-fingerprint-' + Date.now()).substring(0, 32);
  }
};

/**
 * Check for suspicious login patterns
 * @param {string} email - User email
 * @returns {Promise<{isSuspicious, reason}>}
 */
const checkSuspiciousActivity = async (email) => {
  try {
    // Get recent failed login attempts for this email
    const { data: recentAttempts, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'signin_failed')
      .eq('details->>email', email)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check for too many failed attempts
    if (recentAttempts && recentAttempts.length >= 5) {
      return {
        isSuspicious: true,
        reason: 'too_many_failed_attempts',
        count: recentAttempts.length
      };
    }

    // Check for rapid succession attempts
    if (recentAttempts && recentAttempts.length >= 3) {
      const timestamps = recentAttempts.map(attempt => new Date(attempt.created_at).getTime());
      const timeDiffs = timestamps.slice(0, -1).map((time, index) => time - timestamps[index + 1]);
      const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      
      if (avgTimeDiff < 10000) { // Less than 10 seconds between attempts
        return {
          isSuspicious: true,
          reason: 'rapid_succession_attempts',
          avgInterval: avgTimeDiff
        };
      }
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    return { isSuspicious: false };
  }
};

/**
 * Log security events for audit purposes
 * @param {string} event - Event type
 * @param {Object} details - Event details
 * @param {string} userId - User ID (optional)
 */
const logSecurityEvent = async (event, details = {}, userId = null) => {
  try {
    const fingerprint = getClientFingerprint();
    
    const { data, error } = await safeSupabaseCall(
      supabase
        .from('activity_logs')
        .insert([
        {
          user_id: userId,
          action: event,
          resource_type: 'auth',
          details: {
            ...details,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            client_fingerprint: fingerprint,
            ip_address: 'client' // Will be populated by server
          }
        }
      ]),
      'רישום אירוע אבטחה'
    );
    
    if (error) {
      console.warn('Failed to log security event:', error);
    }
  } catch (error) {
    console.warn('Error logging security event:', error);
  }
};

export const authService = {
  /**
   * Sign up a new user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {Object} metadata - Additional user metadata (optional)
   * @returns {Promise<{user, session, error}>}
   */
  async signUp(email, password, metadata = {}) {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(`הסיסמה חלשה מדי: ${passwordValidation.message}`);
      }

      // Log signup attempt
      await logSecurityEvent('signup_attempt', { email });

      const { data, error } = await safeAuthCall(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/Login?message=אימות%20האימייל%20הושלם%20בהצלחה&type=success`
          }
        }),
        'הרשמת משתמש חדש'
      );

      if (error) throw error

      // If user is created, also create profile in users table
      if (data?.user) {
        // Check if this is an admin email and set role accordingly
        const isAdminEmail = data.user.email === 'zometauto@gmail.com';
        
        await this.createUserProfile(data.user.id, {
          email: data.user.email,
          full_name: metadata.full_name || '',
          phone: metadata.phone || '',
          role: isAdminEmail ? 'admin' : 'user', // Set admin role for admin email
          is_active: true,
          email_verified: false // Will be updated when email is verified
        });

        // Log successful signup
        await logSecurityEvent('signup_success', { email }, data.user.id);
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Sign up error:', error);
      
      // Log failed signup
      await logSecurityEvent('signup_failed', { 
        email, 
        error: error.message 
      });
      
      return { user: null, session: null, error }
    }
  },

  /**
   * Sign in user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{user, session, error}>}
   */
  async signIn(email, password) {
    try {
      // Check for suspicious activity before attempting login
      const suspiciousCheck = await checkSuspiciousActivity(email);
      if (suspiciousCheck.isSuspicious) {
        const error = new Error('חשבון זה נחסם זמנית עקב פעילות חשודה. אנא נסו שוב מאוחר יותר או פנו לתמיכה');
        error.code = 'SUSPICIOUS_ACTIVITY';
        error.details = suspiciousCheck;
        throw error;
      }

      // Log signin attempt
      await logSecurityEvent('signin_attempt', { email });

      const { data, error } = await safeAuthCall(
        supabase.auth.signInWithPassword({
          email,
          password
        }),
        'התחברות משתמש'
      )

      if (error) throw error

      console.log('Supabase sign in successful:', data.user?.email)

      // Update user profile with login information and increment login count
      if (data.user) {
        try {
          const { profile } = await this.getUserProfile(data.user.id);
          await this.updateUserProfile({
            last_login: new Date().toISOString(),
            login_count: (profile?.login_count || 0) + 1,
            failed_login_attempts: 0, // Reset failed attempts on successful login
            locked_until: null // Clear any account locks
          });
        } catch (profileError) {
          console.warn('Failed to update user profile:', profileError)
          // Don't fail the login if profile update fails
        }

        // Log successful signin with additional security info
        await logSecurityEvent('signin_success', { 
          email,
          login_count: (await this.getUserProfile(data.user.id)).profile?.login_count || 1
        }, data.user.id);
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Update failed login attempts if it's a credential error
      if (error.message?.includes('Invalid login credentials')) {
        try {
          // Try to find user by email and increment failed attempts
          const { data: users } = await supabase
            .from('users')
            .select('id, failed_login_attempts')
            .eq('email', email)
            .single();
          
          if (users) {
            const newFailedAttempts = (users.failed_login_attempts || 0) + 1;
            const shouldLock = newFailedAttempts >= 5;
            
            await supabase
              .from('users')
              .update({
                failed_login_attempts: newFailedAttempts,
                locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null // Lock for 30 minutes
              })
              .eq('id', users.id);
            
            if (shouldLock) {
              await logSecurityEvent('account_locked', { 
                email, 
                failed_attempts: newFailedAttempts 
              }, users.id);
            }
          }
        } catch (updateError) {
          console.warn('Failed to update failed login attempts:', updateError);
        }
      }
      
      // Log failed signin with detailed error info
      await logSecurityEvent('signin_failed', { 
        email, 
        error: error.message,
        error_code: error.code,
        suspicious_activity: error.code === 'SUSPICIOUS_ACTIVITY' ? error.details : null
      });
      
      return { user: null, session: null, error }
    }
  },

  /**
   * Sign out the current user
   * @returns {Promise<{error}>}
   */
  async signOut() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log signout
      if (user) {
        await logSecurityEvent('signout', {}, user.id);
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  },

  /**
   * Get the current user
   * @returns {Promise<{user, error}>}
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Get current user error:', error)
      return { user: null, error }
    }
  },

  /**
   * Get the current session
   * @returns {Promise<{session, error}>}
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session, error: null }
    } catch (error) {
      console.error('Get current session error:', error)
      return { session: null, error }
    }
  },

  /**
   * Listen to authentication state changes
   * @param {Function} callback - Callback function to handle auth state changes
   * @returns {Object} Subscription object with unsubscribe method
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  },

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @returns {Promise<{error}>}
   */
  async resetPassword(email) {
    try {
      // Log password reset attempt
      await logSecurityEvent('password_reset_request', { email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/ResetPassword`
      })
      
      if (error) throw error

      // Log successful password reset email sent
      await logSecurityEvent('password_reset_email_sent', { email });
      
      return { error: null }
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Log failed password reset
      await logSecurityEvent('password_reset_failed', { 
        email, 
        error: error.message 
      });
      
      return { error }
    }
  },

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise<{user, error}>}
   */
  async updatePassword(newPassword) {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`הסיסמה חלשה מדי: ${passwordValidation.message}`);
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Log password update attempt
      if (currentUser) {
        await logSecurityEvent('password_update_attempt', {}, currentUser.id);
      }

      const { data, error } = await safeAuthCall(
        supabase.auth.updateUser({
          password: newPassword
        }),
        'עדכון סיסמה'
      )
      
      if (error) throw error

      // Log successful password update
      if (data.user) {
        await logSecurityEvent('password_update_success', {}, data.user.id);
      }

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Update password error:', error);
      
      // Log failed password update
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await logSecurityEvent('password_update_failed', { 
          error: error.message 
        }, currentUser.id);
      }
      
      return { user: null, error }
    }
  },

  /**
   * Create user profile in users table
   * @param {string} userId - User's UUID
   * @param {Object} profileData - Profile data
   * @returns {Promise<{profile, error}>}
   */
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await safeSupabaseCall(
        supabase
          .from('users')
          .insert([
          {
            id: userId,
            ...profileData
          }
        ])
        .select()
        .single(),
        'יצירת פרופיל משתמש'
      )

      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error('Create user profile error:', error)
      return { profile: null, error }
    }
  },

  /**
   * Get user profile from users table
   * @param {string} userId - User's UUID (optional, uses current user if not provided)
   * @returns {Promise<{profile, error}>}
   */
  async getUserProfile(userId = null) {
    try {
      let query = supabase.from('users').select('*')
      
      if (userId) {
        query = query.eq('id', userId)
      } else {
        // Get current user's profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No authenticated user')
        query = query.eq('id', user.id)
      }

      const { data, error } = await query.single()
      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error('Get user profile error:', error)
      return { profile: null, error }
    }
  },

  /**
   * Update user profile in users table
   * @param {Object} updates - Profile updates
   * @returns {Promise<{profile, error}>}
   */
  async updateUserProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      // Log profile update
      await logSecurityEvent('profile_updated', { 
        updated_fields: Object.keys(updates) 
      }, user.id);

      return { profile: data, error: null }
    } catch (error) {
      console.error('Update user profile error:', error)
      return { profile: null, error }
    }
  },

  /**
   * Resend email verification
   * @returns {Promise<{error}>}
   */
  async resendEmailVerification() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/Login?message=אימות%20האימייל%20הושלם%20בהצלחה&type=success`
        }
      });

      if (error) throw error;

      // Log email verification resend
      await logSecurityEvent('email_verification_resent', {}, user.id);

      return { error: null };
    } catch (error) {
      console.error('Resend email verification error:', error);
      return { error };
    }
  },

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<{hasRole, error}>}
   */
  async hasRole(role, userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      return { hasRole: data.role === role, error: null };
    } catch (error) {
      console.error('Check role error:', error);
      return { hasRole: false, error };
    }
  },

  /**
   * Check if user is admin
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<{isAdmin, error}>}
   */
  async isAdmin(userId = null) {
    try {
      let targetUserId = userId;
      let userEmail = null;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        targetUserId = user.id;
        userEmail = user.email;
      }

      // First check if this is the hardcoded admin email
      if (userEmail === 'zometauto@gmail.com') {
        return { isAdmin: true, error: null };
      }

      const { data, error } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', targetUserId)
        .single();

      if (error) {
        // If profile doesn't exist but this is the admin email, still return true
        if (userEmail === 'zometauto@gmail.com') {
          return { isAdmin: true, error: null };
        }
        throw error;
      }

      // Check both role and hardcoded admin email
      const isAdmin = data.role === 'admin' || data.email === 'zometauto@gmail.com';

      return { isAdmin, error: null };
    } catch (error) {
      console.error('Check admin error:', error);
      
      // Last resort - check if current user email is admin email
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === 'zometauto@gmail.com') {
          return { isAdmin: true, error: null };
        }
      } catch (fallbackError) {
        console.error('Fallback admin check error:', fallbackError);
      }
      
      return { isAdmin: false, error };
    }
  },

  /**
   * Get user permissions based on role
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<{permissions, error}>}
   */
  async getUserPermissions(userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role, email, is_active')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      if (!data.is_active) {
        return { permissions: [], error: null };
      }

      // Define permissions based on role
      let permissions = ['read_own_profile', 'update_own_profile'];

      if (data.role === 'admin' || data.email === 'zometauto@gmail.com') {
        permissions = [
          ...permissions,
          'read_all_users',
          'update_all_users',
          'delete_users',
          'manage_ads',
          'manage_promotions',
          'view_analytics',
          'manage_system_settings',
          'view_audit_logs'
        ];
      } else if (data.role === 'moderator') {
        permissions = [
          ...permissions,
          'moderate_ads',
          'view_user_reports'
        ];
      }

      return { permissions, error: null };
    } catch (error) {
      console.error('Get user permissions error:', error);
      return { permissions: [], error };
    }
  },

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<{hasPermission, error}>}
   */
  async hasPermission(permission, userId = null) {
    try {
      const { permissions, error } = await this.getUserPermissions(userId);
      if (error) throw error;

      return { hasPermission: permissions.includes(permission), error: null };
    } catch (error) {
      console.error('Check permission error:', error);
      return { hasPermission: false, error };
    }
  },

  /**
   * Verify email confirmation status
   * @returns {Promise<{isVerified, error}>}
   */
  async checkEmailVerification() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Check if email is confirmed in auth
      const isVerified = user.email_confirmed_at !== null;

      // Update user profile if verification status changed
      if (isVerified) {
        await this.updateUserProfile({ email_verified: true });
      }

      return { isVerified, error: null };
    } catch (error) {
      console.error('Check email verification error:', error);
      return { isVerified: false, error };
    }
  },

  /**
   * Get user security settings and status
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<{securityStatus, error}>}
   */
  async getUserSecurityStatus(userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('users')
        .select('email_verified, two_factor_enabled, failed_login_attempts, locked_until, last_login, login_count')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      const isLocked = data.locked_until && new Date(data.locked_until) > new Date();
      const daysSinceLastLogin = data.last_login 
        ? Math.floor((Date.now() - new Date(data.last_login).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const securityStatus = {
        emailVerified: data.email_verified,
        twoFactorEnabled: data.two_factor_enabled,
        accountLocked: isLocked,
        lockedUntil: data.locked_until,
        failedLoginAttempts: data.failed_login_attempts || 0,
        lastLogin: data.last_login,
        daysSinceLastLogin,
        loginCount: data.login_count || 0,
        securityScore: this.calculateSecurityScore({
          emailVerified: data.email_verified,
          twoFactorEnabled: data.two_factor_enabled,
          recentActivity: daysSinceLastLogin < 30,
          noFailedAttempts: (data.failed_login_attempts || 0) === 0
        })
      };

      return { securityStatus, error: null };
    } catch (error) {
      console.error('Get user security status error:', error);
      return { securityStatus: null, error };
    }
  },

  /**
   * Calculate security score based on various factors
   * @param {Object} factors - Security factors
   * @returns {number} Security score (0-100)
   */
  calculateSecurityScore(factors) {
    let score = 0;
    
    if (factors.emailVerified) score += 25;
    if (factors.twoFactorEnabled) score += 35;
    if (factors.recentActivity) score += 20;
    if (factors.noFailedAttempts) score += 20;
    
    return Math.min(score, 100);
  },

  /**
   * Get recent security events for user
   * @param {number} limit - Number of events to retrieve
   * @returns {Promise<{events, error}>}
   */
  async getRecentSecurityEvents(limit = 10) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('resource_type', 'auth')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const events = data.map(event => ({
        id: event.id,
        action: event.action,
        timestamp: event.created_at,
        details: event.details,
        userAgent: event.details?.user_agent,
        clientFingerprint: event.details?.client_fingerprint
      }));

      return { events, error: null };
    } catch (error) {
      console.error('Get recent security events error:', error);
      return { events: [], error };
    }
  },

  /**
   * Enable two-factor authentication (preparation for future implementation)
   * @returns {Promise<{qrCode, secret, error}>}
   */
  async enableTwoFactor() {
    try {
      // This is a placeholder for future 2FA implementation
      // For now, we'll just update the user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      await this.updateUserProfile({ two_factor_enabled: true });
      
      await logSecurityEvent('two_factor_enabled', {}, user.id);

      return { 
        qrCode: null, // Will be implemented with actual 2FA library
        secret: null, // Will be implemented with actual 2FA library
        error: null 
      };
    } catch (error) {
      console.error('Enable two-factor error:', error);
      return { qrCode: null, secret: null, error };
    }
  },

  /**
   * Disable two-factor authentication
   * @returns {Promise<{error}>}
   */
  async disableTwoFactor() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      await this.updateUserProfile({ two_factor_enabled: false });
      
      await logSecurityEvent('two_factor_disabled', {}, user.id);

      return { error: null };
    } catch (error) {
      console.error('Disable two-factor error:', error);
      return { error };
    }
  }
}

export default authService