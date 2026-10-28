import { useEffect, useState } from 'react'
import { db } from '../../lib/db'
import { listarCiclos, guardarCiclo, estadoCiclo, programa, formatoFecha, FECHAS_REFERENCIA } from '../../lib/ciclo'
import { crearUsuario, hashPin, cambiarPinEstudiante } from '../../lib/sesion'
import { borrarDatosDemo } from '../../lib/demo'
import { NUBE_DISPONIBLE } from '../../lib/supabase'
import { Titulo, Badge, Metrica } from '../ui'
import { ir } from '../../lib/nav'

// ─── Administración ──────────────────────────────────────────────────────────
// Usuarios, ciclos (fechas del examen), taxonomía (tipos de error), estructura
// del examen, programa, reglas, estadísticas generales, respaldo.

export default function Admin({ usuario }) {
  const [pestana, setPestana] = useState('ciclos')
  return (
    <div className="space-y-4">
      <Titulo sub={NUBE_DISPONIBLE ? 'Conectado a Supabase' : 'Modo local: los datos viven en este navegador'}>Administración</Titulo>
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {[['ciclos', 'Ciclos'], ['usuarios', 'Usuarios'], ['datos', 'Datos']].map(([k, n]) => (
          <button key={k} onClick={() => setPestana(k)} className={`badge shrink-0 border px-3 py-1 ${pestana === k ? 'border-brand-blue text-white' : 'border-dark-600 text-gray-400'}`}>{n}</button>
        ))}
      </div>
      <p className="text-xs text-gray-500">La estructura del examen, la taxonomía y las reglas de recomendación viven en el código del proyecto (GitHub) y se actualizan desde allí.</p>
      {pestana === 'ciclos' && <Ciclos />}
      {pestana === 'usuarios' && <Usuarios admin={usuario} />}
      {pestana === 'datos' && <Datos />}
    </div>
  )
}

