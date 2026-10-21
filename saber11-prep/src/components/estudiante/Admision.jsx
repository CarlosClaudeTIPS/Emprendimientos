import { useEffect, useState } from 'react'
import { GraduationCap, Timer, Play, Layers, AlertCircle, ExternalLink, CalendarDays, Activity, ShieldAlert, CheckCircle2, Clock } from 'lucide-react'
import { ir } from '../../lib/nav'
import { Titulo, Badge, Metrica, FilaMetrica, formatoTiempo, fechaCorta, Vacio } from '../ui'
import { LISTA_EXAMENES, OTRAS_INSTITUCIONES, examenPorId, rutasAdmision, rutaActiva, activarRuta, fichaGuia, disponibilidad, crearSesionExamen, diagnosticoExamen, resultadosRuta, nombreSubhabilidad, proximaConvocatoria } from '../../lib/examenes'

// ─── Exámenes de admisión propios: lista de rutas y pantalla de cada ruta ─────
// Nivytek es un servicio independiente; el descargo va en cada ruta (regla 4).

export default function Admision({ usuario, params }) {
  if (params.examen && examenPorId(params.examen)) return <Ruta usuario={usuario} examen={examenPorId(params.examen)} params={params} />
  return <ListaRutas usuario={usuario} params={params} />
}

