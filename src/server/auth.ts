import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "content_studio_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

const secret = () => process.env.SESSION_SECRET || "local-development-secret-change-before-deploy";

const signature = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("base64url");

export function verifyPassword(value: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return false;
  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionMaxAge = SESSION_SECONDS;
