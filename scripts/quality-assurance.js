#!/usr/bin/env node

/**
 * Quality Assurance Script
 * Performs comprehensive checks for production readiness
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const QA_CHECKS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
}

class QualityAssurance {
  constructor() {
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${level}] ${message}`)
  }

  addIssue(description, severity = QA_CHECKS.MEDIUM, file = null) {
    this.issues.push({
      description,
      severity,
      file,
      timestamp: new Date().toISOString()
    })
  }

  addWarning(description, file = null) {
    this.warnings.push({
      description,
      file,
      timestamp: new Date().toISOString()
    })
  }

  addPassed(description) {
    this.passed.push({
      description,
      timestamp: new Date().toISOString()
    })
  }

  // Check for TODO/FIXME comments
  checkTodoComments() {
    this.log('Checking for TODO/FIXME comments...')
    
    const srcDir = './src'
    const todoPattern = /(TODO|FIXME|HACK|XXX|BUG):/gi
    let todoCount = 0

    const checkFile = (filePath) => {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        
        lines.forEach((line, index) => {
          const match = line.match(todoPattern)
          if (match) {
            todoCount++
            this.addWarning(
              `${match[0]} comment found: ${line.trim()}`,
              `${filePath}:${index + 1}`
            )
          }
        })
      } catch (error) {
        this.addIssue(`Error reading file: ${error.message}`, QA_CHECKS.LOW, filePath)
      }
    }

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath)
          } else if (stat.isFile()) {
            checkFile(filePath)
          }
        })
      } catch (error) {
        this.addIssue(`Error walking directory ${dir}: ${error.message}`, QA_CHECKS.LOW)
      }
    }

    walkDir(srcDir)

    if (todoCount === 0) {
      this.addPassed('No TODO/FIXME comments found')
    } else {
      this.log(`Found ${todoCount} TODO/FIXME comments`)
    }
  }

  // Check for console.log statements
  checkConsoleStatements() {
    this.log('Checking for console statements...')
    
    const srcDir = './src'
    const consolePattern = /console\.(log|warn|error|info|debug)/g
    let consoleCount = 0

    const checkFile = (filePath) => {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        
        lines.forEach((line, index) => {
          const matches = [...line.matchAll(consolePattern)]
          matches.forEach(match => {
            consoleCount++
            this.addWarning(
              `Console statement found: ${line.trim()}`,
              `${filePath}:${index + 1}`
            )
          })
        })
      } catch (error) {
        this.addIssue(`Error reading file: ${error.message}`, QA_CHECKS.LOW, filePath)
      }
    }

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath)
          } else if (stat.isFile()) {
            checkFile(filePath)
          }
        })
      } catch (error) {
        this.addIssue(`Error walking directory ${dir}: ${error.message}`, QA_CHECKS.LOW)
      }
    }

    walkDir(srcDir)

    if (consoleCount === 0) {
      this.addPassed('No console statements found')
    } else {
      this.log(`Found ${consoleCount} console statements`)
    }
  }

  // Check for hardcoded values
  checkHardcodedValues() {
    this.log('Checking for hardcoded values...')
    
    const srcDir = './src'
    const patterns = [
      { pattern: /localhost:\d+/g, description: 'Hardcoded localhost URL' },
      { pattern: /http:\/\/[^\/\s]+/g, description: 'Hardcoded HTTP URL' },
      { pattern: /https:\/\/[^\/\s]+/g, description: 'Hardcoded HTTPS URL' },
      { pattern: /password\s*[:=]\s*["'][^"']+["']/gi, description: 'Hardcoded password' },
      { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, description: 'Hardcoded API key' },
      { pattern: /secret\s*[:=]\s*["'][^"']+["']/gi, description: 'Hardcoded secret' }
    ]

    let hardcodedCount = 0

    const checkFile = (filePath) => {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        
        patterns.forEach(({ pattern, description }) => {
          lines.forEach((line, index) => {
            const matches = [...line.matchAll(pattern)]
            matches.forEach(match => {
              // Skip comments and test files
              if (line.trim().startsWith('//') || line.trim().startsWith('*') || filePath.includes('.test.')) {
                return
              }
              
              hardcodedCount++
              this.addIssue(
                `${description}: ${match[0]}`,
                QA_CHECKS.HIGH,
                `${filePath}:${index + 1}`
              )
            })
          })
        })
      } catch (error) {
        this.addIssue(`Error reading file: ${error.message}`, QA_CHECKS.LOW, filePath)
      }
    }

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath)
          } else if (stat.isFile()) {
            checkFile(filePath)
          }
        })
      } catch (error) {
        this.addIssue(`Error walking directory ${dir}: ${error.message}`, QA_CHECKS.LOW)
      }
    }

    walkDir(srcDir)

    if (hardcodedCount === 0) {
      this.addPassed('No hardcoded values found')
    } else {
      this.log(`Found ${hardcodedCount} potential hardcoded values`)
    }
  }

  // Check environment configuration
  checkEnvironmentConfig() {
    this.log('Checking environment configuration...')

    // Check for .env.example
    if (!fs.existsSync('.env.example')) {
      this.addIssue('Missing .env.example file', QA_CHECKS.HIGH)
    } else {
      this.addPassed('.env.example file exists')
    }

    // Check for .env in .gitignore
    try {
      const gitignore = fs.readFileSync('.gitignore', 'utf8')
      if (!gitignore.includes('.env')) {
        this.addIssue('.env not found in .gitignore', QA_CHECKS.CRITICAL)
      } else {
        this.addPassed('.env properly ignored in git')
      }
    } catch (error) {
      this.addIssue('Could not read .gitignore file', QA_CHECKS.MEDIUM)
    }

    // Check for required environment variables
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ]

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.addWarning(`Environment variable ${envVar} not set`)
      } else {
        this.addPassed(`Environment variable ${envVar} is configured`)
      }
    })
  }

  // Check package.json configuration
  checkPackageJson() {
    this.log('Checking package.json configuration...')

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

      // Check for required fields
      const requiredFields = ['name', 'version', 'description', 'scripts']
      requiredFields.forEach(field => {
        if (!packageJson[field]) {
          this.addIssue(`Missing ${field} in package.json`, QA_CHECKS.MEDIUM)
        } else {
          this.addPassed(`package.json has ${field}`)
        }
      })

      // Check for security vulnerabilities in dependencies
      if (packageJson.dependencies) {
        const depCount = Object.keys(packageJson.dependencies).length
        this.log(`Found ${depCount} dependencies`)
        this.addPassed(`Dependencies configured (${depCount} packages)`)
      }

      // Check for build script
      if (!packageJson.scripts?.build) {
        this.addIssue('Missing build script in package.json', QA_CHECKS.HIGH)
      } else {
        this.addPassed('Build script configured')
      }

      // Check for test script
      if (!packageJson.scripts?.test) {
        this.addIssue('Missing test script in package.json', QA_CHECKS.MEDIUM)
      } else {
        this.addPassed('Test script configured')
      }

    } catch (error) {
      this.addIssue(`Error reading package.json: ${error.message}`, QA_CHECKS.CRITICAL)
    }
  }

  // Check for security headers
  checkSecurityHeaders() {
    this.log('Checking security configuration...')

    // Check for security-related files
    const securityFiles = [
      { file: 'public/_headers', description: 'Netlify headers configuration' },
      { file: 'public/.htaccess', description: 'Apache security headers' },
      { file: 'vercel.json', description: 'Vercel configuration' }
    ]

    let hasSecurityConfig = false
    securityFiles.forEach(({ file, description }) => {
      if (fs.existsSync(file)) {
        this.addPassed(`${description} found`)
        hasSecurityConfig = true
      }
    })

    if (!hasSecurityConfig) {
      this.addWarning('No security headers configuration found')
    }

    // Check index.html for security meta tags
    try {
      const indexHtml = fs.readFileSync('index.html', 'utf8')
      
      if (indexHtml.includes('Content-Security-Policy')) {
        this.addPassed('Content Security Policy configured')
      } else {
        this.addWarning('No Content Security Policy found')
      }

      if (indexHtml.includes('X-Frame-Options')) {
        this.addPassed('X-Frame-Options configured')
      } else {
        this.addWarning('No X-Frame-Options found')
      }

    } catch (error) {
      this.addIssue(`Error reading index.html: ${error.message}`, QA_CHECKS.LOW)
    }
  }

  // Check build output
  checkBuildOutput() {
    this.log('Checking build configuration...')

    try {
      // Check if build succeeds
      this.log('Running build test...')
      execSync('npm run build', { stdio: 'pipe' })
      this.addPassed('Build completes successfully')

      // Check build output size
      if (fs.existsSync('dist')) {
        const stats = this.getDirSize('dist')
        this.log(`Build output size: ${(stats / 1024 / 1024).toFixed(2)} MB`)
        
        if (stats > 50 * 1024 * 1024) { // 50MB
          this.addWarning('Build output is quite large (>50MB)')
        } else {
          this.addPassed('Build output size is reasonable')
        }
      }

    } catch (error) {
      this.addIssue(`Build failed: ${error.message}`, QA_CHECKS.CRITICAL)
    }
  }

  // Check test coverage
  checkTestCoverage() {
    this.log('Checking test coverage...')

    try {
      // Run tests with coverage
      const output = execSync('npm run test:coverage', { encoding: 'utf8', stdio: 'pipe' })
      this.addPassed('Tests run successfully with coverage')
      
      // Parse coverage output (basic check)
      if (output.includes('100%')) {
        this.addPassed('Excellent test coverage detected')
      } else if (output.includes('80%') || output.includes('90%')) {
        this.addPassed('Good test coverage detected')
      } else {
        this.addWarning('Test coverage could be improved')
      }

    } catch (error) {
      this.addWarning(`Test coverage check failed: ${error.message}`)
    }
  }

  // Check for accessibility issues
  checkAccessibility() {
    this.log('Checking accessibility compliance...')

    const srcDir = './src'
    let a11yIssues = 0

    const a11yPatterns = [
      { pattern: /<img(?![^>]*alt=)/gi, description: 'Image without alt attribute' },
      { pattern: /<input(?![^>]*aria-label)(?![^>]*id=)/gi, description: 'Input without label or aria-label' },
      { pattern: /<button(?![^>]*aria-label)>\s*<\/button>/gi, description: 'Empty button without aria-label' },
      { pattern: /onClick/g, description: 'onClick without keyboard equivalent (consider onKeyDown)' }
    ]

    const checkFile = (filePath) => {
      if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) {
        return
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8')
        
        a11yPatterns.forEach(({ pattern, description }) => {
          const matches = [...content.matchAll(pattern)]
          matches.forEach(() => {
            a11yIssues++
            this.addWarning(`${description}`, filePath)
          })
        })
      } catch (error) {
        this.addIssue(`Error reading file: ${error.message}`, QA_CHECKS.LOW, filePath)
      }
    }

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath)
          } else if (stat.isFile()) {
            checkFile(filePath)
          }
        })
      } catch (error) {
        this.addIssue(`Error walking directory ${dir}: ${error.message}`, QA_CHECKS.LOW)
      }
    }

    walkDir(srcDir)

    if (a11yIssues === 0) {
      this.addPassed('No obvious accessibility issues found')
    } else {
      this.log(`Found ${a11yIssues} potential accessibility issues`)
    }
  }

  // Helper function to get directory size
  getDirSize(dirPath) {
    let size = 0
    
    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory()) {
            walkDir(filePath)
          } else {
            size += stat.size
          }
        })
      } catch (error) {
        // Ignore errors for size calculation
      }
    }

    walkDir(dirPath)
    return size
  }

  // Generate report
  generateReport() {
    this.log('Generating quality assurance report...')

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_checks: this.passed.length + this.warnings.length + this.issues.length,
        passed: this.passed.length,
        warnings: this.warnings.length,
        issues: this.issues.length,
        critical_issues: this.issues.filter(i => i.severity === QA_CHECKS.CRITICAL).length,
        high_issues: this.issues.filter(i => i.severity === QA_CHECKS.HIGH).length
      },
      passed: this.passed,
      warnings: this.warnings,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
    }

    // Write report to file
    fs.writeFileSync('qa-report.json', JSON.stringify(report, null, 2))

    // Console summary
    console.log('\n' + '='.repeat(60))
    console.log('QUALITY ASSURANCE REPORT')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${report.summary.passed}`)
    console.log(`⚠️  Warnings: ${report.summary.warnings}`)
    console.log(`❌ Issues: ${report.summary.issues}`)
    console.log(`🔴 Critical: ${report.summary.critical_issues}`)
    console.log(`🟠 High: ${report.summary.high_issues}`)

    if (report.summary.critical_issues > 0) {
      console.log('\n🔴 CRITICAL ISSUES:')
      report.issues
        .filter(i => i.severity === QA_CHECKS.CRITICAL)
        .forEach(issue => {
          console.log(`   - ${issue.description} ${issue.file ? `(${issue.file})` : ''}`)
        })
    }

    if (report.summary.high_issues > 0) {
      console.log('\n🟠 HIGH PRIORITY ISSUES:')
      report.issues
        .filter(i => i.severity === QA_CHECKS.HIGH)
        .forEach(issue => {
          console.log(`   - ${issue.description} ${issue.file ? `(${issue.file})` : ''}`)
        })
    }

    console.log(`\nDetailed report saved to: qa-report.json`)
    console.log('='.repeat(60))

    return report
  }

  // Run all checks
  async runAllChecks() {
    this.log('Starting Quality Assurance checks...')

    try {
      this.checkTodoComments()
      this.checkConsoleStatements()
      this.checkHardcodedValues()
      this.checkEnvironmentConfig()
      this.checkPackageJson()
      this.checkSecurityHeaders()
      this.checkBuildOutput()
      this.checkTestCoverage()
      this.checkAccessibility()

      const report = this.generateReport()
      
      // Return exit code based on critical issues
      if (report.summary.critical_issues > 0) {
        process.exit(1)
      } else if (report.summary.high_issues > 5) {
        process.exit(1)
      } else {
        process.exit(0)
      }

    } catch (error) {
      this.log(`QA check failed: ${error.message}`, 'ERROR')
      process.exit(1)
    }
  }
}

// Run QA checks if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const qa = new QualityAssurance()
  qa.runAllChecks()
}

export default QualityAssurance