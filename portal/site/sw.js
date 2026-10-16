/* Antes, la app ICFES se publicaba en la raíz del sitio con este mismo nombre de
   archivo (sw.js). Los celulares que la instalaron siguen pidiendo /sw.js: esta
   versión se desinstala a sí misma, borra las cachés viejas de la raíz (no las de
   /icfes/) y recarga la página para que carguen el sitio nuevo. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('/icfes/') === -1; }).map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(function (c) { c.navigate(c.url); });
  })());
});
