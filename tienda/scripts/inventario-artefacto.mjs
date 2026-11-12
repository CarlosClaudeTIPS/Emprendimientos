#!/usr/bin/env node
/**
 * Genera "Administración Nivytek": página privada (artefacto compartido con quien Carlos invite)
 * con inventario, costos y ganancia, combos, por encargo, vendidos, el Ranking de ofertas para
 * decidir qué traer, registro de pedidos y vista por cliente. Las decisiones (publicar, precio,
 * descuento) y los pedidos se guardan en la base de datos del artefacto; la rutina las aplica a la hoja.
 * Uso: node scripts/inventario-artefacto.mjs <salida.html> [costos.json] [ranking.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const salida = process.argv[2] || join(raiz, '..', 'inventario.html');
const costosPath = process.argv[3] || '';
const rankingPath = process.argv[4] || '';
const candidatosPath = process.argv[5] || '';
const leer = (f) => JSON.parse(readFileSync(join(raiz, f), 'utf8'));
const config = leer('data/config.json');
const catalogo = leer('data/catalogo.json');
const encargo = leer('data/encargo.json');
const combos = existsSync(join(raiz, 'data/combos.json')) ? leer('data/combos.json') : { combos: [] };
const pendientes = existsSync(join(raiz, 'data/encargo-pendientes.json')) ? leer('data/encargo-pendientes.json') : { productos: [] };
const privado = costosPath && existsSync(costosPath) ? JSON.parse(readFileSync(costosPath, 'utf8')) : { costos: {} };
const ranking = rankingPath && existsSync(rankingPath) ? JSON.parse(readFileSync(rankingPath, 'utf8')) : { filas: [] };
const candidatos = candidatosPath && existsSync(candidatosPath) ? JSON.parse(readFileSync(candidatosPath, 'utf8')) : [];
const costoDe = (id) => { const c = (privado.costos || {})[id]; return typeof c === 'number' ? c : null; };

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
const precio = (n) => n == null ? '—' : '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const hoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });

const items = catalogo.productos.filter(p => p.visible !== false).map(p => {
  const estado = T.vendido(p) ? 'vendido' : !p.disponible ? 'agotado' : p.esCombo ? 'combo' : p.modalidad === 'encargo' ? 'encargo' : 'stock';
  const costo = p.esCombo ? (p.componentes.every(c => costoDe(c) != null) ? p.componentes.reduce((s, c) => s + costoDe(c), 0) : null) : costoDe(p.id);
  return { id: p.id, nombre: p.nombre, cat: (T.categoria(p.categoria) || {}).nombre || 'Otros', precio: p.precio, costo, unidades: p.stock, estado, foto: dataUri((p.imagenes || [])[0] || ''), url: 'https://tienda.nivytek.com/p/' + (p.slug || p.id) + '.html', componentes: p.esCombo ? p.incluye : null, descuento: p.esCombo ? ((combos.combos.find(k => k.id === p.id) || {}).descuento || 10) : null,
    partes: p.esCombo ? p.componentes.map(c => { const q = catalogo.productos.find(x => x.id === c) || {}; return { id: c, nombre: q.nombre || c, precio: q.precio || 0 }; }) : null };
}).concat((pendientes.productos || []).map(p => ({ id: p.id, nombre: p.nombre, cat: p.categoria || 'Otros', precio: Number(String(p.precio).replace(/\D/g, '')), costo: costoDe(p.id), unidades: null, estado: 'pendiente', foto: '', url: '', componentes: null })));

const E = { stock: ['En stock', 'ok'], combo: ['Combo', 'combo'], encargo: ['Por encargo', 'enc'], pendiente: ['Por encargo · sin publicar', 'pend'], vendido: ['Vendido', 'off'], agotado: ['Agotado', 'off'] };
const enStock = items.filter(f => f.estado === 'stock');
const unidades = enStock.reduce((s, f) => s + (f.unidades || 0), 0);
const valor = enStock.reduce((s, f) => s + (f.unidades || 0) * f.precio, 0);
const invertido = enStock.reduce((s, f) => s + (f.unidades || 0) * (f.costo || 0), 0);
const resumen = [['Unidades en stock', unidades], ['Valor a precio de venta', precio(valor)], ['Costo del inventario', precio(invertido)], ['Ganancia si se vende todo', precio(valor - invertido)], ['Combos publicados', items.filter(f => f.estado === 'combo').length], ['Vendidos', items.filter(f => f.estado === 'vendido').length]];

const fila = (f) => `<article class="it" data-estado="${f.estado}" data-cat="${esc(f.cat)}" data-txt="${esc((f.nombre + ' ' + f.cat).toLowerCase())}">
  <div class="foto">${f.foto ? `<img src="${f.foto}" alt="${esc(f.nombre)}" loading="lazy" width="120" height="120">` : '<span class="sinfoto">sin foto</span>'}</div>
  <div class="info"><span class="cat">${esc(f.cat)}</span><h3>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(f.nombre)}</h3>
  ${f.partes ? `<ul class="partes">${f.partes.map(x => `<li><span>${esc(x.nombre)}</span><b>${precio(x.precio)}</b></li>`).join('')}<li class="suma"><span>Por separado</span><b class="p-suma" data-suma="${f.partes.reduce((s, x) => s + x.precio, 0)}">${precio(f.partes.reduce((s, x) => s + x.precio, 0))}</b></li><li class="suma"><span>En combo (<span class="p-desc">${f.descuento}</span> % menos)</span><b class="p-combo">${precio(f.precio)}</b></li></ul>` : f.componentes ? `<p class="comp">Incluye: ${esc(f.componentes.join(' + '))}</p>` : ''}
  <div class="meta"><span class="pill ${E[f.estado][1]}">${E[f.estado][0]}</span><span class="precio">${precio(f.precio)}</span><span class="uni">${f.unidades != null ? (f.unidades === 1 ? '1 unidad' : f.unidades + ' unidades') : (f.estado === 'stock' ? 'unidades sin dato' : f.estado === 'vendido' ? '0 unidades' : 'llega en máx. 15 días')}</span>
  <span class="costo">Costo ${precio(f.costo)}${f.costo != null ? ` · Ganancia <b>${precio(f.precio - f.costo)}</b>` : ''}</span></div>
  ${f.estado === 'combo' ? `<div class="decision" data-tipo="combo" data-key="cb-${esc(f.id)}" data-nombre="${esc(f.nombre)}"><label><input type="checkbox" class="d-pub" checked> Publicado</label><label>Descuento %<input type="number" class="d-desc" min="0" max="60" value="${f.descuento}"></label><span class="d-estado"></span></div>` : ''}</div>
</article>`;
const seccion = (id, titulo, lista, vacio) => `<section id="sec-${id}" class="sec" data-sec="${id}"><h2>${esc(titulo)}</h2>${lista.length ? `<div class="lista">${lista.map(fila).join('\n')}</div>` : `<p class="vacio">${esc(vacio)}</p>`}</section>`;

/* Cuidado de la piel: ofertas leídas de los canales públicos de Telegram (candidatos.json, privado) */
const cdFila = (c) => `<article class="it rk" data-txt="${esc((c.titulo + ' ' + c.canal).toLowerCase())}">
  <div class="foto">${c.foto ? `<img src="${esc(c.foto)}" alt="" loading="lazy" width="120" height="120" referrerpolicy="no-referrer">` : '<span class="sinfoto">sin imagen</span>'}</div>
  <div class="info"><span class="cat">${esc(c.canal)} · ${esc(c.fecha)}${c.cupon ? ` · cupón <b>${esc(c.cupon)}</b>` : ''}</span><h3>${esc(c.titulo)}</h3>
  <div class="meta"><span class="precio">Sugerido ${precio(c.sugerido)}</span><span class="costo">Costo ${precio(c.costo)} (US$${c.precioLista} sin descuento${c.precioOferta !== c.precioLista ? `, oferta US$${c.precioOferta}` : ''}) · Ganancia <b>${precio(c.ganancia)}</b></span>
  ${c.link ? `<a class="lnk" href="${esc(c.link)}" target="_blank" rel="noopener">Ver oferta</a>` : ''}</div></div>
</article>`;
const secPiel = `<section id="sec-piel" class="sec" data-sec="piel"><h2>Cuidado de la piel: ofertas recientes en Telegram</h2>
<p class="aviso">Ofertas de cuidado de la piel y el cuerpo vistas en los canales públicos (ClubGratis, ReviuDescuentos, DescuentosHome, DescuentosTech) en las últimas tres semanas. El costo usa el precio sin descuento a $3.500 por dólar y el sugerido deja unos $30.000 por unidad. Para traer alguno, dímelo o anótalo en la pestaña de su categoría en la hoja.</p>
${candidatos.length ? `<div class="lista">${candidatos.map(cdFila).join('\n')}</div>` : '<p class="vacio">Sin candidatos todavía.</p>'}</section>`;

