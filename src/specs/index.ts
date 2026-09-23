import { z } from "zod";
import {
  CONTENT_TYPES,
  PLATFORMS,
  STATIC_ASPECTS,
  FORMATS,
  type ContentType,
  type FormatId,
  type Platform,
  type StaticAspect,
} from "../../config/config";
import { CATEGORIES, type ContentCategory } from "../../config/content-mix";

/* ─────────────── v4: una pieza = bloques composables ─────────────── */

export const BLOCK_KINDS = [
  "hook",
  "statement",
  "screen",
  "metrics",
  "steps",
  "quote",
  "cta",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/**
 * Layouts de piezas estáticas. `stack` es el apilado genérico por bloques.
 * Los demás son composiciones minimalistas fijas (a prueba de estética IA):
 * - product-shot: screenshot oficial grande + claim corto
 * - editorial-split: frase editorial arriba + pantalla cortada abajo
 * - tech-card: ficha data-first (nombre + rubro + métricas reales)
 */
export const STATIC_LAYOUTS = [
  "stack",
  "presentation",
  "product-shot",
  "editorial-split",
  "tech-card",
] as const;
export type StaticLayout = (typeof STATIC_LAYOUTS)[number];

export const BlockItemSchema = z.object({
  label: z.string().max(90),
  value: z.string().max(40).nullable().optional(),
});
export type BlockItem = z.infer<typeof BlockItemSchema>;

export const BlockSchema = z.object({
  block: z.enum(BLOCK_KINDS),
  /** variante de composición del bloque (cada kind tiene las suyas) */
  variant: z.string().max(30).nullable().optional(),
  /** kicker corto en mayúsculas (ej: "CASO REAL") */
  eyebrow: z.string().max(60).nullable().optional(),
  /** texto principal del bloque */
  text: z.string().max(240).nullable().optional(),
  /** texto de apoyo */
  sub: z.string().max(320).nullable().optional(),
  /** datos para metrics/steps */
  items: z.array(BlockItemSchema).max(6).nullable().optional(),
  /** asset para screen (staticPath: projects/<p>/assets/...) */
  asset: z.string().max(200).nullable().optional(),
  /** texto del botón CTA */
  cta: z.string().max(40).nullable().optional(),
  /** subtítulo del reel (píldora inferior) */
  caption: z.string().max(130).nullable().optional(),
  /** duración del bloque, solo reels */
  durationInSeconds: z.number().min(1.2).max(8).nullable().optional(),
});
export type Block = z.infer<typeof BlockSchema>;

export const BrandSchema = z.object({
  bg: z.string().max(20),
  primary: z.string().max(20),
  accent: z.string().max(20),
  /** nombre de marca para el pie (ej: "Heredia Lucas") */
  name: z.string().max(60).nullable().optional(),
  handle: z.string().max(60).nullable().optional(),
  logo: z.string().max(200).nullable().optional(),
});
export type Brand = z.infer<typeof BrandSchema>;

/* ─────────────── specs por tipo de pieza ─────────────── */

export const ReelSpecSchema = z.object({
  kind: z.literal("reel"),
  format: z.enum(Object.keys(FORMATS) as [FormatId, FormatId, FormatId]),
  brand: BrandSchema,
  category: z.enum(CATEGORIES),
  blocks: z.array(BlockSchema).min(3).max(10),
});
export type ReelSpec = z.infer<typeof ReelSpecSchema>;

export const StaticSpecSchema = z.object({
  kind: z.literal("static"),
  aspect: z.enum(STATIC_ASPECTS),
  /** layout minimalista fijo; null/omitido = stack genérico */
  layout: z.enum(STATIC_LAYOUTS).nullable().optional(),
  brand: BrandSchema,
  category: z.enum(CATEGORIES),
  blocks: z.array(BlockSchema).min(1).max(4),
});
export type StaticSpec = z.infer<typeof StaticSpecSchema>;

export const CarouselPageSchema = z.object({
  blocks: z.array(BlockSchema).min(1).max(2),
});
export const CarouselSpecSchema = z.object({
  kind: z.literal("carousel"),
  aspect: z.enum(STATIC_ASPECTS),
  brand: BrandSchema,
  category: z.enum(CATEGORIES),
  pages: z.array(CarouselPageSchema).min(3).max(8),
});
export type CarouselSpec = z.infer<typeof CarouselSpecSchema>;
export type CarouselPage = z.infer<typeof CarouselPageSchema>;

export const PieceSpecSchema = z.discriminatedUnion("kind", [
  ReelSpecSchema,
  StaticSpecSchema,
  CarouselSpecSchema,
]);
export type PieceSpec = z.infer<typeof PieceSpecSchema>;

/* ─────────────── brief del Creative Director ─────────────── */

export const BriefSchema = z.object({
  category: z.enum(CATEGORIES),
  topic: z.string().min(3).max(120),
  idea: z.string().min(10).max(600),
  /** estructura de hook usada (ver src/knowledge/structures.ts) */
  hookStructure: z.string().min(3).max(40),
  hook: z.string().min(3).max(160),
  contentType: z.enum(CONTENT_TYPES),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(3),
  /** aspecto para piezas visuales */
  aspect: z.enum(STATIC_ASPECTS).nullable().optional(),
  /** formato del reel (9:16 | 1:1 | 16:9); null = 9:16 */
  reelFormat: z.enum(["9:16", "1:1", "16:9"]).nullable().optional(),
  /** outline: bloques/páginas/secciones sugeridas en orden */
  outline: z.string().max(800).nullable().optional(),
  assetsToUse: z.array(z.string().max(200)).max(6).nullable().optional(),
  creativeReason: z.string().max(300),
});
export type Brief = z.infer<typeof BriefSchema>;

/** tipos helpers */
export const isVisualKind = (t: ContentType): t is "reel" | "static" | "carousel" =>
  t === "reel" || t === "static" || t === "carousel";
export type VisualContentType = "reel" | "static" | "carousel";
export type { ContentType, Platform, StaticAspect, FormatId, ContentCategory };
