/* Service worker — offline-first per estudiar sense connexió.
   Precarrega tot el contingut (resums i tests) i, quan hi ha xarxa,
   actualitza les dades. El progrés es desa a localStorage (al dispositiu). */
const CACHE = 'montornes-oposicio-v5';
const ASSETS = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/storage.js',
  './assets/js/grader.js',
  './data/temari.json',
  './data/resums.json',
  './data/questions.json',
  './data/cases.json',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon.png',
];

// Precàrrega robusta: si un recurs falla, no bloqueja la resta.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(a => c.add(a)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // no interceptar API d'Anthropic ni fonts externes

  // Dades: network-first (per actualitzar-se), amb còpia a la memòria cau per a offline.
  if (url.pathname.includes('/data/')) {
    e.respondWith((async () => {
      try {
        const r = await fetch(e.request);
        const c = await caches.open(CACHE);
        c.put(e.request, r.clone());
        return r;
      } catch (err) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // Resta (shell): cache-first; navegacions cauen a index.html si no hi ha xarxa.
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const r = await fetch(e.request);
      const c = await caches.open(CACHE);
      c.put(e.request, r.clone());
      return r;
    } catch (err) {
      if (e.request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