/* Ranking: ofertas candidatas */
const catsRk = [...new Set(ranking.filas.map(r => r.categoria).filter(Boolean))].sort();
const rkFila = (r) => `<article class="it rk" data-cat="${esc(r.categoria)}" data-txt="${esc((r.producto + ' ' + r.categoria + ' ' + r.porque).toLowerCase())}" data-puntaje="${r.puntaje || 0}">
  <div class="foto"><b class="punt">${r.puntaje ?? ''}</b>${r.imagen ? `<img src="${esc(r.imagen)}" alt="" loading="lazy" width="120" height="120" referrerpolicy="no-referrer">` : '<span class="sinfoto">sin imagen</span>'}</div>
  <div class="info"><span class="cat">${esc(r.categoria)} · puesto ${r.puesto ?? ''}${r.semaforo ? ` · <span class="sem sem-${esc(r.semaforo.toLowerCase())}">${esc(r.semaforo)}</span>` : ''}</span><h3>${esc(r.producto)}</h3>
  <p class="comp">${esc(r.porque)}</p>
  <div class="meta"><span class="precio">Sugerido ${precio(r.sugerido)}</span><span class="costo">Costo ${precio(r.costo)}${r.sugerido && r.costo ? ` · Ganancia <b>${precio(r.sugerido - r.costo)}</b>` : ''}${r.precioCo ? ` · En Colombia ~${precio(r.precioCo)}` : ''}</span>
  ${r.link ? `<a class="lnk" href="${esc(r.link)}" target="_blank" rel="noopener">Ver oferta</a>` : ''}${r.estado ? `<span class="uni">${esc(r.estado)}</span>` : ''}${r.publicado ? `<span class="pill pend">${esc(r.publicado)}</span>` : ''}</div>
  <div class="decision" data-tipo="ranking" data-key="rk-${slug(r.producto)}" data-fila="${r.fila}" data-nombre="${esc(r.producto)}"><label><input type="checkbox" class="d-pub"${r.publicar ? ' checked' : ''}> Publicar en la tienda</label><label>Lo ofrezco a $<input type="number" class="d-precio" min="0" step="100" value="${r.ofrezco ?? ''}" placeholder="${r.sugerido ?? ''}"></label><span class="modal"><label><input type="radio" name="m-${slug(r.producto)}" class="d-mod" value="encargo" checked> Por encargo</label><label><input type="radio" name="m-${slug(r.producto)}" class="d-mod" value="disponible"> Ya lo tengo</label><label class="d-uni-l" hidden>Unidades<input type="number" class="d-uni" min="1" value="1"></label></span><span class="d-estado"></span></div></div>
</article>`;

