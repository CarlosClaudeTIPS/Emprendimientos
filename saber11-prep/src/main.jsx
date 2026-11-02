import './index.css'

// Arranque en dos tiempos:
//  1. La portada pública es HTML estático (index.html). Quien solo la mira no descarga
//     la aplicación (React, Supabase, Dexie…): este archivo pesa poco y solo trae el CSS.
//  2. La app se descarga y arranca cuando hace falta: hay sesión en este navegador, la ruta
//     es #/entrar (botón «Ingresar») o se llegó por un enlace de correo (invitación, recuperación).
// El service worker (PWA) se registra desde App cuando hay sesión (src/lib/pwa.js).
let arrancada = false
function haySesion() {
  try {
    if (localStorage.getItem('nivytek_sesion') === '1') return true
    return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)) // sesión de Supabase ya guardada
  } catch { return false }
}
const necesitaApp = () => /^#\/entrar/.test(location.hash) || /type=(invite|recovery|magiclink)/.test(location.hash) || haySesion()
async function arrancar() {
  if (arrancada) return
  arrancada = true
  document.documentElement.classList.add('sin-portada')
  const [{ default: React }, { default: ReactDOM }, { default: App }] = await Promise.all([import('react'), import('react-dom/client'), import('./App')])
  // Sin JSX aquí a propósito: el JSX haría que React se descargue con la portada.
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(App)))
}
if (necesitaApp()) arrancar()
else window.addEventListener('hashchange', () => { if (necesitaApp()) arrancar() })
