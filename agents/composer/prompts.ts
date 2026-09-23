import { z } from "zod";
import { obj } from "../../src/ai/providers/openai";
import { BlockSchema } from "../../src/specs";
import { NATURALNESS_RULES } from "../_shared/naturalness";
import { PRESENTATION_TONE, presentationInfoText } from "../_shared/presentation";
import type { ProjectInfo } from "../../src/project/load-project";

const NULLABLE = { type: ["string", "null"] as const };
const NULLABLE_NUM = { type: ["number", "null"] as const };

const blockJson = (withDuration: boolean) =>
  obj({
    block: { type: "string", enum: ["hook", "statement", "screen", "metrics", "steps", "quote", "cta"] },
    variant: { ...NULLABLE, description: "variante de composición (ver catálogo)" },
    eyebrow: { ...NULLABLE, description: "kicker corto en mayúsculas (ej: CASO REAL)" },
    text: { ...NULLABLE, description: "texto principal del bloque (corto: se lee en 2-3 segundos)" },
    sub: { ...NULLABLE, description: "texto de apoyo (1-2 líneas)" },
    items: {
      type: ["array", "null"] as const,
      description: "solo metrics/steps: hasta 6 ítems {label, value?}",
      items: obj({
        label: { type: "string", description: "qué mide o el paso (concreto)" },
        value: { ...NULLABLE, description: "cifra corta (ej: +40%, 6 meses, 2×)" },
      }),
    },
    asset: { ...NULLABLE, description: "solo screen: ruta EXACTA del asset de la lista" },
    cta: { ...NULLABLE, description: "solo cta: texto del botón (1-4 palabras)" },
    caption: { ...NULLABLE, description: "solo reel: subtítulo de apoyo del bloque (1 línea)" },
    ...(withDuration
      ? { durationInSeconds: { ...NULLABLE_NUM, description: "duración del bloque en segundos (1.5 a 6)" } }
      : {}),
  });

/* ─────────────── reel ─────────────── */

export const ReelComposeSchema = z.object({
  blocks: z.array(BlockSchema).min(3).max(10),
});
export const reelComposeJsonSchema = obj({
  blocks: {
    type: "array",
    description: "3 a 9 bloques en orden; el primero hook, el último cta",
    items: blockJson(true),
  },
});

/* ─────────────── static ─────────────── */

export const StaticComposeSchema = z.object({
  blocks: z.array(BlockSchema).min(1).max(3),
});
export const staticComposeJsonSchema = obj({
  blocks: {
    type: "array",
    description: "1 a 3 bloques que conviven en una sola imagen",
    items: blockJson(false),
  },
});

/* ─────────────── carousel ─────────────── */

export const CarouselComposeSchema = z.object({
  pages: z
    .array(
      z.object({
        blocks: z.array(BlockSchema).min(1).max(2),
      })
    )
    .min(3)
    .max(8),
});
export const carouselComposeJsonSchema = obj({
  pages: {
    type: "array",
    description: "3 a 8 páginas; página 1 = hook, última = cta; 1-2 bloques por página",
    items: obj({
      blocks: { type: "array", items: blockJson(false) },
    }),
  },
});

/* ─────────────── prompts ─────────────── */

const BLOCK_CATALOG = `CATÁLOGO DE BLOQUES (el diseño visual lo pone el motor; vos componés contenido):

- hook — la apertura. variantes: "stack" (palabras gigantes apiladas, la más potente), "serif" (itálica editorial, para preguntas o frases reflexivas), "split" (dos frases contrastadas separadas por |, ej: "Antes: caos|Después: shipped")
- statement — una idea desarrollada. variantes: "center" (titular grande centrado), "left" (alineado con regla, para argumentos), "editorial" (serif, para miradas de fondo)
- screen — screenshot real en marco de navegador (REQUIERE asset de la lista). variantes: "browser" (marco), "flat" (full-bleed con texto abajo; solo si va solo en su página/escena)
- metrics — datos/resultado. variantes: "grid" (2-4 tarjetas), "hero" (UNA cifra gigante + resto en filas), "rows" (filas con hairline). items = [{label, value}]
- steps — pasos/decisiones. variantes: "numbered" (números outline gigantes), "rows" (lista compacta). items = [{label, value?}]
- quote — cita o frase con peso (serif itálica). text = la cita; sub = autor/contexto
- cta — cierre. variantes: "pill" (botón blanco), "minimal" (serif + hairline, sin empuje)

REGLAS DE COMPOSICIÓN (comunes):
- Monocromo total: el sistema no usa colores por categoría ni gradientes. No pidas colores.
- Textos CORTOS: cada pantalla se lee en 2-3 segundos. Máx ~12 palabras por text.
- Un bloque = una idea. Si necesitás dos ideas, son dos bloques.
- Variá variantes entre bloques y entre piezas: si la pieza anterior usó "stack", probá "serif" o "split".
- El texto sale del proyecto: nada inventado. Sin emojis.
- caption (solo reel): 1 línea de apoyo que se lee mientras el bloque está en pantalla; no repite el text.`;

