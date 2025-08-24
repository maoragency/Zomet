/**
 * Database connectivity and table existence checker
 */

import { supabase } from '@/lib/supabase'

/**
 * Check if users table exists and is accessible
 */
export const checkUsersTable = async () => {
  try {
    console.log('Checking users table...')
    
    // Try to select from users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Users table error:', error)
      
      // Check if it's a table not found error
      if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('Users table does not exist, attempting to create...')
        return await createUsersTable()
      }
      
      return { exists: false, error }
    }
    
    console.log('Users table exists and is accessible')
    return { exists: true, error: null }
    
  } catch (error) {
    console.error('Error checking users table:', error)
    return { exists: false, error }
  }
}

/**
 * Create users table if it doesn't exist
 */
export const createUsersTable = async () => {
  try {
    console.log('Attempting to create users table...')
    
    // Note: This will only work if RLS policies allow table creation
    // In most cases, you'll need to create the table manually in Supabase dashboard
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP WITH TIME ZONE,
        login_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      CREATE POLICY "Users can view own profile" ON users
        FOR SELECT USING (auth.uid() = id);
      
      CREATE POLICY "Users can update own profile" ON users
        FOR UPDATE USING (auth.uid() = id);
      
      CREATE POLICY "Users can insert own profile" ON users
        FOR INSERT WITH CHECK (auth.uid() = id);
    `
    
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (error) {
      console.error('Failed to create users table:', error)
      return { created: false, error }
    }
    
    console.log('Users table created successfully')
    return { created: true, error: null }
    
  } catch (error) {
    console.error('Error creating users table:', error)
    return { created: false, error }
  }
}

/**
 * Check database connectivity
 */
export const checkDatabaseConnection = async () => {
  try {
    console.log('Checking database connection...')
    
    // Try a simple query
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return { connected: false, error }
    }
    
    console.log('Database connection successful')
    return { connected: true, error: null }
    
  } catch (error) {
    console.error('Database connection failed:', error)
    return { connected: false, error }
  }
}

/**
 * Initialize database checks
 */
export const initializeDatabaseChecks = async () => {
  console.log('=== DATABASE INITIALIZATION CHECKS ===')
  
  // Check database connection
  const connectionResult = await checkDatabaseConnection()
  if (!connectionResult.connected) {
    console.error('Database connection failed, cannot proceed')
    return { success: false, error: connectionResult.error }
  }
  
  // Check users table
  const usersTableResult = await checkUsersTable()
  if (!usersTableResult.exists) {
    console.warn('Users table is not accessible')
    // Don't fail completely, just warn
  }
  
  console.log('=== DATABASE CHECKS COMPLETE ===')
  return { success: true, usersTableExists: usersTableResult.exists }
}

// Run checks on import in development
if (import.meta.env.DEV) {
  initializeDatabaseChecks()
}

export default {
  checkUsersTable,
  createUsersTable,
  checkDatabaseConnection,
  initializeDatabaseChecks
}