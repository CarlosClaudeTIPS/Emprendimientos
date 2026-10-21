// ─── Utilidades para generar figuras SVG por código ──────────────────────────
// Todo es determinista a partir de una semilla, para poder reproducir y
// verificar cada pregunta. Los SVG usan las variables CSS --fig (trazo) y
// --fill (relleno) definidas en src/index.css.

export function rng(semilla) {
  let a = (Number(semilla) >>> 0) || 1
  const next = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const r = {
    next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] } return c },
    chance: (p) => next() < p,
  }
  return r
}

export const FIG = 'var(--fig)', FILL = 'var(--fill)'
export const svgDoc = (w, h, cuerpo, { alt = 'figura', ancho = w, alto = h } = {}) => `<svg viewBox="0 0 ${w} ${h}" width="${ancho}" height="${alto}" role="img" aria-label="${alt}">${cuerpo}</svg>`

// ── Figuras en cuadrícula (poliominós) ───────────────────────────────────────
// Una figura es un arreglo de celdas [x, y]. Se normaliza al origen y se ordena.
export const normalizar = (cells) => {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]))
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}
export const clave = (cells) => normalizar(cells).map(c => c.join(',')).join(';')
export const rotar90 = (cells) => normalizar(cells.map(([x, y]) => [-y, x]))
export const reflejarH = (cells) => normalizar(cells.map(([x, y]) => [-x, y]))
export const rotaciones = (cells) => { const out = []; let c = normalizar(cells); for (let i = 0; i < 4; i++) { out.push(c); c = rotar90(c) } return out }
export const mismaForma = (a, b) => rotaciones(a).some(r => clave(r) === clave(b)) // iguales salvo rotación
export const esQuiral = (cells) => !mismaForma(cells, reflejarH(cells))
export const dims = (cells) => { const n = normalizar(cells); return [Math.max(...n.map(c => c[0])) + 1, Math.max(...n.map(c => c[1])) + 1] }

// Poliominó aleatorio conexo de n celdas.
export function poliomino(r, n) {
  for (let intento = 0; intento < 50; intento++) {
    const cells = [[0, 0]]
    const set = new Set(['0,0'])
    while (cells.length < n) {
      const [x, y] = r.pick(cells)
      const [dx, dy] = r.pick([[1, 0], [-1, 0], [0, 1], [0, -1]])
      const k = `${x + dx},${y + dy}`
      if (!set.has(k)) { set.add(k); cells.push([x + dx, y + dy]) }
    }
    const nrm = normalizar(cells)
    const [w, h] = dims(nrm)
    if (w <= 4 && h <= 4) return nrm
  }
  return normalizar([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]])
}

// Dibuja celdas en una cuadrícula de `tam` px, centradas en un lienzo de g×g celdas.
export function dibujarCeldas(cells, { g = 4, tam = 18, marcador = null, margen = 2 } = {}) {
  const n = normalizar(cells)
  const [w, h] = dims(n)
  const ox = Math.floor((g - w) / 2), oy = Math.floor((g - h) / 2)
  const W = g * tam + margen * 2
  let s = `<rect x="0" y="0" width="${W}" height="${W}" fill="none"/>`
  for (const [x, y] of n) s += `<rect x="${margen + (ox + x) * tam}" y="${margen + (oy + y) * tam}" width="${tam}" height="${tam}" fill="${FILL}" stroke="${FIG}" stroke-width="1.5"/>`
  if (marcador) { const [mx, my] = marcador; s += `<circle cx="${margen + (ox + mx + 0.5) * tam}" cy="${margen + (oy + my + 0.5) * tam}" r="${tam * 0.2}" fill="${FIG}"/>` }
  return svgDoc(W, W, s, { ancho: W, alto: W })
}

