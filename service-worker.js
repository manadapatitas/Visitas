const CACHE_NAME = 'manada-patitas-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo_manada.png',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => name !== CACHE_NAME ? caches.delete(name) : null))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // No cachear llamadas al Google Apps Script (siempre en tiempo real)
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        });
      })
      .catch(() => caches.match('/index.html'))
  );
});
