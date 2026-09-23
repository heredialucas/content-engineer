import fs from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR } from "../config/paths";
import { renderQuickAd, renderVideo } from "../src/render/render-video";
import { renderCarouselSlides, renderStaticImage } from "../src/render/render-still";
import { DEMO_CAROUSEL_SPEC, DEMO_REEL_SPEC, DEMO_STATIC_SPEC } from "../src/remotion/Root";
import type { ReelSpec } from "../src/specs";

/**
 * Render de sanidad del motor v4: usa los specs de demostración (sin IA).
 * Salida en output/ (gitignored).
 */
async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // reel corto para que el test sea rápido
  const testReel: ReelSpec = {
    ...DEMO_REEL_SPEC,
    blocks: DEMO_REEL_SPEC.blocks.map((b) => ({ ...b, durationInSeconds: 1.2 })),
  };

  console.log("🎬 Test 1/4 — reel");
  await renderVideo({ spec: testReel, outPath: path.join(OUTPUT_DIR, "test-reel.mp4") });

  console.log("🖼️  Test 2/4 — static");
  await renderStaticImage({
    spec: DEMO_STATIC_SPEC,
    outPath: path.join(OUTPUT_DIR, "test-static.png"),
  });

  console.log("📑 Test 3/4 — carrusel (slide 1)");
  await renderCarouselSlides({
    spec: { ...DEMO_CAROUSEL_SPEC, pages: DEMO_CAROUSEL_SPEC.pages.slice(0, 3) },
    outDir: path.join(OUTPUT_DIR, "test-carousel"),
  });

  console.log("📱 Test 4/4 — video corto para anuncio");
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="100%" height="100%" fill="#d4e0ed"/><circle cx="540" cy="700" r="300" fill="#006bff"/></svg>'
  ).toString("base64");
  await renderQuickAd({
    imageDataUrl: `data:image/svg+xml;base64,${svg}`,
    headline: "Una idea para tu marca",
    brandName: "Content Studio",
    outPath: path.join(OUTPUT_DIR, "test-quick-ad.mp4"),
  });

  console.log(`\n✅ Renders de prueba listos en ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
