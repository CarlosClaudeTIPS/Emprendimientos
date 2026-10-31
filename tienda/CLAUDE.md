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
- Para publicar: leer la pestaña y regenerar `data/encargo.json` (`{ actualizado, productos: [{ id, estado, categoria, nombre, descripcion, foto, precio, modalidad, ofertaHasta, publicado }] }`), probar, commit y push. `js/app.js` (`T.agregarEncargo`) los mezcla con el catálogo, les pone la etiqueta "Por encargo" y el mensaje de WhatsApp de encargo (llega en máximo 15 días, se separa con $20.000 o el 10%).
- Estados: "Disponible por encargo", "Consultar disponibilidad", "Agotado - avisar cuando vuelva" (botón "Avísame cuando vuelva") y "Oculto" (no sale).
