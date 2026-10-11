const VERSION = 'almeida-tavares-air-force-v1-2-0';
const ESSENTIAL = ['./', './index.html', './manifest.webmanifest'];
const ASSETS = ['./assets/app.js', './assets/style.css', './assets/index.css', './assets/main.css', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png', './icons/brand-emblem.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(async cache => {
    await cache.addAll(ESSENTIAL.map(path => new URL(path, self.registration.scope)));
    // Nem todas as versões do Vite dão o mesmo nome ao ficheiro CSS.
    // Recursos opcionais em falta não podem impedir a instalação offline.
    await Promise.allSettled(ASSETS.map(path => cache.add(new URL(path, self.registration.scope))));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => (name.startsWith('cesar-ricardo-') || name.startsWith('almeida-tavares-air-force-')) && name !== VERSION).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const clone = response.clone(); caches.open(VERSION).then(cache => cache.put(request, clone)); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(new URL('./index.html', self.registration.scope))) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const clone = response.clone(); caches.open(VERSION).then(cache => cache.put(request, clone)); }
    return response;
  })));
});
