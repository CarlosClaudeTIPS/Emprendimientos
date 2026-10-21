// Genera preguntas de análisis de la imagen (UNAL) con figuras por código.
// Uso: node scripts/generar-figuras.mjs [porSubtipo=20] [--salida content/banco/unal-imagen-generadas.json]
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUBTIPOS_GENERADOS, generarPregunta, verificarPregunta } from '../src/lib/figuras/index.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const porSubtipo = Number(args.find(a => /^\d+$/.test(a)) ?? 20)
const salida = args.includes('--salida') ? args[args.indexOf('--salida') + 1] : join(raiz, 'content/banco/unal-imagen-generadas.json')

const letra = (p) => p.opciones.find(o => o.correcta)?.clave
const lista = []
let n = 0
for (const sub of SUBTIPOS_GENERADOS) {
  for (let k = 0; k < porSubtipo; k++) {
    const dificultad = k % 3 === 0 ? 1 : k % 3 === 1 ? 2 : 3
    const semilla = 1000 + k * 7 + SUBTIPOS_GENERADOS.indexOf(sub) * 1009
    // La letra correcta no puede repetirse más de dos veces seguidas: se cambia el orden de las opciones si hace falta.
    let p, semillaOrden = 0
    do { p = generarPregunta(sub, semilla, dificultad, { id: `UNAL-IMG-${String(n + 1).padStart(3, '0')}`, semillaOrden }) ; semillaOrden++ } while (semillaOrden < 20 && lista.slice(-2).length === 2 && lista.slice(-2).every(q => letra(q) === letra(p)))
    n++
    if (!verificarPregunta(p)) throw new Error(`La verificación falló en ${sub} semilla ${semilla}`)
    lista.push(p)
  }
}
writeFileSync(salida, JSON.stringify(lista, null, 1) + '\n')
console.log(`${salida}: ${lista.length} preguntas (${porSubtipo} por subtipo, todas verificadas, estado borrador)`)
