// Configuration Validator for Supabase Setup
// This utility validates that all required environment variables and configurations are properly set

/**
 * Validate environment variables
 * @returns {Object} Validation results with details
 */
export function validateEnvironment() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    config: {}
  }
  
  // Required environment variables
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ]
  
  // Optional environment variables
  const optionalVars = [
    'VITE_APP_ENV',
    'VITE_APP_NAME',
    'VITE_APP_VERSION',
    'VITE_DEBUG',
    'VITE_LOG_LEVEL'
  ]
  
  // Check required variables
  requiredVars.forEach(varName => {
    const value = import.meta.env[varName]
    
    if (!value) {
      results.valid = false
      results.errors.push(`Missing required environment variable: ${varName}`)
    } else if (value.includes('your-') || value.includes('_here')) {
      results.valid = false
      results.errors.push(`${varName} contains placeholder value. Please update with actual credentials.`)
    } else {
      results.config[varName] = value
    }
  })
  
  // Check optional variables
  optionalVars.forEach(varName => {
    const value = import.meta.env[varName]
    if (value) {
      results.config[varName] = value
    } else {
      results.warnings.push(`Optional environment variable not set: ${varName}`)
    }
  })
  
  // Validate Supabase URL format
  if (results.config.VITE_SUPABASE_URL) {
    const url = results.config.VITE_SUPABASE_URL
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      results.valid = false
      results.errors.push('VITE_SUPABASE_URL does not appear to be a valid Supabase URL')
    }
  }
  
  // Validate Supabase key format (basic check)
  if (results.config.VITE_SUPABASE_ANON_KEY) {
    const key = results.config.VITE_SUPABASE_ANON_KEY
    if (key.length < 100) {
      results.warnings.push('VITE_SUPABASE_ANON_KEY appears to be shorter than expected')
    }
  }
  
  return results
}

/**
 * Print validation results to console
 * @param {Object} results - Results from validateEnvironment()
 */
export function printValidationResults(results) {
  console.log('🔧 Environment Configuration Validation\n')
  
  if (results.valid) {
    console.log('✅ All required environment variables are properly configured!')
  } else {
    console.log('❌ Configuration issues found:')
    results.errors.forEach(error => console.log(`  • ${error}`))
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    results.warnings.forEach(warning => console.log(`  • ${warning}`))
  }
  
  console.log('\n📋 Current Configuration:')
  Object.entries(results.config).forEach(([key, value]) => {
    // Mask sensitive values
    const displayValue = key.includes('KEY') ? 
      `${value.substring(0, 10)}...${value.substring(value.length - 10)}` : 
      value
    console.log(`  ${key}: ${displayValue}`)
  })
  
  if (!results.valid) {
    console.log('\n💡 To fix configuration issues:')
    console.log('  1. Copy .env.example to .env')
    console.log('  2. Update .env with your actual Supabase credentials')
    console.log('  3. Get credentials from https://supabase.com/dashboard')
    console.log('  4. Restart the development server')
  }
  
  return results.valid
}

/**
 * Get setup instructions based on current configuration state
 * @returns {Array} Array of setup steps needed
 */
export function getSetupInstructions() {
  const validation = validateEnvironment()
  const instructions = []
  
  if (!validation.valid) {
    instructions.push({
      step: 1,
      title: 'Fix Environment Configuration',
      description: 'Update your .env file with actual Supabase credentials',
      action: 'Edit .env file and replace placeholder values'
    })
  }
  
  instructions.push({
    step: instructions.length + 1,
    title: 'Create Supabase Project',
    description: 'Create a new project at https://supabase.com/dashboard',
    action: 'Follow the setup guide in supabase/SETUP.md'
  })
  
  instructions.push({
    step: instructions.length + 1,
    title: 'Apply Database Schema',
    description: 'Run the schema.sql file in your Supabase SQL editor',
    action: 'Copy and execute supabase/schema.sql'
  })
  
  instructions.push({
    step: instructions.length + 1,
    title: 'Seed Database (Optional)',
    description: 'Add sample data for testing',
    action: 'Copy and execute supabase/seed.sql'
  })
  
  instructions.push({
    step: instructions.length + 1,
    title: 'Test Connection',
    description: 'Verify everything is working correctly',
    action: 'Run the Supabase connection tests'
  })
  
  return instructions
}

/**
 * Print setup instructions
 */
export function printSetupInstructions() {
  const instructions = getSetupInstructions()
  
  console.log('📋 Supabase Setup Instructions:\n')
  
  instructions.forEach(instruction => {
    console.log(`${instruction.step}. ${instruction.title}`)
    console.log(`   ${instruction.description}`)
    console.log(`   Action: ${instruction.action}\n`)
  })
  
  console.log('📖 For detailed instructions, see: supabase/SETUP.md')
}