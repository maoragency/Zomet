import { supabase } from '@/lib/supabase';

/**
 * Utility function to set up admin users
 * This should be run once to ensure admin users have the correct role
 */
export const setupAdminUser = async (email = 'zometauto@gmail.com') => {
  try {
    console.log(`Setting up admin user: ${email}`);
    
    // Update the user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error('Error updating admin user:', error);
      return { success: false, error };
    }

    if (data && data.length > 0) {
      console.log('Admin user updated successfully:', data[0]);
      return { success: true, user: data[0] };
    } else {
      console.log('No user found with that email');
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error in setupAdminUser:', error);
    return { success: false, error };
  }
};

/**
 * Check if current user is admin
 */
export const checkAdminStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isAdmin: false, error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return { isAdmin: false, error };
    }

    const isAdmin = data.role === 'admin' || data.email === 'zometauto@gmail.com';
    console.log('Admin status check:', { 
      email: data.email, 
      role: data.role, 
      isAdmin 
    });

    return { isAdmin, user: data, error: null };
  } catch (error) {
    console.error('Error in checkAdminStatus:', error);
    return { isAdmin: false, error };
  }
};

// Export for console access
if (typeof window !== 'undefined') {
  window.adminUtils = {
    setupAdminUser,
    checkAdminStatus
  };
}