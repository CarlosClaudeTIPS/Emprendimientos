import { rng, normalizar, clave, rotar90, reflejarH, rotaciones, mismaForma, esQuiral, poliomino, dibujarCeldas, mapaAlturas, totalCubos, VISTAS, NOMBRE_VISTA, vistaSuperior, vistaFrente, vistaDerecha, dibujarIso, dibujarSilueta, clonar, igual, REDES_CUBO, plegarRed, dibujarRed, SEGMENTOS_3x3, claveSeg, dibujarSegmentos, svgDoc, FIG, FILL } from './base.js'

// ─── Generadores por subtipo de «análisis de la imagen» ──────────────────────
// Cada generador devuelve { enunciado, estimulo, opciones: [{ svg|texto, correcta, explicacion }],
// explicacion, verificar() } donde verificar() comprueba por un camino
// independiente que la opción marcada como correcta lo es y que es única.

const unicas = (ops) => new Set(ops.map(o => o.svg ?? o.texto)).size === ops.length

// 1. rotacion: la figura igual al modelo (girada), frente a reflejos.
export function rotacion(semilla, dif = 2) {
  const r = rng(semilla)
  let fig
  do fig = poliomino(r, dif >= 3 ? 6 : 5); while (!esQuiral(fig))
  const giros = rotaciones(fig)
  const correcta = giros[r.int(1, 3)]
  const reflejo = reflejarH(fig)
  const vistos = new Set([clave(correcta)])
  const distractores = []
  for (const g of r.shuffle(rotaciones(reflejo))) { const k = clave(g); if (!vistos.has(k) && distractores.length < 3) { vistos.add(k); distractores.push(g) } }
  // Si el reflejo tiene simetría de giro no alcanza: se agrega una figura parecida pero distinta (una celda movida).
  for (let intento = 0; distractores.length < 3 && intento < 40; intento++) {
    const c = [...fig]; const i = r.int(0, c.length - 1); const [x, y] = c[i]; c[i] = [x + r.pick([-1, 1]), y + r.pick([-1, 1])]
    const n = normalizar(c); const k = clave(n)
    if (!vistos.has(k) && !mismaForma(fig, n) && new Set(n.map(p => p.join(','))).size === n.length) { vistos.add(k); distractores.push(n) }
  }
  if (distractores.length < 3) return rotacion(semilla + 977, dif)
  const opciones = [{ svg: dibujarCeldas(correcta), correcta: true, explicacion: 'Es el modelo girado: al rotarlo en el plano (sin voltearlo) coincide celda por celda.' }, ...distractores.map(d => ({ svg: dibujarCeldas(d), correcta: false, explicacion: mismaForma(d, reflejo) ? 'Es el reflejo (la imagen en un espejo) del modelo: por más que la gires no coincide con él.' : 'Se parece al modelo, pero una celda está en otro lugar: compara el número y la posición de los cuadrados.' }))]
  return {
    subhabilidad: 'rotacion', enunciado: 'La figura de arriba es el modelo. ¿Cuál de las opciones es la MISMA figura, solo que girada en el plano (sin voltearla)?',
    estimulo: { tipo: 'svg', svg: dibujarCeldas(fig, { tam: 22 }), alt: 'Figura modelo formada por cuadrados' }, opciones,
    explicacion: 'Gira mentalmente el modelo 90°, 180° y 270° y compara: solo una opción coincide. Las otras tres son reflejos, que parecen iguales pero están "al revés": para que coincidan habría que voltear la figura, no girarla.',
    verificar: () => mismaForma(fig, correcta) && distractores.every(d => !mismaForma(fig, d)) && unicas(opciones),
  }
}

