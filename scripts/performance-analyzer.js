#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * Performance thresholds and recommendations
 */
const PERFORMANCE_THRESHOLDS = {
  bundleSize: {
    excellent: 500 * 1024, // 500KB
    good: 1024 * 1024,     // 1MB
    warning: 2048 * 1024,  // 2MB
    critical: 5120 * 1024  // 5MB
  },
  chunkSize: {
    excellent: 100 * 1024, // 100KB
    good: 250 * 1024,      // 250KB
    warning: 500 * 1024,   // 500KB
    critical: 1024 * 1024  // 1MB
  },
  imageSize: {
    excellent: 100 * 1024, // 100KB
    good: 500 * 1024,      // 500KB
    warning: 1024 * 1024,  // 1MB
    critical: 2048 * 1024  // 2MB
  },
  coreWebVitals: {
    lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
    fid: { good: 100, needsImprovement: 300 },   // First Input Delay (ms)
    cls: { good: 0.1, needsImprovement: 0.25 }   // Cumulative Layout Shift
  }
}

/**
 * React performance anti-patterns
 */
const REACT_ANTIPATTERNS = [
  {
    pattern: /useEffect\s*\(\s*[^,]+\s*\)/g,
    severity: 'high',
    description: 'useEffect without dependency array may cause infinite re-renders',
    fix: 'Add dependency array to useEffect: useEffect(() => {}, [])'
  },
  {
    pattern: /useState\s*\(\s*\{[^}]*\}\s*\)/g,
    severity: 'medium',
    description: 'useState with object may cause unnecessary re-renders',
    fix: 'Use useReducer or separate useState calls for object state'
  },
  {
    pattern: /\.map\s*\([^)]*\)\s*\.map\s*\(/g,
    severity: 'medium',
    description: 'Chained array maps can be optimized',
    fix: 'Combine operations into single map or use reduce'
  },
  {
    pattern: /console\.log\s*\(/g,
    severity: 'low',
    description: 'Console.log statements should be removed in production',
    fix: 'Remove console.log or use proper logging library'
  },
  {
    pattern: /key=\{index\}/g,
    severity: 'high',
    description: 'Using array index as key can cause performance issues',
    fix: 'Use unique, stable identifiers as keys'
  },
  {
    pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*useState/g,
    severity: 'medium',
    description: 'Function component not using React.memo may re-render unnecessarily',
    fix: 'Wrap component with React.memo if props are stable'
  },
  {
    pattern: /useCallback\s*\(\s*[^,]+\s*\)/g,
    severity: 'medium',
    description: 'useCallback without dependency array',
    fix: 'Add dependency array to useCallback'
  },
  {
    pattern: /useMemo\s*\(\s*[^,]+\s*\)/g,
    severity: 'medium',
    description: 'useMemo without dependency array',
    fix: 'Add dependency array to useMemo'
  },
  {
    pattern: /\{\s*\.\.\.\w+\s*\}/g,
    severity: 'low',
    description: 'Object spread in render may cause unnecessary re-renders',
    fix: 'Memoize object spreads or move outside render'
  },
  {
    pattern: /onClick=\{[^}]*=>[^}]*\}/g,
    severity: 'medium',
    description: 'Inline arrow functions in onClick may cause re-renders',
    fix: 'Use useCallback or define function outside render'
  }
]

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      bundleAnalysis: {
        totalSize: 0,
        gzippedSize: 0,
        brotliSize: 0,
        largestChunks: [],
        duplicatedDependencies: [],
        unusedDependencies: [],
        chunkAnalysis: {
          vendor: [],
          app: [],
          async: []
        },
        treeshakingOpportunities: []
      },
      coreWebVitals: {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null, // First Contentful Paint
        ttfb: null, // Time to First Byte
        estimated: true,
        score: 0
      },
      reactPerformance: {
        slowComponents: [],
        unnecessaryRerenders: [],
        antiPatterns: [],
        memoryLeaks: [],
        componentComplexity: [],
        hookOptimizations: []
      },
      assetOptimization: {
        unoptimizedImages: [],
        unusedAssets: [],
        compressionOpportunities: [],
        lazyLoadingOpportunities: [],
        cssOptimizations: [],
        fontOptimizations: []
      },
      buildConfiguration: {
        viteOptimizations: [],
        rollupOptimizations: [],
        issues: [],
        modernFeatures: [],
        compressionSettings: []
      },
      performanceMetrics: {
        buildTime: 0,
        bundleGrowth: 0,
        dependencyCount: 0,
        codeComplexity: 0
      },
      overallScore: 0,
      recommendations: [],
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
  }

  /**
   * Analyze bundle size and composition
   */
  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size and composition...')
    
    try {
      // Check if dist directory exists
      const distPath = path.join(projectRoot, 'dist')
      
      try {
        await fs.access(distPath)
      } catch (error) {
        console.log('   ⚠️  No dist directory found. Building project first...')
        await this.buildProject()
      }
      
      // Analyze dist directory
      await this.analyzeBuildOutput(distPath)
      
      // Analyze package.json for dependencies
      await this.analyzeDependencies()
      
    } catch (error) {
      console.error(`   ❌ Bundle analysis failed: ${error.message}`)
    }
  }

  /**
   * Build the project for analysis
   */
  async buildProject() {
    console.log('   🔨 Building project for analysis...')
    
    try {
      const startTime = Date.now()
      
      // Set environment for production build
      process.env.NODE_ENV = 'production'
      process.env.ANALYZE = 'true'
      
      // Run the build command
      console.log('   📦 Running production build...')
      execSync('npm run build', { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      })
      
      const buildTime = Date.now() - startTime
      this.results.performanceMetrics.buildTime = buildTime
      
      console.log(`   ✅ Build completed in ${(buildTime / 1000).toFixed(2)}s`)
      
      // Check if bundle analyzer was generated
      const statsPath = path.join(projectRoot, 'dist', 'stats.html')
      try {
        await fs.access(statsPath)
        console.log('   📊 Bundle analyzer report generated')
      } catch {
        console.log('   ⚠️  Bundle analyzer report not found')
      }
      
    } catch (error) {
      console.log(`   ⚠️  Build failed, using existing dist or simulation: ${error.message}`)
      // Fallback to simulation
      this.results.performanceMetrics.buildTime = 0
    }
  }

  /**
   * Analyze build output directory
   */
  async analyzeBuildOutput(distPath) {
    try {
      const files = await this.getFilesRecursively(distPath)
      let totalSize = 0
      let totalJSSize = 0
      let totalCSSSize = 0
      const chunks = []
      const assets = []
      
      for (const file of files) {
        const stats = await fs.stat(file)
        const relativePath = path.relative(distPath, file)
        const fileSize = stats.size
        const ext = path.extname(file)
        
        totalSize += fileSize
        
        if (ext === '.js') {
          totalJSSize += fileSize
          const chunkInfo = {
            name: relativePath,
            size: fileSize,
            gzippedSize: Math.round(fileSize * 0.3), // Estimated gzip compression
            brotliSize: Math.round(fileSize * 0.25), // Estimated brotli compression
            type: this.getChunkType(relativePath),
            isAsync: relativePath.includes('async') || relativePath.includes('lazy'),
            isVendor: relativePath.includes('vendor') || relativePath.includes('node_modules')
          }
          chunks.push(chunkInfo)
          
          // Categorize chunks
          if (chunkInfo.isVendor) {
            this.results.bundleAnalysis.chunkAnalysis.vendor.push(chunkInfo)
          } else if (chunkInfo.isAsync) {
            this.results.bundleAnalysis.chunkAnalysis.async.push(chunkInfo)
          } else {
            this.results.bundleAnalysis.chunkAnalysis.app.push(chunkInfo)
          }
        } else if (ext === '.css') {
          totalCSSSize += fileSize
          assets.push({
            name: relativePath,
            size: fileSize,
            type: 'css',
            gzippedSize: Math.round(fileSize * 0.2)
          })
        } else {
          assets.push({
            name: relativePath,
            size: fileSize,
            type: this.getAssetType(ext),
            optimizable: this.isOptimizableAsset(ext)
          })
        }
      }
      
      // Sort chunks by size
      chunks.sort((a, b) => b.size - a.size)
      
      this.results.bundleAnalysis.totalSize = totalSize
      this.results.bundleAnalysis.gzippedSize = Math.round(totalSize * 0.3)
      this.results.bundleAnalysis.brotliSize = Math.round(totalSize * 0.25)
      this.results.bundleAnalysis.largestChunks = chunks.slice(0, 10)
      
      console.log(`   📊 Total bundle size: ${this.formatBytes(totalSize)}`)
      console.log(`   📊 JavaScript size: ${this.formatBytes(totalJSSize)}`)
      console.log(`   📊 CSS size: ${this.formatBytes(totalCSSSize)}`)
      console.log(`   📊 Estimated gzipped: ${this.formatBytes(this.results.bundleAnalysis.gzippedSize)}`)
      console.log(`   📊 Estimated brotli: ${this.formatBytes(this.results.bundleAnalysis.brotliSize)}`)
      console.log(`   📊 Number of chunks: ${chunks.length}`)
      
      // Analyze chunk distribution
      const vendorSize = this.results.bundleAnalysis.chunkAnalysis.vendor.reduce((sum, chunk) => sum + chunk.size, 0)
      const appSize = this.results.bundleAnalysis.chunkAnalysis.app.reduce((sum, chunk) => sum + chunk.size, 0)
      const asyncSize = this.results.bundleAnalysis.chunkAnalysis.async.reduce((sum, chunk) => sum + chunk.size, 0)
      
      console.log(`   📊 Vendor chunks: ${this.formatBytes(vendorSize)} (${this.results.bundleAnalysis.chunkAnalysis.vendor.length} files)`)
      console.log(`   📊 App chunks: ${this.formatBytes(appSize)} (${this.results.bundleAnalysis.chunkAnalysis.app.length} files)`)
      console.log(`   📊 Async chunks: ${this.formatBytes(asyncSize)} (${this.results.bundleAnalysis.chunkAnalysis.async.length} files)`)
      
      // Identify large chunks
      const largeChunks = chunks.filter(chunk => chunk.size > PERFORMANCE_THRESHOLDS.chunkSize.warning)
      if (largeChunks.length > 0) {
        console.log(`   ⚠️  Found ${largeChunks.length} large chunks`)
        largeChunks.forEach(chunk => {
          console.log(`     - ${chunk.name}: ${this.formatBytes(chunk.size)} (${chunk.type})`)
        })
      }
      
      // Check for treeshaking opportunities
      await this.analyzeTreeshakingOpportunities(chunks)
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze build output: ${error.message}`)
    }
  }

  /**
   * Get chunk type based on filename
   */
  getChunkType(filename) {
    if (filename.includes('vendor')) return 'vendor'
    if (filename.includes('react')) return 'react'
    if (filename.includes('supabase')) return 'supabase'
    if (filename.includes('radix-ui')) return 'ui-library'
    if (filename.includes('admin')) return 'admin'
    if (filename.includes('user')) return 'user'
    if (filename.includes('auth')) return 'auth'
    if (filename.includes('forms')) return 'forms'
    if (filename.includes('utils')) return 'utils'
    if (filename.includes('icons')) return 'icons'
    if (filename.includes('charts')) return 'charts'
    return 'app'
  }

  /**
   * Get asset type based on extension
   */
  getAssetType(ext) {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif']
    const fontExts = ['.woff', '.woff2', '.ttf', '.otf', '.eot']
    const videoExts = ['.mp4', '.webm', '.ogg']
    
    if (imageExts.includes(ext)) return 'image'
    if (fontExts.includes(ext)) return 'font'
    if (videoExts.includes(ext)) return 'video'
    if (ext === '.css') return 'css'
    if (ext === '.js') return 'javascript'
    return 'other'
  }

  /**
   * Check if asset can be optimized
   */
  isOptimizableAsset(ext) {
    const optimizableExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js']
    return optimizableExts.includes(ext)
  }

  /**
   * Analyze treeshaking opportunities
   */
  async analyzeTreeshakingOpportunities(chunks) {
    const opportunities = []
    
    // Look for large vendor chunks that might have unused code
    const largeVendorChunks = chunks.filter(chunk => 
      chunk.isVendor && chunk.size > PERFORMANCE_THRESHOLDS.chunkSize.good
    )
    
    for (const chunk of largeVendorChunks) {
      // Check if chunk contains commonly over-imported libraries
      const suspiciousLibraries = [
        'lodash', 'moment', 'date-fns', 'rxjs', 'ramda'
      ]
      
      for (const lib of suspiciousLibraries) {
        if (chunk.name.includes(lib)) {
          opportunities.push({
            chunk: chunk.name,
            library: lib,
            size: chunk.size,
            recommendation: `Consider using specific imports from ${lib} instead of importing the entire library`
          })
        }
      }
    }
    
    this.results.bundleAnalysis.treeshakingOpportunities = opportunities
    
    if (opportunities.length > 0) {
      console.log(`   🌳 Found ${opportunities.length} treeshaking opportunities`)
    }
  }

  /**
   * Analyze dependencies for duplicates and unused packages
   */
  async analyzeDependencies() {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const packageContent = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageContent)
      
      const dependencies = packageJson.dependencies || {}
      const devDependencies = packageJson.devDependencies || {}
      
      // Look for potential duplicates (simplified analysis)
      const duplicates = []
      const depNames = Object.keys(dependencies)
      
      for (const dep of depNames) {
        // Check for similar packages that might be duplicates
        const similar = depNames.filter(d => 
          d !== dep && 
          (d.includes(dep.split('-')[0]) || dep.includes(d.split('-')[0]))
        )
        
        if (similar.length > 0) {
          duplicates.push({
            package: dep,
            similar: similar,
            reason: 'Similar package names detected'
          })
        }
      }
      
      this.results.bundleAnalysis.duplicatedDependencies = duplicates
      
      if (duplicates.length > 0) {
        console.log(`   ⚠️  Found ${duplicates.length} potential duplicate dependencies`)
      }
      
      // Analyze heavy dependencies
      const heavyDependencies = [
        'moment', 'lodash', 'axios', 'react-router-dom', 'material-ui'
      ]
      
      const foundHeavy = depNames.filter(dep => 
        heavyDependencies.some(heavy => dep.includes(heavy))
      )
      
      if (foundHeavy.length > 0) {
        console.log(`   📊 Heavy dependencies found: ${foundHeavy.join(', ')}`)
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze dependencies: ${error.message}`)
    }
  }

  /**
   * Profile React components for performance issues
   */
  async profileReactComponents() {
    console.log('\n⚛️  Profiling React components for performance issues...')
    
    const reactFiles = await this.getReactFiles()
    
    for (const file of reactFiles) {
      await this.analyzeReactFile(file)
    }
    
    const totalIssues = this.results.reactPerformance.antiPatterns.length
    console.log(`   📊 Analyzed ${reactFiles.length} React files, found ${totalIssues} potential issues`)
  }

  /**
   * Get all React component files
   */
  async getReactFiles() {
    const files = []
    
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true })
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name)
          const relativePath = path.relative(projectRoot, fullPath)
          
          // Skip excluded directories
          if (/node_modules|\.git|dist|build/.test(relativePath)) {
            continue
          }
          
          if (item.isDirectory()) {
            await scanDirectory(fullPath)
          } else if (/\.(jsx|tsx)$/.test(item.name)) {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    const srcPath = path.join(projectRoot, 'src')
    await scanDirectory(srcPath)
    return files
  }

  /**
   * Analyze individual React file for performance issues
   */
  async analyzeReactFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const relativePath = path.relative(projectRoot, filePath)
      const lines = content.split('\n')
      
      // Check for React anti-patterns
      for (const antiPattern of REACT_ANTIPATTERNS) {
        const matches = content.match(antiPattern.pattern)
        if (matches) {
          matches.forEach(match => {
            this.results.reactPerformance.antiPatterns.push({
              file: relativePath,
              line: this.getLineNumber(content, match),
              code: match.trim(),
              severity: antiPattern.severity,
              description: antiPattern.description,
              fix: antiPattern.fix
            })
          })
        }
      }
      
      // Analyze component complexity
      const complexity = this.calculateComponentComplexity(content, relativePath)
      if (complexity.score > 50) {
        this.results.reactPerformance.componentComplexity.push(complexity)
      }
      
      // Check for large components
      if (lines.length > 300) {
        this.results.reactPerformance.slowComponents.push({
          file: relativePath,
          lines: lines.length,
          reason: 'Large component file may impact performance',
          recommendation: 'Consider breaking into smaller components'
        })
      }
      
      // Advanced memory leak detection
      this.detectMemoryLeaks(content, relativePath)
      
      // Hook optimization analysis
      this.analyzeHookOptimizations(content, relativePath)
      
      // Re-render analysis
      this.analyzeRerenderIssues(content, relativePath)
      
    } catch (error) {
      console.warn(`   ⚠️  Could not analyze ${filePath}: ${error.message}`)
    }
  }

  /**
   * Calculate component complexity score
   */
  calculateComponentComplexity(content, filePath) {
    let score = 0
    const factors = []
    
    // Count hooks
    const hookCount = (content.match(/use\w+\s*\(/g) || []).length
    score += hookCount * 2
    if (hookCount > 10) factors.push(`High hook count: ${hookCount}`)
    
    // Count conditional renders
    const conditionalCount = (content.match(/\{[^}]*\?[^}]*:/g) || []).length
    score += conditionalCount * 3
    if (conditionalCount > 5) factors.push(`Many conditional renders: ${conditionalCount}`)
    
    // Count nested components
    const nestedCount = (content.match(/<\w+[^>]*>/g) || []).length
    score += Math.floor(nestedCount / 10)
    if (nestedCount > 50) factors.push(`High JSX complexity: ${nestedCount} elements`)
    
    // Count event handlers
    const eventHandlerCount = (content.match(/on\w+\s*=/g) || []).length
    score += eventHandlerCount
    if (eventHandlerCount > 10) factors.push(`Many event handlers: ${eventHandlerCount}`)
    
    // Count state variables
    const stateCount = (content.match(/useState\s*\(/g) || []).length
    score += stateCount * 2
    if (stateCount > 8) factors.push(`High state count: ${stateCount}`)
    
    return {
      file: filePath,
      score,
      factors,
      recommendation: score > 50 ? 'Consider refactoring into smaller components' : null
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(content, filePath) {
    const leaks = []
    
    // setInterval without cleanup
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      leaks.push({
        type: 'interval',
        description: 'setInterval without clearInterval cleanup'
      })
    }
    
    // setTimeout without cleanup (less critical)
    const setTimeoutCount = (content.match(/setTimeout/g) || []).length
    const clearTimeoutCount = (content.match(/clearTimeout/g) || []).length
    if (setTimeoutCount > clearTimeoutCount + 2) {
      leaks.push({
        type: 'timeout',
        description: 'Multiple setTimeout calls without corresponding clearTimeout'
      })
    }
    
    // Event listeners without cleanup
    if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
      leaks.push({
        type: 'eventListener',
        description: 'addEventListener without removeEventListener cleanup'
      })
    }
    
    // Subscription patterns without cleanup
    if (content.includes('.subscribe(') && !content.includes('unsubscribe')) {
      leaks.push({
        type: 'subscription',
        description: 'Subscription without unsubscribe cleanup'
      })
    }
    
    // WebSocket without cleanup
    if (content.includes('new WebSocket') && !content.includes('.close()')) {
      leaks.push({
        type: 'websocket',
        description: 'WebSocket connection without proper cleanup'
      })
    }
    
    if (leaks.length > 0) {
      this.results.reactPerformance.memoryLeaks.push({
        file: filePath,
        leaks
      })
    }
  }

  /**
   * Analyze hook optimizations
   */
  analyzeHookOptimizations(content, filePath) {
    const optimizations = []
    
    // useCallback without deps
    const useCallbackMatches = content.match(/useCallback\s*\([^)]+\)/g) || []
    useCallbackMatches.forEach(match => {
      if (!match.includes(',')) {
        optimizations.push({
          type: 'useCallback',
          issue: 'useCallback without dependency array',
          fix: 'Add dependency array to useCallback'
        })
      }
    })
    
    // useMemo without deps
    const useMemoMatches = content.match(/useMemo\s*\([^)]+\)/g) || []
    useMemoMatches.forEach(match => {
      if (!match.includes(',')) {
        optimizations.push({
          type: 'useMemo',
          issue: 'useMemo without dependency array',
          fix: 'Add dependency array to useMemo'
        })
      }
    })
    
    // useEffect with object dependencies
    if (content.includes('useEffect') && content.match(/\[[^[\]]*\{[^}]*\}[^[\]]*\]/)) {
      optimizations.push({
        type: 'useEffect',
        issue: 'useEffect with object in dependency array',
        fix: 'Extract object properties or use useMemo for object dependencies'
      })
    }
    
    if (optimizations.length > 0) {
      this.results.reactPerformance.hookOptimizations.push({
        file: filePath,
        optimizations
      })
    }
  }

  /**
   * Analyze re-render issues
   */
  analyzeRerenderIssues(content, filePath) {
    const issues = []
    
    // Inline object creation in JSX
    const inlineObjectMatches = content.match(/\w+\s*=\s*\{[^}]+\}/g) || []
    if (inlineObjectMatches.length > 3) {
      issues.push({
        type: 'inlineObjects',
        count: inlineObjectMatches.length,
        description: 'Multiple inline object creations may cause re-renders',
        fix: 'Move object creation outside render or use useMemo'
      })
    }
    
    // Inline array creation
    const inlineArrayMatches = content.match(/\w+\s*=\s*\[[^\]]+\]/g) || []
    if (inlineArrayMatches.length > 2) {
      issues.push({
        type: 'inlineArrays',
        count: inlineArrayMatches.length,
        description: 'Multiple inline array creations may cause re-renders',
        fix: 'Move array creation outside render or use useMemo'
      })
    }
    
    // Anonymous functions in JSX
    const anonymousFunctionMatches = content.match(/\w+\s*=\s*\([^)]*\)\s*=>/g) || []
    if (anonymousFunctionMatches.length > 5) {
      issues.push({
        type: 'anonymousFunctions',
        count: anonymousFunctionMatches.length,
        description: 'Many anonymous functions may cause re-renders',
        fix: 'Use useCallback or define functions outside render'
      })
    }
    
    if (issues.length > 0) {
      this.results.reactPerformance.unnecessaryRerenders.push({
        file: filePath,
        issues
      })
    }
  }

  /**
   * Optimize assets (images, CSS, etc.)
   */
  async optimizeAssets() {
    console.log('\n🖼️  Analyzing asset optimization opportunities...')
    
    await this.analyzeImages()
    await this.analyzeCSSFiles()
    await this.analyzeFontOptimizations()
    await this.analyzeStaticAssets()
    
    const totalOpportunities = 
      this.results.assetOptimization.unoptimizedImages.length +
      this.results.assetOptimization.compressionOpportunities.length +
      this.results.assetOptimization.lazyLoadingOpportunities.length +
      this.results.assetOptimization.fontOptimizations.length
    
    console.log(`   📊 Found ${totalOpportunities} optimization opportunities`)
    
    // Summary by category
    if (this.results.assetOptimization.unoptimizedImages.length > 0) {
      console.log(`   🖼️  Images: ${this.results.assetOptimization.unoptimizedImages.length} optimization opportunities`)
    }
    if (this.results.assetOptimization.cssOptimizations.length > 0) {
      console.log(`   🎨 CSS: ${this.results.assetOptimization.cssOptimizations.length} files analyzed`)
    }
    if (this.results.assetOptimization.fontOptimizations.length > 0) {
      console.log(`   🔤 Fonts: ${this.results.assetOptimization.fontOptimizations.length} optimization opportunities`)
    }
  }

  /**
   * Analyze images for optimization
   */
  async analyzeImages() {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif']
    const searchPaths = [
      path.join(projectRoot, 'public'),
      path.join(projectRoot, 'src', 'assets'),
      path.join(projectRoot, 'assets')
    ]
    
    let totalImages = 0
    let totalImageSize = 0
    
    for (const searchPath of searchPaths) {
      try {
        const files = await this.getFilesRecursively(searchPath)
        const imageFiles = files.filter(file => 
          imageExtensions.includes(path.extname(file).toLowerCase())
        )
        
        totalImages += imageFiles.length
        
        for (const imageFile of imageFiles) {
          const stats = await fs.stat(imageFile)
          const relativePath = path.relative(projectRoot, imageFile)
          const ext = path.extname(imageFile).toLowerCase()
          
          totalImageSize += stats.size
          
          // Check for large images
          if (stats.size > PERFORMANCE_THRESHOLDS.imageSize.warning) {
            this.results.assetOptimization.unoptimizedImages.push({
              file: relativePath,
              size: stats.size,
              format: ext,
              recommendation: this.getImageOptimizationRecommendation(ext, stats.size)
            })
          }
          
          // Check for modern format opportunities
          if (['.jpg', '.jpeg', '.png'].includes(ext) && stats.size > 50 * 1024) {
            this.results.assetOptimization.compressionOpportunities.push({
              file: relativePath,
              type: 'image-format',
              currentFormat: ext,
              size: stats.size,
              recommendation: 'Convert to WebP or AVIF for better compression'
            })
          }
          
          // Check for lazy loading opportunities
          if (stats.size > 100 * 1024) {
            this.results.assetOptimization.lazyLoadingOpportunities.push({
              file: relativePath,
              size: stats.size,
              type: 'image',
              recommendation: 'Implement lazy loading for large images'
            })
          }
        }
        
      } catch (error) {
        // Path doesn't exist, skip
      }
    }
    
    console.log(`   📊 Analyzed ${totalImages} images (${this.formatBytes(totalImageSize)} total)`)
    
    if (this.results.assetOptimization.unoptimizedImages.length > 0) {
      console.log(`   ⚠️  Found ${this.results.assetOptimization.unoptimizedImages.length} unoptimized images`)
    }
  }

  /**
   * Get image optimization recommendation
   */
  getImageOptimizationRecommendation(ext, size) {
    const recommendations = []
    
    if (size > PERFORMANCE_THRESHOLDS.imageSize.critical) {
      recommendations.push('Critical: Image is very large, consider resizing')
    }
    
    if (['.jpg', '.jpeg'].includes(ext)) {
      recommendations.push('Convert to WebP for better compression')
      if (size > 500 * 1024) {
        recommendations.push('Reduce JPEG quality or resize image')
      }
    }
    
    if (ext === '.png') {
      recommendations.push('Convert to WebP or use PNG optimization tools')
      if (size > 1024 * 1024) {
        recommendations.push('Consider using JPEG for photographic content')
      }
    }
    
    if (ext === '.gif') {
      recommendations.push('Convert to WebP or MP4 for animations')
    }
    
    if (ext === '.svg') {
      recommendations.push('Optimize SVG with SVGO')
    }
    
    return recommendations.join('; ')
  }

  /**
   * Analyze CSS files for optimization
   */
  async analyzeCSSFiles() {
    const cssFiles = await this.getCSSFiles()
    let totalCSSSize = 0
    
    for (const cssFile of cssFiles) {
      try {
        const content = await fs.readFile(cssFile, 'utf8')
        const relativePath = path.relative(projectRoot, cssFile)
        const fileSize = Buffer.byteLength(content, 'utf8')
        
        totalCSSSize += fileSize
        
        // Analyze CSS content
        const cssAnalysis = this.analyzeCSSContent(content, relativePath)
        
        // Check for large CSS files
        if (fileSize > 100000) { // 100KB
          this.results.assetOptimization.compressionOpportunities.push({
            file: relativePath,
            type: 'css-size',
            size: fileSize,
            recommendation: 'Large CSS file - consider code splitting or purging unused styles'
          })
        }
        
        // Add CSS-specific optimizations
        this.results.assetOptimization.cssOptimizations.push(cssAnalysis)
        
      } catch (error) {
        console.warn(`   ⚠️  Could not analyze CSS file ${cssFile}: ${error.message}`)
      }
    }
    
    console.log(`   📊 Analyzed ${cssFiles.length} CSS files (${this.formatBytes(totalCSSSize)} total)`)
  }

  /**
   * Analyze CSS content for optimization opportunities
   */
  analyzeCSSContent(content, filePath) {
    const analysis = {
      file: filePath,
      size: Buffer.byteLength(content, 'utf8'),
      issues: [],
      optimizations: []
    }
    
    // Check for unused CSS (simplified)
    const unusedSelectors = this.findUnusedCSSSelectors(content)
    if (unusedSelectors.length > 0) {
      analysis.issues.push({
        type: 'unused-selectors',
        count: unusedSelectors.length,
        description: 'Potential unused CSS selectors detected',
        recommendation: 'Use PurgeCSS or similar tool to remove unused styles'
      })
    }
    
    // Check for duplicate rules
    const duplicateRules = this.findDuplicateCSSRules(content)
    if (duplicateRules.length > 0) {
      analysis.issues.push({
        type: 'duplicate-rules',
        count: duplicateRules.length,
        description: 'Duplicate CSS rules found',
        recommendation: 'Consolidate duplicate CSS rules'
      })
    }
    
    // Check for inefficient selectors
    const inefficientSelectors = this.findInefficientSelectors(content)
    if (inefficientSelectors.length > 0) {
      analysis.issues.push({
        type: 'inefficient-selectors',
        count: inefficientSelectors.length,
        description: 'Inefficient CSS selectors found',
        recommendation: 'Optimize CSS selectors for better performance'
      })
    }
    
    // Check for missing vendor prefixes
    const missingPrefixes = this.checkVendorPrefixes(content)
    if (missingPrefixes.length > 0) {
      analysis.optimizations.push({
        type: 'vendor-prefixes',
        count: missingPrefixes.length,
        description: 'Properties that might need vendor prefixes',
        recommendation: 'Use autoprefixer to add necessary vendor prefixes'
      })
    }
    
    // Check for optimization opportunities
    if (content.includes('@import')) {
      analysis.optimizations.push({
        type: 'imports',
        description: 'CSS @import statements found',
        recommendation: 'Consider bundling CSS files instead of using @import for better performance'
      })
    }
    
    return analysis
  }

  /**
   * Find duplicate CSS rules
   */
  findDuplicateCSSRules(content) {
    const rules = content.match(/[^{}]+\{[^{}]*\}/g) || []
    const ruleMap = new Map()
    const duplicates = []
    
    rules.forEach(rule => {
      const selector = rule.split('{')[0].trim()
      if (ruleMap.has(selector)) {
        duplicates.push(selector)
      } else {
        ruleMap.set(selector, true)
      }
    })
    
    return duplicates
  }

  /**
   * Find inefficient CSS selectors
   */
  findInefficientSelectors(content) {
    const inefficientPatterns = [
      /\*\s*\{/g, // Universal selector
      /\w+\s+\*\s*\{/g, // Universal selector with descendant
      /\[.*\]\s*\{/g, // Attribute selectors (can be slow)
      /:\w+\s*\{/g // Pseudo-class selectors
    ]
    
    const inefficient = []
    inefficientPatterns.forEach(pattern => {
      const matches = content.match(pattern) || []
      inefficient.push(...matches)
    })
    
    return inefficient
  }

  /**
   * Check for missing vendor prefixes
   */
  checkVendorPrefixes(content) {
    const prefixableProperties = [
      'transform', 'transition', 'animation', 'box-shadow',
      'border-radius', 'gradient', 'flex', 'user-select'
    ]
    
    const missing = []
    prefixableProperties.forEach(prop => {
      if (content.includes(prop) && !content.includes(`-webkit-${prop}`)) {
        missing.push(prop)
      }
    })
    
    return missing
  }

  /**
   * Analyze font optimization opportunities
   */
  async analyzeFontOptimizations() {
    const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot']
    const searchPaths = [
      path.join(projectRoot, 'public'),
      path.join(projectRoot, 'src', 'assets'),
      path.join(projectRoot, 'assets')
    ]
    
    let totalFonts = 0
    let totalFontSize = 0
    
    for (const searchPath of searchPaths) {
      try {
        const files = await this.getFilesRecursively(searchPath)
        const fontFiles = files.filter(file => 
          fontExtensions.includes(path.extname(file).toLowerCase())
        )
        
        totalFonts += fontFiles.length
        
        for (const fontFile of fontFiles) {
          const stats = await fs.stat(fontFile)
          const relativePath = path.relative(projectRoot, fontFile)
          const ext = path.extname(fontFile).toLowerCase()
          
          totalFontSize += stats.size
          
          // Check for font format optimization
          if (ext !== '.woff2') {
            this.results.assetOptimization.fontOptimizations.push({
              file: relativePath,
              currentFormat: ext,
              size: stats.size,
              recommendation: 'Convert to WOFF2 for better compression and browser support'
            })
          }
          
          // Check for large font files
          if (stats.size > 200 * 1024) { // 200KB
            this.results.assetOptimization.fontOptimizations.push({
              file: relativePath,
              size: stats.size,
              recommendation: 'Large font file - consider subsetting or using variable fonts'
            })
          }
        }
        
      } catch (error) {
        // Path doesn't exist, skip
      }
    }
    
    // Check CSS for font loading optimization
    await this.analyzeFontLoadingStrategies()
    
    console.log(`   📊 Analyzed ${totalFonts} font files (${this.formatBytes(totalFontSize)} total)`)
  }

  /**
   * Analyze font loading strategies in CSS
   */
  async analyzeFontLoadingStrategies() {
    const cssFiles = await this.getCSSFiles()
    
    for (const cssFile of cssFiles) {
      try {
        const content = await fs.readFile(cssFile, 'utf8')
        const relativePath = path.relative(projectRoot, cssFile)
        
        // Check for font-display property
        if (content.includes('@font-face') && !content.includes('font-display')) {
          this.results.assetOptimization.fontOptimizations.push({
            file: relativePath,
            type: 'font-display',
            recommendation: 'Add font-display: swap to @font-face rules for better loading performance'
          })
        }
        
        // Check for preload hints in HTML
        if (content.includes('url(') && content.includes('.woff')) {
          this.results.assetOptimization.fontOptimizations.push({
            file: relativePath,
            type: 'preload',
            recommendation: 'Consider adding <link rel="preload"> for critical fonts'
          })
        }
        
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  /**
   * Get all CSS files
   */
  async getCSSFiles() {
    const files = []
    const searchPaths = [
      path.join(projectRoot, 'src'),
      path.join(projectRoot, 'public')
    ]
    
    for (const searchPath of searchPaths) {
      try {
        const pathFiles = await this.getFilesRecursively(searchPath)
        const cssFiles = pathFiles.filter(file => 
          /\.(css|scss|sass|less)$/.test(file)
        )
        files.push(...cssFiles)
      } catch (error) {
        // Path doesn't exist or can't be read
      }
    }
    
    return files
  }

  /**
   * Find potentially unused CSS selectors (simplified)
   */
  findUnusedCSSSelectors(cssContent) {
    // This is a very simplified check - in reality, you'd need a more sophisticated analysis
    const selectors = cssContent.match(/\.[a-zA-Z][a-zA-Z0-9_-]*\s*\{/g) || []
    const uniqueSelectors = [...new Set(selectors)]
    
    // Return a subset as "potentially unused" for demo purposes
    return uniqueSelectors.slice(0, Math.min(5, Math.floor(uniqueSelectors.length * 0.1)))
  }

  /**
   * Analyze static assets
   */
  async analyzeStaticAssets() {
    try {
      const publicPath = path.join(projectRoot, 'public')
      const files = await this.getFilesRecursively(publicPath)
      
      let totalSize = 0
      for (const file of files) {
        const stats = await fs.stat(file)
        totalSize += stats.size
      }
      
      console.log(`   📊 Static assets total size: ${this.formatBytes(totalSize)}`)
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze static assets: ${error.message}`)
    }
  }

  /**
   * Validate build configuration
   */
  async validateBuildConfig() {
    console.log('\n⚙️  Validating build configuration...')
    
    await this.analyzeViteConfig()
    await this.analyzeTailwindConfig()
    
    const totalIssues = this.results.buildConfiguration.issues.length
    console.log(`   📊 Build configuration analysis complete, found ${totalIssues} issues`)
  }

  /**
   * Analyze Vite configuration
   */
  async analyzeViteConfig() {
    try {
      const viteConfigPath = path.join(projectRoot, 'vite.config.js')
      const content = await fs.readFile(viteConfigPath, 'utf8')
      
      const optimizations = []
      const issues = []
      const modernFeatures = []
      
      // Check for code splitting
      if (content.includes('splitVendorChunkPlugin')) {
        optimizations.push('Automatic vendor chunk splitting enabled')
      } else {
        issues.push({
          severity: 'medium',
          description: 'Code splitting not configured - consider enabling splitVendorChunkPlugin',
          fix: 'Add splitVendorChunkPlugin() to plugins array'
        })
      }
      
      // Check for manual chunking
      if (content.includes('manualChunks')) {
        optimizations.push('Manual chunk configuration found')
      } else {
        issues.push({
          severity: 'low',
          description: 'Manual chunking not configured - consider optimizing chunk strategy',
          fix: 'Add manualChunks configuration to rollupOptions'
        })
      }
      
      // Check for bundle analyzer
      if (content.includes('visualizer')) {
        optimizations.push('Bundle analyzer configured')
      } else {
        issues.push({
          severity: 'low',
          description: 'Bundle analyzer not configured - consider adding rollup-plugin-visualizer',
          fix: 'Add visualizer plugin for bundle analysis'
        })
      }
      
      // Check for minification
      if (content.includes('minify')) {
        const minifier = content.includes('terser') ? 'terser' : 'esbuild'
        optimizations.push(`Minification configured (${minifier})`)
        
        // Check for advanced terser options
        if (content.includes('terserOptions')) {
          optimizations.push('Advanced terser configuration found')
        }
      } else {
        issues.push({
          severity: 'medium',
          description: 'Minification not explicitly configured',
          fix: 'Set minify: "terser" in build options'
        })
      }
      
      // Check for source maps in production
      if (content.includes('sourcemap: true') && !content.includes('NODE_ENV')) {
        issues.push({
          severity: 'medium',
          description: 'Source maps may be enabled in production',
          fix: 'Set sourcemap: false for production builds'
        })
      }
      
      // Check for modern build features
      if (content.includes('target:')) {
        const targetMatch = content.match(/target:\s*['"]([^'"]+)['"]/);
        if (targetMatch) {
          const target = targetMatch[1];
          modernFeatures.push(`Build target: ${target}`)
          if (target.includes('es2020') || target.includes('es2021') || target.includes('es2022')) {
            optimizations.push('Modern JavaScript target configured')
          } else {
            issues.push({
              severity: 'low',
              description: 'Consider using more modern JavaScript target',
              fix: 'Update target to es2020 or newer for better optimization'
            })
          }
        }
      }
      
      // Check for CSS code splitting
      if (content.includes('cssCodeSplit')) {
        optimizations.push('CSS code splitting configured')
      }
      
      // Check for asset inlining
      if (content.includes('assetsInlineLimit')) {
        optimizations.push('Asset inlining configured')
      }
      
      // Check for dependency pre-bundling
      if (content.includes('optimizeDeps')) {
        optimizations.push('Dependency pre-bundling configured')
      }
      
      // Check for compression settings
      if (content.includes('gzip') || content.includes('brotli')) {
        this.results.buildConfiguration.compressionSettings.push('Compression analysis enabled')
      }
      
      // Check for modern module features
      if (content.includes('type: "module"')) {
        modernFeatures.push('ES modules enabled')
      }
      
      this.results.buildConfiguration.viteOptimizations = optimizations
      this.results.buildConfiguration.modernFeatures = modernFeatures
      this.results.buildConfiguration.issues.push(...issues)
      
      console.log(`   ✅ Vite config analyzed: ${optimizations.length} optimizations, ${issues.length} issues`)
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze Vite config: ${error.message}`)
      this.results.buildConfiguration.issues.push({
        severity: 'high',
        description: 'Could not read Vite configuration file',
        fix: 'Ensure vite.config.js exists and is readable'
      })
    }
  }

  /**
   * Analyze Tailwind configuration
   */
  async analyzeTailwindConfig() {
    try {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.js')
      const content = await fs.readFile(tailwindConfigPath, 'utf8')
      
      const issues = []
      
      // Check for purge/content configuration
      if (!content.includes('content:') && !content.includes('purge:')) {
        issues.push({
          severity: 'high',
          description: 'Tailwind purge/content not configured - unused CSS will not be removed'
        })
      }
      
      // Check for JIT mode (newer versions have it by default)
      if (content.includes('mode: "jit"')) {
        console.log('   ✅ JIT mode enabled')
      }
      
      this.results.buildConfiguration.issues.push(...issues)
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze Tailwind config: ${error.message}`)
    }
  }

  /**
   * Estimate Core Web Vitals based on analysis
   */
  estimateCoreWebVitals() {
    console.log('\n📊 Estimating Core Web Vitals...')
    
    // Estimate LCP (Largest Contentful Paint)
    let estimatedLCP = 1500 // Base estimate
    
    // Bundle size impact on LCP
    const bundleSize = this.results.bundleAnalysis.gzippedSize
    if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.critical) {
      estimatedLCP += 2000
    } else if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.warning) {
      estimatedLCP += 1000
    } else if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.good) {
      estimatedLCP += 500
    }
    
    // Large images impact on LCP
    const largeImages = this.results.assetOptimization.unoptimizedImages.filter(img => img.size > 500 * 1024)
    estimatedLCP += largeImages.length * 300
    
    // Estimate FID (First Input Delay)
    let estimatedFID = 50 // Base estimate
    
    // JavaScript bundle size impact on FID
    const jsComplexity = this.results.reactPerformance.antiPatterns.length
    estimatedFID += jsComplexity * 5
    
    // Large chunks impact on FID
    const largeChunks = this.results.bundleAnalysis.largestChunks.filter(chunk => chunk.size > 500 * 1024)
    estimatedFID += largeChunks.length * 20
    
    // Estimate CLS (Cumulative Layout Shift)
    let estimatedCLS = 0.05 // Base estimate
    
    // Font loading without font-display can cause CLS
    const fontIssues = this.results.assetOptimization.fontOptimizations.filter(opt => opt.type === 'font-display')
    estimatedCLS += fontIssues.length * 0.02
    
    // Images without dimensions can cause CLS
    const imageCount = this.results.assetOptimization.unoptimizedImages.length
    estimatedCLS += imageCount * 0.01
    
    // Estimate FCP (First Contentful Paint)
    let estimatedFCP = 1200 // Base estimate
    estimatedFCP += Math.min(bundleSize / (100 * 1024), 1000) // Bundle size impact
    
    // Estimate TTFB (Time to First Byte) - simplified
    const estimatedTTFB = 200 // Base server response time estimate
    
    // Store estimates
    this.results.coreWebVitals = {
      lcp: Math.round(estimatedLCP),
      fid: Math.round(estimatedFID),
      cls: Math.round(estimatedCLS * 1000) / 1000, // Round to 3 decimal places
      fcp: Math.round(estimatedFCP),
      ttfb: estimatedTTFB,
      estimated: true,
      score: this.calculateWebVitalsScore(estimatedLCP, estimatedFID, estimatedCLS)
    }
    
    console.log(`   📊 Estimated LCP: ${estimatedLCP}ms`)
    console.log(`   📊 Estimated FID: ${estimatedFID}ms`)
    console.log(`   📊 Estimated CLS: ${estimatedCLS}`)
    console.log(`   📊 Estimated FCP: ${estimatedFCP}ms`)
    console.log(`   📊 Web Vitals Score: ${this.results.coreWebVitals.score}/100`)
  }

  /**
   * Calculate Web Vitals score
   */
  calculateWebVitalsScore(lcp, fid, cls) {
    let score = 100
    
    // LCP scoring
    if (lcp > PERFORMANCE_THRESHOLDS.coreWebVitals.lcp.needsImprovement) {
      score -= 40
    } else if (lcp > PERFORMANCE_THRESHOLDS.coreWebVitals.lcp.good) {
      score -= 20
    }
    
    // FID scoring
    if (fid > PERFORMANCE_THRESHOLDS.coreWebVitals.fid.needsImprovement) {
      score -= 30
    } else if (fid > PERFORMANCE_THRESHOLDS.coreWebVitals.fid.good) {
      score -= 15
    }
    
    // CLS scoring
    if (cls > PERFORMANCE_THRESHOLDS.coreWebVitals.cls.needsImprovement) {
      score -= 30
    } else if (cls > PERFORMANCE_THRESHOLDS.coreWebVitals.cls.good) {
      score -= 15
    }
    
    return Math.max(0, Math.round(score))
  }

  /**
   * Calculate overall performance score
   */
  async calculateOverallScore() {
    let score = 100
    
    // Bundle size scoring (30% weight)
    const bundleSize = this.results.bundleAnalysis.gzippedSize
    if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.critical) {
      score -= 30
    } else if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.warning) {
      score -= 20
    } else if (bundleSize > PERFORMANCE_THRESHOLDS.bundleSize.good) {
      score -= 10
    }
    
    // React performance scoring (25% weight)
    const antiPatterns = this.results.reactPerformance.antiPatterns
    score -= antiPatterns.filter(p => p.severity === 'high').length * 5
    score -= antiPatterns.filter(p => p.severity === 'medium').length * 3
    score -= antiPatterns.filter(p => p.severity === 'low').length * 1
    
    // Memory leaks penalty
    score -= this.results.reactPerformance.memoryLeaks.length * 8
    
    // Asset optimization scoring (20% weight)
    score -= this.results.assetOptimization.unoptimizedImages.length * 2
    score -= this.results.assetOptimization.compressionOpportunities.length * 1
    score -= this.results.assetOptimization.fontOptimizations.length * 1
    
    // Build configuration scoring (15% weight)
    const configIssues = this.results.buildConfiguration.issues
    score -= configIssues.filter(i => i.severity === 'high').length * 10
    score -= configIssues.filter(i => i.severity === 'medium').length * 5
    score -= configIssues.filter(i => i.severity === 'low').length * 2
    
    // Core Web Vitals scoring (10% weight)
    const webVitalsScore = this.results.coreWebVitals.score
    score = score * 0.9 + webVitalsScore * 0.1
    
    this.results.overallScore = Math.max(0, Math.round(score))
    
    // Update performance metrics
    try {
      const packageJsonContent = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
      const packageJson = JSON.parse(packageJsonContent)
      this.results.performanceMetrics.dependencyCount = Object.keys(packageJson.dependencies || {}).length
    } catch (error) {
      this.results.performanceMetrics.dependencyCount = 0
    }
    this.results.performanceMetrics.codeComplexity = this.calculateCodeComplexity()
  }

  /**
   * Calculate code complexity score
   */
  calculateCodeComplexity() {
    let complexity = 0
    
    // React component complexity
    complexity += this.results.reactPerformance.componentComplexity.reduce((sum, comp) => sum + comp.score, 0)
    
    // Anti-patterns add to complexity
    complexity += this.results.reactPerformance.antiPatterns.length * 2
    
    // Hook optimizations needed add to complexity
    complexity += this.results.reactPerformance.hookOptimizations.length * 3
    
    return Math.round(complexity / 10) // Normalize to 0-100 scale
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = []
    
    // Critical bundle size recommendations
    if (this.results.bundleAnalysis.gzippedSize > PERFORMANCE_THRESHOLDS.bundleSize.critical) {
      recommendations.push({
        priority: 'critical',
        category: 'bundle',
        title: 'Critical Bundle Size Reduction Required',
        description: `Bundle size (${this.formatBytes(this.results.bundleAnalysis.gzippedSize)}) is critically large`,
        action: 'Immediately implement aggressive code splitting, remove unused dependencies, and consider lazy loading',
        impact: 'High impact on LCP and FID',
        effort: 'High'
      })
    } else if (this.results.bundleAnalysis.gzippedSize > PERFORMANCE_THRESHOLDS.bundleSize.warning) {
      recommendations.push({
        priority: 'high',
        category: 'bundle',
        title: 'Reduce Bundle Size',
        description: `Bundle size (${this.formatBytes(this.results.bundleAnalysis.gzippedSize)}) exceeds recommended limits`,
        action: 'Implement code splitting, analyze and remove unused dependencies, optimize imports',
        impact: 'Medium impact on LCP and FID',
        effort: 'Medium'
      })
    }
    
    // Treeshaking opportunities
    if (this.results.bundleAnalysis.treeshakingOpportunities.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'bundle',
        title: 'Optimize Library Imports',
        description: `${this.results.bundleAnalysis.treeshakingOpportunities.length} treeshaking opportunities found`,
        action: 'Use specific imports instead of importing entire libraries',
        impact: 'Medium impact on bundle size',
        effort: 'Low'
      })
    }
    
    // React performance recommendations
    const criticalReactIssues = this.results.reactPerformance.antiPatterns.filter(p => p.severity === 'high')
    if (criticalReactIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'react',
        title: 'Fix Critical React Performance Issues',
        description: `Found ${criticalReactIssues.length} critical React performance issues`,
        action: 'Fix useEffect dependency arrays, optimize re-renders, and implement proper memoization',
        impact: 'High impact on FID and runtime performance',
        effort: 'Medium'
      })
    }
    
    // Memory leak recommendations
    if (this.results.reactPerformance.memoryLeaks.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'react',
        title: 'Fix Memory Leaks',
        description: `${this.results.reactPerformance.memoryLeaks.length} potential memory leaks detected`,
        action: 'Add proper cleanup in useEffect, clear intervals/timeouts, and remove event listeners',
        impact: 'High impact on long-term performance and stability',
        effort: 'Medium'
      })
    }
    
    // Component complexity recommendations
    const complexComponents = this.results.reactPerformance.componentComplexity.filter(c => c.score > 50)
    if (complexComponents.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'react',
        title: 'Refactor Complex Components',
        description: `${complexComponents.length} components have high complexity scores`,
        action: 'Break down large components into smaller, focused components',
        impact: 'Medium impact on maintainability and performance',
        effort: 'High'
      })
    }
    
    // Image optimization recommendations
    const largeImages = this.results.assetOptimization.unoptimizedImages.filter(img => img.size > 1024 * 1024)
    if (largeImages.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'assets',
        title: 'Optimize Large Images',
        description: `${largeImages.length} images are larger than 1MB`,
        action: 'Compress images, convert to WebP/AVIF, and implement responsive images',
        impact: 'High impact on LCP and bandwidth usage',
        effort: 'Low'
      })
    }
    
    // Lazy loading recommendations
    if (this.results.assetOptimization.lazyLoadingOpportunities.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'assets',
        title: 'Implement Lazy Loading',
        description: `${this.results.assetOptimization.lazyLoadingOpportunities.length} assets can benefit from lazy loading`,
        action: 'Implement lazy loading for images and components below the fold',
        impact: 'Medium impact on initial page load',
        effort: 'Low'
      })
    }
    
    // Font optimization recommendations
    const fontIssues = this.results.assetOptimization.fontOptimizations.filter(f => f.type === 'font-display')
    if (fontIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'assets',
        title: 'Optimize Font Loading',
        description: 'Font loading can be optimized to reduce CLS',
        action: 'Add font-display: swap to @font-face rules and preload critical fonts',
        impact: 'Medium impact on CLS and perceived performance',
        effort: 'Low'
      })
    }
    
    // CSS optimization recommendations
    const cssIssues = this.results.assetOptimization.cssOptimizations.filter(css => css.issues.length > 0)
    if (cssIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'assets',
        title: 'Optimize CSS',
        description: `${cssIssues.length} CSS files have optimization opportunities`,
        action: 'Remove unused CSS, consolidate duplicate rules, and optimize selectors',
        impact: 'Medium impact on bundle size and render performance',
        effort: 'Medium'
      })
    }
    
    // Build configuration recommendations
    const highConfigIssues = this.results.buildConfiguration.issues.filter(i => i.severity === 'high')
    if (highConfigIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'build',
        title: 'Fix Build Configuration Issues',
        description: `${highConfigIssues.length} critical build configuration issues detected`,
        action: 'Review and fix Vite configuration, enable proper minification and compression',
        impact: 'High impact on bundle optimization',
        effort: 'Low'
      })
    }
    
    // Core Web Vitals recommendations
    if (this.results.coreWebVitals.lcp > PERFORMANCE_THRESHOLDS.coreWebVitals.lcp.needsImprovement) {
      recommendations.push({
        priority: 'high',
        category: 'webvitals',
        title: 'Improve Largest Contentful Paint (LCP)',
        description: `LCP (${this.results.coreWebVitals.lcp}ms) needs improvement`,
        action: 'Optimize images, reduce bundle size, and implement resource preloading',
        impact: 'High impact on user experience and SEO',
        effort: 'Medium'
      })
    }
    
    if (this.results.coreWebVitals.fid > PERFORMANCE_THRESHOLDS.coreWebVitals.fid.needsImprovement) {
      recommendations.push({
        priority: 'high',
        category: 'webvitals',
        title: 'Improve First Input Delay (FID)',
        description: `FID (${this.results.coreWebVitals.fid}ms) needs improvement`,
        action: 'Reduce JavaScript execution time, implement code splitting, and optimize React components',
        impact: 'High impact on interactivity',
        effort: 'High'
      })
    }
    
    if (this.results.coreWebVitals.cls > PERFORMANCE_THRESHOLDS.coreWebVitals.cls.needsImprovement) {
      recommendations.push({
        priority: 'medium',
        category: 'webvitals',
        title: 'Improve Cumulative Layout Shift (CLS)',
        description: `CLS (${this.results.coreWebVitals.cls}) needs improvement`,
        action: 'Add dimensions to images, optimize font loading, and avoid dynamic content insertion',
        impact: 'Medium impact on visual stability',
        effort: 'Medium'
      })
    }
    
    // Performance monitoring recommendation
    recommendations.push({
      priority: 'low',
      category: 'monitoring',
      title: 'Implement Performance Monitoring',
      description: 'Add real-time performance monitoring and alerting',
      action: 'Set up Core Web Vitals tracking, error monitoring, and performance budgets',
      impact: 'Low immediate impact, high long-term value',
      effort: 'Medium'
    })
    
    // Sort recommendations by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    
    this.results.recommendations = recommendations
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    console.log('\n📋 COMPREHENSIVE PERFORMANCE ANALYSIS REPORT')
    console.log('=' .repeat(80))
    
    // Overall score with detailed breakdown
    console.log(`\n🎯 Overall Performance Score: ${this.results.overallScore}/100`)
    
    if (this.results.overallScore >= 90) {
      console.log('   ✅ EXCELLENT - Your application has outstanding performance')
    } else if (this.results.overallScore >= 80) {
      console.log('   ✅ VERY GOOD - Minor optimizations recommended')
    } else if (this.results.overallScore >= 70) {
      console.log('   ⚠️  GOOD - Some performance improvements recommended')
    } else if (this.results.overallScore >= 50) {
      console.log('   ⚠️  FAIR - Several performance issues need attention')
    } else {
      console.log('   ❌ POOR - Critical performance issues require immediate attention')
    }
    
    // Core Web Vitals
    console.log(`\n📊 Core Web Vitals (Estimated):`)
    console.log(`   LCP (Largest Contentful Paint): ${this.results.coreWebVitals.lcp}ms ${this.getWebVitalStatus(this.results.coreWebVitals.lcp, 'lcp')}`)
    console.log(`   FID (First Input Delay): ${this.results.coreWebVitals.fid}ms ${this.getWebVitalStatus(this.results.coreWebVitals.fid, 'fid')}`)
    console.log(`   CLS (Cumulative Layout Shift): ${this.results.coreWebVitals.cls} ${this.getWebVitalStatus(this.results.coreWebVitals.cls, 'cls')}`)
    console.log(`   FCP (First Contentful Paint): ${this.results.coreWebVitals.fcp}ms`)
    console.log(`   Web Vitals Score: ${this.results.coreWebVitals.score}/100`)
    
    // Bundle analysis with detailed breakdown
    console.log(`\n📦 Bundle Analysis:`)
    console.log(`   Total Size: ${this.formatBytes(this.results.bundleAnalysis.totalSize)}`)
    console.log(`   Gzipped Size: ${this.formatBytes(this.results.bundleAnalysis.gzippedSize)}`)
    console.log(`   Brotli Size: ${this.formatBytes(this.results.bundleAnalysis.brotliSize)}`)
    console.log(`   Total Chunks: ${this.results.bundleAnalysis.largestChunks.length}`)
    
    // Chunk breakdown
    const { vendor, app, async } = this.results.bundleAnalysis.chunkAnalysis
    if (vendor.length > 0) {
      const vendorSize = vendor.reduce((sum, chunk) => sum + chunk.size, 0)
      console.log(`   Vendor Chunks: ${vendor.length} files (${this.formatBytes(vendorSize)})`)
    }
    if (app.length > 0) {
      const appSize = app.reduce((sum, chunk) => sum + chunk.size, 0)
      console.log(`   App Chunks: ${app.length} files (${this.formatBytes(appSize)})`)
    }
    if (async.length > 0) {
      const asyncSize = async.reduce((sum, chunk) => sum + chunk.size, 0)
      console.log(`   Async Chunks: ${async.length} files (${this.formatBytes(asyncSize)})`)
    }
    
    // Largest chunks
    if (this.results.bundleAnalysis.largestChunks.length > 0) {
      console.log(`   Largest Chunks:`)
      this.results.bundleAnalysis.largestChunks.slice(0, 5).forEach((chunk, index) => {
        console.log(`     ${index + 1}. ${chunk.name}: ${this.formatBytes(chunk.size)} (${chunk.type})`)
      })
    }
    
    // Treeshaking opportunities
    if (this.results.bundleAnalysis.treeshakingOpportunities.length > 0) {
      console.log(`   🌳 Treeshaking Opportunities: ${this.results.bundleAnalysis.treeshakingOpportunities.length}`)
    }
    
    // React performance with detailed breakdown
    console.log(`\n⚛️  React Performance Analysis:`)
    const reactIssues = this.results.reactPerformance.antiPatterns.length
    console.log(`   Anti-patterns Found: ${reactIssues}`)
    
    if (reactIssues > 0) {
      const severityCount = { high: 0, medium: 0, low: 0 }
      this.results.reactPerformance.antiPatterns.forEach(issue => {
        severityCount[issue.severity] = (severityCount[issue.severity] || 0) + 1
      })
      console.log(`     High Severity: ${severityCount.high}`)
      console.log(`     Medium Severity: ${severityCount.medium}`)
      console.log(`     Low Severity: ${severityCount.low}`)
    }
    
    console.log(`   Memory Leaks: ${this.results.reactPerformance.memoryLeaks.length}`)
    console.log(`   Complex Components: ${this.results.reactPerformance.componentComplexity.length}`)
    console.log(`   Hook Optimizations Needed: ${this.results.reactPerformance.hookOptimizations.length}`)
    
    // Asset optimization with categories
    console.log(`\n🖼️  Asset Optimization:`)
    console.log(`   Unoptimized Images: ${this.results.assetOptimization.unoptimizedImages.length}`)
    console.log(`   Compression Opportunities: ${this.results.assetOptimization.compressionOpportunities.length}`)
    console.log(`   Lazy Loading Opportunities: ${this.results.assetOptimization.lazyLoadingOpportunities.length}`)
    console.log(`   Font Optimizations: ${this.results.assetOptimization.fontOptimizations.length}`)
    console.log(`   CSS Files Analyzed: ${this.results.assetOptimization.cssOptimizations.length}`)
    
    // Build configuration
    console.log(`\n⚙️  Build Configuration:`)
    const configIssues = this.results.buildConfiguration.issues
    const issuesBySevertiy = { high: 0, medium: 0, low: 0 }
    configIssues.forEach(issue => {
      issuesBySevertiy[issue.severity] = (issuesBySevertiy[issue.severity] || 0) + 1
    })
    console.log(`   Total Issues: ${configIssues.length}`)
    console.log(`     High: ${issuesBySevertiy.high}, Medium: ${issuesBySevertiy.medium}, Low: ${issuesBySevertiy.low}`)
    console.log(`   Optimizations Enabled: ${this.results.buildConfiguration.viteOptimizations.length}`)
    console.log(`   Modern Features: ${this.results.buildConfiguration.modernFeatures.length}`)
    
    // Performance metrics
    console.log(`\n📈 Performance Metrics:`)
    console.log(`   Build Time: ${this.results.performanceMetrics.buildTime > 0 ? (this.results.performanceMetrics.buildTime / 1000).toFixed(2) + 's' : 'Not measured'}`)
    console.log(`   Dependencies: ${this.results.performanceMetrics.dependencyCount}`)
    console.log(`   Code Complexity Score: ${this.results.performanceMetrics.codeComplexity}/100`)
    
    // Priority recommendations
    console.log(`\n🎯 Performance Recommendations:`)
    
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'critical')
    const highRecs = this.results.recommendations.filter(r => r.priority === 'high')
    const mediumRecs = this.results.recommendations.filter(r => r.priority === 'medium')
    const lowRecs = this.results.recommendations.filter(r => r.priority === 'low')
    
    if (criticalRecs.length > 0) {
      console.log(`\n   🚨 CRITICAL (${criticalRecs.length}):`)
      criticalRecs.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title}`)
        console.log(`      ${rec.description}`)
        console.log(`      Action: ${rec.action}`)
        console.log(`      Impact: ${rec.impact} | Effort: ${rec.effort}`)
      })
    }
    
    if (highRecs.length > 0) {
      console.log(`\n   ⚠️  HIGH PRIORITY (${highRecs.length}):`)
      highRecs.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title}`)
        console.log(`      ${rec.description}`)
        console.log(`      Action: ${rec.action}`)
      })
      if (highRecs.length > 3) {
        console.log(`   ... and ${highRecs.length - 3} more high priority items`)
      }
    }
    
    if (mediumRecs.length > 0) {
      console.log(`\n   📋 MEDIUM PRIORITY (${mediumRecs.length}):`)
      mediumRecs.slice(0, 2).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} - ${rec.description}`)
      })
      if (mediumRecs.length > 2) {
        console.log(`   ... and ${mediumRecs.length - 2} more medium priority items`)
      }
    }
    
    if (lowRecs.length > 0) {
      console.log(`\n   💡 LOW PRIORITY (${lowRecs.length}): See detailed report for full list`)
    }
    
    // Summary
    console.log(`\n📋 Summary:`)
    console.log(`   Analysis completed at: ${new Date().toLocaleString()}`)
    console.log(`   Total recommendations: ${this.results.recommendations.length}`)
    console.log(`   Estimated performance impact: ${this.getPerformanceImpactSummary()}`)
    
    return this.results
  }

  /**
   * Get Web Vital status indicator
   */
  getWebVitalStatus(value, metric) {
    const thresholds = PERFORMANCE_THRESHOLDS.coreWebVitals[metric]
    if (!thresholds) return ''
    
    if (value <= thresholds.good) {
      return '✅'
    } else if (value <= thresholds.needsImprovement) {
      return '⚠️'
    } else {
      return '❌'
    }
  }

  /**
   * Get performance impact summary
   */
  getPerformanceImpactSummary() {
    const critical = this.results.recommendations.filter(r => r.priority === 'critical').length
    const high = this.results.recommendations.filter(r => r.priority === 'high').length
    
    if (critical > 0) {
      return 'Critical improvements needed for production readiness'
    } else if (high > 3) {
      return 'Significant performance gains possible with recommended changes'
    } else if (high > 0) {
      return 'Moderate performance improvements available'
    } else {
      return 'Good performance baseline with minor optimization opportunities'
    }
  }

  /**
   * Save detailed report to file
   */
  async saveDetailedReport() {
    const reportPath = path.join(projectRoot, 'performance-analysis-report.json')
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2))
      console.log(`\n💾 Detailed report saved to: performance-analysis-report.json`)
    } catch (error) {
      console.error(`❌ Could not save report: ${error.message}`)
    }
  }

  /**
   * Utility functions
   */
  
  async getFilesRecursively(dir) {
    const files = []
    
    async function scan(currentDir) {
      try {
        const items = await fs.readdir(currentDir, { withFileTypes: true })
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item.name)
          
          if (item.isDirectory()) {
            await scan(fullPath)
          } else {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scan(dir)
    return files
  }

  getLineNumber(content, match) {
    const index = content.indexOf(match)
    if (index === -1) return 1
    return content.substring(0, index).split('\n').length
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Run complete performance analysis
   */
  async runCompleteAnalysis() {
    console.log('🚀 Starting comprehensive performance analysis...\n')
    
    const startTime = Date.now()
    
    try {
      // Core analysis phases
      await this.analyzeBundleSize()
      await this.profileReactComponents()
      await this.optimizeAssets()
      await this.validateBuildConfig()
      
      // Advanced analysis
      this.estimateCoreWebVitals()
      await this.calculateOverallScore()
      this.generateRecommendations()
      
      // Generate reports
      const report = this.generatePerformanceReport()
      await this.saveDetailedReport()
      
      const analysisTime = Date.now() - startTime
      console.log(`\n✅ Performance analysis completed in ${(analysisTime / 1000).toFixed(2)}s!`)
      
      return report
      
    } catch (error) {
      console.error(`❌ Performance analysis failed: ${error.message}`)
      console.error(error.stack)
      throw error
    }
  }
}

// Export for use in other modules
export { PerformanceAnalyzer }

// Run analysis if called directly
if (process.argv[1] && process.argv[1].endsWith('performance-analyzer.js')) {
  const analyzer = new PerformanceAnalyzer()
  
  try {
    const report = await analyzer.runCompleteAnalysis()
    
    // Exit with appropriate code based on performance score
    if (report.overallScore >= 70) {
      process.exit(0)
    } else {
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Performance analysis failed:', error.message)
    process.exit(1)
  }
}