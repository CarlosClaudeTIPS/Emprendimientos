# Nivytek — resumen completo del proyecto

Actualizado: 24 de octubre de 2026. Para pegar al inicio de cualquier conversación con Claude. Antes de pedir cambios, pídele a Claude que revise el repositorio para ver los últimos commits: este archivo describe el estado a la fecha.

---

## A. Lo esencial en un vistazo

- **Marca:** Nivytek. **Dominio:** nivytek.com (comprado y activo, con HTTPS). **Correo:** nivytek@hotmail.com. Dueño: Carlos, Bogotá.
- **Código:** un solo repositorio en GitHub, `CarlosClaudeTIPS/Emprendimientos`, una sola rama `main`. Cada cambio que se sube a `main` lo publica Vercel automáticamente en nivytek.com en dos o tres minutos. No hay nada que vive solo en un computador.
- **Tres secciones hoy** (Nivytek se presenta como marca ampliable, nunca como "tres servicios"):
  - **ICFES** → nivytek.com/icfes/ (carpeta `saber11-prep/`): plataforma de preparación Saber 11 y exámenes de admisión.
  - **Apoyo docente** → nivytek.com/docentes/ (carpeta `apoyo-docente/`): acompañamiento personalizado a docentes.
  - **Tienda** → nivytek.com/tienda/ (carpeta `tienda/`): catálogo con pedidos por WhatsApp.
- **Portal** → nivytek.com/ (carpeta `portal/`): portada con una puerta por sección y una barra oscura común que aparece arriba de todas las páginas (Inicio · Saber 11 (ICFES) · Apoyo docente · Tienda).
- **Otros proyectos que NO son Nivytek** y viven en otro repositorio (`mundial-2026-motor`): el motor de apuestas del Mundial (mundial-2026-motor.vercel.app) y una app de mantenimiento de motos. No se mezclan.
- **Conversaciones de Claude Code** en el grupo "Emprendimientos": *Tienda*, *Apoyo docente*, *ICFES* y *Portal (las tres a la vez)*. Todas trabajan sobre la misma rama; antes de tocar algo traen lo último de GitHub, y al terminar suben solas. Regla de oro: no pedir cambios al mismo archivo en dos conversaciones al mismo tiempo.

## B. Cómo está armado técnicamente

- Cada sección es independiente en su carpeta. `npm run build` ejecuta `build-sitio.mjs`, que: construye la app del ICFES con Vite, copia apoyo docente y tienda tal cual, copia la portada, inyecta la barra común en todas las páginas y deja todo en `dist/`. Vercel sirve `dist/`.
- `vercel.json` en la raíz: redirecciones (las direcciones `.vercel.app` mandan a nivytek.com; `/tienda` → `/tienda/`, etc.), reescritura para que la app del ICFES funcione como aplicación de una sola página, funciones de servidor del ICFES en `api/` (`/api/estudiantes`, `/api/ia-preguntas` heredada), cabeceras de seguridad y CSP.
- `portal/site/shared/portal.config.js` es el único lugar donde se define la marca y la lista de secciones (nombre, carpeta, color, textos, ícono). Para agregar una sección nueva: crear su carpeta y añadirla ahí.
- Identidad visual (documento `docs/identidad-nivytek.md` y hoja de marca `docs/identidad/hoja-de-marca-nivytek.webp`): símbolo N con degradado azul→verde y punto amarillo; logotipo NIVYTEK en Nunito 900; fondo crema `#FBFAF7`, texto `#1D2433`; barra oscura `#1D2433`; un color por sección (ICFES azul `#2F4D8C`, docentes coral `#F4845F`, tienda verde `#1E9E7A`), amarillo de acento `#FFD166`; íconos planos de trazo blanco sobre cuadrado de color. Cada sección conserva su propia tipografía interna (Poppins en ICFES, Nunito en docentes, Plus Jakarta Sans en tienda).
- Documentación de apoyo en el repositorio: `README.md`, `CONTINUAR-EN-OTRO-PC.md` (cómo clonar y ver cada cosa), `CLAUDE.md` (reglas para Claude), `portal/README.md` (cómo se arma y publica), y los README de cada sección.

## C. ICFES — "Saber 11 · Preparación" (nivytek.com/icfes/)

**Qué es.** Plataforma web para preparar estudiantes de colegio público para la prueba Saber 11 del ICFES, pensada para celular, instalable como app (PWA) y que funciona sin conexión. Construida con React 18 + Vite + Tailwind; los datos del estudiante se guardan en el dispositivo (IndexedDB con Dexie) y opcionalmente se sincronizan a la nube (Supabase, proyecto `saber11-prep`). **Decisión firme del proyecto (14-oct-2026): la aplicación no usa inteligencia artificial en ningún componente**; todo lo "inteligente" funciona por reglas explícitas y revisión humana.