// 2. simetria: completar un patrón simétrico respecto a un eje vertical.
export function simetria(semilla, dif = 2) {
  const r = rng(semilla)
  const n = dif >= 3 ? 4 : 3
  const mitad = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (r.chance(0.5)) mitad.push([x, y])
  if (mitad.length < 3) mitad.push([0, 0], [1, 1], [n - 1, n - 1])
  const espejo = mitad.map(([x, y]) => [2 * n - 1 - x, y])
  const completa = [...mitad, ...espejo]
  const dibujo = (celdas, eje = true) => {
    const tam = 18, W = 2 * n * tam + 4
    let s = ''
    for (const [x, y] of celdas) s += `<rect x="${2 + x * tam}" y="${2 + y * tam}" width="${tam}" height="${tam}" fill="${FILL}" stroke="${FIG}" stroke-width="1.3"/>`
    if (eje) s += `<line x1="${2 + n * tam}" y1="0" x2="${2 + n * tam}" y2="${n * tam + 4}" stroke="${FIG}" stroke-width="1.5" stroke-dasharray="4 3"/>`
    return svgDoc(W, n * tam + 4, s, { ancho: W, alto: n * tam + 4 })
  }
  const trasladada = mitad.map(([x, y]) => [x + n, y]) // copia sin reflejar
  const alterada = (() => { const c = [...espejo]; const [x, y] = [r.int(n, 2 * n - 1), r.int(0, n - 1)]; const i = c.findIndex(p => p[0] === x && p[1] === y); if (i >= 0) c.splice(i, 1); else c.push([x, y]); return c })()
  const girada = mitad.map(([x, y]) => [2 * n - 1 - x, n - 1 - y]) // rotación de 180°
  const abs = (c) => [...c].map(p => p.join(',')).sort().join(';')
  const firmas = [espejo, trasladada, alterada, girada].map(abs)
  if (new Set(firmas).size < 4) return simetria(semilla + 311, dif)
  const opcionesBase = [
    { celdas: espejo, correcta: true, explicacion: 'Cada cuadrado queda a la misma distancia del eje que su pareja, pero al otro lado: es el reflejo exacto.' },
    { celdas: trasladada, correcta: false, explicacion: 'Es la mitad copiada tal cual (trasladada), no reflejada: los cuadrados cercanos al eje quedarían lejos.' },
    { celdas: alterada, correcta: false, explicacion: 'Casi es el reflejo, pero un cuadrado sobra o falta: compara celda por celda con el eje.' },
    { celdas: girada, correcta: false, explicacion: 'Es la mitad girada 180°, no reflejada: arriba y abajo quedan intercambiados.' },
  ]
  const opciones = opcionesBase.map(o => ({ svg: dibujo(o.celdas.map(([x, y]) => [x - n, y]).filter(([x]) => x >= 0).map(([x, y]) => [x, y]), false).replace(`viewBox="0 0 ${2 * n * 18 + 4}`, `viewBox="0 0 ${n * 18 + 4}`), correcta: o.correcta, explicacion: o.explicacion }))
  const correctaClave = abs(espejo)
  return {
    subhabilidad: 'simetria', enunciado: 'La figura de arriba muestra la mitad izquierda de un patrón y su eje de simetría (línea punteada). ¿Qué mitad derecha completa el patrón para que sea simétrico respecto al eje?',
    estimulo: { tipo: 'svg', svg: dibujo(mitad), alt: 'Mitad izquierda de un patrón con eje de simetría vertical' }, opciones,
    explicacion: 'En una simetría respecto a un eje vertical, cada cuadrado se refleja al otro lado a la misma distancia del eje y a la misma altura. Verifica fila por fila: la fila superior de la mitad derecha debe ser la fila superior de la izquierda leída al revés.',
    verificar: () => opcionesBase.filter(o => abs(o.celdas) === correctaClave).length === 1 && opcionesBase.find(o => o.correcta) && abs(opcionesBase.find(o => o.correcta).celdas) === correctaClave && abs(mitad.map(([x, y]) => [2 * n - 1 - x, y])) === correctaClave && unicas(opciones) && igual(completa.length, mitad.length * 2),
  }
}

