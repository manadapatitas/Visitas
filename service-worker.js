const CACHE_NAME = 'manada-patitas-v1';
const urlsToCache = [
  './',
  './index.html', // Cambia esto si tu PWA se llama "index (1).html"
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './favicon.jpg'
];

// Instalar el Service Worker y guardar archivos en Caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados exitosamente');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar peticiones para cargar rápido y permitir uso offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo en caché si existe, si no, lo busca en internet
        return response || fetch(event.request);
      })
  );
});

// Qué hacer cuando el usuario toca la notificación de "Nueva Cita"
self.addEventListener('notificationclick', event => {
  event.notification.close(); // Cierra la notificación
  
  // Abre la PWA o la trae al frente si ya estaba minimizada
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.includes('index') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// Limpiar cachés antiguos si actualizas la versión (manada-patitas-v2, etc)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
