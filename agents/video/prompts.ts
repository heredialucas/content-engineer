import { z } from "zod";
import { obj } from "../../src/ai/providers/openai";
import { TEMPLATE_IDS, type FormatId } from "../../config/config";
import { SCENE_TYPES } from "../../src/storyboard/types";
import type { ProjectInfo } from "../../src/project/load-project";
import type { Idea } from "../marketing/prompts";
import type { Script } from "../copywriter/prompts";

/** respuesta cruda de la IA antes de normalizar */
export const RawStoryboardSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  title: z.string().max(120),
  brand: z.object({
    bg: z.string().max(20),
    primary: z.string().max(20),
    accent: z.string().max(20),
    handle: z.string().max(60).nullable(),
    logo: z.string().max(200).nullable(),
  }),
  scenes: z
    .array(
      z.object({
        id: z.string().max(60),
        type: z.enum(SCENE_TYPES),
        durationInSeconds: z.number().min(1).max(12),
        eyebrow: z.string().max(60).nullable(),
        text: z.string().max(220).nullable(),
        subtext: z.string().max(300).nullable(),
        items: z
          .array(
            z.object({
              label: z.string().max(60),
              value: z.string().max(40).nullable(),
            })
          )
          .max(8)
          .nullable(),
        asset: z.string().max(200).nullable(),
        caption: z.string().max(160).nullable(),
      })
    )
    .min(2)
    .max(12),
});
export type RawStoryboard = z.infer<typeof RawStoryboardSchema>;

const NULLABLE_STRING = { type: ["string", "null"] as const };

export const storyboardJsonSchema = obj({
  templateId: { type: "string", enum: [...TEMPLATE_IDS] },
  title: { type: "string" },
  brand: obj({
    bg: { type: "string", description: "hex oscuro para el fondo" },
    primary: { type: "string", description: "hex color primario de marca" },
    accent: { type: "string", description: "hex color de acento" },
    handle: NULLABLE_STRING,
    logo: NULLABLE_STRING,
  }),
  scenes: {
    type: "array",
    items: obj({
      id: { type: "string", description: "id corto en snake_case" },
      type: { type: "string", enum: [...SCENE_TYPES] },
      durationInSeconds: { type: "number" },
      eyebrow: { ...NULLABLE_STRING, description: "etiqueta pequeña superior (opcional)" },
      text: { ...NULLABLE_STRING, description: "texto principal en pantalla" },
      subtext: { ...NULLABLE_STRING, description: "texto secundario (opcional)" },
      items: {
        type: ["array", "null"] as const,
        description: "solo para features/stats: lista de {label, value}",
        items: obj({ label: { type: "string" }, value: NULLABLE_STRING }),
      },
      asset: { ...NULLABLE_STRING, description: "asset EXACTO de la lista provista, o null" },
      caption: { ...NULLABLE_STRING, description: "subtítulo de la escena" },
    }),
  },
});

export function buildStoryboardSystem(): string {
  return `Sos un director de video especializado en contenido corto vertical (Instagram Reels).
Tu tarea: convertir un guion en un storyboard JSON ejecutable por un motor de templates (Remotion).

Tipos de escena disponibles:
- hook: frase enorme cinética (apertura obligatoria). text = el hook.
- title: título + subtítulo con eyebrow opcional. Para presentar proyecto/sección.
- showcase: screenshot con marco de navegador y zoom suave. Ideal para mostrar interfaces.
- features: lista de items (label + value opcional). Para stack, servicios, beneficios.
- stats: números grandes con labels. Para métricas y resultados.
- text: mensaje centrado. Para problema/solución, frases clave.
- cta: cierre con logo, CTA y botón (obligatoria al final).

Reglas de ritmo:
- Total del video: 20 a 40 segundos. Duración por escena: 2 a 6 segundos.
- Alternar tipos: no poner dos "showcase" idénticos seguidos sin diferenciar texto.
- Cada escena tiene caption (subtítulo) salvo el hook que ya es texto grande.
- assets: usá SOLO rutas exactas de la lista provista. Si no hay asset útil, asset = null.
- brand: colores hex oscuros para bg (ej: #0B0F1A) y primary/accent vibrantes coherentes con el proyecto.
- Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildStoryboardUser(args: {
  info: ProjectInfo;
  idea: Idea;
  script: Script;
  format: FormatId;
}): string {
  const assets = args.info.assets
    .filter((a) => a.kind === "image" || a.kind === "video")
    .map((a) => `- ${a.staticPath} (${a.kind})`)
    .join("\n");

  return `INFORMACIÓN DEL PROYECTO:
${args.info.raw}

IDEA: ${args.idea.title} — ${args.idea.angle}
TEMPLATE SUGERIDO: ${args.idea.templateId}

GUION (en orden):
Hook: ${args.script.hook}
${args.script.lines.map((l, i) => `${i + 1}. Pantalla: "${l.onScreen}" — Subtítulo: "${l.subtitle}"`).join("\n")}
CTA: "${args.script.cta}" (${args.script.ctaSub})

ASSETS DISPONIBLES (rutas exactas para el campo asset):
${assets || "(sin assets: usá asset null y escenas de texto)"}

FORMATO DEL VIDEO: ${args.format}

Generá el storyboard completo.`;
}
