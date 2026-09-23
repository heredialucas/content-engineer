import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { hasSession } from "@/src/server/auth";
import { appendStudioPiece, projectDescription, projectDirectory, type StudioPiece } from "@/src/server/studio";
import { renderQuickAd } from "@/src/render/render-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_REFERENCE_BYTES = 12 * 1024 * 1024;
const ALLOWED_REFERENCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
let generationInProgress = false;

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY en el servidor." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No pudimos leer el formulario." }, { status: 400 });
  }

  const project = String(form.get("project") ?? "");
  const kind = String(form.get("kind") ?? "");
  const prompt = String(form.get("prompt") ?? "").trim();
  if (!project || !["post", "story", "video"].includes(kind) || prompt.length < 8 || prompt.length > 1800) {
    return NextResponse.json({ error: "Elegí un formato y escribí una idea de al menos 8 caracteres." }, { status: 400 });
  }
  if (generationInProgress) {
    return NextResponse.json({ error: "Ya hay una creación en curso. Esperá a que termine." }, { status: 429 });
  }

  const reference = form.get("reference");
  let referenceBytes: Buffer | undefined;
  let referenceName = "";
  if (reference instanceof File && reference.size > 0) {
    if (!ALLOWED_REFERENCE_TYPES.has(reference.type) || reference.size > MAX_REFERENCE_BYTES) {
      return NextResponse.json({ error: "La referencia debe ser PNG, JPG o WebP y pesar menos de 12 MB." }, { status: 400 });
    }
    referenceBytes = Buffer.from(await reference.arrayBuffer());
    referenceName = reference.name || "referencia.png";
  }

  generationInProgress = true;
  let imagePath: string | undefined;
  let videoPath: string | undefined;
  try {
    const directory = projectDirectory(project);
    const profile = await projectDescription(directory);
    const size = kind === "post" ? "1024x1536" : "1024x1536";
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";
    const styleContext = profile.info
      .match(/^##\s+(?:Descripción|Description)\s*\n+([\s\S]*?)(?=\n##\s|$)/m)?.[1]
      ?.replace(/\s+/g, " ")
      .trim()
      .slice(0, 700);
    const brandContext = profile.info
      .match(/^##\s+Marca\s*\n+([\s\S]*?)(?=\n##\s|$)/im)?.[1]
      ?.split("\n")
      .filter((line) => /#[0-9a-f]{3,8}/i.test(line))
      .join(" ");
    const promptForImage = [
      `Create a polished, photorealistic social media visual for the brand ${profile.name}.`,
      styleContext ? `Brand context: ${styleContext}` : "",
      brandContext ? `Respect this brand color palette: ${brandContext}` : "",
      `Creative brief: ${prompt}`,
      "Do not render words, lettering, logos, watermarks, UI mockups, or fake product labels. Keep the main subject clear and leave visual breathing room. This is the image itself, not a poster template.",
      kind === "post" ? "Compose vertically for an Instagram feed post, 4:5 crop safe." : "Compose vertically for an Instagram story or reel, 9:16 crop safe.",
    ].filter(Boolean).join("\n\n");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const generated = referenceBytes
      ? await client.images.edit({
          model,
          image: await toFile(referenceBytes, referenceName),
          prompt: promptForImage,
          size,
          quality: process.env.OPENAI_IMAGE_QUALITY === "low" ? "low" : "high",
          response_format: "b64_json",
        })
      : await client.images.generate({
          model,
          prompt: promptForImage,
          size,
          quality: process.env.OPENAI_IMAGE_QUALITY === "low" ? "low" : "high",
          response_format: "b64_json",
        });

    const raw = generated.data?.[0]?.b64_json;
    if (!raw) throw new Error("El proveedor no devolvió la imagen.");
    const target = kind === "post" ? { width: 1080, height: 1350 } : { width: 1080, height: 1920 };
    const png = await sharp(Buffer.from(raw, "base64"))
      .rotate()
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();

    const id = `studio-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6)}`;
    const relativeImage = `studio/${id}/image.png`;
    imagePath = path.join(directory, relativeImage);
    await fs.mkdir(path.dirname(imagePath), { recursive: true });
    await fs.writeFile(imagePath, png);

    const files: Record<string, string> = { image: relativeImage };
    let outputType = kind === "video" ? "reel" : "static";
    if (kind === "video") {
      const relativeVideo = `videos/${id}.mp4`;
      videoPath = path.join(directory, relativeVideo);
      await fs.mkdir(path.dirname(videoPath), { recursive: true });
      const title = prompt.replace(/\s+/g, " ").trim().slice(0, 52);
      await renderQuickAd({
        imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
        headline: title,
        brandName: profile.name,
        outPath: videoPath,
      });
      files.video = relativeVideo;
    }

    const piece: StudioPiece = {
      id,
      date: new Date().toISOString(),
      project,
      platforms: ["instagram"],
      contentType: outputType,
      format: kind,
      category: "promocional",
      topic: prompt.slice(0, 200),
      hook: prompt.slice(0, 140),
      idea: prompt,
      files,
      status: "draft",
    };
    await appendStudioPiece(project, piece);
    return NextResponse.json({ piece, message: "Tu creación ya está lista." }, { status: 201 });
  } catch (error) {
    await Promise.allSettled([imagePath, videoPath].filter((file): file is string => Boolean(file)).map((file) => fs.unlink(file)));
    const message = error instanceof Error ? error.message : "No se pudo generar el contenido.";
    console.error("[studio:generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    generationInProgress = false;
  }
}
