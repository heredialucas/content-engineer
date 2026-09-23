import { z } from "zod";
import { obj } from "../../src/ai/providers/openai";
import type { Platform } from "../../config/config";
import { NATURALNESS_RULES } from "../_shared/naturalness";
import { PRESENTATION_TONE, presentationInfoText } from "../_shared/presentation";
import type { ProjectInfo } from "../../src/project/load-project";

/* ─────────────── captions por plataforma (piezas visuales) ─────────────── */

export const CaptionSchema = z.object({
  caption: z.string().min(20).max(2000),
  hashtags: z.array(z.string().min(2).max(40)).min(8).max(14),
});
export type Caption = z.infer<typeof CaptionSchema>;

export const LinkedInCaptionSchema = z.object({
  caption: z.string().min(40).max(1300),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(5),
});
export const XCaptionSchema = z.object({
  caption: z.string().min(10).max(280),
  hashtags: z.array(z.string().min(2).max(40)).max(2),
});

export const captionJsonSchema = obj({
  caption: {
    type: "string",
    description: "Caption: gancho + valor + cierre, con saltos de línea",
  },
  hashtags: { type: "array", items: { type: "string" }, description: "8 a 14 hashtags con # incluido" },
});

export const PLATFORM_JSON: Record<Platform, ReturnType<typeof obj>> = {
  instagram: captionJsonSchema,
  linkedin: obj({
    caption: { type: "string", description: "Post: gancho + desarrollo + cierre. Sin emojis decorativos" },
    hashtags: { type: "array", items: { type: "string" }, description: "3 a 5 hashtags con #" },
  }),
  x: obj({
    caption: { type: "string", description: "Máximo 280 caracteres. Directo y punzante" },
    hashtags: { type: "array", items: { type: "string" }, description: "0 a 2 hashtags con #" },
  }),
};

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: `Caption de Instagram para una pieza visual ya producida.
Estructura: gancho en la primera línea (antes del fold de 125 caracteres), 2 a 5 líneas de valor, cierre.
Hashtags: 8 a 14, mezcla amplios y de nicho, con #.
Cerrá con el contacto del proyecto: si hay handle, invitalo a escribir por DM.`,
  linkedin: `Post de LinkedIn: tono profesional pero humano, en primera persona.
Estructura: gancho de 1-2 líneas, desarrollo con contexto (qué pasó, qué decidiste, qué resultado), cierre con aprendizaje o pregunta a la audiencia.
3 a 5 hashtags al final con #. Sin emojis decorativos (máximo 1). Nada de engagement bait ("comentá X si...").`,
  x: `Post corto para X: una observación o frase punzante. Máximo 280 caracteres en TOTAL.
Sin introducciones. Sin hashtags obligatorios (0 a 2 máximo). Tiene que provocar respuesta o guardado.`,
};

/** reglas por categoría: venta consultiva, no agresiva */
const CATEGORY_RULES: Record<string, string> = {
  presentacion: `La pieza PRESENTA el proyecto (producto/sitio): describí qué es y qué hace, con orgullo de producto pero sin vender.
Cero venta dura: nada de dolores del cliente, objeciones ni ofertas. Cierre suave (invitar a verlo).`,
  venta: `La pieza es de VENTA (consultiva): habla del problema del CLIENTE como par experto, no como vendedor.
Planteá el costo real de no resolverlo, mostrá criterio y apoyate en prueba concreta del proyecto.
El empuje es la consecuencia: si el contenido convence, el contacto llega solo. CTA suave o implícito salvo que el cierre lo pida.`,
  promocional: `La pieza es PROMOCIONAL: acá SÍ va el CTA explícito (DM al handle o el sitio), con una oferta concreta y sin humo.`,
};

const categoryRules = (category?: string) =>
  category && CATEGORY_RULES[category] ? `\n\n${CATEGORY_RULES[category]}` : "";

