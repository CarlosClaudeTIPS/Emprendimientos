#!/usr/bin/env node
/**
 * Build de la tienda. A partir de la fuente única de datos
 * (data/catalogo.json + data/encargo.json + data/slugs.json) genera:
 *
 *   p/<slug>.html        una ficha estática por producto, con TODO el contenido en el
 *                        HTML (título, precio, descripción, fotos, especificaciones,
 *                        políticas), metaetiquetas Open Graph absolutas y JSON-LD Product.
 *                        WhatsApp, Instagram y Facebook no ejecutan JavaScript: por eso
 *                        la vista previa sale de aquí. El JS de la ficha (js/producto.js)
 *                        vuelve a dibujar lo mismo encima y añade carrito, galería, etc.
 *   index.html, catalogo.html, preguntas.html, politicas.html
 *                        contenido inicial escrito en el HTML (entre marcas <!-- generado:x -->)
 *   sitemap.xml, robots.txt
 *   ../vercel.json       redirecciones producto.html?p=<id viejo> → p/<slug>.html
 *
 * Uso (desde tienda/):  npm run build        (= node scripts/generar-paginas.mjs)
 * Para agregar un producto: editar datos → python3 scripts/descargar-imagenes.py → npm run build.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const SITIO = 'https://tienda.nivytek.com/';
const leer = (f) => JSON.parse(readFileSync(join(raiz, f), 'utf8'));
const escribir = (f, t) => writeFileSync(join(raiz, f), t);
/* En las fichas (carpeta p/) los enlaces y recursos relativos se escriben desde la raíz del host (/catalogo.html,
   /css/estilos.css…): los navegadores ya los resolvían con <base>, pero los rastreadores que ignoran <base> veían 404. */
const absolutizar = (html) => html.replace(/\b(href|src|srcset)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]+)"/g, (m, a, v) => a === 'srcset'
  ? `${a}="${v.split(',').map(x => x.trim().replace(/^(?!https?:|\/)/, '/')).join(', ')}"`
  : `${a}="/${v}"`);

const config = leer('data/config.json');
const catalogo = leer('data/catalogo.json');
const encargo = existsSync(join(raiz, 'data/encargo.json')) ? leer('data/encargo.json') : { productos: [] };
const slugs = existsSync(join(raiz, 'data/slugs.json')) ? leer('data/slugs.json') : {};
const manifiesto = existsSync(join(raiz, 'img/productos/manifiesto.json')) ? leer('img/productos/manifiesto.json') : { productos: [] };

