import { useEffect, useState } from 'react'
import { Video, CalendarPlus, ExternalLink, XCircle } from 'lucide-react'
import { crearClase, actualizarClase, clasesDeGrupo } from '../../lib/datos'
import { Vacio } from '../ui'

// ─── Clases del grupo (Google Meet) ──────────────────────────────────────────
// El docente crea la reunión en Google Meet (meet.google.com/new), pega el
// enlace y programa la clase. Los estudiantes la ven en su inicio con el botón
// «Entrar a la clase». No se piden cuentas de Google a los estudiantes.

const fechaLocal = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16) }
export const formatoClase = (iso) => new Date(iso).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
export const enlaceValido = (u) => /^https?:\/\/\S+$/.test(u || '')

export default function Clases({ grupo, usuario, editable }) {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(null)
  const cargar = async () => setLista(await clasesDeGrupo(grupo.id))
  useEffect(() => { cargar() }, [grupo.id])

  const guardar = async () => {
    if (!form.titulo.trim()) return alert('Falta el título de la clase')
    if (!form.fecha) return alert('Falta la fecha y la hora')
    if (form.enlace && !enlaceValido(form.enlace)) return alert('El enlace debe empezar por https://')
    await crearClase({ grupo_id: grupo.id, docente_id: usuario.id, titulo: form.titulo.trim(), fecha: new Date(form.fecha).toISOString(), duracion_min: form.duracion_min, enlace: form.enlace, nota: form.nota })
    setForm(null); cargar()
  }
  const cancelar = async (c) => { if (confirm(`¿Cancelar la clase «${c.titulo}»?`)) { await actualizarClase(c.id, { estado: 'cancelada' }); cargar() } }

  const ahora = Date.now()
  const proximas = lista.filter(c => c.estado === 'programada' && new Date(c.fecha).getTime() + (c.duracion_min || 60) * 60000 > ahora)
  const pasadas = lista.filter(c => !proximas.includes(c)).reverse()

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <p className="font-medium flex items-center gap-2"><Video size={18} className="text-brand-blue" /> Clases por Google Meet</p>
        <p className="text-sm text-gray-400">Crea la reunión en Google Meet con tu cuenta, copia el enlace y programa aquí la clase. Los estudiantes del grupo la ven en su inicio con el botón para entrar.</p>
        {editable && !form && (
          <div className="flex flex-wrap gap-2">
            <a className="btn-secondary" href="https://meet.google.com/new" target="_blank" rel="noopener"><ExternalLink size={16} /> Crear enlace en Google Meet</a>
            <button className="btn-primary" onClick={() => setForm({ titulo: '', fecha: fechaLocal(new Date(Date.now() + 24 * 3600 * 1000)), duracion_min: 60, enlace: '', nota: '' })}><CalendarPlus size={16} /> Programar clase</button>
          </div>
        )}
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input sm:col-span-2" placeholder="Título (ej.: Lectura crítica · inferencias)" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            <input className="input" type="datetime-local" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            <select className="input" value={form.duracion_min} onChange={e => setForm({ ...form, duracion_min: Number(e.target.value) })}>{[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutos</option>)}</select>
            <input className="input sm:col-span-2" placeholder="Enlace de Google Meet (https://meet.google.com/…)" value={form.enlace} onChange={e => setForm({ ...form, enlace: e.target.value })} />
            <textarea className="input sm:col-span-2" rows="2" placeholder="Nota para los estudiantes (opcional): qué llevar, qué repasar antes…" value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2"><button className="btn-primary flex-1" onClick={guardar}>Guardar clase</button><button className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancelar</button></div>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Próximas clases</p>
        {proximas.length === 0 ? <Vacio>No hay clases programadas.</Vacio> : (
          <div className="space-y-2">
            {proximas.map(c => (
              <div key={c.id} className="card !p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.titulo}</p>
                  <p className="text-xs text-gray-400 capitalize">{formatoClase(c.fecha)} · {c.duracion_min} min</p>
                  {c.nota && <p className="text-xs text-gray-500 mt-1">{c.nota}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {c.enlace ? <a className="btn-primary !py-1.5 text-xs" href={c.enlace} target="_blank" rel="noopener"><Video size={14} /> Entrar</a> : <span className="text-xs text-amber-500">Sin enlace</span>}
                  {editable && <button className="btn-ghost !py-1 text-xs text-gray-400" onClick={() => cancelar(c)}><XCircle size={14} /> Cancelar</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {pasadas.length > 0 && (
        <details><summary className="text-sm text-gray-400 cursor-pointer">Clases anteriores o canceladas ({pasadas.length})</summary>
          <div className="mt-2 space-y-1">{pasadas.map(c => <p key={c.id} className="text-xs text-gray-500 capitalize">{formatoClase(c.fecha)} · {c.titulo}{c.estado === 'cancelada' ? ' · cancelada' : ''}</p>)}</div>
        </details>
      )}
    </div>
  )
}
