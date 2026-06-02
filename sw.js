/* Service Worker — Panini Mundial 2026
   Estrategia: network-first para el HTML (siempre busca la última versión
   cuando hay internet, y usa la copia guardada solo si estás offline).
   Esto evita que la app quede "pegada" a una versión vieja. */

const CACHE = 'panini-2026-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // activa la versión nueva enseguida
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))); // borra cachés viejas
    await self.clients.claim(); // toma control de las pestañas/app abiertas
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // No tocar pedidos externos (Supabase, CDN): que vayan directo a la red.
  if (url.origin !== location.origin) return;

  // HTML / navegación: red primero, caché como respaldo offline.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // Otros archivos propios: caché primero, y si no está, red.
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r;
    }))
  );
});
