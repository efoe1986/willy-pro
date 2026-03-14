const CACHE_NAME = 'willy-pro-cache-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(err => console.log('Cache miss:', url, err)))
      );
    })
  );
  self.skipWaiting();
});

// 2. Activation : supprime TOUS les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// 3. Stratégie : Network First (réseau prioritaire)
// → Toujours la dernière version en ligne, cache uniquement si hors-ligne
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
