import fs from "node:fs/promises";
import path from "node:path";
import { loadHistory, saveHistory, type HistoryEntry, type PieceMetrics } from "../history";
import type { Platform } from "../../config/config";
import {
  createPost,
  getPostDetail,
  type BufferAsset,
  type BufferMetric,
  type BufferPostMode,
} from "./buffer";
import { getMediaHost } from "./media";

/**
 * Publica piezas aprobadas en Buffer.
 *
 * Buffer no acepta archivos: los assets se suben al MediaHost configurado
 * (MEDIA_HOST) y se pasa la URL pública resultante.
 */

export type PublishMode = "draft" | "queue" | "now" | "at";

export type PublishOptions = {
  project: string;
  id: string;
  mode?: PublishMode;
  /** ISO 8601 (UTC) requerido si mode = "at" */
  at?: string;
  /** limita la publicación a estas redes */
  channels?: Platform[];
};

const CHANNEL_ENV: Record<Platform, string> = {
  instagram: "BUFFER_CHANNEL_INSTAGRAM",
  linkedin: "BUFFER_CHANNEL_LINKEDIN",
  x: "BUFFER_CHANNEL_X",
};

const channelForPlatform = (platform: Platform): string | null => {
  const v = process.env[CHANNEL_ENV[platform]];
  return v && v.trim() ? v.trim() : null;
};

/** parsea las captions por plataforma del posts/<id>.md */
export async function readPieceCaptions(
  project: string,
  id: string
): Promise<Record<string, string>> {
  const file = path.join("projects", project, "posts", `${id}.md`);
  const md = await fs.readFile(file, "utf8");

  // aislar la sección "## Captions por plataforma" (hasta el próximo "## ")
  const sections = md.split(/^##\s+(.+)$/m);
  let block = "";
  for (let i = 1; i + 1 <= sections.length; i += 2) {
    if (sections[i].trim().toLowerCase() === "captions por plataforma") {
      block = sections[i + 1] ?? "";
      break;
    }
  }

  const out: Record<string, string> = {};
  const parts = block.split(/^###\s+(.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const platform = parts[i].trim().toLowerCase();
    const content = parts[i + 1]?.trim() ?? "";
    if (platform && content) out[platform] = content;
  }
  return out;
}

type BuiltAssets = { list: BufferAsset[]; kind: "image" | "video" | "none" };

async function buildAssets(entry: HistoryEntry): Promise<BuiltAssets> {
  const host = getMediaHost();

  if (entry.contentType === "static") {
    const file = entry.files.image;
    if (!file) return { list: [], kind: "none" };
    return { list: [{ image: { url: await host.upload(file) } }], kind: "image" };
  }

  if (entry.contentType === "reel") {
    const file = entry.files.video;
    if (!file) return { list: [], kind: "none" };
    return { list: [{ video: { url: await host.upload(file) } }], kind: "video" };
  }

  if (entry.contentType === "carousel") {
    const dir = path.join("projects", entry.files.slides ?? "");
    const files = (await fs.readdir(dir))
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .sort();
    const list: BufferAsset[] = [];
    for (const f of files) {
      list.push({ image: { url: await host.upload(path.join(dir, f)) } });
    }
    return { list, kind: "image" };
  }

  return { list: [], kind: "none" };
}

const resolveMode = (
  mode: PublishMode,
  at?: string
): { mode: BufferPostMode; dueAt?: string; saveToDraft?: boolean } => {
  if (mode === "draft") return { mode: "addToQueue", saveToDraft: true };
  if (mode === "now") return { mode: "shareNow" };
  if (mode === "at") {
    if (!at) throw new Error('mode "at" requiere --at con fecha ISO 8601 (UTC).');
    return { mode: "customScheduled", dueAt: at };
  }
  return { mode: "addToQueue" };
};

/** X no admite más de 280 caracteres: saca hashtags y recorta si hace falta. */
const trimForX = (text: string, max = 280): string => {
  let t = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).replace(/\s+\S*$/, "");
  return `${cut}…`;
};

