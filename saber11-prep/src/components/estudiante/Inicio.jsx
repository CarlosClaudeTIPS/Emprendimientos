import { useEffect, useState } from 'react'
import { Play, Timer, AlertCircle, BarChart3, Map, Library, ClipboardList, LayoutGrid } from 'lucide-react'
import { intentosDe, asignacionesPendientes, proximasClases } from '../../lib/datos'
import { describirTiempo } from '../../lib/tiempo'
import { formatoClase } from '../docente/Clases'
import { Video } from 'lucide-react'
import { cicloActivo, estadoCiclo, programa, formatoFecha } from '../../lib/ciclo'
import { recomendar, reglasVigentes } from '../../lib/reglas'
import { listarPreguntas } from '../../lib/banco'
import { resumen } from '../../lib/analitica'
import { ir } from '../../lib/nav'
import { Barra, Badge } from '../ui'
import { crearMiniPrueba, crearSimulacro, crearSimulacroCompleto, crearDiagnostico, diagnosticoDe, crearPruebaPorTiempo } from '../../lib/pruebas'
import { MATERIAS, ICONO_PRUEBA } from '../Login'
import { Stethoscope, Compass, FileBarChart, BookOpenCheck } from 'lucide-react'
import { modoCarreraActivo, prioridadesDeUsuario, carreraPorId, NOMBRE_NIVEL } from '../../lib/carreras'
import { VistaPrioridades } from './Carreras'
import { estadoLiberacion, grupoDe } from '../../lib/acceso'
import { Unlock, Rocket, GraduationCap } from 'lucide-react'
import RutaMejorar from './RutaMejorar'
import { estadoCamino } from '../../lib/camino'

