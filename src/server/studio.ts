import fs from "node:fs/promises";
import path from "node:path";

export type StudioPiece = {
  id: string;
  date: string;
  project: string;
  platforms: string[];
  contentType: string;
  format?: string;
  category: string;
  topic: string;
  hook: string;
  idea: string;
  files: Record<string, string>;
  status: string;
};

export const projectsRoot = path.resolve(process.env.CONTENT_PROJECTS_DIR || path.join(process.cwd(), "projects"));

export function isProjectId(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(value);
}

export function projectDirectory(project: string): string {
  if (!isProjectId(project)) throw new Error("Proyecto inválido.");
  return path.join(projectsRoot, project);
}

export function safeProjectFile(project: string, relativePath: string): string {
  const base = projectDirectory(project);
  const normalized = relativePath.replace(/^projects\/[a-z0-9-]+\//, "");
  const resolved = path.resolve(base, normalized);
  if (!resolved.startsWith(`${base}${path.sep}`)) throw new Error("Ruta inválida.");
  return resolved;
}

export async function projectDescription(projectDir: string): Promise<{
  name: string;
  description: string;
  info: string;
}> {
  const info = await fs.readFile(path.join(projectDir, "info.md"), "utf8");
  const name = info.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(projectDir);
  const description = info.match(/^##\s+(?:Descripción|Description)\s*\n+([\s\S]*?)(?=\n##\s|$)/m)?.[1]
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 220) ?? "Tu espacio de contenido y marca.";
  return { name, description, info };
}

export async function readProjectHistory(project: string): Promise<StudioPiece[]> {
  const file = path.join(projectDirectory(project), "history", "history.json");
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as StudioPiece[]).slice().reverse() : [];
  } catch {
    return [];
  }
}

export async function appendStudioPiece(project: string, piece: StudioPiece): Promise<void> {
  const file = path.join(projectDirectory(project), "history", "history.json");
  const current = await readProjectHistory(project);
  const ordered = current.slice().reverse();
  ordered.push(piece);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(ordered, null, 2), "utf8");
  await fs.rename(temporary, file);
}

export function mediaType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}
