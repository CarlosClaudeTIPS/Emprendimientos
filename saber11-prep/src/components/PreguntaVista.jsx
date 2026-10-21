import Estimulo, { svgSeguro, escalarSvg } from './Estimulo'
import { examenDePregunta, examenPorId, subhabilidadDe } from '../lib/examenes-config'
import { Md, Badge } from './ui'
import { nombrePrueba, nombreCompetencia, nombreHabilidad } from '../lib/taxonomia'

// ─── Vista de una pregunta ───────────────────────────────────────────────────
// modo: 'responder' (elige opción), 'revisar' (muestra correcta/incorrecta), 'papel' (impresión)

export default function PreguntaVista({ pregunta, elegida = null, onElegir = null, modo = 'responder', numero = null, mostrarMeta = true, mostrarContexto = true, contextoRepetido = false }) {
  const p = pregunta
  const examen = examenDePregunta(p)
  const cfgExamen = examen !== 'icfes' ? examenPorId(examen) : null
  const claseOpcion = (o) => {
    if (modo === 'revisar') {
      if (o.correcta) return 'opcion opcion-correcta'
      if (o.clave === elegida) return 'opcion opcion-incorrecta'
      return 'opcion opacity-70'
    }
    return `opcion ${o.clave === elegida ? 'opcion-elegida' : ''}`
  }
  return (
    <div className="space-y-3">
      {mostrarMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {numero != null && <span className="text-gray-400">Pregunta {numero}</span>}
          <Badge tono="morado">{nombrePrueba(p.prueba)}</Badge>
          <Badge>{cfgExamen ? (subhabilidadDe(p.competencia)?.nombre ?? nombreCompetencia(p.competencia)) : nombreCompetencia(p.competencia)}</Badge>
          {!cfgExamen && <Badge tono="azul">{nombreHabilidad(p.habilidad)}</Badge>}
          {cfgExamen ? <Badge tono="azul">Pregunta de práctica Nivytek · {cfgExamen.corto}</Badge> : p.origen === 'oficial' ? <Badge tono="verde">Oficial ICFES</Badge> : p.origen === 'generada' ? <Badge tono="ambar">Sin origen declarado</Badge> : <Badge>Estilo Saber 11</Badge>}
        </div>
      )}
      {mostrarContexto && p.contexto && !contextoRepetido && <Md texto={p.contexto} className="text-[16px] text-gray-200 bg-dark-900 rounded-xl p-4 border border-dark-700" />}
      {mostrarContexto && p.contexto && contextoRepetido && (
        <details className="rounded-xl border border-dark-700 bg-dark-900">
          <summary className="cursor-pointer px-4 py-2 text-sm text-brand-blue font-medium">Mismo texto de la pregunta anterior (toca para verlo otra vez)</summary>
          <div className="px-4 pb-3"><Md texto={p.contexto} className="text-[16px] text-gray-200" /></div>
        </details>
      )}
      {mostrarContexto && !contextoRepetido && <Estimulo estimulo={p.estimulo} />}
      <Md texto={p.enunciado} className="text-[17px] font-semibold text-brand-navy" />
      {p.tipo === 'dos_afirmaciones' && Array.isArray(p.afirmaciones) && (
        <ol className="rounded-xl border border-dark-700 bg-dark-900 p-3 space-y-1.5 text-[16px] text-gray-200">
          {p.afirmaciones.map((a, i) => <li key={i} className="flex gap-2"><span className="font-semibold text-brand-navy w-6 shrink-0">{['I', 'II', 'III', 'IV'][i]}.</span><Md texto={a} className="[&_p]:mb-0" /></li>)}
        </ol>
      )}
      <div className="space-y-2">
        {p.opciones.map(o => (
          <button key={o.clave} type="button" disabled={modo !== 'responder'} onClick={() => onElegir?.(o.clave)} className={claseOpcion(o)}>
            <span className="font-semibold mr-2">{o.clave}.</span>{o.svg && svgSeguro(o.svg) ? <span className="figura inline-block align-middle max-w-[calc(100%-2rem)] [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: escalarSvg(svgSeguro(o.svg), 1.35) }} /> : <span className="align-top inline-block max-w-[calc(100%-2rem)]"><Md texto={o.texto} className="[&_p]:mb-0 [&_p]:inline" /></span>}
          </button>
        ))}
      </div>
    </div>
  )
}
