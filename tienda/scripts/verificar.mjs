#!/usr/bin/env node
/**
 * Verificación estática de la tienda (sin navegador). Uso: npm run verificar
 *  - Recorre todos los .html (raíz y p/) y comprueba que cada enlace, imagen, script y
 *    hoja de estilos interna exista en el disco.
 *  - Avisa de imágenes externas (Amazon u otros dominios), wa.me con un número distinto
 *    al configurado, <img> sin alt, páginas con más de un <h1>, títulos o descripciones
 *    repetidos, y textos de plantilla ([COMPLETAR, TODO, lorem, XXX).
 * Termina con código 1 si hay errores.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(readFileSync(join(raiz, 'data/config.json'), 'utf8'));
const numWA = String((config.whatsapp || {}).numero || '').replace(/\D/g, '');
const errores = [], avisos = [];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (/node_modules|originales/.test(p) ? [] : walk(p)) : [p]; });
const htmls = walk(raiz).filter(f => f.endsWith('.html') && !/admin\.html$/.test(f));
const titulos = {}, descripciones = {};

for (const f of htmls) {
  const rel = relative(raiz, f);
  const html = readFileSync(f, 'utf8');
  const base = (html.match(/<base href="([^"]+)"/) || [])[1] || '';
  const dirBase = resolve(dirname(f), base || '.');
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(m => m[1]).concat([...html.matchAll(/\bsrcset="([^"]+)"/g)].flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+/)[0]))).concat([...html.matchAll(/property="(?:og|twitter):image(?::secure_url)?" content="([^"]+)"/g), ...html.matchAll(/name="twitter:image" content="([^"]+)"/g)].map(m => m[1])).filter(u => u && !/^(#|mailto:|tel:|javascript:|data:)/.test(u));
  for (let u of refs) {
    if (/^https?:\/\//.test(u)) {
      if (/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(u) && !u.startsWith('https://tienda.nivytek.com/') && !u.startsWith('https://nivytek.com/')) errores.push(`${rel}: imagen externa ${u}`);
      if (/media-amazon\.com/.test(u)) errores.push(`${rel}: referencia a Amazon ${u}`);
      const m = u.match(/wa\.me\/(\d+)/); if (m && m[1] !== numWA) errores.push(`${rel}: wa.me con número distinto (${m[1]})`);
      if (u.startsWith('https://tienda.nivytek.com/')) { const local = u.slice('https://tienda.nivytek.com/'.length).split(/[?#]/)[0]; if (local && !existsSync(join(raiz, local))) errores.push(`${rel}: URL absoluta sin archivo local: ${u}`); }
      continue;
    }
    if (u.startsWith('//')) continue;
    u = u.split(/[?#]/)[0]; if (!u) continue;
    const destino = u.startsWith('/') ? join(raiz, u) : resolve(dirBase, u);
    if (!existsSync(destino)) errores.push(`${rel}: enlace roto → ${u}`);
  }
  for (const img of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(img[0])) errores.push(`${rel}: <img> sin alt: ${img[0].slice(0, 80)}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length; if (h1 !== 1 && !/producto\.html$/.test(rel)) errores.push(`${rel}: ${h1} <h1> (debe haber 1)`);
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1]; if (!t) errores.push(`${rel}: sin <title>`); else (titulos[t] = titulos[t] || []).push(rel);
  const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]; if (!d) errores.push(`${rel}: sin meta description`); else (descripciones[d] = descripciones[d] || []).push(rel);
  if (!/rel="canonical" href="https:\/\//.test(html) && !/producto\.html$/.test(rel)) errores.push(`${rel}: canonical ausente o relativo`);
  for (const m of html.matchAll(/\[COMPLETAR|\bTODO\b|lorem ipsum|\bXXX\b/g)) errores.push(`${rel}: texto de plantilla "${m[0]}"`);
}
for (const [t, fs] of Object.entries(titulos)) if (fs.length > 1) errores.push(`título repetido "${t}" en ${fs.join(', ')}`);
for (const [d, fs] of Object.entries(descripciones)) if (fs.length > 1) avisos.push(`meta description repetida en ${fs.join(', ')}`);

/* datos: rutas de imagen locales y existentes, sin dominios externos */
for (const archivo of ['data/catalogo.json', 'data/encargo.json']) {
  const datos = JSON.parse(readFileSync(join(raiz, archivo), 'utf8'));
  for (const p of datos.productos || []) {
    const imgs = p.imagenes || (p.foto ? [p.foto] : []);
    for (const i of imgs) { if (/^https?:/.test(i)) errores.push(`${archivo}: ${p.id} usa imagen externa ${i}`); else if (!existsSync(join(raiz, i))) errores.push(`${archivo}: ${p.id} imagen inexistente ${i}`); }
    for (const m of JSON.stringify(p).matchAll(/\[COMPLETAR|lorem ipsum/gi)) errores.push(`${archivo}: ${p.id} texto de plantilla "${m[0]}"`);
  }
}
for (const m of JSON.stringify(config).matchAll(/\[COMPLETAR|lorem ipsum|\bXXX\b/g)) errores.push(`data/config.json: texto de plantilla "${m[0]}"`);

console.log(`${htmls.length} páginas revisadas.`);
avisos.forEach(a => console.log('  aviso: ' + a));
errores.forEach(e => console.log('  ERROR: ' + e));
console.log(errores.length ? `${errores.length} error(es).` : 'Sin errores: enlaces, imágenes, alt, h1, títulos, canonical y wa.me correctos.');
process.exit(errores.length ? 1 : 0);
