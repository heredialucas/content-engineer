import { z } from "zod";
import { obj } from "../../src/ai/providers/openai";
import {
  CONTENT_TYPES,
  PLATFORM_ALLOWED_TYPES,
  PLATFORMS,
  STATIC_ASPECTS,
  type Platform,
} from "../../config/config";
import { CATEGORIES } from "../../config/content-mix";
import { HOOK_STRUCTURES } from "../../src/knowledge/structures";
import { NATURALNESS_RULES } from "../_shared/naturalness";
import { presentationInfoText } from "../_shared/presentation";
import type { ProjectInfo } from "../../src/project/load-project";

/* ─────────────── análisis del proyecto ─────────────── */

export const INSIGHT_KINDS = [
  "historia",
  "decision-tecnica",
  "error",
  "aprendizaje",
  "resultado",
  "opinion",
  "detallito",
  "visual",
  "humor",
  "dolor-cliente",
  "beneficio",
  "objecion",
  "oferta",
] as const;

export const InsightsSchema = z.object({
  insights: z
    .array(
      z.object({
        kind: z.enum(INSIGHT_KINDS),
        title: z.string().min(3).max(120),
        description: z.string().min(10).max(400),
      })
    )
    .min(3)
    .max(14),
  visualAssets: z
    .array(
      z.object({
        asset: z.string().min(3).max(200),
        why: z.string().min(3).max(200),
      })
    )
    .max(10),
});
export type ProjectInsights = z.infer<typeof InsightsSchema>;

export const insightsJsonSchema = obj({
  insights: {
    type: "array",
    items: obj({
      kind: { type: "string", enum: [...INSIGHT_KINDS] },
      title: { type: "string", description: "título corto del hallazgo" },
      description: {
        type: "string",
        description: "qué encontraste y por qué puede interesar a una audiencia",
      },
    }),
  },
  visualAssets: {
    type: "array",
    items: obj({
      asset: { type: "string", description: "ruta EXACTA del asset de la lista provista" },
      why: { type: "string", description: "por qué ese visual es atractivo / para qué sirve" },
    }),
  },
});

