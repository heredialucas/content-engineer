import fs from "node:fs/promises";
import path from "node:path";
import { PROJECTS_DIR, PUBLIC_DIR } from "../../config/paths";

export type AssetKind = "image" | "video" | "other";

export type AssetFile = {
  /** nombre de archivo, ej: screenshots/shot-1.png */
  relPath: string;
  /** ruta absoluta en el proyecto */
  absPath: string;
  /** ruta para staticFile() (dentro del public de Remotion) */
  staticPath: string;
  kind: AssetKind;
  sizeBytes: number;
};

export type ProjectInfo = {
  name: string;
  dir: string;
  /** secciones del info.md (título del heading → contenido) */
  sections: Record<string, string>;
  raw: string;
  assets: AssetFile[];
};

const EXT_KINDS: Record<string, AssetKind> = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".svg": "image",
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
};

/** parser simple de markdown por secciones "## Título" */
export function parseInfoMarkdown(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current = "intro";
  for (const line of raw.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      sections[current] = "";
    } else {
      sections[current] = (sections[current] ?? "") + line + "\n";
    }
  }
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].trim();
  }
  return sections;
}

async function walkAssets(dir: string, base: string, projectName: string): Promise<AssetFile[]> {
  const out: AssetFile[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true, recursive: false });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkAssets(abs, base, projectName)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const rel = path.relative(base, abs).split(path.sep).join("/");
      out.push({
        relPath: rel,
        absPath: abs,
        /** ruta canónica para staticFile(): projects/<nombre>/assets/<rel> */
        staticPath: `projects/${projectName}/assets/${rel}`,
        kind: EXT_KINDS[ext] ?? "other",
        sizeBytes: (await fs.stat(abs)).size,
      });
    }
  }
  return out;
}

/** Lee projects/<nombre>/ (info.md + inventario de assets) */
export async function loadProject(name: string): Promise<ProjectInfo> {
  const dir = path.join(PROJECTS_DIR, name);
  try {
    await fs.access(dir);
  } catch {
    throw new Error(`El proyecto "${name}" no existe en ${PROJECTS_DIR}. Crealo con: pnpm project:create ${name}`);
  }

  let raw = "";
  try {
    raw = await fs.readFile(path.join(dir, "info.md"), "utf8");
  } catch {
    throw new Error(`Falta info.md en ${dir}. Ese archivo describe el proyecto (ver README).`);
  }

  const assets = await walkAssets(path.join(dir, "assets"), path.join(dir, "assets"), name);
  return { name, dir, sections: parseInfoMarkdown(raw), raw, assets };
}

/** Copia los assets del proyecto al public/ de Remotion para que staticFile() los resuelva */
export async function ensurePublicAssets(project: ProjectInfo, needed: string[]): Promise<void> {
  const destRoot = path.join(PUBLIC_DIR, "projects", project.name);
  await fs.mkdir(destRoot, { recursive: true });

  const byStatic = new Map(project.assets.map((a) => [a.staticPath, a]));
  for (const staticPath of needed) {
    const asset = byStatic.get(staticPath);
    if (!asset) continue;
    const dest = path.join(PUBLIC_DIR, staticPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    // solo copiar si cambió (tamaño distinto o no existe)
    try {
      const stat = await fs.stat(dest);
      if (stat.size === asset.sizeBytes) continue;
    } catch {
      /* no existe → copiar */
    }
    await fs.copyFile(asset.absPath, dest);
  }
}
