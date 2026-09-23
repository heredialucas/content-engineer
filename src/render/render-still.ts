import path from "node:path";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { getServeUrl } from "./render-video";
import type { CarouselSpec, StaticSpec } from "../specs";

export type ImageFormat = "png" | "jpeg";

/** frame avanzado: deja asentar las animaciones de entrada (springs) */
const STILL_FRAME = 90;

/** Renderiza una imagen estática (PNG/JPG) desde un StaticSpec v4 */
export async function renderStaticImage(args: {
  spec: StaticSpec;
  outPath: string;
  imageFormat?: ImageFormat;
}): Promise<void> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();
  const inputProps = { spec: args.spec };

  const composition = await selectComposition({
    serveUrl,
    id: "StaticPiece",
    inputProps,
  });

  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame: STILL_FRAME,
    output: args.outPath,
    imageFormat: args.imageFormat ?? "png",
    ...(args.imageFormat === "jpeg" ? { jpegQuality: 95 } : {}),
    overwrite: true,
  });
}

/** Renderiza todas las páginas de un carrusel. Devuelve las rutas generadas. */
export async function renderCarouselSlides(args: {
  spec: CarouselSpec;
  outDir: string;
  imageFormat?: ImageFormat;
  onSlide?: (index: number, total: number) => void;
}): Promise<string[]> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();

  const outputs: string[] = [];
  for (let i = 0; i < args.spec.pages.length; i++) {
    // selectComposition POR página: fija los inputProps correctos (si se hace
    // una sola vez, todas las slides salen con pageIndex 0)
    const composition = await selectComposition({
      serveUrl,
      id: "CarouselPiece",
      inputProps: { spec: args.spec, pageIndex: i },
    });

    const output = path.join(args.outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await renderStill({
      composition,
      serveUrl,
      inputProps: { spec: args.spec, pageIndex: i },
      frame: STILL_FRAME,
      output,
      imageFormat: args.imageFormat ?? "png",
      ...(args.imageFormat === "jpeg" ? { jpegQuality: 95 } : {}),
      overwrite: true,
    });
    outputs.push(output);
    args.onSlide?.(i + 1, args.spec.pages.length);
  }
  return outputs;
}
