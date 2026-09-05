import { z } from "zod";
import { TEMPLATE_IDS } from "../../config/config";

export const SCENE_TYPES = [
  "hook",
  "title",
  "showcase",
  "features",
  "stats",
  "text",
  "cta",
] as const;

export const SceneSchema = z.object({
  id: z.string().min(1),
  type: z.enum(SCENE_TYPES),
  /** duración de la escena en segundos (1 a 12) */
  durationInSeconds: z.number().min(1).max(12),
  /** texto pequeño arriba del título (ej: "PORTFOLIO") */
  eyebrow: z.string().max(60).optional(),
  /** texto principal de la escena */
  text: z.string().max(220).optional(),
  /** texto secundario */
  subtext: z.string().max(300).optional(),
  /** chips / features / métricas */
  items: z
    .array(
      z.object({
        label: z.string().max(60),
        value: z.string().max(40).optional(),
      })
    )
    .max(8)
    .optional(),
  /** nombre de archivo dentro de projects/<nombre>/assets/ */
  asset: z.string().max(200).optional(),
  /** subtítulo / caption en pantalla */
  caption: z.string().max(160).optional(),
  /** texto del botón CTA (escena cta) */
  cta: z.string().max(40).optional(),
});

export const BrandSchema = z.object({
  /** color de fondo base (hex) */
  bg: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  /** color primario de marca (hex) */
  primary: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  /** color de acento (hex) */
  accent: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  /** archivo de logo dentro de assets/ (opcional) */
  logo: z.string().max(200).optional(),
  /** handle / usuario para el CTA (opcional) */
  handle: z.string().max(60).optional(),
});

export const StoryboardSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  format: z.enum(["9:16", "1:1", "16:9"]),
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(220),
  cta: z.string().min(1).max(120),
  ctaSub: z.string().max(200).optional(),
  brand: BrandSchema,
  scenes: z.array(SceneSchema).min(3).max(12),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type SceneType = (typeof SCENE_TYPES)[number];

export const TRANSITION_FRAMES_FOR_DURATION = 14;
