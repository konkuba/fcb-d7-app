const CACHE_NAME = 'fcb-d7-v1';
const urlsToCache = [
  '/',
  '/app.html',
  '/index.html',
  '/manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktivierung
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Aktivierung...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network First, dann Cache (für API-Calls)
// Cache First für statische Ressourcen
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-Requests: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone für Cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback auf Cache bei Offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Offline-Nachricht
            return new Response(
              JSON.stringify({ 
                error: 'Keine Internetverbindung',
                offline: true 
              }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Statische Ressourcen: Cache First
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Im Cache gefunden
          return cachedResponse;
        }

        // Nicht im Cache - vom Netzwerk laden
        return fetch(request)
          .then((response) => {
            // Nur erfolgreiche Responses cachen
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });

            return response;
          })
          .catch(() => {
            // Offline-Fallback für HTML-Seiten
            if (request.destination === 'document') {
              return caches.match('/app.html');
            }
          });
      })
  );
});

// Background Sync für Offline-Actions (später erweiterbar)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync:', event.tag);
  
  if (event.tag === 'sync-confirmations') {
    event.waitUntil(
      // Hier könnten später Offline-Bestätigungen synchronisiert werden
      Promise.resolve()
    );
  }
});

// Push Notifications (für spätere Erweiterung)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push empfangen');
  
  const options = {
    body: event.data ? event.data.text() : 'Neue Nachricht vom FC Büsingen D7',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'fcb-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Öffnen' },
      { action: 'close', title: 'Schließen' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FC Büsingen D7', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification Click:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/app.html')
    );
  }
});

// Message Handler für Updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[Service Worker] Geladen und bereit!');