// 3. secuencias: la figura gira 90° en sentido horario en cada paso y el punto avanza una esquina.
export function secuencias(semilla, dif = 2) {
  const r = rng(semilla)
  let fig
  do fig = poliomino(r, 4); while (!esQuiral(fig) || new Set(rotaciones(fig).map(clave)).size < 4)
  const horario = (c) => normalizar(c.map(([x, y]) => [-y, x])) // rotación 90° (sentido fijo)
  const pasos = [fig]
  for (let i = 1; i < 4; i++) pasos.push(horario(pasos[i - 1]))
  const esquinas = (c) => { const [w, h] = [Math.max(...c.map(p => p[0])), Math.max(...c.map(p => p[1]))]; return [[0, 0], [w, 0], [w, h], [0, h]] }
  const marcador = (i, c) => esquinas(c)[i % 4]
  const serie = pasos.slice(0, 3).map((c, i) => dibujarCeldas(c, { marcador: marcador(i, c) }))
  const correcta = pasos[3]
  const opciones = [
    { svg: dibujarCeldas(correcta, { marcador: marcador(3, correcta) }), correcta: true, explicacion: 'La figura gira 90° en el mismo sentido que en los pasos anteriores y el punto pasa a la siguiente esquina.' },
    { svg: dibujarCeldas(pasos[1], { marcador: marcador(3, pasos[1]) }), correcta: false, explicacion: 'La figura está girada en sentido contrario al de la serie.' },
    { svg: dibujarCeldas(correcta, { marcador: marcador(2, correcta) }), correcta: false, explicacion: 'La figura es correcta, pero el punto se quedó en la esquina anterior en vez de avanzar.' },
    { svg: dibujarCeldas(reflejarH(correcta), { marcador: marcador(3, reflejarH(correcta)) }), correcta: false, explicacion: 'Es un reflejo de la figura esperada, no un giro: la serie solo gira, nunca voltea.' },
  ]
  const W = 3 * 76 + 40
  const svg = svgDoc(W, 80, serie.map((s, i) => `<g transform="translate(${i * 110},2)">${s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>` + (i < 2 ? `<text x="${i * 110 + 86}" y="44" font-size="16" fill="${FIG}">→</text>` : '')).join(''), { ancho: W, alto: 80 })
  return {
    subhabilidad: 'secuencias', enunciado: 'Observa la serie de tres figuras. ¿Cuál figura sigue?',
    estimulo: { tipo: 'svg', svg, alt: 'Serie de tres figuras que giran y con un punto que cambia de esquina' }, opciones,
    explicacion: 'Hay dos regularidades a la vez: la figura gira 90° en el mismo sentido en cada paso, y el punto avanza una esquina siguiendo el mismo orden. La opción correcta cumple las dos; cada distractor rompe una.',
    verificar: () => clave(correcta) === clave(horario(pasos[2])) && clave(pasos[1]) !== clave(correcta) && !mismaForma(correcta, reflejarH(correcta)) && unicas(opciones),
  }
}

// 4. conteo_espacial: cuántos cubos forman el sólido (incluidos los que no se ven).
export function conteo_espacial(semilla, dif = 2) {
  const r = rng(semilla)
  const h = mapaAlturas(r, dif >= 3 ? 4 : 3, dif >= 2 ? 3 : 2, dif >= 3 ? 10 : 5)
  const total = totalCubos(h)
  // Cubos "visibles" desde la vista isométrica, aproximación típica del error: contar solo los de arriba y los del frente/derecha
  const soloArriba = h.flat().filter(v => v > 0).length
  const cands = new Set([total - 1, total + 1, total + 2, soloArriba, total - 2].filter(v => v > 0 && v !== total))
  const distr = r.shuffle([...cands]).slice(0, 3)
  const opciones = [{ texto: String(total), correcta: true, explicacion: 'Suma los cubos de cada columna, incluidos los que quedan ocultos detrás o debajo de otros.' }, ...distr.map(v => ({ texto: String(v), correcta: false, explicacion: v === soloArriba ? 'Cuenta solo las columnas (los cubos de arriba), sin los que están apilados debajo.' : v < total ? 'Faltan cubos: suele pasar cuando se olvidan los que están ocultos detrás de otros.' : 'Sobran cubos: se contó alguna cara dos veces o se supuso un cubo donde hay un hueco.' }))]
  return {
    subhabilidad: 'conteo_espacial', enunciado: 'El sólido está formado por cubos iguales apoyados sobre una superficie plana; ningún cubo flota. ¿Cuántos cubos hay en total, contando los que no se ven?',
    estimulo: { tipo: 'svg', svg: dibujarIso(h, { s: 15 }), alt: 'Sólido formado por cubos apilados' }, opciones,
    explicacion: `Divide el sólido en columnas (una por cada posición de la base) y cuenta cuántos cubos tiene cada una; como ningún cubo flota, una columna de altura k tiene k cubos. Suma todas las columnas: ${h.flat().filter(v => v > 0).join(' + ')} = ${total}.`,
    verificar: () => total === h.flat().reduce((a, b) => a + b, 0) && distr.every(v => v !== total) && distr.length === 3,
  }
}

