import { useEffect, useState } from 'react'
import { puedeEditar } from '../../lib/roles'
import { db } from '../../lib/db'
import { intentosDe, moverEstudiante } from '../../lib/datos'
import { listarPreguntas } from '../../lib/banco'
import { sesionesDe } from '../../lib/pruebas'
import { resumen, evolucionSemanal } from '../../lib/analitica'
import { recomendar, reglasVigentes } from '../../lib/reglas'
import { cambiarPinEstudiante } from '../../lib/sesion'
import { ir } from '../../lib/nav'
import { Titulo, FilaMetrica, Metrica, Badge, fechaCorta, formatoTiempo } from '../ui'
import { nombrePrueba, nombreTipoError, nombreDiagnostico } from '../../lib/taxonomia'
import { carreraPorId } from '../../lib/carreras'
import { constancia } from '../../lib/aprendizaje'
import { estadoCamino } from '../../lib/camino'
import { rutasAdmision, rutasActivasIds, resultadosRuta } from '../../lib/examenes'

export default function EstudianteDetalle({ usuario, params }) {
  const [d, setD] = useState(null)
  const [pinNuevo, setPinNuevo] = useState('')
  const [cambiandoPin, setCambiandoPin] = useState(false)
  const cargar = async () => {
    const e = await db.usuarios.get(params.id)
    if (!e) return
    const [intentos, preguntas, sesiones] = await Promise.all([intentosDe(e.id), listarPreguntas({ estado: 'todas' }), sesionesDe(e.id)])
    const porId = Object.fromEntries(preguntas.map(p => [p.id, p]))
    const ordenados = [...intentos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    // Camino (cuestionario, carrera, ruta, admisión) y rutas de examen propio, para la vista general
    let camino = null, rutas = []
    try { camino = await estadoCamino(e); for (const id of rutasActivasIds(await rutasAdmision(e))) rutas.push(await resultadosRuta(e, id)) } catch {}
    setD({ e, r: resumen(intentos, porId), evo: evolucionSemanal(intentos), recs: recomendar(intentos, { preguntasPorId: porId, reglas: await reglasVigentes() }), errores: ordenados.filter(i => !i.correcta).slice(0, 20), porId, sesiones: sesiones.filter(s => s.estado === 'terminada'), grupos: await db.grupos.toArray(), act: constancia(intentos), ultima: ordenados[0]?.fecha ?? null, camino, rutas })
  }
  useEffect(() => { cargar() }, [params.id])
  if (!d) return <p className="text-sm text-gray-400">Cargando…</p>
  const { e, r } = d

  const cambiarGrupo = async (id) => {
    const g = d.grupos.find(x => x.id === id)
    if (!g || g.id === e.grupo_id) return
    if (!confirm(`¿Pasar a ${e.nombre} al grupo ${g.nombre}?`)) return
    try { await moverEstudiante(e, g); await cargar() } catch (err) { alert(err.message) }
  }

  const cambiarPin = async () => {
    if (!/^\d{4,6}$/.test(pinNuevo)) return alert('El PIN debe tener 4 a 6 dígitos')
    setCambiandoPin(true)
    try {
      const r = await cambiarPinEstudiante(e, pinNuevo)
      const usuarioReal = r?.usuario ?? e.usuario
      let msg = `PIN de ${e.nombre} actualizado.\n\nEntra como ESTUDIANTE con:\n  Usuario: ${usuarioReal}\n  PIN: ${pinNuevo}`
      if (r?.verificado === true) msg += '\n\n✔ Comprobado: el ingreso con estos datos funciona.'
      else if (r?.verificado === false) msg += `\n\n✖ Atención: el ingreso de prueba falló (${r.detalle ?? 'sin detalle'}). Avísale a quien administra la app.`
      if (usuarioReal !== e.usuario) msg += `\n\nOjo: el usuario de acceso es "${usuarioReal}", no "${e.usuario}".`
      setPinNuevo(''); alert(msg)
    }
    catch (err) { alert('No se cambió el PIN: ' + err.message) }
    finally { setCambiandoPin(false) }
  }

  return (
    <div className="space-y-4">
      <Titulo volver sub={`${e.usuario} · ${e.curso ?? ''}`}>{e.nombre}</Titulo>
      {(e.carreras ?? []).length > 0 && (
        <p className="text-sm text-gray-400 -mt-2">Le gustaría estudiar: <span className="text-brand-navy font-medium">{e.carreras.map(id => carreraPorId(id)?.nombre).filter(Boolean).join(' · ')}</span>{e.modo_carrera ? <Badge tono="azul">modo carrera</Badge> : null}</p>
      )}
      {d.grupos.length > 1 && (
        <label className="card !py-2.5 flex items-center justify-between gap-2 text-sm">
          <span className="text-gray-400">Grupo</span>
          <select className="input !w-auto !py-1.5 text-sm" value={e.grupo_id ?? ''} disabled={!puedeEditar(usuario)} onChange={ev => cambiarGrupo(ev.target.value)}>
            {!e.grupo_id && <option value="">Sin grupo</option>}
            {d.grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </label>
      )}
      {/* Qué ha hecho: actividad, camino y pruebas */}
      <div className="card">
        <p className="font-medium mb-2">Qué ha hecho</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-dark-900 p-2"><p className="text-xl font-semibold">{r.total}</p><p className="text-[11px] text-gray-500">respuestas</p></div>
          <div className="rounded-xl bg-dark-900 p-2"><p className="text-xl font-semibold">{d.act.dias_total}</p><p className="text-[11px] text-gray-500">días con práctica</p></div>
          <div className="rounded-xl bg-dark-900 p-2"><p className="text-xl font-semibold">{d.act.ultimos_7}<span className="text-xs text-gray-500">/7</span></p><p className="text-[11px] text-gray-500">días esta semana</p></div>
          <div className="rounded-xl bg-dark-900 p-2"><p className="text-xl font-semibold">{d.sesiones.length}</p><p className="text-[11px] text-gray-500">pruebas terminadas</p></div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{d.ultima ? `Última actividad: ${fechaCorta(d.ultima)}.` : 'Todavía no ha respondido nada.'}{d.act.racha > 1 ? ` Racha de ${d.act.racha} días seguidos.` : ''}</p>
        {d.camino && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {d.camino.pasos.map(p => <Badge key={p.id} tono={p.hecho ? 'verde' : 'gris'}>{p.hecho ? '✔ ' : '○ '}{p.corto}</Badge>)}
            {!d.camino.hecho.futuro && <span className="text-xs text-amber-700">Aún no responde el cuestionario de Mi futuro: la práctica sigue cerrada para él.</span>}
          </div>
        )}
        {d.rutas.map(rt => <p key={rt.examen.id} className="text-xs text-gray-400 mt-1">Ruta {rt.examen.corto}: {rt.intentos} respuestas{rt.estimado.total != null ? ` · puntaje estimado Nivytek ${rt.estimado.total}` : ''}.</p>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <button className="btn-primary w-full" onClick={() => ir('informe', { estudiante: e.id })}>Ver informe (formato ICFES y mejoramiento)</button>
        <button className="btn-secondary w-full" onClick={() => ir('historial', { id: e.id })}>Historial pregunta por pregunta</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metrica etiqueta="Aciertos" valor={r.precision} sufijo="%" />
        <Metrica etiqueta="Respuestas" valor={r.total} />
        <Metrica etiqueta="Tiempo prom." valor={formatoTiempo(r.tiempo_prom_seg)} />
      </div>
      {r.por_prueba.length > 0 && <div className="card"><p className="font-medium mb-1">Por materia</p>{r.por_prueba.map(x => <FilaMetrica key={x.id} nombre={x.nombre} valor={x.precision} detalle={`${x.aciertos}/${x.total}`} />)}</div>}
      {r.por_competencia.length > 0 && <div className="card"><p className="font-medium mb-1">Por competencia (de más floja a más fuerte)</p><p className="text-xs text-gray-500 mb-1">Esto es lo que usa su ruta para decidir qué practica cada semana.</p>{[...r.por_competencia].sort((a, b) => a.precision - b.precision).map(x => <FilaMetrica key={x.id} nombre={x.nombre} valor={x.precision} detalle={`${x.aciertos}/${x.total}`} />)}</div>}
      {r.por_habilidad.length > 0 && <div className="card"><p className="font-medium mb-1">Habilidades</p>{r.por_habilidad.map(x => <FilaMetrica key={x.id} nombre={x.nombre} valor={x.precision} detalle={`${x.aciertos}/${x.total}`} />)}</div>}
      {r.por_tipo_error.length > 0 && <div className="card"><p className="font-medium mb-1">Errores por tipo</p>{r.por_tipo_error.map(x => <FilaMetrica key={x.id} nombre={x.nombre} valor={x.pct} detalle={`${x.n}`} color="#F87171" />)}</div>}
      <div className="card">
        <p className="font-medium mb-1">Recomendación (reglas)</p>
        {d.recs.slice(0, 3).map((rec, i) => <p key={i} className="text-sm text-gray-300 mb-1"><span className="text-white">{rec.titulo}.</span> {rec.dato} → {rec.nombre_practica}.</p>)}
      </div>
      {d.sesiones.length > 0 && (
        <div className="card">
          <p className="font-medium mb-1">Pruebas y simulacros</p>
          {d.sesiones.map(s => <p key={s.id} className="text-sm flex justify-between"><span>{s.titulo} <span className="text-gray-500 text-xs">{fechaCorta(s.fecha_inicio)}</span></span><span>{s.resultado.precision}%</span></p>)}
        </div>
      )}
      <details className="card">
        <summary className="font-medium cursor-pointer">Últimos errores (toca para ver)</summary>
        <div className="divide-y divide-dark-700 mt-2">
          {d.errores.map(i => (
            <div key={i.uid} className="py-2 text-sm">
              <div className="flex flex-wrap gap-1.5 text-xs mb-0.5"><Badge tono="morado">{nombrePrueba(i.prueba)}</Badge>{i.tipo_error && <Badge tono={i.diagnostico === 'confirmado' ? 'rojo' : 'ambar'}>{nombreTipoError(i.tipo_error)} · {nombreDiagnostico(i.diagnostico).toLowerCase()}</Badge>}<span className="text-gray-500 ml-auto">{fechaCorta(i.fecha)}</span></div>
              <p className="text-gray-300 line-clamp-2">{d.porId[i.pregunta_id]?.enunciado}</p>
              <p className="text-xs text-gray-500">Eligió {i.opcion ?? '—'}{i.razon ? ` · dijo: “${i.razon.texto}”` : ''}{i.vio_explicacion ? ' · vio la explicación' : ''}</p>
            </div>
          ))}
          {d.errores.length === 0 && <p className="text-sm text-gray-500">Sin errores registrados.</p>}
        </div>
      </details>
      {puedeEditar(usuario) && <div className="card">
        <p className="font-medium mb-1">Restablecer PIN</p>
        <div className="flex gap-2"><input className="input" placeholder="Nuevo PIN" value={pinNuevo} onChange={e => setPinNuevo(e.target.value)} /><button className="btn-secondary shrink-0" disabled={cambiandoPin} onClick={cambiarPin}>{cambiandoPin ? 'Guardando…' : 'Guardar'}</button></div>
      </div>}
    </div>
  )
}