function ListaRutas({ usuario, params }) {
  const [adm, setAdm] = useState(null)
  const [otras, setOtras] = useState(params.ver === 'otras')
  useEffect(() => { rutasAdmision(usuario).then(setAdm) }, [usuario.id])
  const esEst = usuario.rol === 'estudiante'
  return (
    <div className="space-y-4">
      <Titulo volver sub="Universidades que no admiten con el puntaje del Saber 11, sino con un examen propio">Prepárate para un examen de admisión</Titulo>
      {LISTA_EXAMENES.map((e, i) => (
        <button key={e.id} onClick={() => ir('admision', { examen: e.id })} className={`card w-full text-left hover:border-brand-blue ${i === 0 ? 'border-brand-blue/60' : ''}`}>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-dark-900 text-brand-navy"><GraduationCap size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-navy flex flex-wrap items-center gap-2">Examen de admisión {e.corto}{i === 0 && <Badge tono="azul">prioridad</Badge>}{adm && rutaActiva(adm, e.id) && <Badge tono="verde">ruta activa</Badge>}</p>
              <p className="text-sm text-gray-400 mt-0.5">{e.descripcion}</p>
              <p className="text-xs text-gray-500 mt-1">{e.total_aproximado ? 'Aprox. ' : ''}{e.total_preguntas} preguntas · {formatoDuracion(e.duracion_min)}</p>
            </div>
          </div>
        </button>
      ))}
      <button className="card w-full text-left hover:border-brand-blue" onClick={() => setOtras(v => !v)}>
        <p className="font-semibold text-brand-navy">Otras universidades con examen o prueba propia</p>
        <p className="text-sm text-gray-400 mt-0.5">Solo información y enlaces. Verifica en la página oficial antes de inscribirte.</p>
      </button>
      {otras && (
        <div className="space-y-2">
          {OTRAS_INSTITUCIONES.map(o => (
            <div key={o.id} className="card">
              <p className="font-medium flex flex-wrap items-center gap-2">{o.nombre} <Badge tono="ambar">Verifica en la página oficial</Badge></p>
              <p className="text-sm text-gray-300 mt-1">{o.resumen}</p>
              <p className="text-xs text-gray-400 mt-1"><b>En Nivytek:</b> {o.recomendacion}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {o.url && <a className="btn-ghost !py-1 text-xs" href={o.url} target="_blank" rel="noopener">Página oficial <ExternalLink size={12} /></a>}
                {o.ruta_sugerida && esEst && <button className="btn-secondary !py-1 text-xs" onClick={() => ir('admision', { examen: o.ruta_sugerida })}>Practicar con la ruta {examenPorId(o.ruta_sugerida).corto}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-500">Nivytek es un servicio independiente de preparación. No tiene relación con ninguna universidad. El único mecanismo de ingreso es el desempeño en la prueba de admisión de cada una. Esta sección no promete cupos, puntajes ni resultados.</p>
    </div>
  )
}

const formatoDuracion = (min) => min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`
const fechaLarga = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function Ruta({ usuario, examen: e, params }) {
  const [adm, setAdm] = useState(null)
  const [ficha, setFicha] = useState(undefined)
  const [disp, setDisp] = useState(null)
  const [diag, setDiag] = useState(null)
  const [res, setRes] = useState(null)
  const [bloque, setBloque] = useState(e.componentes[0].id)
  const [ocupado, setOcupado] = useState(false)
  const [dipa, setDipa] = useState('')
  const esEst = usuario.rol === 'estudiante'

  const cargar = async () => {
    const [a, f, d, dg, r] = await Promise.all([rutasAdmision(usuario), fichaGuia(e), disponibilidad(e.id, esEst ? usuario : null), diagnosticoExamen(usuario.id, e.id), resultadosRuta(usuario, e.id)])
    setAdm(a); setFicha(f ?? null); setDisp(d); setDiag(dg); setRes(r)
  }
  useEffect(() => { cargar() }, [usuario.id, e.id])

  const activa = adm ? rutaActiva(adm, e.id) : false
  const ruta = adm?.rutas?.[e.id] ?? {}
  const alternar = async () => { const r = await activarRuta(usuario, e.id, { activa: !activa }); if (r.aviso) alert(r.aviso); cargar() }
  const marcarEspecial = async (v) => { await activarRuta(usuario, e.id, { activa, admision_especial: v }); cargar() }
  const lanzar = async (modo, extra = {}) => {
    if (ocupado) return
    setOcupado(true)
    try { const s = await crearSesionExamen({ estudiante: usuario, examen: e.id, modo, ...extra }); ir('sesion', { id: s.id }) }
    catch (err) { alert(err.message) } finally { setOcupado(false) }
  }
  const guardarDipa = async () => { const n = Number(dipa); if (!Number.isFinite(n) || n <= 0) return alert('Escribe el puntaje que te dio la demostración oficial'); await activarRuta(usuario, e.id, { activa, dipa: { puntaje: n, fecha: new Date().toISOString().slice(0, 10) } }); setDipa(''); cargar() }

  const prox = ficha ? proximaConvocatoria(ficha) : null
  const sinBanco = disp && disp.total === 0
  const puntaje = res?.estimado
  const seg = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

  return (
    <div className="space-y-4">
      <Titulo volver sub={e.nombre}>Examen de admisión {e.corto}</Titulo>

      <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3 flex gap-2"><ShieldAlert size={16} className="shrink-0 mt-0.5" /><span>{e.descargo} Esta ruta no promete cupos, puntajes ni resultados.</span></div>

      {esEst && (
        <div className="card flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{activa ? 'Ruta activa' : 'Ruta inactiva'}</p>
            <p className="text-xs text-gray-400">{activa ? 'Tu plan semanal reparte la práctica entre el Saber 11 y este examen según la fecha más cercana.' : 'Actívala para que tu plan semanal incluya práctica de este examen además del Saber 11.'}</p>
          </div>
          <button className={activa ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'} onClick={alternar}>{activa ? 'Desactivar' : 'Activar ruta'}</button>
        </div>
      )}

      {/* Estructura del examen */}
      <div className="card">
        <p className="font-medium mb-1">Cómo es el examen</p>
        <p className="text-sm text-gray-300">{e.formato} {e.total_aproximado ? 'Aprox. ' : ''}{e.total_preguntas} preguntas · {formatoDuracion(e.duracion_min)} ({e.min_por_pregunta} min por pregunta).{e.transversal ? ` ${e.transversal}` : ''}</p>
        <div className="mt-2 space-y-1">
          {e.componentes.map(c => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="font-medium">{c.nombre}</span>
              <span className="text-gray-400">· {c.preguntas} preguntas</span>
              {disp && <span className="text-xs text-gray-500 ml-auto">{disp.porComponente[c.id] ?? 0} en el banco</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{e.puntaje.modelo_oficial}</p>
        {e.nota_subhabilidades && <p className="text-xs text-gray-500 mt-1">{e.nota_subhabilidades}</p>}
        <p className="text-xs text-gray-400 mt-1"><b>Estrategia:</b> {e.estrategia}</p>
      </div>

      {/* Calendario desde la guía */}
      <div className="card">
        <p className="font-medium flex items-center gap-2 mb-1"><CalendarDays size={16} /> Fechas</p>
        {ficha === undefined && <p className="text-sm text-gray-400">Cargando…</p>}
        {ficha === null && <p className="text-sm text-gray-400">Por confirmar en la página oficial.</p>}
        {ficha && prox && (
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-dark-900 px-4 py-2 text-center"><p className="text-2xl font-bold text-brand-navy">{prox.dias_restantes}</p><p className="text-[11px] text-gray-500">días</p></div>
            <div className="text-sm"><p>Prueba de admisión {prox.nombre}: <b className="capitalize">{fechaLarga(prox.prueba)}</b>{prox.prueba_hasta ? ` y ${fechaLarga(prox.prueba_hasta)}` : ''}</p>{prox.inscripcion && <p className="text-xs text-gray-400">Inscripción: {fechaCorta(prox.inscripcion[0])} a {fechaCorta(prox.inscripcion[1])}{prox.resultados ? ` · Resultados: ${fechaCorta(prox.resultados)}` : ''}</p>}{prox.costo && <p className="text-xs text-gray-400">Costo de inscripción: {prox.costo}</p>}</div>
          </div>
        )}
        {ficha && !prox && (
          <div className="text-sm space-y-1">
            <p className="text-gray-300">La próxima convocatoria no está publicada. {ficha.convocatoria_siguiente ?? e.convocatoria_pendiente}</p>
            {ficha.convocatorias?.length > 0 && <p className="text-xs text-gray-500">Última convocatoria registrada: {ficha.convocatorias[ficha.convocatorias.length - 1].nombre}, prueba el {fechaCorta(ficha.convocatorias[ficha.convocatorias.length - 1].prueba)}{ficha.convocatorias[ficha.convocatorias.length - 1].costo ? ` · costo ${ficha.convocatorias[ficha.convocatorias.length - 1].costo}` : ''}.</p>}
          </div>
        )}
        {ficha?.calendario && <details className="mt-2 text-xs text-gray-400"><summary className="cursor-pointer text-brand-blue">Ver el calendario completo de la guía</summary><p className="mt-1">{ficha.calendario}</p></details>}
        <p className="text-[11px] text-gray-500 mt-2">Fechas tomadas de la guía de universidades de Nivytek (verificada {ficha?.verificado ?? '—'}). Confirma siempre en la página oficial.</p>
      </div>

      {/* Avisos */}
      {e.avisos.map(a => (
        <div key={a.id} className="card text-sm">
          <p className="flex gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5 text-brand-amber" /><span>{a.texto}</span></p>
          {a.pregunta && esEst && (
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-300 cursor-pointer"><input type="checkbox" checked={Boolean(ruta.admision_especial)} onChange={ev => marcarEspecial(ev.target.checked)} /> {a.pregunta}</label>
          )}
          {a.pregunta && ruta.admision_especial && <p className="text-xs text-brand-blue mt-1">Te recomendamos priorizar la ruta Saber 11 en Matemáticas, Lectura crítica, Sociales y ciudadanas y Ciencias naturales. <button className="underline" onClick={() => ir('ruta')}>Ver mi ruta</button></p>}
        </div>
      ))}

      {sinBanco && <Vacio>Todavía no hay preguntas aprobadas para esta ruta. Las preguntas se publican a medida que el docente las revisa y aprueba.</Vacio>}

      {/* Modos de práctica */}
      {esEst && (
        <div className="space-y-2">
          <p className="text-sm font-medium px-1">Practicar</p>
          <div className="card">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-sky-50 text-brand-blue flex items-center justify-center shrink-0"><Activity size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Diagnóstico {e.corto}</p>
                <p className="text-xs text-gray-400">{(e.diagnostico?.por_componente ?? 6) * e.componentes.length} preguntas ({e.diagnostico?.por_componente ?? 6} por componente, repartidas por subhabilidad) · {seg((e.diagnostico?.por_componente ?? 6) * e.componentes.length * Math.round(e.min_por_pregunta * 60))} min.</p>
                {diag && diag.estado === 'terminada' && <p className="text-xs text-gray-500 mt-1">Hecho el {fechaCorta(diag.fecha_fin)}: {diag.resultado?.precision ?? '—'} % de aciertos. <button className="underline text-brand-blue" onClick={() => ir('sesion', { id: diag.id })}>Ver resultados</button></p>}
              </div>
              <button className="btn-primary shrink-0 !py-2" disabled={ocupado || sinBanco} onClick={() => diag?.estado === 'en_curso' ? ir('sesion', { id: diag.id }) : lanzar('diagnostico')}>{diag?.estado === 'en_curso' ? 'Continuar' : diag ? 'Repetir' : 'Empezar'}</button>
            </div>
          </div>

          <div className="card">
            <p className="font-medium flex items-center gap-2"><Play size={16} /> Práctica por componente y subhabilidad</p>
            <p className="text-xs text-gray-400 mb-2">5 preguntas con explicación. Primero elige el componente; luego, si quieres, una subhabilidad.</p>
            <div className="space-y-2">
              {e.componentes.map(c => (
                <details key={c.id} className="rounded-lg bg-dark-900 border border-dark-700">
                  <summary className="cursor-pointer px-3 py-2 text-sm flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.nombre}<span className="text-xs text-gray-500 ml-auto">{disp?.porComponente[c.id] ?? 0}</span></summary>
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                    <button className="badge border border-brand-blue text-brand-blue px-3 py-1" disabled={!(disp?.porComponente[c.id])} onClick={() => ir('practica', { prueba: c.id, n: 5, examen: e.id })}>Todo el componente</button>
                    {c.subhabilidades.map(s => { const k = `${c.id}.${s.id}`; const n = disp?.porSubhabilidad[k] ?? 0; return <button key={s.id} className={`badge border px-3 py-1 ${n ? 'border-dark-600 text-gray-300 hover:border-brand-blue hover:text-brand-blue' : 'border-dark-700 text-gray-600'}`} disabled={!n} onClick={() => ir('practica', { prueba: c.id, competencia: k, n: 5, examen: e.id })}>{s.nombre}{n ? '' : ' · sin preguntas'}</button> })}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="card">
              <p className="font-medium flex items-center gap-2"><Timer size={16} /> Simulacro completo</p>
              <p className="text-xs text-gray-400 mt-1">{e.total_preguntas} preguntas en la proporción oficial, {formatoDuracion(e.duracion_min)}, con cronómetro y sin ver respuestas hasta el final. Puedes pausarlo; el resultado quedará marcado como «con pausas».</p>
              <button className="btn-primary w-full mt-3" disabled={ocupado || sinBanco} onClick={() => lanzar('completo')}>Empezar simulacro</button>
            </div>
            <div className="card">
              <p className="font-medium flex items-center gap-2"><Layers size={16} /> Simulacro por bloques</p>
              <p className="text-xs text-gray-400 mt-1">Un componente a la vez con su tiempo proporcional, para cuando tienes poco tiempo.</p>
              <select className="input mt-2" value={bloque} onChange={ev => setBloque(ev.target.value)}>{e.componentes.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.preguntas} preguntas · {seg(c.preguntas * Math.round(e.min_por_pregunta * 60))} min</option>)}</select>
              <button className="btn-secondary w-full mt-2" disabled={ocupado || !(disp?.porComponente[bloque])} onClick={() => lanzar('bloque', { componente: bloque })}>Empezar bloque</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="card">
              <p className="font-medium flex items-center gap-2"><Clock size={16} /> Entrenamiento de tiempo</p>
              {res?.ritmo != null ? (
                <p className="text-sm mt-1">Tu ritmo: <b className={res.ritmo <= res.objetivo_seg ? 'text-brand-green' : 'text-brand-amber'}>{seg(res.ritmo)} min</b> por pregunta · objetivo {seg(res.objetivo_seg)} min ({e.min_por_pregunta} min).</p>
              ) : <p className="text-sm text-gray-400 mt-1">Aún no hay datos: el ritmo se mide en los simulacros y las prácticas cronometradas. Objetivo: {e.min_por_pregunta} min por pregunta.</p>}
            </div>
            <div className="card">
              <p className="font-medium flex items-center gap-2"><AlertCircle size={16} /> Repaso de errores</p>
              <p className="text-xs text-gray-400 mt-1">Vuelven las preguntas falladas de este examen, en especial las más difíciles para ti, hasta acertarlas dos veces seguidas.</p>
              <button className="btn-secondary w-full mt-3" onClick={() => ir('errores', { examen: e.id })}>Ver mis errores de {e.corto}</button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {res && res.intentos > 0 && (
        <div className="card space-y-3">
          <p className="font-medium">Resultados</p>
          <div className="grid grid-cols-3 gap-2">
            <Metrica etiqueta="Puntaje estimado Nivytek" valor={puntaje?.total ?? '—'} sufijo={e.puntaje.total?.max ? `/${e.puntaje.total.max}` : ''} />
            <Metrica etiqueta="Respuestas" valor={res.intentos} />
            <Metrica etiqueta="Ritmo" valor={res.ritmo != null ? seg(res.ritmo) : '—'} sufijo=" min" />
          </div>
          <p className="text-[11px] text-gray-500">{e.puntaje.nota} Se calcula con la dificultad de cada pregunta (modelo de Rasch simple) sobre tus últimas {res.intentos} respuestas.{e.puntaje.minimos ? ` Mínimos oficiales de admisión: ${e.puntaje.minimos.medellin} (Medellín) y ${e.puntaje.minimos.regiones} (regiones).` : ''}</p>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Por componente{e.puntaje.componente ? ` (escala ${e.puntaje.componente.media} ± ${e.puntaje.componente.desviacion})` : ''}</p>
            {puntaje.componentes.map(c => <FilaMetrica key={c.id} nombre={`${c.nombre}${c.puntaje != null ? ` · ${c.puntaje}` : ''}`} valor={c.precision ?? 0} detalle={c.n ? `${c.aciertos}/${c.n}` : 'sin datos'} />)}
          </div>
          {res.subhabilidades.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Por subhabilidad</p>
              {res.subhabilidades.sort((a, b) => a.precision - b.precision).map(s => <FilaMetrica key={s.id} nombre={nombreSubhabilidad(s.id)} valor={s.precision} detalle={`${s.aciertos}/${s.n}`} />)}
            </div>
          )}
          {res.evolucion.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Evolución por simulacro</p>
              <div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr className="text-gray-500"><th className="text-left py-1">Fecha</th><th className="text-left">Prueba</th>{e.componentes.map(c => <th key={c.id} className="text-right">{c.nombre.split(' ')[0]}</th>)}<th className="text-right">Total</th></tr></thead><tbody>
                {res.evolucion.map(ev => <tr key={ev.id} className="border-t border-dark-700"><td className="py-1">{fechaCorta(ev.fecha)}</td><td>{ev.modo === 'diagnostico' ? 'Diagnóstico' : ev.modo === 'bloque' ? 'Bloque' : 'Completo'}{ev.con_pausas ? ' (con pausas)' : ''}</td>{ev.componentes.map(c => <td key={c.id} className="text-right tabular-nums">{c.puntaje ?? (c.n ? `${c.precision} %` : '—')}</td>)}<td className="text-right font-medium tabular-nums">{ev.total ?? '—'}</td></tr>)}
              </tbody></table></div>
            </div>
          )}
          {(res.recomendacion.componentes.length > 0 || res.recomendacion.subhabilidades.length > 0) && (
            <div className="rounded-lg bg-dark-900 p-3 text-sm">
              <p className="font-medium mb-1 flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-green" /> Donde más puedes subir</p>
              {res.recomendacion.componentes.length > 0 && <p className="text-gray-300">Componentes: {res.recomendacion.componentes.map(c => c.nombre).join(' y ')}.</p>}
              {res.recomendacion.subhabilidades.length > 0 && <p className="text-gray-300">Subhabilidades: {res.recomendacion.subhabilidades.map(s => `${nombreSubhabilidad(s.id)} (${s.precision} %)`).join(', ')}.</p>}
              {esEst && res.recomendacion.subhabilidades[0] && <button className="btn-secondary !py-1.5 text-xs mt-2" onClick={() => ir('practica', { prueba: res.recomendacion.subhabilidades[0].prueba, competencia: res.recomendacion.subhabilidades[0].id, n: 5, examen: e.id })}>Practicar {nombreSubhabilidad(res.recomendacion.subhabilidades[0].id)}</button>}
            </div>
          )}
        </div>
      )}

      {/* Enlaces oficiales */}
      <div className="card">
        <p className="font-medium mb-1">Enlaces oficiales (gratuitos)</p>
        <ul className="text-sm space-y-1.5">
          {e.enlaces.map(l => <li key={l.url}><a className="text-brand-blue underline" href={l.url} target="_blank" rel="noopener">{l.nombre} <ExternalLink size={12} className="inline" /></a>{l.nota && <span className="text-xs text-gray-400"> · {l.nota}</span>}</li>)}
        </ul>
        {esEst && e.id === 'unal' && (
          <div className="mt-3 text-sm">
            <p className="text-xs text-gray-400 mb-1">¿Hiciste la demostración oficial? Registra el puntaje que te dio para compararlo con tu estimado.</p>
            {ruta.dipa && <p className="text-xs text-gray-300 mb-1">Registrado: {ruta.dipa.puntaje} el {fechaCorta(ruta.dipa.fecha)}.</p>}
            <div className="flex gap-2"><input className="input" inputMode="numeric" placeholder="Puntaje de la demostración" value={dipa} onChange={ev => setDipa(ev.target.value)} /><button className="btn-secondary shrink-0" onClick={guardarDipa}>Guardar</button></div>
          </div>
        )}
      </div>
    </div>
  )
}
