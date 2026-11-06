#!/usr/bin/env node
/**
 * Genera "Administración Nivytek": página privada (artefacto compartido con quien Carlos invite)
 * con inventario, costos y ganancia, combos, productos por encargo, vendidos y un registro de
 * pedidos que se llena desde la misma página (base de datos del artefacto).
 * Uso: node scripts/inventario-artefacto.mjs <salida.html> [costos.json]
 * costos.json (fuera del repositorio): { costos: {id: costo}, ranking_pendientes: [{nombre, costo, sugerido, estado}] }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const salida = process.argv[2] || join(raiz, '..', 'inventario.html');
const costosPath = process.argv[3] || '';
const leer = (f) => JSON.parse(readFileSync(join(raiz, f), 'utf8'));
const config = leer('data/config.json');
const catalogo = leer('data/catalogo.json');
const encargo = leer('data/encargo.json');
const combos = existsSync(join(raiz, 'data/combos.json')) ? leer('data/combos.json') : { combos: [] };
const pendientes = existsSync(join(raiz, 'data/encargo-pendientes.json')) ? leer('data/encargo-pendientes.json') : { productos: [] };
const privado = costosPath && existsSync(costosPath) ? JSON.parse(readFileSync(costosPath, 'utf8')) : { costos: {}, ranking_pendientes: [] };
const costoDe = (id) => { const c = privado.costos[id]; return typeof c === 'number' ? c : null; };

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
const hoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });

const items = catalogo.productos.filter(p => p.visible !== false).map(p => {
  const estado = T.vendido(p) ? 'vendido' : !p.disponible ? 'agotado' : p.esCombo ? 'combo' : p.modalidad === 'encargo' ? 'encargo' : 'stock';
  const costo = p.esCombo ? (p.componentes.every(c => costoDe(c) != null) ? p.componentes.reduce((s, c) => s + costoDe(c), 0) : null) : costoDe(p.id);
  return { id: p.id, nombre: p.nombre, cat: (T.categoria(p.categoria) || {}).nombre || '', precio: p.precio, costo, unidades: p.stock, estado, foto: dataUri((p.imagenes || [])[0] || ''), url: 'https://tienda.nivytek.com/p/' + (p.slug || p.id) + '.html', componentes: p.esCombo ? p.incluye : null };
}).concat((pendientes.productos || []).map(p => ({ id: p.id, nombre: p.nombre, cat: p.categoria || '', precio: Number(String(p.precio).replace(/\D/g, '')), costo: costoDe(p.id), unidades: null, estado: 'pendiente', foto: '', url: '', componentes: null })));

const E = { stock: ['En stock', 'ok'], combo: ['Combo', 'combo'], encargo: ['Por encargo', 'enc'], pendiente: ['Por encargo · sin publicar', 'pend'], vendido: ['Vendido', 'off'], agotado: ['Agotado', 'off'] };
const enStock = items.filter(f => f.estado === 'stock');
const unidades = enStock.reduce((s, f) => s + (f.unidades || 0), 0);
const valor = enStock.reduce((s, f) => s + (f.unidades || 0) * f.precio, 0);
const invertido = enStock.reduce((s, f) => s + (f.unidades || 0) * (f.costo || 0), 0);
const resumen = [['Unidades en stock', unidades], ['Valor a precio de venta', precio(valor)], ['Costo del inventario', precio(invertido)], ['Ganancia si se vende todo', precio(valor - invertido)], ['Combos publicados', items.filter(f => f.estado === 'combo').length], ['Vendidos', items.filter(f => f.estado === 'vendido').length]];

const fila = (f) => `<article class="it" data-estado="${f.estado}" data-txt="${esc((f.nombre + ' ' + f.cat).toLowerCase())}">
  <div class="foto">${f.foto ? `<img src="${f.foto}" alt="${esc(f.nombre)}" loading="lazy" width="120" height="120">` : '<span class="sinfoto">sin foto</span>'}</div>
  <div class="info"><span class="cat">${esc(f.cat)}</span><h3>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(f.nombre)}</h3>
  ${f.componentes ? `<p class="comp">Incluye: ${esc(f.componentes.join(' + '))}</p>` : ''}
  <div class="meta"><span class="pill ${E[f.estado][1]}">${E[f.estado][0]}</span><span class="precio">${precio(f.precio)}</span><span class="uni">${f.unidades != null ? (f.unidades === 1 ? '1 unidad' : f.unidades + ' unidades') : (f.estado === 'stock' ? 'unidades sin dato' : f.estado === 'vendido' ? '0 unidades' : 'llega en máx. 15 días')}</span>
  <span class="costo">Costo ${precio(f.costo)}${f.costo != null ? ` · Ganancia <b>${precio(f.precio - f.costo)}</b>` : ''}</span></div></div>
</article>`;
const seccion = (id, titulo, lista, vacio) => `<section id="sec-${id}" class="sec" data-sec="${id}"><h2>${esc(titulo)}</h2>${lista.length ? `<div class="lista">${lista.map(fila).join('\n')}</div>` : `<p class="vacio">${esc(vacio)}</p>`}</section>`;
const rankingPend = (privado.ranking_pendientes || []).map(r => `<article class="it"><div class="foto"><span class="sinfoto">Ranking</span></div><div class="info"><span class="cat">Marcado en Ranking</span><h3>${esc(r.nombre)}</h3><div class="meta"><span class="pill pend">${esc(r.estado)}</span><span class="precio">Sugerido ${precio(r.sugerido)}</span><span class="costo">Costo ${precio(r.costo)} · Ganancia <b>${precio(r.sugerido - r.costo)}</b></span></div></div></article>`).join('\n');
const opciones = items.filter(f => f.estado !== 'vendido' && f.estado !== 'agotado').map(f => `<option value="${esc(f.nombre)}" data-precio="${f.precio}">${esc(f.nombre)}</option>`).join('');

const html = `<title>Administración Nivytek</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
/* Panel operativo: resumen, pestañas por estado, lista de una tarjeta por referencia, registro de pedidos */
:root{--bg:#f6f7f9;--card:#ffffff;--fg:#1d2433;--muted:#5b6474;--line:#dfe3ea;--accent:#1e3a5f;--ok:#166534;--okbg:#dcfce7;--enc:#92400e;--encbg:#fef3c7;--combo:#5b21b6;--combobg:#ede9fe;--off:#6b7280;--offbg:#e5e7eb;--pend:#1d4ed8;--pendbg:#dbeafe;--btn:#1e3a5f;--btnfg:#ffffff}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;--btn:#9bbcf0;--btnfg:#0f141b;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f141b;--card:#171e28;--fg:#e8ecf2;--muted:#9aa4b2;--line:#2a3340;--accent:#9bbcf0;--ok:#86efac;--okbg:#14301f;--enc:#fcd34d;--encbg:#3a2a08;--combo:#c4b5fd;--combobg:#2a1f4a;--off:#9ca3af;--offbg:#2a2f38;--pend:#93c5fd;--pendbg:#172a4a;--btn:#9bbcf0;--btnfg:#0f141b;color-scheme:dark}
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
.filtros{margin-bottom:1rem}.filtros input{width:100%;box-sizing:border-box;padding:.55rem .8rem;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font:inherit}
.sec{display:none}.sec.activa{display:block}
.lista{display:grid;gap:10px}
.it{display:grid;grid-template-columns:88px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px}
.it[hidden]{display:none}
.foto{width:88px;height:88px;border-radius:8px;background:#fff;display:grid;place-items:center;overflow:hidden}
.foto img{width:100%;height:100%;object-fit:contain}
.sinfoto{font-size:.7rem;color:#6b7280}
.info{min-width:0}
.cat{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600}
h3{margin:.1rem 0 .25rem;font-size:1rem;font-weight:600;line-height:1.3}
h3 a{color:inherit;text-decoration:none}h3 a:hover{text-decoration:underline}
.comp{margin:0 0 .3rem;font-size:.82rem;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
.pill{font-size:.75rem;font-weight:700;padding:.15rem .6rem;border-radius:999px}
.pill.ok{color:var(--ok);background:var(--okbg)}.pill.enc{color:var(--enc);background:var(--encbg)}.pill.combo{color:var(--combo);background:var(--combobg)}.pill.off{color:var(--off);background:var(--offbg)}.pill.pend{color:var(--pend);background:var(--pendbg)}
.precio{font-weight:800;font-variant-numeric:tabular-nums}
.uni,.costo{font-size:.85rem;color:var(--muted)}.costo{flex-basis:100%}
.it[data-estado="vendido"] .foto,.it[data-estado="agotado"] .foto{filter:grayscale(1);opacity:.7}
.vacio{color:var(--muted);background:var(--card);border:1px dashed var(--line);border-radius:12px;padding:1rem}
form.pedido{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:1rem}
form.pedido label{display:grid;gap:3px;font-size:.78rem;color:var(--muted)}
form.pedido input,form.pedido select{padding:.5rem .6rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font:inherit;min-width:0}
form.pedido button{grid-column:1/-1;padding:.6rem;border:0;border-radius:999px;background:var(--btn);color:var(--btnfg);font:inherit;font-weight:700;cursor:pointer}
form.pedido button:disabled{opacity:.5}
table{width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums}
.tabla{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
th,td{text-align:left;padding:.5rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
td select{font:inherit;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:.2rem}
td button{font:inherit;font-size:.78rem;background:none;border:1px solid var(--line);border-radius:6px;color:var(--muted);cursor:pointer;padding:.15rem .5rem}
.estado-db{font-size:.8rem;color:var(--muted);margin:.4rem 0}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.pie{margin-top:1.5rem;font-size:.8rem;color:var(--muted)}
@media (max-width:420px){.it{grid-template-columns:68px 1fr}.foto{width:68px;height:68px}}
</style>
<div class="wrap">
<h1>Administración Nivytek</h1>
<p class="sub">Actualizado el ${esc(hoy)} · ${items.length} referencias · costos y ganancias son privados</p>
<div class="resumen">${resumen.map(([t, v]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<nav class="tabs" aria-label="Secciones">${[['inventario', 'Inventario'], ['combos', 'Combos'], ['encargo', 'Por encargo'], ['vendidos', 'Vendidos'], ['pedidos', 'Pedidos']].map(([k, t]) => `<a href="#${k}" data-tab="${k}">${t}</a>`).join('')}</nav>
<div class="filtros"><input id="q" type="search" placeholder="Buscar producto o categoría" aria-label="Buscar"></div>
${seccion('inventario', 'En stock (entrega inmediata)', items.filter(f => f.estado === 'stock'), 'No hay productos en stock.')}
${seccion('combos', 'Combos publicados', items.filter(f => f.estado === 'combo'), 'No hay combos publicados.')}
<section id="sec-encargo" class="sec" data-sec="encargo"><h2>Por encargo (llegan en máximo 15 días)</h2>${[...items.filter(f => f.estado === 'encargo' || f.estado === 'pendiente').map(fila)].join('\n') || ''}${rankingPend}${!items.some(f => f.estado === 'encargo' || f.estado === 'pendiente') && !rankingPend ? '<p class="vacio">Nada por encargo todavía.</p>' : ''}</section>
${seccion('vendidos', 'Vendidos y agotados', items.filter(f => f.estado === 'vendido' || f.estado === 'agotado'), 'Todavía no hay ventas registradas en la tienda.')}
<section id="sec-pedidos" class="sec" data-sec="pedidos"><h2>Pedidos</h2>
<p class="estado-db" id="db-estado">Cargando pedidos…</p>
<form class="pedido" id="f-pedido">
  <label>Fecha<input type="date" id="p-fecha" required></label>
  <label>Cliente<input type="text" id="p-cliente" maxlength="60" placeholder="Nombre o celular" required></label>
  <label>Producto<select id="p-producto" required><option value="">Elige…</option>${opciones}<option value="otro">Otro</option></select></label>
  <label>Cantidad<input type="number" id="p-cant" min="1" value="1" required></label>
  <label>Total cobrado<input type="number" id="p-total" min="0" step="100" placeholder="En pesos" required></label>
  <label>Entrega<select id="p-entrega"><option>Recogida</option><option>Domicilio Bogotá</option><option>Envío nacional</option></select></label>
  <label>Estado<select id="p-estado"><option>Pedido</option><option>Pagado</option><option>Entregado</option><option>Cancelado</option></select></label>
  <button type="submit" id="p-guardar">Guardar pedido</button>
</form>
<div class="tabla"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Entrega</th><th>Estado</th><th></th></tr></thead><tbody id="pedidos-tbody"><tr><td colspan="8" class="estado-db">Sin pedidos todavía.</td></tr></tbody></table></div>
<p class="estado-db" id="pedidos-total"></p>
</section>
<p class="pie">Esta página la actualiza sola la rutina de la tienda (7 am, 1 pm y 7 pm) cuando cambia el inventario. Los enlaces abren la ficha pública en tienda.nivytek.com. Los pedidos que registren aquí se guardan y los ven ambos.</p>
</div>
<script>
(function(){
  /* pestañas por hash */
  var tabs=document.querySelectorAll('.tabs a'),secs=document.querySelectorAll('.sec'),q=document.getElementById('q');
  function mostrar(){var h=(location.hash||'#inventario').slice(1);if(!document.getElementById('sec-'+h))h='inventario';
    tabs.forEach(function(a){a.setAttribute('aria-current',a.dataset.tab===h?'page':'false')});secs.forEach(function(s){s.classList.toggle('activa',s.dataset.sec===h)});
    q.parentElement.hidden=(h==='pedidos');}
  window.addEventListener('hashchange',mostrar);mostrar();
  q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();document.querySelectorAll('.it[data-txt]').forEach(function(it){it.hidden=!!v&&it.dataset.txt.indexOf(v)<0;});});
  /* pedidos (base de datos compartida del artefacto) */
  var est=document.getElementById('db-estado'),tb=document.getElementById('pedidos-tbody'),tot=document.getElementById('pedidos-total'),form=document.getElementById('f-pedido'),btn=document.getElementById('p-guardar');
  var sel=document.getElementById('p-producto'),total=document.getElementById('p-total'),cant=document.getElementById('p-cant');
  document.getElementById('p-fecha').value=new Date(Date.now()-5*3600e3).toISOString().slice(0,10);
  function sugerir(){var o=sel.options[sel.selectedIndex];if(o&&o.dataset.precio)total.value=Number(o.dataset.precio)*(Number(cant.value)||1);}
  sel.addEventListener('change',sugerir);cant.addEventListener('input',sugerir);
  var fmt=function(n){return '$'+Math.round(Number(n)||0).toLocaleString('es-CO')};
  var db=null,col=null,puedeEscribir=false;
  var timer=setTimeout(function(){if(!db){est.textContent='No se pudo conectar con el registro de pedidos (inicia sesión en claude.ai o vuelve a abrir la página).';}},10000);
  function pintar(docs){
    if(!docs.length){tb.innerHTML='<tr><td colspan="8" class="estado-db">Sin pedidos todavía.</td></tr>';tot.textContent='';return;}
    var suma=0;tb.innerHTML=docs.map(function(d){var p=d.data();if(p.estado!=='Cancelado')suma+=Number(p.total)||0;
      return '<tr><td>'+esc(p.fecha)+'</td><td>'+esc(p.cliente)+'</td><td>'+esc(p.producto)+'</td><td>'+esc(p.cantidad)+'</td><td>'+fmt(p.total)+'</td><td>'+esc(p.entrega)+'</td><td>'+(puedeEscribir?'<select data-id="'+d.id+'">'+['Pedido','Pagado','Entregado','Cancelado'].map(function(e){return '<option'+(e===p.estado?' selected':'')+'>'+e+'</option>'}).join('')+'</select>':esc(p.estado))+'</td><td>'+(puedeEscribir?'<button type="button" data-borrar="'+d.id+'">Borrar</button>':'')+'</td></tr>';}).join('');
    tot.textContent='Total vendido (sin cancelados): '+fmt(suma)+' · '+docs.length+' pedido'+(docs.length===1?'':'s');
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  if(window.claude&&window.claude.use){window.claude.use('db').then(function(d){
    clearTimeout(timer);if(!d){est.textContent='Registro de pedidos no disponible en esta vista.';btn.disabled=true;return;}
    db=d;col=db.collection('pedidos');
    window.claude.use('user').then(function(u){puedeEscribir=!!(u&&(u.isOwner()||u.canEdit()||u.can('data.write')!==false));btn.disabled=!puedeEscribir;est.textContent=puedeEscribir?'Registra cada venta aquí; se guarda para los dos.':'Solo lectura: pide acceso de edición para registrar pedidos.';});
    col.orderBy('fecha','desc').limit(200).onSnapshot(function(snap){pintar(snap.docs);},function(e){est.textContent='Error al leer pedidos: '+(e&&e.message||e);});
  });}else{clearTimeout(timer);est.textContent='Registro de pedidos no disponible en esta vista.';btn.disabled=true;}
  form.addEventListener('submit',function(e){e.preventDefault();if(!col||!puedeEscribir)return;btn.disabled=true;
    var prod=sel.value==='otro'?prompt_otro():sel.value;
    col.add({fecha:document.getElementById('p-fecha').value,cliente:document.getElementById('p-cliente').value.trim(),producto:prod,cantidad:Number(cant.value)||1,total:Number(total.value)||0,entrega:document.getElementById('p-entrega').value,estado:document.getElementById('p-estado').value,creado:Date.now()})
      .then(function(){form.reset();document.getElementById('p-fecha').value=new Date(Date.now()-5*3600e3).toISOString().slice(0,10);est.textContent='Pedido guardado.';}).catch(function(err){est.textContent='No se pudo guardar: '+(err&&err.message||err);}).finally(function(){btn.disabled=false;});});
  function prompt_otro(){var v=document.getElementById('p-cliente').value;return 'Otro producto';}
  tb.addEventListener('change',function(e){var s=e.target.closest('select[data-id]');if(s&&col)col.doc(s.dataset.id).update({estado:s.value}).catch(function(err){est.textContent='No se pudo actualizar: '+(err&&err.message||err);});});
  tb.addEventListener('click',function(e){var b=e.target.closest('button[data-borrar]');if(!b||!col)return;if(b.dataset.confirmar){col.doc(b.dataset.borrar).delete().catch(function(err){est.textContent='No se pudo borrar: '+(err&&err.message||err);});}else{b.dataset.confirmar='1';b.textContent='¿Seguro? Borrar';}});
})();
</script>
`;
writeFileSync(salida, html);
console.log(`Administración: ${items.length} referencias → ${salida}`);