/* ---------- Reutilizar la lógica de js/app.js (misma mezcla de datos que ve el navegador) ---------- */
const noop = () => { };
const elemento = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, removeAttribute: noop, appendChild: noop, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], innerHTML: '' });
const sandbox = {
  console, setTimeout, clearTimeout, URL, URLSearchParams, encodeURIComponent, decodeURIComponent, Math, Date, JSON, Number, String, Object, Array, Promise, isNaN, parseInt,
  location: { href: SITIO, origin: SITIO.slice(0, -1), pathname: '/', search: '', hostname: 'tienda.nivytek.com', protocol: 'https:' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  navigator: {},
  document: Object.assign(elemento(), { documentElement: { style: { setProperty: noop } }, head: elemento(), body: elemento(), createElement: elemento, getElementsByTagName: () => [elemento()] })
};
sandbox.window = sandbox;
vm.runInNewContext(readFileSync(join(raiz, 'js/app.js'), 'utf8'), sandbox);
const T = sandbox.Tienda;
T.slugs = slugs;
T.agregarEncargo(catalogo, encargo);
const combos = existsSync(join(raiz, 'data/combos.json')) ? leer('data/combos.json') : { combos: [] };
T.agregarCombos(catalogo, combos);
const resenas = existsSync(join(raiz, 'data/resenas.json')) ? leer('data/resenas.json') : { resenas: {} };
T.agregarResenas(catalogo, resenas);
catalogo.productos = catalogo.productos.map(T.normalizarProducto).map(p => Object.assign(p, { slug: slugs[p.id] || String(p.id).replace(/^ya-/, '') }));
catalogo.categorias = (catalogo.categorias || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
T.datos = { config, catalogo };
// Slugs nuevos (productos que aún no estaban en data/slugs.json) se guardan para que la URL no cambie después
let slugsNuevos = 0;
for (const p of catalogo.productos) if (!slugs[p.id]) { slugs[p.id] = p.slug; slugsNuevos++; }
if (slugsNuevos) escribir('data/slugs.json', JSON.stringify(slugs, null, 2) + '\n');

const esc = T.esc;
const precio = T.formatoPrecio;
const abs = (ruta) => /^https?:\/\//.test(ruta) ? ruta : SITIO + ruta.replace(/^\.?\//, '');
const n = config.negocio || {}, wa = config.whatsapp || {}, pol = config.politicas || {};
const numWA = String(wa.numero || '').replace(/\D/g, '');
const visibles = T.visibles();
const urlFicha = (p) => `p/${p.slug}.html`;
const urlAbs = (p) => SITIO + urlFicha(p);
const ogDe = (p) => { const m = manifiesto.productos.find(x => x.id === p.id); return m && m.og ? abs(m.og) : abs((p.imagenes && p.imagenes[0]) || 'img/og-default.jpg'); };
const medidas = (ruta) => { for (const m of manifiesto.productos) { const i = m.imagenes.find(x => x.archivo === ruta); if (i) return i; } return null; };
const lista = (arr) => arr && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
const listaNum = (arr) => arr && arr.length ? `<ol>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '';
const parrafos = (t) => esc(t).replace(/\n/g, '<br>');

/* ---------- Cabecera común, encabezado y pie estáticos ---------- */
const fuentes = `<link rel="icon" href="img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=optional" rel="stylesheet">
<link rel="stylesheet" href="css/estilos.css">`;
const encabezado = `<div class="contenedor"><div class="encabezado-barra">
  <a class="logo" href="index.html"><img src="${esc(n.logo || 'img/logo-nivytek.svg')}" alt="Nivytek" width="32" height="32"><span class="logo-texto">${esc(n.nombre || '')}</span></a>
  <nav class="nav" aria-label="Principal"><a href="index.html">Inicio</a> <a href="catalogo.html">Catálogo</a> <a href="catalogo.html?f=ofertas">Ofertas</a> <a href="catalogo.html?f=nuevos">Novedades</a> <a href="preguntas.html">Preguntas</a></nav>
</div></div>`;
const categoriasConProductos = catalogo.categorias.filter(c => c.visible !== false && visibles.some(p => p.categoria === c.id));
const pie = `<div class="contenedor"><div class="pie-grid">
  <div><a class="logo" href="index.html" style="color:#fff"><span>${esc(n.nombre || '')}</span></a><p style="margin-top:.6rem;font-size:.92rem">${esc(n.descripcion || '')}</p></div>
  <div><h3 class="pie-titulo">Categorías</h3><ul>${categoriasConProductos.map(c => `<li><a href="catalogo.html?cat=${encodeURIComponent(c.id)}">${esc(c.nombre)}</a></li>`).join('')}</ul></div>
  <div><h3 class="pie-titulo">Ayuda</h3><ul><li><a href="preguntas.html">Preguntas frecuentes</a></li><li><a href="politicas.html#entregas">Entregas</a></li><li><a href="politicas.html#pagos">Pagos</a></li><li><a href="politicas.html#cambios">Cambios y garantías</a></li><li><a href="politicas.html#privacidad">Privacidad y datos</a></li></ul></div>
  <div><h3 class="pie-titulo">Contacto</h3><ul>${numWA ? `<li><a href="https://wa.me/${numWA}?text=${encodeURIComponent(wa.mensajeGeneral || '')}" target="_blank" rel="noopener">WhatsApp: +${numWA}</a></li>` : ''}${n.ciudad ? `<li>${esc(n.ciudad)}</li>` : ''}</ul></div>
</div><div class="pie-bajo"><span>© ${new Date().getFullYear()} ${esc(n.nombre || '')}. Todos los derechos reservados.</span><span>Abrir WhatsApp no confirma una compra ni garantiza inventario disponible.</span></div></div>`;

/* ---------- Fichas de producto ---------- */
mkdirSync(join(raiz, 'p'), { recursive: true });
for (const f of readdirSync(join(raiz, 'p'))) if (f.endsWith('.html')) unlinkSync(join(raiz, 'p', f));

const imagenFicha = (p, i) => {
  const src = p.imagenes[i]; const m = medidas(src);
  const w = m ? m.ancho : 800, h = m ? m.alto : 800;
  const attrs = `width="${w}" height="${h}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}`;
  return T.picture(p, i, attrs, p.nombre + (i ? `, foto ${i + 1}` : ''));
};

let nFichas = 0;
for (const p of visibles) {
  const cat = T.categoria(p.categoria);
  const d = T.descuento(p);
  const desc = (p.descripcionCorta || p.descripcion || '').replace(/\s+/g, ' ').trim().slice(0, 155);
  const titulo = `${p.nombre} · ${n.nombre || ''}`;
  const url = urlAbs(p);
  const og = ogDe(p);
  const marca = (p.especificaciones || {}).Marca || '';
  const disponibilidad = !p.disponible ? 'https://schema.org/OutOfStock' : T.esEncargo(p) ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.nombre, sku: p.slug, url,
    image: p.imagenes.length ? p.imagenes.map(abs) : [og], description: desc || p.nombre,
    ...(marca ? { brand: { '@type': 'Brand', name: marca.replace(/\s*\(.*\)$/, '') } } : {}),
    ...(cat ? { category: cat.nombre } : {}),
    offers: { '@type': 'Offer', url, price: p.precio, priceCurrency: 'COP', availability: disponibilidad, itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: n.nombre || 'Nivytek' } }
  };
  const msg = encodeURIComponent(T.plantilla(T.esEncargo(p) ? 'Hola, quiero pedir por encargo {nombre} ({precio}). ¿Me confirman si la oferta sigue activa para separarlo?\n{enlace}' : (wa.mensajeProducto || 'Hola, estoy interesado en {nombre} ({precio}). {enlace}'), { nombre: p.nombre, precio: precio(p.precio), enlace: url, variantes: '' }).trim());
  const specs = Object.entries(p.especificaciones || {});
  const polItem = (t, v, ancla) => `<li><strong>${t}:</strong> ${esc(v || 'Consúltalo por WhatsApp')} <a href="politicas.html#${ancla}">Ver más</a></li>`;
  const relacionados = ((p.relacionados || []).map(T.producto).filter(x => x && x.visible !== false).length ? (p.relacionados || []).map(T.producto).filter(x => x && x.visible !== false) : visibles.filter(x => x.id !== p.id && x.categoria === p.categoria)).slice(0, 4);
  const faqs = T.faqs(); const faqsDest = (faqs.filter(q => q.destacada).length ? faqs.filter(q => q.destacada) : faqs).slice(0, 4);
  const estado = T.esEncargo(p) ? (p.disponible ? (p.consultar ? '● Por encargo · consulta si la oferta sigue activa' : '● Disponible por encargo') : '○ Agotado por ahora') : p.disponible ? '● Disponible (sujeto a confirmación)' + (T.textoStock(p) ? ' · ' + T.textoStock(p) : '') : T.vendido(p) ? '○ Vendido' : '○ Agotado por ahora';

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(p.nombre)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:secure_url" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.nombre)}">
<meta property="og:site_name" content="${esc(n.nombre || '')}">
<meta property="og:locale" content="es_CO">
<meta property="product:price:amount" content="${Number(p.precio) || 0}">
<meta property="product:price:currency" content="COP">
<meta property="product:availability" content="${p.disponible ? 'in stock' : 'out of stock'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.nombre)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(og)}">
<meta name="theme-color" content="${esc((config.marca || {}).colorPrimario || '#1e3a5f')}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${fuentes}
</head>
<body data-producto="${esc(p.id)}">
<header class="encabezado" id="encabezado">${encabezado}</header>
<main class="contenedor" id="producto">
  <nav class="migas" aria-label="Ruta"><a href="index.html">Inicio</a> › <a href="catalogo.html">Catálogo</a> ${cat ? `› <a href="catalogo.html?cat=${encodeURIComponent(cat.id)}">${esc(cat.nombre)}</a>` : ''} › <span>${esc(p.nombre)}</span></nav>
  <div class="producto-layout">
    <div>
      <div class="galeria-wrap">
        <div class="etiquetas">${!p.disponible ? `<span class="etiqueta etiqueta-agotado">${T.vendido(p) ? 'Vendido' : 'Agotado'}</span>` : ''}${p.oferta && d > 0 ? `<span class="etiqueta etiqueta-oferta">-${d}%</span>` : ''}${T.esEncargo(p) ? '<span class="etiqueta etiqueta-encargo">Por encargo</span>' : p.nuevo ? '<span class="etiqueta etiqueta-nuevo">Nuevo</span>' : ''}</div>
        ${T.cintaEnvio(p)}
        <div class="galeria-principal" id="galeria" aria-label="Galería de imágenes">
          ${p.imagenes.length ? p.imagenes.map((src, i) => `<div class="slide" data-i="${i}">${imagenFicha(p, i)}</div>`).join('\n          ') : `<div class="slide" data-i="0"><img src="img/sin-imagen.svg" alt="${esc(p.nombre)}" width="800" height="800"></div>`}
        </div>
      </div>
    </div>
    <div class="ficha">
      ${cat ? `<span class="tarjeta-categoria-txt">${esc(cat.nombre)}</span>` : ''}
      <h1>${esc(p.nombre)}</h1>
      ${p.descripcionCorta ? `<p class="descripcion-corta">${esc(p.descripcionCorta)}</p>` : ''}
      ${T.lineaResenas(p)}
      <div class="precio"><span class="precio-actual">${precio(p.precio)}</span>${d > 0 ? `<span class="precio-anterior">${precio(p.precioAnterior)}</span>` : ''}</div>
      <span class="disponibilidad ${p.disponible ? '' : 'agotado'}">${estado}</span>
      ${p.guia ? `<p class="aviso-encargo">${esc(p.guia)}</p>` : ''}
      ${T.esEncargo(p) ? `<p class="aviso-encargo">${p.disponible ? esc(T.TEXTO_ENCARGO) : 'Esta oferta se acabó. Escríbenos y te avisamos cuando vuelva.'}</p>` : ''}
      <div class="ficha-acciones">
        ${numWA ? `<a class="btn btn-whatsapp" href="https://wa.me/${numWA}?text=${msg}" target="_blank" rel="noopener">${T.ico.wa} ${p.disponible ? 'Pedir por WhatsApp' : 'Preguntar por WhatsApp'}</a>` : ''}
      </div>
      <div class="micro-confianza">
        <div>${T.icoCat.chat}Atención por una persona real</div>
        <div>${T.icoCat.escudo}Pagas solo tras confirmar</div>
        <div>${T.icoCat.camion}Envío cotizado antes de pagar</div>
      </div>
      <p class="nota-legal">Abrir WhatsApp no confirma la compra ni garantiza inventario. Te confirmamos disponibilidad, precio final y envío en el chat.</p>
      <ul style="font-size:.9rem;color:var(--texto-suave);margin-top:1rem;padding-left:1rem">
        ${polItem('Entrega', pol.entregas, 'entregas')}${polItem('Pago', pol.pagos, 'pagos')}${polItem('Cambios', pol.cambios, 'cambios')}${polItem('Garantía', pol.garantia, 'cambios')}
      </ul>
    </div>
  </div>
  <div class="bloque"><h2>Descripción</h2>${p.descripcion ? `<p>${parrafos(p.descripcion)}</p>` : ''}
    ${p.problema ? `<h3 style="margin-top:1rem">¿Qué resuelve?</h3><p>${esc(p.problema)}</p>` : ''}
    ${p.beneficios.length ? `<h3 style="margin-top:1rem">Beneficios</h3>${lista(p.beneficios)}` : ''}</div>
  ${specs.length ? `<div class="bloque"><h2>Características y especificaciones</h2><table class="tabla-specs">${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>` : ''}
  ${p.incluye.length ? `<div class="bloque"><h2>¿Qué incluye?</h2>${lista(p.incluye)}</div>` : ''}
  ${p.instrucciones.length ? `<div class="bloque"><h2>Cómo se usa</h2>${listaNum(p.instrucciones)}</div>` : ''}
  ${p.precauciones.length ? `<div class="bloque"><h2>Recomendaciones y precauciones</h2>${lista(p.precauciones)}</div>` : ''}
  ${T.bloqueResenas(p)}
  ${p.preguntas.length ? `<div class="bloque"><h2>Preguntas frecuentes</h2>${p.preguntas.map(q => `<details class="faq"><summary>${esc(q.p)}</summary><p>${esc(q.r)}</p></details>`).join('')}</div>` : ''}
  ${faqsDest.length ? `<div class="bloque"><h2>Compra con tranquilidad</h2>${T.renderFaq(faqsDest)}<p style="margin:.8rem 0 0"><a href="preguntas.html">Ver todas las preguntas frecuentes →</a></p></div>` : ''}
  ${relacionados.length ? `<section class="seccion"><div class="seccion-cabecera"><h2>Productos relacionados</h2></div><div class="grid-productos">${relacionados.map(T.tarjeta).join('')}</div></section>` : ''}
