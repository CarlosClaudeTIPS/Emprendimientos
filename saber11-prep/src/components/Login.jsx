import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { entrarLocal, entrarNube, pedirRecuperacion, registrarEstudiante, baseUsuario, gruposAbiertos } from '../lib/sesion'
import { NUBE_DISPONIBLE } from '../lib/supabase'
import { USUARIOS_DEMO } from '../lib/demo'
import { mostrarPortada } from '../lib/portada'
// Compatibilidad: antes MATERIAS e ICONO_PRUEBA vivían aquí.
export { MATERIAS, ICONO_PRUEBA } from '../lib/materias'

// ─── Acceso (#/entrar) ───────────────────────────────────────────────────────
// La portada pública (qué es, qué incluye, cómo inscribirse, preguntas, WhatsApp)
// es HTML estático en index.html: la ven Google y las familias sin cargar la app.
// Esta pantalla solo entra, registra y recupera contraseñas.
export default function Login({ params }) {
  const [tipo, setTipo] = useState(params?.tipo === 'docente' ? 'docente' : 'estudiante')
  useEffect(() => { mostrarPortada(false); window.scrollTo(0, 0) }, [])

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-30 bg-dark-800/95 backdrop-blur border-b border-dark-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="#/" className="flex items-center gap-2 min-w-0" onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; mostrarPortada(true) }}>
            <img src="/icono.svg" alt="Logotipo de Nivytek · Saber 11" className="w-9 h-9" />
            <span className="text-base sm:text-lg md:text-xl font-bold text-brand-navy whitespace-nowrap">Nivytek<span className="text-brand-blue"> · Saber 11</span></span>
          </a>
          <a href="#/" className="btn-secondary !py-2 !px-4 text-sm" onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; mostrarPortada(true) }}>← Volver a la portada</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Entra a tu cuenta</h1>
          <p className="mt-3 text-gray-400">Los estudiantes entran con su usuario y su PIN. Los docentes, con su correo y su contraseña.</p>
          <ul className="mt-5 space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><Star size={16} className="text-brand-amber mt-0.5 shrink-0" /> Si aún no tienes cuenta, regístrate aquí mismo: tu docente debe aprobarla antes de que puedas empezar.</li>
            <li className="flex gap-2"><Star size={16} className="text-brand-amber mt-0.5 shrink-0" /> Si olvidaste tu usuario o tu PIN, pídele a tu docente que lo restablezca.</li>
            <li className="flex gap-2"><Star size={16} className="text-brand-amber mt-0.5 shrink-0" /> Tu progreso se guarda en tu cuenta: puedes practicar desde el celular y desde el computador.</li>
          </ul>
          <p className="mt-6 text-xs text-gray-500">¿Todavía no has hablado con nosotros? <a className="underline text-brand-blue" href="https://wa.me/573043134833?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20la%20preparaci%C3%B3n%20Saber%2011%20de%20Nivytek." target="_blank" rel="noopener">Escríbenos por WhatsApp</a> antes de registrarte.</p>
        </div>
        <FormularioAcceso tipo={tipo} setTipo={setTipo} />
      </main>

      <footer className="border-t border-dark-700 py-6 text-center text-xs text-gray-500">
        <a className="underline" href="privacidad.html">Política de privacidad</a> · Nivytek es un servicio independiente de preparación.
      </footer>
    </div>
  )
}

