/**
 * Apply Admin Fix Utility
 * Applies the admin function fix directly through Supabase client
 */

import { supabase } from '@/lib/supabase'

/**
 * Apply the admin function fix
 */
export const applyAdminFix = async () => {
  try {
    console.log('🔧 Applying admin function fix...')
    
    // Step 1: Update is_admin function
    const adminFunctionSQL = `
      CREATE OR REPLACE FUNCTION is_admin()
      RETURNS BOOLEAN AS $$
      DECLARE
          user_email TEXT;
          user_role TEXT;
      BEGIN
          -- First check if user is authenticated
          IF auth.uid() IS NULL THEN
              RETURN false;
          END IF;
          
          -- Get email from JWT
          user_email := auth.jwt() ->> 'email';
          
          -- Check if email is admin email
          IF user_email = 'zometauto@gmail.com' THEN
              RETURN true;
          END IF;
          
          -- Also check role in users table
          SELECT role INTO user_role
          FROM public.users
          WHERE id = auth.uid();
          
          -- Return true if role is admin
          RETURN user_role = 'admin';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: functionError } = await supabase.rpc('exec_sql', { 
      sql: adminFunctionSQL 
    })
    
    if (functionError) {
      console.error('Error updating is_admin function:', functionError)
      throw functionError
    }
    
    console.log('✅ is_admin function updated')
    
    // Step 2: Update admin user role if exists
    const { data: currentUser } = await supabase.auth.getUser()
    
    if (currentUser.user && currentUser.user.email === 'zometauto@gmail.com') {
      console.log('🔄 Updating admin user role...')
      
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: currentUser.user.id,
          email: currentUser.user.email,
          full_name: 'מנהל מערכת',
          role: 'admin',
          is_active: true,
          email_verified: true
        }, {
          onConflict: 'id'
        })
      
      if (updateError) {
        console.error('Error updating admin user:', updateError)
        throw updateError
      }
      
      console.log('✅ Admin user role updated')
    }
    
    console.log('🎉 Admin fix applied successfully!')
    
    return {
      success: true,
      message: 'Admin fix applied successfully. Please refresh the page.'
    }
    
  } catch (error) {
    console.error('Failed to apply admin fix:', error)
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to apply admin fix. Please try manual fix in Supabase Dashboard.'
    }
  }
}

/**
 * Check if admin fix is needed
 */
export const checkAdminFixNeeded = async () => {
  try {
    const { data: currentUser } = await supabase.auth.getUser()
    
    if (!currentUser.user || currentUser.user.email !== 'zometauto@gmail.com') {
      return { needed: false, reason: 'Not admin user' }
    }
    
    // Check if user has admin role in database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.user.id)
      .single()
    
    if (error) {
      return { needed: true, reason: 'User profile not found' }
    }
    
    if (userProfile.role !== 'admin') {
      return { needed: true, reason: 'User role is not admin' }
    }
    
    return { needed: false, reason: 'Admin role already correct' }
    
  } catch (error) {
    console.error('Error checking admin fix:', error)
    return { needed: true, reason: 'Error checking admin status' }
  }
}

/**
 * Manual admin role fix (simpler version)
 */
export const manualAdminFix = async () => {
  try {
    const { data: currentUser } = await supabase.auth.getUser()
    
    if (!currentUser.user || currentUser.user.email !== 'zometauto@gmail.com') {
      throw new Error('Not admin user')
    }
    
    console.log('🔄 Applying manual admin fix...')
    
    // Update user role directly
    const { error } = await supabase
      .from('users')
      .upsert({
        id: currentUser.user.id,
        email: currentUser.user.email,
        full_name: 'מנהל מערכת',
        role: 'admin',
        is_active: true,
        email_verified: true
      }, {
        onConflict: 'id'
      })
    
    if (error) {
      throw error
    }
    
    console.log('✅ Manual admin fix applied')
    
    return {
      success: true,
      message: 'Admin role updated successfully. Please refresh the page.'
    }
    
  } catch (error) {
    console.error('Manual admin fix failed:', error)
    
    return {
      success: false,
      error: error.message,
      message: 'Manual fix failed. Please check Supabase Dashboard.'
    }
  }
}

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.applyAdminFix = applyAdminFix
  window.checkAdminFixNeeded = checkAdminFixNeeded
  window.manualAdminFix = manualAdminFix
}

export default {
  applyAdminFix,
  checkAdminFixNeeded,
  manualAdminFix
}