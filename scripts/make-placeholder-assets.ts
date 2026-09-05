/**
 * Genera assets de ejemplo (screenshots placeholder + logo) para un proyecto.
 * Uso: pnpm assets:placeholders <proyecto> [cantidad=4]
 *
 * Los screenshots se renderizan con Remotion (composición PlaceholderScreen)
 * así el video de prueba funciona sin tener capturas reales.
 * Reemplazables después por screenshots reales en projects/<proyecto>/assets/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { REMOTION_ENTRY, PROJECTS_DIR } from "../config/paths";

const PALETTES = [
  { colorA: "#6366F1", colorB: "#22D3EE" },
  { colorA: "#8B5CF6", colorB: "#EC4899" },
  { colorA: "#0EA5E9", colorB: "#22D3EE" },
  { colorA: "#F59E0B", colorB: "#EF4444" },
];

const LOGO_SVG = (cA: string, cB: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${cA}"/>
      <stop offset="1" stop-color="${cB}"/>
    </linearGradient>
  </defs>
  <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#g)"/>
  <rect x="136" y="136" width="56" height="240" rx="28" fill="#0B0F1A"/>
  <rect x="136" y="320" width="168" height="56" rx="28" fill="#0B0F1A"/>
  <circle cx="352" cy="164" r="34" fill="#0B0F1A"/>
</svg>
`;

async function main() {
  const projectName = process.argv[2] ?? "portfolio";
  const count = Math.max(1, Math.min(6, parseInt(process.argv[3] ?? "4", 10) || 4));

  const projectDir = path.join(PROJECTS_DIR, projectName);
  const shotsDir = path.join(projectDir, "assets", "screenshots");
  const logoDir = path.join(projectDir, "assets", "logo");
  await fs.mkdir(shotsDir, { recursive: true });
  await fs.mkdir(logoDir, { recursive: true });

  console.log(`⚙️  Empaquetando Remotion…`);
  const serveUrl = await bundle({
    entryPoint: REMOTION_ENTRY,
    webpackOverride: (c) => c,
  });
  await ensureBrowser();

  for (let i = 0; i < count; i++) {
    const palette = PALETTES[i % PALETTES.length];
    const output = path.join(shotsDir, `shot-${i + 1}.png`);
    console.log(`  🖼  Generando ${path.relative(process.cwd(), output)}…`);
    const inputProps = {
      width: 1600,
      height: 1000,
      title: projectName.charAt(0).toUpperCase() + projectName.slice(1),
      subtitle: `Vista ${i + 1} — screenshot placeholder`,
      colorA: palette.colorA,
      colorB: palette.colorB,
      seed: i + 1,
    };
    const composition = await selectComposition({
      serveUrl,
      id: "PlaceholderScreen",
      inputProps,
    });
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      frame: 25,
      output,
    });
  }

  const logoPath = path.join(logoDir, "logo.svg");
  await fs.writeFile(logoPath, LOGO_SVG(PALETTES[0].colorA, PALETTES[0].colorB), "utf8");
  console.log(`  🔷 Logo placeholder: ${path.relative(process.cwd(), logoPath)}`);

  console.log(`\n✅ ${count} screenshots + logo listos en projects/${projectName}/assets/`);
  console.log("   Reemplazalos con capturas reales cuando quieras (mismos nombres de archivo).");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
