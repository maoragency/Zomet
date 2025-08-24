#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * File categories for cleanup analysis
 */
const FILE_CATEGORIES = {
  TEMPORARY_TEST: 'temporary_test',
  TEMPORARY_REPORT: 'temporary_report', 
  SYSTEM_FILE: 'system_file',
  BUILD_OUTPUT: 'build_output',
  EXTERNAL_SERVICE: 'external_service',
  ESSENTIAL: 'essential',
  UNKNOWN: 'unknown'
}

/**
 * File patterns for categorization
 */
const FILE_PATTERNS = {
  [FILE_CATEGORIES.TEMPORARY_TEST]: [
    /^test-.*\.(js|html)$/,
    /^debug-.*\.(js|html)$/,
    /^fix-.*\.js$/,
    /^check-.*\.js$/,
    /^apply-.*\.js$/, // Only root level, not scripts/
    /^verify-.*\.js$/,
    /^run-.*\.js$/,
    /^final-.*\.js$/,
    /^admin-dashboard-.*\.js$/,
    /^analyze-.*\.js$/,
    /^test-.*\.ps1$/,
    /^test-.*\.md$/
  ],
  [FILE_CATEGORIES.TEMPORARY_REPORT]: [
    /.*_REPORT\.md$/,
    /.*_SUMMARY\.md$/,
    /.*_INSTRUCTIONS\.md$/,
    /.*_ANALYSIS\.md$/,
    /.*_AUDIT.*\.md$/,
    /.*_FIXES.*\.md$/,
    /.*_IMPLEMENTATION.*\.md$/,
    /^qa-report\.json$/,
    /^COMPREHENSIVE_.*\.md$/,
    /^DASHBOARD_.*\.md$/,
    /^ADMIN_.*\.md$/,
    /^AUTHENTICATION_.*\.md$/,
    /^DEPLOYMENT_.*\.md$/,
    /^FLOATING_.*\.md$/,
    /^NAVIGATION_.*\.md$/,
    /^RTL_.*\.md$/,
    /^SUPABASE_.*\.md$/,
    /^TECHNICAL_.*\.md$/,
    /^ACCESSIBILITY.*\.md$/,
    /^QA_.*\.md$/,
    /^ADMIN_DASHBOARD_.*\.js$/
  ],
  [FILE_CATEGORIES.SYSTEM_FILE]: [
    /^\.DS_Store$/
  ],
  [FILE_CATEGORIES.BUILD_OUTPUT]: [
    /^dist$/
  ],
  [FILE_CATEGORIES.EXTERNAL_SERVICE]: [
    /^mcp-supabase-server$/
  ]
}

/**
 * Essential files and directories that should never be deleted
 */
const ESSENTIAL_PATTERNS = [
  /^src\//,
  /^public\//,
  /^e2e\//,
  /^scripts\//,
  /^supabase\//,
  /^\.kiro\//,
  /^node_modules\//,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^vite\.config\.js$/,
  /^tailwind\.config\.js$/,
  /^eslint\.config\.js$/,
  /^playwright\.config\.js$/,
  /^postcss\.config\.js$/,
  /^vitest\.config\.js$/,
  /^jsconfig\.json$/,
  /^components\.json$/,
  /^index\.html$/,
  /^\.env$/,
  /^\.env\.example$/,
  /^\.gitignore$/,
  /^README\.md$/
]

class ProjectAnalyzer {
  constructor() {
    this.projectStructure = {
      rootFiles: [],
      directories: [],
      totalSize: 0,
      fileCount: 0
    }
    this.categorizedFiles = new Map()
  }

