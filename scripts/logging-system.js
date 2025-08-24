#!/usr/bin/env node

/**
 * Comprehensive Logging and Error Tracking System
 * Implements advanced logging, error tracking, and monitoring for the Tzomet project
 */

import fs from 'fs/promises';
import path from 'path';

class LoggingSystemImplementer {
  constructor() {
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
  }

  /**
   * Create main logging service
   */
  async createLoggingService() {
    const servicePath = path.join(process.cwd(), 'src/services/logging/LoggingService.js');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(servicePath), { recursive: true });
    
    const serviceContent = `/**
 * Comprehensive Logging Service
 * Handles all application logging, error tracking, and performance monitoring
 */

class LoggingService {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.context = {};
    this.errorQueue = [];
    this.performanceQueue = [];
    this.maxQueueSize = 100;
    
    this.initializeErrorHandlers();
    this.initializePerformanceTracking();
  }

  /**
   * Get current log level from environment
   */
  getLogLevel() {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
    const envLevel = import.meta.env.VITE_LOG_LEVEL || 'INFO';
    return levels[envLevel] || levels.INFO;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Set user context for logging
   */
  setUser(userId, userInfo = {}) {
    this.userId = userId;
    this.context.user = { id: userId, ...userInfo };
  }

  /**
   * Set additional context
   */
  setContext(key, value) {
    this.context[key] = value;
  }

  /**
   * Create log entry
   */
  createLogEntry(level, message, data = {}, error = null) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: { ...this.context },
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: error.componentStack
      } : null,
      performance: {
        memory: this.getMemoryUsage(),
        timing: this.getPerformanceTiming()
      }
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Get performance timing information
   */
  getPerformanceTiming() {
    const timing = performance.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: this.getFirstPaint()
    };
  }

  /**
   * Get First Paint timing
   */
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    if (this.logLevel <= 0) {
      const entry = this.createLogEntry('DEBUG', message, data);
      console.debug('🐛', message, entry);
      this.sendToRemote(entry);
    }
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    if (this.logLevel <= 1) {
      const entry = this.createLogEntry('INFO', message, data);
      console.info('ℹ️', message, entry);
      this.sendToRemote(entry);
    }
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    if (this.logLevel <= 2) {
      const entry = this.createLogEntry('WARN', message, data);
      console.warn('⚠️', message, entry);
      this.sendToRemote(entry);
    }
  }

  /**
   * Log error message
   */
  error(message, error = null, data = {}) {
    if (this.logLevel <= 3) {
      const entry = this.createLogEntry('ERROR', message, data, error);
      console.error('❌', message, entry);
      this.queueError(entry);
      this.sendToRemote(entry);
    }
  }

  /**
   * Log critical error
   */
  critical(message, error = null, data = {}) {
    const entry = this.createLogEntry('CRITICAL', message, data, error);
    console.error('🚨', message, entry);
    this.queueError(entry);
    this.sendToRemote(entry, true); // Send immediately
  }

  /**
   * Queue error for batch processing
   */
  queueError(entry) {
    this.errorQueue.push(entry);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest
    }
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('error-queue', JSON.stringify(this.errorQueue));
    } catch (e) {
      console.warn('Failed to store error queue in localStorage');
    }
  }

  /**
   * Initialize global error handlers
   */
  initializeErrorHandlers() {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.error('Resource Loading Error', null, {
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          type: event.type
        });
      }
    }, true);
  }

  /**
   * Initialize performance tracking
   */
  initializePerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.trackPageLoad();
      }, 0);
    });

    // Track navigation performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackPerformanceEntry(entry);
        }
      });
      
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad() {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    this.info('Page Load Complete', {
      loadTime,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstByte: timing.responseStart - timing.navigationStart,
      domProcessing: timing.domComplete - timing.domLoading
    });
  }

  /**
   * Track performance entries
   */
  trackPerformanceEntry(entry) {
    const perfData = {
      name: entry.name,
      type: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration
    };

    if (entry.entryType === 'largest-contentful-paint') {
      this.info('Largest Contentful Paint', { lcp: entry.startTime });
    }

    this.performanceQueue.push(perfData);
    if (this.performanceQueue.length > this.maxQueueSize) {
      this.performanceQueue.shift();
    }
  }

  /**
   * Send log entry to remote service
   */
  async sendToRemote(entry, immediate = false) {
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_ENABLE_REMOTE_LOGGING) {
      return; // Skip remote logging in development
    }

    try {
      const endpoint = import.meta.env.VITE_LOGGING_ENDPOINT || '/api/logs';
      
      if (immediate) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } else {
        // Queue for batch sending
        this.queueForBatch(entry);
      }
    } catch (error) {
      console.warn('Failed to send log to remote service:', error);
    }
  }

  /**
   * Queue entry for batch sending
   */
  queueForBatch(entry) {
    const batchQueue = JSON.parse(localStorage.getItem('log-batch-queue') || '[]');
    batchQueue.push(entry);
    
    if (batchQueue.length > 50) {
      batchQueue.splice(0, 25); // Remove oldest 25 entries
    }
    
    localStorage.setItem('log-batch-queue', JSON.stringify(batchQueue));
    
    // Schedule batch send
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.sendBatch();
      }, 30000); // Send batch every 30 seconds
    }
  }

  /**
   * Send queued logs in batch
   */
  async sendBatch() {
    const batchQueue = JSON.parse(localStorage.getItem('log-batch-queue') || '[]');
    
    if (batchQueue.length === 0) {
      this.batchTimeout = null;
      return;
    }

    try {
      const endpoint = import.meta.env.VITE_LOGGING_ENDPOINT || '/api/logs/batch';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batchQueue })
      });
      
      localStorage.removeItem('log-batch-queue');
    } catch (error) {
      console.warn('Failed to send log batch:', error);
    }
    
    this.batchTimeout = null;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorQueue.length,
      recentErrors: this.errorQueue.slice(-10),
      errorsByType: this.groupErrorsByType(),
      sessionId: this.sessionId
    };
  }

  /**
   * Group errors by type
   */
  groupErrorsByType() {
    const grouped = {};
    this.errorQueue.forEach(entry => {
      const type = entry.error?.name || 'Unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Clear error queue
   */
  clearErrors() {
    this.errorQueue = [];
    localStorage.removeItem('error-queue');
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    return {
      errors: this.errorQueue,
      performance: this.performanceQueue,
      session: {
        id: this.sessionId,
        userId: this.userId,
        context: this.context
      }
    };
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default loggingService;`;

