import { db, uuid, ahora, getConfig } from './db'
import { elegirPreguntas, listarPreguntas, mezclar } from './banco'
import { preguntasVistas, intentosDe } from './datos'
import { leerRutaConfig, guardarRutaConfig } from './ruta'
import { EXAMENES, LISTA_EXAMENES, OTRAS_INSTITUCIONES, examenPorId, puntajeEstimado, proximaConvocatoria, tiempoBloqueSeg, segundosPorPregunta, idCompetencia, REPARTO_POR_DEFECTO } from './examenes-config'

export { EXAMENES, LISTA_EXAMENES, OTRAS_INSTITUCIONES, examenPorId, puntajeEstimado, proximaConvocatoria, REPARTO_POR_DEFECTO }

// ─── Rutas de examen de admisión activas (viven en ruta_config.admision) ──────
export async function rutasAdmision(usuario) {
  const cfg = await leerRutaConfig(usuario)
  return cfg.admision ?? { rutas: {}, reparto: { ...REPARTO_POR_DEFECTO } }
}
export const rutaActiva = (admision, examenId) => Boolean(admision?.rutas?.[examenId]?.activa)
export const rutasActivasIds = (admision) => LISTA_EXAMENES.filter(e => rutaActiva(admision, e.id)).map(e => e.id)

export async function activarRuta(usuario, examenId, cambios = { activa: true }) {
  const cfg = await leerRutaConfig(usuario)
  const admision = cfg.admision ?? { rutas: {}, reparto: { ...REPARTO_POR_DEFECTO } }
  const actual = admision.rutas[examenId] ?? {}
  admision.rutas = { ...admision.rutas, [examenId]: { ...actual, ...cambios, desde: actual.desde ?? ahora() } }
  return guardarRutaConfig(usuario, { ...cfg, admision })
}

// ─── Ficha de la guía (fechas, costo, enlaces) ───────────────────────────────
const archivosGuia = import.meta.glob('../../content/guia/universidades-*.json', { import: 'default' })
export async function fichaGuia(examen) {
  const e = typeof examen === 'string' ? examenPorId(examen) : examen
  if (!e?.guia_id) return null
  for (const cargar of Object.values(archivosGuia)) {
    const lista = await cargar()
    const f = (Array.isArray(lista) ? lista : []).find(u => u.id === e.guia_id)
    if (f) return f
  }
  return null
}

// ─── Disponibilidad del banco por componente y subhabilidad ──────────────────
export async function disponibilidad(examenId, usuario = null) {
  const e = examenPorId(examenId)
  const aprobadas = await listarPreguntas({ examen: examenId, usuario })
  const porComp = {}, porSub = {}
  for (const p of aprobadas) { porComp[p.prueba] = (porComp[p.prueba] ?? 0) + 1; porSub[p.competencia] = (porSub[p.competencia] ?? 0) + 1 }
  return { total: aprobadas.length, porComponente: porComp, porSubhabilidad: porSub, componentes: e.componentes.map(c => ({ ...c, disponibles: porComp[c.id] ?? 0 })) }
}

// ─── Sesiones del examen (usan el mismo motor: db.sesiones + SesionPrueba) ────
async function elegirDeComponente({ examen, comp, n, vistas, usuario, repartirSubhabilidades = false }) {
  if (!repartirSubhabilidades) return elegirPreguntas({ n, vistas, usuario, prueba: comp.id })
  // Diagnóstico: una por subhabilidad primero (en orden aleatorio), luego completar.
  const todas = mezclar(await listarPreguntas({ prueba: comp.id, usuario }))
  const porSub = {}
  for (const p of todas) (porSub[p.competencia] ??= []).push(p)
  const subs = mezclar(Object.values(porSub).map(l => [...l.filter(p => !vistas.has(p.id)), ...l.filter(p => vistas.has(p.id))]))
  const elegidas = []
  let ronda = 0
  while (elegidas.length < n && subs.some(l => l.length > ronda)) {
    for (const l of subs) if (l[ronda] && elegidas.length < n) elegidas.push(l[ronda])
    ronda++
  }
  return elegidas
}

// modo: 'diagnostico' (corto, por componente y subhabilidad) · 'completo' (proporción oficial) · 'bloque' (un componente)
export async function crearSesionExamen({ estudiante, examen: examenId, modo = 'completo', componente = null, escala = 1, asignacion_id = null }) {
  const e = examenPorId(examenId)
  if (!e) throw new Error('Examen desconocido')
  const vistas = await preguntasVistas(estudiante.id)
  const bloques = [], faltantes = []
  const comps = modo === 'bloque' ? e.componentes.filter(c => c.id === componente) : e.componentes
  if (!comps.length) throw new Error('Componente desconocido')
  for (const c of comps) {
    const objetivo = modo === 'diagnostico' ? (e.diagnostico?.por_componente ?? 6) : Math.max(1, Math.round(c.preguntas * escala))
    const elegidas = await elegirDeComponente({ examen: e, comp: c, n: objetivo, vistas, usuario: estudiante, repartirSubhabilidades: modo === 'diagnostico' })
    if (elegidas.length < objetivo) faltantes.push({ prueba: c.id, nombre: c.nombre, objetivo, disponibles: elegidas.length })
    bloques.push({ prueba: c.id, ids: elegidas.map(p => p.id) })
  }
  const total = bloques.reduce((a, b) => a + b.ids.length, 0)
  if (!total) throw new Error('Todavía no hay preguntas aprobadas para esta ruta. Pídele a tu docente que revise el banco.')
  const tiempo_seg = tiempoBloqueSeg(e, total)
  const titulo = modo === 'diagnostico' ? (e.diagnostico?.titulo ?? `Diagnóstico ${e.corto}`) : modo === 'bloque' ? `${comps[0].nombre} · ${e.corto}` : `Simulacro completo · ${e.corto}`
  const s = {
    id: uuid(), estudiante_id: estudiante.id, tipo: modo === 'diagnostico' ? 'mini' : 'simulacro', titulo,
    config: { examen: e.id, modo, cantidad: total, tiempo_seg, bloques, faltantes, escala, diagnostico_examen: modo === 'diagnostico' ? e.id : null, pausable: true, pausas: [], tiempo_real_min: e.duracion_min, seg_por_pregunta: segundosPorPregunta(e) },
    pregunta_ids: bloques.flatMap(b => b.ids), respuestas: {}, tiempos: {}, indice: 0,
    estado: 'en_curso', fecha_inicio: ahora(), fecha_fin: null, asignacion_id, sincronizado: 0,
  }
  await db.sesiones.add(s)
  return s
}