export default function Inicio({ usuario }) {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    (async () => {
      const [intentos, ciclo, prog, preguntas, pendientes, diagnostico, grupo, todas] = await Promise.all([intentosDe(usuario.id), cicloActivo(), programa(), listarPreguntas({ usuario }), asignacionesPendientes(usuario), diagnosticoDe(usuario.id), grupoDe(usuario), listarPreguntas()])
      const preguntasPorId = Object.fromEntries(preguntas.map(p => [p.id, p]))
      setDatos({
        intentos, ciclo, estado: estadoCiclo(ciclo, prog), pendientes, clases: await proximasClases(usuario),
        resumen: resumen(intentos, preguntasPorId),
        recs: recomendar(intentos, { preguntasPorId, reglas: await reglasVigentes() }).slice(0, 2),
        totalBanco: preguntas.length, diagnostico, liberacion: estadoLiberacion(todas, grupo),
      })
    })()
  }, [usuario.id])

  if (!datos) return <p className="text-gray-400 text-sm">Cargando…</p>
  const { estado, ciclo, resumen: r, recs, pendientes, clases = [] } = datos
  const vistas = new Set(datos.intentos.map(i => i.pregunta_id)).size
  const progresoBanco = Math.round((vistas / Math.max(1, datos.totalBanco)) * 100)
  const errores = datos.intentos.filter(i => !i.correcta).length
  // Modo carrera: las materias se ordenan por lo que más pesa para las carreras elegidas.
  const enModoCarrera = modoCarreraActivo(usuario)
  const prioridades = prioridadesDeUsuario(usuario)
  const nivelDe = Object.fromEntries(prioridades.map(p => [p.prueba, p.nivel]))
  const materias = enModoCarrera ? prioridades.map(p => MATERIAS.find(m => m.id === p.prueba)).filter(Boolean) : MATERIAS

  const abrirAsignacion = async (a) => {
    try {
      const s = a.tipo === 'diagnostico' ? await crearDiagnostico({ estudiante: usuario, asignacion_id: a.id }) : a.tipo === 'tiempo' ? await crearPruebaPorTiempo({ estudiante: usuario, tiempo_min: a.config.tiempo_min, asignacion_id: a.id, titulo: a.titulo }) : a.tipo === 'simulacro'
        ? (a.config.sesion_examen === 'completo'
          ? await crearSimulacroCompleto({ estudiante: usuario, escala: a.config.escala, asignacion_id: a.id })
          : await crearSimulacro({ estudiante: usuario, ...a.config, asignacion_id: a.id, titulo: a.titulo }))
        : await crearMiniPrueba({ estudiante: usuario, ...a.config, asignacion_id: a.id, titulo: a.titulo })
      ir('sesion', { id: s.id })
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Hola, {usuario.nombre.split(' ')[0]} 👋</h1>
        {ciclo && estado && (
          <p className="text-sm text-gray-400 mt-1">
            {estado.estado === 'no_iniciado' && `El ciclo ${ciclo.nombre} empieza el ${formatoFecha(ciclo.fecha_inicio)}.`}
            {estado.estado === 'en_curso' && <>Semana {estado.semanaActual} de {estado.semanasTotales} · {estado.fase?.nombre} · faltan {estado.diasRestantes} días para el examen</>}
            {estado.estado === 'pausa' && <>{estado.pausaActual}: semana de pausa. Si quieres, practica corto (5 preguntas) para no perder el ritmo · faltan {estado.diasRestantes} días para el examen</>}
            {estado.estado === 'dia_examen' && '¡Hoy es el examen! Lee con calma y verifica cada respuesta.'}
            {estado.estado === 'terminado' && `El ciclo ${ciclo.nombre} ya terminó.`}
            {ciclo.fecha_provisional && <Badge tono="ambar">fecha provisional</Badge>}
          </p>
        )}
      </div>

      <AvisoCuestionario usuario={usuario} />
      <TarjetaDiagnostico diagnostico={datos.diagnostico} usuario={usuario} />
      <RutaMejorar usuario={usuario} modo="hoy" />

      {/* 3 columnas en celular (para que los nombres no se partan a la mitad), 5 en pantalla ancha */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {materias.map(m => { const I = ICONO_PRUEBA[m.id]; const nivel = nivelDe[m.id]; return (
          <button key={m.id} onClick={() => ir('materia', { id: m.id })} className={`card !p-3 flex flex-col items-center gap-1.5 hover:-translate-y-0.5 transition-transform ${enModoCarrera && nivel === 'alta' ? 'border-brand-blue' : ''}`}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.fondo, color: m.color }}><I size={20} /></span>
            <span className="text-[11px] font-medium text-center leading-tight text-brand-navy">{m.nombre.replace(' y Ciudadanas', '')}</span>
            {enModoCarrera && nivel !== 'base' && <span className={`text-[9px] font-semibold uppercase tracking-wide ${nivel === 'alta' ? 'text-brand-blue' : 'text-amber-600'}`}>{nivel === 'alta' ? 'prioridad' : 'media'}</span>}
          </button>) })}
      </div>

      <TarjetaCarrera usuario={usuario} prioridades={prioridades} activo={enModoCarrera} />
      {datos.liberacion && <TarjetaLiberacion e={datos.liberacion} />}

      <div className="card">
        <div className="flex justify-between text-sm mb-1">
          <span>Tu progreso en el banco</span><span className="text-gray-300">{progresoBanco}%</span>
        </div>
        <Barra valor={progresoBanco} />
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div><p className="text-xl font-medium">{r.total}</p><p className="text-xs text-gray-500">respuestas</p></div>
          <div><p className="text-xl font-medium">{r.precision ?? '—'}{r.precision != null && '%'}</p><p className="text-xs text-gray-500">aciertos</p></div>
          <div><p className="text-xl font-medium">{errores}</p><p className="text-xs text-gray-500">errores para revisar</p></div>
        </div>
      </div>

      {clases.length > 0 && (
        <div className="card border-emerald-400/40">
          <p className="text-sm font-medium flex items-center gap-2 mb-2"><Video size={16} className="text-emerald-500" /> Próxima clase</p>
          {clases.slice(0, 2).map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg bg-dark-900 border border-dark-600 p-3 mb-2">
              <div>
                <p className="text-sm font-medium">{c.titulo}</p>
                <p className="text-xs text-gray-400 capitalize">{formatoClase(c.fecha)} · {c.duracion_min} min</p>
                {c.nota && <p className="text-xs text-gray-500 mt-1">{c.nota}</p>}
              </div>
              {c.enlace ? <a className="btn-primary !py-1.5 text-xs shrink-0" href={c.enlace} target="_blank" rel="noopener"><Video size={14} /> Entrar a la clase</a> : <span className="text-xs text-gray-500 shrink-0">Enlace pendiente</span>}
            </div>
          ))}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="card border-brand-blue/40">
          <p className="text-sm font-medium flex items-center gap-2 mb-2"><ClipboardList size={16} /> Tu docente te asignó</p>
          <div className="space-y-2">
            {pendientes.map(a => (
              <button key={a.id} onClick={() => abrirAsignacion(a)} className="w-full text-left rounded-lg bg-dark-900 border border-dark-600 p-3 hover:border-gray-400">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-gray-400">{a.tipo === 'simulacro' ? 'Simulacro' : a.tipo === 'tiempo' ? `Prueba de ${describirTiempo(a.config.tiempo_min)} · las preguntas se ajustan al tiempo` : a.tipo === 'diagnostico' ? 'Prueba diagnóstica' : 'Mini-prueba'}{a.config?.cantidad ? ` · ${a.config.cantidad} preguntas` : ''}{a.config?.tiempo_min ? ` · ${a.config.tiempo_min} min` : ''}{a.fecha_limite ? ` · hasta ${formatoFecha(a.fecha_limite)}` : ''}</p>
                {a.nota && <p className="text-xs text-gray-500 mt-1">{a.nota}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Accion icono={Play} titulo={enModoCarrera ? 'Práctica enfocada' : 'Continuar práctica'} sub={enModoCarrera ? '5 preguntas, más de tus prioridades' : '5 preguntas con explicación'} onClick={() => ir('practica', enModoCarrera ? { n: 5, enfoque: 'carrera' } : { n: 5 })} destacada />
        <Accion icono={Timer} titulo="Mini-prueba" sub={`${estado?.fase?.mini_prueba?.cantidad ?? 10} preguntas · ${estado?.fase?.mini_prueba?.tiempo_min ?? 20} min`} onClick={async () => { const f = estado?.fase?.mini_prueba; const s = await crearMiniPrueba({ estudiante: usuario, cantidad: f?.cantidad ?? 10, tiempo_min: f?.tiempo_min ?? 20, titulo: 'Mini-prueba de la semana' }); ir('sesion', { id: s.id }) }} />
        <Accion icono={AlertCircle} titulo="Mis errores" sub={`${errores} para revisar`} onClick={() => ir('avance', { ver: 'errores' })} />
        <Accion icono={Compass} titulo="Mi camino" sub="futuro, carrera, ruta y admisión" onClick={() => ir('camino')} />
      </div>

      <div className="card">
        <p className="text-sm font-medium mb-2">Recomendado para ti</p>
        <div className="space-y-2">
          {recs.map((rec, i) => (
            <div key={i} className="rounded-lg bg-dark-900 p-3">
              <p className="text-sm font-medium">{rec.titulo}</p>
              <p className="text-xs text-gray-400 mt-0.5">{rec.dato}</p>
              <p className="text-xs text-gray-500 mt-0.5">{rec.nombre_practica}: {rec.descripcion_practica}</p>
              <button className="btn-secondary mt-2 !py-1.5 text-xs" onClick={() => lanzarAccion(rec.accion, usuario)}>Practicar</button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Las recomendaciones salen de reglas simples sobre tus últimos intentos, no de un modelo que adivina.</p>
      </div>

      <button className="btn-ghost w-full" onClick={() => ir('practicar')}><LayoutGrid size={16} /> Ver todo lo que puedes practicar</button>
    </div>
  )
}

export async function lanzarAccion(accion, usuario) {
  if (!accion) return
  if (accion.tipo === 'practica') return ir('practica', { ...accion.filtros, n: accion.n ?? 5, verificacion: accion.verificacion ? '1' : undefined })
  if (accion.tipo === 'ids') return ir('practica', { ids: accion.ids.join(',') })
  if (accion.tipo === 'examen') {
    if (accion.modo === 'practica') return ir('practica', { examen: accion.examen, prueba: accion.componente ?? undefined, n: accion.n ?? 5 })
    const { crearSesionExamen } = await import('../../lib/examenes')
    const s = await crearSesionExamen({ estudiante: usuario, examen: accion.examen, modo: accion.modo === 'bloque' ? 'bloque' : accion.modo === 'completo' ? 'completo' : 'diagnostico', componente: accion.componente ?? undefined })
    return ir('sesion', { id: s.id })
  }
  if (accion.tipo === 'errores') return accion.ids?.length ? ir('practica', { ids: accion.ids.join(','), modo: 'refuerzo' }) : ir('errores')
  if (accion.tipo === 'diagnostico') { const d = await diagnosticoDe(usuario.id); if (d?.estado === 'en_curso') return ir('sesion', { id: d.id }); const s = await crearDiagnostico({ estudiante: usuario }); return ir('sesion', { id: s.id }) }
  if (accion.tipo === 'simulacro') { const s = await crearSimulacro({ estudiante: usuario, sesion_examen: accion.sesion_examen ?? 1, escala: accion.escala ?? 0.25, titulo: 'Simulacro de mi ruta' }); return ir('sesion', { id: s.id }) }
  if (accion.tipo === 'mini') {
    const s = await crearMiniPrueba({ estudiante: usuario, cantidad: accion.config?.cantidad ?? 8, tiempo_min: accion.config?.cronometro ? Math.round((accion.config?.cantidad ?? 8) * 1.5) : accion.config?.tiempo_min ?? null, filtros: accion.config?.filtros ?? {}, titulo: 'Mini-prueba recomendada' })
    return ir('sesion', { id: s.id })
  }
}

function Accion({ icono: Icono, titulo, sub, onClick, destacada = false }) {
  return (
    <button onClick={onClick} className={`text-left rounded-xl border p-3 transition-colors ${destacada ? 'border-brand-blue bg-dark-800' : 'border-dark-700 bg-dark-800 hover:border-gray-500'}`}>
      <Icono size={20} className={destacada ? 'text-brand-blue' : 'text-gray-300'} />
      <p className="text-sm font-medium mt-2">{titulo}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </button>
  )
}

// Modo carrera: qué eligió y cómo se reparte la práctica. Si no eligió nada, invita a hacerlo.
function TarjetaCarrera({ usuario, prioridades, activo }) {
  const carreras = (usuario.carreras ?? []).map(carreraPorId).filter(Boolean)
  if (!carreras.length) {
    return (
      <button onClick={() => ir('carreras')} className="card w-full text-left flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-sky-50 text-brand-blue flex items-center justify-center shrink-0"><Compass size={22} /></span>
        <div className="flex-1"><p className="font-semibold text-brand-navy">¿Qué te gustaría estudiar?</p><p className="text-xs text-gray-400">Elige hasta 3 carreras y la app prioriza las materias que más pesan para ellas.</p></div>
      </button>
    )
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Compass size={18} className="text-brand-blue shrink-0" />
          <p className="font-semibold text-brand-navy truncate">Modo carrera {activo ? <Badge tono="azul">activo</Badge> : <Badge>apagado</Badge>}</p>
        </div>
        <button onClick={() => ir('carreras')} className="text-xs font-semibold text-brand-blue shrink-0">Cambiar</button>
      </div>
      <p className="text-xs text-gray-400 mt-1">{carreras.map(c => c.nombre).join(' · ')}</p>
      <div className="mt-3"><VistaPrioridades prioridades={prioridades} activo={activo} compacta /></div>
      <p className="text-[11px] text-gray-500 mt-2">{activo ? 'Practicas más de lo que más pesa para tus carreras, sin dejar ninguna materia: la meta sigue siendo subir las cinco.' : 'Con el modo apagado todas las materias pesan igual. Actívalo en "Cambiar".'}</p>
    </div>
  )
}

// Plan mensual: cuánto material tiene liberado el grupo y cuándo llega el siguiente lote.
function TarjetaLiberacion({ e }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Unlock size={22} /></span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-navy">Material liberado: {e.liberadas.size} preguntas{e.nuevas.size ? <Badge tono="ambar">{e.nuevas.size} nuevas este mes</Badge> : null}</p>
        <p className="text-xs text-gray-400">{e.proximo ? `El próximo lote (${e.lote} por asignatura) se libera el ${formatoFecha(e.proximo.toISOString())}.` : 'Ya tienes todo el banco disponible.'}</p>
      </div>
    </div>
  )
}

// Mientras no se termine el cuestionario de Mi futuro, la práctica está cerrada: se avisa aquí.
function AvisoCuestionario({ usuario }) {
  const [e, setE] = useState(null)
  useEffect(() => { if (!usuario.previsualizacion) estadoCamino(usuario).then(setE) }, [usuario.id])
  if (!e || e.hecho.futuro) return null
  return (
    <button onClick={() => ir('futuro')} className="w-full text-left rounded-2xl p-4 bg-gradient-to-r from-brand-blue to-indigo-500 text-[#fff] shadow-lg shadow-sky-200">
      <p className="font-bold flex items-center gap-2"><Compass size={20} /> Primer paso: el cuestionario de Mi futuro</p>
      <p className="text-sm opacity-90 mt-1">Unos 10 minutos. Sirve para que tengas una meta: con él eliges carrera, y con la carrera la app arma una ruta de estudio solo para ti. Por eso la práctica y las pruebas se abren después.</p>
      <span className="inline-block mt-3 bg-[#fff] text-brand-blue font-semibold rounded-xl px-4 py-2 text-sm">Empezar el cuestionario</span>
    </button>
  )
}

function TarjetaDiagnostico({ diagnostico, usuario }) {
  const empezar = async () => {
    try {
      if (diagnostico?.estado === 'en_curso') return ir('sesion', { id: diagnostico.id })
      const s = await crearDiagnostico({ estudiante: usuario })
      ir('sesion', { id: s.id })
    } catch (e) { alert('No se pudo iniciar la prueba: ' + e.message) }
  }
  if (diagnostico?.estado === 'terminada') {
    return (
      <div className="card w-full flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-sky-50 text-brand-blue flex items-center justify-center shrink-0"><Stethoscope size={22} /></span>
        <button onClick={() => ir('sesion', { id: diagnostico.id })} className="flex-1 text-left"><p className="font-semibold text-brand-navy">Prueba diagnóstica realizada</p><p className="text-xs text-gray-400">Resultado: {diagnostico.resultado?.precision ?? '—'}% de aciertos. Toca para ver el detalle; tu plan está en Refuerzo.</p></button>
        <button onClick={() => crearDiagnostico({ estudiante: usuario }).then(s => ir('sesion', { id: s.id }))} className="text-xs font-semibold text-brand-blue shrink-0">Repetir</button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-5 bg-gradient-to-r from-brand-blue to-indigo-500 text-[#fff] shadow-lg shadow-sky-200">
      <div className="flex items-start gap-3">
        <Stethoscope size={28} className="shrink-0" />
        <div>
          <p className="text-lg font-bold">Prueba diagnóstica</p>
          <p className="text-sm opacity-90">25 preguntas de las cinco materias · 40 minutos. Te dice dónde estás y qué practicar primero.</p>
        </div>
      </div>
      <button onClick={empezar} className="mt-4 w-full rounded-xl bg-[#fff] text-brand-blue font-semibold py-2.5">{diagnostico?.estado === 'en_curso' ? 'Continuar la prueba diagnóstica' : 'Empezar la prueba diagnóstica'}</button>
    </div>
  )
}
