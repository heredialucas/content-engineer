import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Host de medios.
 *
 * Buffer NO acepta subida de archivos: hay que pasarle una URL pública,
 * directa, HTTPS y estable. Este módulo sube los archivos locales generados
 * por el motor y devuelve esa URL.
 *
 * Config por env (una de las dos):
 *   MEDIA_HOST=cloudinary + CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
 *   MEDIA_HOST=cloudinary + CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET (unsigned)
 *   MEDIA_HOST=catbox   (prueba, sin cuenta)
 */

export type MediaHost = {
  readonly name: string;
  /** sube un archivo local y devuelve su URL pública */
  upload(absPath: string): Promise<string>;
};

function parseCloudinaryUrl(
  url: string
): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const m = url.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) return null;
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
}

class CloudinaryHost implements MediaHost {
  readonly name = "cloudinary";

  constructor(
    private cloudName: string,
    private opts:
      | { kind: "signed"; apiKey: string; apiSecret: string }
      | { kind: "unsigned"; uploadPreset: string }
  ) {}

  async upload(absPath: string): Promise<string> {
    const buf = await fs.readFile(absPath);
    const form = new FormData();
    form.append("file", new Blob([buf]), path.basename(absPath));

    if (this.opts.kind === "unsigned") {
      form.append("upload_preset", this.opts.uploadPreset);
    } else {
      const timestamp = Math.floor(Date.now() / 1000);
      // firma Cloudinary: sha1("timestamp=<ts>" + api_secret)
      const signature = crypto
        .createHash("sha1")
        .update(`timestamp=${timestamp}${this.opts.apiSecret}`)
        .digest("hex");
      form.append("api_key", this.opts.apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !json.secure_url) {
      throw new Error(`[cloudinary] ${json.error?.message ?? `HTTP ${res.status}`}`);
    }
    return json.secure_url;
  }
}

/** Catbox: host público sin cuenta. Solo para pruebas rápidas. */
class CatboxHost implements MediaHost {
  readonly name = "catbox";
  async upload(absPath: string): Promise<string> {
    const buf = await fs.readFile(absPath);
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([buf]), path.basename(absPath));
    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form,
    });
    const url = (await res.text()).trim();
    if (!res.ok || !/^https?:\/\/\S+$/.test(url)) {
      throw new Error(`[catbox] ${url || `HTTP ${res.status}`}`);
    }
    return url;
  }
}

class NotConfiguredHost implements MediaHost {
  readonly name = "none";
  async upload(): Promise<string> {
    throw new Error(
      "No hay host de medios configurado. Buffer no acepta subir archivos: " +
        "configurá MEDIA_HOST y CLOUDINARY_URL en .env para obtener una URL pública."
    );
  }
}

let cached: MediaHost | null = null;

export function getMediaHost(): MediaHost {
  if (cached) return cached;
  const host = (process.env.MEDIA_HOST ?? "").trim().toLowerCase();

  if (host === "cloudinary") {
    const fromUrl = process.env.CLOUDINARY_URL ? parseCloudinaryUrl(process.env.CLOUDINARY_URL) : null;
    if (fromUrl) {
      cached = new CloudinaryHost(fromUrl.cloudName, {
        kind: "signed",
        apiKey: fromUrl.apiKey,
        apiSecret: fromUrl.apiSecret,
      });
      return cached;
    }
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (cloud && preset) {
      cached = new CloudinaryHost(cloud, { kind: "unsigned", uploadPreset: preset });
      return cached;
    }
  }

  if (host === "catbox") {
    cached = new CatboxHost();
    return cached;
  }

  cached = new NotConfiguredHost();
  return cached;
}