    await fs.writeFile(servicePath, serviceContent);
    console.log('✅ Created comprehensive logging service');
  }

  /**
   * Create React Error Boundary component
   */
  async createErrorBoundary() {
    const componentPath = path.join(process.cwd(), 'src/components/error/ErrorBoundary.jsx');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(componentPath), { recursive: true });
    
    const componentContent = `import React from 'react';
import loggingService from '../../services/logging/LoggingService.js';

/**
 * React Error Boundary with comprehensive error tracking
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = 'error-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error with comprehensive context
    loggingService.critical('React Component Error', error, {
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      props: this.props.logProps ? this.props : undefined,
      errorInfo
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    loggingService.info('Error Boundary Retry', {
      errorId: this.state.errorId,
      component: this.props.name
    });
  };

  handleReportError = () => {
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      .then(() => {
        alert('Error details copied to clipboard');
      })
      .catch(() => {
        console.log('Error details:', errorData);
      });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  משהו השתבש
                </h3>
                <p className="text-sm text-gray-500">
                  אירעה שגיאה בלתי צפויה באפליקציה
                </p>
              </div>
            </div>

            {import.meta.env.MODE === 'development' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Error Details (Development):
                </p>
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error?.message}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                נסה שוב
              </button>
              
              {import.meta.env.MODE === 'development' && (
                <button
                  onClick={this.handleReportError}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  העתק שגיאה
                </button>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                רענן דף
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;`;

    await fs.writeFile(componentPath, componentContent);
    console.log('✅ Created React Error Boundary component');
  }

  /**
   * Create performance monitoring hook
   */
  async createPerformanceHook() {
    const hookPath = path.join(process.cwd(), 'src/hooks/usePerformanceMonitor.js');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    
    const hookContent = `import { useEffect, useRef, useCallback } from 'react';
import loggingService from '../services/logging/LoggingService.js';

/**
 * Performance monitoring hook
 * Tracks component render performance and user interactions
 */
export function usePerformanceMonitor(componentName, options = {}) {
  const renderStartTime = useRef(null);
  const renderCount = useRef(0);
  const slowRenderThreshold = options.slowRenderThreshold || 16; // 16ms for 60fps

  // Track component mount/unmount
  useEffect(() => {
    const mountTime = performance.now();
    
    loggingService.debug(\`Component Mounted: \${componentName}\`, {
      mountTime,
      component: componentName
    });

    return () => {
      loggingService.debug(\`Component Unmounted: \${componentName}\`, {
        component: componentName,
        totalRenders: renderCount.current
      });
    };
  }, [componentName]);

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
    const renderEndTime = performance.now();
    
    if (renderStartTime.current) {
      const renderDuration = renderEndTime - renderStartTime.current;
      
      if (renderDuration > slowRenderThreshold) {
        loggingService.warn(\`Slow Render Detected: \${componentName}\`, {
          component: componentName,
          renderDuration,
          renderCount: renderCount.current,
          threshold: slowRenderThreshold
        });
      }
      
      if (options.logAllRenders) {
        loggingService.debug(\`Component Render: \${componentName}\`, {
          component: componentName,
          renderDuration,
          renderCount: renderCount.current
        });
      }
    }
    
    renderStartTime.current = renderEndTime;
  });

  // Track user interactions
  const trackInteraction = useCallback((action, data = {}) => {
    loggingService.info(\`User Interaction: \${action}\`, {
      component: componentName,
      action,
      timestamp: Date.now(),
      ...data
    });
  }, [componentName]);

  // Track API calls
  const trackApiCall = useCallback((endpoint, method = 'GET', duration = null) => {
    loggingService.info('API Call', {
      component: componentName,
      endpoint,
      method,
      duration,
      timestamp: Date.now()
    });
  }, [componentName]);

  // Track errors specific to this component
  const trackError = useCallback((error, context = {}) => {
    loggingService.error(\`Component Error: \${componentName}\`, error, {
      component: componentName,
      ...context
    });
  }, [componentName]);

  return {
    trackInteraction,
    trackApiCall,
    trackError,
    renderCount: renderCount.current
  };
}

/**
 * Hook for tracking page performance
 */
export function usePagePerformance(pageName) {
  useEffect(() => {
    const startTime = performance.now();
    
    // Track page load
    loggingService.info(\`Page Load: \${pageName}\`, {
      page: pageName,
      loadStartTime: startTime,
      url: window.location.href
    });

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            loggingService.info('LCP Measurement', {
              page: pageName,
              lcp: entry.startTime,
              element: entry.element?.tagName
            });
          }
          
          if (entry.entryType === 'first-input') {
            loggingService.info('FID Measurement', {
              page: pageName,
              fid: entry.processingStart - entry.startTime,
              inputType: entry.name
            });
          }
        }
      });
      
      observer.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input'] 
      });
      
      return () => observer.disconnect();
    }

    return () => {
      const endTime = performance.now();
      loggingService.info(\`Page Unload: \${pageName}\`, {
        page: pageName,
        timeOnPage: endTime - startTime
      });
    };
  }, [pageName]);
}

/**
 * Hook for tracking form performance and errors
 */
export function useFormPerformance(formName) {
  const startTime = useRef(null);
  const fieldInteractions = useRef({});

  const trackFormStart = useCallback(() => {
    startTime.current = performance.now();
    loggingService.info(\`Form Started: \${formName}\`, {
      form: formName,
      startTime: startTime.current
    });
  }, [formName]);

  const trackFieldInteraction = useCallback((fieldName, action) => {
    if (!fieldInteractions.current[fieldName]) {
      fieldInteractions.current[fieldName] = [];
    }
    
    fieldInteractions.current[fieldName].push({
      action,
      timestamp: performance.now()
    });
  }, []);

  const trackFormSubmit = useCallback((success, errors = []) => {
    const submitTime = performance.now();
    const duration = startTime.current ? submitTime - startTime.current : null;
    
    loggingService.info(\`Form Submit: \${formName}\`, {
      form: formName,
      success,
      duration,
      errors: errors.length,
      fieldInteractions: Object.keys(fieldInteractions.current).length,
      errorDetails: errors
    });
  }, [formName]);

  const trackFormError = useCallback((error, fieldName = null) => {
    loggingService.error(\`Form Error: \${formName}\`, error, {
      form: formName,
      field: fieldName,
      fieldInteractions: fieldInteractions.current
    });
  }, [formName]);

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmit,
    trackFormError
  };
}`;

    await fs.writeFile(hookPath, hookContent);
    console.log('✅ Created performance monitoring hooks');
  }

  /**
   * Run complete logging system implementation
   */
  async implement() {
    console.log('📊 Implementing comprehensive logging and error tracking system...\n');
    
    try {
      await this.createLoggingService();
      await this.createErrorBoundary();
      await this.createPerformanceHook();
      
      console.log('\n✅ Logging system implementation completed successfully!');
      
      return {
        success: true,
        files: [
          'src/services/logging/LoggingService.js',
          'src/components/error/ErrorBoundary.jsx',
          'src/hooks/usePerformanceMonitor.js'
        ]
      };
    } catch (error) {
      console.error('❌ Logging system implementation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const implementer = new LoggingSystemImplementer();
  implementer.implement();
}

export default LoggingSystemImplementer;