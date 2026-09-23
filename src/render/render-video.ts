import path from "node:path";
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { REMOTION_ENTRY } from "../../config/paths";
import type { ReelSpec } from "../specs";
import type { QuickAdProps } from "../remotion/Root";

/** bundle cacheado por proceso: con --count N se empaqueta una sola vez */
let bundlePromise: Promise<string> | null = null;

export function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    console.log("  ⚙️  Empaquetando composiciones Remotion…");
    bundlePromise = bundle({
      entryPoint: REMOTION_ENTRY,
      onProgress: () => {},
      webpackOverride: (c) => c,
    });
  }
  return bundlePromise;
}

/**
 * Copia un archivo dentro del public/ del bundle YA empaquetado (el bundler
 * copia public/ al crear el bundle, así que los archivos que aparecen después
 * del bundle no se sirven y dan 404).
 */
export async function copyIntoBundlePublic(relPath: string, absSource: string): Promise<void> {
  if (!bundlePromise) return;
  try {
    const dir = await bundlePromise;
    const dest = path.join(dir, "public", relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(absSource, dest);
  } catch {
    /* mejor esfuerzo: si falla, el archivo queda igualmente en public/ */
  }
}

export type RenderVideoArgs = {
  spec: ReelSpec;
  outPath: string;
};

export async function renderVideo({ spec, outPath }: RenderVideoArgs): Promise<void> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();
  const inputProps = { spec };

  const composition = await selectComposition({
    serveUrl,
    id: "ReelPiece",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 92,
    chromiumOptions: { gl: "swiftshader" },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`  🎬 Render: ${pct}%\r`);
    },
  });
  process.stdout.write("\n");
}

export async function renderQuickAd(args: QuickAdProps & { outPath: string }): Promise<void> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();
  const { outPath, ...inputProps } = args;
  const composition = await selectComposition({
    serveUrl,
    id: "QuickAd",
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 90,
    chromiumOptions: { gl: "swiftshader" },
  });
}

export async function renderStillFrame(args: {
  serveUrl: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  output: string;
  width: number;
  height: number;
}): Promise<void> {
  await ensureBrowser();
  const composition = await selectComposition({
    serveUrl: args.serveUrl,
    id: args.compositionId,
    inputProps: args.inputProps,
  });
  await renderStill({
    composition,
    serveUrl: args.serveUrl,
    inputProps: args.inputProps,
    output: args.output,
  });
}

export const absolutePath = (p: string) => path.resolve(p);