  /**
   * Scan the entire project structure
   */
  async scanProject() {
    console.log('🔍 Scanning project structure...')
    
    try {
      const items = await fs.readdir(projectRoot, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = path.join(projectRoot, item.name)
        const relativePath = item.name
        
        if (item.isDirectory()) {
          this.projectStructure.directories.push({
            path: relativePath,
            name: item.name,
            category: this.categorizeItem(relativePath, true)
          })
        } else {
          const stats = await fs.stat(itemPath)
          const fileInfo = {
            path: relativePath,
            name: item.name,
            size: stats.size,
            lastModified: stats.mtime,
            category: this.categorizeItem(relativePath, false),
            isEssential: this.isEssential(relativePath)
          }
          
          this.projectStructure.rootFiles.push(fileInfo)
          this.projectStructure.totalSize += stats.size
          this.projectStructure.fileCount++
        }
      }
      
      console.log(`✅ Scanned ${this.projectStructure.fileCount} files and ${this.projectStructure.directories.length} directories`)
      return this.projectStructure
      
    } catch (error) {
      console.error('❌ Error scanning project:', error.message)
      throw error
    }
  }

  /**
   * Categorize a file or directory
   */
  categorizeItem(itemPath, isDirectory) {
    // Check if essential first
    if (this.isEssential(itemPath)) {
      return FILE_CATEGORIES.ESSENTIAL
    }

    // Check each category pattern
    for (const [category, patterns] of Object.entries(FILE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(itemPath)) {
          return category
        }
      }
    }

    return FILE_CATEGORIES.UNKNOWN
  }

  /**
   * Check if a file/directory is essential and should not be deleted
   */
  isEssential(itemPath) {
    return ESSENTIAL_PATTERNS.some(pattern => pattern.test(itemPath))
  }

  /**
   * Generate categorized file lists
   */
  categorizeFiles() {
    console.log('📊 Categorizing files...')
    
    // Categorize files
    for (const file of this.projectStructure.rootFiles) {
      if (!this.categorizedFiles.has(file.category)) {
        this.categorizedFiles.set(file.category, [])
      }
      this.categorizedFiles.get(file.category).push(file)
    }

    // Categorize directories
    for (const dir of this.projectStructure.directories) {
      if (!this.categorizedFiles.has(dir.category)) {
        this.categorizedFiles.set(dir.category, [])
      }
      this.categorizedFiles.get(dir.category).push(dir)
    }

    return this.categorizedFiles
  }

  /**
   * Generate files safe for deletion
   */
  getFilesForDeletion() {
    const filesToDelete = []
    const dangerousCategories = [
      FILE_CATEGORIES.TEMPORARY_TEST,
      FILE_CATEGORIES.TEMPORARY_REPORT,
      FILE_CATEGORIES.SYSTEM_FILE,
      FILE_CATEGORIES.BUILD_OUTPUT,
      FILE_CATEGORIES.EXTERNAL_SERVICE
    ]

    for (const category of dangerousCategories) {
      const files = this.categorizedFiles.get(category) || []
      filesToDelete.push(...files.map(f => f.path))
    }

    return filesToDelete
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📋 PROJECT CLEANUP ANALYSIS REPORT')
    console.log('=' .repeat(50))
    
    console.log(`\n📁 Project Overview:`)
    console.log(`   Total files: ${this.projectStructure.fileCount}`)
    console.log(`   Total directories: ${this.projectStructure.directories.length}`)
    console.log(`   Total size: ${(this.projectStructure.totalSize / 1024 / 1024).toFixed(2)} MB`)

    console.log(`\n🗂️  File Categories:`)
    for (const [category, files] of this.categorizedFiles) {
      console.log(`   ${category}: ${files.length} items`)
      if (files.length > 0 && files.length <= 10) {
        files.forEach(f => console.log(`     - ${f.path || f.name}`))
      } else if (files.length > 10) {
        files.slice(0, 5).forEach(f => console.log(`     - ${f.path || f.name}`))
        console.log(`     ... and ${files.length - 5} more`)
      }
    }

    const filesToDelete = this.getFilesForDeletion()
    console.log(`\n🗑️  Files marked for deletion: ${filesToDelete.length}`)
    filesToDelete.forEach(file => console.log(`   - ${file}`))

    const essentialFiles = this.categorizedFiles.get(FILE_CATEGORIES.ESSENTIAL) || []
    console.log(`\n🛡️  Essential files (protected): ${essentialFiles.length}`)
    
    return {
      totalFiles: this.projectStructure.fileCount,
      totalDirectories: this.projectStructure.directories.length,
      filesToDelete: filesToDelete,
      categorizedFiles: Object.fromEntries(this.categorizedFiles)
    }
  }
}

