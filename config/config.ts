export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export const FORMATS = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
} as const;

export type FormatId = keyof typeof FORMATS;

export const DEFAULT_FORMAT: FormatId = "9:16";

export function formatDimensions(format: FormatId) {
  return FORMATS[format];
}

/* ─────────────── sistema creativo: tipos de contenido y redes ─────────────── */

export const CONTENT_TYPES = [
  "reel",
  "static",
  "carousel",
  "linkedin-post",
  "x-post",
  "thread",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const PLATFORMS = ["instagram", "linkedin", "x"] as const;

export type Platform = (typeof PLATFORMS)[number];

/** aspectos disponibles para imágenes estáticas y carruseles */
export const STATIC_ASPECTS = ["4:5", "1:1", "16:9"] as const;

export type StaticAspect = (typeof STATIC_ASPECTS)[number];

export const STATIC_FORMATS: Record<StaticAspect, { width: number; height: number }> = {
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export function staticFormatDimensions(aspect: StaticAspect) {
  return STATIC_FORMATS[aspect];
}

/** qué tipos de contenido aplica publicar en cada red */
export const PLATFORM_ALLOWED_TYPES: Record<Platform, readonly ContentType[]> = {
  instagram: ["reel", "static", "carousel"],
  linkedin: ["static", "carousel", "linkedin-post"],
  x: ["static", "x-post", "thread"],
};

/** aspecto por defecto de cada red para piezas visuales */
export const PLATFORM_DEFAULT_ASPECT: Record<Platform, StaticAspect> = {
  instagram: "4:5",
  linkedin: "1:1",
  x: "16:9",
};

export const DEFAULT_PLATFORM: Platform | "all" = "all";
