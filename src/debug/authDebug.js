/**
 * Debug utilities for authentication issues
 */

import { supabase } from '@/lib/supabase'

/**
 * Debug authentication state
 */
export const debugAuth = async () => {
  console.log('=== AUTH DEBUG START ===')
  
  try {
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session:', sessionData.session?.user?.email || 'No session')
    console.log('Session error:', sessionError)
    
    // Check current user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', userData.user?.email || 'No user')
    console.log('User error:', userError)
    
    // Check if users table exists and has data
    if (userData.user) {
      console.log('Checking users table for user:', userData.user.id)
      
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.user.id)
        .single()
      
      console.log('User profile:', profileData)
      console.log('Profile error:', profileError)
      
      // Check if users table exists at all
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      console.log('Users table accessible:', !allUsersError)
      console.log('Users table error:', allUsersError)
    }
    
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('pricing_plans')
      .select('count')
      .limit(1)
    
    console.log('Database connection test:', !testError)
    console.log('Connection error:', testError)
    
  } catch (error) {
    console.error('Debug error:', error)
  }
  
  console.log('=== AUTH DEBUG END ===')
}

/**
 * Create user profile if missing
 */
export const createMissingProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No authenticated user')
      return
    }
    
    console.log('Creating profile for user:', user.email)
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          role: user.email === 'zometauto@gmail.com' ? 'admin' : 'user',
          is_active: true,
          email_verified: user.email_confirmed_at !== null
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating profile:', error)
    } else {
      console.log('Profile created successfully:', data)
    }
    
    return { data, error }
  } catch (error) {
    console.error('Create profile error:', error)
    return { data: null, error }
  }
}

/**
 * Test sign in process
 */
export const testSignIn = async (email, password) => {
  console.log('=== SIGN IN TEST START ===')
  
  try {
    console.log('Attempting sign in for:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    console.log('Sign in result:', data)
    console.log('Sign in error:', error)
    
    if (data.user) {
      console.log('User signed in successfully:', data.user.email)
      
      // Wait a moment for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      console.log('User profile after sign in:', profileData)
      console.log('Profile error after sign in:', profileError)
    }
    
  } catch (error) {
    console.error('Test sign in error:', error)
  }
  
  console.log('=== SIGN IN TEST END ===')
}

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth
  window.createMissingProfile = createMissingProfile
  window.testSignIn = testSignIn
}