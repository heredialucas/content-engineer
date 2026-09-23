import { NextResponse } from "next/server";
import { hasSession } from "@/src/server/auth";
import { projectDescription, projectDirectory, readProjectHistory } from "@/src/server/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ project: string }> }) {
  if (!(await hasSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { project } = await context.params;
  try {
    const directory = projectDirectory(project);
    const profile = await projectDescription(directory);
    const pieces = await readProjectHistory(project);
    return NextResponse.json({ project: { id: project, ...profile }, pieces });
  } catch {
    return NextResponse.json({ error: "No encontramos ese proyecto." }, { status: 404 });
  }
}