export async function sesionesExamen(estudiante_id, examenId) {
  const ss = await db.sesiones.where('estudiante_id').equals(estudiante_id).toArray()
  return ss.filter(s => s.config?.examen === examenId).sort((a, b) => (a.fecha_inicio < b.fecha_inicio ? 1 : -1))
}
export const diagnosticoExamen = async (estudiante_id, examenId) => (await sesionesExamen(estudiante_id, examenId)).find(s => s.config?.modo === 'diagnostico') ?? null

// ─── Pausas (simulacro con pausas) ───────────────────────────────────────────
export async function pausarSesion(id) {
  const s = await db.sesiones.get(id)
  if (!s || s.estado !== 'en_curso' || !s.config?.pausable) return s
  const pausas = [...(s.config.pausas ?? [])]
  if (pausas.length && !pausas[pausas.length - 1].fin) return s
  pausas.push({ inicio: ahora(), fin: null })
  const nuevo = { ...s, config: { ...s.config, pausas } }
  await db.sesiones.put(nuevo)
  return nuevo
}
export async function reanudarSesion(id) {
  const s = await db.sesiones.get(id)
  if (!s) return s
  const pausas = [...(s.config?.pausas ?? [])]
  const ultima = pausas[pausas.length - 1]
  if (!ultima || ultima.fin) return s
  pausas[pausas.length - 1] = { ...ultima, fin: ahora() }
  const nuevo = { ...s, config: { ...s.config, pausas } }
  await db.sesiones.put(nuevo)
  return nuevo
}
export const enPausa = (s) => { const p = s?.config?.pausas ?? []; return p.length > 0 && !p[p.length - 1].fin }
// Segundos transcurridos descontando las pausas.
export function transcurridoSeg(s, ahoraMs = Date.now()) {
  let pausado = 0
  for (const p of s.config?.pausas ?? []) pausado += ((p.fin ? new Date(p.fin).getTime() : ahoraMs) - new Date(p.inicio).getTime()) / 1000
  return Math.max(0, (ahoraMs - new Date(s.fecha_inicio).getTime()) / 1000 - pausado)
}
export const conPausas = (s) => (s?.config?.pausas ?? []).length > 0

// ─── Resultados y recomendaciones de una ruta ────────────────────────────────
export async function resultadosRuta(usuario, examenId) {
  const e = examenPorId(examenId)
  const intentos = (await intentosDe(usuario.id, { examen: examenId })).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const recientes = intentos.slice(-240)
  const estimado = puntajeEstimado(e, recientes)
  // Por subhabilidad (competencia)
  const porSub = {}
  for (const i of recientes) { const x = (porSub[i.competencia] ??= { id: i.competencia, prueba: i.prueba, n: 0, aciertos: 0, tiempo: 0 }); x.n++; if (i.correcta) x.aciertos++; x.tiempo += i.tiempo_seg ?? 0 }
  const subhabilidades = Object.values(porSub).map(x => ({ ...x, precision: Math.round(x.aciertos / x.n * 100), seg_por_pregunta: x.n ? Math.round(x.tiempo / x.n) : null }))
  // Ritmo
  const conTiempo = recientes.filter(i => i.tiempo_seg > 0)
  const ritmo = conTiempo.length ? Math.round(conTiempo.reduce((a, i) => a + i.tiempo_seg, 0) / conTiempo.length) : null
  // Evolución por simulacro
  const sesiones = (await sesionesExamen(usuario.id, examenId)).filter(s => s.estado === 'terminada')
  const evolucion = []
  for (const s of sesiones.slice().reverse()) {
    const its = intentos.filter(i => i.sesion_id === s.id)
    if (!its.length) continue
    evolucion.push({ id: s.id, fecha: s.fecha_fin ?? s.fecha_inicio, titulo: s.titulo, modo: s.config.modo, con_pausas: conPausas(s), ...puntajeEstimado(e, its) })
  }
  // Recomendación: dos componentes y tres subhabilidades donde más puede subir
  const comps = estimado.componentes.filter(c => c.n > 0).sort((a, b) => a.theta - b.theta).slice(0, 2)
  const subs = subhabilidades.filter(s => s.n >= 3).sort((a, b) => a.precision - b.precision).slice(0, 3)
  return { examen: e, intentos: recientes.length, estimado, subhabilidades, ritmo, objetivo_seg: segundosPorPregunta(e), evolucion, recomendacion: { componentes: comps, subhabilidades: subs } }
}

export const nombreSubhabilidad = (competenciaId) => {
  const [comp, sub] = String(competenciaId ?? '').split('.')
  const c = LISTA_EXAMENES.flatMap(e => e.componentes).find(x => x.id === comp)
  return c?.subhabilidades.find(s => s.id === sub)?.nombre ?? competenciaId
}
export { idCompetencia }
