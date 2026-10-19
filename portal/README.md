# Portal unificado

Una portada con pestañas que reúne los proyectos del repositorio bajo un solo dominio:

| Dirección | Carpeta de origen | Tipo |
|---|---|---|
| `/` | `portal/site/` | Portada con las puertas |
| `/icfes/` | `saber11-prep/` | App React (se construye con Vite) |
| `/docentes/` | `apoyo-docente/` | Sitio estático |
| `/tienda/` | `tienda/` | Sitio estático |

Cada proyecto se sigue editando en su propia carpeta. El portal solo los **copia y construye** en `portal/dist/`.

> **Publicación actual:** el sitio de Vercel conectado al repositorio `Emprendimientos` publica la rama `main` con `build-sitio.mjs` (en la raíz del repositorio), que arma este portal en `/`, el ICFES en `/icfes/`, Apoyo docente en `/docentes/` y la Tienda en `/tienda/`. El motor del Mundial ya no forma parte de este sitio.

## Armar el portal

```bash
node portal/build.mjs          # para Vercel o dominio propio (ICFES en /icfes/)
BASE=./ node portal/build.mjs  # rutas relativas (vista previa local)
```
Requiere haber instalado las dependencias del ICFES una vez: `cd saber11-prep && npm ci`.

## Cambiar la marca o agregar una pestaña

Todo está en `portal/site/shared/portal.config.js`: nombre de la marca, lema y la lista de secciones (nombre, carpeta, color, textos). Para un proyecto nuevo, crea su carpeta, agrégalo a la lista y vuelve a armar.

## Publicar en Vercel (gratis) y conectar el dominio

1. Entra a https://vercel.com con tu cuenta de GitHub → **Add New → Project** → elige `Emprendimientos`.
2. En la configuración del proyecto:
   - **Root Directory:** déjalo en la raíz (no cambiar)
   - **Framework Preset:** Other
   - **Build Command:** `npm run build` (ya viene en el `package.json` de la raíz)
   - **Output Directory:** `dist`
   - **Production Branch:** `main`
3. Variables de entorno (solo si quieres el ICFES con nube; sin ellas funciona en modo local):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Deploy.** En dos o tres minutos tendrás una dirección `algo.vercel.app` con las tres secciones.
5. Dominio propio: **Settings → Domains → Add** → escribe `nivytek.com` (y también `www.nivytek.com`). Vercel te muestra dos registros
   (un `A` y un `CNAME`). Los copias en el panel de tu registrador (Porkbun o MI.COM.CO) → DNS. En menos de una hora responde.

Cada vez que hagas `git push` a `main`, Vercel vuelve a publicar solo.

`portal/vercel.json` deja la app del ICFES como aplicación de una sola página y `portal/api/` publica
sus funciones de servidor (`/api/estudiantes`, `/api/pin`).
