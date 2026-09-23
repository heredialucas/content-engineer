import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.env.CONTENT_PROJECTS_DIR || "/app/data/projects";
const seed = "/app/projects";
const marker = path.join(root, ".seeded");

await fs.mkdir(root, { recursive: true });
try {
  await fs.access(marker);
} catch {
  try {
    await fs.cp(seed, root, { recursive: true, force: false, errorOnExist: false });
  } catch (error) {
    console.error("Could not initialize persistent project data.", error);
    process.exit(1);
  }
  await fs.writeFile(marker, `${new Date().toISOString()}\n`, "utf8");
}

const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"], {
  cwd: "/app",
  stdio: "inherit",
  env: process.env,
});
server.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