// Distractores de vistas: alteran el mapa de alturas de forma que la vista pedida cambie.
function distractoresVista(r, h, tipo) {
  const fn = tipo === 'superior' ? vistaSuperior : VISTAS[tipo]
  const objetivo = fn(h)
  const vistas = new Set([JSON.stringify(objetivo)])
  const out = []
  let intentos = 0
  while (out.length < 3 && intentos++ < 200) {
    const h2 = clonar(h)
    const y = r.int(0, h.length - 1), x = r.int(0, h.length - 1)
    const modo = r.int(0, 2)
    if (modo === 0) h2[y][x] = Math.max(0, h2[y][x] + r.pick([-1, 1]))
    else if (modo === 1) h2[y][x] = h2[y][x] ? 0 : 1
    else { const y2 = r.int(0, h.length - 1), x2 = r.int(0, h.length - 1); [h2[y][x], h2[y2][x2]] = [h2[y2][x2], h2[y][x]] }
    const v = fn(h2)
    const k = JSON.stringify(v)
    if (vistas.has(k)) continue
    // Para vistas laterales, también vale una vista reflejada o de otro lado como distractor
    vistas.add(k); out.push(v)
  }
  if (out.length < 3 && tipo !== 'superior') {
    for (const alt of [[...objetivo].reverse(), vistaDerecha(h), vistaFrente(h), [...vistaDerecha(h)].reverse()]) { const k = JSON.stringify(alt); if (!vistas.has(k) && out.length < 3) { vistas.add(k); out.push(alt) } }
  }
  return { objetivo, distractores: out }
}

// 5. vistas: vista superior, frontal o lateral de un sólido de cubos.
export function vistas(semilla, dif = 2) {
  const r = rng(semilla)
  const h = mapaAlturas(r, 3, dif >= 2 ? 3 : 2, 5)
  const tipo = r.pick(['superior', 'frente', 'derecha'])
  const { objetivo, distractores } = distractoresVista(r, h, tipo)
  if (distractores.length < 3) return vistas(semilla + 7919, dif)
  const sup = tipo === 'superior'
  const opciones = [{ svg: dibujarSilueta(objetivo, { superior: sup }), correcta: true, explicacion: sup ? 'Desde arriba se ve una casilla por cada columna que tenga al menos un cubo, sin importar su altura.' : 'En cada columna de la vista se ve la altura máxima de esa fila de cubos.' }, ...distractores.map(d => ({ svg: dibujarSilueta(d, { superior: sup }), correcta: false, explicacion: sup ? 'Esta vista marca casillas donde no hay columna, o deja sin marcar una que sí tiene cubos.' : 'La altura de alguna columna no corresponde al máximo de cubos en esa línea, o la vista está invertida.' }))]
  return {
    subhabilidad: 'vistas', enunciado: `¿Cómo se ve el sólido ${NOMBRE_VISTA[tipo]}?${tipo === 'derecha' ? ' (La derecha es la de quien mira el sólido de frente.)' : ''}`,
    estimulo: { tipo: 'svg', svg: dibujarIso(h, { s: 15 }), alt: 'Sólido formado por cubos apilados, con el frente indicado' }, opciones,
    explicacion: sup ? 'La vista superior es la "huella" del sólido: se dibuja una casilla por cada columna con al menos un cubo. La altura no importa.' : `Para la vista ${NOMBRE_VISTA[tipo]} recorre el sólido en ese sentido: en cada línea de cubos solo se ve el más alto, así que la silueta tiene, por columna, la altura máxima. Alturas: ${objetivo.join(', ')}.`,
    verificar: () => igual(sup ? vistaSuperior(h) : VISTAS[tipo](h), objetivo) && distractores.every(d => !igual(d, objetivo)) && unicas(opciones),
  }
}

