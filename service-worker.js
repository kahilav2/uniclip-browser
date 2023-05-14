// VERSION: 23apr23.0
const CACHE_NAME = 'uniclip-pwa-cache-23apr23.0';
const ASSETS_TO_CACHE = [
  './index.html',
  './styles.css',
  './main.js',
  './message_controller.js',
  './app.js',
  './event_emitter.js',
  './utils/utils.js',
  './assets/web3.min.js',
  './assets/qrcode.min.js',
  './assets/jsQR.js',
  './assets/streamr-chunker.bundle.js',
  './assets/apple-touch-icon.png',
  './assets/favicon-32x32.png',
  './assets/favicon-16x16.png',
  './assets/streamr-client.web.js',
  './assets/vue.global.js',
  './assets/hamburger_menu_white.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});
  
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // force the new service worker to take control immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", async (event) => {
  console.log("SW received message")
  if (event.data && event.data.action === "purgeCache") {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
  