const cats = [...new Set(items.filter(f => f.estado !== 'vendido' && f.estado !== 'agotado').map(f => f.cat))].sort();
const opcionesPorCat = JSON.stringify(Object.fromEntries(cats.map(c => [c, items.filter(f => f.cat === c && f.estado !== 'vendido' && f.estado !== 'agotado').map(f => ({ n: f.nombre, p: f.precio }))])));

const html = `<title>Administración Nivytek</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
/* Panel operativo: resumen, pestañas, filtro por categoría, una tarjeta por referencia, decisiones y pedidos guardados */
:root{--bg:#f6f7f9;--card:#ffffff;--fg:#1d2433;--muted:#5b6474;--line:#dfe3ea;--accent:#1e3a5f;--ok:#166534;--okbg:#dcfce7;--enc:#92400e;--encbg:#fef3c7;--combo:#5b21b6;--combobg:#ede9fe;--off:#6b7280;--offbg:#e5e7eb;--pend:#1d4ed8;--pendbg:#dbeafe;--btn:#1e3a5f;--btnfg:#ffffff;--rojo:#b91c1c}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;--btn:#9bbcf0;--btnfg:#0f141b;--rojo:#fca5a5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;--btn:#9bbcf0;--btnfg:#0f141b;--rojo:#fca5a5;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:"Plus Jakarta Sans",system-ui,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 48px;font-size:15px;line-height:1.45}
.wrap{max-width:960px;margin:0 auto}
h1{font-size:1.6rem;font-weight:800;margin:0;text-wrap:balance}
h2{font-size:1.1rem;font-weight:800;margin:0 0 .6rem}
.sub{color:var(--muted);margin:.2rem 0 1.2rem}
.resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:1.2rem}
.resumen div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.resumen b{display:block;font-size:1.25rem;font-weight:800;font-variant-numeric:tabular-nums}
.resumen span{font-size:.76rem;color:var(--muted)}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:8px;z-index:5}
.tabs a{padding:.4rem .85rem;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font-size:.85rem;font-weight:600;text-decoration:none}
.tabs a[aria-current="page"]{background:var(--accent);color:var(--bg);border-color:var(--accent)}
.filtros{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem}
.filtros input,.filtros select{flex:1 1 180px;min-width:0;padding:.55rem .8rem;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font:inherit}
.sec{display:none}.sec.activa{display:block}
.lista{display:grid;gap:10px}
.it{display:grid;grid-template-columns:88px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px}
.it[hidden]{display:none}
.foto{width:88px;height:88px;border-radius:8px;background:#fff;display:grid;place-items:center;overflow:hidden;align-content:center}
.foto img{width:100%;height:100%;object-fit:contain}
.sinfoto{font-size:.7rem;color:#6b7280}
.punt{font-size:1.6rem;font-weight:800;color:#1e3a5f}
.info{min-width:0}
.cat{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600}
.sem{padding:0 .4rem;border-radius:4px;font-weight:700}.sem-verde{background:var(--okbg);color:var(--ok)}.sem-amarillo{background:var(--encbg);color:var(--enc)}.sem-rojo{background:var(--offbg);color:var(--rojo)}
h3{margin:.1rem 0 .25rem;font-size:1rem;font-weight:600;line-height:1.3}
h3 a{color:inherit;text-decoration:none}h3 a:hover{text-decoration:underline}
.comp{margin:0 0 .3rem;font-size:.82rem;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
.pill{font-size:.75rem;font-weight:700;padding:.15rem .6rem;border-radius:999px}
.pill.ok{color:var(--ok);background:var(--okbg)}.pill.enc{color:var(--enc);background:var(--encbg)}.pill.combo{color:var(--combo);background:var(--combobg)}.pill.off{color:var(--off);background:var(--offbg)}.pill.pend{color:var(--pend);background:var(--pendbg)}
.precio{font-weight:800;font-variant-numeric:tabular-nums}
.uni,.costo{font-size:.85rem;color:var(--muted)}.costo{flex-basis:100%}
.lnk{font-size:.85rem;color:var(--accent)}
.it[data-estado="vendido"] .foto,.it[data-estado="agotado"] .foto{filter:grayscale(1);opacity:.7}
.vacio{color:var(--muted);background:var(--card);border:1px dashed var(--line);border-radius:12px;padding:1rem}
.decision{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:.5rem;padding-top:.5rem;border-top:1px dashed var(--line);font-size:.85rem}
.decision label{display:inline-flex;align-items:center;gap:.35rem}
.decision input[type=number]{width:110px;padding:.3rem .5rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font:inherit;font-variant-numeric:tabular-nums}
.decision input[type=checkbox]{width:18px;height:18px}
.d-estado{font-size:.78rem;color:var(--muted)}.d-estado.ok{color:var(--ok)}
.partes{list-style:none;margin:.2rem 0 .4rem;padding:0;font-size:.85rem;display:grid;gap:2px}
.partes li{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dotted var(--line);padding:.15rem 0}
.partes li span{color:var(--muted);min-width:0}.partes li.suma span{color:var(--fg);font-weight:600}.partes li.suma b{font-size:1rem}
.partes li button{font:inherit;font-size:.75rem;background:none;border:1px solid var(--line);border-radius:6px;color:var(--muted);cursor:pointer;margin-left:6px}
details.nuevo{margin-bottom:1rem}details.nuevo summary{cursor:pointer;font-weight:700;color:var(--accent);margin-bottom:.5rem}
form.pedido{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:1rem}
form.pedido label{display:grid;gap:3px;font-size:.78rem;color:var(--muted)}
form.pedido input,form.pedido select{padding:.5rem .6rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font:inherit;min-width:0}
form.pedido button{grid-column:1/-1;padding:.6rem;border:0;border-radius:999px;background:var(--btn);color:var(--btnfg);font:inherit;font-weight:700;cursor:pointer}
form.pedido button:disabled{opacity:.5}
table{width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums}
.tabla{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:1rem}
th,td{text-align:left;padding:.5rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
td select{font:inherit;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:.2rem}
td button{font:inherit;font-size:.78rem;background:none;border:1px solid var(--line);border-radius:6px;color:var(--muted);cursor:pointer;padding:.15rem .5rem}
.estado-db{font-size:.8rem;color:var(--muted);margin:.4rem 0}
.aviso{background:var(--pendbg);color:var(--pend);border-radius:10px;padding:.6rem .8rem;font-size:.85rem;margin-bottom:.8rem}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.pie{margin-top:1.5rem;font-size:.8rem;color:var(--muted)}
.actualizar{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.7rem .8rem;margin-bottom:.8rem;display:flex;flex-wrap:wrap;gap:.6rem .9rem;align-items:center}
.actualizar button{background:var(--btn);color:var(--btnfg);border:0;border-radius:8px;padding:.55rem .9rem;font:inherit;font-weight:600;min-height:44px;cursor:pointer}
.actualizar details{flex-basis:100%;font-size:.85rem}.actualizar textarea{display:block;width:100%;max-width:420px;margin:.3rem 0;font:inherit;padding:.4rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.modal{display:flex;flex-wrap:wrap;gap:.4rem .8rem;font-size:.85rem}.modal input[type=number]{width:70px;margin-left:.3rem}
@media (max-width:420px){.it{grid-template-columns:68px 1fr}.foto{width:68px;height:68px}}
</style>
<div class="wrap">
<h1>Administración Nivytek</h1>
<p class="sub">Actualizado el ${esc(hoy)} · ${items.length} referencias en la tienda · ${ranking.filas.length} ofertas en el ranking</p>
<div class="resumen">${resumen.map(([t, v]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<nav class="tabs" aria-label="Secciones">${[['inventario', 'Inventario'], ['combos', 'Combos'], ['encargo', 'Por encargo'], ['ranking', 'Ranking de ofertas'], ['piel', 'Cuidado de la piel'], ['vendidos', 'Vendidos'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes']].map(([k, t]) => `<a href="#${k}" data-tab="${k}">${t}</a>`).join('')}</nav>
<div class="filtros" id="filtros"><select id="f-cat" aria-label="Categoría"><option value="">Todas las categorías</option></select><input id="q" type="search" placeholder="Buscar" aria-label="Buscar"></div>
${seccion('inventario', 'En stock (entrega inmediata)', items.filter(f => f.estado === 'stock'), 'No hay productos en stock.')}
<section id="sec-combos" class="sec" data-sec="combos"><h2>Combos publicados</h2><p class="aviso">Cambia el descuento o desmarca «Publicado» y la rutina lo aplica en la hoja y en la tienda en su próxima pasada (cada hora, de 7 am a 9 pm).</p><details class="nuevo"><summary>Armar un combo nuevo</summary>
<form class="pedido" id="f-combo">
  <label>Nombre del combo<input type="text" id="c-nombre" maxlength="70" placeholder="Ej. Rutina de mañana" required></label>
  <label>Categoría<select id="c-cat"><option value="">Elige…</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
  <label>Agregar producto<select id="c-prod" disabled><option value="">Primero la categoría</option></select></label>
  <label>Descuento %<input type="number" id="c-desc" min="0" max="60" value="10"></label>
  <ul class="partes" id="c-partes" style="grid-column:1/-1"></ul>
  <button type="submit" id="c-guardar">Publicar este combo</button>
</form><p class="estado-db" id="c-estado"></p></details>
${items.filter(f => f.estado === 'combo').length ? `<div class="lista">${items.filter(f => f.estado === 'combo').map(fila).join('\n')}</div>` : '<p class="vacio">No hay combos publicados.</p>'}</section>
<section id="sec-encargo" class="sec" data-sec="encargo"><h2>Por encargo (llegan en máximo 15 días)</h2>${items.some(f => f.estado === 'encargo' || f.estado === 'pendiente') ? `<div class="lista">${items.filter(f => f.estado === 'encargo' || f.estado === 'pendiente').map(fila).join('\n')}</div>` : '<p class="vacio">Nada por encargo todavía.</p>'}</section>
<section id="sec-ranking" class="sec" data-sec="ranking"><h2>Ranking de ofertas (de mayor a menor puntaje)</h2>
<div class="actualizar"><button type="button" id="btn-actualizar">Actualizar ofertas de los canales</button><span class="estado-db" id="act-estado">Cargando…</span>
<details><summary>Canales que se revisan</summary><label>Canales públicos de Telegram (uno por línea, el nombre que va después de t.me/)<textarea id="canales" rows="4" placeholder="promocajita&#10;DescuentosTech"></textarea></label><button type="button" id="btn-canales">Guardar canales</button><span class="estado-db" id="can-estado"></span></details></div>
<p class="aviso">Marca «Publicar», escribe el precio y di si ya lo tienes o es por encargo. La rutina (cada hora, de 7 am a 9 pm) lo pasa a la hoja, trae las fotos y arma la ficha; sin precio no se publica.</p>${ranking.filas.length ? `<div class="lista">${ranking.filas.slice().sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0)).map(rkFila).join('\n')}</div>` : '<p class="vacio">Sin datos del ranking.</p>'}</section>
${secPiel}
${seccion('vendidos', 'Vendidos y agotados', items.filter(f => f.estado === 'vendido' || f.estado === 'agotado'), 'Todavía no hay ventas registradas en la tienda.')}
<section id="sec-pedidos" class="sec" data-sec="pedidos"><h2>Pedidos</h2>
<p class="estado-db" id="db-estado">Cargando pedidos…</p>
<form class="pedido" id="f-pedido">
  <label>Fecha<input type="date" id="p-fecha" required></label>
  <label>Cliente<input type="text" id="p-cliente" list="clientes-lista" maxlength="60" placeholder="Nombre o celular" required><datalist id="clientes-lista"></datalist></label>
  <label>Categoría<select id="p-cat" required><option value="">Elige…</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}<option value="otro">Otro</option></select></label>
  <label>Producto<select id="p-producto" required disabled><option value="">Primero la categoría</option></select></label>
  <label id="l-otro" hidden>Cuál<input type="text" id="p-otro" maxlength="80"></label>
  <label>Cantidad<input type="number" id="p-cant" min="1" value="1" required></label>
  <label>Total cobrado<input type="number" id="p-total" min="0" step="100" placeholder="En pesos" required></label>
  <label>Entrega<select id="p-entrega"><option>Recogida</option><option>Domicilio Bogotá</option><option>Envío nacional</option></select></label>
  <label>Estado<select id="p-estado"><option>Pedido</option><option>Pagado</option><option>Entregado</option><option>Cancelado</option></select></label>
  <button type="submit" id="p-guardar">Guardar pedido</button>
</form>
<div class="tabla"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Entrega</th><th>Estado</th><th></th></tr></thead><tbody id="pedidos-tbody"><tr><td colspan="8" class="estado-db">Sin pedidos todavía.</td></tr></tbody></table></div>
<p class="estado-db" id="pedidos-total"></p>
</section>
<section id="sec-clientes" class="sec" data-sec="clientes"><h2>Clientes</h2><p class="estado-db">Se arma solo con los pedidos registrados.</p><div class="tabla"><table><thead><tr><th>Cliente</th><th>Pedidos</th><th>Total comprado</th><th>Último pedido</th><th>Qué ha comprado</th></tr></thead><tbody id="clientes-tbody"><tr><td colspan="5" class="estado-db">Sin pedidos todavía.</td></tr></tbody></table></div></section>
<p class="pie">La rutina de la tienda actualiza esta página cada hora entre 7 am y 9 pm y aplica las decisiones que marquen aquí. Los enlaces de la tienda abren la ficha pública en tienda.nivytek.com. Costos, ganancias y pedidos solo los ven las personas con acceso a esta página.</p>
</div>
<script>
(function(){
  var OPC=${opcionesPorCat};
  var tabs=document.querySelectorAll('.tabs a'),secs=document.querySelectorAll('.sec'),q=document.getElementById('q'),fc=document.getElementById('f-cat'),filtros=document.getElementById('filtros');
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var fmt=function(n){return '$'+Math.round(Number(n)||0).toLocaleString('es-CO')};
  function catsDe(sec){var s={};sec.querySelectorAll('.it[data-cat]').forEach(function(it){s[it.dataset.cat]=1});return Object.keys(s).sort();}
  function mostrar(){var h=(location.hash||'#inventario').slice(1);var sec=document.getElementById('sec-'+h);if(!sec){h='inventario';sec=document.getElementById('sec-inventario');}
    tabs.forEach(function(a){a.setAttribute('aria-current',a.dataset.tab===h?'page':'false')});secs.forEach(function(s){s.classList.toggle('activa',s.dataset.sec===h)});
    var conFiltro=!!sec.querySelector('.it[data-cat]');filtros.hidden=!conFiltro;
    if(conFiltro){var cur=fc.value;fc.innerHTML='<option value="">Todas las categorías</option>'+catsDe(sec).map(function(c){return '<option'+(c===cur?' selected':'')+'>'+esc(c)+'</option>'}).join('');}
    filtrar();}
  function filtrar(){var v=q.value.trim().toLowerCase(),c=fc.value;document.querySelectorAll('.sec.activa .it[data-cat]').forEach(function(it){it.hidden=(!!c&&it.dataset.cat!==c)||(!!v&&(it.dataset.txt||'').indexOf(v)<0);});}
  window.addEventListener('hashchange',mostrar);mostrar();q.addEventListener('input',filtrar);fc.addEventListener('change',filtrar);
  /* base de datos compartida */
  var db=null,puedeEscribir=false,est=document.getElementById('db-estado');
  var timer=setTimeout(function(){if(!db){est.textContent='No se pudo conectar con el registro (inicia sesión en claude.ai o vuelve a abrir la página).';}},10000);
  function marcar(dec,txt,ok){var s=dec.querySelector('.d-estado');s.textContent=txt;s.classList.toggle('ok',!!ok);}
  function guardarDecision(dec){if(!db||!puedeEscribir)return;var data={tipo:dec.dataset.tipo,nombre:dec.dataset.nombre,publicar:dec.querySelector('.d-pub').checked,aplicado:false,cuando:Date.now()};
    var p=dec.querySelector('.d-precio');if(p)data.precio=Number(p.value)||null;var m=dec.querySelector('.d-mod:checked');if(m){data.modalidad=m.value;var u=dec.querySelector('.d-uni');data.unidades=m.value==='disponible'?(Number(u&&u.value)||1):null;}var d=dec.querySelector('.d-desc');if(d)data.descuento=Number(d.value);if(dec.dataset.fila)data.fila=Number(dec.dataset.fila);
    marcar(dec,'Guardando…');db.collection('decisiones').doc(dec.dataset.key).set(data).then(function(){marcar(dec,'Guardado: la rutina lo aplica en su próxima pasada.',true);}).catch(function(e){marcar(dec,'No se pudo guardar: '+(e&&e.message||e));});}
  document.querySelectorAll('.decision').forEach(function(dec){dec.querySelectorAll('input').forEach(function(i){i.addEventListener('change',function(){var l=dec.querySelector('.d-uni-l');if(l){var m=dec.querySelector('.d-mod:checked');l.hidden=!(m&&m.value==='disponible');}guardarDecision(dec)});});});
  /* actualizar ofertas de los canales (solicitud que la rutina atiende en su próxima pasada) */
  var ba=document.getElementById('btn-actualizar'),ae=document.getElementById('act-estado'),ta=document.getElementById('canales'),bc=document.getElementById('btn-canales'),ce2=document.getElementById('can-estado');
  function fechaCorta(ms){return ms?new Date(ms).toLocaleString('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):''}
  function pintarSolicitud(v){if(!v){ae.textContent='Nunca se ha actualizado desde aquí.';return;}ae.textContent=v.pendiente?'Solicitado el '+fechaCorta(v.cuando)+'. La rutina lo atiende en su próxima pasada (cada hora, 7 am a 9 pm).':(v.ultima?'Última actualización: '+fechaCorta(v.ultima)+(v.nuevas!=null?' · '+v.nuevas+' ofertas nuevas':''):'')+(v.error?' · '+v.error:'');ba.disabled=!!v.pendiente||!puedeEscribir;}
  ba.addEventListener('click',function(){if(!db||!puedeEscribir)return;ba.disabled=true;db.collection('solicitudes').doc('actualizar-ranking').set({pendiente:true,cuando:Date.now()},{merge:true}).then(function(){ae.textContent='Solicitado. La rutina revisa los canales y actualiza el ranking en su próxima pasada.';}).catch(function(e){ae.textContent='No se pudo solicitar: '+(e&&e.message||e);ba.disabled=false;});});
  bc.addEventListener('click',function(){if(!db||!puedeEscribir)return;var NL=String.fromCharCode(10);var lista=ta.value.split(NL).map(function(x){return x.trim().replace(/^https?:[/][/]t[.]me[/](s[/])?/,'').replace(/^@/,'')}).filter(Boolean);
    db.collection('solicitudes').doc('canales').set({telegram:lista,cuando:Date.now()}).then(function(){ce2.textContent='Guardado: '+lista.length+' canales.';}).catch(function(e){ce2.textContent='No se pudo guardar: '+(e&&e.message||e);});});
  function precioCombo(suma,desc){return Math.floor(suma*(1-desc/100)/1000)*1000-100}
  document.querySelectorAll('.it[data-estado="combo"]').forEach(function(it){var d=it.querySelector('.d-desc');if(!d)return;d.addEventListener('input',function(){var suma=Number(it.querySelector('.p-suma').dataset.suma);it.querySelector('.p-desc').textContent=d.value;it.querySelector('.p-combo').textContent=fmt(precioCombo(suma,Number(d.value)||0));});});
  /* combo nuevo */
  var cc=document.getElementById('c-cat'),cp=document.getElementById('c-prod'),cd=document.getElementById('c-desc'),cl=document.getElementById('c-partes'),cf=document.getElementById('f-combo'),ce=document.getElementById('c-estado'),partes=[];
  cc.addEventListener('change',function(){var c=cc.value;cp.disabled=!c;cp.innerHTML='<option value="">Elige…</option>'+((OPC[c]||[]).map(function(o){return '<option value="'+esc(o.n)+'" data-precio="'+o.p+'">'+esc(o.n)+'</option>'}).join(''));});
  cp.addEventListener('change',function(){var o=cp.options[cp.selectedIndex];if(!o||!o.value)return;if(!partes.some(function(x){return x.n===o.value}))partes.push({n:o.value,p:Number(o.dataset.precio)||0});cp.value='';pintarPartes();});
  cd.addEventListener('input',pintarPartes);
  function pintarPartes(){var suma=partes.reduce(function(s,x){return s+x.p},0);cl.innerHTML=partes.map(function(x,i){return '<li><span>'+esc(x.n)+'<button type="button" data-q="'+i+'">quitar</button></span><b>'+fmt(x.p)+'</b></li>'}).join('')+(partes.length?'<li class="suma"><span>Por separado</span><b>'+fmt(suma)+'</b></li><li class="suma"><span>En combo ('+(Number(cd.value)||0)+' % menos)</span><b>'+fmt(precioCombo(suma,Number(cd.value)||0))+'</b></li>':'<li><span>Agrega al menos 2 productos</span></li>');}
  cl.addEventListener('click',function(e){var b=e.target.closest('button[data-q]');if(b){partes.splice(Number(b.dataset.q),1);pintarPartes();}});
  cf.addEventListener('submit',function(e){e.preventDefault();if(!db||!puedeEscribir){ce.textContent='Sin permiso para guardar.';return;}if(partes.length<2){ce.textContent='Agrega al menos 2 productos.';return;}
    var nombre=document.getElementById('c-nombre').value.trim(),suma=partes.reduce(function(s,x){return s+x.p},0),desc=Number(cd.value)||0;
    db.collection('decisiones').doc('cbn-'+nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,50)).set({tipo:'combo-nuevo',nombre:nombre,componentes:partes.map(function(x){return x.n}),suma:suma,descuento:desc,precio:precioCombo(suma,desc),publicar:true,aplicado:false,cuando:Date.now()})
      .then(function(){ce.textContent='Guardado. La rutina arma la ficha y lo publica en su próxima pasada (cada hora, de 7 am a 9 pm).';partes=[];pintarPartes();cf.reset();cd.value=10;}).catch(function(err){ce.textContent='No se pudo guardar: '+(err&&err.message||err);});});
  pintarPartes();
  function pintarDecisiones(snap){snap.docs.forEach(function(d){var v=d.data(),dec=document.querySelector('.decision[data-key="'+d.id+'"]');if(!dec)return;
    var pub=dec.querySelector('.d-pub');if(pub)pub.checked=!!v.publicar;var p=dec.querySelector('.d-precio');if(p&&v.precio)p.value=v.precio;if(v.modalidad){var r=dec.querySelector('.d-mod[value="'+v.modalidad+'"]');if(r)r.checked=true;var l=dec.querySelector('.d-uni-l');if(l)l.hidden=v.modalidad!=='disponible';var u=dec.querySelector('.d-uni');if(u&&v.unidades)u.value=v.unidades;}var ds=dec.querySelector('.d-desc');if(ds&&v.descuento!=null)ds.value=v.descuento;
    marcar(dec,v.aplicado?'Aplicado en la hoja':'Pendiente: la rutina lo aplica en su próxima pasada.',!!v.aplicado);});}
  /* pedidos */
  var tb=document.getElementById('pedidos-tbody'),tot=document.getElementById('pedidos-total'),form=document.getElementById('f-pedido'),btn=document.getElementById('p-guardar'),ctb=document.getElementById('clientes-tbody'),dl=document.getElementById('clientes-lista');
  var pc=document.getElementById('p-cat'),pp=document.getElementById('p-producto'),po=document.getElementById('p-otro'),lo=document.getElementById('l-otro'),total=document.getElementById('p-total'),cant=document.getElementById('p-cant');
  function hoyBogota(){return new Date(Date.now()-5*3600e3).toISOString().slice(0,10)}
  document.getElementById('p-fecha').value=hoyBogota();
  pc.addEventListener('change',function(){var c=pc.value;lo.hidden=c!=='otro';pp.disabled=!c||c==='otro';pp.required=c!=='otro';
    pp.innerHTML='<option value="">Elige…</option>'+((OPC[c]||[]).map(function(o){return '<option value="'+esc(o.n)+'" data-precio="'+o.p+'">'+esc(o.n)+'</option>'}).join(''));});
  function sugerir(){var o=pp.options[pp.selectedIndex];if(o&&o.dataset.precio)total.value=Number(o.dataset.precio)*(Number(cant.value)||1);}
  pp.addEventListener('change',sugerir);cant.addEventListener('input',sugerir);
  var col=null;
  function pintar(docs){
    var suma=0,clientes={};
    if(!docs.length){tb.innerHTML='<tr><td colspan="8" class="estado-db">Sin pedidos todavía.</td></tr>';tot.textContent='';ctb.innerHTML='<tr><td colspan="5" class="estado-db">Sin pedidos todavía.</td></tr>';return;}
    tb.innerHTML=docs.map(function(d){var p=d.data();if(p.estado!=='Cancelado'){suma+=Number(p.total)||0;var k=String(p.cliente||'').trim().toLowerCase();var c=clientes[k]||(clientes[k]={nombre:p.cliente,n:0,total:0,ultimo:'',prods:[]});c.n++;c.total+=Number(p.total)||0;if(p.fecha>c.ultimo)c.ultimo=p.fecha;c.prods.push(p.producto);}
      return '<tr><td>'+esc(p.fecha)+'</td><td>'+esc(p.cliente)+'</td><td>'+esc(p.producto)+'</td><td>'+esc(p.cantidad)+'</td><td>'+fmt(p.total)+'</td><td>'+esc(p.entrega)+'</td><td>'+(puedeEscribir?'<select data-id="'+d.id+'">'+['Pedido','Pagado','Entregado','Cancelado'].map(function(e){return '<option'+(e===p.estado?' selected':'')+'>'+e+'</option>'}).join('')+'</select>':esc(p.estado))+'</td><td>'+(puedeEscribir?'<button type="button" data-borrar="'+d.id+'">Borrar</button>':'')+'</td></tr>';}).join('');
    tot.textContent='Total vendido (sin cancelados): '+fmt(suma)+' · '+docs.length+' pedido'+(docs.length===1?'':'s');
    var lista=Object.keys(clientes).map(function(k){return clientes[k]}).sort(function(a,b){return b.total-a.total});
    ctb.innerHTML=lista.map(function(c){return '<tr><td>'+esc(c.nombre)+'</td><td>'+c.n+'</td><td>'+fmt(c.total)+'</td><td>'+esc(c.ultimo)+'</td><td>'+esc(c.prods.join(', '))+'</td></tr>'}).join('')||'<tr><td colspan="5" class="estado-db">Sin clientes todavía.</td></tr>';
    dl.innerHTML=lista.map(function(c){return '<option value="'+esc(c.nombre)+'">'}).join('');
  }
  if(window.claude&&window.claude.use){window.claude.use('db').then(function(d){
    clearTimeout(timer);if(!d){est.textContent='Registro no disponible en esta vista.';btn.disabled=true;return;}
    db=d;col=db.collection('pedidos');
    window.claude.use('user').then(function(u){puedeEscribir=!!(u&&(u.isOwner()||u.canEdit()||u.can('data.write')!==false));btn.disabled=!puedeEscribir;est.textContent=puedeEscribir?'Registra cada venta aquí; se guarda para los dos.':'Solo lectura: pide acceso de edición para registrar pedidos.';
      document.querySelectorAll('.decision input').forEach(function(i){i.disabled=!puedeEscribir});});
    col.orderBy('fecha','desc').limit(300).onSnapshot(function(snap){pintar(snap.docs);},function(e){est.textContent='Error al leer pedidos: '+(e&&e.message||e);});
    db.collection('decisiones').limit(500).onSnapshot(pintarDecisiones,function(){});
    db.collection('solicitudes').doc('actualizar-ranking').onSnapshot(function(d){pintarSolicitud(d.exists?d.data():null)},function(){ae.textContent='';});
    db.collection('solicitudes').doc('canales').onSnapshot(function(d){if(d.exists&&!ta.value)ta.value=(d.data().telegram||[]).join(String.fromCharCode(10));},function(){});
  });}else{clearTimeout(timer);est.textContent='Registro no disponible en esta vista.';btn.disabled=true;}
  form.addEventListener('submit',function(e){e.preventDefault();if(!col||!puedeEscribir)return;btn.disabled=true;
    var prod=pc.value==='otro'?(po.value.trim()||'Otro producto'):pp.value;
    col.add({fecha:document.getElementById('p-fecha').value,cliente:document.getElementById('p-cliente').value.trim(),categoria:pc.value,producto:prod,cantidad:Number(cant.value)||1,total:Number(total.value)||0,entrega:document.getElementById('p-entrega').value,estado:document.getElementById('p-estado').value,creado:Date.now()})
      .then(function(){form.reset();document.getElementById('p-fecha').value=hoyBogota();pp.innerHTML='<option value="">Primero la categoría</option>';pp.disabled=true;lo.hidden=true;est.textContent='Pedido guardado.';}).catch(function(err){est.textContent='No se pudo guardar: '+(err&&err.message||err);}).finally(function(){btn.disabled=false;});});
  tb.addEventListener('change',function(e){var s=e.target.closest('select[data-id]');if(s&&col)col.doc(s.dataset.id).update({estado:s.value}).catch(function(err){est.textContent='No se pudo actualizar: '+(err&&err.message||err);});});
  tb.addEventListener('click',function(e){var b=e.target.closest('button[data-borrar]');if(!b||!col)return;if(b.dataset.confirmar){col.doc(b.dataset.borrar).delete().catch(function(err){est.textContent='No se pudo borrar: '+(err&&err.message||err);});}else{b.dataset.confirmar='1';b.textContent='¿Seguro? Borrar';}});
})();
</script>
`;
writeFileSync(salida, html);
console.log(`Administración: ${items.length} referencias, ${ranking.filas.length} ofertas → ${salida}`);
