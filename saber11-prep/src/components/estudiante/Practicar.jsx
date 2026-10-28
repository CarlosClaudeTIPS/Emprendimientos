import { useEffect, useState } from 'react'
import { LayoutGrid, Timer, GraduationCap, Library, Lock, ChevronRight, BarChart3, Play } from 'lucide-react'
import { ir } from '../../lib/nav'
import { Titulo } from '../ui'
import { estadoCamino } from '../../lib/camino'
import { MATERIAS, ICONO_PRUEBA } from '../Login'
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
      <Titulo sub="Todo lo que puedes hacer para prepararte, en un solo lugar">Practicar</Titulo>
      <button className="btn-primary w-full !py-3" onClick={() => ir('practica', enModoCarrera ? { n: 5, enfoque: 'carrera' } : { n: 5 })}><Play size={18} /> {enModoCarrera ? 'Práctica enfocada: 5 preguntas de tus prioridades' : 'Práctica rápida: 5 preguntas con explicación'}</button>
      <div>
        <p className="text-sm font-medium px-1 mb-2">Materias del Saber 11</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {MATERIAS.map(m => { const I = ICONO_PRUEBA[m.id]; return (
            <button key={m.id} onClick={() => ir('materia', { id: m.id })} className="card !p-3 flex flex-col items-center gap-1.5 hover:-translate-y-0.5 transition-transform">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.fondo, color: m.color }}><I size={20} /></span>
              <span className="text-[11px] font-medium text-center leading-tight text-brand-navy">{m.nombre.replace(' y Ciudadanas', '')}</span>
            </button>) })}
        </div>
      </div>
      <div className="space-y-2">
        <Tarjeta icono={Timer} titulo="Pruebas" sub="Diagnóstica, mini-pruebas y simulacros cronometrados por sesión" onClick={() => ir('simulacros')} />
        <Tarjeta icono={BarChart3} titulo="Refuerzo" sub="Lo que está flojo, explicado desde cero y con práctica guiada" onClick={() => ir('refuerzo')} />
        <Tarjeta icono={GraduationCap} titulo="Exámenes de admisión" sub="Universidad Nacional, Universidad de Antioquia y otras con prueba propia" onClick={() => ir('admision')} bloqueado={camino != null && !admisionLista} nota="Se desbloquea al terminar Mi ruta, en Mi camino." />
        <Tarjeta icono={LayoutGrid} titulo="Todas las materias" sub="Banco por materia, competencia y tema, con tu avance" onClick={() => ir('materias')} />
        <Tarjeta icono={Library} titulo="Biblioteca" sub="Lecciones y recursos conectados a cada competencia" onClick={() => ir('biblioteca')} />
      </div>
    </div>
  )
}
