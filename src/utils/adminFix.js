/**
 * Admin role fix utilities
 */

import { supabase } from '@/lib/supabase'

/**
 * Fix admin role for zometauto@gmail.com
 */
export const fixAdminRole = async () => {
  try {
    console.log('Fixing admin role...')
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No authenticated user')
      return { success: false, error: 'No authenticated user' }
    }
    
    console.log('Current user:', user.email)
    
    // Check if this is the admin email
    if (user.email !== 'zometauto@gmail.com') {
      console.log('Not admin email, skipping')
      return { success: false, error: 'Not admin email' }
    }
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile:', checkError)
      return { success: false, error: checkError }
    }
    
    if (existingProfile) {
      console.log('Existing profile found:', existingProfile)
      
      // Update existing profile to admin
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          role: 'admin',
          full_name: existingProfile.full_name || 'מנהל מערכת',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating profile:', updateError)
        return { success: false, error: updateError }
      }
      
      console.log('Profile updated to admin:', updatedProfile)
      return { success: true, profile: updatedProfile }
    } else {
      console.log('No profile found, creating admin profile...')
      
      // Create new admin profile
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          full_name: 'מנהל מערכת',
          phone: '',
          role: 'admin',
          is_active: true,
          email_verified: user.email_confirmed_at !== null
        }])
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating admin profile:', createError)
        return { success: false, error: createError }
      }
      
      console.log('Admin profile created:', newProfile)
      return { success: true, profile: newProfile }
    }
    
  } catch (error) {
    console.error('Fix admin role error:', error)
    return { success: false, error }
  }
}

/**
 * Check and fix admin role automatically
 */
export const autoFixAdminRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && user.email === 'zometauto@gmail.com') {
      console.log('Admin user detected, checking role...')
      
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!profile || profile.role !== 'admin') {
        console.log('Admin role missing, fixing...')
        return await fixAdminRole()
      } else {
        console.log('Admin role already correct')
        return { success: true, alreadyCorrect: true }
      }
    }
    
    return { success: true, notAdmin: true }
  } catch (error) {
    console.error('Auto fix admin role error:', error)
    return { success: false, error }
  }
}

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.fixAdminRole = fixAdminRole
  window.autoFixAdminRole = autoFixAdminRole
}

export default {
  fixAdminRole,
  autoFixAdminRole
}