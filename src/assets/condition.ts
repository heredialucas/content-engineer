import fs from "node:fs/promises";
import path from "node:path";
import { PROJECTS_DIR } from "../../config/paths";
import { getImageProvider } from "../ai/registry";
import type { ProjectInfo } from "../project/load-project";
import { PieceSpecSchema, type Block, type PieceSpec } from "../specs";

/**
 * Asset conditioner.
 *
 * Pasa los screenshots OFICIALES del proyecto por GPT-Image-2.5 (modo edición)
 * para limpiar el encuadre: recortar el fondo, encuadrar la interfaz, nivelar
 * luz/nitidez. NUNCA inventa contenido, nunca genera escenas.
 *
 * - Toggle: `ASSET_CONDITION=on` (default off).
 * - Prompt: override con `ASSET_CONDITION_PROMPT`.
 * - Resultado: `projects/<p>/assets/conditioned/<nombre>.png` (cacheado).
 * - Si falla, se mantiene el asset original (degradación segura).
 */

const DEFAULT_PROMPT =
  "Editá esta captura de pantalla oficial de un producto web para uso editorial: " +
  "recortá el fondo sobrante y dejá la interfaz bien encuadrada y centrada, " +
  "enderezá la perspectiva si está inclinada, nivelá el brillo y la nitidez. " +
  "NO cambies el contenido de la interfaz, NO agregues ni quites texto, " +
  "NO inventes elementos, personas ni marcas. Mantené exactamente la UI original.";

export const shouldConditionAssets = (): boolean => {
  const v = (process.env.ASSET_CONDITION ?? "off").trim().toLowerCase();
  return v === "on" || v === "1" || v === "true" || v === "yes";
};

const conditionPrompt = (): string =>
  process.env.ASSET_CONDITION_PROMPT?.trim() || DEFAULT_PROMPT;

const relConditioned = (assetStaticPath: string): string => {
  const base = path.basename(assetStaticPath, path.extname(assetStaticPath));
  return `conditioned/${base}.png`;
};

/**
 * Condiciona un asset oficial. Devuelve el staticPath del resultado o null si
 * no se pudo (sin provider, error o archivo inexistente).
 */
export async function conditionAsset(args: {
  projectName: string;
  /** staticPath canónico: projects/<p>/assets/<rel> */
  assetStaticPath: string;
  /** ruta absoluta del asset oficial */
  absSource: string;
}): Promise<string | null> {
  const rel = relConditioned(args.assetStaticPath);
  const outAbs = path.join(PROJECTS_DIR, args.projectName, "assets", rel);
  const newStaticPath = `projects/${args.projectName}/assets/${rel}`;

  // cache: si el condicionado es más nuevo que la fuente, reutilizar
  try {
    const [outStat, srcStat] = await Promise.all([fs.stat(outAbs), fs.stat(args.absSource)]);
    if (outStat.mtimeMs >= srcStat.mtimeMs) return newStaticPath;
  } catch {
    /* no existe → condicionar */
  }

  try {
    const provider = getImageProvider();
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    await provider.edit({
      prompt: conditionPrompt(),
      referencePaths: [args.absSource],
      outputPath: outAbs,
      label: path.basename(args.assetStaticPath),
      size: "auto",
    });
    return newStaticPath;
  } catch (err) {
    console.warn(
      `   ⚠️  conditioner: no se pudo condicionar ${path.basename(args.assetStaticPath)} ` +
        `(${err instanceof Error ? err.message : err}); se usa el asset original.`
    );
    return null;
  }
}

const remapBlock = async (
  block: Block,
  byStatic: Map<string, { absPath: string }>,
  projectName: string
): Promise<Block> => {
  if (block.block !== "screen" || !block.asset) return block;
  const asset = byStatic.get(block.asset);
  if (!asset) return block;
  const next = await conditionAsset({
    projectName,
    assetStaticPath: block.asset,
    absSource: asset.absPath,
  });
  return next ? { ...block, asset: next } : block;
};

/** Condiciona (si aplica) todos los assets `screen` de una pieza. */
export async function conditionSpec<T extends PieceSpec>(spec: T, info: ProjectInfo): Promise<T> {
  if (!shouldConditionAssets()) return spec;
  const byStatic = new Map(info.assets.filter((a) => a.kind === "image").map((a) => [a.staticPath, a]));

  if (spec.kind === "carousel") {
    const pages = [];
    for (const page of spec.pages) {
      const blocks = [];
      for (const b of page.blocks) blocks.push(await remapBlock(b, byStatic, info.name));
      pages.push({ blocks });
    }
    return PieceSpecSchema.parse({ ...spec, pages }) as T;
  }

  const blocks = [];
  for (const b of spec.blocks) blocks.push(await remapBlock(b, byStatic, info.name));
  return PieceSpecSchema.parse({ ...spec, blocks }) as T;
}
