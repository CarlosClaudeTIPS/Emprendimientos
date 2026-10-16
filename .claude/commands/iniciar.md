---
description: Sincronizar al empezar — baja los cambios del otro PC y resume qué hay de nuevo
---

Rutina de inicio de sesión en Emprendimientos (ICFES, Apoyo docente, Tienda y portal):

1. `git fetch origin main && git merge --ff-only origin/main`.
2. Si bajaron commits nuevos, lista en 2-3 puntos qué cambió (en lenguaje simple) y en qué carpeta.
3. Si cambió `saber11-prep/package-lock.json`, corre `cd saber11-prep && npm ci`.
4. Confirma en una línea: "Sincronizado ✅ — [resumen]" o "Ya estabas al día".

No construyas el sitio ni despliegues en este paso: Vercel publica solo con cada push.
