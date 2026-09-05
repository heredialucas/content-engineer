import path from "node:path";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { REMOTION_ENTRY } from "../../config/paths";
import type { Storyboard } from "../storyboard/types";

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

export type RenderVideoArgs = {
  storyboard: Storyboard;
  outPath: string;
};

export async function renderVideo({ storyboard, outPath }: RenderVideoArgs): Promise<void> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();
  const inputProps = { storyboard };

  const composition = await selectComposition({
    serveUrl,
    id: "ContentEngine",
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
