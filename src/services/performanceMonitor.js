/**
 * Performance monitoring service for frontend optimization
 * Tracks Core Web Vitals, component performance, and user experience metrics
 */

import { 
  handleApiError, 
  logError, 
  createSuccessResponse 
} from '@/utils/errorHandler'

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
    this.isInitialized = false
    this.config = {
      enableLogging: process.env.NODE_ENV === 'development',
      enableAnalytics: true,
      sampleRate: 1.0, // 100% sampling in development
      thresholds: {
        LCP: 2500, // Largest Contentful Paint
        FID: 100,  // First Input Delay
        CLS: 0.1,  // Cumulative Layout Shift
        FCP: 1800, // First Contentful Paint
        TTFB: 800  // Time to First Byte
      }
    }
  }

  /**
   * Initialize performance monitoring
   */
  initialize() {
    if (this.isInitialized) return

    try {
      this.setupCoreWebVitals()
      this.setupNavigationTiming()
      this.setupResourceTiming()
      this.setupUserTiming()
      this.setupMemoryMonitoring()
      this.setupNetworkMonitoring()
      
      this.isInitialized = true
      this.log('Performance monitoring initialized')
    } catch (error) {
      logError(error, 'performanceMonitor.initialize')
    }
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  setupCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url,
        size: lastEntry.size
      })
    })

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      entries.forEach(entry => {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target?.tagName
        })
      })
    })

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      if (clsValue > 0) {
        this.recordMetric('CLS', clsValue)
      }
    })

    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime)
        }
      })
    })
  }

  /**
   * Setup navigation timing monitoring
   */
  setupNavigationTiming() {
    if (!window.performance?.getEntriesByType) return

    const navigationEntries = window.performance.getEntriesByType('navigation')
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0]
      
      // Time to First Byte
      this.recordMetric('TTFB', nav.responseStart - nav.requestStart)
      
      // DOM Content Loaded
      this.recordMetric('DOMContentLoaded', nav.domContentLoadedEventEnd - nav.navigationStart)
      
      // Load Complete
      this.recordMetric('LoadComplete', nav.loadEventEnd - nav.navigationStart)
      
      // DNS Lookup Time
      this.recordMetric('DNSLookup', nav.domainLookupEnd - nav.domainLookupStart)
      
      // TCP Connection Time
      this.recordMetric('TCPConnection', nav.connectEnd - nav.connectStart)
      
      // Server Response Time
      this.recordMetric('ServerResponse', nav.responseEnd - nav.responseStart)
    }
  }

  /**
   * Setup resource timing monitoring
   */
  setupResourceTiming() {
    this.observePerformanceEntry('resource', (entries) => {
      entries.forEach(entry => {
        const resourceType = this.getResourceType(entry.name)
        const loadTime = entry.responseEnd - entry.startTime
        
        this.recordMetric(`Resource_${resourceType}`, loadTime, {
          name: entry.name,
          size: entry.transferSize,
          cached: entry.transferSize === 0
        })
      })
    })
  }

  /**
   * Setup user timing monitoring
   */
  setupUserTiming() {
    this.observePerformanceEntry('measure', (entries) => {
      entries.forEach(entry => {
        this.recordMetric(`UserTiming_${entry.name}`, entry.duration, {
          startTime: entry.startTime
        })
      })
    })
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if (!window.performance?.memory) return

    const checkMemory = () => {
      const memory = window.performance.memory
      this.recordMetric('MemoryUsage', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      })
    }

    // Check memory usage every 30 seconds
    setInterval(checkMemory, 30000)
    checkMemory() // Initial check
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    if (!navigator.connection) return

    const connection = navigator.connection
    this.recordMetric('NetworkInfo', 0, {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    })

    // Monitor connection changes
    connection.addEventListener('change', () => {
      this.recordMetric('NetworkChange', 0, {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      })
    })
  }

  /**
   * Observe performance entries
   */
  observePerformanceEntry(type, callback) {
    try {
      if (!window.PerformanceObserver) return

      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries())
      })

      observer.observe({ type, buffered: true })
      this.observers.set(type, observer)
    } catch (error) {
      this.log(`Failed to observe ${type}:`, error)
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata
    }

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name).push(metric)

    // Check thresholds and log warnings
    this.checkThreshold(name, value)

    // Send to analytics if enabled
    if (this.config.enableAnalytics) {
      this.sendToAnalytics(metric)
    }

    // Log if enabled
    if (this.config.enableLogging) {
      this.log(`${name}: ${value}ms`, metadata)
    }
  }

  /**
   * Check performance thresholds
   */
  checkThreshold(name, value) {
    const threshold = this.config.thresholds[name]
    if (threshold && value > threshold) {
      const message = `Performance threshold exceeded: ${name} (${value}ms > ${threshold}ms)`
      console.warn(message)
      
      // Log to error handler
      logError(new Error(message), 'performance_threshold', {
        metric: name,
        value,
        threshold
      })
    }
  }

  /**
   * Send metrics to analytics
   */
  sendToAnalytics(metric) {
    try {
      // Send to Google Analytics if available
      if (window.gtag) {
        window.gtag('event', 'performance_metric', {
          metric_name: metric.name,
          metric_value: Math.round(metric.value),
          custom_map: {
            metric_name: metric.name
          }
        })
      }

      // Send to custom analytics endpoint
      if (window.analytics?.track) {
        window.analytics.track('Performance Metric', {
          name: metric.name,
          value: metric.value,
          ...metric.metadata
        })
      }
    } catch (error) {
      this.log('Failed to send analytics:', error)
    }
  }

  /**
   * Mark performance timing
   */
  mark(name) {
    try {
      window.performance?.mark(name)
    } catch (error) {
      this.log(`Failed to mark ${name}:`, error)
    }
  }

  /**
   * Measure performance between marks
   */
  measure(name, startMark, endMark) {
    try {
      window.performance?.measure(name, startMark, endMark)
    } catch (error) {
      this.log(`Failed to measure ${name}:`, error)
    }
  }

  /**
   * Time a function execution
   */
  timeFunction(name, fn) {
    const startTime = performance.now()
    
    try {
      const result = fn()
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const endTime = performance.now()
          this.recordMetric(`Function_${name}`, endTime - startTime)
        })
      } else {
        const endTime = performance.now()
        this.recordMetric(`Function_${name}`, endTime - startTime)
        return result
      }
    } catch (error) {
      const endTime = performance.now()
      this.recordMetric(`Function_${name}_Error`, endTime - startTime)
      throw error
    }
  }

  /**
   * Monitor component render performance
   */
  monitorComponent(componentName, renderFn) {
    return (...args) => {
      const startTime = performance.now()
      
      try {
        const result = renderFn(...args)
        const endTime = performance.now()
        
        this.recordMetric(`Component_${componentName}`, endTime - startTime)
        return result
      } catch (error) {
        const endTime = performance.now()
        this.recordMetric(`Component_${componentName}_Error`, endTime - startTime)
        throw error
      }
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      coreWebVitals: {},
      navigation: {},
      resources: {},
      memory: {},
      network: {}
    }

    // Core Web Vitals
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(metric => {
      const values = this.metrics.get(metric)
      if (values && values.length > 0) {
        const latest = values[values.length - 1]
        summary.coreWebVitals[metric] = {
          value: latest.value,
          rating: this.getRating(metric, latest.value),
          timestamp: latest.timestamp
        }
      }
    })

    // Navigation timing
    ['DOMContentLoaded', 'LoadComplete', 'DNSLookup', 'TCPConnection', 'ServerResponse'].forEach(metric => {
      const values = this.metrics.get(metric)
      if (values && values.length > 0) {
        summary.navigation[metric] = values[values.length - 1].value
      }
    })

    // Resource timing summary
    const resourceMetrics = Array.from(this.metrics.keys()).filter(key => key.startsWith('Resource_'))
    resourceMetrics.forEach(metric => {
      const values = this.metrics.get(metric)
      if (values && values.length > 0) {
        const resourceType = metric.replace('Resource_', '')
        summary.resources[resourceType] = {
          count: values.length,
          avgLoadTime: values.reduce((sum, v) => sum + v.value, 0) / values.length,
          totalSize: values.reduce((sum, v) => sum + (v.metadata.size || 0), 0)
        }
      }
    })

    return summary
  }

  /**
   * Get performance rating
   */
  getRating(metric, value) {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    }

    const threshold = thresholds[metric]
    if (!threshold) return 'unknown'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.match(/\.(css)$/i)) return 'CSS'
    if (url.match(/\.(js|jsx|ts|tsx)$/i)) return 'JavaScript'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'Image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'Font'
    if (url.includes('/api/')) return 'API'
    return 'Other'
  }

  /**
   * Export metrics data
   */
  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: Object.fromEntries(this.metrics),
      summary: this.getSummary()
    }

    return data
  }

  /**
   * Clear metrics data
   */
  clearMetrics() {
    this.metrics.clear()
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        this.log('Failed to disconnect observer:', error)
      }
    })
    this.observers.clear()
    this.isInitialized = false
  }

  /**
   * Log message
   */
  log(message, data = null) {
    if (this.config.enableLogging) {
      console.log(`[PerformanceMonitor] ${message}`, data)
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName) => {
  const [metrics, setMetrics] = useState({})

  useEffect(() => {
    if (!performanceMonitor.isInitialized) {
      performanceMonitor.initialize()
    }

    const startTime = performance.now()
    performanceMonitor.mark(`${componentName}_mount_start`)

    return () => {
      const endTime = performance.now()
      performanceMonitor.mark(`${componentName}_mount_end`)
      performanceMonitor.measure(`${componentName}_mount`, `${componentName}_mount_start`, `${componentName}_mount_end`)
      
      const mountTime = endTime - startTime
      performanceMonitor.recordMetric(`Component_${componentName}_Mount`, mountTime)
      
      setMetrics(performanceMonitor.getSummary())
    }
  }, [componentName])

  return metrics
}

// Performance monitoring service
export const performanceMonitorService = {
  /**
   * Initialize monitoring
   */
  initialize() {
    performanceMonitor.initialize()
  },

  /**
   * Record custom metric
   */
  recordMetric(name, value, metadata = {}) {
    performanceMonitor.recordMetric(name, value, metadata)
  },

  /**
   * Mark performance point
   */
  mark(name) {
    performanceMonitor.mark(name)
  },

  /**
   * Measure between marks
   */
  measure(name, startMark, endMark) {
    performanceMonitor.measure(name, startMark, endMark)
  },

  /**
   * Time function execution
   */
  timeFunction(name, fn) {
    return performanceMonitor.timeFunction(name, fn)
  },

  /**
   * Monitor component performance
   */
  monitorComponent(componentName, renderFn) {
    return performanceMonitor.monitorComponent(componentName, renderFn)
  },

  /**
   * Get performance summary
   */
  getSummary() {
    return performanceMonitor.getSummary()
  },

  /**
   * Export all metrics
   */
  exportMetrics() {
    return performanceMonitor.exportMetrics()
  },

  /**
   * Clear metrics
   */
  clearMetrics() {
    performanceMonitor.clearMetrics()
  },

  /**
   * Cleanup
   */
  cleanup() {
    performanceMonitor.cleanup()
  }
}

export default performanceMonitorService