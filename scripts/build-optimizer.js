#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * Build Configuration Optimizer
 * Automatically applies performance optimizations to build configuration
 */

class BuildOptimizer {
  constructor() {
    this.optimizations = []
    this.warnings = []
  }

  /**
   * Run all build optimizations
   */
  async optimize() {
    console.log('🔧 Starting build configuration optimization...\n')
    
    try {
      await this.optimizeViteConfig()
      await this.optimizeTailwindConfig()
      await this.optimizePackageJson()
      await this.createOptimizedBuildScript()
      
      this.generateOptimizationReport()
      
    } catch (error) {
      console.error('❌ Build optimization failed:', error.message)
      throw error
    }
  }

  /**
   * Optimize Vite configuration
   */
  async optimizeViteConfig() {
    console.log('⚙️  Optimizing Vite configuration...')
    
    try {
      const viteConfigPath = path.join(projectRoot, 'vite.config.js')
      let content = await fs.readFile(viteConfigPath, 'utf8')
      let modified = false
      
      // Add compression plugins if not present
      if (!content.includes('vite-plugin-compression')) {
        console.log('   📦 Adding compression plugin recommendation')
        this.warnings.push({
          type: 'manual',
          description: 'Consider adding vite-plugin-compression for gzip/brotli compression',
          command: 'npm install --save-dev vite-plugin-compression'
        })
      }
      
      // Optimize build target if outdated
      if (content.includes('target: \'es2015\'') || content.includes('target: \'es2017\'')) {
        content = content.replace(/target:\s*['"]es201[57]['"]/, 'target: \'es2020\'')
        modified = true
        this.optimizations.push('Updated build target to es2020 for better optimization')
      }
      
      // Ensure source maps are disabled in production
      if (!content.includes('sourcemap: false') && !content.includes('sourcemap: process.env.NODE_ENV')) {
        const buildSection = content.match(/build:\s*\{[^}]*\}/s)
        if (buildSection) {
          const newBuildSection = buildSection[0].replace(/\}$/, '    sourcemap: process.env.NODE_ENV === \'development\',\n  }')
          content = content.replace(buildSection[0], newBuildSection)
          modified = true
          this.optimizations.push('Disabled source maps for production builds')
        }
      }
      
      // Add CSS code splitting if not present
      if (!content.includes('cssCodeSplit')) {
        const buildSection = content.match(/build:\s*\{[^}]*\}/s)
        if (buildSection) {
          const newBuildSection = buildSection[0].replace(/\}$/, '    cssCodeSplit: true,\n  }')
          content = content.replace(buildSection[0], newBuildSection)
          modified = true
          this.optimizations.push('Enabled CSS code splitting')
        }
      }
      