// 6. vista_flecha: cómo se ve el objeto desde la dirección que indica la flecha.
export function vista_flecha(semilla, dif = 2) {
  const r = rng(semilla)
  const h = mapaAlturas(r, 3, dif >= 2 ? 3 : 2, 5)
  const lado = r.pick(['frente', 'derecha', 'atras', 'izquierda'])
  const { objetivo, distractores } = distractoresVista(r, h, lado)
  if (distractores.length < 3) return vista_flecha(semilla + 104729, dif)
  const opciones = [{ svg: dibujarSilueta(objetivo), correcta: true, explicacion: 'Mirando en la dirección de la flecha, cada columna muestra la altura máxima de la línea de cubos que queda delante.' }, ...distractores.map(d => ({ svg: dibujarSilueta(d), correcta: false, explicacion: 'Esta silueta corresponde a otra dirección de observación o a una altura mal leída.' }))]
  return {
    subhabilidad: 'vista_flecha', enunciado: '¿Cómo se ve el objeto si se mira desde la dirección que indica la flecha?',
    estimulo: { tipo: 'svg', svg: dibujarIso(h, { s: 15, flecha: lado }), alt: 'Sólido de cubos con una flecha que indica la dirección desde la que se observa' }, opciones,
    explicacion: `La flecha apunta ${NOMBRE_VISTA[lado]}. Imagina que te paras donde empieza la flecha y miras hacia el sólido: lo que queda a tu izquierda aparece a la izquierda de la silueta. Por cada columna que ves, la altura es la del cubo más alto en esa línea de visión. ${lado === 'atras' || lado === 'izquierda' ? 'Como miras desde el lado opuesto, la silueta queda invertida respecto a la vista contraria.' : ''}`,
    verificar: () => igual(VISTAS[lado](h), objetivo) && distractores.every(d => !igual(d, objetivo)) && unicas(opciones),
  }
}

// 7. solido_desde_vistas: qué sólido corresponde a la vista superior y la frontal dadas.
export function solido_desde_vistas(semilla, dif = 2) {
  const r = rng(semilla)
  const h = mapaAlturas(r, 3, dif >= 2 ? 3 : 2, 5)
  const sup = vistaSuperior(h), fr = vistaFrente(h)
  const cumple = (h2) => igual(vistaSuperior(h2), sup) && igual(vistaFrente(h2), fr)
  const distr = []
  const vistos = new Set([JSON.stringify(h)])
  let intentos = 0
  while (distr.length < 3 && intentos++ < 300) {
    const h2 = clonar(h)
    const y = r.int(0, 2), x = r.int(0, 2)
    const modo = r.int(0, 2)
    if (modo === 0) h2[y][x] = Math.max(0, h2[y][x] + r.pick([-1, 1]))
    else if (modo === 1) h2[y][x] = h2[y][x] ? 0 : 1
    else h2[y][x] = Math.max(1, h2[y][x] + 1)
    const k = JSON.stringify(h2)
    if (vistos.has(k) || cumple(h2) || totalCubos(h2) === 0) continue
    vistos.add(k); distr.push(h2)
  }
  if (distr.length < 3) return solido_desde_vistas(semilla + 7907, dif)
  const opciones = [{ svg: dibujarIso(h, { s: 11, etiquetaFrente: true }), correcta: true, explicacion: 'Su huella (vista superior) y su silueta frontal coinciden con las dos vistas dadas.' }, ...distr.map(d => ({ svg: dibujarIso(d, { s: 11, etiquetaFrente: true }), correcta: false, explicacion: igual(vistaSuperior(d), sup) ? 'La huella coincide, pero la vista frontal no: alguna columna es más alta o más baja de lo que muestra la silueta.' : 'La vista superior no coincide: tiene una columna de más o de menos.' }))]
  const W = 150
  const estimulo = svgDoc(W, 90, `<g transform="translate(0,0)">${dibujarSilueta(sup, { superior: true }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g><text x="26" y="86" font-size="8" fill="${FIG}" text-anchor="middle">vista superior</text><g transform="translate(80,${Math.max(0, 52 - Math.max(...fr) * 16)})">${dibujarSilueta(fr).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g><text x="106" y="86" font-size="8" fill="${FIG}" text-anchor="middle">vista frontal</text>`, { ancho: W, alto: 90 })
  return {
    subhabilidad: 'solido_desde_vistas', enunciado: 'Un sólido de cubos tiene la vista superior y la vista frontal que se muestran. ¿Cuál de los sólidos corresponde a esas dos vistas?',
    estimulo: { tipo: 'svg', svg: estimulo, alt: 'Vista superior y vista frontal de un sólido de cubos' }, opciones,
    explicacion: 'Primero descarta los sólidos cuya huella (vista desde arriba) no coincide con la vista superior. Entre los que quedan, compara la silueta frontal: en cada columna, la altura debe ser la del cubo más alto de esa línea. Solo un sólido cumple ambas condiciones.',
    verificar: () => cumple(h) && distr.every(d => !cumple(d)) && unicas(opciones),
  }
}

