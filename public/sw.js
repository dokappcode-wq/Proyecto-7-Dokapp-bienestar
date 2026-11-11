// Service worker de Dokapp.
// Hace la app instalable y que abra rápido, pero NUNCA guarda datos del servidor:
// todo lo que pasa por /api/ (cuentas, fotos, publicaciones) va siempre a la red.

const CACHE = 'dokapp-shell-v1';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Datos del servidor y peticiones a otros dominios: siempre directas a la red.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Página: primero la red (para recibir siempre la última versión); sin conexión, la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Archivos con huella en el nombre (assets/…): no cambian nunca, se sirven desde la caché.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }

  // Resto (config.js, iconos…): red primero, caché como respaldo.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
