/**
 * Real-time Performance Monitoring Service
 * Tracks Core Web Vitals, custom metrics, and triggers alerts
 */

import loggingService from '../logging/LoggingService.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.observers = new Map();
    this.isMonitoring = false;
    
    this.thresholds = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      ttfb: 600,
      memory: 50 * 1024 * 1024,
      renderTime: 16
    };
    
    this.alertCallbacks = [];
    this.metricCallbacks = [];
    
    this.initializeMonitoring();
  }

  /**
   * Initialize all performance monitoring
   */
  initializeMonitoring() {
    if (typeof window === 'undefined') return;
    
    this.isMonitoring = true;
    
    // Core Web Vitals monitoring
    this.initializeCoreWebVitals();
    
    // Memory monitoring
    this.initializeMemoryMonitoring();
    
    // Start periodic monitoring
    this.startPeriodicMonitoring();
    
    loggingService.info('Performance monitoring initialized');
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  initializeCoreWebVitals() {
    if (!('PerformanceObserver' in window)) {
      loggingService.warn('PerformanceObserver not supported');
      return;
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.recordMetric('lcp', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url
      });
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('lcp', lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        const fid = entry.processingStart - entry.startTime;
        
        this.recordMetric('fid', fid, {
          inputType: entry.name,
          target: entry.target?.tagName
        });
      });
    });
    
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.set('fid', fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.recordMetric('cls', clsValue);
    });
    
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('cls', clsObserver);
  }

  /**
   * Initialize memory monitoring
   */
  initializeMemoryMonitoring() {
    if (!performance.memory) {
      loggingService.warn('Memory API not supported');
      return;
    }

    setInterval(() => {
      const memory = performance.memory;
      
      this.recordMetric('memory.used', memory.usedJSHeapSize);
      this.recordMetric('memory.total', memory.totalJSHeapSize);
      this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
      
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory.usage_percent', usagePercent);
      
    }, 5000);
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      name,
      value,
      timestamp,
      metadata
    };
    
    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricHistory = this.metrics.get(name);
    metricHistory.push(metric);
    
    // Keep only last 100 entries per metric
    if (metricHistory.length > 100) {
      metricHistory.shift();
    }
    
    // Check thresholds and trigger alerts
    this.checkThresholds(metric);
    
    // Notify metric callbacks
    this.notifyMetricCallbacks(metric);
    
    // Log significant metrics
    if (this.isSignificantMetric(name, value)) {
      loggingService.info(`Performance Metric: ${name}`, {
        value,
        metadata,
        timestamp
      });
    }
  }

  /**
   * Check if metric exceeds thresholds
   */
  checkThresholds(metric) {
    const { name, value, metadata } = metric;
    const threshold = this.thresholds[name];
    
    if (threshold && value > threshold) {
      this.triggerAlert({
        type: 'threshold_exceeded',
        metric: name,
        value,
        threshold,
        metadata,
        timestamp: Date.now(),
        severity: this.calculateSeverity(name, value, threshold)
      });
    }
  }

  /**
   * Calculate alert severity
   */
  calculateSeverity(metricName, value, threshold) {
    const ratio = value / threshold;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(alert) {
    this.alerts.push(alert);
    
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    loggingService.warn(`Performance Alert: ${alert.type}`, alert);
    this.notifyAlertCallbacks(alert);
  }

  /**
   * Check if metric is significant enough to log
   */
  isSignificantMetric(name, value) {
    const significantMetrics = ['lcp', 'fid', 'cls', 'ttfb'];
    return significantMetrics.includes(name) || 
           name.includes('error') || 
           name.includes('alert');
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    setInterval(() => {
      this.generatePerformanceReport();
    }, 60000);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      metrics: this.getMetricsSummary(),
      alerts: this.getRecentAlerts(),
      health: this.calculateHealthScore()
    };
    
    loggingService.info('Performance Report', report);
    return report;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const summary = {};
    
    for (const [name, history] of this.metrics) {
      if (history.length === 0) continue;
      
      const values = history.map(m => m.value);
      summary[name] = {
        current: values[values.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    }
    
    return summary;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore() {
    let score = 100;
    const recentAlerts = this.getRecentAlerts();
    
    recentAlerts.forEach(alert => {
      switch (alert.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Subscribe to metric updates
   */
  onMetric(callback) {
    this.metricCallbacks.push(callback);
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Notify metric callbacks
   */
  notifyMetricCallbacks(metric) {
    this.metricCallbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        loggingService.error('Metric callback error', error);
      }
    });
  }

  /**
   * Notify alert callbacks
   */
  notifyAlertCallbacks(alert) {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        loggingService.error('Alert callback error', error);
      }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get current alerts
   */
  getAlerts() {
    return [...this.alerts];
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;