# Continuar el trabajo en otro computador

Todo está en GitHub: `CarlosClaudeTIPS/Emprendimientos`, rama `main` (la única). Nada vive solo en un computador.

```bash
git clone https://github.com/CarlosClaudeTIPS/Emprendimientos.git
cd Emprendimientos
```

En Claude Code basta abrir esta carpeta: el archivo `CLAUDE.md` le explica la estructura y las reglas.

## Trabajar desde dos computadores sin pensar en git

Todo está automatizado en `.claude/settings.json` (viaja con el repositorio, así que aplica en los dos PC):

- **Al abrir un chat** (gancho `SessionStart`): baja lo último de GitHub. Lo que hiciste en el otro PC ya está.
- **Al terminar cada respuesta de Claude** (gancho `Stop`, `.claude/hooks/subir.sh`): si quedó algo sin subir, lo
  sube a `main`. Vercel publica solo en 2-3 minutos. Si el otro PC subió algo que choca, el gancho avisa y se le pide
  a Claude que resuelva el conflicto.
- **Permisos**: git, npm y la construcción del sitio están preaprobados para que Claude no pregunte.
- Comandos opcionales: `/iniciar` (resumen de lo nuevo) y `/cerrar` (verificar y subir con un buen mensaje).

Requisitos en cada PC: Git, Node.js LTS y haber clonado el repositorio una vez (arriba). En Windows, Claude Code
usa Git Bash para los ganchos; viene con Git para Windows.

## Qué hay

| Carpeta | Proyecto | Dirección en el sitio |
|---|---|---|
| `portal/` | Portada con una puerta por sección y barra común | `/` |
| `saber11-prep/` | ICFES | `/icfes/` |
| `apoyo-docente/` | Apoyo docente | `/docentes/` |
| `tienda/` | Tienda | `/tienda/` |

El motor de apuestas y la app de motos están en otro repositorio (`mundial-2026-motor`) y no se mezclan con esto.

## Ver cada cosa

- Tienda: `cd tienda && python -m http.server 8080` → http://localhost:8080
- Apoyo docente: `cd apoyo-docente && python -m http.server 8081`
- ICFES: `cd saber11-prep && npm ci && npm run dev`
- Portal completo: `npm run build` y luego `cd dist && python -m http.server 8090` (Windows: `INICIAR-PORTAL.bat`)

## Publicación y dominio

Vercel publica la rama `main` automáticamente. Para el dominio propio: en Vercel, Settings → Domains → Add → escribe el dominio; Vercel muestra un registro `A` y un `CNAME` que se copian en el panel DNS del registrador. Suele responder en menos de una hora.
