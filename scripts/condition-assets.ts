import { loadProject } from "../src/project/load-project";
import { conditionAsset } from "../src/assets/condition";

/**
 * Condiciona los screenshots OFICIALES de un proyecto con GPT-Image-2.5 (edits):
 * limpia fondo, encuadra la interfaz, nivela luz/nitidez. No genera escenas.
 *
 * Uso: pnpm assets:condition <proyecto=portfolio>
 * Salida: projects/<p>/assets/conditioned/*.png (cacheado)
 */

const PROJECT = process.argv[2] ?? "portfolio";

async function main() {
  const info = await loadProject(PROJECT);
  const shots = info.assets.filter(
    (a) => a.kind === "image" && a.relPath.startsWith("screenshots/")
  );
  if (shots.length === 0) {
    console.log(`No hay screenshots en projects/${PROJECT}/assets/screenshots/.`);
    return;
  }

  for (const shot of shots) {
    console.log(`🩹 ${shot.relPath} …`);
    const out = await conditionAsset({
      projectName: PROJECT,
      assetStaticPath: shot.staticPath,
      absSource: shot.absPath,
    });
    console.log(out ? `   ✅ ${out}` : `   ⚠️  sin cambios (se usa el original)`);
  }
  console.log(`\n✅ Listo. Los condicionados quedan en projects/${PROJECT}/assets/conditioned/`);
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
