/* Inserta la barra común al inicio de la página. Calcula la raíz del portal
   a partir de la ruta de este archivo (…/shared/barra.js). */
(function () {
  var cfg = window.PORTAL_CONFIG; if (!cfg) return;
  var s = document.currentScript || document.querySelector('script[src*="shared/barra.js"]');
  var root = window.PORTAL_ROOT || (s ? s.getAttribute("src").replace(/shared\/barra\.js.*$/, "") : "../");
  var path = location.pathname;
  var activa = function (x) { return (x.host && location.hostname === x.host) || (!x.host && path.indexOf("/" + x.carpeta.replace(/\/$/, "") + "/") !== -1); };
  var enSeccion = cfg.secciones.some(activa);
  var html = '<div class="pb-in"><a class="pb-marca" href="' + root + '" aria-label="' + cfg.marca.nombre + ', ir al inicio"><img src="' + root + 'shared/logo.svg" alt="Logotipo de ' + cfg.marca.nombre + '" width="22" height="22"><span>' + cfg.marca.nombre + '</span></a><nav>' +
    '<a' + (enSeccion ? '' : ' class="activa"') + ' href="' + root + '">Inicio</a>' +
    cfg.secciones.map(function (x) {
      var act = activa(x) ? ' class="activa"' : "";
      return '<a' + act + ' href="' + (x.url || root + x.carpeta) + '">' + x.nombre + '</a>';
    }).join("") + '</nav></div>';
  document.documentElement.classList.add("con-barra-portal");
  var bar = document.createElement("div"); bar.id = "portal-barra"; bar.innerHTML = html;
  function go() { document.body.insertBefore(bar, document.body.firstChild); }
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
})();

/* Medición compartida (Meta Pixel). El ID vive en portal.config.js → analitica.metaPixel;
   si está vacío no se carga nada. En el host de la tienda no se carga (la tienda tiene el suyo).
   Eventos: PageView al abrir, Contact al tocar cualquier enlace wa.me, y Lead cuando una
   página llama window.nivytekEvento('Lead', { content_name: '...' }). */
(function () {
  var cfg = window.PORTAL_CONFIG, id = cfg && cfg.analitica && String(cfg.analitica.metaPixel || "").trim();
  var enTienda = (cfg && cfg.secciones || []).some(function (x) { return x.host && location.hostname === x.host; });
  window.nivytekEvento = function (evento, datos) { try { if (window.fbq) window.fbq("track", evento, datos || {}); } catch (e) {} };
  if (!id || enTienda || window.fbq) return;
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", id); window.fbq("track", "PageView");
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href*='wa.me/'], a[href*='whatsapp.com/send'], a[href^='https://api.whatsapp.com']") : null;
    if (a) window.nivytekEvento("Contact", { content_name: document.title });
  }, true);
})();
