import unal from '../../content/examenes/unal.json'
import udea from '../../content/examenes/udea.json'
import otras from '../../content/examenes/otras.json'

// ─── Exámenes de admisión propios ─────────────────────────────────────────────
// Cada examen se describe en content/examenes/<id>.json: componentes (que en la
// app funcionan como "pruebas"), subhabilidades (que funcionan como
// "competencias" con id `<componente>.<subhabilidad>`), tiempos y escala.
// El motor de práctica, el diagnóstico, el repaso de errores y los reportes
// leen esa configuración. Las preguntas del Saber 11 no llevan `examen`.

export const EXAMENES = { unal, udea }
export const LISTA_EXAMENES = [unal, udea]
export const OTRAS_INSTITUCIONES = otras
export const ICFES = 'icfes'

export const examenPorId = (id) => EXAMENES[id] ?? null

// A qué examen pertenece una prueba/componente ('icfes' para las cinco del Saber 11).
export function examenDePrueba(prueba) {
  if (!prueba) return ICFES
  for (const e of LISTA_EXAMENES) if (prueba.startsWith(e.id + '_')) return e.id
  return ICFES
}
export const examenDePregunta = (p) => p?.examen ?? examenDePrueba(p?.prueba)
export const examenDeIntento = (i) => examenDePrueba(i?.prueba)

export const componentesDe = (examenId) => examenPorId(examenId)?.componentes ?? []
export const componentePorId = (id) => LISTA_EXAMENES.flatMap(e => e.componentes).find(c => c.id === id) ?? null
export const idCompetencia = (componenteId, subhabilidad) => `${componenteId}.${subhabilidad}`
export function subhabilidadDe(competenciaId) {
  const [comp, sub] = String(competenciaId ?? '').split('.')
  const c = componentePorId(comp)
  return c?.subhabilidades.find(s => s.id === sub) ?? null
}

// Pruebas y competencias que se agregan a la taxonomía para que nombres,
// resúmenes y filtros funcionen igual que con el Saber 11.
export function extensionTaxonomia() {
  const pruebas = [], competencias = []
  for (const e of LISTA_EXAMENES) {
    for (const c of e.componentes) {
      pruebas.push({ id: c.id, nombre: c.nombre, color: c.color, examen: e.id, preguntas: c.preguntas })
      for (const s of c.subhabilidades) competencias.push({ id: idCompetencia(c.id, s.id), prueba: c.id, nombre: s.nombre, examen: e.id, subhabilidad: s.id, espacial: Boolean(s.espacial) })
    }
  }
  return { pruebas, competencias }
}

// Tiempo por pregunta y total de un examen (o de un bloque de n preguntas).
export const segundosPorPregunta = (e) => Math.round((e.min_por_pregunta ?? e.duracion_min / e.total_preguntas) * 60)
export const tiempoBloqueSeg = (e, n) => segundosPorPregunta(e) * n

// ─── Puntaje estimado Nivytek (modelo de Rasch con prior) ─────────────────────
// Cada pregunta tiene una dificultad `b` en logits. Por defecto sale de la
// dificultad asignada por el docente (1–5 → -1,6 … +1,6). Si se pasa un mapa
// `dificultadEmpirica` (calculado con ≥ 30 respuestas por pregunta), se usa.
// La habilidad θ se estima por máxima verosimilitud con un prior N(0, 1), para
// que con pocas preguntas (o 0 % / 100 % de aciertos) no se dispare.
export const dificultadLogit = (d) => ((Number(d) || 3) - 3) * 0.8
export const dificultadEmpiricaDesdeProporcion = (pAcierto) => { const p = Math.min(0.97, Math.max(0.03, pAcierto)); return Math.log((1 - p) / p) }

