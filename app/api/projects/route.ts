import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { hasSession } from "@/src/server/auth";
import { isProjectId, projectDescription, projectsRoot, readProjectHistory } from "@/src/server/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  await fs.mkdir(projectsRoot, { recursive: true });
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const projects = await Promise.all(
    entries.filter((entry) => entry.isDirectory() && isProjectId(entry.name)).map(async (entry) => {
      const directory = path.join(projectsRoot, entry.name);
      try {
        const profile = await projectDescription(directory);
        const pieces = await readProjectHistory(entry.name);
        return { id: entry.name, name: profile.name, description: profile.description, count: pieces.length };
      } catch {
        return null;
      }
    })
  );
  return NextResponse.json({ projects: projects.filter(Boolean) });
}

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { name?: unknown; description?: unknown; tone?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const tone = typeof body.tone === "string" ? body.tone.trim() : "Directo, claro y cercano.";
  const id = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  if (name.length < 2 || name.length > 80 || !description || description.length > 800 || !isProjectId(id)) {
    return NextResponse.json({ error: "Completá un nombre y una descripción breve." }, { status: 400 });
  }

  const directory = path.join(projectsRoot, id);
  try {
    await fs.access(directory);
    return NextResponse.json({ error: "Ya existe un proyecto con ese nombre." }, { status: 409 });
  } catch {
    // El proyecto aún no existe.
  }

  await fs.mkdir(path.join(directory, "assets", "uploads"), { recursive: true });
  const info = `# ${name}\n\n## Descripción\n\n${description}\n\n## Tono de comunicación\n\n${tone || "Directo, claro y cercano."}\n\n## Marca\n\n- **Fondo:** #ffffff\n- **Primario:** #0b3558\n- **Acento:** #006bff\n`;
  await fs.writeFile(path.join(directory, "info.md"), info, "utf8");
  await fs.mkdir(path.join(directory, "history"), { recursive: true });
  await fs.writeFile(path.join(directory, "history", "history.json"), "[]\n", "utf8");
  return NextResponse.json({ project: { id, name, description, count: 0 } }, { status: 201 });
}