// 8. desarrollo_cubo: qué cara queda opuesta a una dada al plegar la red.
export function desarrollo_cubo(semilla, dif = 2) {
  const r = rng(semilla)
  const red = r.pick(REDES_CUBO)
  const simbolos = r.shuffle(['A', 'B', 'C', 'D', 'E', 'F'])
  const { opuestaDe } = plegarRed(red)
  const i = r.int(0, 5)
  const j = opuestaDe(i)
  const vecinos = [0, 1, 2, 3, 4, 5].filter(k => k !== i && k !== j)
  const distr = r.shuffle(vecinos).slice(0, 3)
  const opciones = [{ texto: simbolos[j], correcta: true, explicacion: `Al plegar la red, la cara ${simbolos[j]} queda enfrente de la cara ${simbolos[i]}: entre ellas siempre hay exactamente una cara de por medio en la red (en línea o doblando una esquina).` }, ...distr.map(k => ({ texto: simbolos[k], correcta: false, explicacion: `La cara ${simbolos[k]} queda pegada a la cara ${simbolos[i]} (comparten una arista), no opuesta.` }))]
  return {
    subhabilidad: 'desarrollo_cubo', enunciado: `La figura es el desarrollo (red) de un cubo. Al plegarla, ¿qué cara queda OPUESTA a la cara ${simbolos[i]}?`,
    estimulo: { tipo: 'svg', svg: dibujarRed(red, simbolos), alt: 'Desarrollo plano de un cubo con seis caras marcadas con letras' }, opciones,
    explicacion: `Regla práctica: en una red, dos caras separadas por exactamente una cara en línea recta son opuestas; las caras que comparten un lado son vecinas. Pliega mentalmente desde la cara ${simbolos[i]}: las cuatro caras que la rodean suben como paredes, y la que queda enfrente es ${simbolos[j]}.`,
    verificar: () => opuestaDe(j) === i && distr.every(k => k !== j && k !== i) && new Set(simbolos).size === 6,
  }
}