export function estimarHabilidad(respuestas, { dificultadEmpirica = null } = {}) {
  // respuestas: [{ correcta: bool, dificultad: 1-5 (o null), pregunta_id }]
  const items = respuestas.map(r => ({ y: r.correcta ? 1 : 0, b: dificultadEmpirica?.[r.pregunta_id] ?? dificultadLogit(r.dificultad_examen ?? r.dificultad) }))
  if (!items.length) return { theta: 0, n: 0, aciertos: 0, error_estandar: null }
  let theta = 0
  for (let it = 0; it < 25; it++) {
    let g = -theta, h = -1 // gradiente y hessiano del prior N(0,1)
    for (const { y, b } of items) { const p = 1 / (1 + Math.exp(-(theta - b))); g += y - p; h -= p * (1 - p) }
    const paso = g / h
    theta -= paso
    if (Math.abs(paso) < 1e-5) break
  }
  let info = 1
  for (const { b } of items) { const p = 1 / (1 + Math.exp(-(theta - b))); info += p * (1 - p) }
  return { theta, n: items.length, aciertos: items.filter(i => i.y).length, error_estandar: 1 / Math.sqrt(info) }
}

// Puntaje estimado por componente y total según la escala del examen.
export function puntajeEstimado(examen, intentos, { dificultadEmpirica = null } = {}) {
  const e = typeof examen === 'string' ? examenPorId(examen) : examen
  if (!e) return null
  const comps = e.componentes.map(c => {
    const propios = intentos.filter(i => i.prueba === c.id)
    const est = estimarHabilidad(propios, { dificultadEmpirica })
    const escala = e.puntaje.componente
    return { id: c.id, nombre: c.nombre, n: est.n, aciertos: est.aciertos, precision: est.n ? Math.round(est.aciertos / est.n * 100) : null, theta: est.theta, error_estandar: est.error_estandar,
      puntaje: escala && est.n ? Math.round((escala.media + escala.desviacion * est.theta) * 10) / 10 : null }
  })
  const conDatos = comps.filter(c => c.n > 0)
  const thetaMedia = conDatos.length ? conDatos.reduce((a, c) => a + c.theta, 0) / conDatos.length : null
  const t = e.puntaje.total
  let total = null
  if (thetaMedia != null && t) {
    total = Math.round(t.media + t.desviacion * thetaMedia)
    if (t.min != null) total = Math.max(t.min, total)
    if (t.max != null) total = Math.min(t.max, total)
  }
  return { examen: e.id, componentes: comps, total, nota: e.puntaje.nota, n: intentos.length, componentes_sin_datos: comps.filter(c => !c.n).map(c => c.nombre) }
}

// ─── Reparto semanal entre la ruta Saber 11 y una ruta de examen propio ───────
// Según las semanas que falten para el examen propio: > 8 semanas 30 %; de 8 a 3
// semanas 50 %; menos de 3 semanas 80 %. Configurable por el docente.
export const REPARTO_POR_DEFECTO = { lejos: 30, medio: 50, cerca: 80 }
export function proporcionRutaPropia(diasRestantes, reparto = REPARTO_POR_DEFECTO) {
  const r = { ...REPARTO_POR_DEFECTO, ...(reparto ?? {}) }
  if (diasRestantes == null) return r.lejos / 100
  const semanas = diasRestantes / 7
  if (semanas > 8) return r.lejos / 100
  if (semanas >= 3) return r.medio / 100
  return r.cerca / 100
}

// ─── Fechas desde la guía (content/guia/universidades-*.json) ─────────────────
// La ficha de cada universidad puede traer `convocatorias`: [{ nombre, inscripcion: [desde, hasta],
// prueba, resultados, fuente }]. Devuelve la próxima prueba (o null si no está publicada).
export function proximaConvocatoria(ficha, hoy = new Date()) {
  const lista = ficha?.convocatorias ?? []
  const h = new Date(new Date(hoy).setHours(0, 0, 0, 0))
  const conFecha = lista.filter(c => c.prueba).map(c => ({ ...c, fecha: new Date(c.prueba + 'T00:00:00') }))
  const futuras = conFecha.filter(c => c.fecha >= h).sort((a, b) => a.fecha - b.fecha)
  if (!futuras.length) return null
  const c = futuras[0]
  return { ...c, dias_restantes: Math.round((c.fecha - h) / 86400000) }
}
export function ultimaConvocatoria(ficha, hoy = new Date()) {
  const lista = (ficha?.convocatorias ?? []).filter(c => c.prueba).map(c => ({ ...c, fecha: new Date(c.prueba + 'T00:00:00') }))
  const h = new Date(new Date(hoy).setHours(0, 0, 0, 0))
  return lista.filter(c => c.fecha < h).sort((a, b) => b.fecha - a.fecha)[0] ?? null
}
