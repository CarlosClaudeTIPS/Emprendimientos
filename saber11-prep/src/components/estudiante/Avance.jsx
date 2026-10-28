import { lazy, Suspense } from 'react'
import { ir } from '../../lib/nav'
import MiProgreso from './MiProgreso'
import MisErrores from './MisErrores'
const Informe = lazy(() => import('../Informe'))
const Historial = lazy(() => import('./Historial'))

// ─── Mi avance: progreso, informe, historial y errores en una sola pantalla ──
const PESTANAS = [['progreso', 'Progreso'], ['informe', 'Mi informe'], ['historial', 'Historial'], ['errores', 'Mis errores']]
export default function Avance({ usuario, params = {} }) {
  const ver = PESTANAS.some(([k]) => k === params.ver) ? params.ver : 'progreso'
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {PESTANAS.map(([k, n]) => <button key={k} onClick={() => ir('avance', { ver: k })} className={`badge shrink-0 border px-3 py-1 ${ver === k ? 'border-brand-blue text-white' : 'border-dark-600 text-gray-400'}`}>{n}</button>)}
      </div>
      <Suspense fallback={<p className="text-sm text-gray-400">Cargando…</p>}>
        {ver === 'progreso' && <MiProgreso usuario={usuario} params={params} />}
        {ver === 'informe' && <Informe usuario={usuario} params={params} />}
        {ver === 'historial' && <Historial usuario={usuario} params={params} />}
        {ver === 'errores' && <MisErrores usuario={usuario} params={params} />}
      </Suspense>
    </div>
  )
}
