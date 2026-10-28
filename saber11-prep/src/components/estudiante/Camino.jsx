import { useEffect, useState } from 'react'
import { Rocket, Compass, Map, GraduationCap, Lock, CheckCircle2, ChevronRight } from 'lucide-react'
import { ir } from '../../lib/nav'
import { Titulo } from '../ui'
import { estadoCamino } from '../../lib/camino'

const ICONO = { futuro: Rocket, carrera: Compass, ruta: Map, admision: GraduationCap }

// ─── Mi camino: Mi futuro → Mi carrera → Mi ruta → Exámenes de admisión ───────
// `bloqueo`: cuando el estudiante intentó abrir un paso que aún no está desbloqueado.
export default function Camino({ usuario, params = {}, bloqueo = null, inicial = false, cerrado = false }) {
  const [e, setE] = useState(null)
  useEffect(() => { estadoCamino(usuario).then(setE) }, [usuario.id, usuario.carreras_definidas, usuario.ruta_config])
  if (!e) return <p className="text-sm text-gray-400">Cargando…</p>
  return (
    <div className="space-y-4">
      {inicial ? (
        <div className="rounded-2xl p-5 bg-gradient-to-r from-brand-blue to-indigo-500 text-[#fff] shadow-lg shadow-sky-200">
          <p className="text-lg font-bold">Hola, {usuario.nombre.split(' ')[0]}. Empecemos por tu camino.</p>
          <p className="text-sm opacity-90 mt-1">Son cuatro pasos en orden: primero descubre qué te interesa, luego elige carrera, después arma tu ruta de estudio y, si aplica, la de examen de admisión.{cerrado ? ' La práctica y las pruebas se abren cuando termines el cuestionario de Mi futuro (unos 10 minutos).' : ''}</p>
        </div>
      ) : <Titulo sub="Cuatro pasos en orden: cada uno se desbloquea al terminar el anterior">Mi camino</Titulo>}
      {bloqueo && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3 flex gap-2"><Lock size={16} className="shrink-0 mt-0.5" /><span><b>{bloqueo.paso.nombre}</b> se desbloquea cuando termines <b>{bloqueo.previo.nombre}</b>. Hazlo primero y vuelve aquí.</span></div>
      )}
      <div className="space-y-2">
        {e.pasos.map((p, i) => {
          const I = ICONO[p.id]
          const estado = p.hecho ? 'hecho' : p.desbloqueado ? 'activo' : 'bloqueado'
          return (
            <button key={p.id} disabled={estado === 'bloqueado'} onClick={() => ir(p.ruta)} className={`card w-full text-left flex items-center gap-3 ${estado === 'activo' ? 'border-brand-blue' : ''} ${estado === 'bloqueado' ? 'opacity-60' : 'hover:border-brand-blue'}`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${estado === 'hecho' ? 'bg-emerald-50 text-brand-green' : estado === 'activo' ? 'bg-sky-50 text-brand-blue' : 'bg-dark-900 text-gray-500'}`}>{estado === 'hecho' ? <CheckCircle2 size={22} /> : estado === 'bloqueado' ? <Lock size={20} /> : <I size={22} />}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-navy">{i + 1}. {p.nombre} {estado === 'hecho' && <span className="text-xs font-normal text-brand-green">· listo</span>}</p>
                <p className="text-xs text-gray-400">{estado === 'bloqueado' ? `Se desbloquea al terminar ${e.pasos[i - 1].nombre}.` : p.descripcion}</p>
              </div>
              {estado !== 'bloqueado' && <ChevronRight size={18} className="text-gray-500 shrink-0" />}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500">{e.completos} de {e.pasos.length} pasos listos. Cada paso se puede volver a abrir para cambiarlo.</p>
      {cerrado && <button className="btn-primary w-full" onClick={() => ir('futuro')}>Empezar el cuestionario de Mi futuro</button>}
    </div>
  )
}