// 9. superposicion: figura que resulta de superponer dos figuras de puntos y segmentos.
export function superposicion(semilla, dif = 2) {
  const r = rng(semilla)
  const n1 = dif >= 3 ? 4 : 3, n2 = dif >= 3 ? 4 : 3
  const f1 = r.shuffle(SEGMENTOS_3x3).slice(0, n1)
  let f2 = r.shuffle(SEGMENTOS_3x3.filter(s => !f1.some(t => claveSeg(t) === claveSeg(s)))).slice(0, n2)
  const union = [...f1, ...f2]
  const claves = new Set(union.map(claveSeg))
  const menos = union.filter((_, i) => i !== r.int(0, union.length - 1))
  const extra = r.pick(SEGMENTOS_3x3.filter(s => !claves.has(claveSeg(s))))
  const mas = [...union, extra]
  const soloUna = r.chance(0.5) ? f1 : f2
  const firmaSeg = (segs) => [...new Set(segs.map(claveSeg))].sort().join('|')
  if (new Set([union, menos, mas, soloUna].map(firmaSeg)).size < 4) return superposicion(semilla + 433, dif)
  const opcionesBase = [
    { segs: union, correcta: true, explicacion: 'Tiene exactamente todos los segmentos de las dos figuras, sin añadir ni quitar ninguno.' },
    { segs: menos, correcta: false, explicacion: 'Le falta un segmento de una de las dos figuras.' },
    { segs: mas, correcta: false, explicacion: 'Tiene un segmento que no está en ninguna de las dos figuras.' },
    { segs: soloUna, correcta: false, explicacion: 'Es solo una de las dos figuras, no la superposición.' },
  ]
  const opciones = opcionesBase.map(o => ({ svg: dibujarSegmentos(o.segs, { tam: 20 }), correcta: o.correcta, explicacion: o.explicacion }))
  const est = svgDoc(150, 64, `<g>${dibujarSegmentos(f1).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g><text x="70" y="36" font-size="18" fill="${FIG}">+</text><g transform="translate(90,0)">${dibujarSegmentos(f2).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`, { ancho: 150, alto: 64 })
  const conjunto = (segs) => new Set(segs.map(claveSeg))
  const igualSet = (a, b) => a.size === b.size && [...a].every(k => b.has(k))
  return {
    subhabilidad: 'superposicion', enunciado: 'Las dos figuras están dibujadas sobre la misma cuadrícula de puntos. ¿Qué figura resulta al superponer una sobre la otra?',
    estimulo: { tipo: 'svg', svg: est, alt: 'Dos figuras de segmentos sobre una cuadrícula de nueve puntos' }, opciones,
    explicacion: 'Superponer es dibujar las dos figuras en el mismo lugar: el resultado contiene todos los segmentos de la primera y todos los de la segunda. Cuenta los segmentos (sin repetir los que coincidan) y verifica que la opción tenga exactamente esos.',
    verificar: () => { const u = conjunto(union); return opcionesBase.filter(o => igualSet(conjunto(o.segs), u)).length === 1 && opcionesBase[0].correcta && unicas(opciones) },
  }
}