const REEL_RULES = `REGLAS DE REEL:
- 3 a 9 bloques. Primero hook, último cta.
- Duraciones: hook 2-3s; statement/screen 2.5-4s; metrics/steps 3-5s; cta 3-4s. Total 12-30s.
- Incluí caption en 2 a 5 bloques clave (no en todos).
- Si hay screenshot útil, meté UN screen (browser) en el desarrollo o la prueba.`;

const STATIC_RULES = `REGLAS DE STATIC:
- 1 a 3 bloques que conviven en UNA imagen (se apilan verticalmente).
- Combinaciones que funcionan: hook solo · hook+statement · statement+metrics · quote sola · screen sola.
- El primer bloque domina la jerarquía (el ojo lee arriba hacia abajo).`;

const CAROUSEL_RULES = `REGLAS DE CARRUSEL:
- 3 a 8 páginas. Página 1: hook. Última: cta. Del medio: el desarrollo (statement/screen/metrics/steps/quote).
- 1-2 bloques por página. La página debe entenderse sola (cada slide se ve aislada).
- Si hay screenshot útil, UNA página screen. Si hay resultado, UNA página metrics.
- Ritmo: alterná densidad (una página densa, una liviana).`;

export function buildComposeSystem(
  kind: "reel" | "static" | "carousel",
  presentation = false
): string {
  const kindRules =
    kind === "reel" ? REEL_RULES : kind === "static" ? STATIC_RULES : CAROUSEL_RULES;
  const mode = presentation ? `\n\n${PRESENTATION_TONE}` : "";
  return `Sos el compositor de piezas de un sistema de contenido para un desarrollador freelance (es-AR).
Tu tarea: convertir un brief del director creativo en una composición de bloques ejecutable por el motor de diseño.

${BLOCK_CATALOG}

${kindRules}${mode}

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildComposeUser(args: {
  info: ProjectInfo;
  briefSummary: string;
  hook: string;
  hookStructure: string;
  assets: string;
  category: string;
  outline?: string | null;
  suggestedAsset?: string | null;
  presentation?: boolean;
}): string {
  const contacto = args.info.sections["contacto"];
  const marca = args.info.sections["marca"];
  const infoText = args.presentation ? presentationInfoText(args.info) : args.info.raw;
  return `INFORMACIÓN DEL PROYECTO:
${infoText}
${contacto ? `\nCONTACTO (usalo para el CTA si corresponde):\n${contacto}\n` : ""}${marca ? `\nMARCA (identidad fija; no la incluyas en la composición):\n${marca}\n` : ""}
BRIEF DEL DIRECTOR CREATIVO:
${args.briefSummary}

HOOK YA ESCRITO (estructura: ${args.hookStructure}) — usalo como bloque hook (o base inmediata):
"${args.hook}"
${args.outline ? `\nESTRUCTURA SUGERIDA (outline del brief):\n${args.outline}\n` : ""}
CATEGORÍA: ${args.category}
${args.suggestedAsset ? `ASSET SUGERIDO POR EL BRIEF: ${args.suggestedAsset}\n` : ""}
ASSETS DISPONIBLES (rutas exactas para screen):
${args.assets || "(sin assets: no uses bloques screen)"}

Componé la pieza.`;
}
