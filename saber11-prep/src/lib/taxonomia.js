import taxonomiaJson from '../../content/taxonomia.json'
import { extensionTaxonomia } from './examenes-config'

// Los componentes de los exámenes de admisión propios (content/examenes/*.json)
// se suman como pruebas y competencias con el campo `examen`, para que nombres,
// resúmenes y filtros funcionen igual. Las del Saber 11 no llevan `examen`.
// `pruebas` y `competencias` siguen siendo solo las del Saber 11 (todo el código
// existente las recorre); las de los exámenes propios van en `pruebasExamen` y
// `competenciasExamen`, y los mapas por id incluyen ambas.
const ext = extensionTaxonomia()
const taxonomiaBase = taxonomiaJson

// La taxonomía base viene del archivo; el administrador puede extenderla desde
// la app (se guarda en config.taxonomia y se fusiona por id).
let tax = estructurar(taxonomiaBase)

function estructurar(t) {
  const porId = (arr) => Object.fromEntries(arr.map(x => [x.id, x]))
  return {
    ...t,
    pruebasExamen: ext.pruebas,
    competenciasExamen: ext.competencias,
    pruebaPorId: porId([...t.pruebas, ...ext.pruebas]),
    competenciaPorId: porId([...t.competencias, ...ext.competencias]),
    componentePorId: porId(t.componentes),
    habilidadPorId: porId(t.habilidades),
    tipoErrorPorId: porId(t.tipos_error),
    tipoPracticaPorId: porId(t.tipos_practica),
    diagnosticoPorId: porId(t.niveles_diagnostico),
  }
}

export function taxonomia() { return tax }

export function aplicarExtension(extension) {
  if (!extension) return
  const fusion = { ...taxonomiaBase }
  for (const clave of ['pruebas', 'competencias', 'componentes', 'habilidades', 'tipos_error', 'tipos_practica']) {
    const extra = extension[clave] ?? []
    const mapa = new Map(taxonomiaBase[clave].map(x => [x.id, x]))
    for (const x of extra) mapa.set(x.id, { ...(mapa.get(x.id) ?? {}), ...x })
    fusion[clave] = [...mapa.values()]
  }
  tax = estructurar(fusion)
}

export const nombrePrueba = (id) => tax.pruebaPorId[id]?.nombre ?? id
export const colorPrueba = (id) => tax.pruebaPorId[id]?.color ?? '#94A3B8'
export const nombreCompetencia = (id) => tax.competenciaPorId[id]?.nombre ?? id
export const nombreComponente = (id) => tax.componentePorId[id]?.nombre ?? id
export const nombreHabilidad = (id) => tax.habilidadPorId[id]?.nombre ?? id
export const nombreTipoError = (id) => tax.tipoErrorPorId[id]?.nombre ?? id
export const nombreDiagnostico = (id) => tax.diagnosticoPorId[id]?.nombre ?? id
export const practicaParaError = (tipoError) => tax.tipoErrorPorId[tipoError]?.practica ?? 'ejercitacion'
export const competenciasDe = (prueba) => [...tax.competencias, ...tax.competenciasExamen].filter(c => c.prueba === prueba)
export const pruebasDeExamen = (examen) => tax.pruebasExamen.filter(p => p.examen === examen)
export const competenciasDeExamen = (examen) => tax.competenciasExamen.filter(c => c.examen === examen)
export const componentesDe = (prueba) => tax.componentes.filter(c => c.prueba === prueba)
