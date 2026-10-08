const CACHE_NAME = 'baby-tracker-v2'
const STATIC_CACHE = 'baby-tracker-static-v2'
const ROOT_CACHE = 'baby-tracker-root-v2'

// Cache static assets and root page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll([
          '/manifest.json',
          '/icon.svg',
          '/apple-touch-icon.svg',
        ])
      }),
      caches.open(ROOT_CACHE).then((cache) => {
        return cache.add('/')
      })
    ])
  )
  // Activate immediately
  self.skipWaiting()
})

// Use different strategies based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // For navigation requests (HTML pages), use NetworkFirst with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseToCache = response.clone()
            caches.open(ROOT_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached
            }
            // If no cached version, return cached root
            return caches.match('/').then((cachedRoot) => {
              if (cachedRoot) {
                return cachedRoot
              }
              // Return offline fallback
              return new Response('<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/html' }),
              })
            })
          })
        })
    )
    return
  }

  // For static assets (icons, manifest), use CacheFirst
  if (url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      })
    )
    return
  }

  // For API requests, use NetworkOnly (don't cache - let the app handle offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // For other requests, use StaleWhileRevalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})

// Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE, ROOT_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim())
})
