import fs from "node:fs/promises";
import path from "node:path";
import { PROJECTS_DIR } from "../../config/paths";
import type { ContentType, Platform } from "../../config/config";
import { CATEGORIES, type ContentCategory } from "../../config/content-mix";

export type PieceStatus = "draft" | "approved" | "published";

/** métricas cargadas manualmente después de publicar (feedback loop) */
export type PieceMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  dms?: number;
  leads?: number;
};

export type HistoryEntry = {
  id: string;
  /** ISO date */
  date: string;
  project: string;
  platforms: Platform[];
  contentType: ContentType;
  category: ContentCategory;
  /** tema general (ej: "Fundswin release") */
  topic: string;
  hook: string;
  /** estructura de hook usada (src/knowledge/structures.ts) */
  hookStructure?: string;
  idea: string;
  /** archivos generados, label → ruta relativa a projects/<n>/ */
  files: Record<string, string>;
  status: PieceStatus;
  /** feedback de resultados (cargado con `pnpm feedback`) */
  metrics?: PieceMetrics;
  /** publicaciones en Buffer: plataforma → post creado */
  buffer?: Record<
    string,
    { postId: string; status: string; dueAt: string | null; metrics?: PieceMetrics }
  >;
};

const historyFile = (projectName: string) =>
  path.join(PROJECTS_DIR, projectName, "history", "history.json");

export async function loadHistory(projectName: string): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(historyFile(projectName), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendHistory(
  projectName: string,
  entry: HistoryEntry
): Promise<void> {
  const list = await loadHistory(projectName);
  list.push(entry);
  const file = historyFile(projectName);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(list, null, 2), "utf8");
}

export async function setEntryStatus(
  projectName: string,
  contentId: string,
  status: PieceStatus
): Promise<boolean> {
  const list = await loadHistory(projectName);
  const entry = list.find((e) => e.id === contentId);
  if (!entry) return false;
  entry.status = status;
  await fs.writeFile(historyFile(projectName), JSON.stringify(list, null, 2), "utf8");
  return true;
}

/** guarda la lista completa del historial (uso interno del pipeline) */
export async function saveHistory(
  projectName: string,
  list: HistoryEntry[]
): Promise<void> {
  const file = historyFile(projectName);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(list, null, 2), "utf8");
}

export async function setEntryMetrics(
  projectName: string,
  contentId: string,
  metrics: PieceMetrics
): Promise<boolean> {
  const list = await loadHistory(projectName);
  const entry = list.find((e) => e.id === contentId);
  if (!entry) return false;
  entry.metrics = { ...(entry.metrics ?? {}), ...metrics };
  await fs.writeFile(historyFile(projectName), JSON.stringify(list, null, 2), "utf8");
  return true;
}

/* ─────────────── resumen para prompts ─────────────── */

export function summarizeForPrompt(history: HistoryEntry[], last = 25): string {
  if (history.length === 0) {
    return "HISTORIAL: vacío (todavía no hay contenido generado para este proyecto).";
  }
  const recent = history.slice(-last);
  const lines = recent.map((e) => {
    const platforms = e.platforms.join("/");
    const structure = e.hookStructure ? ` | estructura: ${e.hookStructure}` : "";
    const metrics = e.metrics ? ` | métricas: ${metricsLine(e.metrics)}` : "";
    return `- [${e.date.slice(0, 10)}] ${e.contentType} (${platforms}) | ${e.category}${structure} | hook: "${e.hook}" | tema: ${e.topic}${metrics}`;
  });
  const fmt = formatDistribution(history);
  const cat = categoryDistribution(history);
  const struct = structureDistribution(history);
  const fmtLine = Object.entries(fmt)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}×${n}`)
    .join(", ");
  const catLine = Object.entries(cat)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}×${n}`)
    .join(", ");
  const structLine = Object.entries(struct)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}×${n}`)
    .join(", ");
  return `HISTORIAL RECIENTE (evitá repetir estos hooks, temas, ángulos y estructuras):
${lines.join("\n")}

Distribución de formatos (todo el historial): ${fmtLine || "vacía"}
Distribución de categorías (todo el historial): ${catLine || "vacía"}
Distribución de estructuras de hook (todo el historial): ${structLine || "vacía"}`;
}

const metricsLine = (m: PieceMetrics): string =>
  [
    m.views != null ? `${m.views} vistas` : null,
    m.likes != null ? `${m.likes} likes` : null,
    m.dms != null ? `${m.dms} dms` : null,
    m.leads != null ? `${m.leads} leads` : null,
  ]
    .filter(Boolean)
    .join(", ");

/** sección de feedback para el prompt del director (qué funcionó) */
export function feedbackSummary(history: HistoryEntry[], top = 5): string {
  const withMetrics = history.filter((e) => e.metrics);
  if (withMetrics.length === 0) {
    return "MÉTRICAS: todavía no hay feedback cargado (usá `pnpm feedback <project> <id>` cuando publiques).";
  }
  const ranked = [...withMetrics]
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, top);
  const lines = ranked.map(
    (e) =>
      `- [${e.date.slice(0, 10)}] ${e.contentType} | ${e.category} | "${e.hook}" → ${metricsLine(e.metrics!)}`
  );
  return `MÉTRICAS — PIEZAS CON MEJOR RENDIMIENTO (reforzá estos ángulos/estructuras, sin repetir el hook):
${lines.join("\n")}`;
}

const scoreOf = (e: HistoryEntry): number => {
  const m = e.metrics ?? {};
  return (m.views ?? 0) * 0.001 + (m.likes ?? 0) * 0.5 + (m.dms ?? 0) * 10 + (m.leads ?? 0) * 40;
};

/* ─────────────── anti-repetición ─────────────── */

/** normaliza un hook: minúsculas, sin acentos ni puntuación, espacios colapsados */
export function normalizeHook(hook: string): string {
  return hook
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** similitud Jaccard entre conjuntos de palabras (0 a 1) */
export function hookSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeHook(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeHook(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

/**
 * true si el hook es demasiado parecido a los del historial reciente.
 * Umbral 0.55 de Jaccard sobre las últimas 30 piezas.
 */
export function isHookRepeated(
  hook: string,
  history: HistoryEntry[],
  opts: { lastN?: number; threshold?: number } = {}
): boolean {
  const { lastN = 30, threshold = 0.55 } = opts;
  const recent = history.slice(-lastN);
  return recent.some((e) => hookSimilarity(hook, e.hook) >= threshold);
}

export function formatDistribution(history: HistoryEntry[]): Record<ContentType, number> {
  const dist = Object.fromEntries(
    (["reel", "static", "carousel", "linkedin-post", "x-post", "thread"] as ContentType[]).map(
      (k) => [k, 0]
    )
  ) as Record<ContentType, number>;
  for (const e of history) dist[e.contentType] = (dist[e.contentType] ?? 0) + 1;
  return dist;
}

export function categoryDistribution(history: HistoryEntry[]): Record<ContentCategory, number> {
  const dist = Object.fromEntries(
    CATEGORIES.map((k) => [k, 0])
  ) as Record<ContentCategory, number>;
  for (const e of history) dist[e.category] = (dist[e.category] ?? 0) + 1;
  return dist;
}

export function structureDistribution(history: HistoryEntry[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const e of history) {
    if (e.hookStructure) dist[e.hookStructure] = (dist[e.hookStructure] ?? 0) + 1;
  }
  return dist;
}
