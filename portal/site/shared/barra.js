/* Inserta la barra común al inicio de la página. Calcula la raíz del portal
   a partir de la ruta de este archivo (…/shared/barra.js). */
(function () {
  var cfg = window.PORTAL_CONFIG; if (!cfg) return;
  var s = document.currentScript || document.querySelector('script[src*="shared/barra.js"]');
  var root = window.PORTAL_ROOT || (s ? s.getAttribute("src").replace(/shared\/barra\.js.*$/, "") : "../");
  var path = location.pathname;
  var activa = function (x) { return (x.host && location.hostname === x.host) || (!x.host && path.indexOf("/" + x.carpeta.replace(/\/$/, "") + "/") !== -1); };
  var enSeccion = cfg.secciones.some(activa);
  var html = '<div class="pb-in"><a class="pb-marca" href="' + root + '" aria-label="' + cfg.marca.nombre + ', ir al inicio"><img src="' + root + 'shared/logo.svg" alt="" width="22" height="22"><span>' + cfg.marca.nombre + '</span></a><nav>' +
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
