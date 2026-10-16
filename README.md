# Emprendimientos

Un solo sitio con tres puertas: **ICFES** (preparación Saber 11), **Apoyo docente** y **Tienda** (catálogo con pedidos por WhatsApp).

```
portal/          portada y barra común (portal/site), constructor (portal/build.mjs)
saber11-prep/    app ICFES (React + Vite)
apoyo-docente/   página de apoyo docente
tienda/          tienda digital (ver tienda/README.md)
api/             funciones de servidor del ICFES publicadas por Vercel
build-sitio.mjs  arma todo en dist/ (lo ejecuta Vercel con `npm run build`)
```

## Ver en el computador

```bash
npm run build           # instala el ICFES la primera vez y arma dist/
cd dist && python -m http.server 8090   # abre http://localhost:8090
```
Para una sola sección sin construir nada: `cd tienda && python -m http.server 8080` (igual con `apoyo-docente`). En Windows, doble clic en `INICIAR-PORTAL.bat`.

## Publicar (Vercel)

Proyecto de Vercel conectado a este repositorio, rama `main`: Framework **Other**, Build Command `npm run build`, Output Directory `dist`. Cada `git push` republica el sitio. Variables de entorno opcionales: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (ICFES en la nube), `ANTHROPIC_API_KEY` (botones de IA).

## Dominio propio

Settings → Domains → Add en Vercel; copia los registros DNS (`A` y `CNAME`) en el registrador del dominio. Ver `CONTINUAR-EN-OTRO-PC.md`.