**Roles.** Estudiante, docente, admin y revisor (solo lectura). No hay autorregistro: las cuentas de estudiantes las crea el docente o el admin (por tratarse de menores). En modo local existen usuarios de demostración (`admin`, `docente`, `est1`…`est6`, PIN 1234) y un grupo demo.

**Contenido.** Banco de unas 1 000 preguntas aprobadas (100 por materia en el lanzamiento del 29-sep-2026, ampliado después), cada distractor con explicación, tipo de error y nivel de diagnóstico; taxonomía oficial (pruebas, competencias, componentes, habilidades transversales); estructura real del examen (dos sesiones de 4 h 30 según la guía 2026-2); programa pedagógico de 24 semanas en 6 fases reutilizable para Calendario A y B; 14 lecciones de refuerzo "desde cero"; catálogo de 46 carreras en 9 áreas con el peso de cada prueba; guía de 17 universidades con proceso de admisión; distribución nacional real de puntajes (datos abiertos del ICFES) para calcular percentiles. Validador del banco (`npm run validar-banco`) y pruebas automáticas (Vitest, 60+).

**Lo que hace el estudiante.** Inicio con semana del ciclo, progreso y recomendaciones; práctica con retroalimentación inmediata por opción y pregunta "¿por qué elegiste X?" con pregunta de verificación; prueba diagnóstica; mini-pruebas; simulacros cronometrados por sesión o completos (con escala, porque el banco aún no cubre una sesión real sin repetir); bitácora de errores con estado "superado"; "Mi ruta para mejorar" (plan semanal con sesiones diarias según diagnóstico, tiempo disponible y meta); "Mi progreso" con medición de aprendizaje real (errores superados con preguntas nuevas); **modo carrera** (elige hasta 3 carreras y la app prioriza materias sin dejar ninguna por fuera); **"Mi futuro"** (orientación vocacional por reglas: cuestionario de intereses original, proyecto de vida con metas a 1/3/5 años, catálogo de ocupaciones y oportunidades; el docente no ve estos datos, por privacidad); biblioteca de recursos aprobados; informe de mejoramiento con puntaje estimado por prueba y global, niveles, percentil nacional y local, exportable a PDF y CSV.

**Lo que hace el docente.** Crear grupos con código, agregar estudiantes uno a uno o en lista, ver resultados del grupo y de cada estudiante (evolución semanal), errores más frecuentes con acciones sugeridas convertibles en asignación con un clic, asignar mini-pruebas o simulacros con fecha límite, modo papel (prueba imprimible con hoja de respuestas y registro posterior de respuestas), banco de preguntas con búsqueda, edición y aprobación, importar preguntas desde PDF o texto (quedan pendientes hasta aprobarlas), proponer recursos, sesiones de acompañamiento del grupo, planes de acceso por grupo (banco completo o lotes mensuales de 100 preguntas por materia), doble ruta semanal y conteo por subhabilidad.

**Lo que hace el admin.** Usuarios, ciclos (fechas del examen; las de 2027 son provisionales hasta que el ICFES publique el cronograma), contenido (banco, taxonomía, examen y programa), reglas de recomendación, respaldo de datos.

**Módulo reciente (21-oct-2026): exámenes de admisión propios.** "Ruta examen de admisión – Universidad Nacional" y "– Universidad de Antioquia" (nunca usar nombres ni colores institucionales tipo "PreUNAL"). Configuración por examen (componentes, subhabilidades, tiempos, escala), rutas activables por el estudiante que reparten el plan semanal según la cercanía del examen (30 % / 50 % / 80 %), diagnóstico, práctica, simulacro completo de 120 preguntas en 3 h 30 pausable, puntaje estimado con modelo de Rasch (siempre con la nota de que es una aproximación), generador de figuras para las preguntas de análisis de imagen (10 subtipos, 200 preguntas generadas) y un banco inicial de ~414 preguntas **todas en borrador, ninguna aprobada todavía**. Fechas de convocatoria solo desde la guía oficial.

