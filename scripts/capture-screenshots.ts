/**
 * Captura screenshots reales de un sitio web (corriendo local o URL remota)
 * para usar como assets de un proyecto de contenido.
 *
 * Uso:
 *   pnpm assets:capture <proyecto> --dev ../lucas-portfolio --pages "/es"
 *   pnpm assets:capture <proyecto> --url https://hlucas.cloud --pages "/"
 *   pnpm assets:capture portfolio --dev ../lucas-portfolio --clean --shots 3
 *
 * Genera en projects/<proyecto>/assets/screenshots/:
 *   <slug>-desktop-N.png  (1440x900 @2x)
 *   <slug>-mobile-N.png   (390x844 @3x)
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer-core";
import { PROJECTS_DIR } from "../config/paths";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean) as string[];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3 },
} as const;

type ViewportId = keyof typeof VIEWPORTS;

function findChrome(): string {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No se encontró Chrome. Definí CHROME_PATH o instalá Google Chrome.");
}

function slugify(pagePath: string): string {
  const s = pagePath.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9-]+/g, "-");
  return s || "home";
}

/** levanta `pnpm dev` en dir y espera a que el server responda; devuelve kill() */
async function startDevServer(dir: string): Promise<{ baseUrl: string; kill: () => void }> {
  console.log(`  ▶ Levantando dev server en ${dir} (pnpm dev)…`);
  const child = spawn("pnpm", ["dev"], {
    cwd: dir,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const kill = () => {
    try {
      process.kill(-child.pid!, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  };
  child.on("exit", () => {});
  let out = "";
  child.stdout?.on("data", (d) => (out += d.toString()));
  child.stderr?.on("data", (d) => (out += d.toString()));

  let deadlineOut = "";
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    // ¿está vivo?
    try {
      if (child.pid && process.kill(child.pid, 0) === undefined) {
        /* vivo */
      }
    } catch {
      throw new Error(`El dev server terminó inesperadamente:\n${out.slice(-500)}`);
    }
    const m = out.match(/https?:\/\/localhost:(\d+)/);
    const url = m ? `http://localhost:${m[1]}` : "http://localhost:3000";
    try {
      // header accept-language: necesario para middlewares i18n (negotiator)
      const res = await fetch(url, {
        headers: { "accept-language": "es,en;q=0.8" },
        signal: AbortSignal.timeout(1500),
      });
      if (res.status < 500) {
        console.log(`  ✓ Dev server listo en ${url}`);
        return { baseUrl: url, kill };
      }
      console.log(`  ⏳ Dev server responde ${res.status}, esperando…`);
    } catch {
      /* todavía no responde */
    }
  }
  kill();
  throw new Error(`Timeout esperando dev server. Output:\n${out.slice(-500)}`);
}

/** scroll progresivo hasta el fondo para disparar animaciones/lazy-load */
async function scrollThroughPage(page: import("puppeteer-core").Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 600));
}

async function captureViewport(args: {
  browser: Browser;
  url: string;
  viewport: ViewportId;
  shots: number;
  outDir: string;
  slug: string;
  startIndex: number;
}): Promise<number> {
  const { browser, url, viewport, shots, outDir, slug, startIndex } = args;
  const vp = VIEWPORTS[viewport];
  const page = await browser.newPage();
  await page.setViewport({ ...vp });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 2000)); // animaciones de entrada
  await scrollThroughPage(page);

  const docHeight = await page.evaluate(() => document.body.scrollHeight);
  const maxOffset = Math.max(0, docHeight - vp.height);
  let index = startIndex;
  for (let i = 0; i < shots; i++) {
    const offset = Math.min(maxOffset, i * vp.height);
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await new Promise((r) => setTimeout(r, 700)); // dejar asentar animaciones
    const file = path.join(outDir, `${slug}-${viewport}-${index + 1}.png`);
    await page.screenshot({ path: file });
    console.log(`  🖼  ${path.relative(process.cwd(), file)}`);
    index++;
    if (offset >= maxOffset) break;
  }
  await page.close();
  return index;
}

async function main() {
  const args = process.argv.slice(2);
  const projectName = args[0] && !args[0].startsWith("--") ? args[0] : "portfolio";
  const getFlag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const devPath = getFlag("dev");
  const directUrl = getFlag("url");
  const pages = (getFlag("pages") ?? "/es")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const shotsPerPage = Math.max(1, Math.min(6, parseInt(getFlag("shots") ?? "3", 10) || 3));
  const only: ViewportId[] = hasFlag("desktop-only")
    ? ["desktop"]
    : hasFlag("mobile-only")
      ? ["mobile"]
      : ["desktop", "mobile"];
  const clean = hasFlag("clean");

  if (!devPath && !directUrl) {
    throw new Error("Falta el origen: usá --dev <path-al-proyecto-web> o --url <url>");
  }

  const outDir = path.join(PROJECTS_DIR, projectName, "assets", "screenshots");
  if (clean && fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
    }
    console.log(`  🧹 Screenshots anteriores eliminados`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = findChrome();
  console.log(`  🌐 Navegador: ${executablePath}`);

  const { baseUrl, kill } = directUrl
    ? { baseUrl: directUrl, kill: () => {} }
    : await startDevServer(path.resolve(devPath!));

  let index = 0;
  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--hide-scrollbars", "--disable-lcd-text", "--force-color-profile=srgb"],
    });
    try {
      for (const pagePath of pages) {
        const url = `${baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;
        const slug = slugify(pagePath);
        console.log(`\n📄 Capturando ${url}`);
        for (const viewport of only) {
          index = await captureViewport({ browser, url, viewport, shots: shotsPerPage, outDir, slug, startIndex: index });
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    kill();
  }

  console.log(`\n✅ ${index} screenshots reales en projects/${projectName}/assets/screenshots/`);
  console.log("   El pipeline las detecta automáticamente (pnpm generate).");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
