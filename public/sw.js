// Service worker — caching + push notifications

const STATIC_CACHE = 'site-static-v1';
const PAGES_CACHE  = 'site-pages-v1';
const OFFLINE_URL  = '/offline.html';

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/']))
      .then(() => self.skipWaiting())
  );
});

// Activate: purge stale caches
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, PAGES_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => keys.filter((k) => !keep.includes(k)))
      .then((stale) => Promise.all(stale.map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Fetch: route-based caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API routes — always go to the network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Content-hashed Astro assets → cache-first (safe forever)
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Static files (images, fonts, icons, JS, CSS outside /_astro/) → cache-first
  if (/\.(png|jpe?g|webp|avif|svg|ico|gif|woff2?|ttf|eot|css|js)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigation → network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Resource unavailable offline.', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    return offline || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Your Site', body: event.data.text() };
  }

  const { title = 'Your Site', body, icon, url = '/', badge } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/favicon.svg',
      badge: badge || '/favicon.svg',
      data: { url },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
