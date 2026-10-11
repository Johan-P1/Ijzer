// Service worker: bewaart de app offline. Verhoog VERSION bij elke update.
const VERSION = 'ijzer-v1.0.0';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app.css',
  './app.js',
  './core.js',
  './util.js',
  './data.js',
  './engine.js',
  './store.js',
  './stats.js',
  './charts.js',
  './review.js',
  './home.js',
  './train.js',
  './progress.js',
  './history.js',
  './program.js',
  './settings.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
