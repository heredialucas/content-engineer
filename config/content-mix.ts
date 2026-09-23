/**
 * Distribución de contenido (content mix).
 * El mix default se puede sobrescribir por proyecto con una sección "## Content mix"
 * en info.md, con líneas tipo:
 *
 *   ## Content mix
 *   - venta: 30%
 *   - educativo: 20%
 *   - proyectos: 15%
 *
 * "venta" = contenido orientado al cliente futuro: qué vendo, por qué lo necesita,
 * dolores que resuelvo, objeciones, beneficios. Los proyectos quedan como prueba social.
 */

export const CATEGORIES = [
  "presentacion",
  "venta",
  "proyectos",
  "educativo",
  "opiniones",
  "proceso",
  "personal",
  "promocional",
] as const;

export type ContentCategory = (typeof CATEGORIES)[number];

/**
 * Mix v4: venta consultiva (menos agresiva), más peso en prueba (proyectos),
 * educación y opinión. `presentacion` arranca en 0: se usa para las piezas de
 * presentación (portfolio / proyecto) antes de pasar a la fase de venta.
 * Sobreescribible por proyecto vía info.md.
 */
export const DEFAULT_CONTENT_MIX: Record<ContentCategory, number> = {
  presentacion: 0,
  venta: 20,
  proyectos: 20,
  educativo: 20,
  opiniones: 15,
  proceso: 15,
  personal: 5,
  promocional: 5,
};

const ALIASES: Record<string, ContentCategory> = {
  presentacion: "presentacion",
  presentación: "presentacion",
  presentar: "presentacion",
  presentaciones: "presentacion",
  intro: "presentacion",
  showcase: "presentacion",
  venta: "venta",
  ventas: "venta",
  oferta: "venta",
  ofertas: "venta",
  proyectos: "proyectos",
  proyecto: "proyectos",
  casos: "proyectos",
  "casos reales": "proyectos",
  educativo: "educativo",
  educativa: "educativo",
  educacion: "educativo",
  opiniones: "opiniones",
  opinion: "opiniones",
  "hot takes": "opiniones",
  proceso: "proceso",
  "behind the scenes": "proceso",
  bts: "proceso",
  personal: "personal",
  promocional: "promocional",
  promo: "promocional",
};

/** Lee el mix del proyecto (sección "## Content mix" de info.md) o devuelve el default */
export function resolveContentMix(
  sections?: Record<string, string>
): Record<ContentCategory, number> {
  const mix: Record<ContentCategory, number> = { ...DEFAULT_CONTENT_MIX };
  const raw = sections?.["content mix"];
  if (!raw) return mix;
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*-\s*([\wáéíóúñü\s/]+?)\s*:\s*(\d+)\s*%?\s*$/i);
    if (!m) continue;
    const key = ALIASES[m[1].trim().toLowerCase()];
    if (key) mix[key] = Math.max(0, Math.min(100, parseInt(m[2], 10)));
  }
  return mix;
}

/**
 * Convierte porcentajes en cuotas enteras para un lote de `count` piezas
 * (método de mayor resto para que la suma sea exacta).
 */
export function computeQuotas(
  count: number,
  mix: Record<ContentCategory, number>
): Record<ContentCategory, number> {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 100;
  const exact = CATEGORIES.map((cat) => ({
    cat,
    value: (mix[cat] / total) * count,
  }));
  const quotas = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, 0])
  ) as Record<ContentCategory, number>;
  let assigned = 0;
  const remainders: { cat: ContentCategory; remainder: number }[] = [];
  for (const { cat, value } of exact) {
    const floor = Math.floor(value);
    quotas[cat] = floor;
    assigned += floor;
    remainders.push({ cat, remainder: value - floor });
  }
  remainders
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, Math.max(0, count - assigned))
    .forEach(({ cat }) => {
      quotas[cat] += 1;
    });
  return quotas;
}
