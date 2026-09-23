import fs from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR } from "../config/paths";
import { loadProject, ensurePublicAssets } from "../src/project/load-project";
import { parseMarca } from "../src/pipeline/generate";
import { renderStaticImage } from "../src/render/render-still";
import { StaticSpecSchema, type StaticSpec } from "../src/specs";

/**
 * Renderiza previews de los 3 layouts minimalistas de statics con DATOS Y
 * ASSETS OFICIALES del portafolio (sin IA, sin tokens).
 *
 * Uso: pnpm previews:layouts [proyecto=portfolio]
 * Salida: output/layout-previews/{product-shot,editorial-split,tech-card}.png
 */

const PROJECT = process.argv[2] ?? "portfolio";

// asset oficial de un proyecto real del portafolio
const SHOT = "projects/portfolio/assets/projects/decoAtletasHome.png";
const LOGO = "projects/portfolio/assets/logo/logoHL-mark.png";

const buildSpecs = (brand: ReturnType<typeof parseMarca>): StaticSpec[] => {
  const presentation = StaticSpecSchema.parse({
    kind: "static",
    aspect: "1:1",
    layout: "presentation",
    brand,
    category: "presentacion",
    blocks: [
      {
        block: "screen",
        variant: "framed",
        eyebrow: "Deco Atletas",
        text: "Tienda online de accesorios para corredores",
        asset: SHOT,
      },
    ],
  }) as StaticSpec;

  const productShot = StaticSpecSchema.parse({
    kind: "static",
    aspect: "1:1",
    layout: "product-shot",
    brand,
    category: "proyectos",
    blocks: [
      { block: "screen", variant: "framed", eyebrow: "DECO ATLETAS · E-COMMERCE", asset: SHOT },
      { block: "hook", variant: "stack", text: "Comprar en 3 taps" },
      { block: "cta", variant: "minimal", cta: "Escribime" },
    ],
  }) as StaticSpec;

  const editorialSplit = StaticSpecSchema.parse({
    kind: "static",
    aspect: "1:1",
    layout: "editorial-split",
    brand,
    category: "venta",
    blocks: [
      {
        block: "statement",
        variant: "editorial",
        eyebrow: "EL PROBLEMA",
        text: "Un sitio que no convierte es una tarjeta digital muerta.",
      },
      { block: "screen", variant: "browser", asset: SHOT },
    ],
  }) as StaticSpec;

  const techCard = StaticSpecSchema.parse({
    kind: "static",
    aspect: "1:1",
    layout: "tech-card",
    brand,
    category: "proyectos",
    blocks: [
      { block: "hook", variant: "serif", text: "Deco Atletas", sub: "E-commerce · Accesorios para corredores" },
      { block: "screen", variant: "framed", asset: SHOT },
      {
        block: "metrics",
        variant: "rows",
        items: [
          { label: "Stack", value: "Next.js + React" },
          { label: "Operación", value: "Digital-first" },
          { label: "Diseño", value: "Mobile-first" },
        ],
      },
      { block: "cta", variant: "minimal", text: "¿Sumamos esto a tu tienda?", cta: "Escribime por Instagram" },
    ],
  }) as StaticSpec;

  return [presentation, productShot, editorialSplit, techCard];
};

const NAMES = ["presentation", "product-shot", "editorial-split", "tech-card"];

async function main() {
  const info = await loadProject(PROJECT);
  const brand = parseMarca(info);
  const specs = buildSpecs(brand);

  await ensurePublicAssets(info, [SHOT, LOGO]);

  const outDir = path.join(OUTPUT_DIR, "layout-previews");
  await fs.mkdir(outDir, { recursive: true });

  for (let i = 0; i < specs.length; i++) {
    const outPath = path.join(outDir, `${NAMES[i]}.png`);
    console.log(`🖼️  ${NAMES[i]} → ${outPath}`);
    await renderStaticImage({ spec: specs[i], outPath });
  }

  console.log(`\n✅ Previews listos en ${outDir}/`);
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
