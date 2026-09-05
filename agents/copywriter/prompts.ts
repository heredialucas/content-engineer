import { z } from "zod";
import { obj } from "../../src/ai/providers/openai";
import type { ProjectInfo } from "../../src/project/load-project";
import type { Idea } from "../marketing/prompts";
import type { Storyboard } from "../../src/storyboard/types";

export const ScriptSchema = z.object({
  hook: z.string().min(3).max(160),
  cta: z.string().min(1).max(40),
  ctaSub: z.string().min(1).max(120),
  lines: z
    .array(
      z.object({
        /** texto principal en pantalla para esta sección del video */
        onScreen: z.string().min(1).max(140),
        /** subtítulo que acompaña (más explicativo) */
        subtitle: z.string().min(1).max(160),
      })
    )
    .min(3)
    .max(10),
});
export type Script = z.infer<typeof ScriptSchema>;

export const scriptJsonSchema = obj({
  hook: { type: "string", description: "Frase de apertura que se muestra en pantalla" },
  cta: { type: "string", description: "Llamado a la acción, 1 a 4 palabras (texto del botón)" },
  ctaSub: { type: "string", description: "Texto de apoyo al CTA (URL o promesa corta)" },
  lines: {
    type: "array",
    description: "Secciones del guion en orden; cada una será una o más escenas",
    items: obj({
      onScreen: { type: "string", description: "Texto principal en pantalla (conciso)" },
      subtitle: { type: "string", description: "Subtítulo de apoyo para esa sección" },
    }),
  },
});

export const CaptionSchema = z.object({
  caption: z.string().min(20).max(2000),
  hashtags: z.array(z.string().min(2).max(40)).min(8).max(14),
});
export type Caption = z.infer<typeof CaptionSchema>;

export const captionJsonSchema = obj({
  caption: { type: "string", description: "Caption para Instagram: gancho + valor + CTA, con saltos de línea" },
  hashtags: { type: "array", items: { type: "string" }, description: "Entre 8 y 14 hashtags, con # incluido" },
});

export function buildScriptSystem(): string {
  return `Sos un copywriter senior especializado en contenido corto para Instagram Reels.
Escribís en español rioplatense (es-AR): directo, concreto, sin relleno ni clichés corporativos.

Tu tarea: convertir una idea de contenido en un guion de video (20 a 40 segundos).

Estructura esperada de las líneas:
1. HOOK (primeros 2 segundos): frase que detiene el scroll.
2. DESARROLLO: 2 a 4 secciones con valor concreto (qué hace, cómo lo hace, resultado).
3. CIERRE + CTA: invitación clara a la acción.

Reglas:
- Textos de pantalla: cortos y punzantes. Sin oraciones largas: se leen en 2-3 segundos.
- Los subtítulos complementan, no repiten el texto en pantalla.
- El CTA apunta al contacto principal definido en el proyecto (sección Contacto o Marca). Si hay handle de Instagram, ctaSub debe ser ese handle (ej: "@hlucasdev") o la URL del sitio.
- Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildScriptUser(args: { info: ProjectInfo; idea: Idea }): string {
  const contacto = args.info.sections["contacto"];
  const marca = args.info.sections["marca"];

  return `INFORMACIÓN DEL PROYECTO:
${args.info.raw}
${contacto ? `\nCONTACTO (usalo para el CTA):\n${contacto}\n` : ""}${marca ? `\nMARCA (handle obligatorio):\n${marca}\n` : ""}
IDEA SELECCIONADA:
- Título: ${args.idea.title}
- Ángulo: ${args.idea.angle}
- Hook propuesto: ${args.idea.hook}
- Audiencia: ${args.idea.audience}
- Template sugerido: ${args.idea.templateId}

Escribí el guion completo.`;
}

export function buildCaptionSystem(): string {
  return `Sos un copywriter especializado en captions de Instagram.
Escribís en español rioplatense (es-AR).

Tu tarea: escribir el caption de un Reel ya producido.

Estructura del caption:
1. Gancho en la primera línea (antes del fold de 125 caracteres).
2. 2 a 5 líneas de valor concreto (puede usar saltos de línea y emojis con moderación, máximo 4 emojis).
3. CTA final (seguir, escribir, visitar link).

Reglas:
- Hashtags: 8 a 14, mezcla amplios y de nicho, siempre con #.
- Cerrá el caption con el contacto principal del proyecto: si hay handle de Instagram (sección Contacto/Marca), invitalo a escribir por DM a ese handle. Si hay URL del sitio, mencionala también.
- Sin frases tipo "hecho con IA" ni meta-comentarios.
- Respondé SIEMPRE en JSON que respete el esquema.`;
}

export function buildCaptionUser(args: {
  info: ProjectInfo;
  idea: Idea;
  script: Script;
  storyboard: Storyboard;
}): string {
  const contacto = args.info.sections["contacto"];
  const marca = args.info.sections["marca"];

  return `INFORMACIÓN DEL PROYECTO:
${args.info.raw}
${contacto ? `\nCONTACTO (incluilo en el CTA del caption):\n${contacto}\n` : ""}${marca ? `\nMARCA (handle):\n${marca}\n` : ""}
IDEA: ${args.idea.title} — ${args.idea.angle}

GUION DEL VIDEO:
Hook: ${args.script.hook}
${args.script.lines.map((l) => `- ${l.onScreen} (sub: ${l.subtitle})`).join("\n")}
CTA: ${args.script.cta} — ${args.script.ctaSub}

DURACIÓN APROXIMADA DEL VIDEO: ${args.storyboard.scenes
    .reduce((a, s) => a + s.durationInSeconds, 0)
    .toFixed(0)} segundos
FORMATO: ${args.storyboard.format}

Escribí el caption y los hashtags.`;
}
