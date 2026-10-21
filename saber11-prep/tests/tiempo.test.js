import { describe, it, expect } from 'vitest'
import { repartoPorTiempo, PASOS_TIEMPO_MIN, describirTiempo } from '../src/lib/tiempo'
import estructura from '../content/estructura-examen.json'

describe('pruebas por tiempo', () => {
  it('reparte las preguntas con la proporción del examen y suma exacto', () => {
    for (const min of PASOS_TIEMPO_MIN) {
      const r = repartoPorTiempo(estructura, min)
      expect(r.bloques.reduce((a, b) => a + b.objetivo, 0)).toBe(r.total)
      expect(r.bloques.every(b => b.objetivo >= 1)).toBe(true)
      expect(r.bloques.map(b => b.prueba).sort()).toEqual(['ciencias_naturales', 'ingles', 'lectura_critica', 'matematicas', 'sociales_ciudadanas'])
    }
  })
  it('usa el ritmo real del examen: 540 min para 254 preguntas', () => {
    const r = repartoPorTiempo(estructura, 270)
    expect(r.total).toBe(127)
    expect(repartoPorTiempo(estructura, 60).total).toBe(28)
    expect(Math.round(r.segPorPregunta)).toBe(128)
  })
  it('crece con el tiempo y rechaza tiempos inválidos', () => {
    const t = PASOS_TIEMPO_MIN.map(m => repartoPorTiempo(estructura, m).total)
    expect([...t].sort((a, b) => a - b)).toEqual(t)
    expect(() => repartoPorTiempo(estructura, 0)).toThrow()
    expect(describirTiempo(90)).toBe('1 h 30 min')
    expect(describirTiempo(30)).toBe('30 min')
  })
})
