import { obj } from "../../src/ai/providers/openai";
import { TEMPLATE_IDS, type FormatId } from "../../config/config";
import { z } from "zod";
import type { ProjectInfo } from "../../src/project/load-project";

export const IdeaSchema = z.object({
  title: z.string().min(3).max(90),
  angle: z.string().min(3).max(300),
  hook: z.string().min(3).max(160),
  templateId: z.enum(TEMPLATE_IDS),
  audience: z.string().min(3).max(160),
  why: z.string().min(3).max(300),
  score: z.number().min(0).max(10),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeasResponseSchema = z.object({ ideas: z.array(IdeaSchema).min(1).max(8) });
export type IdeasResponse = z.infer<typeof IdeasResponseSchema>;

export const ideasJsonSchema = obj({
  ideas: {
    type: "array",
    items: obj({
      title: { type: "string", description: "Título corto de la idea de contenido" },
      angle: { type: "string", description: "Ángulo narrativo y por qué funciona" },
      hook: { type: "string", description: "Hook de apertura de 3 a 8 palabras, directo y provocador" },
      templateId: { type: "string", enum: [...TEMPLATE_IDS], description: "Template Remotion sugerido" },
      audience: { type: "string", description: "Audiencia objetivo específica de esta idea" },
      why: { type: "string", description: "Justificación breve del potencial de engagement" },
      score: { type: "number", description: "0 a 10, potencial de engagement" },
    }),
  },
});

export function buildIdeasSystem(): string {
  return `Sos un agente de marketing especializado en contenido corto para redes sociales (Instagram Reels, TikTok).
Trabajás en español rioplatense (es-AR) para crear contenido de marketing de un desarrollador freelance.

Tu tarea: analizar la información del proyecto y proponer ideas de contenido de video.

Reglas:
- Ideas específicas del proyecto: nada de conceptos genéricos que sirvan para cualquier negocio.
- Los hooks deben capturar en los primeros 2 segundos: pregunta directa, dato llamativo, promesa concreta o tensión.
- Duración objetivo del video: 20 a 40 segundos.
- El template define la estructura visual: "${TEMPLATE_IDS.join('", "')}".
- Respondé SIEMPRE en JSON que respete el esquema, sin texto adicional.`;
}

export function buildIdeasUser(args: {
  info: ProjectInfo;
  format: FormatId;
  count: number;
}): string {
  const assetsList = args.info.assets
    .filter((a) => a.kind !== "other")
    .map((a) => `- ${a.staticPath} (${a.kind})`)
    .join("\n");

  return `INFORMACIÓN DEL PROYECTO:
${args.info.raw}

ASSETS DISPONIBLES (podés basar ideas en estos materiales):
${assetsList || "(sin assets todavía)"}

FORMATO DE SALIDA DEL VIDEO: ${args.format}

Generá ${args.count} ideas de contenido, ordenadas por potencial de engagement.`;
}
