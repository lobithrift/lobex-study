const CACHE_NAME = 'lobex-study-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
  '/brain-blitz',
  '/flashcards',
  '/quizzes',
  '/settings',
];

// Install: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to pre-cache some assets during service worker install:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests and API calls
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // For same-origin page navigations or static assets
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Cache successful responses for static assets and pages
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(async () => {
        // Offline fallback from cache
        const cached = await caches.match(req);
        if (cached) return cached;

        // If navigating to an HTML page while offline, fall back to root or cached route
        if (req.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }

        return new Response('Offline: Content currently unavailable without an internet connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
