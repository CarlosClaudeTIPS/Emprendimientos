// Función de servidor (Vercel) — cuentas de estudiantes en Supabase Auth.
// Cabecera: Authorization: Bearer <access_token del docente o admin>
//
//  POST /api/estudiantes  { grupo_id, estudiantes: [{ nombre, usuario, pin }] }
//    Crea un usuario de Auth por estudiante con correo sintético
//    <usuario>@estudiantes.saber11.local y contraseña derivada del PIN, y su fila en `perfiles`.
//
//  POST /api/estudiantes  { accion: 'pin', estudiante_id, pin }
//    Restablece el PIN de un estudiante (cambia su contraseña de Auth). Solo el
//    docente del grupo del estudiante o un admin. Es la única forma de que un
//    PIN nuevo sirva para entrar en modo nube: la base local del navegador no cuenta.
//
// Usa la SERVICE_ROLE_KEY (solo en el servidor; nunca con prefijo VITE_).

import { createClient } from '@supabase/supabase-js'

const DOMINIO = 'estudiantes.saber11.local'
// Debe coincidir con claveDePin() en src/lib/sesion.js: el PIN se convierte en
// contraseña con un sufijo fijo para cumplir el mínimo de longitud de Supabase.
const claveDePin = (pin) => `${String(pin ?? '').trim()}#saber11`
const PIN_VALIDO = /^\d{4,8}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  const url = process.env.VITE_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return res.status(500).json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel: sin ella el servidor no puede administrar cuentas' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Falta el token del docente' })

  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: quien, error: errTok } = await admin.auth.getUser(token)
  if (errTok || !quien?.user) return res.status(401).json({ error: 'Token inválido' })

  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', quien.user.id).single()
  if (!perfil || !['docente', 'admin'].includes(perfil.rol)) return res.status(403).json({ error: 'Solo docentes o administradores' })

  const cuerpo = req.body ?? {}
  if (cuerpo.accion === 'pin') return restablecerPin(admin, quien.user, perfil, cuerpo, res)
  return inscribir(admin, quien.user, perfil, cuerpo, res)
}

async function restablecerPin(admin, actor, perfilActor, { estudiante_id, pin }, res) {
  const pinLimpio = String(pin ?? '').trim()
  if (!estudiante_id) return res.status(400).json({ error: 'Falta estudiante_id' })
  if (!PIN_VALIDO.test(pinLimpio)) return res.status(400).json({ error: 'El PIN debe tener entre 4 y 8 dígitos' })

  const { data: est } = await admin.from('perfiles').select('id, rol, nombre, grupo_id').eq('id', estudiante_id).single()
  if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' })
  if (est.rol !== 'estudiante') return res.status(400).json({ error: 'Solo se restablece el PIN de estudiantes; docentes y admins usan "Olvidé mi contraseña"' })
  if (perfilActor.rol !== 'admin') {
    const { data: grupo } = est.grupo_id ? await admin.from('grupos').select('docente_id').eq('id', est.grupo_id).single() : { data: null }
    if (!grupo || grupo.docente_id !== actor.id) return res.status(403).json({ error: 'El estudiante no está en uno de tus grupos' })
  }

  const { error } = await admin.auth.admin.updateUserById(est.id, { password: claveDePin(pinLimpio) })
  if (error) return res.status(500).json({ error: `No se pudo cambiar el PIN: ${error.message}` })
  return res.status(200).json({ ok: true, estudiante_id: est.id })
}

async function inscribir(admin, actor, perfilActor, { grupo_id, estudiantes }, res) {
  if (!grupo_id || !Array.isArray(estudiantes) || !estudiantes.length) return res.status(400).json({ error: 'Faltan grupo_id o estudiantes' })

  const { data: grupo } = await admin.from('grupos').select('*').eq('id', grupo_id).single()
  if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' })
  if (perfilActor.rol !== 'admin' && grupo.docente_id !== actor.id) return res.status(403).json({ error: 'El grupo no es tuyo' })

  const creados = [], errores = []
  for (const e of estudiantes.slice(0, 200)) {
    const usuario = String(e.usuario ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    const pin = String(e.pin ?? '').trim()
    if (!e.nombre || !usuario || pin.length < 4) { errores.push(`${e.nombre ?? '?'}: datos incompletos`); continue }
    const { data, error } = await admin.auth.admin.createUser({ email: `${usuario}@${DOMINIO}`, password: claveDePin(pin), email_confirm: true, user_metadata: { nombre: e.nombre, rol: 'estudiante' } })
    if (error) { errores.push(`${e.nombre}: ${error.message}`); continue }
    const fila = { id: data.user.id, rol: 'estudiante', estado: 'activo', nombre: e.nombre, usuario, grupo_id, colegio: grupo.colegio, curso: grupo.curso, ciclo_id: grupo.ciclo_id }
    const { error: errPerfil } = await admin.from('perfiles').upsert(fila)
    if (errPerfil) { errores.push(`${e.nombre}: ${errPerfil.message}`); continue }
    creados.push(fila)
  }
  return res.status(200).json({ creados, errores })
}
