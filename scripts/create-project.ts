import fs from "node:fs/promises";
import path from "node:path";
import { PROJECTS_DIR } from "../config/paths";

const INFO_TEMPLATE = (name: string) => `# ${name}

## Descripción

TODO: describí el proyecto en 2-4 líneas. Qué es, qué problema resuelve, qué lo hace distinto.

## Servicios

- TODO: servicio 1
- TODO: servicio 2

## Tecnologías

- TODO: tecnologías principales

## Proyectos destacados

- TODO: proyecto o trabajo destacado 1
- TODO: proyecto destacado 2

## Propuesta de valor

TODO: por qué elegir este proyecto/servicio sobre alternativas. 2-3 líneas.

## Público objetivo

TODO: quién es la audiencia ideal (rol, industria, tamaño).

## Tono de comunicación

TODO: ej. directo, profesional, cercano, sin tecnicismos innecesarios.

## URLs

- Sitio: https://example.com

## CTA

TODO: acción que querés que haga el espectador (ej: escribir por WhatsApp, visitar el sitio).
`;

const SUBDIRS = ["assets", "assets/screenshots", "assets/logo", "scripts", "storyboards", "videos", "posts"];

async function main() {
  const name = process.argv[2];
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error("Uso: pnpm project:create <nombre>  (minúsculas, guiones)");
    process.exit(1);
  }
  const dir = path.join(PROJECTS_DIR, name);
  try {
    await fs.access(dir);
    console.error(`El proyecto "${name}" ya existe en ${dir}`);
    process.exit(1);
  } catch {
    /* ok, no existe */
  }
  for (const sub of SUBDIRS) {
    await fs.mkdir(path.join(dir, sub), { recursive: true });
  }
  await fs.writeFile(path.join(dir, "info.md"), INFO_TEMPLATE(name), "utf8");
  console.log(`✅ Proyecto creado en ${dir}`);
  console.log(`\nPróximo paso: editá ${path.join(dir, "info.md")} con la info real del proyecto.`);
  console.log(`Después agregá tus assets (screenshots, logos) en ${path.join(dir, "assets")}.`);
  console.log(`\nGenerá contenido con: pnpm generate ${name}`);
}

main();
