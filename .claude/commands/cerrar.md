---
description: Cerrar el día — sube todo a GitHub y Vercel actualiza la web sola
---

Rutina de cierre de sesión en Emprendimientos:

1. Verifica que el sitio arma: `npm run build` (y `cd saber11-prep && npx vitest run` si se tocó el ICFES). Si algo falla, arréglalo antes de subir.
2. `git add -A` y `git commit` con un mensaje REAL de lo que se hizo (revisa el diff; nunca un mensaje genérico).
3. `git fetch origin main && git merge --ff-only origin/main` (si no es ff, `git merge origin/main`), luego `git push origin main`.
4. Confirma: "Subido ✅" con un resumen de 1-2 líneas. Vercel publica solo en 2-3 minutos; no hace falta desplegar a mano.

Si no hay cambios que subir, dilo y termina.
