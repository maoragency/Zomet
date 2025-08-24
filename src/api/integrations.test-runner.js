/**
 * Simple test runner for integrations
 * Run this in the browser console to test integrations
 */

import {
  UploadFile,
  SendEmail,
  InvokeLLM,
  UploadMultipleFiles,
  DeleteFile,
  GetFileUrl,
  HealthCheck
} from './integrations'

// Test runner function
export async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests...')
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }
  
  // Test 1: Health Check
  try {
    console.log('🔍 Testing HealthCheck...')
    const health = await HealthCheck()
    console.log('✅ HealthCheck passed:', health)
    results.passed++
    results.tests.push({ name: 'HealthCheck', status: 'passed', result: health })
  } catch (error) {
    console.error('❌ HealthCheck failed:', error.message)
    results.failed++
    results.tests.push({ name: 'HealthCheck', status: 'failed', error: error.message })
  }
  
  // Test 2: GetFileUrl validation
  try {
    console.log('🔍 Testing GetFileUrl validation...')
    try {
      GetFileUrl({ path: '' })
      throw new Error('Should have thrown validation error')
    } catch (validationError) {
      if (validationError.message.includes('File path cannot be empty')) {
        console.log('✅ GetFileUrl validation passed')
        results.passed++
        results.tests.push({ name: 'GetFileUrl validation', status: 'passed' })
      } else {
        throw validationError
      }
    }
  } catch (error) {
    console.error('❌ GetFileUrl validation failed:', error.message)
    results.failed++
    results.tests.push({ name: 'GetFileUrl validation', status: 'failed', error: error.message })
  }
  
  // Test 3: SendEmail validation
  try {
    console.log('🔍 Testing SendEmail validation...')
    try {
      await SendEmail({ to: 'invalid-email', subject: 'test', message: 'test' })
      throw new Error('Should have thrown validation error')
    } catch (validationError) {
      if (validationError.message.includes('Invalid recipient email address')) {
        console.log('✅ SendEmail validation passed')
        results.passed++
        results.tests.push({ name: 'SendEmail validation', status: 'passed' })
      } else {
        throw validationError
      }
    }
  } catch (error) {
    console.error('❌ SendEmail validation failed:', error.message)
    results.failed++
    results.tests.push({ name: 'SendEmail validation', status: 'failed', error: error.message })
  }
  
  // Test 4: InvokeLLM validation
  try {
    console.log('🔍 Testing InvokeLLM validation...')
    try {
      await InvokeLLM({ prompt: 'short' })
      throw new Error('Should have thrown validation error')
    } catch (validationError) {
      if (validationError.message.includes('Prompt must be at least')) {
        console.log('✅ InvokeLLM validation passed')
        results.passed++
        results.tests.push({ name: 'InvokeLLM validation', status: 'passed' })
      } else {
        throw validationError
      }
    }
  } catch (error) {
    console.error('❌ InvokeLLM validation failed:', error.message)
    results.failed++
    results.tests.push({ name: 'InvokeLLM validation', status: 'failed', error: error.message })
  }
  
  // Test 5: InvokeLLM fallback functionality
  try {
    console.log('🔍 Testing InvokeLLM fallback...')
    const result = await InvokeLLM({ 
      prompt: 'What is the price of this vehicle?',
      context: { vehicle: { year: 2020, manufacturer: 'Toyota', model: 'Camry' } }
    })
    
    if (result.success && result.response.includes('Toyota Camry')) {
      console.log('✅ InvokeLLM fallback passed')
      results.passed++
      results.tests.push({ name: 'InvokeLLM fallback', status: 'passed', result: result.response.substring(0, 100) + '...' })
    } else {
      throw new Error('Fallback response not as expected')
    }
  } catch (error) {
    console.error('❌ InvokeLLM fallback failed:', error.message)
    results.failed++
    results.tests.push({ name: 'InvokeLLM fallback', status: 'failed', error: error.message })
  }
  
  // Test 6: SendEmail fallback functionality
  try {
    console.log('🔍 Testing SendEmail fallback...')
    const result = await SendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message for integration testing.'
    })
    
    if (result.success && result.provider) {
      console.log('✅ SendEmail fallback passed')
      results.passed++
      results.tests.push({ name: 'SendEmail fallback', status: 'passed', provider: result.provider })
    } else {
      throw new Error('Fallback response not as expected')
    }
  } catch (error) {
    console.error('❌ SendEmail fallback failed:', error.message)
    results.failed++
    results.tests.push({ name: 'SendEmail fallback', status: 'failed', error: error.message })
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`)
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Integrations are working correctly.')
  } else {
    console.log('⚠️ Some tests failed. Check the details above.')
  }
  
  return results
}

// Export for use in browser console
window.runIntegrationTests = runIntegrationTests

export default runIntegrationTests