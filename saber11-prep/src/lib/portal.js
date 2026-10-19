// ─── Portal: las secciones de Nivytek (hoy ICFES, Apoyo docente, Tienda) ───
// Esta app es la sección «ICFES». Desde su inicio se enlazan las otras dos.
//
// Dónde viven las otras secciones: en el repositorio Emprendimientos el portal
// (portada, Apoyo docente y Tienda) se arma en la raíz del sitio y esta app se
// publica en /icfes/ (ver build-sitio.mjs). VITE_PORTAL_URL permite apuntar a
// otro dominio cuando la app corre sola (npm run dev).
const PORTAL_URL = (import.meta.env.VITE_PORTAL_URL || '/').replace(/\/+$/, '')

export const MARCA = import.meta.env.VITE_PORTAL_MARCA || 'Nivytek'

export const SECCIONES = [
  { id: 'icfes', nombre: 'ICFES', carpeta: 'icfes/', color: '#2F4D8C', actual: true },
  { id: 'docentes', nombre: 'Apoyo docente', carpeta: 'docentes/', color: '#F4845F' },
  { id: 'tienda', nombre: 'Tienda', carpeta: 'tienda/', color: '#1E9E7A' },
]

function dentroDelPortal() {
  return typeof location !== 'undefined' && /\/icfes\//.test(location.pathname)
}

export function urlPortal() {
  if (dentroDelPortal()) return location.pathname.replace(/\/icfes\/.*$/, '/')
  return PORTAL_URL + '/'
}

export function urlSeccion(s) {
  if (s.actual) return null
  return urlPortal() + s.carpeta
}