      // Optimize asset inline limit
      if (!content.includes('assetsInlineLimit')) {
        const buildSection = content.match(/build:\s*\{[^}]*\}/s)
        if (buildSection) {
          const newBuildSection = buildSection[0].replace(/\}$/, '    assetsInlineLimit: 4096,\n  }')
          content = content.replace(buildSection[0], newBuildSection)
          modified = true
          this.optimizations.push('Set optimal asset inline limit (4KB)')
        }
      }
      
      // Add modern build optimizations
      if (!content.includes('reportCompressedSize: false')) {
        const buildSection = content.match(/build:\s*\{[^}]*\}/s)
        if (buildSection) {
          const newBuildSection = buildSection[0].replace(/\}$/, '    reportCompressedSize: false, // Faster builds\n  }')
          content = content.replace(buildSection[0], newBuildSection)
          modified = true
          this.optimizations.push('Disabled compressed size reporting for faster builds')
        }
      }
      
      if (modified) {
        await fs.writeFile(viteConfigPath, content)
        console.log('   ✅ Vite configuration optimized')
      } else {
        console.log('   ✅ Vite configuration already optimized')
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not optimize Vite config: ${error.message}`)
    }
  }

  /**
   * Optimize Tailwind configuration
   */
  async optimizeTailwindConfig() {
    console.log('🎨 Optimizing Tailwind configuration...')
    
    try {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.js')
      let content = await fs.readFile(tailwindConfigPath, 'utf8')
      let modified = false
      
      // Ensure content paths are optimized
      if (!content.includes('content:') && !content.includes('purge:')) {
        console.log('   ⚠️  Tailwind content/purge configuration missing')
        this.warnings.push({
          type: 'critical',
          description: 'Tailwind CSS purging not configured - unused styles will not be removed',
          fix: 'Add content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"] to tailwind.config.js'
        })
      }
      
      // Add JIT mode if not present (for older versions)
      if (!content.includes('mode:') && !content.includes('jit')) {
        // For Tailwind CSS v3+, JIT is default, but add comment for clarity
        if (!content.includes('// JIT mode is enabled by default')) {
          content = content.replace('export default {', '// JIT mode is enabled by default in Tailwind CSS v3+\nexport default {')
          modified = true
          this.optimizations.push('Added JIT mode documentation')
        }
      }
      
      // Optimize for production builds
      if (!content.includes('important:')) {
        // Add important selector strategy comment
        const configStart = content.indexOf('export default {')
        if (configStart !== -1) {
          content = content.replace('export default {', 
            '// Consider adding important: true for CSS specificity if needed\nexport default {')
          modified = true
          this.optimizations.push('Added CSS specificity optimization note')
        }
      }
      
      if (modified) {
        await fs.writeFile(tailwindConfigPath, content)
        console.log('   ✅ Tailwind configuration optimized')
      } else {
        console.log('   ✅ Tailwind configuration already optimized')
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not optimize Tailwind config: ${error.message}`)
    }
  }

  /**
   * Optimize package.json scripts and dependencies
   */
  async optimizePackageJson() {
    console.log('📦 Optimizing package.json...')
    
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(content)
      let modified = false
      
      // Add performance-focused build scripts if missing
      const recommendedScripts = {
        'build:analyze': 'ANALYZE=true vite build',
        'build:profile': 'vite build --mode production --profile',
        'preview:performance': 'vite preview --port 8080 --open'
      }
      
      for (const [scriptName, scriptCommand] of Object.entries(recommendedScripts)) {
        if (!packageJson.scripts[scriptName]) {
          packageJson.scripts[scriptName] = scriptCommand
          modified = true
          this.optimizations.push(`Added ${scriptName} script`)
        }
      }
      
      // Check for performance-related dev dependencies
      const recommendedDevDeps = [
        'rollup-plugin-visualizer',
        'vite-plugin-compression'
      ]
      
      const missingDeps = recommendedDevDeps.filter(dep => 
        !packageJson.devDependencies || !packageJson.devDependencies[dep]
      )
      
      if (missingDeps.length > 0) {
        this.warnings.push({
          type: 'recommendation',
          description: `Consider adding performance dev dependencies: ${missingDeps.join(', ')}`,
          command: `npm install --save-dev ${missingDeps.join(' ')}`
        })
      }
      
      if (modified) {
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log('   ✅ Package.json optimized')
      } else {
        console.log('   ✅ Package.json already optimized')
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not optimize package.json: ${error.message}`)
    }
  }

  /**
   * Create optimized build script
   */
  async createOptimizedBuildScript() {
    console.log('🚀 Creating optimized build script...')
    
    const buildScriptContent = `#!/usr/bin/env node

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
  execSync('vite build', { stdio: 'inherit' })
  
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
`
    
    const buildScriptPath = path.join(projectRoot, 'scripts', 'build-optimized.js')
    await fs.writeFile(buildScriptPath, buildScriptContent)
    
    this.optimizations.push('Created optimized build script')
    console.log('   ✅ Optimized build script created')
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport() {
    console.log('\n📋 BUILD OPTIMIZATION REPORT')
    console.log('=' .repeat(50))
    
    if (this.optimizations.length > 0) {
      console.log(`\n✅ Applied Optimizations (${this.optimizations.length}):`)
      this.optimizations.forEach((opt, index) => {
        console.log(`   ${index + 1}. ${opt}`)
      })
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Recommendations (${this.warnings.length}):`)
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type.toUpperCase()}] ${warning.description}`)
        if (warning.command) {
          console.log(`      Command: ${warning.command}`)
        }
        if (warning.fix) {
          console.log(`      Fix: ${warning.fix}`)
        }
      })
    }
    
    console.log(`\n🎯 Next Steps:`)
    console.log(`   1. Run 'npm run build:analyze' to test optimized build`)
    console.log(`   2. Run 'npm run performance:summary' to check performance`)
    console.log(`   3. Consider implementing recommended dependencies`)
    console.log(`   4. Use 'node scripts/build-optimized.js' for production builds`)
    
    console.log(`\n✅ Build optimization completed!`)
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('build-optimizer.js')) {
  const optimizer = new BuildOptimizer()
  
  try {
    await optimizer.optimize()
  } catch (error) {
    console.error('❌ Build optimization failed:', error.message)
    process.exit(1)
  }
}

export { BuildOptimizer }