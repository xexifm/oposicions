/* Service worker — offline-first per estudiar sense connexió.
   Estratègia:
   - Shell (HTML/JS/CSS): NETWORK-FIRST → quan hi ha xarxa sempre s'agafa la
     versió nova (així les actualitzacions es veuen de seguida); sense xarxa,
     es recorre a la còpia de la memòria cau.
   - Dades (/data/): network-first amb còpia per a offline.
   - Icones/manifest: cache-first.
   El progrés es desa a localStorage (al dispositiu). */
const CACHE = 'montornes-oposicio-v83';
const ASSETS = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/storage.js',
  './assets/js/grader.js',
  './assets/js/sync.js',
  './assets/js/gist.js',
  './data/montornes/temari.json',
  './data/montornes/resums.json',
  './data/montornes/questions.json',
  './data/montornes/cases.json',
  './data/cornella/temari.json',
  './data/cornella/resums.json',
  './data/cornella/questions.json',
  './data/cornella/cases.json',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon.png',
  './assets/icons/cornella-escut.svg',
];

// Precàrrega robusta i SENSE memòria cau HTTP (cache:'reload'), perquè no es
// guardin versions velles dels fitxers. Si un recurs falla, no bloqueja la resta.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(async a => {
      try { const r = await fetch(new Request(a, { cache: 'reload' })); if (r.ok) await c.put(a, r); }
      catch (err) { /* ignora */ }
    }));
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

async function networkFirst(request) {
  try {
    const r = await fetch(request);
    if (r && r.ok) { const c = await caches.open(CACHE); c.put(request, r.clone()); }
    return r;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fb = await caches.match('./index.html');
      if (fb) return fb;
    }
    throw err;
  }
}
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const r = await fetch(request);
  if (r && r.ok) { const c = await caches.open(CACHE); c.put(request, r.clone()); }
  return r;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // no interceptar API d'Anthropic, GitHub ni fonts externes

  const dest = e.request.destination;
  const isShell = e.request.mode === 'navigate' ||
    dest === 'document' || dest === 'script' || dest === 'style' ||
    url.pathname.includes('/data/');

  e.respondWith(isShell ? networkFirst(e.request) : cacheFirst(e.request));
});
