/* Service Worker — Roteiro Mensal · Cartório SRS
   M4 (Sprint 1): cache completo do app com versionamento.
   Ao publicar uma nova versão do app, incremente VERSION abaixo —
   o app avisará o Oficial que há atualização disponível. */

const VERSION = 'v2.0.0';
const CACHE = `cartorio-srs-${VERSION}`;

const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/logo-branca.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Navegação (abrir o app): network-first com fallback para o cache — offline garantido
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', clone));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Fontes Google: cache-first (funcionam offline após a primeira visita)
  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ||
        fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Demais recursos do próprio app: cache-first com atualização em segundo plano
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
