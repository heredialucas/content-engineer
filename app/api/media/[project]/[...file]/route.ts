import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { hasSession } from "@/src/server/auth";
import { mediaType, safeProjectFile } from "@/src/server/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ project: string; file: string[] }> }) {
  if (!(await hasSession())) return new NextResponse("No autorizado.", { status: 401 });
  const { project, file } = await context.params;
  try {
    const location = safeProjectFile(project, file.join("/"));
    const bytes = await fs.readFile(location);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mediaType(location),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado.", { status: 404 });
  }
}
