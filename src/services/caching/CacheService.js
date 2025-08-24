/**
 * Intelligent Caching Service
 * Multi-level caching with TTL, LRU eviction, and smart invalidation
 */

import loggingService from '../logging/LoggingService.js';

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.localStorage = window.localStorage;
    
    this.config = {
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    
    this.startCleanupTimer();
  }

  /**
   * Get cache entry with multi-level fallback
   */
  async get(key, options = {}) {
    try {
      // Try memory cache first
      const memoryResult = this.getFromMemory(key);
      if (memoryResult !== null) {
        this.stats.hits++;
        loggingService.debug('Cache hit (memory)', { key });
        return memoryResult;
      }
      
      // Try localStorage
      const storageResult = await this.getFromStorage(key);
      if (storageResult !== null) {
        // Promote to memory cache
        this.setInMemory(key, storageResult.data, storageResult.ttl);
        this.stats.hits++;
        loggingService.debug('Cache hit (storage)', { key });
        return storageResult.data;
      }
      
      this.stats.misses++;
      return null;
      
    } catch (error) {
      loggingService.error('Cache get error', error, { key });
      return null;
    }
  }

  /**
   * Set cache entry
   */
  async set(key, data, options = {}) {
    const { ttl = this.config.defaultTTL } = options;
    
    try {
      const expiry = Date.now() + ttl;
      
      this.setInMemory(key, data, ttl);
      await this.setInStorage(key, data, expiry);
      
      this.stats.sets++;
      loggingService.debug('Cache set', { key });
      
    } catch (error) {
      loggingService.error('Cache set error', error, { key });
    }
  }

  /**
   * Memory cache operations
   */
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    entry.lastAccess = Date.now();
    return entry.data;
  }

  setInMemory(key, data, ttl) {
    const entry = {
      data,
      expiry: Date.now() + ttl,
      lastAccess: Date.now(),
      size: JSON.stringify(data).length * 2
    };
    
    this.evictIfNecessary(entry.size);
    this.memoryCache.set(key, entry);
  }

  /**
   * Storage cache operations
   */
  async getFromStorage(key) {
    try {
      const stored = this.localStorage.getItem(`cache_${key}`);
      if (!stored) return null;
      
      const entry = JSON.parse(stored);
      if (Date.now() > entry.expiry) {
        this.localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return entry;
    } catch (error) {
      return null;
    }
  }

  async setInStorage(key, data, expiry) {
    try {
      const entry = { data, expiry };
      this.localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.evictFromStorage();
      }
    }
  }

  /**
   * Eviction strategies
   */
  evictIfNecessary(newEntrySize) {
    const currentSize = this.getMemorySize();
    
    if (currentSize + newEntrySize <= this.config.maxMemorySize) {
      return;
    }
    
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);
    
    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      freedSize += entry.size;
      this.stats.evictions++;
      
      if (currentSize - freedSize + newEntrySize <= this.config.maxMemorySize) {
        break;
      }
    }
  }

  evictFromStorage() {
    const keys = [];
    for (let i = 0; i < this.localStorage.length; i++) {
      const key = this.localStorage.key(i);
      if (key?.startsWith('cache_')) {
        keys.push(key);
      }
    }
    
    const toRemove = Math.ceil(keys.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.localStorage.removeItem(keys[i]);
    }
  }

  getMemorySize() {
    let size = 0;
    for (const [, entry] of this.memoryCache) {
      size += entry.size;
    }
    return size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
      }
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memorySize: this.getMemorySize(),
      memoryEntries: this.memoryCache.size
    };
  }

  async clear() {
    this.memoryCache.clear();
    
    for (let i = this.localStorage.length - 1; i >= 0; i--) {
      const key = this.localStorage.key(i);
      if (key?.startsWith('cache_')) {
        this.localStorage.removeItem(key);
      }
    }
    
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }
}

const cacheService = new CacheService();
export default cacheService;