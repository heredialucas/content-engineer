import path from "node:path";

export const ENGINE_ROOT = path.resolve(import.meta.dirname, "..");
export const PROJECTS_DIR = path.join(ENGINE_ROOT, "projects");
export const OUTPUT_DIR = path.join(ENGINE_ROOT, "output");
export const PUBLIC_DIR = path.join(ENGINE_ROOT, "public");
export const REMOTION_ENTRY = path.join(ENGINE_ROOT, "src", "remotion", "index.ts");
