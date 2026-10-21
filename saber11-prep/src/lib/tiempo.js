// ─── Pruebas por tiempo ───────────────────────────────────────────────────────
// El docente (o el admin) elige solo el tiempo, de 30 en 30 minutos, y la prueba
// se arma sola: la cantidad de preguntas sale del ritmo real del examen (tiempo
// total de las dos sesiones ÷ preguntas calificables) y se reparte entre las
// cinco pruebas con la misma proporción del Saber 11.

export const PASOS_TIEMPO_MIN = [30, 60, 90, 120, 150, 180, 210, 240, 270]

// Reparto proporcional con restos mayores: suma exacta y ninguna prueba en cero
// mientras el total alcance para todas.
export function repartoPorTiempo(estructura, tiempo_min) {
  const minutos = Number(tiempo_min)
  if (!estructura?.sesiones?.length || !minutos || minutos <= 0) throw new Error('Tiempo inválido')
  const totales = {}
  for (const s of estructura.sesiones) for (const b of s.bloques) totales[b.prueba] = (totales[b.prueba] ?? 0) + b.preguntas
  const pruebas = Object.keys(totales)
  const preguntasReales = pruebas.reduce((a, p) => a + totales[p], 0)
  const minutosReales = estructura.duracion_sesion_min * estructura.sesiones.length
  const segPorPregunta = (minutosReales * 60) / preguntasReales
  const total = Math.max(pruebas.length, Math.round((minutos * 60) / segPorPregunta))
  const exactos = pruebas.map(p => ({ prueba: p, exacto: (totales[p] / preguntasReales) * total }))
  const bloques = exactos.map(e => ({ prueba: e.prueba, objetivo: Math.max(1, Math.floor(e.exacto)), resto: e.exacto - Math.floor(e.exacto) }))
  let faltan = total - bloques.reduce((a, b) => a + b.objetivo, 0)
  for (const b of [...bloques].sort((a, b) => b.resto - a.resto)) { if (faltan <= 0) break; b.objetivo += 1; faltan -= 1 }
  while (faltan < 0) { const m = [...bloques].sort((a, b) => b.objetivo - a.objetivo)[0]; m.objetivo -= 1; faltan += 1 }
  return {
    tiempo_min: minutos, total, segPorPregunta: Math.round(segPorPregunta),
    escala: total / preguntasReales,
    bloques: bloques.map(({ prueba, objetivo }) => ({ prueba, objetivo })),
  }
}

export const describirTiempo = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`)
