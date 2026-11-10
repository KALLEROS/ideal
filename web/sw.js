// Guarda la app en el teléfono para que abra aunque no haya señal.
// Primero intenta la red (para recibir actualizaciones) y si falla usa la copia guardada.
var CACHE = 'ideal-v1';
var ARCHIVOS = ['./', './index.html', './estilos.css', './motor.js', './catalogo.js', './datos.js', './app.js', './emojis.js',
                './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (guardado) {
        return guardado || caches.match('./index.html');
      });
    })
  );
});
