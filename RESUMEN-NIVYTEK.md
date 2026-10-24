# Nivytek — resumen del proyecto (24 de octubre de 2026)

Para pegar al inicio de cualquier conversación con Claude. Fuente de verdad: repositorio GitHub `CarlosClaudeTIPS/Emprendimientos`, rama única `main`, publicado automáticamente por Vercel en **https://nivytek.com**. Dueño: Carlos (Bogotá). Correo de contacto: nivytek@hotmail.com.

## Estructura general
- **nivytek.com/** → portada "portal" con una puerta por sección y una barra oscura común arriba de todas las páginas (`portal/`). Marca Nivytek: símbolo N azul→verde con punto amarillo, tipografías Nunito y Source Sans 3, fondo crema. Hoja de marca en `docs/identidad-nivytek.md`.
- **nivytek.com/icfes/** → app ICFES (`saber11-prep/`).
- **nivytek.com/docentes/** → página de apoyo docente (`apoyo-docente/`).
- **nivytek.com/tienda/** → tienda con pedidos por WhatsApp (`tienda/`).
- Cada sección se edita en su carpeta; `npm run build` (`build-sitio.mjs`) arma todo. Cada `git push` a `main` publica solo.
- El motor de apuestas y la app de motos están en OTRO repositorio (`mundial-2026-motor`) y no se mezclan.
- Hay 4 conversaciones de Claude Code en el grupo "Emprendimientos": Tienda, Apoyo docente, ICFES y Portal (las tres a la vez).

## 1. ICFES (Saber 11 · Preparación)
Plataforma web (React + Vite, PWA, funciona sin conexión) para preparar estudiantes de colegio público para Saber 11. Sin inteligencia artificial por decisión del proyecto.
- Roles: estudiante, docente, admin. Modo local (datos en el navegador) o nube con Supabase (proyecto `saber11-prep`).
- Contenido: 500 preguntas explicadas (100 por materia) con retroalimentación por distractor; taxonomía; programa de 24 semanas; estructura del examen 2026-2; catálogo de carreras ("modo carrera": el estudiante elige hasta 3 carreras y la app prioriza).
- Funciones: práctica, mini-pruebas, simulacros cronometrados por sesión, bitácora de errores, panel del docente (errores frecuentes, acciones sugeridas, doble ruta semanal, conteo por subhabilidad), informes de mejoramiento individual y por grupo con percentil nacional (datos abiertos ICFES) y exportación PDF/CSV, modo papel imprimible, importar preguntas desde PDF/texto (quedan pendientes hasta aprobación), planes de acceso por grupo (completo o lotes mensuales), biblioteca de recursos con aprobación, rol revisor de solo lectura.
- Reciente (21-22 oct): módulo de exámenes de admisión propios (Universidad Nacional y UdeA) con ~140 preguntas borrador originales, generador de figuras para análisis de imagen, panel del docente por ruta.
- Pendiente/no incluido: motor adaptativo, búsqueda semántica, videos, banco pequeño para simulacro real completo, importación CSV, accesibilidad auditada, modo claro. Fechas del examen 2027 provisionales. Demo local: usuarios `admin`, `docente`, `est1…est6`, PIN 1234.

## 2. Apoyo docente
Página estática (HTML/CSS/JS, todo editable en `apoyo-docente/config.js`) que ofrece acompañamiento personalizado a docentes: planeaciones, guías y talleres, rúbricas y evaluaciones, materiales, inclusión (PIAR). Principio: no vender documentos genéricos sino apoyo con alcance definido según necesidad, contexto y tiempo del docente.
- Secciones: portada con áreas, "No hay dos docentes iguales", "Una docente de aula, no una agencia" (quién está detrás), testimonios, cinco áreas de apoyo, proceso en 4 pasos, catálogo de ejemplos con buscador y filtros (11 demos con PDF y vista previa), "Cuéntame qué necesitas" (pedido guiado que arma un resumen para enviar por WhatsApp), calculadora de precio estimado en Cotización, preguntas frecuentes, condiciones, política de privacidad, aviso PIAR.
- Contacto real configurado (WhatsApp y correo). Pendientes: foto real de la profesional, ejemplos reales del portafolio (hoy demos), formulario Formspree opcional.

## 3. Tienda
Catálogo estático con pedidos por WhatsApp (sin pagos en línea ni inventario conectado). Datos en `tienda/data/catalogo.json` y `config.json`; panel local `tienda/admin.html` (edita borradores, exporta JSON/CSV, botón "Completar con IA" con vía manual; no se publica).
- Funciones: portada, catálogo con buscador con autocompletado, filtros y orden; ficha de producto con galería deslizable y zoom, variantes, cantidad, "Pedir por WhatsApp", "Consultar disponibilidad", carrito con resumen por WhatsApp, unidades disponibles, estado "Vendido" con botón "Quiero uno igual", encuesta "¿Qué te gustaría encontrar?", preguntas frecuentes de confianza, páginas de preguntas y políticas, barra inferior móvil, SEO básico y datos estructurados, páginas estáticas por producto para compartir en redes (`generar-paginas.mjs`). Auditoría de rendimiento y accesibilidad hecha (CLS < 0,1).
- WhatsApp de la tienda: 57 300 051 0910. Ciudad: Bogotá.
- Políticas aprobadas por el dueño: entrega personal en Bogotá (Av. Américas con 68) o envío nacional con pago previo (costo a cargo del comprador); pagos en efectivo, llave Bre-B o Nequi; cambios "no aplican por cambio de opinión"; garantía del vendedor 1 mes por defectos de fábrica con exclusiones; privacidad publicada.
- Productos (2, ambos 1 unidad): Control Xbox Edición Limitada Forza Horizon 6 ($289.000) y Control Xbox Robot White nuevo sellado, caja con maltrato leve ($189.000). Categorías flexibles (Tecnología, Hogar, Cuidado personal, Moda, Otros); solo se muestran las que tienen productos.
- Flujo de trabajo: el dueño envía foto/captura con precio; Claude crea la ficha completa (buscando lo básico del fabricante en internet, sin inventar), la clasifica y la sube. Al vender: poner `stock: 0`.

## Decisión abierta (24 oct)
La conversación del Portal preparó la tienda para `tienda.nivytek.com`, pero el subdominio no existe aún (sin DNS ni dominio en Vercel), así que la portada volvió a enlazar `/tienda/`. Un amigo experto recomienda separar públicos: nivytek.com solo para lo educativo (ICFES + docentes) y la tienda con **nombre y dominio propios**. Claude coincide (autoridad temática en Google y coherencia de marca). `.edu` no se puede comprar. Falta que el dueño elija el nombre de la tienda y compre su dominio; luego se publica como sitio aparte desde el mismo repositorio y se quita la pestaña Tienda del portal educativo.

## Otros pendientes
- Registrar nivytek.com en Google Search Console (gratis).
- Archivar conversaciones viejas del grupo `mundial-2026-motor` si estorban.