class SafeDeleter {
  constructor() {
    this.backupDir = path.join(projectRoot, '.cleanup-backup')
    this.deletionLog = []
  }

  /**
   * Create backup of files before deletion
   */
  async createBackup(filesToDelete) {
    console.log('💾 Creating backup before deletion...')
    
    try {
      // Create backup directory
      await fs.mkdir(this.backupDir, { recursive: true })
      
      const backupManifest = {
        timestamp: new Date().toISOString(),
        files: [],
        directories: []
      }

      for (const filePath of filesToDelete) {
        const fullPath = path.join(projectRoot, filePath)
        const backupPath = path.join(this.backupDir, filePath)
        
        try {
          const stats = await fs.stat(fullPath)
          
          if (stats.isDirectory()) {
            // Backup entire directory
            await this.copyDirectory(fullPath, backupPath)
            backupManifest.directories.push({
              original: filePath,
              backup: path.relative(projectRoot, backupPath),
              size: await this.getDirectorySize(fullPath)
            })
          } else {
            // Backup single file
            await fs.mkdir(path.dirname(backupPath), { recursive: true })
            await fs.copyFile(fullPath, backupPath)
            backupManifest.files.push({
              original: filePath,
              backup: path.relative(projectRoot, backupPath),
              size: stats.size
            })
          }
        } catch (error) {
          console.warn(`⚠️  Could not backup ${filePath}: ${error.message}`)
        }
      }

      // Save backup manifest
      await fs.writeFile(
        path.join(this.backupDir, 'manifest.json'),
        JSON.stringify(backupManifest, null, 2)
      )

      console.log(`✅ Backup created with ${backupManifest.files.length} files and ${backupManifest.directories.length} directories`)
      return { success: true, manifest: backupManifest }
      
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true })
    const items = await fs.readdir(src, { withFileTypes: true })
    
    for (const item of items) {
      const srcPath = path.join(src, item.name)
      const destPath = path.join(dest, item.name)
      
      if (item.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath)
        } else {
          const stats = await fs.stat(itemPath)
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.warn(`Could not calculate size for ${dirPath}:`, error.message)
    }
    
