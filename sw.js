// MHENT WORKSPACE - SERVICE WORKER (AUTO-PURGE CACHE & NETWORK-FIRST, NO FORCE-RELOAD)
const CACHE_NAME = 'mhent-workspace-v3.4-converter-stable';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ALWAYS FETCH LIVE FROM NETWORK - NEVER SERVE STALE CODE
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
