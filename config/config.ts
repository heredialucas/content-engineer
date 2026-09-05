export const FPS = 30;
export const TRANSITION_FRAMES = 14;

export const FORMATS = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
} as const;

export type FormatId = keyof typeof FORMATS;

export const DEFAULT_FORMAT: FormatId = "9:16";

export const TEMPLATE_IDS = [
  "portfolio-showcase",
  "website-demo",
  "problem-solution",
  "case-study",
  "product-promo",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function formatDimensions(format: FormatId) {
  return FORMATS[format];
}
