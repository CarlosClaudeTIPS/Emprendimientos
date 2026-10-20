/* Arma el portal unificado en portal/dist a partir de las carpetas de cada proyecto.
   Uso:  node portal/build.mjs            → base /icfes/ (para Vercel / dominio propio)
         BASE=./ node portal/build.mjs    → rutas relativas (vista previa)
   Cada proyecto sigue viviendo en su carpeta y se edita por separado. */
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, symlinkSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(here, "dist");
const BASE = process.env.BASE || "/icfes/";
// Conteo de visitas (Vercel Analytics): se activa en Vercel → proyecto → Analytics. Sin cookies.
const ANALYTICS = '<script defer src="/_vercel/insights/script.js"></script>';

rmSync(dist, { recursive: true, force: true }); mkdirSync(dist, { recursive: true });

// 1. Portada y recursos compartidos
cpSync(join(here, "site"), dist, { recursive: true });
{ const f = join(dist, "index.html"); const h = readFileSync(f, "utf8"); if (!h.includes(ANALYTICS)) writeFileSync(f, h.replace(/<\/head>/i, ANALYTICS + "\n</head>")); }

// 2. Apoyo docente → /docentes
cpSync(join(root, "apoyo-docente"), join(dist, "docentes"), { recursive: true, filter: (p) => !/README\.md$|\/fuentes(\/|$)/.test(p) });

// 3. Tienda → /tienda
// El panel de administración (admin.html y sus archivos) es una herramienta privada: no se publica.
cpSync(join(root, "tienda"), join(dist, "tienda"), { recursive: true, filter: (p) => !/README\.md$|CLAUDE\.md$|AUDITORIA\.md$|generar-paginas\.mjs$|package\.json$|netlify|_headers$|admin\.html$|admin\.css$|admin\.js$|generador\.js$/.test(p) });

// 4. ICFES (app React) → /icfes  (se construye en una copia temporal para no tocar el proyecto)
const src = join(root, "saber11-prep"), tmp = join(here, ".tmp-icfes");
rmSync(tmp, { recursive: true, force: true });
cpSync(src, tmp, { recursive: true, filter: (p) => !/node_modules|\/dist(\/|$)|\.git(\/|$)/.test(p) });
symlinkSync(join(src, "node_modules"), join(tmp, "node_modules"), "dir");
// PWA: el manifiesto y el fallback de navegación deben apuntar a la base (/icfes/), no a la raíz del sitio
if (BASE.startsWith("/")) {
  const vc = join(tmp, "vite.config.js");
  writeFileSync(vc, readFileSync(vc, "utf8").replace("start_url: '/'", `start_url: '${BASE}'`).replace("navigateFallback: '/index.html'", `navigateFallback: '${BASE}index.html'`));
}
// rutas absolutas del icono → relativas a la base
for (const f of walk(join(tmp, "src")).filter((f) => /\.jsx?$/.test(f))) {
  const t = readFileSync(f, "utf8").replace(/src="\/icono\.svg"/g, 'src={import.meta.env.BASE_URL + "icono.svg"}');
  writeFileSync(f, t);
}
execSync(`npx vite build --base=${BASE} --outDir ${JSON.stringify(join(dist, "icfes"))} --emptyOutDir`, { cwd: tmp, stdio: "inherit" });
rmSync(tmp, { recursive: true, force: true });

// 4b. Contenido inicial escrito en el HTML (buscadores y vistas previas lo ven sin JavaScript);
//     el JavaScript de cada página vuelve a dibujar lo mismo encima.
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
{ // Portada: puertas y lema desde portal.config.js
  const win = {}; new Function("window", readFileSync(join(here, "site/shared/portal.config.js"), "utf8"))(win);
  const cfg = win.PORTAL_CONFIG, f = join(dist, "index.html");
  const puertas = cfg.secciones.map((s) => `<a class="door" href="${esc(s.carpeta)}" style="--c:${esc(s.color)}"><div class="pic">${s.iconoArchivo ? `<img src="${esc(s.iconoArchivo)}" alt="" width="64" height="64">` : ""}</div><span class="who">${esc(s.publico)}</span><h2>${esc(s.titulo)}</h2><p>${esc(s.texto)}</p><span class="go">${esc(s.boton)}</span></a>`).join("");
  writeFileSync(f, readFileSync(f, "utf8").replace('<div class="doors" id="doors"></div>', `<div class="doors" id="doors">${puertas}</div>`).replace('<p id="lema"></p>', `<p id="lema">${esc(cfg.marca.lema)}</p>`));
}
{ // Tienda: portada, pasos y preguntas frecuentes desde data/config.json
  const c = JSON.parse(readFileSync(join(root, "tienda/data/config.json"), "utf8")), f = join(dist, "tienda/index.html");
  const n = c.negocio || {}, h = c.portada || {};
  const hero = `<div>${h.etiqueta ? `<span class="hero-etiqueta">${esc(h.etiqueta)}</span>` : ""}<h1>${esc(h.titulo || n.eslogan || "")}</h1><p>${esc(h.subtitulo || n.descripcion || "")}</p><div class="hero-acciones"><a class="btn btn-acento" href="catalogo.html">Explorar todos los productos</a><a class="btn btn-contorno" href="catalogo.html?f=ofertas">Ver ofertas</a></div></div>${h.imagen ? `<div class="hero-imagen"><img src="${esc(h.imagen)}" alt="${esc(n.nombre)}" width="380" height="380"></div>` : ""}`;
  const pasos = (c.pasosCompra || []).map((p, i) => `<div class="paso"><span class="paso-num">${i + 1}</span><strong>${esc(p.titulo)}</strong><span>${esc(p.texto)}</span></div>`).join("");
  const faq = (c.preguntasFrecuentes || []).filter((q) => q.p && q.r).slice(0, 5).map((q) => `<details class="faq"><summary>${esc(q.p)}</summary><p>${esc(q.r).replace(/\n/g, "<br>")}</p></details>`).join("");
  let html = readFileSync(f, "utf8");
  html = html.replace('<div class="hero-caja" id="hero"><div class="esqueleto" style="min-height:220px"></div></div>', `<div class="hero-caja" id="hero">${hero}</div>`)
    .replace('<div class="pasos" id="pasos"></div>', `<div class="pasos" id="pasos">${pasos}</div>`)
    .replace('<div class="bloque" id="faq-inicio" style="margin-top:0"></div>', `<div class="bloque" id="faq-inicio" style="margin-top:0">${faq}</div>`);
  writeFileSync(f, html);
}

// 5. Barra común en cada página de las secciones
for (const f of walk(dist).filter((f) => f.endsWith(".html") && relative(dist, f) !== "index.html")) {
  const up = relative(dirname(f), dist).split("\\").join("/") || ".";
  const tag = `<link rel="stylesheet" href="${up}/shared/barra.css"><script src="${up}/shared/portal.config.js"></script><script defer src="${up}/shared/barra.js"></script>`;
  let html = readFileSync(f, "utf8");
  if (!html.includes("shared/barra.js")) html = html.replace(/<\/head>/i, tag + "\n</head>");
  if (!html.includes(ANALYTICS)) html = html.replace(/<\/head>/i, ANALYTICS + "\n</head>");
  writeFileSync(f, html);
}

// 6. Vercel: la configuración vive en portal/vercel.json y las funciones en portal/api (reexportan las del ICFES)

console.log("Portal listo en", relative(root, dist), "· base ICFES:", BASE, "·", walk(dist).length, "archivos");

function walk(d) { return readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
