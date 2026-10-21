// Importa preguntas de exámenes de admisión propios (formato corto) al esquema
// del banco (content/ESQUEMA-PREGUNTA.md). Todas quedan en estado "borrador".
// Uso: node scripts/importar-examen.mjs <archivo.json> [--salida content/banco]
//
// Formato corto esperado: { id, examen: 'unal'|'udea', componente (nombre),
// subhabilidad, dificultad 1-5, contexto, enunciado, figura (svg|null),
// opciones: [texto|svg ×4], correcta: índice, explicacion, fuente, estado }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const [entrada, ...resto] = process.argv.slice(2)
if (!entrada) { console.error('Uso: node scripts/importar-examen.mjs <archivo.json>'); process.exit(1) }
const salidaDir = resto.includes('--salida') ? resto[resto.indexOf('--salida') + 1] : join(raiz, 'content/banco')

const EXAMENES = Object.fromEntries(['unal', 'udea'].map(id => [id, JSON.parse(readFileSync(join(raiz, `content/examenes/${id}.json`), 'utf8'))]))
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const SINONIMOS_SUB = { sucesiones: 'variacional', geografia_colombia: 'geografia', filosofia: 'filosofia_logica', critico: 'critico_intertextual', logica: 'filosofia_logica' }
const HABILIDAD_POR_PRUEBA = { unal_matematicas: 'resolver', unal_ciencias: 'razonar', unal_sociales: 'comprender', unal_textual: 'interpretar', unal_imagen: 'representar', udea_lectora: 'interpretar', udea_logico: 'razonar' }
const dif3 = (d) => (d <= 2 ? 1 : d === 3 ? 2 : 3)
const esSvg = (t) => /^\s*<svg[\s>]/i.test(String(t ?? ''))

const lista = JSON.parse(readFileSync(entrada, 'utf8'))
const porExamen = {}
const errores = []
for (const q of lista) {
  const ex = EXAMENES[q.examen]
  if (!ex) { errores.push(`${q.id}: examen desconocido ${q.examen}`); continue }
  const comp = ex.componentes.find(c => norm(c.nombre) === norm(q.componente) || c.id === q.componente)
  if (!comp) { errores.push(`${q.id}: componente desconocido "${q.componente}"`); continue }
  // Sinónimos por componente: en razonamiento lógico (UdeA) las sucesiones son razonamiento abstracto.
  const subId = comp.id === 'udea_logico' && q.subhabilidad === 'sucesiones' ? 'razonamiento_abstracto' : (SINONIMOS_SUB[q.subhabilidad] ?? q.subhabilidad)
  const sub = comp.subhabilidades.find(s => s.id === subId)
  if (!sub) { errores.push(`${q.id}: subhabilidad desconocida "${q.subhabilidad}" en ${comp.nombre}`); continue }
  if (!Array.isArray(q.opciones) || q.opciones.length !== 4 || typeof q.correcta !== 'number') { errores.push(`${q.id}: opciones/correcta inválidas`); continue }
  const esDosAfirmaciones = /De las afirmaciones anteriores/i.test(q.enunciado ?? '')
  const id = String(q.id).toUpperCase()
  const p = {
    id, examen: ex.id, prueba: comp.id, origen: 'estilo',
    fuente: { nombre: 'Pregunta de práctica Nivytek (original, al estilo del examen)', url: null, anio: 2026 },
    competencia: `${comp.id}.${sub.id}`, subhabilidad: sub.id, componente: null,
    afirmacion: null, evidencia: null, habilidad: HABILIDAD_POR_PRUEBA[comp.id],
    tema: sub.nombre, subtema: null, dificultad: dif3(Number(q.dificultad) || 3), dificultad_examen: Number(q.dificultad) || 3,
    contexto: q.contexto || null,
    estimulo: q.figura ? { tipo: 'svg', svg: q.figura, alt: 'Figura de la pregunta' } : null,
    tipo: esDosAfirmaciones ? 'dos_afirmaciones' : null,
    enunciado: q.enunciado,
    opciones: q.opciones.map((o, i) => {
      const correcta = i === q.correcta
      const base = esSvg(o) ? { texto: `Figura ${'ABCD'[i]}`, svg: String(o) } : { texto: String(o) }
      return { clave: 'ABCD'[i], ...base, correcta, explicacion: correcta ? (q.explicacion ?? '') : '', tipo_error: correcta ? null : 'distractor', diagnostico: correcta ? null : 'insuficiente', razon_frecuente: null }
    }),
    explicacion: q.explicacion ?? '', que_identificar: null, que_revisar: null, refuerzo_ids: [], recurso_ids: [],
    tiempo_sugerido_seg: Math.round((ex.min_por_pregunta ?? 1.75) * 60), etiquetas: [`examen:${ex.id}`, 'revisar_distractores'], estado: 'borrador',
  }
  ;(porExamen[ex.id] ??= []).push(p)
}
if (errores.length) { console.error('Errores:\n' + errores.join('\n')); process.exit(1) }
mkdirSync(salidaDir, { recursive: true })
for (const [ex, ps] of Object.entries(porExamen)) {
  const archivo = join(salidaDir, `${ex}-importadas.json`)
  writeFileSync(archivo, JSON.stringify(ps, null, 2) + '\n')
  console.log(`${archivo}: ${ps.length} preguntas (borrador)`)
}
