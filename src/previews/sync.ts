import fs from "node:fs/promises";
import path from "node:path";
import { loadHistory } from "../history";

/**
 * Previews para Remotion Studio: copia los specs v4 de las piezas del
 * historial a public/previews/ para que la composición PiecePreview las
 * cargue. Los assets ya viven en public/ (staticFile).
 */
export async function syncProjectPreviews(projectName: string): Promise<number> {
  const history = await loadHistory(projectName);
  const dir = path.join("public", "previews");
  await fs.mkdir(dir, { recursive: true });
  let count = 0;

  for (const entry of history) {
    const previewFile = path.join(dir, `${entry.contentType}-${entry.id}.json`);
    try {
      const specFile =
        entry.files?.spec ?? path.join("projects", projectName, "pieces", `${entry.id}.json`);
      const spec = JSON.parse(await fs.readFile(specFile, "utf8"));
      const payload =
        entry.contentType === "carousel" ? { spec, pageIndex: 0 } : { spec };
      await fs.writeFile(previewFile, JSON.stringify(payload, null, 2), "utf8");
      count++;
    } catch {
      /* pieza sin spec guardado: skip */
    }
  }
  return count;
}

/** sincroniza los previews de todos los proyectos */
export async function syncAllPreviews(): Promise<{ project: string; pieces: number }[]> {
  await fs.rm(path.join("public", "previews"), { recursive: true, force: true });
  let projects: string[] = [];
  try {
    projects = (await fs.readdir("projects", { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    projects = [];
  }
  const out: { project: string; pieces: number }[] = [];
  for (const p of projects) {
    try {
      out.push({ project: p, pieces: await syncProjectPreviews(p) });
    } catch {
      out.push({ project: p, pieces: 0 });
    }
  }
  return out;
}
