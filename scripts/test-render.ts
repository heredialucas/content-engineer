/**
 * Render de prueba con storyboard hardcodeado (DEMO_STORYBOARD).
 * No usa IA — valida que Remotion funcione de punta a punta.
 * Uso: pnpm test:render
 */
import fs from "node:fs/promises";
import path from "node:path";
import { DEMO_STORYBOARD } from "../src/remotion/Root";
import { renderVideo } from "../src/render/render-video";
import { OUTPUT_DIR } from "../config/paths";
import { loadProject, ensurePublicAssets } from "../src/project/load-project";
import { storyboardAssets } from "../agents/video";

async function main() {
  const info = await loadProject("portfolio");
  await ensurePublicAssets(info, storyboardAssets(DEMO_STORYBOARD));
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, "demo-test.mp4");
  console.log("Render de prueba (storyboard demo, sin IA)…");
  await renderVideo({ storyboard: DEMO_STORYBOARD, outPath: out });
  const stat = await fs.stat(out);
  console.log(`✅ ${out} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