// ── Sólidos de cubos (mapa de alturas) ───────────────────────────────────────
// h[y][x] = número de cubos apilados en la celda (x, y). x crece hacia la derecha,
// y crece hacia el frente (hacia quien mira). Las vistas se calculan así:
//  frente (desde +y): columnas x ascendente, altura = máximo sobre y
//  derecha (desde +x): columnas y ascendente, altura = máximo sobre x
//  atrás = frente invertida; izquierda = derecha invertida; superior = ocupación.
export function mapaAlturas(r, n = 3, maxH = 3, minCubos = 4) {
  for (let intento = 0; intento < 60; intento++) {
    const h = Array.from({ length: n }, () => Array.from({ length: n }, () => (r.chance(0.6) ? r.int(1, maxH) : 0)))
    const total = h.flat().reduce((a, b) => a + b, 0)
    if (total >= minCubos && h.flat().some(v => v > 1)) return h
  }
  return [[1, 2, 0], [1, 1, 1], [0, 2, 1]]
}
export const totalCubos = (h) => h.flat().reduce((a, b) => a + b, 0)
export const vistaFrente = (h) => h[0].map((_, x) => Math.max(...h.map(fila => fila[x])))
export const vistaDerecha = (h) => h.map(fila => Math.max(...fila))
export const vistaAtras = (h) => [...vistaFrente(h)].reverse()
export const vistaIzquierda = (h) => [...vistaDerecha(h)].reverse()
export const vistaSuperior = (h) => h.map(fila => fila.map(v => (v > 0 ? 1 : 0)))
export const VISTAS = { frente: vistaFrente, derecha: vistaDerecha, atras: vistaAtras, izquierda: vistaIzquierda }
export const NOMBRE_VISTA = { frente: 'desde el frente', derecha: 'desde la derecha', atras: 'desde atrás', izquierda: 'desde la izquierda', superior: 'desde arriba' }
export const clonar = (h) => h.map(f => [...f])
export const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Dibujo isométrico del sólido. Opcionalmente, una flecha que indica desde dónde se mira.
export function dibujarIso(h, { s = 16, flecha = null, etiquetaFrente = true } = {}) {
  const n = h.length, c = Math.cos(Math.PI / 6), sn = 0.5
  const maxH = Math.max(1, ...h.flat())
  const W = (2 * n) * s * c + 60, H = (n * s) + maxH * s + 70
  const ox = W / 2, oy = 40 + maxH * s
  const P = (x, y, z) => [ox + (x - y) * s * c, oy + (x + y) * s * sn - z * s]
  const poly = (pts, fill, op = 1) => `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" fill-opacity="${op}" stroke="${FIG}" stroke-width="1"/>`
  let out = ''
  const cubos = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (let z = 0; z < h[y][x]; z++) cubos.push([x, y, z])
  cubos.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2])
  for (const [x, y, z] of cubos) {
    out += poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FILL, 1) // arriba
    out += poly([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FIG, 0.35) // frente (cara +y)
    out += poly([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], FIG, 0.6) // derecha (cara +x)
  }
  if (etiquetaFrente && !flecha) { const [fx, fy] = P(n / 2, n + 0.9, 0); out += `<text x="${fx.toFixed(1)}" y="${(fy + 14).toFixed(1)}" font-size="10" text-anchor="middle" fill="${FIG}">frente</text>` }
  if (flecha) {
    const centro = { frente: P(n / 2, n + 1.6, 0.5), atras: P(n / 2, -1.6, 0.5), derecha: P(n + 1.6, n / 2, 0.5), izquierda: P(-1.6, n / 2, 0.5) }[flecha]
    const hacia = { frente: P(n / 2, n + 0.4, 0.5), atras: P(n / 2, -0.4, 0.5), derecha: P(n + 0.4, n / 2, 0.5), izquierda: P(-0.4, n / 2, 0.5) }[flecha]
    out += `<line x1="${centro[0].toFixed(1)}" y1="${centro[1].toFixed(1)}" x2="${hacia[0].toFixed(1)}" y2="${hacia[1].toFixed(1)}" stroke="${FIG}" stroke-width="3" marker-end="url(#fl)"/>`
    out = `<defs><marker id="fl" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${FIG}"/></marker></defs>` + out
  }
  return svgDoc(W, H, out, { alt: 'sólido de cubos', ancho: Math.round(W), alto: Math.round(H) })
}

// Silueta 2D de una vista lateral (alturas por columna) o superior (ocupación).
export function dibujarSilueta(vista, { tam = 16, superior = false } = {}) {
  if (superior) {
    const n = vista.length, W = n * tam + 4
    let s = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (vista[y][x]) s += `<rect x="${2 + x * tam}" y="${2 + y * tam}" width="${tam}" height="${tam}" fill="${FILL}" stroke="${FIG}" stroke-width="1.2"/>`
    s += `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" fill="none" stroke="${FIG}" stroke-width="0.5" stroke-dasharray="2 2"/>`
    return svgDoc(W, W + 12, s + `<text x="${W / 2}" y="${W + 9}" font-size="8" text-anchor="middle" fill="${FIG}">frente</text>`, { ancho: W, alto: W + 12 })
  }
  const maxH = Math.max(1, ...vista), n = vista.length, W = n * tam + 4, H = maxH * tam + 4
  let s = ''
  for (let x = 0; x < n; x++) for (let z = 0; z < vista[x]; z++) s += `<rect x="${2 + x * tam}" y="${2 + (maxH - 1 - z) * tam}" width="${tam}" height="${tam}" fill="${FILL}" stroke="${FIG}" stroke-width="1.2"/>`
  return svgDoc(W, H, s, { ancho: W, alto: H })
}

