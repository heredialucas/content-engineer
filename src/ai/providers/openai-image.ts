import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import type { ImageEditArgs, ImageProvider } from "../image-provider";

type ImageQuality = "low" | "medium" | "high" | "auto";

/**
 * Proveedor de imágenes OpenAI (GPT-Image-2.5 Flare por defecto).
 *
 * Solo hace EDITS sobre imágenes de referencia reales: se usa para limpiar,
 * recortar, encuadrar o subir de resolución los assets oficiales del proyecto.
 * No genera escenas desde cero.
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai-image";
  readonly model: string;
  private client: OpenAI;
  private defaultQuality: ImageQuality;

  constructor(opts: { apiKey: string; model?: string; quality?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model || "gpt-image-2.5-flare";
    const q = opts.quality ?? "high";
    this.defaultQuality = (["low", "medium", "high", "auto"].includes(q)
      ? q
      : "high") as ImageQuality;
  }

  async edit(args: ImageEditArgs): Promise<string> {
    if (args.referencePaths.length === 0) {
      throw new Error(
        `[openai-image] ${args.label}: la edición requiere al menos una imagen de referencia real.`
      );
    }

    const files = await Promise.all(
      args.referencePaths.map(async (refPath) => {
        const data = await fs.readFile(refPath);
        return toFile(data, path.basename(refPath));
      })
    );

    const res = await this.client.images.edit({
      model: this.model,
      image: files,
      prompt: args.prompt,
      size: args.size ?? "auto",
      quality: args.quality ?? this.defaultQuality,
      response_format: "b64_json",
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(`[openai-image] ${args.label}: la respuesta no incluyó imagen.`);
    }

    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, Buffer.from(b64, "base64"));
    return args.outputPath;
  }
}
