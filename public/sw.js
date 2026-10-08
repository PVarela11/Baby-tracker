const CACHE_NAME = 'baby-tracker-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }

      // Clone the request
      const fetchRequest = event.request.clone()

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      }).catch(() => {
        // If both cache and network fail
        // For navigation requests, return cached root
        if (event.request.mode === 'navigate') {
          return caches.match('/').then((cachedRoot) => {
            if (cachedRoot) {
              return cachedRoot
            }
            // If no cached root, return a basic offline fallback
            return new Response('Offline - No cached version available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' }),
            })
          })
        }
        // For API requests, let them fail so the app knows it's offline
        throw new Error('Network request failed')
      })
    })
  )
})

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
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