// ── Desarrollo (red) del cubo ────────────────────────────────────────────────
// Las 11 redes del cubo como celdas [x, y].
const red = (filas) => filas.flatMap((f, y) => [...f].map((c, x) => (c === 'X' ? [x, y] : null)).filter(Boolean))
export const REDES_CUBO = [
  ['X...', 'XXXX', 'X...'], ['X...', 'XXXX', '.X..'], ['X...', 'XXXX', '..X.'], ['X...', 'XXXX', '...X'], ['.X..', 'XXXX', '.X..'], ['.X..', 'XXXX', '..X.'],
  ['XX..', '.XXX', '.X..'], ['XX..', '.XXX', '..X.'], ['XX..', '.XXX', '...X'], ['XX..', '.XX.', '..XX'], ['XXX..', '..XXX'],
].map(red)
// Pliega la red "rodando" un cubo sobre ella: la cara que toca cada celda es la que
// esa celda representa. Devuelve, para cada celda, la cara {abajo, arriba, norte, sur, este, oeste}.
export function plegarRed(cells) {
  const k = (x, y) => `${x},${y}`
  const set = new Map(cells.map((c, i) => [k(c[0], c[1]), i]))
  const cara = new Array(cells.length).fill(null)
  // Orientación: qué etiqueta de cara está en cada posición del cubo.
  const inicio = { abajo: 'A', arriba: 'B', norte: 'C', sur: 'D', este: 'E', oeste: 'F' }
  const rodar = (o, dx, dy) => {
    if (dx === 1) return { ...o, abajo: o.este, este: o.arriba, arriba: o.oeste, oeste: o.abajo }
    if (dx === -1) return { ...o, abajo: o.oeste, oeste: o.arriba, arriba: o.este, este: o.abajo }
    if (dy === -1) return { ...o, abajo: o.norte, norte: o.arriba, arriba: o.sur, sur: o.abajo }
    return { ...o, abajo: o.sur, sur: o.arriba, arriba: o.norte, norte: o.abajo }
  }
  const cola = [[0, inicio]]
  const visto = new Set([0])
  cara[0] = inicio.abajo
  const posicion = {}
  posicion[inicio.abajo] = 'abajo'
  while (cola.length) {
    const [i, o] = cola.shift()
    const [x, y] = cells[i]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = set.get(k(x + dx, y + dy))
      if (j == null || visto.has(j)) continue
      visto.add(j)
      const o2 = rodar(o, dx, dy)
      cara[j] = o2.abajo
      cola.push([j, o2])
    }
  }
  const opuesta = { A: 'B', B: 'A', C: 'D', D: 'C', E: 'F', F: 'E' }
  const indicePorCara = Object.fromEntries(cara.map((c, i) => [c, i]))
  return { cara, opuestaDe: (i) => indicePorCara[opuesta[cara[i]]] }
}
export function dibujarRed(cells, simbolos, { tam = 22 } = {}) {
  const [w, h] = dims(cells)
  const W = w * tam + 4, H = h * tam + 4
  let s = ''
  cells.forEach(([x, y], i) => {
    s += `<rect x="${2 + x * tam}" y="${2 + y * tam}" width="${tam}" height="${tam}" fill="${FILL}" stroke="${FIG}" stroke-width="1.3"/>`
    s += `<text x="${2 + x * tam + tam / 2}" y="${2 + y * tam + tam / 2 + 5}" font-size="13" font-weight="700" text-anchor="middle" fill="${FIG}">${simbolos[i]}</text>`
  })
  return svgDoc(W, H, s, { ancho: W, alto: H })
}

// ── Figuras de puntos y segmentos (superposición) ────────────────────────────
export const SEGMENTOS_3x3 = (() => { const s = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { if (x < 2) s.push([[x, y], [x + 1, y]]); if (y < 2) s.push([[x, y], [x, y + 1]]); if (x < 2 && y < 2) { s.push([[x, y], [x + 1, y + 1]]); s.push([[x + 1, y], [x, y + 1]]) } } return s })()
export const claveSeg = (seg) => seg.map(p => p.join(',')).join('-')
export function dibujarSegmentos(segs, { tam = 24 } = {}) {
  const W = 2 * tam + 12
  let s = ''
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) s += `<circle cx="${6 + x * tam}" cy="${6 + y * tam}" r="2.2" fill="${FIG}"/>`
  for (const [[x1, y1], [x2, y2]] of segs) s += `<line x1="${6 + x1 * tam}" y1="${6 + y1 * tam}" x2="${6 + x2 * tam}" y2="${6 + y2 * tam}" stroke="${FIG}" stroke-width="2.2" stroke-linecap="round"/>`
  return svgDoc(W, W, s, { ancho: W, alto: W })
}
