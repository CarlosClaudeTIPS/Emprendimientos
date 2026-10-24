# Emprendimientos — instrucciones para Claude Code

Este repositorio es el sitio de la marca Nivytek: un portal modular con pestañas donde cada servicio o producto vive en su carpeta y se edita por separado; el sitio se arma con `npm run build` (`build-sitio.mjs`).

| Carpeta | Qué es | Publicado en |
|---|---|---|
| `portal/` | Portada con una puerta por sección y barra común (`portal/site/shared/`) | `/` |
| `saber11-prep/` | App ICFES (React + Vite) | `/icfes/` |
| `apoyo-docente/` | Página de apoyo docente (estática) | `/docentes/` |
| `tienda/` | Tienda con pedidos por WhatsApp (estática, ver `tienda/CLAUDE.md`) | `tienda.nivytek.com` (Vercel reescribe ese host a `/tienda/`) |

Reglas:
- **Una sola rama: `main`.** Antes de cualquier cambio: `git fetch origin main && git merge --ff-only origin/main`. El dueño trabaja desde varios computadores y conversaciones.
- Después de cada cambio: probar, hacer commit y `git push origin main` sin que el usuario lo pida. Vercel publica solo.
- No mezclar aquí nada del motor de apuestas ni de la app de motos (viven en `mundial-2026-motor`).
- El ICFES vive solo aquí (`saber11-prep/`); el repo antiguo `saber11-prep` quedó congelado. El panel `tienda/admin.html` no se publica.
- No inventar datos del negocio (WhatsApp, políticas, precios, reseñas). Lo que falte queda como pendiente.
- Nivytek se comunica como marca independiente y ampliable: nunca escribir que tiene «tres servicios» ni un catálogo cerrado; las secciones son la oferta actual. Para sumar una sección nueva basta agregarla en `portal.config.js` y crear su carpeta.
- Marca: **Nivytek**, dominio **nivytek.com** (portal en `/`, ICFES en `/icfes/`, docentes en `/docentes/`, tienda en el subdominio `tienda.nivytek.com`). La tienda va aparte para que Google vea nivytek.com como sitio de educación; sus páginas cargan la barra común desde https://nivytek.com/shared/. Para cambiar la marca o agregar una pestaña: `portal/site/shared/portal.config.js`.
