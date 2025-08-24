import fs from 'fs'
import path from 'path'

console.log('🧹 Cleaning up console statements for production...')

const srcDir = './src'
let cleanedCount = 0
let filesModified = 0

function shouldCleanFile(filePath) {
  // Don't clean test files, examples, or specific utility files
  if (filePath.includes('.test.') || 
      filePath.includes('/test/') ||
      filePath.includes('/examples/') ||
      filePath.includes('test-runner.js') ||
      filePath.includes('config-validator.js') ||
      filePath.includes('init-supabase.js') ||
      filePath.includes('supabase-test.js') ||
      filePath.includes('adminSetup.js') ||
      filePath.includes('errorHandler.js') ||
      filePath.includes('performanceMonitor.js')) {
    return false
  }
  return true
}

function cleanConsoleStatements(content) {
  const lines = content.split('\n')
  const cleanedLines = []
  let modified = false

  lines.forEach(line => {
    // Remove console.log, console.warn, console.info, console.debug
    // Keep console.error for production error logging
    const consolePattern = /^\s*console\.(log|warn|info|debug)\([^)]*\);?\s*$/
    const inlineConsolePattern = /console\.(log|warn|info|debug)\([^)]*\);?\s*/g
    
    if (consolePattern.test(line)) {
      // Remove entire line if it's just a console statement
      modified = true
      cleanedCount++
      return // Skip this line
    } else if (inlineConsolePattern.test(line)) {
      // Remove inline console statements
      const cleanedLine = line.replace(inlineConsolePattern, '')
      if (cleanedLine.trim() !== '') {
        cleanedLines.push(cleanedLine)
      }
      modified = true
      cleanedCount++
    } else {
      cleanedLines.push(line)
    }
  })

  return { content: cleanedLines.join('\n'), modified }
}

function cleanFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return
  }

  if (!shouldCleanFile(filePath)) {
    return
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const { content: cleanedContent, modified } = cleanConsoleStatements(content)
    
    if (modified) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8')
      filesModified++
      console.log(`  ✅ Cleaned: ${filePath}`)
    }
  } catch (error) {
    console.log(`  ❌ Error cleaning ${filePath}: ${error.message}`)
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath)
      } else if (stat.isFile()) {
        cleanFile(filePath)
      }
    })
  } catch (error) {
    console.log(`  ❌ Error walking directory ${dir}: ${error.message}`)
  }
}

walkDir(srcDir)

console.log('\n' + '='.repeat(50))
console.log('CONSOLE CLEANUP COMPLETE')
console.log('='.repeat(50))
console.log(`Files modified: ${filesModified}`)
console.log(`Console statements removed: ${cleanedCount}`)
console.log('='.repeat(50))

// Update package.json description while we're at it
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (!packageJson.description) {
    packageJson.description = 'Zomet - Advanced Vehicle Marketplace Platform with Real-time Features'
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
    console.log('✅ Added description to package.json')
  }
} catch (error) {
  console.log('❌ Error updating package.json:', error.message)
}