    return totalSize
  }

  /**
   * Delete files safely with logging
   */
  async deleteFiles(filesToDelete) {
    console.log(`🗑️  Starting deletion of ${filesToDelete.length} items...`)
    
    const results = {
      deleted: [],
      failed: [],
      totalSize: 0
    }

    for (const filePath of filesToDelete) {
      const fullPath = path.join(projectRoot, filePath)
      
      try {
        const stats = await fs.stat(fullPath)
        
        if (stats.isDirectory()) {
          const size = await this.getDirectorySize(fullPath)
          await fs.rm(fullPath, { recursive: true, force: true })
          results.deleted.push({ path: filePath, type: 'directory', size })
          results.totalSize += size
          console.log(`   ✅ Deleted directory: ${filePath}`)
        } else {
          await fs.unlink(fullPath)
          results.deleted.push({ path: filePath, type: 'file', size: stats.size })
          results.totalSize += stats.size
          console.log(`   ✅ Deleted file: ${filePath}`)
        }
        
        this.deletionLog.push({
          path: filePath,
          timestamp: new Date().toISOString(),
          success: true
        })
        
      } catch (error) {
        results.failed.push({ path: filePath, error: error.message })
        console.error(`   ❌ Failed to delete ${filePath}: ${error.message}`)
        
        this.deletionLog.push({
          path: filePath,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        })
      }
    }

    // Save deletion log
    await fs.writeFile(
      path.join(this.backupDir, 'deletion-log.json'),
      JSON.stringify(this.deletionLog, null, 2)
    )

    console.log(`\n📊 Deletion Summary:`)
    console.log(`   ✅ Successfully deleted: ${results.deleted.length} items`)
    console.log(`   ❌ Failed to delete: ${results.failed.length} items`)
    console.log(`   💾 Space freed: ${(results.totalSize / 1024 / 1024).toFixed(2)} MB`)

    return results
  }

  /**
   * Rollback deletion using backup
   */
  async rollback() {
    console.log('🔄 Starting rollback from backup...')
    
    try {
      const manifestPath = path.join(this.backupDir, 'manifest.json')
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
      
      let restored = 0
      
      // Restore files
      for (const fileInfo of manifest.files) {
        const backupPath = path.join(projectRoot, fileInfo.backup)
        const originalPath = path.join(projectRoot, fileInfo.original)
        
        try {
          await fs.mkdir(path.dirname(originalPath), { recursive: true })
          await fs.copyFile(backupPath, originalPath)
          restored++
          console.log(`   ✅ Restored: ${fileInfo.original}`)
        } catch (error) {
          console.error(`   ❌ Failed to restore ${fileInfo.original}: ${error.message}`)
        }
      }
      
      // Restore directories
      for (const dirInfo of manifest.directories) {
        const backupPath = path.join(projectRoot, dirInfo.backup)
        const originalPath = path.join(projectRoot, dirInfo.original)
        
        try {
          await this.copyDirectory(backupPath, originalPath)
          restored++
          console.log(`   ✅ Restored directory: ${dirInfo.original}`)
        } catch (error) {
          console.error(`   ❌ Failed to restore directory ${dirInfo.original}: ${error.message}`)
        }
      }
      
      console.log(`✅ Rollback complete! Restored ${restored} items`)
      return { success: true, restored }
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clean up backup directory
   */
  async cleanupBackup() {
    try {
      await fs.rm(this.backupDir, { recursive: true, force: true })
      console.log('🧹 Backup directory cleaned up')
    } catch (error) {
      console.warn('⚠️  Could not clean backup directory:', error.message)
    }
  }
}

// Export for use in other modules
export { ProjectAnalyzer, SafeDeleter, FILE_CATEGORIES }

// Run analysis if called directly
if (process.argv[1] && process.argv[1].endsWith('project-cleanup.js')) {
  const shouldDelete = process.argv.includes('--delete')
  const shouldRollback = process.argv.includes('--rollback')
  const shouldCleanBackup = process.argv.includes('--clean-backup')
  
  const analyzer = new ProjectAnalyzer()
  const deleter = new SafeDeleter()
  
  try {
    if (shouldRollback) {
      console.log('🔄 ROLLBACK MODE')
      const result = await deleter.rollback()
      if (result.success) {
        console.log('✅ Rollback completed successfully!')
      } else {
        console.error('❌ Rollback failed!')
        process.exit(1)
      }
    }
    
    if (shouldCleanBackup) {
      console.log('🧹 CLEANUP BACKUP MODE')
      await deleter.cleanupBackup()
    } else {
    
    await analyzer.scanProject()
    analyzer.categorizeFiles()
    const report = analyzer.generateReport()
    
    if (shouldDelete) {
      console.log('\n🚨 DELETION MODE ACTIVATED')
      console.log('This will permanently delete the identified files!')
      
      // Create backup first
      const backupResult = await deleter.createBackup(report.filesToDelete)
      if (!backupResult.success) {
        console.error('❌ Backup failed! Aborting deletion.')
        process.exit(1)
      }
      
      // Proceed with deletion
      const deletionResult = await deleter.deleteFiles(report.filesToDelete)
      
      if (deletionResult.failed.length > 0) {
        console.log('\n⚠️  Some files could not be deleted. Check the log for details.')
        console.log('You can run --rollback to restore all files if needed.')
      } else {
        console.log('\n🎉 Cleanup completed successfully!')
        console.log('Backup is available in .cleanup-backup/ directory')
        console.log('Run with --rollback to restore files if needed')
        console.log('Run with --clean-backup to remove backup when satisfied')
      }
      
    } else {
      console.log('\n✅ Analysis complete!')
      console.log(`Run with --delete flag to proceed with cleanup`)
      console.log(`Run with --rollback flag to restore from backup`)
      console.log(`Run with --clean-backup flag to remove backup directory`)
    }
    }
    
  } catch (error) {
    console.error('❌ Operation failed:', error.message)
    process.exit(1)
  }
}