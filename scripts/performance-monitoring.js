#!/usr/bin/env node

/**
 * Real-time Performance Monitoring with Alerting
 * Implements comprehensive performance monitoring and alerting system
 */

import fs from 'fs/promises';
import path from 'path';

class PerformanceMonitoringImplementer {
  constructor() {
    this.thresholds = {
      lcp: 2500, // Largest Contentful Paint (ms)
      fid: 100,  // First Input Delay (ms)
      cls: 0.1,  // Cumulative Layout Shift
      ttfb: 600, // Time to First Byte (ms)
      memory: 50 * 1024 * 1024, // 50MB
      renderTime: 16 // 16ms for 60fps
    };
  }

  /**
   * Create performance monitoring service
   */
  async createPerformanceMonitor() {
    const monitorPath = path.join(process.cwd(), 'src/services/monitoring/PerformanceMonitor.js');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(monitorPath), { recursive: true });
    
    const monitorContent = `/**
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
    
    // Network monitoring
    this.initializeNetworkMonitoring();
    
    // Custom metrics monitoring
    this.initializeCustomMetrics();
    
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

    // Time to First Byte (TTFB)
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        const ttfb = entry.responseStart - entry.requestStart;
        
        this.recordMetric('ttfb', ttfb, {
          type: entry.type,
          redirectCount: entry.redirectCount
        });
      });
    });
    
    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.set('navigation', navigationObserver);
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
      
      // Calculate memory usage percentage
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory.usage_percent', usagePercent);
      
    }, 5000); // Check every 5 seconds
  }

  /**
   * Initialize network monitoring
   */
  initializeNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('network.request_duration', duration, {
          url: typeof url === 'string' ? url : url.url,
          status: response.status,
          method: args[1]?.method || 'GET'
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('network.request_error', duration, {
          url: typeof url === 'string' ? url : url.url,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  /**
   * Initialize custom metrics monitoring
   */
  initializeCustomMetrics() {
    // Monitor React render times
    if (window.React) {
      this.monitorReactPerformance();
    }
    
    // Monitor route changes
    this.monitorRouteChanges();
    
    // Monitor user interactions
    this.monitorUserInteractions();
  }

  /**
   * Monitor React component performance
   */
  monitorReactPerformance() {
    // This would integrate with React DevTools Profiler
    // For now, we'll track render times manually
    
    const originalRender = React.Component.prototype.render;
    const self = this;
    
    React.Component.prototype.render = function() {
      const startTime = performance.now();
      const result = originalRender.call(this);
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      self.recordMetric('react.render_time', renderTime, {
        component: this.constructor.name
      });
      
      return result;
    };
  }

  /**
   * Monitor route changes
   */
  monitorRouteChanges() {
    let currentPath = window.location.pathname;
    let routeStartTime = performance.now();
    
    // Monitor history changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const trackRouteChange = (newPath) => {
      const routeEndTime = performance.now();
      const routeDuration = routeEndTime - routeStartTime;
      
      this.recordMetric('route.duration', routeDuration, {
        from: currentPath,
        to: newPath
      });
      
      currentPath = newPath;
      routeStartTime = routeEndTime;
    };
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      trackRouteChange(window.location.pathname);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      trackRouteChange(window.location.pathname);
    };
    
    window.addEventListener('popstate', () => {
      trackRouteChange(window.location.pathname);
    });
  }

  /**
   * Monitor user interactions
   */
  monitorUserInteractions() {
    const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        this.recordMetric(\`interaction.\${type}\`, performance.now(), {
          target: event.target?.tagName,
          x: event.clientX,
          y: event.clientY
        });
      }, { passive: true });
    });
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
      loggingService.info(\`Performance Metric: \${name}\`, {
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
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    // Log alert
    loggingService.warn(\`Performance Alert: \${alert.type}\`, alert);
    
    // Notify alert callbacks
    this.notifyAlertCallbacks(alert);
    
    // Send to remote monitoring if configured
    this.sendAlertToRemote(alert);
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
    // Generate performance report every minute
    setInterval(() => {
      this.generatePerformanceReport();
    }, 60000);
    
    // Clean old metrics every 5 minutes
    setInterval(() => {
      this.cleanOldMetrics();
    }, 300000);
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
    
    // Deduct points for alerts
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
   * Clean old metrics
   */
  cleanOldMetrics() {
    const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
    
    for (const [name, history] of this.metrics) {
      const filtered = history.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
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
   * Send alert to remote monitoring service
   */
  async sendAlertToRemote(alert) {
    if (!import.meta.env.VITE_MONITORING_ENDPOINT) return;
    
    try {
      await fetch(import.meta.env.VITE_MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_alert',
          alert,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      loggingService.error('Failed to send alert to remote', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    
    // Disconnect all observers
    for (const [name, observer] of this.observers) {
      observer.disconnect();
    }
    
    this.observers.clear();
    loggingService.info('Performance monitoring stopped');
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

export default performanceMonitor;`;

