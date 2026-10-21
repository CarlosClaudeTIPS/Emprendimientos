import { describe, it, expect } from 'vitest'
import { GENERADORES } from '../src/lib/figuras/generadores'
import { REDES_CUBO, plegarRed, vistaFrente, vistaDerecha, vistaAtras, vistaIzquierda, vistaSuperior, totalCubos, mismaForma, rotar90, reflejarH, esQuiral } from '../src/lib/figuras/base'
import { generarPregunta, verificarPregunta, SUBTIPOS_GENERADOS } from '../src/lib/figuras/index'

describe('figuras: utilidades', () => {
  it('las 11 redes del cubo se pliegan en 6 caras distintas y las opuestas son mutuas', () => {
    expect(REDES_CUBO).toHaveLength(11)
    for (const red of REDES_CUBO) {
      const { cara, opuestaDe } = plegarRed(red)
      expect(new Set(cara).size).toBe(6)
      for (let i = 0; i < 6; i++) { expect(opuestaDe(opuestaDe(i))).toBe(i); expect(opuestaDe(i)).not.toBe(i) }
    }
  })
  it('en la red en cruz, las caras alineadas con una de por medio son opuestas', () => {
    // ['.X..','XXXX','.X..'] → celdas: (1,0), (0,1),(1,1),(2,1),(3,1), (1,2)
    const red = REDES_CUBO[4]
    const { opuestaDe } = plegarRed(red)
    const idx = (x, y) => red.findIndex(c => c[0] === x && c[1] === y)
    expect(opuestaDe(idx(0, 1))).toBe(idx(2, 1))
    expect(opuestaDe(idx(1, 1))).toBe(idx(3, 1))
    expect(opuestaDe(idx(1, 0))).toBe(idx(1, 2))
  })
  it('las vistas de un sólido son coherentes entre sí', () => {
    const h = [[1, 0, 2], [0, 3, 0], [1, 1, 0]]
    expect(vistaFrente(h)).toEqual([1, 3, 2])
    expect(vistaDerecha(h)).toEqual([2, 3, 1])
    expect(vistaAtras(h)).toEqual([...vistaFrente(h)].reverse())
    expect(vistaIzquierda(h)).toEqual([...vistaDerecha(h)].reverse())
    expect(vistaSuperior(h)).toEqual([[1, 0, 1], [0, 1, 0], [1, 1, 0]])
    expect(totalCubos(h)).toBe(8)
  })
  it('rotar no cambia la forma; reflejar una figura quiral sí', () => {
    const L = [[0, 0], [0, 1], [0, 2], [1, 2]]
    expect(mismaForma(L, rotar90(L))).toBe(true)
    expect(esQuiral(L)).toBe(true)
    expect(mismaForma(L, reflejarH(L))).toBe(false)
  })
})

describe('figuras: generadores', () => {
  for (const [nombre, g] of Object.entries(GENERADORES)) {
    it(`${nombre}: la opción correcta se verifica por un camino independiente y es única (90 casos)`, () => {
      for (let s = 1; s <= 30; s++) for (const d of [1, 2, 3]) {
        const q = g(s * 977 + d, d)
        expect(q.opciones).toHaveLength(4)
        expect(q.opciones.filter(o => o.correcta)).toHaveLength(1)
        expect(new Set(q.opciones.map(o => o.svg ?? o.texto)).size).toBe(4)
        expect(q.verificar()).toBe(true)
        expect(q.explicacion.length).toBeGreaterThan(40)
        expect(q.opciones.every(o => o.explicacion.length > 15)).toBe(true)
      }
    })
  }
  it('es determinista: misma semilla, misma pregunta', () => {
    expect(JSON.stringify(GENERADORES.vistas(42, 2))).toBe(JSON.stringify(GENERADORES.vistas(42, 2)))
  })
  it('generarPregunta produce el esquema del banco en borrador y verificarPregunta la confirma', () => {
    for (const sub of SUBTIPOS_GENERADOS) {
      const p = generarPregunta(sub, 123, 2)
      expect(p.estado).toBe('borrador')
      expect(p.examen).toBe('unal'); expect(p.prueba).toBe('unal_imagen'); expect(p.competencia).toBe(`unal_imagen.${sub}`)
      expect(p.opciones.map(o => o.clave).join('')).toBe('ABCD')
      expect(verificarPregunta(p)).toBe(true)
      const roto = { ...p, opciones: p.opciones.map((o, i) => ({ ...o, correcta: i === p.opciones.findIndex(x => !x.correcta) })) }
      expect(verificarPregunta(roto)).toBe(false)
    }
  })
})
