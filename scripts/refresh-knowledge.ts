import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { KNOWLEDGE_DIR } from "../config/paths";
import { getTextProvider } from "../src/ai/registry";
import { HOOK_STRUCTURES } from "../src/knowledge/structures";
import { hookSimilarity, normalizeHook } from "../src/history";

type Source = {
  id: string;
  name: string;
  type: string;
  url: string;
  author?: string;
  why?: string;
  ingest?: boolean;
};

type ExistingHook = {
  id: string;
  structure: string;
  text: string;
  angle: string;
  source: string;
  fit: string[];
};

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    hooks: {
      type: "array" as const,
      description: "hooks/ganchos encontrados en el texto",
      items: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "el hook/gancho textual (recortado, máx 120 caracteres)" },
          structure: { type: "string", enum: HOOK_STRUCTURES.map((s) => s.id) },
          angle: { type: "string", description: "por qué funciona / qué ángulo usa (1 línea)" },
        },
        required: ["text", "structure", "angle"],
        additionalProperties: false,
      },
    },
  },
  required: ["hooks"],
  additionalProperties: false,
};

const htmlToText = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

async function fetchSourceText(url: string, maxChars = 14000): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; content-engine/0.4)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  const html = await res.text();
  return htmlToText(html).slice(0, maxChars);
}

/** busca hooks nuevos en las fuentes y los agrega al banco (dedupe incluido) */
export async function refreshKnowledge(): Promise<void> {
  const sourcesFile = path.join(KNOWLEDGE_DIR, "sources.json");
  const hooksFile = path.join(KNOWLEDGE_DIR, "hooks.json");

  const sources = JSON.parse(await fs.readFile(sourcesFile, "utf8")) as {
    sources: Source[];
  };
  const bank = JSON.parse(await fs.readFile(hooksFile, "utf8")) as {
    updatedAt: string;
    note: string;
    hooks: ExistingHook[];
  };

  const provider = getTextProvider();
  const ingestable = sources.sources.filter((s) => s.ingest);
  console.log(`🔍 ${ingestable.length} fuente(s) para ingesta…`);

  let added = 0;
  let skipped = 0;

  for (const source of ingestable) {
    console.log(`\n📡 ${source.name}`);
    let text: string;
    try {
      text = await fetchSourceText(source.url);
    } catch (err) {
      console.log(`   ⚠️  no se pudo leer la fuente: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const result = await provider.generateJSON({
      system: `Sos un investigador de contenido para redes. Tu tarea: extraer del texto los HOOKS/GANCHOS de apertura (frases que detienen el scroll en videos, carruseles o posts).
- Extraé SOLO frases que funcionen como apertura (no frases del desarrollo).
- Clasificá cada una con la estructura correspondiente.
- Ignorá hooks genéricos de relleno ("no te lo podés perder", "mirá esto").
- El texto está en el idioma que venga: devolvé el hook en su idioma original.`,
      user: `TEXTO DE LA FUENTE "${source.name}" (${source.url}):
${text}

Extraé hasta 12 hooks con su estructura y el ángulo.`,
      schemaName: "knowledge_extract",
      jsonSchema: EXTRACT_SCHEMA as never,
      zodSchema: z.object({
        hooks: z
          .array(
            z.object({
              text: z.string().min(5).max(160),
              structure: z.enum(HOOK_STRUCTURES.map((s) => s.id) as [string, ...string[]]),
              angle: z.string().min(3).max(200),
            })
          )
          .max(12),
      }),
      maxTokens: 2500,
    });

    for (const h of result.hooks) {
      const dup = bank.hooks.some((existing) => hookSimilarity(existing.text, h.text) >= 0.6);
      if (dup || normalizeHook(h.text).length < 8) {
        skipped++;
        continue;
      }
      const nextNum =
        bank.hooks
          .map((e) => parseInt(e.id.replace(/\D/g, ""), 10))
          .filter((n) => !Number.isNaN(n))
          .reduce((a, b) => Math.max(a, b), 0) + 1;
      bank.hooks.push({
        id: `h${String(nextNum).padStart(3, "0")}`,
        structure: h.structure,
        text: h.text,
        angle: h.angle,
        source: source.id,
        fit: [],
      });
      added++;
    }
  }

  bank.updatedAt = new Date().toISOString().slice(0, 10);
  await fs.writeFile(hooksFile, JSON.stringify(bank, null, 2), "utf8");
  console.log(`\n✅ Banco actualizado: +${added} hooks, ${skipped} duplicados ignorados. Total: ${bank.hooks.length}.`);
}
