const CACHE = 'the-genius-shell-v5';
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/mood-neutral.png',
  '/assets/mood-happy.png',
  '/assets/mood-joy.png',
  '/assets/mood-calm.png',
  '/assets/mood-surprised.png',
  '/assets/mood-mischievous.png',
  '/assets/mood-cool.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
