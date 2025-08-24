// Supabase Connection Test Utility
// This file can be used to test the Supabase connection during development

import { supabase } from './supabase.js'

/**
 * Test basic Supabase connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection by fetching pricing plans
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('id, name')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Sample data:', data)
    return true
    
  } catch (error) {
    console.error('❌ Supabase connection test error:', error.message)
    return false
  }
}

/**
 * Test Supabase authentication
 * @returns {Promise<boolean>} True if auth is properly configured
 */
export async function testAuth() {
  try {
    console.log('Testing Supabase authentication...')
    
    // Get current session (should be null for unauthenticated user)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Auth test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase auth is properly configured!')
    console.log('Current session:', session ? 'Authenticated' : 'Not authenticated')
    return true
    
  } catch (error) {
    console.error('❌ Auth test error:', error.message)
    return false
  }
}

/**
 * Test Supabase storage
 * @returns {Promise<boolean>} True if storage is accessible
 */
export async function testStorage() {
  try {
    console.log('Testing Supabase storage...')
    
    // List files in the vehicle-images bucket (should work even if empty)
    const { data, error } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 })
    
    if (error) {
      console.error('Storage test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase storage is accessible!')
    console.log('Bucket accessible, files count:', data?.length || 0)
    return true
    
  } catch (error) {
    console.error('❌ Storage test error:', error.message)
    return false
  }
}

/**
 * Run all Supabase tests
 * @returns {Promise<boolean>} True if all tests pass
 */
export async function runAllTests() {
  console.log('🧪 Running Supabase infrastructure tests...\n')
  
  const connectionTest = await testConnection()
  const authTest = await testAuth()
  const storageTest = await testStorage()
  
  const allPassed = connectionTest && authTest && storageTest
  
  console.log('\n📊 Test Results:')
  console.log(`Database Connection: ${connectionTest ? '✅' : '❌'}`)
  console.log(`Authentication: ${authTest ? '✅' : '❌'}`)
  console.log(`Storage: ${storageTest ? '✅' : '❌'}`)
  console.log(`Overall: ${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`)
  
  return allPassed
}

// Export individual test functions for use in components or debugging
export { supabase } from './supabase.js'