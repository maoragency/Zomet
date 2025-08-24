#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * Security patterns for code analysis
 */
const SECURITY_PATTERNS = {
  xss: [
    {
      pattern: /dangerouslySetInnerHTML\s*:\s*\{\s*__html\s*:\s*[^}]+\}/g,
      severity: 'high',
      description: 'Potential XSS vulnerability with dangerouslySetInnerHTML'
    },
    {
      pattern: /innerHTML\s*=\s*[^;]+/g,
      severity: 'medium',
      description: 'Direct innerHTML assignment may lead to XSS'
    },
    {
      pattern: /document\.write\s*\(/g,
      severity: 'high',
      description: 'document.write usage can lead to XSS vulnerabilities'
    },
    {
      pattern: /eval\s*\(/g,
      severity: 'critical',
      description: 'eval() usage is extremely dangerous and can lead to code injection'
    }
  ],
  csrf: [
    {
      pattern: /fetch\s*\([^)]*method:\s*['"]POST['"](?![^}]*credentials)/g,
      severity: 'medium',
      description: 'POST request without credentials may be vulnerable to CSRF'
    },
    {
      pattern: /axios\.post\([^)]*(?!.*withCredentials)/g,
      severity: 'medium',
      description: 'POST request without credentials configuration'
    }
  ],
  secrets: [
    {
      pattern: /(?:password|pwd|secret|key|token)\s*[:=]\s*['"][a-zA-Z0-9+/]{20,}['"]/gi,
      severity: 'critical',
      description: 'Potential hardcoded secret or password'
    },
    {
      pattern: /(?:api_key|apikey|access_token)\s*[:=]\s*['"][a-zA-Z0-9_-]{30,}['"]/gi,
      severity: 'critical',
      description: 'Potential hardcoded API key or access token'
    },
    {
      pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      severity: 'high',
      description: 'Potential hardcoded JWT token'
    }
  ],
  injection: [
    {
      pattern: /new Function\s*\(/g,
      severity: 'high',
      description: 'Dynamic function creation can lead to code injection'
    },
    {
      pattern: /Function\s*\(\s*['"][^'"]*['"][^)]*\)/g,
      severity: 'high',
      description: 'Dynamic function creation with string code'
    }
  ]
}

/**
 * Files to exclude from security scanning
 */
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
  /\.config\./,
  /\.backup/,
  /\.cleanup-backup/,
  /scripts\/security-audit\.js/,
  /scripts\/project-cleanup\.js/,
  /scripts\/validate-project\.js/,
  /\.kiro/,
  /reports/,
  /docs/
]

class SecurityAuditor {
  constructor() {
    this.results = {
      vulnerabilities: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      codeIssues: {
        xssVulnerabilities: [],
        csrfVulnerabilities: [],
        injectionRisks: [],
        exposedSecrets: []
      },
      supabaseSecurityScore: 0,
      configurationIssues: [],
      overallSecurityScore: 0,
      recommendations: [],
      scannedFiles: 0,
      totalIssues: 0
    }
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  async scanDependencies() {
    console.log('🔍 Scanning dependencies for vulnerabilities...')
    
    try {
      // Read package.json to check for known risky packages
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const packageContent = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageContent)
      
      const riskyPackages = [
        'eval', 'vm2', 'serialize-javascript', 'node-serialize',
        'express-fileupload', 'multer', 'formidable'
      ]
      
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      let foundRiskyPackages = 0
      
      for (const [pkgName, version] of Object.entries(allDeps)) {
        if (riskyPackages.includes(pkgName)) {
          this.results.vulnerabilities.medium.push({
            package: pkgName,
            severity: 'medium',
            description: `Potentially risky package: ${pkgName}`,
            fixAvailable: false
          })
          foundRiskyPackages++
          this.results.totalIssues++
        }
        
        // Check for very old versions (simplified check)
        if (version.startsWith('^0.') || version.startsWith('~0.')) {
          this.results.vulnerabilities.low.push({
            package: pkgName,
            severity: 'low',
            description: `Very old version detected: ${pkgName}@${version}`,
            fixAvailable: true
          })
          this.results.totalIssues++
        }
      }
      
      if (foundRiskyPackages > 0) {
        console.log(`   ⚠️  Found ${foundRiskyPackages} potentially risky packages`)
      } else {
        console.log('   ✅ No obviously risky packages detected')
      }
      
      const totalVulns = Object.values(this.results.vulnerabilities).flat().length
      console.log(`   📊 Dependency analysis complete: ${totalVulns} potential issues`)
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze dependencies: ${error.message}`)
    }
  }

  /**
   * Process npm audit results
   */
  processDependencyVulnerabilities(auditResult) {
    if (auditResult.vulnerabilities) {
      for (const [packageName, vulnInfo] of Object.entries(auditResult.vulnerabilities)) {
        const vulnerability = {
          package: packageName,
          severity: vulnInfo.severity,
          description: vulnInfo.via?.[0]?.title || 'Unknown vulnerability',
          fixAvailable: vulnInfo.fixAvailable || false,
          patchVersion: vulnInfo.fixAvailable?.version
        }
        
        this.results.vulnerabilities[vulnInfo.severity].push(vulnerability)
        this.results.totalIssues++
        
        console.log(`   ⚠️  ${vulnInfo.severity.toUpperCase()}: ${packageName} - ${vulnerability.description}`)
      }
    }
    
    const totalVulns = Object.values(this.results.vulnerabilities).flat().length
    console.log(`   📊 Found ${totalVulns} dependency vulnerabilities`)
  }

  /**
   * Analyze code for security issues
   */
  async analyzeCodeSecurity() {
    console.log('\n🔍 Analyzing code for security vulnerabilities...')
    
    const files = await this.getJavaScriptFiles()
    
    for (const file of files) {
      await this.scanFileForSecurityIssues(file)
    }
    
    const totalCodeIssues = Object.values(this.results.codeIssues).flat().length
    console.log(`   📊 Scanned ${this.results.scannedFiles} files, found ${totalCodeIssues} potential security issues`)
  }

  /**
   * Get all JavaScript/TypeScript files for scanning
   */
  async getJavaScriptFiles() {
    const files = []
    
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true })
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name)
          const relativePath = path.relative(projectRoot, fullPath)
          
          // Skip excluded patterns
          if (EXCLUDED_PATTERNS.some(pattern => pattern.test(relativePath))) {
            continue
          }
          
          if (item.isDirectory()) {
            await scanDirectory(fullPath)
          } else if (/\.(js|jsx|ts|tsx)$/.test(item.name)) {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDirectory(projectRoot)
    return files
  }

  /**
   * Scan individual file for security issues
   */
  async scanFileForSecurityIssues(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const relativePath = path.relative(projectRoot, filePath)
      
      this.results.scannedFiles++
      
      // Check for XSS vulnerabilities
      for (const xssPattern of SECURITY_PATTERNS.xss) {
        const matches = content.match(xssPattern.pattern)
        if (matches) {
          matches.forEach(match => {
            this.results.codeIssues.xssVulnerabilities.push({
              file: relativePath,
              line: this.getLineNumber(content, match),
              code: match.trim(),
              severity: xssPattern.severity,
              description: xssPattern.description
            })
            this.results.totalIssues++
          })
        }
      }
      
      // Check for CSRF vulnerabilities
      for (const csrfPattern of SECURITY_PATTERNS.csrf) {
        const matches = content.match(csrfPattern.pattern)
        if (matches) {
          matches.forEach(match => {
            this.results.codeIssues.csrfVulnerabilities.push({
              file: relativePath,
              line: this.getLineNumber(content, match),
              code: match.trim(),
              severity: csrfPattern.severity,
              description: csrfPattern.description
            })
            this.results.totalIssues++
          })
        }
      }
      
      // Check for exposed secrets
      for (const secretPattern of SECURITY_PATTERNS.secrets) {
        const matches = content.match(secretPattern.pattern)
        if (matches) {
          matches.forEach(match => {
            this.results.codeIssues.exposedSecrets.push({
              file: relativePath,
              line: this.getLineNumber(content, match),
              code: '***REDACTED***', // Don't log actual secrets
              severity: secretPattern.severity,
              description: secretPattern.description
            })
            this.results.totalIssues++
          })
        }
      }
      
      // Check for injection risks
      for (const injectionPattern of SECURITY_PATTERNS.injection) {
        const matches = content.match(injectionPattern.pattern)
        if (matches) {
          matches.forEach(match => {
            this.results.codeIssues.injectionRisks.push({
              file: relativePath,
              line: this.getLineNumber(content, match),
              code: match.trim(),
              severity: injectionPattern.severity,
              description: injectionPattern.description
            })
            this.results.totalIssues++
          })
        }
      }
      
    } catch (error) {
      console.warn(`   ⚠️  Could not scan ${filePath}: ${error.message}`)
    }
  }

  /**
   * Get line number for a match in content
   */
  getLineNumber(content, match) {
    const index = content.indexOf(match)
    if (index === -1) return 1
    
    return content.substring(0, index).split('\n').length
  }

  /**
   * Check Supabase security configuration
   */
  async checkSupabaseSecurity() {
    console.log('\n🔍 Checking Supabase security configuration...')
    
    let score = 100
    const issues = []
    
    try {
      // Check if .env file exists and is properly configured
      const envPath = path.join(projectRoot, '.env')
      try {
        const envContent = await fs.readFile(envPath, 'utf8')
        
        // Check for Supabase configuration
        if (!envContent.includes('VITE_SUPABASE_URL')) {
          issues.push({
            severity: 'medium',
            description: 'VITE_SUPABASE_URL not found in .env file'
          })
          score -= 10
        }
        
        if (!envContent.includes('VITE_SUPABASE_ANON_KEY')) {
          issues.push({
            severity: 'medium',
            description: 'VITE_SUPABASE_ANON_KEY not found in .env file'
          })
          score -= 10
        }
        
        // Check for exposed secrets in .env
        const secretPatterns = [
          /service_role.*=.*[a-zA-Z0-9]{50,}/i,
          /secret.*=.*[a-zA-Z0-9]{50,}/i
        ]
        
        for (const pattern of secretPatterns) {
          if (pattern.test(envContent)) {
            issues.push({
              severity: 'high',
              description: 'Potential service role key or secret found in .env file'
            })
            score -= 20
          }
        }
        
      } catch (error) {
        issues.push({
          severity: 'medium',
          description: '.env file not found - Supabase configuration may be missing'
        })
        score -= 15
      }
      
      // Check Supabase client configuration
      const supabaseFiles = await this.findSupabaseConfigFiles()
      for (const file of supabaseFiles) {
        await this.analyzeSupabaseConfig(file, issues)
      }
      
    } catch (error) {
      console.warn(`   ⚠️  Error checking Supabase security: ${error.message}`)
      score -= 20
    }
    
    this.results.supabaseSecurityScore = Math.max(0, score)
    this.results.configurationIssues = issues
    
    console.log(`   📊 Supabase Security Score: ${this.results.supabaseSecurityScore}/100`)
    if (issues.length > 0) {
      console.log(`   ⚠️  Found ${issues.length} configuration issues`)
    } else {
      console.log('   ✅ No major Supabase security issues found')
    }
  }

  /**
   * Find Supabase configuration files
   */
  async findSupabaseConfigFiles() {
    const files = []
    const searchPaths = [
      'src/lib/supabase.js',
      'src/lib/supabase.ts',
      'src/config/supabase.js',
      'src/config/supabase.ts'
    ]
    
    for (const searchPath of searchPaths) {
      const fullPath = path.join(projectRoot, searchPath)
      try {
        await fs.access(fullPath)
        files.push(fullPath)
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    return files
  }

  /**
   * Analyze Supabase configuration file
   */
  async analyzeSupabaseConfig(filePath, issues) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const relativePath = path.relative(projectRoot, filePath)
      
      // Check for hardcoded URLs or keys
      const hardcodedPatterns = [
        /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g,
        /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g // JWT pattern
      ]
      
      for (const pattern of hardcodedPatterns) {
        if (pattern.test(content)) {
          issues.push({
            severity: 'high',
            description: `Potential hardcoded Supabase credentials in ${relativePath}`
          })
        }
      }
      
      // Check for proper environment variable usage
      if (!content.includes('import.meta.env') && !content.includes('process.env')) {
        issues.push({
          severity: 'medium',
          description: `${relativePath} may not be using environment variables properly`
        })
      }
      
    } catch (error) {
      console.warn(`   ⚠️  Could not analyze ${filePath}: ${error.message}`)
    }
  }

  /**
   * Validate configuration files
   */
  async validateConfigurations() {
    console.log('\n🔍 Validating configuration files...')
    
    const configFiles = [
      '.env.example',
      'vite.config.js',
      'package.json'
    ]
    
    for (const configFile of configFiles) {
      await this.validateConfigFile(configFile)
    }
    
    console.log(`   📊 Validated ${configFiles.length} configuration files`)
  }

  /**
   * Validate individual configuration file
   */
  async validateConfigFile(fileName) {
    const filePath = path.join(projectRoot, fileName)
    
    try {
      const content = await fs.readFile(filePath, 'utf8')
      
      switch (fileName) {
        case '.env.example':
          this.validateEnvExample(content)
          break
        case 'vite.config.js':
          this.validateViteConfig(content)
          break
        case 'package.json':
          this.validatePackageJson(content)
          break
      }
      
    } catch (error) {
      this.results.configurationIssues.push({
        severity: 'medium',
        description: `Configuration file ${fileName} not found or unreadable`
      })
    }
  }

  /**
   * Validate .env.example file
   */
  validateEnvExample(content) {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ]
    
    for (const varName of requiredVars) {
      if (!content.includes(varName)) {
        this.results.configurationIssues.push({
          severity: 'low',
          description: `Missing ${varName} in .env.example`
        })
      }
    }
    
    // Check for example values that look like real secrets
    const secretPatterns = [
      /=.*[a-zA-Z0-9]{40,}/g
    ]
    
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        this.results.configurationIssues.push({
          severity: 'medium',
          description: 'Potential real secrets in .env.example file'
        })
      }
    }
  }

  /**
   * Validate Vite configuration
   */
  validateViteConfig(content) {
    // Check for security-related configurations
    if (!content.includes('define')) {
      this.results.configurationIssues.push({
        severity: 'low',
        description: 'Vite config missing define section for environment variables'
      })
    }
    
    // Check for development-only configurations in production
    if (content.includes('sourcemap: true') && !content.includes('NODE_ENV')) {
      this.results.configurationIssues.push({
        severity: 'low',
        description: 'Source maps may be enabled in production'
      })
    }
  }

  /**
   * Validate package.json
   */
  validatePackageJson(content) {
    try {
      const packageJson = JSON.parse(content)
      
      // Check for security-related scripts
      if (!packageJson.scripts?.audit) {
        this.results.configurationIssues.push({
          severity: 'low',
          description: 'No audit script found in package.json'
        })
      }
      
      // Check for outdated or risky dependencies
      const riskyPackages = ['eval', 'vm2', 'serialize-javascript']
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      for (const pkg of riskyPackages) {
        if (allDeps[pkg]) {
          this.results.configurationIssues.push({
            severity: 'medium',
            description: `Potentially risky package detected: ${pkg}`
          })
        }
      }
      
    } catch (error) {
      this.results.configurationIssues.push({
        severity: 'medium',
        description: 'Invalid JSON in package.json'
      })
    }
  }

  /**
   * Calculate overall security score
   */
  calculateOverallSecurityScore() {
    let score = 100
    
    // Deduct points for vulnerabilities
    score -= this.results.vulnerabilities.critical.length * 20
    score -= this.results.vulnerabilities.high.length * 10
    score -= this.results.vulnerabilities.medium.length * 5
    score -= this.results.vulnerabilities.low.length * 2
    
    // Deduct points for code issues
    const codeIssues = Object.values(this.results.codeIssues).flat()
    score -= codeIssues.filter(issue => issue.severity === 'critical').length * 15
    score -= codeIssues.filter(issue => issue.severity === 'high').length * 8
    score -= codeIssues.filter(issue => issue.severity === 'medium').length * 4
    
    // Factor in Supabase security score
    score = (score + this.results.supabaseSecurityScore) / 2
    
    // Deduct points for configuration issues
    score -= this.results.configurationIssues.filter(issue => issue.severity === 'high').length * 5
    score -= this.results.configurationIssues.filter(issue => issue.severity === 'medium').length * 3
    score -= this.results.configurationIssues.filter(issue => issue.severity === 'low').length * 1
    
    this.results.overallSecurityScore = Math.max(0, Math.round(score))
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = []
    
    // Dependency recommendations
    if (this.results.vulnerabilities.critical.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'dependencies',
        title: 'Fix Critical Dependency Vulnerabilities',
        description: 'Update or replace packages with critical security vulnerabilities immediately',
        action: 'Run npm audit fix or update packages manually'
      })
    }
    
    // Code security recommendations
    const exposedSecrets = this.results.codeIssues.exposedSecrets
    if (exposedSecrets.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'code',
        title: 'Remove Exposed Secrets',
        description: 'Hardcoded secrets found in code - move to environment variables',
        action: 'Replace hardcoded secrets with environment variables'
      })
    }
    
    const xssIssues = this.results.codeIssues.xssVulnerabilities
    if (xssIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'code',
        title: 'Fix XSS Vulnerabilities',
        description: 'Potential XSS vulnerabilities detected in code',
        action: 'Sanitize user input and avoid dangerous HTML operations'
      })
    }
    
    // Supabase recommendations
    if (this.results.supabaseSecurityScore < 80) {
      recommendations.push({
        priority: 'high',
        category: 'supabase',
        title: 'Improve Supabase Security Configuration',
        description: 'Supabase security configuration needs improvement',
        action: 'Review RLS policies, environment variables, and access controls'
      })
    }
    
    // General recommendations
    recommendations.push({
      priority: 'medium',
      category: 'general',
      title: 'Implement Content Security Policy',
      description: 'Add CSP headers to prevent XSS and other injection attacks',
      action: 'Configure CSP in your web server or meta tags'
    })
    
    recommendations.push({
      priority: 'low',
      category: 'monitoring',
      title: 'Set Up Security Monitoring',
      description: 'Implement logging and monitoring for security events',
      action: 'Add error tracking and security event logging'
    })
    
    this.results.recommendations = recommendations
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport() {
    console.log('\n📋 COMPREHENSIVE SECURITY AUDIT REPORT')
    console.log('=' .repeat(60))
    
    // Overall score
    console.log(`\n🎯 Overall Security Score: ${this.results.overallSecurityScore}/100`)
    
    if (this.results.overallSecurityScore >= 90) {
      console.log('   ✅ EXCELLENT - Your application has strong security')
    } else if (this.results.overallSecurityScore >= 70) {
      console.log('   ⚠️  GOOD - Some security improvements recommended')
    } else if (this.results.overallSecurityScore >= 50) {
      console.log('   ⚠️  FAIR - Several security issues need attention')
    } else {
      console.log('   ❌ POOR - Critical security issues require immediate attention')
    }
    
    // Vulnerability summary
    const totalVulns = Object.values(this.results.vulnerabilities).flat().length
    console.log(`\n🔍 Dependency Vulnerabilities: ${totalVulns}`)
    if (totalVulns > 0) {
      console.log(`   Critical: ${this.results.vulnerabilities.critical.length}`)
      console.log(`   High: ${this.results.vulnerabilities.high.length}`)
      console.log(`   Medium: ${this.results.vulnerabilities.medium.length}`)
      console.log(`   Low: ${this.results.vulnerabilities.low.length}`)
    }
    
    // Code issues summary
    const totalCodeIssues = Object.values(this.results.codeIssues).flat().length
    console.log(`\n💻 Code Security Issues: ${totalCodeIssues}`)
    if (totalCodeIssues > 0) {
      console.log(`   XSS Vulnerabilities: ${this.results.codeIssues.xssVulnerabilities.length}`)
      console.log(`   CSRF Vulnerabilities: ${this.results.codeIssues.csrfVulnerabilities.length}`)
      console.log(`   Injection Risks: ${this.results.codeIssues.injectionRisks.length}`)
      console.log(`   Exposed Secrets: ${this.results.codeIssues.exposedSecrets.length}`)
    }
    
    // Supabase security
    console.log(`\n🗄️  Supabase Security Score: ${this.results.supabaseSecurityScore}/100`)
    
    // Configuration issues
    console.log(`\n⚙️  Configuration Issues: ${this.results.configurationIssues.length}`)
    
    // Top recommendations
    console.log(`\n🎯 Top Security Recommendations:`)
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'critical')
    const highRecs = this.results.recommendations.filter(r => r.priority === 'high')
    
    const topRecs = [...criticalRecs, ...highRecs].slice(0, 5)
    topRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`)
      console.log(`      ${rec.description}`)
    })
    
    console.log(`\n📊 Scan Summary:`)
    console.log(`   Files Scanned: ${this.results.scannedFiles}`)
    console.log(`   Total Issues Found: ${this.results.totalIssues}`)
    console.log(`   Recommendations Generated: ${this.results.recommendations.length}`)
    
    return this.results
  }

  /**
   * Save detailed report to file
   */
  async saveDetailedReport() {
    const reportPath = path.join(projectRoot, 'security-audit-report.json')
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2))
      console.log(`\n💾 Detailed report saved to: security-audit-report.json`)
    } catch (error) {
      console.error(`❌ Could not save report: ${error.message}`)
    }
  }

  /**
   * Run complete security audit
   */
  async runCompleteAudit() {
    console.log('🚀 Starting comprehensive security audit...\n')
    
    await this.scanDependencies()
    await this.analyzeCodeSecurity()
    await this.checkSupabaseSecurity()
    await this.validateConfigurations()
    
    this.calculateOverallSecurityScore()
    this.generateRecommendations()
    
    const report = this.generateSecurityReport()
    await this.saveDetailedReport()
    
    console.log('\n✅ Security audit completed!')
    
    return report
  }
}

// Export for use in other modules
export { SecurityAuditor }

// Run audit if called directly
if (process.argv[1] && process.argv[1].endsWith('security-audit.js')) {
  const auditor = new SecurityAuditor()
  
  try {
    const report = await auditor.runCompleteAudit()
    
    // Exit with appropriate code based on security score
    if (report.overallSecurityScore >= 70) {
      process.exit(0)
    } else {
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Security audit failed:', error.message)
    process.exit(1)
  }
}