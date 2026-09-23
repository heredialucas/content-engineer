import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  generateCreativeContent,
  recordFeedback,
  reRender,
} from "../pipeline/generate";
import { loadProject } from "../project/load-project";
import { loadHistory, setEntryStatus, type PieceMetrics } from "../history";
import { publishPiece, syncBufferMetrics } from "../publish";
import { getChannels, getOrganizations } from "../publish/buffer";
import {
  CONTENT_TYPES,
  PLATFORMS,
  type ContentType,
  type Platform,
} from "../../config/config";
import { STATIC_LAYOUTS, type StaticLayout } from "../specs";
import { PROJECTS_DIR } from "../../config/paths";

const program = new Command();

program
  .name("content-engine")
  .description("Sistema creativo de contenido v4: un design system propio + motor de ideas vivo")
  .version("0.4.0");

program
  .command("generate-content")
  .description("Pipeline: análisis → briefs (hooks del banco) → composición → render → captions")
  .argument("<project>", "nombre del proyecto (carpeta en projects/)")
  .option("-c, --count <n>", "cantidad de piezas (mientras validamos: 1)", "1")
  .option("-p, --platform <platform>", "red: instagram | linkedin | x (default: todas)")
  .option("-f, --format <format>", "tipo: auto | reel | static | carousel | linkedin-post | x-post | thread", "auto")
  .option("-a, --aspect <aspect>", "aspecto: reel 9:16|1:1|16:9 · static/carousel 4:5|1:1|16:9")
  .option("-l, --layout <layout>", "layout de static: stack | product-shot | editorial-split | tech-card")
  .action(
    async (
      project: string,
      opts: { count: string; platform?: string; format?: string; aspect?: string; layout?: string }
    ) => {
      const count = Math.max(1, Math.min(4, parseInt(opts.count, 10) || 1));
      const platform = (
        opts.platform && PLATFORMS.includes(opts.platform as Platform)
          ? opts.platform
          : "all"
      ) as Platform | "all";
      const format = (
        opts.format && (CONTENT_TYPES as readonly string[]).includes(opts.format)
          ? opts.format
          : "auto"
      ) as ContentType | "auto";
      const layout =
        opts.layout && (STATIC_LAYOUTS as readonly string[]).includes(opts.layout)
          ? (opts.layout as StaticLayout)
          : undefined;
      try {
        await generateCreativeContent({ projectName: project, count, platform, format, aspect: opts.aspect, layout });
      } catch (err) {
        console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    }
  );

program
  .command("render")
  .description("Re-renderiza una pieza desde su spec (sin gastar tokens)")
  .argument("<project>", "nombre del proyecto")
  .argument("<contentId>", "id de la pieza (ej: reel-20260907-120000-123)")
  .action(async (project: string, contentId: string) => {
    try {
      await reRender(project, contentId);
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("feedback")
  .description("Carga métricas de una pieza publicada (loop de aprendizaje)")
  .argument("<project>", "nombre del proyecto")
  .argument("<contentId>", "id de la pieza")
  .option("--views <n>", "vistas")
  .option("--likes <n>", "likes")
  .option("--comments <n>", "comentarios")
  .option("--shares <n>", "compartidos")
  .option("--dms <n>", "mensajes directos recibidos")
  .option("--leads <n>", "consultas/leads calificados")
  .action(async (project: string, contentId: string, opts: Record<string, string | undefined>) => {
    const metrics: PieceMetrics = {};
    for (const key of ["views", "likes", "comments", "shares", "dms", "leads"] as const) {
      const v = opts[key];
      if (v != null) metrics[key] = parseInt(v, 10) || 0;
    }
    if (Object.keys(metrics).length === 0) {
      console.error("❌ Pasá al menos una métrica (ej: --views 1200 --dms 3)");
      process.exit(1);
    }
    try {
      await recordFeedback({ projectName: project, contentId, metrics });
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("knowledge:refresh")
  .description("Busca hooks nuevos en las fuentes de knowledge/sources.json y actualiza el banco")
  .action(async () => {
    try {
      const { refreshKnowledge } = await import("../../scripts/refresh-knowledge");
      await refreshKnowledge();
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("approve-content")
  .description("Marca una pieza como aprobada (o published con --status)")
  .argument("<project>", "nombre del proyecto")
  .argument("<contentId>", "id de la pieza")
  .option("-s, --status <status>", "draft | approved | published", "approved")
  .action(async (project: string, contentId: string, opts: { status: string }) => {
    const status = ["draft", "approved", "published"].includes(opts.status)
      ? (opts.status as "draft" | "approved" | "published")
      : "approved";
    try {
      const ok = await setEntryStatus(project, contentId, status);
      if (!ok) {
        console.error(`\n❌ No se encontró "${contentId}" en el historial de ${project}.`);
        process.exit(1);
      }
      console.log(`✅ ${contentId} → ${status}`);
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("publish-content")
  .description("Publica una pieza en Buffer (sin id: lista las aprobadas)")
  .argument("<project>", "nombre del proyecto")
  .argument("[contentId]", "id de la pieza a publicar")
  .option("-m, --mode <mode>", "draft | queue | now | at", "draft")
  .option("--at <iso>", "fecha ISO 8601 UTC (requerido para mode=at)")
  .option("--channels <csv>", "limitar a instagram,linkedin,x")
  .action(
    async (
      project: string,
      contentId: string | undefined,
      opts: { mode: string; at?: string; channels?: string }
    ) => {
      try {
        if (!contentId) {
          const history = await loadHistory(project);
          const approved = history.filter((e) => e.status === "approved");
          if (approved.length === 0) {
            console.log("No hay piezas aprobadas. Aprobá una con: pnpm approve-content <project> <id>");
            return;
          }
          console.log(`Piezas aprobadas listas para publicar (${approved.length}):`);
          for (const e of approved) {
            console.log(`  • ${e.id} — ${e.contentType} → ${e.platforms.join("/")}`);
          }
          console.log("\nPublicá una con: pnpm publish-content <project> <id> [--mode draft|queue|now|at]");
          return;
        }
        const mode = (["draft", "queue", "now", "at"].includes(opts.mode)
          ? opts.mode
          : "draft") as "draft" | "queue" | "now" | "at";
        const channels = opts.channels
          ? (opts.channels
              .split(",")
              .map((s) => s.trim())
              .filter((s) => PLATFORMS.includes(s as Platform)) as Platform[])
          : undefined;
        await publishPiece({ project, id: contentId, mode, at: opts.at, channels });
      } catch (err) {
        console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    }
  );

program
  .command("buffer:channels")
  .description("Lista las organizations y canales conectados en Buffer")
  .action(async () => {
    try {
      const orgs = await getOrganizations();
      if (orgs.length === 0) {
        console.log("No hay organizations en la cuenta de Buffer.");
        return;
      }
      for (const org of orgs) {
        console.log(`\n🏢 ${org.name} (${org.id})`);
        const channels = await getChannels(org.id);
        for (const c of channels) {
          const flag = c.isDisconnected ? " ⚠️ desconectado" : c.isLocked ? " 🔒 bloqueado" : "";
          console.log(`   • [${c.service}] ${c.name} — ${c.id}${flag}`);
        }
      }
      console.log("\n💡 Poné los channel IDs en .env: BUFFER_CHANNEL_INSTAGRAM / _LINKEDIN / _X");
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("buffer:metrics")
  .description("Trae de Buffer las métricas de una pieza publicada y las guarda en el historial")
  .argument("<project>", "nombre del proyecto")
  .argument("<contentId>", "id de la pieza")
  .action(async (project: string, contentId: string) => {
    try {
      const res = await syncBufferMetrics(project, contentId);
      console.log(`📊 ${contentId} — métricas actualizadas:`);
      for (const [platform, data] of Object.entries(res.platforms)) {
        const parts = Object.entries(data.metrics).map(([k, v]) => `${k}: ${v}`);
        console.log(
          `   • ${platform} [${data.status}]: ${
            parts.length ? parts.join(" · ") : "sin métricas (la red no expone insights)"
          }`
        );
      }
      const agg = Object.entries(res.metrics).map(([k, v]) => `${k}: ${v}`).join(" · ");
      console.log(`\n   total: ${agg || "sin datos"}`);
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
        const history = await loadHistory(name);
        console.log(`📁 ${name} — ${info.assets.length} assets, ${history.length} piezas en historial`);
      } catch (err) {
        console.log(`📁 ${name} — ⚠️ ${err instanceof Error ? err.message : err}`);
      }
    }
  });

program
  .command("studio")
  .description("Abre Remotion Studio para previsualizar piezas (sincroniza previews)")
  .action(async () => {
    try {
      const { syncAllPreviews } = await import("../previews/sync");
      const results = await syncAllPreviews();
      const total = results.reduce((a, r) => a + r.pieces, 0);
      console.log(` previews: ${total} pieza(s) sincronizada(s)`);
    } catch {
      /* sin previews: los demos de Root siguen funcionando */
    }
    const child = spawn("pnpm", ["exec", "remotion", "studio", "src/remotion/index.ts"], {
      stdio: "inherit",
      cwd: path.resolve(import.meta.dirname, "..", ".."),
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  });

program.parse(process.argv);
