#!/usr/bin/env node

/**
 * Optimized Production Build Script
 * Includes performance optimizations and analysis
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('🚀 Starting optimized production build...')

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...')
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true })
  }
  
  // Set production environment
  process.env.NODE_ENV = 'production'
  process.env.ANALYZE = 'true'
  
  // Run build with analysis
  console.log('📦 Building with bundle analysis...')
  execSync('npm run build', { stdio: 'inherit' })
  
  // Run performance analysis
  console.log('📊 Running performance analysis...')
  execSync('node scripts/performance-summary.js', { stdio: 'inherit' })
  
  console.log('✅ Optimized build completed!')
  console.log('📊 Check dist/stats.html for bundle analysis')
  console.log('📋 Check performance-analysis-report.json for performance metrics')
  
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}
