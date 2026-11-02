import { registerSW } from 'virtual:pwa-register'

// PWA: la app se instala en el celular y el "cascarón" queda en caché para practicar
// sin conexión. El service worker se registra solo cuando hay una sesión (estudiante,
// docente o admin): quien solo mira la portada pública no descarga toda la app.
let registrado = false
export function registrarPWA() {
  if (registrado || !('serviceWorker' in navigator)) return
  registrado = true
  // Cuando una versión nueva toma el control, se recarga una vez para no seguir con la vieja.
  if (navigator.serviceWorker.controller) {
    let recargado = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; window.location.reload() } })
  }
  // Además de la comprobación del navegador al abrir, se busca versión nueva al volver a la
  // pestaña y cada 30 minutos, para que una app que se dejó abierta no se quede días atrás.
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const buscar = () => { if (navigator.onLine) reg.update().catch(() => {}) }
      setInterval(buscar, 30 * 60 * 1000)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscar() })
    },
  })
}