    await fs.writeFile(monitorPath, monitorContent);
    console.log('✅ Created performance monitoring service');
  }

  /**
   * Create performance dashboard component
   */
  async createPerformanceDashboard() {
    const dashboardPath = path.join(process.cwd(), 'src/components/monitoring/PerformanceDashboard.jsx');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(dashboardPath), { recursive: true });
    
    const dashboardContent = `import React, { useState, useEffect } from 'react';
import performanceMonitor from '../../services/monitoring/PerformanceMonitor.js';

/**
 * Performance Dashboard Component
 * Real-time performance metrics and alerts display
 */
export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [healthScore, setHealthScore] = useState(100);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    if (import.meta.env.MODE !== 'development' && !import.meta.env.VITE_SHOW_PERFORMANCE_DASHBOARD) {
      return;
    }

    // Subscribe to performance updates
    const handleMetric = (metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric
      }));
    };

    const handleAlert = (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    };

    performanceMonitor.onMetric(handleMetric);
    performanceMonitor.onAlert(handleAlert);

    // Update dashboard every 5 seconds
    const interval = setInterval(() => {
      const report = performanceMonitor.generatePerformanceReport();
      setHealthScore(report.health);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (import.meta.env.MODE !== 'development' && !import.meta.env.VITE_SHOW_PERFORMANCE_DASHBOARD) {
    return null;
  }

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatValue = (name, value) => {
    if (name.includes('time') || name.includes('duration')) {
      return \`\${Math.round(value)}ms\`;
    }
    if (name.includes('memory')) {
      return \`\${Math.round(value / 1024 / 1024)}MB\`;
    }
    if (name === 'cls') {
      return value.toFixed(3);
    }
    return Math.round(value);
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={\`px-3 py-2 rounded-lg shadow-lg text-white font-medium transition-colors \${
          healthScore >= 90 ? 'bg-green-500 hover:bg-green-600' :
          healthScore >= 70 ? 'bg-yellow-500 hover:bg-yellow-600' :
          healthScore >= 50 ? 'bg-orange-500 hover:bg-orange-600' :
          'bg-red-500 hover:bg-red-600'
        }\`}
      >
        Performance: {healthScore}%
      </button>

      {isVisible && (
        <div className="absolute top-12 left-0 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-xl">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">Performance Dashboard</h3>
            <div className={\`text-sm font-medium \${getHealthColor(healthScore)}\`}>
              Health Score: {healthScore}%
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2">Core Web Vitals</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {['lcp', 'fid', 'cls', 'ttfb'].map(metric => (
                <div key={metric} className="flex justify-between">
                  <span className="text-gray-600">{metric.toUpperCase()}:</span>
                  <span className="font-mono">
                    {metrics[metric] ? formatValue(metric, metrics[metric].value) : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Usage */}
          {metrics['memory.used'] && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-mono">
                    {formatValue('memory', metrics['memory.used'].value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-mono">
                    {metrics['memory.usage_percent'] ? 
                      \`\${Math.round(metrics['memory.usage_percent'].value)}%\` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <div className="p-4">
              <h4 className="font-medium text-gray-700 mb-2">Recent Alerts</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div className={\`w-2 h-2 rounded-full \${getSeverityColor(alert.severity)}\`}></div>
                    <span className="text-gray-600 truncate">
                      {alert.metric}: {formatValue(alert.metric, alert.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}`;

    await fs.writeFile(dashboardPath, dashboardContent);
    console.log('✅ Created performance dashboard component');
  }

  /**
   * Run complete implementation
   */
  async implement() {
    console.log('📊 Implementing real-time performance monitoring with alerting...\n');
    
    try {
      await this.createPerformanceMonitor();
      await this.createPerformanceDashboard();
      
      console.log('\n✅ Performance monitoring implementation completed successfully!');
      
      return {
        success: true,
        files: [
          'src/services/monitoring/PerformanceMonitor.js',
          'src/components/monitoring/PerformanceDashboard.jsx'
        ]
      };
    } catch (error) {
      console.error('❌ Performance monitoring implementation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const implementer = new PerformanceMonitoringImplementer();
  implementer.implement();
}

export default PerformanceMonitoringImplementer;