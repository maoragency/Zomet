import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that required environment variables are present
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure auth settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  // Configure database settings
  db: {
    schema: 'public'
  },
  // Configure global settings
  global: {
    headers: {
      'X-Client-Info': 'zomet-vehicle-marketplace'
    }
  }
})

// Export helper functions for common operations
export const getUser = () => supabase.auth.getUser()
export const getSession = () => supabase.auth.getSession()

// Export database table references for easier access
export const tables = {
  users: 'users',
  vehicles: 'vehicles',
  buyer_requests: 'buyer_requests',
  pricing_plans: 'pricing_plans'
}

// Export storage bucket references
export const buckets = {
  vehicleImages: 'vehicle-images'
}