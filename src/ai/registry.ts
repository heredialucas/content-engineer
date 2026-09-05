import type { TextProvider } from "./text-provider";
import { OpenAITextProvider } from "./providers/openai";

/**
 * Registry de proveedores de texto.
 * Para agregar otro proveedor: implementá TextProvider en src/ai/providers/
 * y sumalo acá.
 */
let cached: TextProvider | null = null;

export function getTextProvider(): TextProvider {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está definida. Configurá el archivo .env (ver .env.example)."
    );
  }
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
  const reasoning = process.env.OPENAI_REASONING || "low";

  cached = new OpenAITextProvider({ apiKey, model, reasoning });
  return cached;
}

/* Interfaces listas para proveedores futuros (sin implementación activa):

  - VoiceProvider (ElevenLabs): generar voiceover a partir del guion.
  - StockProvider (Pexels / Pixabay): buscar clips e imágenes de stock gratis
    para las escenas showcase cuando el proyecto no tenga assets propios.
  - PublishProvider (Buffer): publicar el contenido en redes (ver agents/social-media).

  Cada uno tendrá su módulo en src/ y se registra acá o en su propio registry.
*/