</main>
<footer class="pie" id="pie">${pie}</footer>
<script src="js/config.js"></script>
<script src="js/app.js"></script>
<script src="js/producto.js"></script>
</body>
</html>
`;
  escribir(urlFicha(p), absolutizar(html));
  nFichas++;
}

/* ---------- Contenido inicial en las páginas (entre marcas <!-- generado:x --> ... <!-- /generado:x -->) ---------- */
function inyectar(archivo, bloques) {
  let html = readFileSync(join(raiz, archivo), 'utf8');
  for (const [clave, contenido] of Object.entries(bloques)) {
    const re = new RegExp(`<!-- generado:${clave} -->[\\s\\S]*?<!-- /generado:${clave} -->`);
    if (!re.test(html)) { console.warn(`  (aviso) ${archivo} no tiene la marca generado:${clave}`); continue; }
    html = html.replace(re, `<!-- generado:${clave} -->${contenido}<!-- /generado:${clave} -->`);
  }
  escribir(archivo, html);
}

{ // index.html
  const h = config.portada || {};
  const hero = `<div>${h.etiqueta ? `<span class="hero-etiqueta">${esc(h.etiqueta)}</span>` : ''}<h1>${esc(h.titulo || n.eslogan || '')}</h1><p>${esc(h.subtitulo || n.descripcion || '')}</p><div class="hero-acciones"><a class="btn btn-acento" href="catalogo.html">Explorar todos los productos</a><a class="btn btn-contorno" href="catalogo.html?f=ofertas">Ver ofertas</a></div></div>${h.imagen ? `<div class="hero-imagen"><picture><source type="image/webp" srcset="${esc(h.imagen.replace(/\.png$/, '.webp'))}"><img src="${esc(h.imagen)}" alt="Productos de la tienda Nivytek" width="380" height="380" fetchpriority="high"></picture></div>` : ''}`;
  const cats = categoriasConProductos.map(c => { const k = visibles.filter(p => p.categoria === c.id).length; return `<a class="tarjeta-categoria" href="catalogo.html?cat=${encodeURIComponent(c.id)}"><span class="icono">${T.icono(c.icono, 'svg:etiqueta')}</span><strong>${esc(c.nombre)}</strong><span>${k} producto${k === 1 ? '' : 's'}</span></a>`; }).join('');
  const confianza = (config.confianza || []).map(x => `<div class="confianza-item"><span class="icono">${T.icono(x.icono, 'svg:escudo')}</span><div><strong>${esc(x.titulo)}</strong><span>${esc(x.texto)}</span></div></div>`).join('');
  const pasos = (config.pasosCompra || []).map((p, i) => `<div class="paso"><span class="paso-num">${i + 1}</span><strong>${esc(p.titulo)}</strong><span>${esc(p.texto)}</span></div>`).join('');
  const faqs = T.faqs(); const dest = faqs.filter(q => q.destacada);
  const destacados = visibles.filter(p => p.destacado).slice(0, 8).map(T.tarjeta).join('');
  inyectar('index.html', { hero, categorias: cats, destacados, confianza, pasos, faq: T.renderFaq((dest.length ? dest : faqs).slice(0, 5)) });
}
{ // catalogo.html
  const orden = visibles.slice().sort((a, b) => (b.disponible - a.disponible) || (b.destacado - a.destacado) || ((a.orden || 0) - (b.orden || 0)));
  inyectar('catalogo.html', { grid: orden.map(T.tarjeta).join(''), sub: `${visibles.length} producto${visibles.length === 1 ? '' : 's'} con pedido por WhatsApp.` });
}
{ // preguntas.html
  const faqs = T.faqs(); const grupos = []; faqs.forEach(q => { const g = q.grupo || 'General'; if (!grupos.includes(g)) grupos.push(g); });
  const html = grupos.map(g => `<section class="bloque" id="g-${T.slug(g)}"><h2 style="margin-top:0">${esc(g)}</h2>${T.renderFaq(faqs.filter(q => (q.grupo || 'General') === g))}</section>`).join('');
  inyectar('preguntas.html', { faq: html });
}
{ // politicas.html
  const sec = (id, titulo, txt) => `<section class="bloque" id="${id}"><h2 style="margin-top:0">${titulo}</h2>${txt ? `<p>${parrafos(txt)}</p>` : '<p>Consúltalo por WhatsApp.</p>'}</section>`;
  inyectar('politicas.html', { politicas: sec('entregas', 'Entregas y envíos', pol.entregas) + sec('pagos', 'Métodos de pago', pol.pagos) + sec('cambios', 'Cambios, devoluciones y garantías', [pol.cambios, pol.garantia].filter(Boolean).join('\n\n')) + sec('privacidad', 'Privacidad y tratamiento de datos', pol.privacidad) });
}

/* ---------- sitemap.xml y robots.txt ---------- */
{
  const hoy = new Date().toISOString().slice(0, 10);
  const urls = [['', '1.0'], ['catalogo.html', '0.9'], ['preguntas.html', '0.5'], ['politicas.html', '0.4'], ...visibles.map(p => [urlFicha(p), '0.8'])];
  escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `  <url><loc>${esc(SITIO + u)}</loc><lastmod>${hoy}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);
  escribir('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /producto.html\n\nSitemap: ${SITIO}sitemap.xml\n`);
}

