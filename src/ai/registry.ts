import type { TextProvider } from "./text-provider";
import type { ImageProvider } from "./image-provider";
import { OpenAITextProvider } from "./providers/openai";
import { OpenAIImageProvider } from "./providers/openai-image";

/**
 * Registry de proveedores.
 * Para agregar otro proveedor: implementá la interfaz en src/ai/providers/
 * y sumalo acá.
 */
let cachedText: TextProvider | null = null;
let cachedImage: ImageProvider | null = null;

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está definida. Configurá el archivo .env (ver .env.example)."
    );
  }
  return apiKey;
}

export function getTextProvider(): TextProvider {
  if (cachedText) return cachedText;
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
  const reasoning = process.env.OPENAI_REASONING || "low";
  cachedText = new OpenAITextProvider({ apiKey: requireApiKey(), model, reasoning });
  return cachedText;
}

/**
 * Proveedor de imágenes: SOLO edita assets oficiales (ver src/ai/image-provider.ts).
 * Se instancia de forma perezosa para no exigir la key en flujos que no lo usan.
 */
export function getImageProvider(): ImageProvider {
  if (cachedImage) return cachedImage;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";
  const quality = process.env.OPENAI_IMAGE_QUALITY || "high";
  cachedImage = new OpenAIImageProvider({ apiKey: requireApiKey(), model, quality });
  return cachedImage;
}

/* Interfaces listas para proveedores futuros (sin implementación activa):

  - VoiceProvider (ElevenLabs): generar voiceover a partir del guion.
  - StockProvider (Pexels / Pixabay): buscar clips e imágenes de stock gratis.
  - PublishProvider (Buffer): publicar el contenido en redes.

  Cada uno tendrá su módulo en src/ y se registra acá o en su propio registry.
*/