**Nube.** Supabase con esquema SQL, políticas por rol (RLS) y migraciones 002–008. En Vercel se configuran `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, opcionalmente, `SUPABASE_SERVICE_ROLE_KEY`. Sin esas variables la app queda en modo local (cada navegador guarda lo suyo). Pendiente operativo: ejecutar en Supabase la migración 008 para activar el rol revisor en la nube.

**Pendiente / no incluido por decisión.** Motor adaptativo (primero datos reales), búsqueda semántica, biblioteca de videos, importación CSV/Excel, pantallas públicas informativas, auditoría de accesibilidad, modo claro, gamificación y rankings (excluidos por criterio pedagógico), aprobar el banco de exámenes de admisión, ampliar el banco para simulacros reales completos.

## D. Apoyo docente (nivytek.com/docentes/)

**Qué es.** Página estática (HTML, CSS y JavaScript, sin servidor) que ofrece apoyo y acompañamiento personalizado a docentes de colegio en Colombia. **Principio del proyecto:** no vender documentos genéricos, sino apoyo con un alcance definido según la necesidad, el contexto, los objetivos y el tiempo de cada docente. Lema: "Tu trabajo docente, organizado según tus necesidades."

**Contenido editable.** Todo está en `apoyo-docente/config.js` por bloques: marca, contacto, áreas, servicios, portafolio, ejemplos de flexibilidad, modalidades, preguntas frecuentes. Los textos de portada, proceso, condiciones y privacidad están en `index.html`.

**Cinco áreas de apoyo:** Planeación y organización académica · Material pedagógico y didáctico · Evaluación y seguimiento · Inclusión educativa y PIAR · Documentación y organización institucional.

**Secciones de la página.** Portada ("¿Necesitas apoyo con tu trabajo docente?") con las áreas en un vistazo; "No hay dos docentes iguales" (ejemplos de flexibilidad); "Una docente de aula, no una agencia" (quién está detrás); testimonios; detalle de las cinco áreas (qué se puede pedir, para qué sirve, qué se necesita); proceso en 4 pasos ("primero entendemos lo que necesitas"); catálogo de ejemplos con buscador y filtros por área, grado y tipo de recurso (11 demos con vista previa y PDF descargable); **"Cuéntame qué necesitas"**: pedido guiado que no produce documentos sino que ayuda al docente a especificar su pedido y genera el resumen listo para enviar por WhatsApp; **Cotización** con cuatro modalidades orientativas (trabajo puntual, conjunto de materiales, acompañamiento por tiempo, revisión y ajustes) y **calculadora de precio estimado**; 9 preguntas frecuentes; condiciones del servicio; aviso sobre PIAR; política de privacidad.

**Contacto configurado.** WhatsApp 57 304 313 4833, correo nivytek@hotmail.com, horario lunes a viernes 8:00 a. m. a 6:00 p. m. con respuesta en máximo 24 horas hábiles.

**Pendiente.** Foto real de la profesional (hoy una ilustración), reemplazar las 11 demos por ejemplos reales autorizados y anonimizados, decidir si se activa un formulario (Formspree) además de WhatsApp.

## E. Tienda (nivytek.com/tienda/)

**Qué es.** Catálogo digital para vender productos económicos y novedosos cerrando la venta por WhatsApp. **No tiene pagos en línea, ni inventario conectado, ni cuentas de usuario**, por decisión de empezar barato y simple. Sitio estático: productos en `tienda/data/catalogo.json`, configuración (nombre, WhatsApp, mensajes, políticas, colores, analítica) en `tienda/data/config.json`, fotos en `tienda/img/productos/`.

**Lo que ve el cliente.** Portada con banner de marca, categorías (solo las que tienen productos), destacados, novedades, ofertas, "vistos recientemente", pasos "Cómo comprar", preguntas frecuentes destacadas, encuesta "¿Qué te gustaría encontrar?"; catálogo con buscador con autocompletado, filtros (categoría, precio, novedades, ofertas, disponibilidad) y orden; ficha de producto con galería deslizable y zoom, variantes (color, talla), selector de cantidad, "Pedir por WhatsApp" (mensaje precompletado con nombre, variante, cantidad y enlace), "Consultar disponibilidad", "Agregar al carrito", señales de confianza junto al botón, barra de compra fija al hacer scroll, especificaciones, qué incluye, cómo se usa, precauciones, preguntas del producto, "Compra con tranquilidad", relacionados; carrito con resumen por WhatsApp; unidades disponibles ("Quedan N"); estado **Vendido** con botón "Quiero uno igual" para medir demanda; páginas de preguntas (14, agrupadas, con buscador) y políticas; barra inferior tipo app en celular; botón flotante de WhatsApp en escritorio. Páginas estáticas por producto (`tienda/p/`) para que al compartir en redes salga la foto y el nombre; SEO básico y datos estructurados.

**Panel de administración** (`tienda/admin.html`, no se publica; se usa localmente): crear, editar, duplicar, ocultar, reordenar y eliminar productos; categorías; configuración; importar y exportar JSON y CSV; generador de borradores de textos por canal (Marketplace, Instagram, Facebook, WhatsApp, guion de video); botón "Completar con IA" (automático si se despliega la función serverless con clave de API, o manual copiando un prompt y pegando el JSON). Los cambios del panel son un borrador local; se publican reemplazando los JSON en el repositorio. Por eso el flujo real es por Claude.

**Flujo de trabajo acordado.** El dueño envía una foto o captura del producto con el precio; Claude crea la ficha completa (descripción, problema que resuelve, beneficios, especificaciones, qué incluye, instrucciones, precauciones, preguntas, palabras clave), busca en internet lo básico del fabricante que falte (sin inventar: lo que no se sabe queda "pendiente de confirmar"), la clasifica en una categoría, procesa las fotos y la sube. Al vender un producto se marca con 0 unidades. Las categorías son flexibles (Tecnología y gadgets, Hogar y cocina, Cuidado personal, Moda y accesorios, Otros) y se crean o dividen según crezca el catálogo.

**Datos reales configurados.** WhatsApp 57 300 051 0910. Bogotá. Políticas aprobadas por el dueño: entrega personal en Bogotá en punto de encuentro seguro (Av. Américas con 68) o envío nacional por transportadora solo con pago previo y costo a cargo del comprador; pagos en efectivo, llave Bre-B o Nequi; cambios: "no aplican por cambio de opinión"; garantía del vendedor de 1 mes por defectos de fábrica (no cubre golpes, humedad, mala manipulación, sobrecargas eléctricas ni productos intervenidos; los sellados conservan además la del fabricante); política de privacidad publicada.

**Productos hoy (2).** Control Xbox Edición Limitada Forza Horizon 6, nuevo en caja, $289.000, 1 unidad (3 fotos). Control Xbox Inalámbrico Robot White, nuevo sellado, caja con maltrato leve por transporte, $189.000, 1 unidad (3 fotos). Ambos con compatibilidad, conectividad y contenido según el fabricante.

**Calidad verificada.** Auditoría técnica hecha (`tienda/AUDITORIA.md`): CLS de 1,0 a menos de 0,1, carrito saneado contra manipulación, accesibilidad del carrito y teclado, cabeceras de seguridad, sin productos de demostración ni descuentos ficticios.

## F. Historia breve (cómo se llegó aquí)

1. La tienda se construyó primero dentro del repositorio del motor del Mundial (11-15 oct), con auditoría, mejoras de conversión y el primer producto.
2. En paralelo, otras conversaciones construyeron el ICFES y la página de apoyo docente, y una conversación "Portal" las unió bajo una portada de tres puertas en la rama `main`, mientras la tienda estaba en `master`: por eso durante un tiempo aparecían "separadas".
3. El 15-16 oct se unificó todo en una rama y luego se mudó a un repositorio propio, `Emprendimientos`, dejando el motor y la app de motos aparte. Se crearon las cuatro conversaciones del grupo Emprendimientos.
4. El 19-21 oct se definió la marca Nivytek (nombre, símbolo, colores, hoja de marca), se compró nivytek.com y se conectó a Vercel; se cargó el contacto real; el ICFES recibió el módulo de exámenes de admisión y "Mi futuro".
5. El 24 oct la conversación del Portal preparó la tienda para el subdominio `tienda.nivytek.com` (para que Google vea nivytek.com como sitio educativo), pero el subdominio no existe aún en el DNS ni en Vercel, así que la portada volvió a enlazar `/tienda/` para no romper la navegación.

## G. Decisión abierta: ¿la tienda se queda en nivytek.com?

Un amigo experto del dueño recomienda **separar públicos**: nivytek.com solo para lo educativo (ICFES + docentes comparten audiencia: estudiantes, familias, colegios, docentes) y la tienda con **nombre y dominio propios**, porque mezclar gadgets con educación debilita la confianza de cada público y la autoridad temática ante Google. Claude coincide. La conversación del Portal había optado por el punto medio (subdominio con la misma marca). `.edu` no se puede comprar (reservado a universidades acreditadas de EE. UU.; `.edu.co` exige ser institución educativa reconocida).

Camino propuesto: el dueño elige un nombre para la tienda y compra su `.com` (unos USD 11 al año, en Porkbun o directamente en Vercel); Claude publica la tienda como sitio aparte desde el mismo repositorio, le hace logo provisional con la hoja de marca, quita la pestaña "Tienda" del portal educativo y ajusta las etiquetas para Google. Mientras se decide, nada se rompe: la tienda sigue en nivytek.com/tienda/.

## H. Pendientes generales

- Registrar nivytek.com en Google Search Console (gratis, 5 minutos) y enviar el mapa del sitio.
- Decidir nombre y dominio de la tienda (sección G) y, según eso, limpiar las referencias a `tienda.nivytek.com` en canonical/Open Graph.
- ICFES: aprobar el banco de admisión, ejecutar la migración 008 en Supabase, ampliar el banco para simulacros completos.
- Apoyo docente: foto real y ejemplos reales del portafolio.
- Tienda: seguir cargando productos reales con el flujo acordado; activar la función de IA del panel solo si algún día se cargan decenas de productos por semana.
- Archivar las conversaciones viejas del grupo `mundial-2026-motor` que ya no se usan.
