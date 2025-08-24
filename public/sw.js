/**
 * Service Worker for Advanced Caching
 * Implements network-first, cache-first, and stale-while-revalidate strategies
 */

const CACHE_NAME = 'tzomet-cache-v1';
const STATIC_CACHE = 'tzomet-static-v1';
const DYNAMIC_CACHE = 'tzomet-dynamic-v1';

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  '/': 'network-first',
  '/api/': 'network-first',
  '/assets/': 'cache-first',
  '/images/': 'cache-first',
  '.js': 'stale-while-revalidate',
  '.css': 'stale-while-revalidate',
  '.woff2': 'cache-first',
  '.png': 'cache-first',
  '.jpg': 'cache-first',
  '.jpeg': 'cache-first',
  '.webp': 'cache-first',
  '.svg': 'cache-first'
};

// Resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/manifest.json',
  '/offline.html'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event Handler with Intelligent Caching
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  const strategy = getCacheStrategy(request.url);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch((error) => {
        console.error('Fetch error:', error);
        return handleOffline(request);
      })
  );
});

/**
 * Determine cache strategy for a given URL
 */
function getCacheStrategy(url) {
  for (const [pattern, strategy] of Object.entries(CACHE_STRATEGIES)) {
    if (url.includes(pattern)) {
      return strategy;
    }
  }
  return 'network-first'; // Default strategy
}

/**
 * Handle request based on caching strategy
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request);
    case 'network-first':
      return networkFirst(request);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCache(request);
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  await cacheResponse(request, networkResponse.clone());
  return networkResponse;
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to update cache in background
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cacheResponse(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {}); // Ignore network errors
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return networkPromise;
}

/**
 * Cache response with appropriate cache
 */
async function cacheResponse(request, response) {
  const url = new URL(request.url);
  
  // Determine which cache to use
  let cacheName = DYNAMIC_CACHE;
  
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.match(/\.(js|css|woff2|png|jpg|jpeg|webp|svg)$/)) {
    cacheName = STATIC_CACHE;
  }
  
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

/**
 * Update cache in background
 */
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse);
    }
  } catch (error) {
    // Ignore network errors during background update
  }
}

/**
 * Handle offline scenarios
 */
async function handleOffline(request) {
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // Return cached version if available
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}