function FormularioAcceso({ tipo, setTipo }) {
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(false)
  const [registro, setRegistro] = useState(false)
  const [reg, setReg] = useState({ nombre: '', apellido: '', pin: '', pin2: '', grupo_solicitado: '', acudiente_nombre: '', autorizacion: false })
  const [gruposAb, setGruposAb] = useState([])
  useEffect(() => { if (registro) gruposAbiertos().then(setGruposAb).catch(() => setGruposAb([])) }, [registro])

  const registrar = async (e) => {
    e.preventDefault(); setError('')
    if (reg.pin !== reg.pin2) { setError('Los dos PIN no coinciden'); return }
    setCargando(true)
    try { await registrarEstudiante(reg); try { window.nivytekEvento?.('Lead', { content_name: 'registro_icfes' }) } catch {} } catch (err) { setError(err.message) }
    finally { setCargando(false) }
  }

  const entrar = async (e) => {
    e.preventDefault()
    setError('')
    if (!usuario.trim()) { setError('Escribe tu usuario'); return }
    setCargando(true)
    try {
      if (NUBE_DISPONIBLE) {
        if (tipo === 'docente') await entrarNube({ correo: usuario.trim(), contrasena: pin })
        else await entrarNube({ codigo: usuario.trim(), pin })
      } else {
        await entrarLocal(usuario, pin)
      }
    } catch (err) { setError(err.message) }
    finally { setCargando(false) }
  }

  return (
    <div className="card !p-6 max-w-md mx-auto w-full">
      <div className="flex rounded-xl bg-dark-900 p-1 mb-5 text-sm font-medium">
        {['estudiante', 'docente'].map(t => (
          <button key={t} type="button" onClick={() => setTipo(t)}
            className={`flex-1 rounded-lg py-2 ${tipo === t ? 'bg-brand-blue text-[#fff] shadow' : 'text-gray-400'}`}>
            {t === 'docente' ? 'Docente / Admin' : 'Estudiante'}
          </button>
        ))}
      </div>
      {tipo === 'estudiante' && registro ? (
        <form onSubmit={registrar} className="space-y-4">
          <p className="text-sm text-gray-400">Regístrate con tu primer nombre y tu primer apellido. Tu docente debe aceptar el registro antes de que puedas empezar.</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="reg-nombre">Primer nombre</label><input id="reg-nombre" className="input" value={reg.nombre} onChange={e => setReg({ ...reg, nombre: e.target.value })} autoComplete="given-name" /></div>
            <div><label className="label" htmlFor="reg-apellido">Primer apellido</label><input id="reg-apellido" className="input" value={reg.apellido} onChange={e => setReg({ ...reg, apellido: e.target.value })} autoComplete="family-name" /></div>
          </div>
          {baseUsuario(reg.nombre, reg.apellido).length >= 4 && <p className="text-xs text-gray-500">Tu usuario será <span className="font-mono font-semibold text-brand-blue">{baseUsuario(reg.nombre, reg.apellido)}</span> (si ya existe, se le agrega un número).</p>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="reg-pin">PIN (4 a 8 dígitos)</label><input id="reg-pin" className="input" type="password" inputMode="numeric" value={reg.pin} onChange={e => setReg({ ...reg, pin: e.target.value })} autoComplete="new-password" /></div>
            <div><label className="label" htmlFor="reg-pin2">Repite el PIN</label><input id="reg-pin2" className="input" type="password" inputMode="numeric" value={reg.pin2} onChange={e => setReg({ ...reg, pin2: e.target.value })} autoComplete="new-password" /></div>
          </div>
          {gruposAb.length > 0 && (
            <div>
              <label className="label" htmlFor="reg-grupo">¿A qué grupo quieres unirte?</label>
              <select id="reg-grupo" className="input" value={reg.grupo_solicitado} onChange={e => setReg({ ...reg, grupo_solicitado: e.target.value })}>
                <option value="">No sé / que lo decida el docente</option>
                {gruposAb.map(g => <option key={g.id} value={g.id}>{g.nombre}{g.colegio ? ` · ${g.colegio}` : ''}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Es una solicitud: el docente confirma el grupo al aceptarte.</p>
            </div>
          )}
          <div className="rounded-xl border border-dark-600 bg-dark-900 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Autorización del padre, madre o acudiente</p>
            <div><label className="label" htmlFor="reg-acudiente">Nombre de quien autoriza</label><input id="reg-acudiente" className="input" value={reg.acudiente_nombre} onChange={e => setReg({ ...reg, acudiente_nombre: e.target.value })} autoComplete="off" placeholder="Nombre completo del padre, madre o acudiente" /></div>
            <label className="flex items-start gap-2 text-xs text-gray-300">
              <input type="checkbox" className="mt-0.5" checked={reg.autorizacion} onChange={e => setReg({ ...reg, autorizacion: e.target.checked })} />
              <span>Como padre, madre o acudiente, autorizo el registro del estudiante y el tratamiento de sus datos (nombre, usuario y respuestas de práctica) para la preparación, según la <a className="underline text-brand-blue" href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> (Ley 1581 de 2012).</span>
            </label>
          </div>
          {error && <p className="text-sm text-brand-red" role="alert">{error}</p>}
          <button className="btn-primary w-full !py-3 text-base" disabled={cargando}>{cargando ? 'Registrando…' : 'Registrarme'}</button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => { setRegistro(false); setError('') }}>Ya tengo usuario, quiero entrar</button>
        </form>
      ) : (
      <form onSubmit={entrar} className="space-y-4">
        <div>
          <label className="label" htmlFor="acceso-usuario">{NUBE_DISPONIBLE && tipo === 'docente' ? 'Correo' : 'Usuario'}</label>
          <input id="acceso-usuario" className="input" value={usuario} onChange={e => setUsuario(e.target.value)} autoCapitalize="none" autoComplete="username"
            placeholder={tipo === 'docente' ? (NUBE_DISPONIBLE ? 'correo@colegio.edu.co' : 'docente') : 'tu.usuario'} />
        </div>
        <div>
          <label className="label" htmlFor="acceso-pin">{NUBE_DISPONIBLE && tipo === 'docente' ? 'Contraseña' : 'PIN'}</label>
          <input id="acceso-pin" className="input" type="password" inputMode={NUBE_DISPONIBLE && tipo === 'docente' ? 'text' : 'numeric'} value={pin} onChange={e => setPin(e.target.value)} autoComplete="current-password" placeholder="••••••" />
        </div>
        {error && <p className="text-sm text-brand-red" role="alert">{error}</p>}
        {aviso && <p className="text-sm text-brand-green" role="status">{aviso}</p>}
        <button className="btn-primary w-full !py-3 text-base" disabled={cargando}>{cargando ? 'Entrando…' : 'Iniciar sesión'}</button>
        {NUBE_DISPONIBLE && tipo === 'docente' && (
          <button type="button" className="btn-ghost w-full text-xs" onClick={async () => {
            setError(''); setAviso('')
            if (!/\S+@\S+\.\S+/.test(usuario)) { setError('Escribe tu correo para enviarte el enlace'); return }
            try { await pedirRecuperacion(usuario.trim()); setAviso('Te enviamos un enlace al correo para crear una contraseña nueva.') } catch (e) { setError(e.message) }
          }}>¿Olvidaste tu contraseña o aún no la tienes?</button>
        )}
        {tipo === 'estudiante' && <button type="button" className="btn-secondary w-full" onClick={() => { setRegistro(true); setError('') }}>No tengo usuario: registrarme</button>}
      </form>
      )}
      {!NUBE_DISPONIBLE && (
        <div className="mt-4 text-xs text-gray-500 leading-relaxed">
          <p className="mb-1"><span className="badge bg-dark-700 text-gray-300">Modo local</span> Los datos se guardan solo en este dispositivo.</p>
          <p>Usuarios de demostración (PIN 1234): {USUARIOS_DEMO.map(u => u.usuario).join(', ')}, est1 … est6.</p>
        </div>
      )}
      {NUBE_DISPONIBLE && tipo === 'estudiante' && (
        <p className="mt-4 text-xs text-gray-500">Si olvidaste tu usuario o tu PIN, pídele a tu docente que lo restablezca.</p>
      )}
    </div>
  )
}
