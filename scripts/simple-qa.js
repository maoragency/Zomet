import fs from 'fs'
import path from 'path'

console.log('Starting Quality Assurance checks...')

// Check for TODO comments
function checkTodoComments() {
  console.log('Checking for TODO/FIXME comments...')
  
  const srcDir = './src'
  const todoPattern = /(TODO|FIXME|HACK|XXX|BUG):/gi
  let todoCount = 0

  function checkFile(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
      return
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        const match = line.match(todoPattern)
        if (match) {
          todoCount++
          console.log(`  TODO found in ${filePath}:${index + 1} - ${line.trim()}`)
        }
      })
    } catch (error) {
      console.log(`  Error reading ${filePath}: ${error.message}`)
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
          checkFile(filePath)
        }
      })
    } catch (error) {
      console.log(`  Error walking directory ${dir}: ${error.message}`)
    }
  }

  walkDir(srcDir)
  console.log(`  Found ${todoCount} TODO/FIXME comments`)
  return todoCount
}

// Check for console.log statements
function checkConsoleStatements() {
  console.log('Checking for console statements...')
  
  const srcDir = './src'
  const consolePattern = /console\.(log|warn|error|info|debug)/g
  let consoleCount = 0

  function checkFile(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
      return
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        const matches = [...line.matchAll(consolePattern)]
        matches.forEach(match => {
          consoleCount++
          console.log(`  Console found in ${filePath}:${index + 1} - ${line.trim()}`)
        })
      })
    } catch (error) {
      console.log(`  Error reading ${filePath}: ${error.message}`)
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
          checkFile(filePath)
        }
      })
    } catch (error) {
      console.log(`  Error walking directory ${dir}: ${error.message}`)
    }
  }

  walkDir(srcDir)
  console.log(`  Found ${consoleCount} console statements`)
  return consoleCount
}

// Check package.json
function checkPackageJson() {
  console.log('Checking package.json...')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    
    const requiredFields = ['name', 'version', 'description', 'scripts']
    requiredFields.forEach(field => {
      if (packageJson[field]) {
        console.log(`  ✅ ${field} is present`)
      } else {
        console.log(`  ❌ ${field} is missing`)
      }
    })

    if (packageJson.scripts?.build) {
      console.log('  ✅ Build script configured')
    } else {
      console.log('  ❌ Build script missing')
    }

    if (packageJson.scripts?.test) {
      console.log('  ✅ Test script configured')
    } else {
      console.log('  ❌ Test script missing')
    }

  } catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}`)
  }
}

// Check environment files
function checkEnvironment() {
  console.log('Checking environment configuration...')
  
  if (fs.existsSync('.env.example')) {
    console.log('  ✅ .env.example exists')
  } else {
    console.log('  ❌ .env.example missing')
  }

  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8')
    if (gitignore.includes('.env')) {
      console.log('  ✅ .env is in .gitignore')
    } else {
      console.log('  ❌ .env not in .gitignore')
    }
  } catch (error) {
    console.log('  ❌ Could not read .gitignore')
  }
}

// Run all checks
function runQA() {
  console.log('='.repeat(50))
  console.log('QUALITY ASSURANCE REPORT')
  console.log('='.repeat(50))

  const todoCount = checkTodoComments()
  const consoleCount = checkConsoleStatements()
  checkPackageJson()
  checkEnvironment()

  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY:')
  console.log(`TODO/FIXME comments: ${todoCount}`)
  console.log(`Console statements: ${consoleCount}`)
  console.log('='.repeat(50))

  // Generate simple report
  const report = {
    timestamp: new Date().toISOString(),
    todoCount,
    consoleCount,
    status: (todoCount === 0 && consoleCount === 0) ? 'CLEAN' : 'NEEDS_ATTENTION'
  }

  fs.writeFileSync('qa-report.json', JSON.stringify(report, null, 2))
  console.log('Report saved to qa-report.json')
}

runQA()