export function buildPlatformCaptionSystem(
  platform: Platform,
  category?: string,
  presentation = false
): string {
  const mode = presentation ? `\n\n${PRESENTATION_TONE}` : categoryRules(category);
  return `Sos un copywriter en español rioplatense (es-AR) para un desarrollador freelance.

${PLATFORM_RULES[platform]}${mode}

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildPlatformCaptionUser(args: {
  info: ProjectInfo;
  platform: Platform;
  hook: string;
  idea: string;
  category: string;
  pieceSummary: string;
  cta?: string | null;
  presentation?: boolean;
}): string {
  const contacto = args.info.sections["contacto"];
  const marca = args.info.sections["marca"];
  const infoText = args.presentation ? presentationInfoText(args.info) : args.info.raw;
  return `INFORMACIÓN DEL PROYECTO:
${infoText}
${contacto ? `\nCONTACTO:\n${contacto}\n` : ""}${marca ? `\nMARCA (handle):\n${marca}\n` : ""}
PIEZA: ${args.pieceSummary}
IDEA: ${args.idea}
HOOK DE LA PIEZA: "${args.hook}"
CATEGORÍA: ${args.category}
${args.cta ? `CTA DISPONIBLE: ${args.cta}` : "Sin CTA explícito salvo que cierre natural."}

Escribí el caption para ${args.platform}.`;
}

/* ─────────────── posts de texto (LinkedIn / X) ─────────────── */

export const LinkedInPostSchema = z.object({
  body: z.string().min(300).max(1300),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(5),
});
export const XPostSchema = z.object({
  body: z.string().min(30).max(280),
  hashtags: z.array(z.string().min(2).max(40)).max(2),
});
export const ThreadSchema = z.object({
  tweets: z
    .array(z.object({ text: z.string().min(10).max(280) }))
    .min(3)
    .max(10),
});

export const postJsonFor = (platform: Platform, variant: "post" | "thread") => {
  if (platform === "linkedin") {
    return obj({
      body: { type: "string", description: "Post completo listo para pegar, con saltos de línea" },
      hashtags: { type: "array", items: { type: "string" }, description: "3 a 5 hashtags con #" },
    });
  }
  if (variant === "thread") {
    return obj({
      tweets: {
        type: "array",
        description: "3 a 10 tweets encadenados; el primero es el hook",
        items: obj({ text: { type: "string", description: "máximo 280 caracteres" } }),
      },
    });
  }
  return obj({
    body: { type: "string", description: "Post único, máximo 280 caracteres" },
    hashtags: { type: "array", items: { type: "string" }, description: "0 a 2 hashtags con #" },
  });
};

export function buildTextPostSystem(
  platform: Platform,
  variant: "post" | "thread",
  category?: string,
  presentation = false
): string {
  const venta = presentation ? `\n\n${PRESENTATION_TONE}` : categoryRules(category);
  if (platform === "linkedin") {
    return `Sos un copywriter en español rioplatense (es-AR) que escribe posts de LinkedIn para un desarrollador freelance.

Estructura: gancho de 1-2 líneas → historia o desarrollo concreto (situación real, decisión, resultado) → cierre con aprendizaje o pregunta genuina.
Longitud: 400 a 1300 caracteres. Saltos de línea cortos, párrafos de 1-3 líneas.
3 a 5 hashtags al final. Sin emojis decorativos. Nada de engagement bait.
${venta}

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
  }
  if (variant === "thread") {
    return `Sos un copywriter en español rioplatense (es-AR) que escribe threads para X.

Primer tweet: hook que haga querer leer el resto (sin "🧵" obligatorio).
Tweets siguientes: UNA idea por tweet, concretos, con tensión entre ellos. Cada uno máximo 280 caracteres.
Último tweet: cierre o aprendizaje. CTA solo si es natural.
Entre 3 y 10 tweets.
${venta}

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
  }
  return `Sos un copywriter en español rioplatense (es-AR) que escribe posts cortos para X.

Una sola observación o frase. Máximo 280 caracteres. Sin introducciones.
0 a 2 hashtags. Tiene que provocar respuesta, guardado o discusión.
${venta}

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildTextPostUser(args: {
  info: ProjectInfo;
  platform: Platform;
  variant: "post" | "thread";
  hook: string;
  idea: string;
  category: string;
  outline?: string | null;
  presentation?: boolean;
}): string {
  const contacto = args.info.sections["contacto"];
  const marca = args.info.sections["marca"];
  const infoText = args.presentation ? presentationInfoText(args.info) : args.info.raw;
  return `INFORMACIÓN DEL PROYECTO:
${infoText}
${contacto ? `\nCONTACTO:\n${contacto}\n` : ""}${marca ? `\nMARCA (handle):\n${marca}\n` : ""}
IDEA: ${args.idea}
HOOK: "${args.hook}"
CATEGORÍA: ${args.category}
${args.outline ? `ESTRUCTURA SUGERIDA: ${args.outline}` : ""}

Escribí el ${args.variant === "thread" ? "thread" : "post"} para ${args.platform === "linkedin" ? "LinkedIn" : "X"}.`;
}
