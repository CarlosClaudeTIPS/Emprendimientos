import { describe, it, expect } from 'vitest'
import { estimarHabilidad, puntajeEstimado, proporcionRutaPropia, proximaConvocatoria, examenDePrueba, extensionTaxonomia, examenPorId, dificultadLogit } from '../src/lib/examenes-config'

const it_ = (correcta, dificultad = 3, prueba = 'unal_matematicas') => ({ correcta, dificultad_examen: dificultad, prueba, pregunta_id: Math.random().toString(36) })

describe('exámenes propios: configuración', () => {
  it('reconoce el examen por la prueba y extiende la taxonomía', () => {
    expect(examenDePrueba('unal_imagen')).toBe('unal')
    expect(examenDePrueba('udea_logico')).toBe('udea')
    expect(examenDePrueba('matematicas')).toBe('icfes')
    const ext = extensionTaxonomia()
    expect(ext.pruebas.map(p => p.id)).toContain('unal_textual')
    expect(ext.competencias.find(c => c.id === 'unal_imagen.rotacion')?.espacial).toBe(true)
    expect(examenPorId('unal').componentes.reduce((a, c) => a + c.preguntas, 0)).toBe(120)
  })
})

describe('puntaje estimado Nivytek (Rasch con prior)', () => {
  it('sin respuestas no hay puntaje', () => {
    const r = puntajeEstimado('unal', [])
    expect(r.total).toBeNull()
    expect(r.componentes.every(c => c.puntaje === null)).toBe(true)
  })
  it('más aciertos → mayor habilidad; 0 % y 100 % no se disparan', () => {
    const todo = estimarHabilidad(Array.from({ length: 10 }, () => it_(true)))
    const nada = estimarHabilidad(Array.from({ length: 10 }, () => it_(false)))
    const mitad = estimarHabilidad(Array.from({ length: 10 }, (_, i) => it_(i % 2 === 0)))
    expect(todo.theta).toBeGreaterThan(mitad.theta)
    expect(mitad.theta).toBeGreaterThan(nada.theta)
    expect(Math.abs(todo.theta)).toBeLessThan(4)
    expect(Math.abs(mitad.theta)).toBeLessThan(0.3)
  })
  it('acertar preguntas difíciles vale más que acertar fáciles', () => {
    const dif = estimarHabilidad([it_(true, 5), it_(true, 5), it_(false, 1)])
    const fac = estimarHabilidad([it_(true, 1), it_(true, 1), it_(false, 5)])
    expect(dif.theta).toBeGreaterThan(fac.theta)
    expect(dificultadLogit(5)).toBeGreaterThan(dificultadLogit(1))
  })
  it('usa la escala del examen: 10 ± 1 por componente y 500 ± 100 total (UNAL)', () => {
    const its = [...Array.from({ length: 8 }, () => it_(true)), ...Array.from({ length: 8 }, () => it_(false))]
    const r = puntajeEstimado('unal', its)
    const m = r.componentes.find(c => c.id === 'unal_matematicas')
    expect(m.n).toBe(16)
    expect(m.puntaje).toBeGreaterThan(9); expect(m.puntaje).toBeLessThan(11)
    expect(r.total).toBeGreaterThan(400); expect(r.total).toBeLessThan(600)
    expect(r.nota).toMatch(/aproximación/)
  })
  it('la UdeA se acota a 0–100', () => {
    const r = puntajeEstimado('udea', Array.from({ length: 40 }, () => it_(true, 5, 'udea_logico')))
    expect(r.total).toBeLessThanOrEqual(100)
    expect(r.total).toBeGreaterThan(50)
  })
  it('la dificultad empírica reemplaza la del docente cuando se pasa', () => {
    const a = it_(true, 1); a.pregunta_id = 'X'
    const conEmpirica = estimarHabilidad([a], { dificultadEmpirica: { X: 2.5 } })
    const sinEmpirica = estimarHabilidad([a])
    expect(conEmpirica.theta).toBeGreaterThan(sinEmpirica.theta)
  })
})

describe('reparto semanal con doble ruta', () => {
  it('30 % lejos, 50 % entre 8 y 3 semanas, 80 % en la recta final', () => {
    expect(proporcionRutaPropia(100)).toBe(0.3)
    expect(proporcionRutaPropia(40)).toBe(0.5)
    expect(proporcionRutaPropia(10)).toBe(0.8)
    expect(proporcionRutaPropia(null)).toBe(0.3)
  })
  it('es configurable', () => {
    expect(proporcionRutaPropia(10, { cerca: 60 })).toBe(0.6)
  })
})

describe('fechas desde la guía', () => {
  const ficha = { convocatorias: [{ nombre: '2027-1', prueba: '2026-09-20' }, { nombre: '2027-2', prueba: '2027-04-25' }] }
  it('devuelve la próxima prueba con la cuenta regresiva', () => {
    const p = proximaConvocatoria(ficha, new Date('2026-10-21T10:00:00'))
    expect(p.nombre).toBe('2027-2')
    expect(p.dias_restantes).toBe(186)
  })
  it('sin convocatoria futura devuelve null (la app muestra "por confirmar")', () => {
    expect(proximaConvocatoria(ficha, new Date('2027-05-01'))).toBeNull()
    expect(proximaConvocatoria({}, new Date())).toBeNull()
  })
})