export async function publishPiece(opts: PublishOptions): Promise<void> {
  const history = await loadHistory(opts.project);
  const entry = history.find((e) => e.id === opts.id);
  if (!entry) {
    throw new Error(`No se encontró "${opts.id}" en el historial de ${opts.project}.`);
  }

  const captions = await readPieceCaptions(opts.project, opts.id);
  const targets = (opts.channels ?? entry.platforms).filter((p) =>
    entry.platforms.includes(p)
  );
  if (targets.length === 0) {
    throw new Error("No hay redes destino válidas para esta pieza.");
  }

  const assets = await buildAssets(entry);
  const { mode, dueAt, saveToDraft } = resolveMode(opts.mode ?? "draft", opts.at);

  const bufferInfo: NonNullable<HistoryEntry["buffer"]> = { ...(entry.buffer ?? {}) };
  let published = 0;

  for (const platform of targets) {
    const channelId = channelForPlatform(platform);
    if (!channelId) {
      console.warn(`   ⚠️  ${platform}: sin channel ID (configurá ${CHANNEL_ENV[platform]}).`);
      continue;
    }
    try {
      const raw = captions[platform] ?? entry.hook;
      const text = platform === "x" ? trimForX(raw) : raw;
      const metadata =
        platform === "instagram"
          ? {
              instagram: {
                type: entry.contentType === "reel" ? "reel" : "post",
                ...(entry.contentType === "reel" ? {} : { shouldShareToFeed: true }),
              },
            }
          : undefined;

      const post = await createPost({
        channelId,
        text,
        mode,
        dueAt,
        saveToDraft,
        assets: assets.list.length ? assets.list : undefined,
        metadata,
      });
      bufferInfo[platform] = { postId: post.id, status: post.status, dueAt: post.dueAt };
      published++;
      console.log(
        `   ✅ ${platform}: ${post.status}${post.dueAt ? ` (${post.dueAt})` : ""} · id ${post.id}`
      );
    } catch (err) {
      console.warn(
        `   ⚠️  ${platform}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // guardar lo que sí se creó (aunque alguna red haya fallado)
  if (published > 0) {
    entry.buffer = bufferInfo;
    // solo se marca "published" cuando sale al instante; programado/cola
    // queda "approved" hasta que `buffer:metrics` confirme que se envió.
    if (mode === "shareNow") entry.status = "published";
    await saveHistory(opts.project, history);
  }

  console.log(
    `\n${saveToDraft ? "📝 Borradores creados" : "🚀 Posts creados"}: ${published}/${targets.length} red/es.`
  );
  if (published < targets.length) {
    console.log("   (las redes con error no se crearon; revisá el detalle arriba)");
  }
}

/* ─────────────── métricas (seguimiento) ─────────────── */

/** mapea los tipos de métrica de Buffer a los campos del historial */
const METRIC_MAP: Record<string, keyof PieceMetrics> = {
  impressions: "views",
  views: "views",
  reach: "views",
  reactions: "likes",
  likes: "likes",
  comments: "comments",
  reposts: "shares",
  shares: "shares",
};

const toPieceMetrics = (metrics: BufferMetric[] | null): PieceMetrics => {
  const out: PieceMetrics = {};
  for (const m of metrics ?? []) {
    const key = METRIC_MAP[m.type.toLowerCase()];
    if (key) out[key] = (out[key] ?? 0) + Math.round(m.value);
  }
  return out;
};

export type SyncMetricsResult = {
  metrics: PieceMetrics;
  platforms: Record<string, { status: string; metrics: PieceMetrics }>;
};

/**
 * Trae de Buffer las métricas de una pieza publicada y las guarda en el
 * historial (campo `metrics` + `buffer[plataforma].metrics`).
 */
export async function syncBufferMetrics(
  project: string,
  id: string
): Promise<SyncMetricsResult> {
  const history = await loadHistory(project);
  const entry = history.find((e) => e.id === id);
  if (!entry) throw new Error(`No se encontró "${id}" en el historial de ${project}.`);
  if (!entry.buffer || Object.keys(entry.buffer).length === 0) {
    throw new Error(`"${id}" no tiene publicaciones en Buffer para medir.`);
  }

  const platformMetrics: Record<string, { status: string; metrics: PieceMetrics }> = {};
  const fresh: PieceMetrics = {};

  for (const [platform, info] of Object.entries(entry.buffer)) {
    const detail = await getPostDetail(info.postId);
    const pm = toPieceMetrics(detail.metrics);
    platformMetrics[platform] = { status: detail.status, metrics: pm };
    entry.buffer[platform] = { ...info, status: detail.status, metrics: pm };
    for (const key of ["views", "likes", "comments", "shares"] as const) {
      const v = pm[key];
      if (typeof v === "number") fresh[key] = (fresh[key] ?? 0) + v;
    }
  }

  // conserva dms/leads cargados a mano; actualiza los que vienen de Buffer
  entry.metrics = { ...(entry.metrics ?? {}), ...fresh };

  // si todas las publicaciones ya salieron, la pieza pasa a "published"
  const statuses = Object.values(entry.buffer).map((b) => b.status);
  if (statuses.length > 0 && statuses.every((s) => s === "sent")) {
    entry.status = "published";
  }

  await saveHistory(project, history);
  return { metrics: entry.metrics, platforms: platformMetrics };
}
