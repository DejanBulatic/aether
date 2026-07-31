// Cosmo — service worker.
//
// Its whole job: keep a copy of the app so it opens instantly and works with no
// signal. The cache is named after a version. Bump VERSION when you publish and
// the old copy is thrown away.
//
// Worth knowing which half of this the version actually governs: the page is
// fetched network-first, so a new index.html appears on its own as soon as
// there's signal. The bump is what refreshes the cache-first half — icons, the
// manifest, the link preview — which otherwise never gets looked at again.
const VERSION = 'v88';
const CACHE = 'cosmo-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './og.png'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});
// on activate, drop every cache that isn't this version
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the page itself: try the network first, so a fresh publish shows up as soon
  // as there's signal, and fall back to the cached copy when there isn't
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // everything else — icons, fonts: cache first, it barely changes
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && url.origin === location.origin){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req)))
  );
});
