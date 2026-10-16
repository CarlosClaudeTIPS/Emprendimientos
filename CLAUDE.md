# Emprendimientos — instrucciones para Claude Code

Este repositorio reúne tres emprendimientos bajo un portal con pestañas. Cada uno vive en su carpeta y se edita por separado; el sitio se arma con `npm run build` (`build-sitio.mjs`).

| Carpeta | Qué es | Publicado en |
|---|---|---|
| `portal/` | Portada de tres puertas y barra común (`portal/site/shared/`) | `/` |
| `saber11-prep/` | App ICFES (React + Vite) | `/icfes/` |
| `apoyo-docente/` | Página de apoyo docente (estática) | `/docentes/` |
| `tienda/` | Tienda con pedidos por WhatsApp (estática, ver `tienda/CLAUDE.md`) | `/tienda/` |

Reglas:
- **Una sola rama: `main`.** Antes de cualquier cambio: `git fetch origin main && git merge --ff-only origin/main`. El dueño trabaja desde varios computadores y conversaciones.
- Después de cada cambio: probar, hacer commit y `git push origin main` sin que el usuario lo pida. Vercel publica solo.
- No mezclar aquí nada del motor de apuestas ni de la app de motos (viven en `mundial-2026-motor`).
- El ICFES vive solo aquí (`saber11-prep/`); el repo antiguo `saber11-prep` quedó congelado. El panel `tienda/admin.html` no se publica.
- No inventar datos del negocio (WhatsApp, políticas, precios, reseñas). Lo que falte queda como pendiente.
- Para cambiar la marca o agregar una pestaña: `portal/site/shared/portal.config.js`.
