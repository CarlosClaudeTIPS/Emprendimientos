# Exámenes de admisión propios (Universidad Nacional y Universidad de Antioquia)

Módulo para que los estudiantes se preparen para universidades que admiten con un
examen propio, no con el puntaje del Saber 11. Hecho el 21-oct-2026 a partir del
prompt «Módulo Exámenes de admisión propios». Nombre del producto dentro de
Nivytek: **«Ruta examen de admisión – Universidad Nacional»** (y «– Universidad de
Antioquia»). Nunca «PreUNAL» ni nombres o colores institucionales.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Configuración por examen (componentes, subhabilidades, tiempos, escala, enlaces, avisos) | `content/examenes/unal.json`, `udea.json`; otras instituciones (solo ficha) en `otras.json` |
| Taxonomía extendida, filtro por examen, puntaje estimado (Rasch con prior), reparto semanal, fechas desde la guía | `src/lib/examenes-config.js` |
| Sesiones por examen (diagnóstico, simulacro completo, por bloque), pausas, resultados, ruta activa | `src/lib/examenes.js` |
| Pantalla «Exámenes de admisión» (lista de rutas, ruta por examen, otras instituciones) | `src/components/estudiante/Admision.jsx` (`#/admision`, `#/admision?examen=unal`) |
| Generador de figuras SVG (10 subtipos espaciales) y preguntas generadas | `src/lib/figuras/`, `scripts/generar-figuras.mjs` → `content/banco/unal-imagen-generadas.json` |
| Importador de preguntas en formato corto | `scripts/importar-examen.mjs` → `content/banco/<examen>-importadas.json` |
| Fechas de convocatoria | Campo `convocatorias` de las fichas `unal-bogota` y `udea` en `content/guia/universidades-*.json` |
| Pruebas automáticas | `tests/examenes.test.js` (puntaje, reparto, fechas, plan semanal), `tests/figuras.test.js` (generadores) |

## Cómo funciona

- Las preguntas de un examen propio llevan `examen` (`unal`/`udea`), `prueba` = componente
  (`unal_matematicas`, `unal_ciencias`, `unal_sociales`, `unal_textual`, `unal_imagen`,
  `udea_lectora`, `udea_logico`), `competencia` = `<prueba>.<subhabilidad>` y `subhabilidad`.
  Las del Saber 11 no llevan `examen`. Banco e intentos filtran por examen (Saber 11 por defecto),
  así las dos rutas no se mezclan en informes ni en el plan.
- El estudiante activa una ruta desde la pantalla del examen (se guarda en `ruta_config.admision`,
  migración 005). Con una ruta activa, el plan semanal reparte las sesiones: más de 8 semanas al
  examen 30 %, entre 8 y 3 semanas 50 %, menos de 3 semanas 80 % (configurable por grupo desde el
  panel del docente); ninguna ruta baja de una sesión por semana.
- Modos: diagnóstico corto (6 por componente, repartido por subhabilidad), práctica por componente y
  subhabilidad (motor de práctica del Saber 11), simulacro completo (120 preguntas, 3 h 30, pausable y
  marcado «con pausas»), simulacro por bloques, ritmo frente a 1,75 min por pregunta, repaso de errores
  (`#/errores?examen=unal`).
- **Puntaje estimado Nivytek**: modelo de Rasch con prior N(0,1). La dificultad de cada pregunta sale de
  `dificultad_examen` (1–5) asignada por el docente; si se pasa un mapa `dificultadEmpirica` (calculado con
  ≥ 30 respuestas por pregunta, solo posible del lado del docente) se usa esa. Escala UNAL: 10 ± 1 por
  componente, 500 ± 100 total. UdeA: 0–100. Siempre con la nota «La universidad calcula su puntaje con
  su propio modelo; esta es una aproximación para orientar tu estudio».
- Fechas: solo las de la guía (`convocatorias`); si no hay próxima, «Por confirmar en la página oficial».
- Docente: filtro por ruta en el grupo (lo que más falló por componente y subhabilidad), reparto por grupo,
  conteo de aprobadas por subhabilidad en el Banco con aviso cuando hay menos de 20, y una línea por ruta en
  el informe del estudiante.

## Banco inicial (todo en borrador; nada aprobado)

| Archivo | Preguntas | Origen |
|---|---|---|
| `unal-importadas.json` | 64 | Archivo del prompt (adaptado). Los distractores quedaron sin explicación: completarla al aprobar. |
| `udea-importadas.json` | 10 | Ídem. |
| `unal-imagen-generadas.json` | 200 | 20 por subtipo espacial, verificadas por código. |
| `unal-matematicas-b1.json`, `unal-ciencias-b1.json`, `unal-sociales-b1.json`, `unal-textual-b1.json` | 40 | Originales, al estilo del examen. |
| `udea-lectora-b1.json`, `udea-logico-b1.json`, `udea-logico-b2.json` | 100 | Originales (10 por subhabilidad). |

Para aprobar: Banco → filtro por componente/subhabilidad → abrir → Aprobar (o editar). Las preguntas
generadas se pueden regenerar con `node scripts/generar-figuras.mjs 20` (misma semilla, misma pregunta).

## Lista de verificación final

- [x] Ninguna pantalla usa «PreUNAL», logos ni colores institucionales (búsqueda en código y contenido: 0).
- [x] El descargo aparece en cada ruta, en la lista de rutas y en la portada.
- [x] Ningún puntaje se presenta como oficial (siempre «Puntaje estimado Nivytek» + nota).
- [x] Ningún dato [NV] aparece como hecho: penalización por error, mínimo de 450 y puntajes de corte no se muestran; la UdeA muestra «aprox. 80 preguntas»; las subhabilidades de la UdeA llevan la nota de clasificación interna.
- [x] Ninguna pregunta copia un examen real (todas originales o generadas por código).
- [x] Todas las imágenes fueron generadas por código (no hay estímulos tipo `imagen` en los exámenes propios; el validador exige autor y licencia si se agregan).
- [x] Las fechas salen de los JSON de la guía y muestran «Por confirmar» cuando faltan.
- [x] La Universidad de Cartagena figura como `ponderado` (admite con Saber 11), no como examen propio.
- [x] Funciona en un celular de 360 px (sin desplazamiento horizontal en las cuatro pantallas del módulo).

## Pendientes y datos por confirmar

- Convocatoria UNAL 2027-2 y UdeA 2027-2: no publicadas; agregar al campo `convocatorias` cuando salgan.
- Subtipos `intencionalidad`, `imagen_palabra` y `causalidad`: sin preguntas (requieren imágenes con licencia; cada una debe llevar `autor`, `licencia` y `url_origen`).
- Dificultad empírica: el cálculo con ≥ 30 respuestas por pregunta está implementado en la función, pero aún no se conecta al panel del docente.
- Reporte semanal al acudiente: no existe como envío; la línea por ruta está en el informe del estudiante.
- Las 74 preguntas importadas necesitan explicación por distractor antes de aprobarse.
- La portada pública enlaza a «Otras instituciones» dentro de la app (requiere entrar).
