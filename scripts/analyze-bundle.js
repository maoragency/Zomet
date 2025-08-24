#!/usr/bin/env node

/**
 * Bundle analyzer script for performance optimization
 * Analyzes bundle size, dependencies, and provides optimization recommendations
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.distPath = path.join(this.projectRoot, 'dist')
    this.packageJsonPath = path.join(this.projectRoot, 'package.json')
    this.results = {
      timestamp: new Date().toISOString(),
      bundleSize: {},
      dependencies: {},
      recommendations: [],
      performance: {}
    }
  }

  /**
   * Run complete bundle analysis
   */
  async analyze() {
    console.log('🔍 Starting bundle analysis...\n')

    try {
      // Build the project first
      await this.buildProject()
      
      // Analyze bundle files
      await this.analyzeBundleFiles()
      
      // Analyze dependencies
      await this.analyzeDependencies()
      
      // Generate recommendations
      this.generateRecommendations()
      
      // Generate report
      this.generateReport()
      
      console.log('✅ Bundle analysis complete!')
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Build the project with analysis
   */
  async buildProject() {
    console.log('📦 Building project for analysis...')
    
    try {
      // Build with bundle analyzer
      execSync('npm run build', { 
        cwd: this.projectRoot,
        stdio: 'inherit',
        env: { ...process.env, ANALYZE: 'true' }
      })
      
      console.log('✅ Build completed\n')
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`)
    }
  }

  /**
   * Analyze bundle files
   */
  async analyzeBundleFiles() {
    console.log('📊 Analyzing bundle files...')
    
    if (!fs.existsSync(this.distPath)) {
      throw new Error('Dist directory not found. Run build first.')
    }

    const files = this.getAllFiles(this.distPath)
    const jsFiles = files.filter(f => f.endsWith('.js'))
    const cssFiles = files.filter(f => f.endsWith('.css'))
    const assetFiles = files.filter(f => !f.endsWith('.js') && !f.endsWith('.css') && !f.endsWith('.html'))

    // Analyze JavaScript files
    this.results.bundleSize.javascript = this.analyzeFileGroup(jsFiles, 'JavaScript')
    
    // Analyze CSS files
    this.results.bundleSize.css = this.analyzeFileGroup(cssFiles, 'CSS')
    
    // Analyze asset files
    this.results.bundleSize.assets = this.analyzeFileGroup(assetFiles, 'Assets')
    
    // Calculate totals
    this.results.bundleSize.total = {
      files: files.length,
      size: jsFiles.concat(cssFiles, assetFiles).reduce((sum, file) => {
        return sum + fs.statSync(file).size
      }, 0)
    }

    console.log(`   📁 Total files: ${this.results.bundleSize.total.files}`)
    console.log(`   📏 Total size: ${this.formatBytes(this.results.bundleSize.total.size)}`)
    console.log('✅ Bundle files analyzed\n')
  }

  /**
   * Analyze file group
   */
  analyzeFileGroup(files, type) {
    const analysis = {
      count: files.length,
      totalSize: 0,
      files: []
    }

    files.forEach(file => {
      const stats = fs.statSync(file)
      const relativePath = path.relative(this.distPath, file)
      
      analysis.files.push({
        name: relativePath,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size)
      })
      
      analysis.totalSize += stats.size
    })

    // Sort by size (largest first)
    analysis.files.sort((a, b) => b.size - a.size)
    analysis.totalSizeFormatted = this.formatBytes(analysis.totalSize)

    console.log(`   ${type}: ${analysis.count} files, ${analysis.totalSizeFormatted}`)
    
    return analysis
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies() {
    console.log('📦 Analyzing dependencies...')
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    this.results.dependencies = {
      total: Object.keys(dependencies).length,
      production: Object.keys(packageJson.dependencies || {}).length,
      development: Object.keys(packageJson.devDependencies || {}).length,
      list: dependencies
    }

    // Analyze large dependencies
    const largeDependencies = this.identifyLargeDependencies(dependencies)
    this.results.dependencies.large = largeDependencies

    console.log(`   📊 Total dependencies: ${this.results.dependencies.total}`)
    console.log(`   🏭 Production: ${this.results.dependencies.production}`)
    console.log(`   🔧 Development: ${this.results.dependencies.development}`)
    console.log('✅ Dependencies analyzed\n')
  }

  /**
   * Identify large dependencies
   */
  identifyLargeDependencies(dependencies) {
    const knownLargeDeps = {
      'react': { size: '42KB', reason: 'Core React library' },
      'react-dom': { size: '130KB', reason: 'React DOM renderer' },
      '@supabase/supabase-js': { size: '200KB', reason: 'Supabase client' },
      'lucide-react': { size: '600KB', reason: 'Icon library - consider tree shaking' },
      'date-fns': { size: '200KB', reason: 'Date utility library' },
      'recharts': { size: '400KB', reason: 'Chart library' }
    }

    const large = []
    Object.keys(dependencies).forEach(dep => {
      if (knownLargeDeps[dep]) {
        large.push({
          name: dep,
          ...knownLargeDeps[dep]
        })
      }
    })

    return large
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    console.log('💡 Generating recommendations...')
    
    const recommendations = []

    // Bundle size recommendations
    if (this.results.bundleSize.total.size > 1024 * 1024) { // > 1MB
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        title: 'Large Bundle Size',
        description: `Total bundle size is ${this.formatBytes(this.results.bundleSize.total.size)}. Consider code splitting and lazy loading.`,
        actions: [
          'Implement route-based code splitting',
          'Use dynamic imports for heavy components',
          'Enable tree shaking for unused code',
          'Optimize images and assets'
        ]
      })
    }

    // JavaScript file recommendations
    const largeJsFiles = this.results.bundleSize.javascript.files.filter(f => f.size > 500 * 1024) // > 500KB
    if (largeJsFiles.length > 0) {
      recommendations.push({
        type: 'javascript',
        priority: 'medium',
        title: 'Large JavaScript Files',
        description: `Found ${largeJsFiles.length} JavaScript files larger than 500KB.`,
        files: largeJsFiles.map(f => f.name),
        actions: [
          'Split large chunks into smaller ones',
          'Use dynamic imports for non-critical code',
          'Consider lazy loading for dashboard modules'
        ]
      })
    }

    // Dependency recommendations
    if (this.results.dependencies.large.length > 0) {
      recommendations.push({
        type: 'dependencies',
        priority: 'medium',
        title: 'Large Dependencies',
        description: 'Some dependencies contribute significantly to bundle size.',
        dependencies: this.results.dependencies.large,
        actions: [
          'Enable tree shaking for icon libraries',
          'Use lighter alternatives where possible',
          'Implement dynamic imports for heavy libraries',
          'Consider CDN for large stable libraries'
        ]
      })
    }

    // Performance recommendations
    recommendations.push({
      type: 'performance',
      priority: 'low',
      title: 'Performance Optimizations',
      description: 'Additional optimizations to improve loading performance.',
      actions: [
        'Enable gzip/brotli compression',
        'Implement service worker for caching',
        'Use WebP images where supported',
        'Preload critical resources',
        'Implement resource hints (prefetch, preconnect)'
      ]
    })

    this.results.recommendations = recommendations
    console.log(`   💡 Generated ${recommendations.length} recommendations`)
    console.log('✅ Recommendations generated\n')
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('📄 Generating report...')
    
    const reportPath = path.join(this.projectRoot, 'bundle-analysis-report.json')
    const htmlReportPath = path.join(this.projectRoot, 'bundle-analysis-report.html')
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport()
    fs.writeFileSync(htmlReportPath, htmlReport)
    
    console.log(`   📄 JSON report: ${reportPath}`)
    console.log(`   🌐 HTML report: ${htmlReportPath}`)
    console.log('✅ Report generated\n')
    
    // Print summary
    this.printSummary()
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport() {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #666; }
        .file-list { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }
        .file-item { padding: 8px 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .recommendation { margin: 15px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .recommendation.high { border-color: #dc3545; }
        .recommendation.medium { border-color: #ffc107; }
        .recommendation.low { border-color: #28a745; }
        .actions { margin-top: 10px; }
        .action { display: block; margin: 5px 0; padding: 5px 10px; background: #e9ecef; border-radius: 3px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Bundle Analysis Report</h1>
            <p>Generated on ${new Date(this.results.timestamp).toLocaleString('he-IL')}</p>
        </div>

        <div class="section">
            <h2>📦 Bundle Overview</h2>
            <div class="metric">
                <div class="metric-value">${this.results.bundleSize.total.files}</div>
                <div class="metric-label">Total Files</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.formatBytes(this.results.bundleSize.total.size)}</div>
                <div class="metric-label">Total Size</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.bundleSize.javascript.count}</div>
                <div class="metric-label">JS Files</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.formatBytes(this.results.bundleSize.javascript.totalSize)}</div>
                <div class="metric-label">JS Size</div>
            </div>
        </div>

        <div class="section">
            <h2>📁 Largest Files</h2>
            <div class="file-list">
                ${this.results.bundleSize.javascript.files.slice(0, 10).map(file => `
                    <div class="file-item">
                        <span>${file.name}</span>
                        <span>${file.sizeFormatted}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            ${this.results.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <h3>${rec.title}</h3>
                    <p>${rec.description}</p>
                    <div class="actions">
                        ${rec.actions.map(action => `<span class="action">• ${action}</span>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('📊 BUNDLE ANALYSIS SUMMARY')
    console.log('=' .repeat(50))
    console.log(`📦 Total Bundle Size: ${this.formatBytes(this.results.bundleSize.total.size)}`)
    console.log(`📁 Total Files: ${this.results.bundleSize.total.files}`)
    console.log(`🟨 JavaScript: ${this.formatBytes(this.results.bundleSize.javascript.totalSize)} (${this.results.bundleSize.javascript.count} files)`)
    console.log(`🟦 CSS: ${this.formatBytes(this.results.bundleSize.css.totalSize)} (${this.results.bundleSize.css.count} files)`)
    console.log(`🟩 Assets: ${this.formatBytes(this.results.bundleSize.assets.totalSize)} (${this.results.bundleSize.assets.count} files)`)
    console.log(`📦 Dependencies: ${this.results.dependencies.total} total`)
    console.log(`💡 Recommendations: ${this.results.recommendations.length}`)
    
    // Show top recommendations
    const highPriorityRecs = this.results.recommendations.filter(r => r.priority === 'high')
    if (highPriorityRecs.length > 0) {
      console.log('\n🚨 HIGH PRIORITY RECOMMENDATIONS:')
      highPriorityRecs.forEach(rec => {
        console.log(`   • ${rec.title}: ${rec.description}`)
      })
    }
    
    console.log('\n📄 Full report saved to bundle-analysis-report.html')
    console.log('=' .repeat(50))
  }

  /**
   * Get all files recursively
   */
  getAllFiles(dir) {
    const files = []
    
    const items = fs.readdirSync(dir)
    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath))
      } else {
        files.push(fullPath)
      }
    })
    
    return files
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Run analysis if called directly
const isMainModule = process.argv[1] === __filename
if (isMainModule) {
  const analyzer = new BundleAnalyzer()
  analyzer.analyze().catch(console.error)
}

export default BundleAnalyzer