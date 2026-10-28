import { useEffect, useState } from 'react'
import { Timer, GraduationCap, Library, Lock, ChevronRight, BarChart3, Play, Map } from 'lucide-react'
import { ir } from '../../lib/nav'
import { Titulo } from '../ui'
import { estadoCamino } from '../../lib/camino'
import { modoCarreraActivo } from '../../lib/carreras'

// ─── Practicar: materias, pruebas, refuerzo, exámenes de admisión y biblioteca ─
export default function Practicar({ usuario }) {
  const [camino, setCamino] = useState(null)
  useEffect(() => { estadoCamino(usuario).then(setCamino) }, [usuario.id])
  const admisionLista = camino?.pasos.find(p => p.id === 'admision')?.desbloqueado
  const enModoCarrera = modoCarreraActivo(usuario)
  const Tarjeta = ({ icono: I, titulo, sub, onClick, bloqueado = false, nota = null }) => (
    <button disabled={bloqueado} onClick={onClick} className={`card w-full text-left flex items-center gap-3 ${bloqueado ? 'opacity-60' : 'hover:border-brand-blue'}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bloqueado ? 'bg-dark-900 text-gray-500' : 'bg-sky-50 text-brand-blue'}`}>{bloqueado ? <Lock size={20} /> : <I size={22} />}</span>
      <div className="min-w-0 flex-1"><p className="font-semibold text-brand-navy">{titulo}</p><p className="text-xs text-gray-400">{bloqueado ? nota : sub}</p></div>
      {!bloqueado && <ChevronRight size={18} className="text-gray-500 shrink-0" />}
    </button>
  )
  return (
    <div className="space-y-4">
      <Titulo sub="Todo parte de tu ruta: aquí está lo que la complementa">Practicar</Titulo>
      <button className="btn-primary w-full !py-3" onClick={() => ir('practica', enModoCarrera ? { n: 5, enfoque: 'carrera' } : { n: 5 })}><Play size={18} /> {enModoCarrera ? 'Práctica enfocada: 5 preguntas de tus prioridades' : 'Práctica rápida: 5 preguntas con explicación'}</button>
      <button className="card w-full text-left flex items-center gap-3 border-brand-blue hover:border-brand-blue" onClick={() => ir('ruta')}>
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-brand-green"><Map size={22} /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold text-brand-navy">Mi ruta de esta semana</p><p className="text-xs text-gray-400">La puerta principal: sesiones armadas con tu carrera, tus competencias flojas y tu tiempo.</p></div>
        <ChevronRight size={18} className="text-gray-500 shrink-0" />
      </button>
      <div className="space-y-2">
        <Tarjeta icono={Timer} titulo="Pruebas" sub="Diagnóstica, mini-pruebas y simulacros cronometrados por sesión" onClick={() => ir('simulacros')} />
        <Tarjeta icono={BarChart3} titulo="Refuerzo" sub="Lo que está flojo, explicado desde cero y con práctica guiada" onClick={() => ir('refuerzo')} />
        <Tarjeta icono={GraduationCap} titulo="Exámenes de admisión" sub="Universidad Nacional, Universidad de Antioquia y otras con prueba propia" onClick={() => ir('admision')} bloqueado={camino != null && !admisionLista} nota="Se desbloquea al terminar Mi ruta, en Mi camino." />
        <Tarjeta icono={Library} titulo="Biblioteca" sub="Lecciones y recursos conectados a cada competencia" onClick={() => ir('biblioteca')} />
      </div>
    </div>
  )
}
