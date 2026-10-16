import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase simulado: un admin, un docente con el grupo g1 y dos estudiantes.
const tablas = {
  perfiles: {
    admin1: { id: 'admin1', rol: 'admin', nombre: 'Admin', grupo_id: null },
    doc1: { id: 'doc1', rol: 'docente', nombre: 'Docente', grupo_id: null },
    doc2: { id: 'doc2', rol: 'docente', nombre: 'Otro docente', grupo_id: null },
    est1: { id: 'est1', rol: 'estudiante', nombre: 'Ana', grupo_id: 'g1' },
    est2: { id: 'est2', rol: 'estudiante', nombre: 'Luis', grupo_id: 'g2' },
  },
  grupos: { g1: { id: 'g1', docente_id: 'doc1' }, g2: { id: 'g2', docente_id: 'doc2' } },
}
const updateUserById = vi.fn(async () => ({ error: null }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async (token) => tablas.perfiles[token] ? { data: { user: { id: token } } } : { data: { user: null }, error: new Error('bad') },
      admin: { updateUserById, createUser: vi.fn() },
    },
    from: (tabla) => {
      let id = null
      const q = { select: () => q, eq: (_, v) => { id = v; return q }, single: async () => ({ data: tablas[tabla][id] ?? null }), upsert: async () => ({ error: null }) }
      return q
    },
  }),
}))

const { default: handler } = await import('../api/estudiantes.js')

function llamar(token, body) {
  const res = { code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  return handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res).then(() => res)
}

describe('api/estudiantes · acción pin', () => {
  beforeEach(() => { process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'; updateUserById.mockClear() })

  it('el docente cambia el PIN de su estudiante con el mismo sufijo que usa el ingreso', async () => {
    const res = await llamar('doc1', { accion: 'pin', estudiante_id: 'est1', pin: '5678' })
    expect(res.code).toBe(200)
    expect(updateUserById).toHaveBeenCalledWith('est1', { password: '5678#saber11' })
  })

  it('el docente no puede tocar estudiantes de otro grupo; el admin sí', async () => {
    expect((await llamar('doc1', { accion: 'pin', estudiante_id: 'est2', pin: '5678' })).code).toBe(403)
    expect(updateUserById).not.toHaveBeenCalled()
    expect((await llamar('admin1', { accion: 'pin', estudiante_id: 'est2', pin: '5678' })).code).toBe(200)
  })

  it('rechaza PIN inválido, no estudiantes y tokens ajenos', async () => {
    expect((await llamar('doc1', { accion: 'pin', estudiante_id: 'est1', pin: '12' })).code).toBe(400)
    expect((await llamar('admin1', { accion: 'pin', estudiante_id: 'doc2', pin: '5678' })).code).toBe(400)
    expect((await llamar('est1', { accion: 'pin', estudiante_id: 'est2', pin: '5678' })).code).toBe(403)
    expect((await llamar('', { accion: 'pin', estudiante_id: 'est1', pin: '5678' })).code).toBe(401)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('sin SERVICE_ROLE_KEY explica qué falta en Vercel', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await llamar('doc1', { accion: 'pin', estudiante_id: 'est1', pin: '5678' })
    expect(res.code).toBe(500)
    expect(res.body.error).toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
  })
})
