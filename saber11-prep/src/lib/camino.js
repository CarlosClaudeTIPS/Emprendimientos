import { leerFuturo } from './futuro'
import { leerRutaConfig } from './ruta'
import { rutasActivasIds } from './examenes'

// ─── Mi camino: cuatro pasos en orden, cada uno se desbloquea al terminar el anterior ──
//  1. Mi futuro (cuestionario de intereses)  →  2. Mi carrera  →  3. Mi ruta  →  4. Exámenes de admisión
export const PASOS = [
  { id: 'futuro', ruta: 'futuro', nombre: 'Mi futuro', corto: 'Mi futuro', descripcion: 'Responde el cuestionario de intereses y mira qué ocupaciones te quedan.' },
  { id: 'carrera', ruta: 'carreras', nombre: 'Mi carrera', corto: 'Mi carrera', descripcion: 'Elige hasta 3 carreras: la app prioriza las materias que más pesan para ellas.' },
  { id: 'ruta', ruta: 'ruta', nombre: 'Mi ruta', corto: 'Mi ruta', descripcion: 'Con tu tiempo y tu fecha de examen, la app te dice qué hacer cada semana.' },
  { id: 'admision', ruta: 'admision', nombre: 'Exámenes de admisión', corto: 'Admisión', descripcion: 'Si tu universidad admite con examen propio (Nacional, Antioquia), activa esa ruta además del Saber 11.' },
]
export const RUTAS_POR_PASO = { futuro: 'futuro', carreras: 'carrera', ruta: 'ruta', admision: 'admision' }

export async function estadoCamino(usuario) {
  const [futuro, cfg] = await Promise.all([leerFuturo(usuario), leerRutaConfig(usuario)])
  const hecho = {
    futuro: Boolean(futuro?.intereses?.terminado),
    carrera: Boolean(usuario.carreras_definidas),
    ruta: Boolean(cfg?.definida),
    admision: rutasActivasIds(cfg?.admision).length > 0,
  }
  const pasos = PASOS.map((p, i) => ({ ...p, hecho: hecho[p.id], desbloqueado: i === 0 || hecho[PASOS[i - 1].id] }))
  const actual = pasos.find(p => !p.hecho) ?? null
  return { pasos, hecho, actual, completos: pasos.filter(p => p.hecho).length }
}

// Mientras no se termine el cuestionario de Mi futuro (paso 1), la práctica y las pruebas quedan cerradas.
// El Inicio queda abierto (tiene información importante); lo que se cierra es la práctica y las pruebas.
export const RUTAS_CERRADAS_SIN_CUESTIONARIO = ['practicar', 'practica', 'sesion', 'simulacros', 'materias', 'materia', 'refuerzo', 'errores', 'avance', 'progreso', 'informe', 'historial', 'biblioteca']
export const cerradaSinCuestionario = (estado, ruta) => !estado.hecho.futuro && RUTAS_CERRADAS_SIN_CUESTIONARIO.includes(ruta ?? '')

// Qué paso exige una ruta de la app (null si no está en el camino).
export const pasoDeRuta = (ruta) => RUTAS_POR_PASO[ruta] ?? null
export function bloqueoDe(estado, ruta) {
  const id = pasoDeRuta(ruta)
  if (!id) return null
  const paso = estado.pasos.find(p => p.id === id)
  if (!paso || paso.desbloqueado) return null
  const previo = estado.pasos[estado.pasos.findIndex(p => p.id === id) - 1]
  return { paso, previo }
}
