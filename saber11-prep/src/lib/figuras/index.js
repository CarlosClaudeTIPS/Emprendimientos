import { GENERADORES } from './generadores.js'
import { rng } from './base.js'

// ─── Preguntas de análisis de la imagen generadas por código ─────────────────
// generarPregunta(subtipo, semilla, dificultad) devuelve una pregunta con el
// esquema del banco (content/ESQUEMA-PREGUNTA.md), en estado borrador, con la
// figura y las opciones en SVG y la explicación de cada opción. Se puede
// reproducir siempre con la misma semilla; `verificar()` comprueba la respuesta.

export const SUBTIPOS_GENERADOS = Object.keys(GENERADORES)
const TIPO_ERROR = { rotacion: 'interpretacion', simetria: 'interpretacion', secuencias: 'razonamiento', conteo_espacial: 'procedimiento', vistas: 'interpretacion', vista_flecha: 'interpretacion', solido_desde_vistas: 'razonamiento', desarrollo_cubo: 'razonamiento', superposicion: 'descuido', construccion: 'comprension' }
const TEMA = { rotacion: 'Rotación y reflejo de figuras', simetria: 'Simetría axial', secuencias: 'Series de figuras', conteo_espacial: 'Conteo de cubos', vistas: 'Vistas de un sólido', vista_flecha: 'Vista desde una dirección', solido_desde_vistas: 'Sólido a partir de sus vistas', desarrollo_cubo: 'Desarrollo del cubo', superposicion: 'Superposición de figuras', construccion: 'Construcción por instrucciones' }

export function generar(subtipo, semilla, dificultad = 2) {
  const g = GENERADORES[subtipo]
  if (!g) throw new Error(`Subtipo desconocido: ${subtipo}`)
  return g(semilla, dificultad)
}

export function generarPregunta(subtipo, semilla, dificultad = 2, { id = null, estado = 'borrador', semillaOrden = 0 } = {}) {
  const q = generar(subtipo, semilla, dificultad)
  const r = rng(semilla * 31 + 7 + semillaOrden * 101)
  // Orden de opciones aleatorio pero reproducible; la correcta puede caer en cualquier letra.
  const orden = r.shuffle(q.opciones.map((_, i) => i))
  const opciones = orden.map((i, k) => {
    const o = q.opciones[i]
    return { clave: 'ABCD'[k], texto: o.texto ?? `Figura ${'ABCD'[k]}`, ...(o.svg ? { svg: o.svg } : {}), correcta: Boolean(o.correcta), explicacion: o.explicacion, tipo_error: o.correcta ? null : TIPO_ERROR[subtipo], diagnostico: o.correcta ? null : 'probable', razon_frecuente: o.correcta ? null : null }
  })
  return {
    id: id ?? `UNAL-IMG-${subtipo.toUpperCase()}-${semilla}`, examen: 'unal', prueba: 'unal_imagen', origen: 'estilo',
    fuente: { nombre: 'Pregunta de práctica Nivytek (figura generada por código)', url: null, anio: 2026 },
    competencia: `unal_imagen.${subtipo}`, subhabilidad: subtipo, componente: null, afirmacion: null, evidencia: null, habilidad: 'representar',
    tema: TEMA[subtipo], subtema: null, dificultad, dificultad_examen: dificultad === 1 ? 2 : dificultad === 2 ? 3 : 4,
    contexto: null, estimulo: q.estimulo, tipo: null, enunciado: q.enunciado, opciones,
    explicacion: q.explicacion, que_identificar: 'La regla que relaciona la figura dada con las opciones (giro, reflejo, vista, pliegue o conteo).', que_revisar: 'Razonamiento espacial: compara celda por celda y descarta las opciones que rompen la regla.',
    refuerzo_ids: [], recurso_ids: [], tiempo_sugerido_seg: 105, etiquetas: ['examen:unal', 'generada_por_codigo', `semilla:${semilla}`], estado,
    generador: { subtipo, semilla, dificultad, version: 1 },
  }
}

// Comprueba con el generador que la respuesta marcada sigue siendo la correcta.
export function verificarPregunta(p) {
  const g = p.generador
  if (!g) return false
  const q = generar(g.subtipo, g.semilla, g.dificultad)
  if (!q.verificar()) return false
  const correctaGen = q.opciones.find(o => o.correcta)
  const correctaP = p.opciones.find(o => o.correcta)
  return Boolean(correctaP) && (correctaGen.svg ?? correctaGen.texto) === (correctaP.svg ?? correctaP.texto)
}
