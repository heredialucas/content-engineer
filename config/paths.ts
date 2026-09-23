import path from "node:path";

// Working-directory based paths keep the CLI and the deployed web app aligned.
// CONTENT_ENGINE_ROOT can be set explicitly in containers or external workers.
export const ENGINE_ROOT = path.resolve(process.env.CONTENT_ENGINE_ROOT || process.cwd());
export const PROJECTS_DIR = path.resolve(
  process.env.CONTENT_PROJECTS_DIR || path.join(ENGINE_ROOT, "projects")
);
export const OUTPUT_DIR = path.join(ENGINE_ROOT, "output");
export const PUBLIC_DIR = path.join(ENGINE_ROOT, "public");
export const REMOTION_ENTRY = path.join(ENGINE_ROOT, "src", "remotion", "index.ts");
export const KNOWLEDGE_DIR = path.join(ENGINE_ROOT, "knowledge");