export function buildAnalysisSystem(presentation = false): string {
  if (presentation) {
    return `Sos el director creativo de un producto digital. MODO PRESENTACIÓN: tu misión es entender el PROYECTO para PRESENTARLO (no para venderlo).

Buscá concretamente:
- QUÉ ES y qué hace el producto/sitio: la propuesta en una frase
- CÓMO funciona: secciones, recorrido, features importantes
- DISEÑO y detalles visuales atractivos (de la lista de assets)
- Stack y decisiones técnicas SOLO como dato de producto (nunca como currículum)
- Para quién es y qué resuelve el propio producto

PROHIBIDO en modo presentación:
- Usar la sección "## Experiencia" (currículum) o mencionar trabajos, clientes o logros pasados.
- Usar "## Venta": nada de oferta, dolores del cliente, objeciones ni "contratame".
- Inventar métricas o resultados.

Reglas:
- Nada inventado: todo sale de la info provista. Si no alcanza, extraé lo que hay sin rellenar.
- Priorizá lo específico y concreto por encima de lo genérico.
- Respondé SIEMPRE en JSON que respete el esquema.`;
  }
  return `Sos el director creativo de un desarrollador freelance. Tu misión ahora: EXCAVAR material bruto en la información del proyecto.

Buscá concretamente:
- QUÉ VENDE y a quién: la oferta como servicio concreto (qué recibe el cliente, en cuánto tiempo, con qué resultado)
- DOLOR del cliente ideal antes de contratar (plataforma que frena el negocio, web que no convierte, procesos manuales)
- BENEFICIOS que obtiene al contratar (más consultas, releases destrabados, deploys confiables)
- OBJECIONES típicas de compra y cómo se responden con evidencia
- historias detrás de los proyectos (qué pasó, qué estuvo en juego) — como PRUEBA de resultados
- decisiones técnicas y su porqué, errores reales y su costo, aprendizajes, resultados medibles
- opiniones fuertes defendibles (hot takes), detalles que casi nadie nota, situaciones con humor
- elementos visuales atractivos (de la lista de assets)

Reglas:
- Nada inventado: todo sale de la info provista. Si no alcanza, extraé lo que hay sin rellenar.
- Priorizá lo específico y concreto por encima de lo genérico.
- Si hay sección "## Venta", es la mina principal: explotala.
- Buscá el ángulo que le sirva AL CLIENTE FUTURO, no el que luzca el currículum.
- Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildAnalysisUser(args: { info: ProjectInfo; presentation?: boolean }): string {
  const assets = args.info.assets
    .filter((a) => a.kind === "image")
    .map((a) => `- ${a.staticPath}`)
    .join("\n");
  const info = args.presentation ? presentationInfoText(args.info) : args.info.raw;
  const ask = args.presentation
    ? "Extraé el material para PRESENTAR el proyecto: hasta 10 insights (mínimo 3) sobre qué es, qué hace, cómo funciona y sus visuales, y los assets visuales más atractivos."
    : "Extraé el material creativo: hasta 10 insights (mínimo 3) y los assets visuales más atractivos.";
  return `INFORMACIÓN DEL PROYECTO:
${info}

ASSETS DISPONIBLES:
${assets || "(sin assets)"}

${ask}`;
}

/* ─────────────── briefs v2 (idea + estructura de hook + formato) ─────────────── */

export const RawBriefsSchema = z.object({
  briefs: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        topic: z.string().min(3).max(120),
        idea: z.string().min(10).max(600),
        hookStructure: z.enum(HOOK_STRUCTURES.map((s) => s.id) as [string, ...string[]]),
        hook: z.string().min(3).max(160),
        contentType: z.enum(CONTENT_TYPES),
        platforms: z.array(z.enum(PLATFORMS)).min(1).max(3),
        aspect: z.enum(STATIC_ASPECTS).nullable(),
        reelFormat: z.enum(["9:16", "1:1", "16:9"]).nullable(),
        outline: z.string().max(800).nullable(),
        assetsToUse: z.array(z.string().max(200)).max(6).nullable(),
        creativeReason: z.string().max(300),
      })
    )
    .min(1)
    .max(12),
});
export type RawBriefs = z.infer<typeof RawBriefsSchema>;

export const briefsJsonSchema = obj({
  briefs: {
    type: "array",
    items: obj({
      category: { type: "string", enum: [...CATEGORIES] },
      topic: { type: "string", description: "tema general, corto" },
      idea: {
        type: "string",
        description: "la idea concreta: qué se cuenta y desde qué situación real",
      },
      hookStructure: {
        type: "string",
        enum: HOOK_STRUCTURES.map((s) => s.id),
        description: "estructura de hook elegida de la biblioteca",
      },
      hook: {
        type: "string",
        description: "la frase de apertura escrita SIGUIENDO esa estructura, adaptada al proyecto",
      },
      contentType: { type: "string", enum: [...CONTENT_TYPES] },
      platforms: {
        type: "array",
        items: { type: "string", enum: [...PLATFORMS] },
        description: "redes para las que está pensada esta pieza",
      },
      aspect: {
        type: ["string", "null"] as const,
        enum: [...STATIC_ASPECTS, null],
        description: "aspecto para piezas visuales; null = default por red",
      },
      reelFormat: {
        type: ["string", "null"] as const,
        enum: ["9:16", "1:1", "16:9", null],
        description: "solo reel; null = 9:16",
      },
      outline: {
        ...({ type: ["string", "null"] as const } as any),
        description:
          "estructura en orden (usá un ángulo del sistema: pas, bab, caso-mini, error-leccion, objecion-prueba, proceso-bts, opinion-defendida o demostración)",
      },
      assetsToUse: {
        type: ["array", "null"] as const,
        items: { type: "string" },
        description: "rutas EXACTAS de assets de la lista provista",
      },
      creativeReason: { type: "string", description: "por qué esta pieza, ahora" },
    }),
  },
});

const FORMAT_GUIDE = `- reel: cuando la idea gana con movimiento, antes/después animado o demo. Solo Instagram.
- static: una imagen fuerte. Para hot takes, frases, resultados, mirada editorial.
- carousel: cuando la idea se desarrolla en pasos o capítulos: caso mini, error→lección, antes/después.
- linkedin-post: storytelling profesional, aprendizajes, casos con contexto de negocio.
- x-post: una frase fuerte u observación corta (máx 280).
- thread: idea desarrollada en 3 a 8 puntos encadenados.`;

function platformTable(): string {
  return (Object.keys(PLATFORM_ALLOWED_TYPES) as Platform[])
    .map((p) => `- ${p}: ${PLATFORM_ALLOWED_TYPES[p].join(", ")}`)
    .join("\n");
}

export function buildBriefsSystem(presentation = false): string {
  if (presentation) {
    return `Sos el director creativo de un producto digital (es-AR). Estás en MODO PRESENTACIÓN: el objetivo es MOSTRAR el proyecto, no venderlo.

TONO GENERAL (el más importante):
- Descriptivo, claro y con orgullo de producto: qué es, qué hace, cómo se ve, cómo funciona.
- Cero venta: sin dolores del cliente, sin objeciones, sin ofertas, sin "contratame".
- CTA opcional y suave (invitar a ver el sitio/portfolio), nunca de venta dura.

HOOKS — USÁ LA BIBLIOTECA DE ESTRUCTURAS (te la paso en el pedido):
- El hook es SOLO para el caption: corto y descriptivo (máximo 8 palabras). Nada de frases largas.
- PROHIBIDO el estilo "nadie te cuenta esto", contrarian, secreto o clickbait en presentación.
- Dentro de un mismo lote NO repitas estructura de hook (variedad obligada).

FORMATOS DISPONIBLES:
${FORMAT_GUIDE}

QUÉ PUEDE PUBLICAR CADA RED (respetalo estrictamente):
${platformTable()}

REGLAS:
- PRESENTÁ el producto en sí: qué es, secciones, features, diseño, stack como dato. No resultados de trabajos pasados.
- PROHIBIDO usar "## Experiencia" (currículum) y "## Venta": no menciones clientes, logros, dolores ni ofertas.
- Todo sale de la info provista: nada inventado. Nada de métricas inventadas.
- Un brief = una idea = un formato.

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
  }
  return `Sos el director creativo de un desarrollador freelance (es-AR). Decidís QUÉ contenido crear y EN QUÉ FORMATO.

TONO GENERAL (el más importante):
- Consultivo, de par a par: experto que comparte criterio, NO vendedor que grita.
- El contenido de venta plantea el problema del cliente, muestra criterio y deja que la prueba hable. El CTA explícito es la excepción, no la regla.
- Prohibido el marketing de humo: cada afirmación se apoya en algo real del proyecto.

HOOKS — USÁ LA BIBLIOTECA DE ESTRUCTURAS (te la paso en el pedido):
- Cada brief elige UNA hookStructure y escribe el hook siguiendo esa fórmula, adaptado a datos reales del proyecto.
- Los ejemplos del banco son PATRONES: nunca copies el texto textual, adaptá la estructura.
- Dentro de un mismo lote NO repitas estructura de hook (variedad obligada).
- Mejor un hook específico y aburrido-creíble que uno genérico e impactante-falso.

FORMATOS DISPONIBLES:
${FORMAT_GUIDE}

QUÉ PUEDE PUBLICAR CADA RED (respetalo estrictamente):
${platformTable()}

REGLAS:
- La misma idea puede transformarse por red (nunca copiarse tal cual).
- Mezclá categorías según las cuotas del lote (orientativas: desviación con razón en creativeReason).
- Todo parte de situaciones reales del proyecto: nada inventado.
- Un brief = una idea = un formato.

${NATURALNESS_RULES}

Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildBriefsUser(args: {
  info: ProjectInfo;
  insights: string;
  historySummary: string;
  feedbackSection: string;
  structureLibrary: string;
  hookBank: string;
  angles: string;
  manualIdeas: string;
  quotas: Record<string, number>;
  platformFilter: Platform | "all";
  formatFilter: string;
  count: number;
  excludedHooks?: string[];
  excludedStructures?: string[];
  presentation?: boolean;
}): string {
  const assets = args.info.assets
    .filter((a) => a.kind === "image")
    .map((a) => `- ${a.staticPath}`)
    .join("\n");

  const quotasLine = (Object.entries(args.quotas) as [string, number][])
    .filter(([, n]) => n > 0)
    .map(([cat, n]) => `${cat}: ${n}`)
    .join(" | ");

  const filters = [
    args.platformFilter === "all"
      ? "REDES: todas (asigná la red que mejor le quede a cada idea)."
      : `REDES: SOLO ${args.platformFilter}. Todas las piezas deben apuntar únicamente a ${args.platformFilter}.`,
    args.formatFilter === "auto"
      ? "FORMATO: a tu criterio (variá entre piezas)."
      : `FORMATO: SOLO "${args.formatFilter}". Todas las piezas deben usar ese contentType.`,
  ].join("\n");

  const excluded = args.excludedHooks?.length
    ? `\nHOOKS PROHIBIDOS (ya usados o repetidos, no uses ni variantes cercanas):\n${args.excludedHooks
        .map((h) => `- "${h}"`)
        .join("\n")}`
    : "";
  const excludedStructures = args.excludedStructures?.length
    ? `\nESTRUCTURAS DE HOOK YA USADAS EN ESTE LOTE (elegí otras): ${args.excludedStructures.join(", ")}`
    : "";

  return `BIBLIOTECA DE ESTRUCTURAS DE HOOK (elegí el id para hookStructure y escribí el hook con esa fórmula):
${args.structureLibrary}

BANCO DE EJEMPLOS (patrones reales — ADAPTÁ, no copies):
${args.hookBank}

ÁNGULOS NARRATIVOS PARA EL DESARROLLO (usá uno en outline):
${args.angles}

${args.manualIdeas}

INFORMACIÓN DEL PROYECTO:
${args.presentation ? presentationInfoText(args.info) : args.info.raw}

MATERIAL CREATIVO EXTRAÍDO (análisis previo):
${args.insights}

${args.historySummary}

${args.feedbackSection}

ASSETS DISPONIBLES (rutas exactas para assetsToUse):
${assets || "(sin assets)"}

CUOTAS DEL LOTE (orientativas): ${quotasLine}

${filters}
CANTIDAD DE BRIEFS: ${args.count}${excluded}${excludedStructures}

Generá ${args.count} briefs variados (estructuras de hook todas distintas entre sí).`;
}
