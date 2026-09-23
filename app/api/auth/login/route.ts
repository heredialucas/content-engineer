import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionMaxAge, verifyPassword } from "@/src/server/auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Falta configurar el acceso de la aplicación." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.resetAt > now && record.count >= 8) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos." }, { status: 429 });
  }
  if (!record || record.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
  else record.count++;

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "La contraseña no es correcta." }, { status: 401 });
  }

  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return response;
}
