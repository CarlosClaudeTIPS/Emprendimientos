#!/usr/bin/env node
/**
 * Genera la página "Inventario Nivytek" (HTML autónomo, fotos incrustadas) para publicarla
 * como artefacto compartido: qué hay, cuántas unidades, a qué precio, qué está vendido,
 * qué es por encargo y los combos. NO incluye costos ni ganancias.
 * Uso: node scripts/inventario-artefacto.mjs <salida.html>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const salida = process.argv[2] || join(raiz, '..', 'inventario.html');
const leer = (f) => JSON.parse(readFileSync(join(raiz, f), 'utf8'));
const config = leer('data/config.json');
const catalogo = leer('data/catalogo.json');
const encargo = leer('data/encargo.json');
const combos = existsSync(join(raiz, 'data/combos.json')) ? leer('data/combos.json') : { combos: [] };
const pendientes = existsSync(join(raiz, 'data/encargo-pendientes.json')) ? leer('data/encargo-pendientes.json') : { productos: [] };

const noop = () => { };
const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, removeAttribute: noop, appendChild: noop, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], innerHTML: '' });
const sb = { console, setTimeout, clearTimeout, URL, URLSearchParams, encodeURIComponent, decodeURIComponent, Math, Date, JSON, Number, String, Object, Array, Promise, isNaN, parseInt,
  location: { href: 'https://tienda.nivytek.com/', origin: 'https://tienda.nivytek.com', pathname: '/', search: '', hostname: 'tienda.nivytek.com', protocol: 'https:' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, navigator: {},
  document: Object.assign(el(), { documentElement: { style: { setProperty: noop } }, head: el(), body: el(), createElement: el, getElementsByTagName: () => [el()] }) };
sb.window = sb; vm.runInNewContext(readFileSync(join(raiz, 'js/app.js'), 'utf8'), sb);
const T = sb.Tienda; T.slugs = leer('data/slugs.json');
T.agregarEncargo(catalogo, encargo); T.agregarCombos(catalogo, combos);
catalogo.productos = catalogo.productos.map(T.normalizarProducto);
T.datos = { config, catalogo };

const dataUri = (ruta) => { const f = join(raiz, ruta.replace(/\.jpg$/, '-400.webp')); return existsSync(f) ? 'data:image/webp;base64,' + readFileSync(f).toString('base64') : ''; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const precio = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const hoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });

const filas = catalogo.productos.filter(p => p.visible !== false).map(p => {
  const estado = T.vendido(p) ? 'vendido' : !p.disponible ? 'agotado' : p.esCombo ? 'combo' : p.modalidad === 'encargo' ? 'encargo' : 'stock';
  return { id: p.id, nombre: p.nombre, cat: (T.categoria(p.categoria) || {}).nombre || '', precio: p.precio, unidades: p.stock, estado, foto: dataUri((p.imagenes || [])[0] || ''), url: 'https://tienda.nivytek.com/p/' + (p.slug || p.id) + '.html', componentes: p.esCombo ? p.incluye : null };
}).concat((pendientes.productos || []).map(p => ({ id: p.id, nombre: p.nombre, cat: p.categoria || '', precio: Number(String(p.precio).replace(/\D/g, '')), unidades: null, estado: 'pendiente', foto: '', url: '', componentes: null })));

const E = { stock: ['En stock', 'ok'], combo: ['Combo', 'combo'], encargo: ['Por encargo', 'enc'], pendiente: ['Por encargo · sin publicar', 'pend'], vendido: ['Vendido', 'off'], agotado: ['Agotado', 'off'] };
const enStock = filas.filter(f => f.estado === 'stock');
const unidades = enStock.reduce((s, f) => s + (f.unidades || 0), 0);
const valor = enStock.reduce((s, f) => s + (f.unidades || 0) * f.precio, 0);
const resumen = [['Productos en stock', enStock.length], ['Unidades en stock', unidades], ['Valor en inventario (precio de venta)', precio(valor)], ['Combos publicados', filas.filter(f => f.estado === 'combo').length], ['Por encargo', filas.filter(f => f.estado === 'encargo' || f.estado === 'pendiente').length], ['Vendidos', filas.filter(f => f.estado === 'vendido').length]];

const tarjeta = (f) => `<article class="it" data-estado="${f.estado}" data-txt="${esc((f.nombre + ' ' + f.cat).toLowerCase())}">
  <div class="foto">${f.foto ? `<img src="${f.foto}" alt="${esc(f.nombre)}" loading="lazy" width="120" height="120">` : '<span class="sinfoto">sin foto</span>'}</div>
  <div class="info"><span class="cat">${esc(f.cat)}</span><h3>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(f.nombre)}</h3>
  ${f.componentes ? `<p class="comp">Incluye: ${esc(f.componentes.join(' + '))}</p>` : ''}
  <div class="meta"><span class="pill ${E[f.estado][1]}">${E[f.estado][0]}</span><span class="precio">${precio(f.precio)}</span><span class="uni">${f.unidades != null ? (f.unidades === 1 ? '1 unidad' : f.unidades + ' unidades') : (f.estado === 'stock' ? 'unidades sin dato' : f.estado === 'vendido' ? '0 unidades' : 'llega en máx. 15 días')}</span></div></div>
</article>`;

const html = `<title>Inventario Nivytek</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
/* Lista operativa: resumen arriba, filtros, tarjetas de una línea por producto */
:root{--bg:#f6f7f9;--card:#ffffff;--fg:#1d2433;--muted:#5b6474;--line:#dfe3ea;--accent:#1e3a5f;--ok:#166534;--okbg:#dcfce7;--enc:#92400e;--encbg:#fef3c7;--combo:#5b21b6;--combobg:#ede9fe;--off:#6b7280;--offbg:#e5e7eb;--pend:#1d4ed8;--pendbg:#dbeafe}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:"Plus Jakarta Sans",system-ui,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 48px;font-size:15px;line-height:1.45}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:1.6rem;font-weight:800;margin:0;text-wrap:balance}
.sub{color:var(--muted);margin:.2rem 0 1.2rem}
.resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:1.2rem}
.resumen div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.resumen b{display:block;font-size:1.3rem;font-weight:800;font-variant-numeric:tabular-nums}
.resumen span{font-size:.78rem;color:var(--muted)}
.filtros{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:1rem}
.filtros input{flex:1 1 200px;min-width:0;padding:.55rem .8rem;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font:inherit}
.filtros button{padding:.4rem .8rem;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font:inherit;font-size:.85rem;cursor:pointer}
.filtros button[aria-pressed="true"]{background:var(--accent);color:var(--bg);border-color:var(--accent)}
.filtros button:focus-visible,.filtros input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.lista{display:grid;gap:10px}
.it{display:grid;grid-template-columns:88px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px}
.it[hidden]{display:none}
.foto{width:88px;height:88px;border-radius:8px;background:#fff;display:grid;place-items:center;overflow:hidden}
.foto img{width:100%;height:100%;object-fit:contain}
.sinfoto{font-size:.7rem;color:var(--muted)}
.info{min-width:0}
.cat{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600}
h3{margin:.1rem 0 .25rem;font-size:1rem;font-weight:600;line-height:1.3}
h3 a{color:inherit;text-decoration:none}h3 a:hover{text-decoration:underline}
.comp{margin:0 0 .3rem;font-size:.82rem;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.pill{font-size:.75rem;font-weight:700;padding:.15rem .6rem;border-radius:999px}
.pill.ok{color:var(--ok);background:var(--okbg)}.pill.enc{color:var(--enc);background:var(--encbg)}.pill.combo{color:var(--combo);background:var(--combobg)}.pill.off{color:var(--off);background:var(--offbg)}.pill.pend{color:var(--pend);background:var(--pendbg)}
.precio{font-weight:800;font-variant-numeric:tabular-nums}
.uni{font-size:.85rem;color:var(--muted)}
.it[data-estado="vendido"] .foto,.it[data-estado="agotado"] .foto{filter:grayscale(1);opacity:.7}
.pie{margin-top:1.5rem;font-size:.8rem;color:var(--muted)}
@media (max-width:420px){.it{grid-template-columns:68px 1fr}.foto{width:68px;height:68px}}
</style>
<div class="wrap">
<h1>Inventario Nivytek</h1>
<p class="sub">Actualizado el ${esc(hoy)} · ${filas.length} referencias · precios de venta al público</p>
<div class="resumen">${resumen.map(([t, v]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<div class="filtros"><input id="q" type="search" placeholder="Buscar producto o categoría" aria-label="Buscar">
${[['todos', 'Todos'], ['stock', 'En stock'], ['combo', 'Combos'], ['encargo', 'Por encargo'], ['pendiente', 'Sin publicar'], ['vendido', 'Vendidos']].map(([k, t]) => `<button type="button" data-f="${k}" aria-pressed="${k === 'todos'}">${t}</button>`).join('')}</div>
<div class="lista" id="lista">${filas.map(tarjeta).join('\n')}</div>
<p class="pie">Esta página la actualiza sola la rutina de la tienda cada vez que cambia el inventario (3 veces al día). Los enlaces abren la ficha pública en tienda.nivytek.com. No muestra costos ni ganancias.</p>
</div>
<script>
(function(){var f='todos',q='';var bs=document.querySelectorAll('.filtros button'),items=document.querySelectorAll('.it');
function aplicar(){items.forEach(function(it){var ok=(f==='todos'||it.dataset.estado===f)&&(!q||it.dataset.txt.indexOf(q)>-1);it.hidden=!ok;});}
bs.forEach(function(b){b.addEventListener('click',function(){f=b.dataset.f;bs.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});aplicar();});});
document.getElementById('q').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();aplicar();});})();
</script>
`;
writeFileSync(salida, html);
console.log(`Inventario: ${filas.length} referencias → ${salida}`);
