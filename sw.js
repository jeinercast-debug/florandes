/* FLORANDES — service worker v2.
   Cachea el shell para que la app arranque sin señal. Las llamadas a las APIs
   externas (Anthropic, PlantNet, iNaturalist, Google Fonts) nunca se interceptan
   como cache-first: se dejan pasar a la red. */
var CACHE = 'florandes-v2';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './data/dataset.js',
  './js/util.js',
  './js/almacen.js',
  './js/datos.js',
  './js/clave.js',
  './js/observaciones.js',
  './js/ia.js',
  './js/ui.js',
  './js/app.js',
  './js/pantallas/onboarding.js',
  './js/pantallas/inicio.js',
  './js/pantallas/especies.js',
  './js/pantallas/especie.js',
  './js/pantallas/clave.js',
  './js/pantallas/capturar.js',
  './js/pantallas/observaciones.js',
  './js/pantallas/observacion.js',
  './js/pantallas/perfil.js',
  './assets/fonts/Fraunces-Regular.ttf',
  './assets/fonts/Fraunces-Italic.ttf',
  './assets/fonts/Fraunces-SemiBold.ttf',
  './assets/fonts/Fraunces-Bold.ttf',
  './assets/fonts/EBGaramond-Regular.ttf',
  './assets/fonts/EBGaramond-Italic.ttf',
  './assets/fonts/EBGaramond-Medium.ttf',
  './assets/fonts/EBGaramond-MediumItalic.ttf',
  './assets/fonts/EBGaramond-SemiBold.ttf',
  './assets/fonts/EBGaramond-Bold.ttf',
  './assets/fonts/PublicSans-Regular.ttf',
  './assets/fonts/PublicSans-Italic.ttf',
  './assets/fonts/PublicSans-Medium.ttf',
  './assets/fonts/PublicSans-SemiBold.ttf',
  './assets/fonts/PublicSans-Bold.ttf',
  './assets/fonts/IBMPlexMono-Regular.ttf',
  './assets/fonts/IBMPlexMono-SemiBold.ttf',
  './assets/logos/grupo-ecosistemas-clima-territorio.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function (e) { console.warn('[sw] no se cacheó', u, e.message); });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var mismoOrigen = url.origin === self.location.origin;

  if (!mismoOrigen) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      ev.respondWith(
        caches.open(CACHE).then(function (c) {
          return c.match(req).then(function (hit) {
            var red = fetch(req).then(function (r) {
              if (r.ok) c.put(req, r.clone());
              return r;
            }).catch(function () { return hit; });
            return hit || red;
          });
        })
      );
    }
    return;
  }

  ev.respondWith(
    caches.match(req).then(function (hit) {
      var red = fetch(req).then(function (r) {
        if (r.ok) caches.open(CACHE).then(function (c) { c.put(req, r.clone()); });
        return r;
      }).catch(function () { return hit; });
      return hit || red;
    })
  );
});
