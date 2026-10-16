/* Construye el sitio completo para Vercel en dist/:
     /            portal de tres puertas (portal/site)
     /icfes/      app ICFES (saber11-prep, construida con Vite)
     /docentes/   apoyo docente (estático)
     /tienda/     tienda (estática)
   Uso: npm run build   (Vercel lo ejecuta solo en cada push a main) */
import { rmSync, cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const run = (cmd, cwd) => execSync(cmd, { stdio: "inherit", cwd });
if (!existsSync("saber11-prep/node_modules")) run("npm ci --no-audit --no-fund", "saber11-prep");
run("node portal/build.mjs");
rmSync("dist", { recursive: true, force: true });
cpSync("portal/dist", "dist", { recursive: true });
console.log("Sitio completo en dist/: portal, icfes, docentes y tienda");