function Ciclos() {
  const [ciclos, setCiclos] = useState([])
  const [prog, setProg] = useState(null)
  const cargar = async () => { setCiclos(await listarCiclos()); setProg(await programa()) }
  useEffect(() => { cargar() }, [])
  const editar = async (c, cambios) => { await guardarCiclo({ ...c, ...cambios }); cargar() }
  const activar = async (id) => { for (const c of ciclos) await guardarCiclo({ ...c, activo: c.id === id }); cargar() }
  const nuevo = async () => {
    const anio = new Date().getFullYear() + 1
    await guardarCiclo({ id: `saber11-X-${Date.now().toString(36)}`, nombre: `Nuevo ciclo ${anio}`, calendario: 'A', anio, fecha_inicio: `${anio}-02-01`, fecha_examen: `${anio}-08-01`, fecha_provisional: true, semanas: 24, activo: false })
    cargar()
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Referencias oficiales: {FECHAS_REFERENCIA.filter(f => f.oficial).map(f => `${f.calendario} ${f.anio} = ${formatoFecha(f.fecha)}`).join(' · ')}. Las de 2027 son provisionales hasta que el ICFES publique el cronograma (icfes.gov.co).</p>
      {ciclos.map(c => {
        const e = prog ? estadoCiclo(c, prog) : null
        return (
          <div key={c.id} className={`card space-y-2 ${c.activo ? 'border-brand-blue' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <input className="input font-medium" value={c.nombre} onChange={ev => editar(c, { nombre: ev.target.value })} />
              {c.activo ? <Badge tono="azul">activo</Badge> : <button className="btn-ghost text-xs" onClick={() => activar(c.id)}>Activar</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Inicio del ciclo</label><input className="input" type="date" value={c.fecha_inicio} onChange={ev => editar(c, { fecha_inicio: ev.target.value })} /></div>
              <div><label className="label">Fecha del examen</label><input className="input" type="date" value={c.fecha_examen} onChange={ev => editar(c, { fecha_examen: ev.target.value })} /></div>
              <div><label className="label">Calendario</label><select className="input" value={c.calendario} onChange={ev => editar(c, { calendario: ev.target.value })}><option value="B">B (primer semestre)</option><option value="A">A (segundo semestre)</option></select></div>
              <div><label className="label">Fecha</label><select className="input" value={c.fecha_provisional ? 'prov' : 'ofi'} onChange={ev => editar(c, { fecha_provisional: ev.target.value === 'prov' })}><option value="prov">Provisional</option><option value="ofi">Oficial (verificada en ICFES)</option></select></div>
            </div>
            <div>
              <label className="label">Pausas (vacaciones): una por línea, "AAAA-MM-DD a AAAA-MM-DD · nombre"</label>
              <textarea className="input font-mono text-xs" rows="2" defaultValue={(c.pausas ?? []).map(p => `${p.inicio} a ${p.fin} · ${p.nombre ?? ''}`).join('\n')}
                onBlur={ev => editar(c, { pausas: parsearPausas(ev.target.value) })} placeholder="2026-12-18 a 2027-01-10 · Vacaciones" />
            </div>
            {e && <p className="text-xs text-gray-400">{e.semanasTotales} semanas efectivas ({e.semanas.filter(s => s.pausa).length} en pausa) · hoy: semana {e.semanaActual}{e.enPausa ? ` (en pausa: ${e.pausaActual})` : ''} · {e.diasRestantes} días al examen · fase: {e.fase?.nombre ?? '—'}</p>}
          </div>
        )
      })}
      <button className="btn-secondary w-full" onClick={nuevo}>Nuevo ciclo</button>
    </div>
  )
}

function parsearPausas(texto) {
  return texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/(\d{4}-\d{2}-\d{2})\s*a\s*(\d{4}-\d{2}-\d{2})\s*(?:·\s*(.*))?$/)
    return m ? { inicio: m[1], fin: m[2], nombre: (m[3] ?? 'Pausa').trim() || 'Pausa' } : null
  }).filter(Boolean)
}

function Usuarios({ admin }) {
  const [lista, setLista] = useState([])
  const [nuevo, setNuevo] = useState(null)
  const cargar = async () => setLista(await db.usuarios.toArray())
  useEffect(() => { cargar() }, [])
  const guardar = async () => {
    try { await crearUsuario(nuevo); setNuevo(null); cargar() } catch (e) { alert(e.message) }
  }
  const cambiarRol = async (u, rol) => { await db.usuarios.update(u.id, { rol }); cargar() }
  // Estudiantes: por la misma vía que el panel del docente (en la nube, función de servidor
  // api/pin.js que cambia la contraseña real y comprueba el ingreso). Antes solo se cambiaba
  // el hash local y el estudiante seguía sin poder entrar.
  const resetPin = async (u) => {
    const pin = prompt(`Nuevo PIN para ${u.nombre} (4 a 6 dígitos)`)
    if (!pin) return
    if (u.rol !== 'estudiante') {
      if (NUBE_DISPONIBLE) return alert('Docentes y administradores cambian su contraseña desde «Olvidé mi contraseña» en la pantalla de ingreso.')
      await db.usuarios.update(u.id, { pin_hash: await hashPin(pin) }); return alert('PIN actualizado')
    }
    try {
      const r = await cambiarPinEstudiante(u, pin)
      const usuarioReal = r?.usuario ?? u.usuario
      let msg = `PIN de ${u.nombre} actualizado.\n\nEntra como ESTUDIANTE con:\n  Usuario: ${usuarioReal}\n  PIN: ${String(pin).trim()}`
      if (r?.verificado === true) msg += '\n\n✔ Comprobado: el ingreso con estos datos funciona.'
      else if (r?.verificado === false) msg += `\n\n✖ Atención: el ingreso de prueba falló (${r.detalle ?? 'sin detalle'}).`
      if (usuarioReal !== u.usuario) msg += `\n\nOjo: el usuario de acceso es "${usuarioReal}", no "${u.usuario}".`
      alert(msg)
    } catch (err) { alert('No se cambió el PIN: ' + err.message) }
  }
  const eliminar = async (u) => {
    if (u.id === admin.id) return alert('No puedes eliminar tu propia cuenta')
    if (!confirm(`¿Eliminar a ${u.nombre} y todos sus registros? Esta acción no se puede deshacer.`)) return
    await db.intentos.where('estudiante_id').equals(u.id).delete()
    await db.sesiones.where('estudiante_id').equals(u.id).delete()
    await db.usuarios.delete(u.id); cargar()
  }
  return (
    <div className="space-y-3">
      {NUBE_DISPONIBLE && <p className="text-xs text-gray-400">Con Supabase, las cuentas se crean desde el panel de Supabase (docentes) o al inscribir estudiantes en un grupo (función api/estudiantes.js).</p>}
      <p className="text-xs text-gray-400">Los estudiantes que se registran solos quedan <b>pendientes de aprobar</b> y sin grupo: no pueden entrar hasta que los aceptes. Se aprueban y se les asigna grupo en <b>Grupos</b> (tarjeta «Solicitudes»).</p>
      <button className="btn-secondary w-full" onClick={() => setNuevo({ nombre: '', usuario: '', pin: '', rol: 'docente' })}>Nuevo docente / admin / revisor</button>
      {nuevo && (
        <div className="card space-y-2">
          <input className="input" placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="usuario" value={nuevo.usuario} onChange={e => setNuevo({ ...nuevo, usuario: e.target.value })} />
            <input className="input" placeholder="PIN" value={nuevo.pin} onChange={e => setNuevo({ ...nuevo, pin: e.target.value })} />
            <select className="input" value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value })}><option value="docente">docente</option><option value="admin">admin (jefe)</option><option value="revisor">revisor (solo lectura)</option></select>
          </div>
          <div className="flex gap-2"><button className="btn-primary flex-1" onClick={guardar}>Crear</button><button className="btn-secondary flex-1" onClick={() => setNuevo(null)}>Cancelar</button></div>
        </div>
      )}
      <div className="card p-0 divide-y divide-dark-700">
        {lista.map(u => (
          <div key={u.id} className="px-4 py-2 flex items-center gap-2 text-sm">
            <div className="min-w-0 flex-1"><p className="truncate">{u.nombre} {u.demo && <Badge>demo</Badge>} {u.rol === 'estudiante' && u.estado === 'pendiente' && <Badge tono="ambar">pendiente de aprobar</Badge>}{u.rol === 'estudiante' && u.estado === 'rechazado' && <Badge tono="rojo">rechazado</Badge>}</p><p className="text-xs text-gray-500">{u.usuario}{u.curso ? ` · ${u.curso}` : u.rol === 'estudiante' ? ' · sin grupo' : ''}</p></div>
            {u.rol === 'estudiante' && u.estado === 'pendiente' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => ir('inicio', { vista: 'docente' })}>Aprobar y asignar grupo</button>}
            <select className="input !w-auto !py-1 text-xs" value={u.rol} onChange={e => cambiarRol(u, e.target.value)}><option value="estudiante">estudiante</option><option value="docente">docente</option><option value="admin">admin</option></select>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => resetPin(u)}>PIN</button>
            <button className="btn-ghost !px-2 !py-1 text-xs text-brand-red" onClick={() => eliminar(u)}>Eliminar</button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">Minimización de datos: solo se guardan nombre, usuario, curso, colegio y resultados. Eliminar una cuenta borra sus registros en este dispositivo (y en la nube al sincronizar).</p>
    </div>
  )
}




function Datos() {
  const [stats, setStats] = useState(null)
  const cargar = async () => setStats({
    preguntas: await db.preguntas.count(), aprobadas: await db.preguntas.where('estado').equals('aprobada').count(), usuarios: await db.usuarios.count(),
    estudiantes: await db.usuarios.where('rol').equals('estudiante').count(), grupos: await db.grupos.count(), intentos: await db.intentos.count(), sesiones: await db.sesiones.count(), recursos: await db.recursos.count(), pendientes: await db.cola.count(),
  })
  useEffect(() => { cargar() }, [])
  const exportar = async () => {
    const respaldo = {}
    for (const t of ['preguntas', 'intentos', 'usuarios', 'grupos', 'asignaciones', 'sesiones', 'recursos', 'ciclos', 'config']) respaldo[t] = await db[t].toArray()
    const blob = new Blob([JSON.stringify(respaldo)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `saber11-respaldo-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const importar = async (archivo) => {
    if (!confirm('Se fusionarán los datos del respaldo con los actuales (los registros con el mismo id se reemplazan). ¿Continuar?')) return
    const r = JSON.parse(await archivo.text())
    for (const [t, filas] of Object.entries(r)) if (db[t] && Array.isArray(filas)) await db[t].bulkPut(filas)
    alert('Respaldo importado'); cargar()
  }
  if (!stats) return null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Metrica etiqueta="Preguntas" valor={`${stats.aprobadas}/${stats.preguntas}`} />
        <Metrica etiqueta="Estudiantes" valor={stats.estudiantes} />
        <Metrica etiqueta="Grupos" valor={stats.grupos} />
        <Metrica etiqueta="Respuestas" valor={stats.intentos} />
        <Metrica etiqueta="Pruebas" valor={stats.sesiones} />
        <Metrica etiqueta="Recursos" valor={stats.recursos} />
      </div>
      <div className="card space-y-2">
        <p className="font-medium">Respaldo</p>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={exportar}>Exportar todo (JSON)</button>
          <label className="btn-secondary flex-1 cursor-pointer">Importar respaldo<input type="file" accept=".json" className="hidden" onChange={e => e.target.files[0] && importar(e.target.files[0])} /></label>
        </div>
        <p className="text-xs text-gray-500">En modo local, el respaldo es la única copia fuera del navegador. Haz uno después de cada jornada. Pendientes de sincronizar: {stats.pendientes}.</p>
      </div>
      {!NUBE_DISPONIBLE && <button className="btn-ghost w-full text-brand-red" onClick={async () => { if (confirm('¿Borrar usuarios y respuestas de demostración?')) { await borrarDatosDemo(); location.reload() } }}>Borrar datos de demostración</button>}
    </div>
  )
}
