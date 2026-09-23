import fs from "node:fs/promises";
import path from "node:path";
import { KNOWLEDGE_DIR } from "../../config/paths";
import { HOOK_STRUCTURES } from "./structures";
import type { HookStructure } from "./structures";

export type HookEntry = {
  id: string;
  structure: string;
  text: string;
  angle: string;
  source: string;
  fit: string[];
};

export type AngleEntry = {
  id: string;
  name: string;
  description: string;
  flow: string[];
  bestFor: string[];
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(KNOWLEDGE_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function loadHooks(): Promise<HookEntry[]> {
  const data = await readJson<{ hooks: HookEntry[] }>("hooks.json", { hooks: [] });
  return data.hooks ?? [];
}

export async function loadAngles(): Promise<AngleEntry[]> {
  const data = await readJson<{ angles: AngleEntry[] }>("angles.json", { angles: [] });
  return data.angles ?? [];
}

export async function loadManualIdeas(): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, "ideas.md"), "utf8");
    const withoutExample = raw.split(/^---$/m).pop() ?? "";
    return withoutExample.trim();
  } catch {
    return "";
  }
}

/** biblioteca de estructuras de hook para los prompts (compacta) */
export function structureLibraryPrompt(): string {
  return HOOK_STRUCTURES.map((s: HookStructure) => `- **${s.id}** (${s.label}): ${s.formula}`).join("\n");
}

/** banco de hooks de ejemplo, agrupado por estructura */
export async function hookBankPrompt(maxPerStructure = 3): Promise<string> {
  const hooks = await loadHooks();
  const byStructure = new Map<string, HookEntry[]>();
  for (const h of hooks) {
    const list = byStructure.get(h.structure) ?? [];
    list.push(h);
    byStructure.set(h.structure, list);
  }
  const lines: string[] = [];
  for (const structure of HOOK_STRUCTURES) {
    const examples = (byStructure.get(structure.id) ?? []).slice(0, maxPerStructure);
    if (examples.length === 0) continue;
    lines.push(
      `${structure.id} (${structure.label}):`,
      ...examples.map((h) => `   · "${h.text}"`),
      `   → ${examples[0]?.angle ?? structure.description}`
    );
  }
  return lines.join("\n");
}

/** ángulos narrativos para armar el desarrollo de la pieza */
export async function anglesPrompt(): Promise<string> {
  const angles = await loadAngles();
  return angles
    .map((a) => `- **${a.id}** (${a.name}): ${a.description} Flujo: ${a.flow.join(" → ")}`)
    .join("\n");
}

/** ideas manuales del banco (`knowledge/ideas.md`) */
export async function manualIdeasPrompt(): Promise<string> {
  const ideas = await loadManualIdeas();
  if (!ideas) return "(banco manual vacío)";
  return `IDEAS MANUALES DEL BANCO (material priorizado, adaptalo con datos reales):\n${ideas}`;
}

/** resumen de qué funcionó, a partir de las métricas cargadas por feedback */
export function feedbackPromptSection(historySummary: string): string {
  return historySummary.includes("MÉTRICAS")
    ? historySummary
    : "MÉTRICAS: todavía no hay feedback cargado (usá `pnpm feedback` cuando publiques).";
}
