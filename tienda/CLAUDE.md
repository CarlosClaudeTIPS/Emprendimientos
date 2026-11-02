# Tienda digital — instrucciones para Claude Code

- Esta carpeta es un proyecto independiente. No tocar `src/`, `api/`, `supabase/`, `saber11-prep/`, `apoyo-docente/` ni `portal/` al trabajar en la tienda.
- La tienda se publica en `/tienda/` dentro del portal (`build-sitio.mjs` en la raíz la copia y le añade la barra común `portal/site/shared/barra.js`). No hace falta configurar nada para eso.
- **Antes de cualquier cambio, traer lo último del repositorio** (`git fetch origin main && git merge --ff-only origin/main`). El dueño trabaja desde varios computadores y sus cambios deben respetarse siempre.
- Después de cada cambio: probar con un servidor local (`python3 -m http.server`), hacer commit y `git push origin main` sin que el usuario tenga que pedirlo.
- Si el usuario comparte `catalogo.json` o `config.json` exportados desde `admin.html`, reemplazarlos en `data/` y subirlos.
- No inventar datos del negocio (número de WhatsApp, políticas, precios anteriores, reseñas). Lo que falte se deja como pendiente.
- Lee `README.md` de esta carpeta para la estructura, el modelo de datos y la publicación.

## Productos por encargo (hoja → tienda)
- Fuente: pestaña **"Publicado en tienda"** del Google Sheet "Catálogo Nivytek (tienda)" (ID `1m1vI1PVkYpc2KIuLPcT_rlCTLbAcxF7hPgxuHE19x5s`). Columnas: ID, Estado en la tienda, Categoría, Producto, Descripción corta, Foto (URL), Precio de venta, Modalidad, Oferta válida hasta, Publicado el, Notas internas.
- **Antes de publicar un producto, preguntarle a Carlos el precio de venta** y escribir en la hoja solo el que él confirme. Nunca publicar costos, ganancias ni links de compra.
- La tienda lee **en vivo** la pestaña "Vitrina (pública)" (publicada en la web como CSV, URL en `data/config.json` → `vitrina.csv`): trae solo las filas con la casilla **Publicar** marcada en "Publicado en tienda". Los botones de la hoja (Publicar, Bajar, Subir de 2.000 o 5.000) los maneja un Apps Script `onEdit` de la propia hoja. `data/encargo.json` queda como respaldo si la hoja no responde.
- Respaldo manual: leer la pestaña y regenerar `data/encargo.json` (`{ actualizado, productos: [{ id, estado, categoria, nombre, descripcion, foto, precio, modalidad, ofertaHasta, publicado }] }`), probar, commit y push. `js/app.js` (`T.agregarEncargo`) los mezcla con el catálogo, les pone la etiqueta "Por encargo" y el mensaje de WhatsApp de encargo (llega en máximo 15 días, se separa con $20.000 o el 10%).
- Estados: "Disponible por encargo", "Consultar disponibilidad", "Agotado - avisar cuando vuelva" (botón "Avísame cuando vuelva") y "Oculto" (no sale).
- Columna "Descripción completa" de la hoja: primera línea `Marca: X`, párrafo, viñetas `- ` (beneficios) y secciones `Cómo se usa:`, `Precauciones:`, `Ingredientes clave: ...`, `Incluye:`. Columna "Guía en español que se envía" (Guía de uso / de instalación / No aplica) → la ficha dice que se envía la guía por WhatsApp. En cosméticos (empaques en inglés) la descripción debe ser fiel a la etiqueta, con modo de uso y contraindicaciones.

## Checklist obligatorio cada vez que se agrega un producto a la venta (regla de Carlos: "hazle TODO")
1. Nombre con marca, categoría correcta, foto (URL de Amazon `_AC_SL500_`) y link "Ver producto".
2. Descripción corta y descripción completa fiel a la etiqueta/página oficial, en español: `Marca:`, beneficios, `Cómo se usa:`, `Precauciones:` (contraindicaciones, alergias, embarazo, niños), `Ingredientes clave:` en cosméticos, `Incluye:` si aplica.
3. Guía en español que se envía (uso / instalación / no aplica) y la guía misma lista para mandar por WhatsApp.
4. Costo, precio de referencia en Colombia (Mercado Libre y Google) y precio sugerido; preguntarle a Carlos el precio antes de marcar Publicar.
5. Modalidad (Disponible ya / Por encargo), unidades y estado. Verificar que la oferta siga vigente y que se envíe a Colombia.
