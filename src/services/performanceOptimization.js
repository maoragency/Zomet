/**
 * Frontend Performance Optimization Service
 * Implements code splitting, lazy loading, memoization, and bundle optimization
 */

import { lazy, memo, useMemo, useCallback, useState, useEffect } from 'react'

/**
 * Enhanced lazy loading with error boundaries and retry logic
 */
export const createLazyComponent = (importFn, options = {}) => {
  const {
    fallback = null,
    retryCount = 3,
    retryDelay = 1000,
    chunkName = null
  } = options

  return lazy(() => {
    let retries = 0
    
    const loadComponent = async () => {
      try {
        const module = await importFn()
        return module
      } catch (error) {
        if (retries < retryCount) {
          retries++
          console.warn(`Retrying component load (${retries}/${retryCount})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries))
          return loadComponent()
        }
        throw error
      }
    }

    return loadComponent()
  })
}

/**
 * Component memoization utilities
 */
export const memoizeComponent = (Component, areEqual = null) => {
  return memo(Component, areEqual)
}

/**
 * Custom hook for memoized values with dependency tracking
 */
export const useMemoizedValue = (factory, deps, options = {}) => {
  const { 
    debugName = 'memoizedValue',
    enableLogging = false 
  } = options

  return useMemo(() => {
    if (enableLogging) {
    }
    return factory()
  }, deps)
}

/**
 * Custom hook for memoized callbacks
 */
export const useMemoizedCallback = (callback, deps, options = {}) => {
  const { 
    debugName = 'memoizedCallback',
    enableLogging = false 
  } = options

  return useCallback((...args) => {
    if (enableLogging) {
    }
    return callback(...args)
  }, deps)
}

/**
 * Image optimization utilities
 */
export const imageOptimizationService = {
  /**
   * Create optimized image URL with lazy loading
   */
  createOptimizedImageUrl(url, options = {}) {
    const {
      width = null,
      height = null,
      quality = 80,
      format = 'webp',
      fallbackFormat = 'jpg'
    } = options

    // If it's a Supabase storage URL, add optimization parameters
    if (url && url.includes('supabase')) {
      const urlObj = new URL(url)
      if (width) urlObj.searchParams.set('width', width)
      if (height) urlObj.searchParams.set('height', height)
      urlObj.searchParams.set('quality', quality)
      urlObj.searchParams.set('format', format)
      return urlObj.toString()
    }

    return url
  },

  /**
   * Lazy image component with progressive loading
   */
  LazyImage: memo(({ 
    src, 
    alt, 
    className = '', 
    placeholder = null,
    onLoad = null,
    onError = null,
    ...props 
  }) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [isInView, setIsInView] = useState(false)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )

      const element = document.querySelector(`[data-lazy-src="${src}"]`)
      if (element) {
        observer.observe(element)
      }

      return () => observer.disconnect()
    }, [src])

    const handleLoad = useCallback(() => {
      setIsLoaded(true)
      onLoad?.()
    }, [onLoad])

    const handleError = useCallback(() => {
      setHasError(true)
      onError?.()
    }, [onError])

    if (hasError) {
      return (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <span className="text-gray-500 text-sm">תמונה לא זמינה</span>
        </div>
      )
    }

    return (
      <div className={`relative ${className}`} data-lazy-src={src}>
        {placeholder && !isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        {isInView && (
          <img
            src={src}
            alt={alt}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            {...props}
          />
        )}
      </div>
    )
  })
}

/**
 * Virtual scrolling for large lists
 */
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  return {
    visibleItems,
    handleScroll,
    scrollTop
  }
}

/**
 * Component for virtualized list rendering
 */
export const VirtualizedList = memo(({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem,
  className = '',
  onScroll = null 
}) => {
  const { visibleItems, handleScroll } = useVirtualScrolling(items, itemHeight, containerHeight)

  const onScrollHandler = useCallback((e) => {
    handleScroll(e)
    onScroll?.(e)
  }, [handleScroll, onScroll])

  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={onScrollHandler}
    >
      <div style={{ height: visibleItems.totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${visibleItems.offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.items.map((item, index) => (
            <div key={visibleItems.startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleItems.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

/**
 * Bundle size analyzer utilities
 */
export const bundleAnalyzer = {
  /**
   * Analyze component bundle impact
   */
  analyzeComponentSize(componentName, component) {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now()
      
      // Measure component render time
      const measureRender = () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        
        if (renderTime > 16) { // More than one frame (60fps)
          console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`)
        }
      }

      // Return wrapped component with measurement
      return {
        ...component,
        __measureRender: measureRender
      }
    }
    
    return component
  },

  /**
   * Track bundle loading performance
   */
  trackBundleLoad(bundleName) {
    const startTime = performance.now()
    
    return {
      finish: () => {
        const loadTime = performance.now() - startTime
        console.log(`Bundle ${bundleName} loaded in ${loadTime.toFixed(2)}ms`)
        
        // Send to analytics if available
        if (window.gtag) {
          window.gtag('event', 'bundle_load', {
            bundle_name: bundleName,
            load_time: Math.round(loadTime)
          })
        }
      }
    }
  }
}

/**
 * Performance monitoring hooks
 */
export const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const mountTime = endTime - startTime
      
      if (mountTime > 100) {
        console.warn(`Slow component mount for ${componentName}: ${mountTime.toFixed(2)}ms`)
      }
    }
  }, [componentName])
}

