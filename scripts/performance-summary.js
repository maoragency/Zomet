#!/usr/bin/env node

import { PerformanceAnalyzer } from './performance-analyzer.js'

/**
 * Performance Summary Script
 * Provides a quick overview of performance metrics
 */

async function runPerformanceSummary() {
  console.log('🚀 Running Performance Summary Analysis...\n')
  
  try {
    const analyzer = new PerformanceAnalyzer()
    const results = await analyzer.runCompleteAnalysis()
    
    // Generate quick summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 QUICK PERFORMANCE SUMMARY')
    console.log('='.repeat(60))
    
    // Key metrics
    console.log(`\n🎯 Performance Score: ${results.overallScore}/100`)
    console.log(`📦 Bundle Size: ${formatBytes(results.bundleAnalysis.gzippedSize)} (gzipped)`)
    console.log(`⚛️  React Issues: ${results.reactPerformance.antiPatterns.length}`)
    console.log(`🖼️  Asset Issues: ${results.assetOptimization.unoptimizedImages.length + results.assetOptimization.compressionOpportunities.length}`)
    
    // Core Web Vitals
    console.log(`\n📊 Core Web Vitals:`)
    console.log(`   LCP: ${results.coreWebVitals.lcp}ms ${getStatus(results.coreWebVitals.lcp, 2500, 4000)}`)
    console.log(`   FID: ${results.coreWebVitals.fid}ms ${getStatus(results.coreWebVitals.fid, 100, 300)}`)
    console.log(`   CLS: ${results.coreWebVitals.cls} ${getStatus(results.coreWebVitals.cls, 0.1, 0.25)}`)
    
    // Top 3 recommendations
    console.log(`\n🎯 Top 3 Recommendations:`)
    const topRecs = results.recommendations.slice(0, 3)
    topRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`)
    })
    
    // Next steps
    console.log(`\n📋 Next Steps:`)
    const criticalCount = results.recommendations.filter(r => r.priority === 'critical').length
    const highCount = results.recommendations.filter(r => r.priority === 'high').length
    
    if (criticalCount > 0) {
      console.log(`   🚨 Address ${criticalCount} critical issues immediately`)
    }
    if (highCount > 0) {
      console.log(`   ⚠️  Fix ${highCount} high priority issues`)
    }
    console.log(`   📊 Review detailed report: performance-analysis-report.json`)
    
    console.log(`\n✅ Summary completed! Run 'npm run performance:analyze' for full details.`)
    
  } catch (error) {
    console.error('❌ Performance summary failed:', error.message)
    process.exit(1)
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStatus(value, good, needsImprovement) {
  if (value <= good) return '✅'
  if (value <= needsImprovement) return '⚠️'
  return '❌'
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('performance-summary.js')) {
  runPerformanceSummary()
}

export { runPerformanceSummary }