/* ---------- Redirecciones de los enlaces viejos (vercel.json en la raíz del repositorio) ---------- */
{
  const f = join(raiz, '..', 'vercel.json');
  if (existsSync(f)) {
    const v = JSON.parse(readFileSync(f, 'utf8'));
    const esGenerada = (r) => r.source === '/producto.html' && (r.has || []).some(h => h.type === 'query' && h.key === 'p');
    v.redirects = (v.redirects || []).filter(r => !esGenerada(r));
    v.redirects = v.redirects.filter(r => !(r.source.startsWith('/p/') && r.destination.startsWith('/p/')));
    for (const p of catalogo.productos) {
      v.redirects.push({ source: '/producto.html', has: [{ type: 'query', key: 'p', value: p.id }], destination: '/' + urlFicha(p), permanent: true });
      if (p.slug !== p.id && !/^(ya|enc|combo)-/.test(p.id)) v.redirects.push({ source: '/p/' + p.id + '.html', destination: '/' + urlFicha(p), permanent: true });
    }
    // ids o slugs viejos que ya no existen (quedan en data/slugs.json apuntando al slug nuevo)
    const actuales = new Set(catalogo.productos.map(p => p.id));
    for (const [viejo, slug] of Object.entries(slugs)) if (!actuales.has(viejo) && viejo !== slug && catalogo.productos.some(p => p.slug === slug)) {
      v.redirects.push({ source: '/producto.html', has: [{ type: 'query', key: 'p', value: viejo }], destination: '/p/' + slug + '.html', permanent: true });
      v.redirects.push({ source: '/p/' + viejo + '.html', destination: '/p/' + slug + '.html', permanent: true });
    }
    writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
    console.log(`vercel.json: ${catalogo.productos.length} redirecciones producto.html?p=… → p/<slug>.html`);
  }
}

console.log(`${nFichas} fichas en p/, contenido inicial en index/catalogo/preguntas/politicas, sitemap.xml y robots.txt actualizados.`);
