import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { generateContent, reRender } from "../pipeline/generate-content";
import { loadProject } from "../project/load-project";
import { TEMPLATE_IDS, type FormatId } from "../../config/config";
import { PROJECTS_DIR } from "../../config/paths";

const program = new Command();

program.name("content-engine").description("Generador de contenido de marketing (Reels) con Remotion + IA").version("0.1.0");

program
  .command("generate")
  .description("Genera contenido para un proyecto: ideas → guion → storyboard → render → caption")
  .argument("<project>", "nombre del proyecto (carpeta en projects/)")
  .option("-c, --count <n>", "cantidad de contenidos a generar", "1")
  .option("-f, --format <format>", "formato del video: 9:16 | 1:1 | 16:9", "9:16")
  .action(async (project: string, opts: { count: string; format: string }) => {
    const count = Math.max(1, Math.min(10, parseInt(opts.count, 10) || 1));
    const format = (["9:16", "1:1", "16:9"].includes(opts.format) ? opts.format : "9:16") as FormatId;
    try {
      await generateContent({ projectName: project, count, format });
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("render")
  .description("Re-renderiza un contenido ya generado desde su storyboard")
  .argument("<project>", "nombre del proyecto")
  .argument("<contentId>", "id del contenido (ej: reel-20260904-120000)")
  .action(async (project: string, contentId: string) => {
    try {
      await reRender(project, contentId);
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("Lista proyectos disponibles y sus assets")
  .action(async () => {
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(PROJECTS_DIR, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      /* projects/ no existe todavía */
    }
    if (entries.length === 0) {
      console.log("No hay proyectos. Creá uno con: pnpm project:create <nombre>");
      return;
    }
    for (const name of entries) {
      try {
        const info = await loadProject(name);
        console.log(`📁 ${name} — ${info.assets.length} assets`);
      } catch (err) {
        console.log(`📁 ${name} — ⚠️ ${err instanceof Error ? err.message : err}`);
      }
    }
  });

program
  .command("studio")
  .description("Abre Remotion Studio para previsualizar composiciones")
  .action(() => {
    const child = spawn("pnpm", ["exec", "remotion", "studio", "src/remotion/index.ts"], {
      stdio: "inherit",
      cwd: path.resolve(import.meta.dirname, "..", ".."),
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  });

program
  .command("templates")
  .description("Lista los templates disponibles")
  .action(() => {
    console.log("Templates disponibles:");
    for (const t of TEMPLATE_IDS) console.log(`  - ${t}`);
  });

program.parse(process.argv);