// 10. construccion: figura que resulta de seguir instrucciones escritas.
const PRIMITIVAS = [
  { id: 'cuadrado', texto: 'Dibuja un cuadrado.', svg: () => `<rect x="10" y="10" width="60" height="60" fill="none" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'diag1', texto: 'Une el vértice superior izquierdo con el inferior derecho.', svg: () => `<line x1="10" y1="10" x2="70" y2="70" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'diag2', texto: 'Une el vértice superior derecho con el inferior izquierdo.', svg: () => `<line x1="70" y1="10" x2="10" y2="70" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'circulo', texto: 'Dibuja un círculo con centro en el centro del cuadrado que toque sus cuatro lados.', svg: () => `<circle cx="40" cy="40" r="30" fill="none" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'medio_h', texto: 'Une los puntos medios de los lados izquierdo y derecho.', svg: () => `<line x1="10" y1="40" x2="70" y2="40" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'medio_v', texto: 'Une los puntos medios de los lados superior e inferior.', svg: () => `<line x1="40" y1="10" x2="40" y2="70" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'tri_sup', texto: 'Une el punto medio del lado superior con los dos vértices inferiores.', svg: () => `<polyline points="10,70 40,10 70,70" fill="none" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'arco', texto: 'Dibuja un semicírculo sobre el lado superior, hacia afuera del cuadrado.', svg: () => `<path d="M10,10 A30,30 0 0 1 70,10" fill="none" stroke="${FIG}" stroke-width="2"/>` },
  { id: 'punto', texto: 'Marca con un punto el centro del cuadrado.', svg: () => `<circle cx="40" cy="40" r="3.5" fill="${FIG}"/>` },
  { id: 'circulo_peq', texto: 'Dibuja un círculo pequeño en el vértice inferior derecho.', svg: () => `<circle cx="70" cy="70" r="7" fill="${FILL}" stroke="${FIG}" stroke-width="2"/>` },
]
const ESPEJO = { diag1: 'diag2', diag2: 'diag1', medio_h: 'medio_v', medio_v: 'medio_h', circulo_peq: 'circulo_peq_izq' }
export function construccion(semilla, dif = 2) {
  const r = rng(semilla)
  const extras = r.shuffle(PRIMITIVAS.slice(1)).slice(0, dif >= 3 ? 4 : 3)
  const pasos = [PRIMITIVAS[0], ...extras]
  const render = (lista) => svgDoc(80, 80, `<rect x="0" y="0" width="80" height="80" fill="none"/>` + lista.map(p => p.svg()).join(''), { ancho: 80, alto: 80 })
  const porId = Object.fromEntries(PRIMITIVAS.map(p => [p.id, p]))
  // Distractores: omitir un paso; reemplazar un paso por su "espejo"; agregar un paso que no se pidió.
  const sinUno = pasos.filter((_, i) => i !== r.int(1, pasos.length - 1))
  const cambiable = extras.find(p => ESPEJO[p.id] && porId[ESPEJO[p.id]] && !pasos.some(q => q.id === ESPEJO[p.id]))
  const conEspejo = cambiable ? pasos.map(p => (p.id === cambiable.id ? porId[ESPEJO[p.id]] : p)) : null
  const noPedida = PRIMITIVAS.find(p => !pasos.some(q => q.id === p.id) && (!cambiable || p.id !== ESPEJO[cambiable.id]))
  const conExtra = [...pasos, noPedida]
  const firma = (l) => l.map(p => p.id).sort().join('|')
  const candidatos = []
  const firmas = new Set([firma(pasos)])
  for (const c of [sinUno, conEspejo, conExtra, ...pasos.slice(1).map((_, i) => pasos.filter((_, j) => j !== i + 1))]) { if (c && !firmas.has(firma(c)) && candidatos.length < 3) { firmas.add(firma(c)); candidatos.push(c) } }
  if (candidatos.length < 3) return construccion(semilla + 557, dif)
  const opcionesBase = [{ lista: pasos, correcta: true, explicacion: 'Contiene exactamente los trazos de las instrucciones, en la posición indicada.' }, ...candidatos.slice(0, 3).map(l => ({ lista: l, correcta: false, explicacion: l.length < pasos.length ? 'Le falta uno de los trazos pedidos.' : l.length > pasos.length ? 'Tiene un trazo que las instrucciones no piden.' : 'Un trazo está en el lugar equivocado (por ejemplo, une los vértices contrarios o los lados contrarios).' }))]
  const opciones = opcionesBase.map(o => ({ svg: render(o.lista), correcta: o.correcta, explicacion: o.explicacion }))
  return {
    subhabilidad: 'construccion', enunciado: 'Sigue las instrucciones en orden:\n' + pasos.map((p, i) => `${i + 1}. ${p.texto}`).join('\n') + '\n\n¿Cuál figura resulta?',
    estimulo: null, opciones,
    explicacion: 'Dibuja paso a paso: ' + pasos.map(p => p.texto.replace(/\.$/, '').toLowerCase()).join('; ') + '. Luego compara con cada opción: descarta las que tengan un trazo de más, uno de menos o uno en el lugar equivocado.',
    verificar: () => opcionesBase.filter(o => firma(o.lista) === firma(pasos)).length === 1 && unicas(opciones),
  }
}

export const GENERADORES = { rotacion, simetria, secuencias, conteo_espacial, vistas, vista_flecha, solido_desde_vistas, desarrollo_cubo, superposicion, construccion }
