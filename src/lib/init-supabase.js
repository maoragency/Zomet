// Supabase Initialization and Setup Verification
// This module handles the initialization and verification of Supabase configuration

import { validateEnvironment, printValidationResults } from './config-validator.js'
import { runAllTests } from './supabase-test.js'

/**
 * Initialize and verify Supabase setup
 * @param {boolean} verbose - Whether to print detailed logs
 * @returns {Promise<boolean>} True if initialization is successful
 */
export async function initializeSupabase(verbose = true) {
  if (verbose) {
    console.log('🚀 Initializing Supabase for Zomet Vehicle Marketplace...\n')
  }
  
  // Step 1: Validate environment configuration
  const validation = validateEnvironment()
  
  if (verbose) {
    printValidationResults(validation)
  }
  
  if (!validation.valid) {
    if (verbose) {
      console.log('\n❌ Cannot proceed with invalid configuration.')
      console.log('Please fix the configuration issues and try again.')
    }
    return false
  }
  
  // Step 2: Test Supabase connection and services
  if (verbose) {
    console.log('\n🔗 Testing Supabase services...\n')
  }
  
  const testsPass = await runAllTests()
  
  if (!testsPass) {
    if (verbose) {
      console.log('\n❌ Supabase tests failed.')
      console.log('Please check your Supabase project setup and try again.')
      console.log('See supabase/SETUP.md for detailed instructions.')
    }
    return false
  }
  
  if (verbose) {
    console.log('\n🎉 Supabase initialization completed successfully!')
    console.log('Your Zomet Vehicle Marketplace is ready to use Supabase.')
  }
  
  return true
}

/**
 * Quick health check for Supabase services
 * @returns {Promise<Object>} Health check results
 */
export async function healthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: validateEnvironment(),
    services: {
      database: false,
      auth: false,
      storage: false
    },
    overall: false
  }
  
  try {
    // Import test functions
    const { testConnection, testAuth, testStorage } = await import('./supabase-test.js')
    
    // Run service tests
    results.services.database = await testConnection()
    results.services.auth = await testAuth()
    results.services.storage = await testStorage()
    
    // Overall health
    results.overall = results.environment.valid && 
                     results.services.database && 
                     results.services.auth && 
                     results.services.storage
    
  } catch (error) {
    console.error('Health check error:', error.message)
  }
  
  return results
}

/**
 * Get current Supabase configuration status
 * @returns {Object} Configuration status
 */
export function getConfigurationStatus() {
  const validation = validateEnvironment()
  
  return {
    configured: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    environment: import.meta.env.VITE_APP_ENV || 'development',
    supabaseUrl: validation.config.VITE_SUPABASE_URL || 'Not configured',
    hasApiKey: !!validation.config.VITE_SUPABASE_ANON_KEY
  }
}

// Auto-initialize in development mode if environment is properly configured
if (import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
  const validation = validateEnvironment()
  if (validation.valid) {
    initializeSupabase(false).then(success => {
      if (success) {
        console.log('🟢 Supabase auto-initialization successful')
      } else {
        console.log('🔴 Supabase auto-initialization failed')
      }
    })
  }
}