/**
 * Resource preloading utilities
 */
export const resourcePreloader = {
  /**
   * Preload critical resources
   */
  preloadCriticalResources() {
    const criticalResources = [
      '/api/vehicles?limit=10', // Homepage vehicles
      '/api/user/me', // User profile
      '/api/system/settings?public=true' // Public settings
    ]

    criticalResources.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  },

  /**
   * Preload route components
   */
  preloadRouteComponents(routes) {
    routes.forEach(route => {
      if (route.component && typeof route.component === 'function') {
        // Trigger lazy loading
        route.component()
      }
    })
  },

  /**
   * Preload images
   */
  preloadImages(imageUrls) {
    imageUrls.forEach(url => {
      const img = new Image()
      img.src = url
    })
  }
}

/**
 * Code splitting utilities
 */
export const codeSplitting = {
  /**
   * Create route-based code splitting
   */
  createRouteChunks() {
    return {
      // Public pages
      public: () => import('../pages/public'),
      
      // Authentication pages
      auth: () => import('../pages/auth'),
      
      // User dashboard
      userDashboard: () => import('../pages/dashboard/user'),
      
      // Admin dashboard
      adminDashboard: () => import('../pages/dashboard/admin'),
      
      // Vehicle management
      vehicles: () => import('../pages/vehicles'),
      
      // Messaging system
      messaging: () => import('../pages/messaging')
    }
  },

  /**
   * Create feature-based code splitting
   */
  createFeatureChunks() {
    return {
      // Analytics and charts
      analytics: () => import('../components/analytics'),
      
      // File upload and media
      media: () => import('../components/media'),
      
      // Advanced forms
      forms: () => import('../components/forms'),
      
      // Data tables
      tables: () => import('../components/tables'),
      
      // Real-time features
      realtime: () => import('../services/realtime')
    }
  }
}

/**
 * Memory optimization utilities
 */
export const memoryOptimizer = {
  /**
   * Clean up event listeners and subscriptions
   */
  useCleanup(cleanupFn) {
    useEffect(() => {
      return cleanupFn
    }, [cleanupFn])
  },

  /**
   * Debounced state updates
   */
  useDebouncedState(initialValue, delay = 300) {
    const [value, setValue] = useState(initialValue)
    const [debouncedValue, setDebouncedValue] = useState(initialValue)

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      return () => clearTimeout(timer)
    }, [value, delay])

    return [debouncedValue, setValue]
  },

  /**
   * Throttled function calls
   */
  useThrottledCallback(callback, delay = 100) {
    const [isThrottled, setIsThrottled] = useState(false)

    return useCallback((...args) => {
      if (!isThrottled) {
        callback(...args)
        setIsThrottled(true)
        setTimeout(() => setIsThrottled(false), delay)
      }
    }, [callback, delay, isThrottled])
  }
}

/**
 * Asset optimization utilities
 */
export const assetOptimizer = {
  /**
   * Compress and optimize images
   */
  optimizeImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'webp'
    } = options

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(resolve, `image/${format}`, quality)
      }

      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Generate responsive image srcSet
   */
  generateSrcSet(baseUrl, sizes = [320, 640, 960, 1280, 1920]) {
    return sizes
      .map(size => `${baseUrl}?w=${size} ${size}w`)
      .join(', ')
  }
}

export default {
  createLazyComponent,
  memoizeComponent,
  useMemoizedValue,
  useMemoizedCallback,
  imageOptimizationService,
  useVirtualScrolling,
  VirtualizedList,
  bundleAnalyzer,
  usePerformanceMonitor,
  resourcePreloader,
  codeSplitting,
  memoryOptimizer,
  assetOptimizer
}