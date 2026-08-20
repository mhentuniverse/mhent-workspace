// MHENT WORKSPACE - SERVICE WORKER (SW.JS)
const CACHE_NAME = 'mhent-workspace-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/theme.css',
  './css/layout.css',
  './css/components.css',
  './css/apps.css',
  './js/config.js',
  './js/state.js',
  './js/ui.js',
  './js/modules/auth.js',
  './js/modules/chat.js',
  './js/modules/mail.js',
  './js/modules/meet.js',
  './js/modules/todo.js',
  './js/modules/drive.js',
  './js/modules/calendar.js',
  './js/modules/tools.js',
  './js/modules/aisa.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
