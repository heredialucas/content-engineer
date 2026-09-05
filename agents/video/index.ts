import { getTextProvider } from "../../src/ai/registry";
import type { FormatId } from "../../config/config";
import type { ProjectInfo } from "../../src/project/load-project";
import type { Idea } from "../marketing/prompts";
import type { Script } from "../copywriter/prompts";
import type { Scene, Storyboard } from "../../src/storyboard/types";
import {
  RawStoryboardSchema,
  buildStoryboardSystem,
  buildStoryboardUser,
  storyboardJsonSchema,
  type RawStoryboard,
} from "./prompts";

const DEFAULT_BRAND = {
  bg: "#0B0F1A",
  primary: "#6366F1",
  accent: "#22D3EE",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** prioridad de un asset para mockups showcase (screenshots de escritorio primero) */
const shotScore = (relPath: string) =>
  (relPath.includes("screenshot") ? 8 : 0) +
  (/desktop|shot-|demo|ui/i.test(relPath) ? 4 : 0) +
  (/mobile|vertical|hero|avatar|logo/i.test(relPath) ? -2 : 0);

/** Marca real definida en info.md (sección "## Marca") — sobrescribe a la IA */
export function parseMarca(info: ProjectInfo) {
  const raw = info.sections["marca"];
  if (!raw) return null;
  const pickHex = (label: string) => {
    const line = raw
      .split("\n")
      .find((l) => l.toLowerCase().includes(label) && l.includes("#"));
    const hex = line?.match(/#[0-9a-fA-F]{6}/);
    return hex ? hex[0] : undefined;
  };
  const handle = raw.match(/@[a-zA-Z0-9._]+/)?.[0];
  const logoLine = raw.split("\n").find((l) => /logo/i.test(l));
  const logo = logoLine?.match(/[\w./-]+\.(?:svg|png|jpe?g|webp)/i)?.[0];
  return {
    bg: pickHex("fondo"),
    primary: pickHex("primario"),
    accent: pickHex("acento"),
    handle,
    logo,
  };
}

/** valida y normaliza el storyboard crudo de la IA en un Storyboard ejecutable */
export function normalizeStoryboard(raw: RawStoryboard, project: ProjectInfo): Storyboard {
  const validTemplates = new Set([
    "portfolio-showcase",
    "website-demo",
    "problem-solution",
    "case-study",
    "product-promo",
  ]);
  const assetPaths = new Set(project.assets.map((a) => a.staticPath));

  let scenes: Scene[] = raw.scenes
    .filter((s) => {
      const types = ["hook", "title", "showcase", "features", "stats", "text", "cta"];
      return types.includes(s.type);
    })
    .slice(0, 10)
    .map((s, i) => ({
      id: s.id?.replace(/\s+/g, "-").toLowerCase() || `scene-${i}`,
      type: s.type,
      durationInSeconds: Math.min(8, Math.max(1.6, Number(s.durationInSeconds) || 4)),
      eyebrow: s.eyebrow?.trim() || undefined,
      text: s.text?.trim() || undefined,
      subtext: s.subtext?.trim() || undefined,
      items: s.items?.length ? s.items.map((it) => ({ label: it.label, value: it.value ?? undefined })) : undefined,
      asset: s.asset && assetPaths.has(s.asset) ? s.asset : undefined,
      caption: s.caption?.trim() || undefined,
    }));

  if (scenes.length < 3) {
    throw new Error("[video] el storyboard generado tiene menos de 3 escenas válidas");
  }

  // showcase sin asset → asignar screenshots reales (determinístico, nunca placeholder de texto)
  const shotPool = project.assets
    .filter(
      (a) =>
        a.kind === "image" &&
        !a.relPath.startsWith("logo/") &&
        !a.relPath.startsWith("fonts/")
    )
    .sort((a, b) => shotScore(b.relPath) - shotScore(a.relPath));
  let shotIdx = 0;
  for (const scene of scenes) {
    if (scene.type === "showcase" && !scene.asset && shotPool.length > 0) {
      scene.asset = shotPool[shotIdx % shotPool.length].staticPath;
      shotIdx++;
    }
  }

  // botón del CTA nunca vacío
  for (const scene of scenes) {
    if (scene.type === "cta" && !scene.cta) scene.cta = "Escribime";
  }

  // primer escena hook, última cta (siempre)
  if (scenes[0].type !== "hook") {
    scenes = [
      {
        id: "hook",
        type: "hook",
        durationInSeconds: 3,
        text: raw.title,
        caption: undefined,
      },
      ...scenes,
    ];
  }
  if (scenes[scenes.length - 1].type !== "cta") {
    scenes = [
      ...scenes,
      { id: "cta", type: "cta", durationInSeconds: 4, cta: undefined, text: undefined },
    ] as Scene[];
  }

  // ajustar duración total al rango 14-48s escalando proporcionalmente
  const total = scenes.reduce((a, s) => a + s.durationInSeconds, 0);
  const target = Math.min(48, Math.max(14, total));
  if (Math.abs(total - target) > 1) {
    const factor = target / total;
    scenes = scenes.map((s) => ({
      ...s,
      durationInSeconds: Math.round(Math.min(8, Math.max(1.6, s.durationInSeconds * factor)) * 10) / 10,
    }));
  }

  // marca real del proyecto (sección Marca de info.md) sobrescribe a la IA
  const marca = parseMarca(project);
  const brand = {
    bg: HEX_RE.test(marca?.bg ?? "") ? marca!.bg! : HEX_RE.test(raw.brand?.bg ?? "") ? raw.brand.bg : DEFAULT_BRAND.bg,
    primary: HEX_RE.test(marca?.primary ?? "")
      ? marca!.primary!
      : HEX_RE.test(raw.brand?.primary ?? "")
        ? raw.brand.primary
        : DEFAULT_BRAND.primary,
    accent: HEX_RE.test(marca?.accent ?? "")
      ? marca!.accent!
      : HEX_RE.test(raw.brand?.accent ?? "")
        ? raw.brand.accent
        : DEFAULT_BRAND.accent,
    logo:
      marca?.logo && assetPaths.has(marca.logo)
        ? marca.logo
        : raw.brand?.logo && assetPaths.has(`projects/${project.name}/assets/${raw.brand.logo}`)
          ? `projects/${project.name}/assets/${raw.brand.logo}`
          : undefined,
    handle: marca?.handle ?? raw.brand?.handle?.trim() ?? undefined,
  };

  // cta de la última escena: heredar texto si falta
  const last = scenes[scenes.length - 1];
  if (!last.text && !last.cta) {
    last.text = "¿Hablamos?";
    last.cta = "Escribime";
  }

  return {
    templateId: validTemplates.has(raw.templateId) ? raw.templateId : "portfolio-showcase",
    format: "9:16" as const, // se sobreescribe por el pipeline con el formato pedido
    title: raw.title?.trim() || project.name,
    hook: scenes[0].text ?? raw.title,
    cta: last.cta ?? last.text ?? "Escribime",
    ctaSub: brand.handle,
    brand,
    scenes,
  };
}

/**
 * Video: guion → storyboard normalizado y listo para renderizar.
 */
export async function buildStoryboard(args: {
  info: ProjectInfo;
  idea: Idea;
  script: Script;
  format: FormatId;
}): Promise<Storyboard> {
  const provider = getTextProvider();
  const raw = await provider.generateJSON({
    system: buildStoryboardSystem(),
    user: buildStoryboardUser(args),
    schemaName: "video_storyboard",
    jsonSchema: storyboardJsonSchema,
    zodSchema: RawStoryboardSchema,
    maxTokens: 4000,
  });
  const storyboard = normalizeStoryboard(raw, args.info);
  storyboard.format = args.format;
  return storyboard;
}

/** assets referenciados por el storyboard (rutas staticFile) */
export function storyboardAssets(storyboard: Storyboard): string[] {
  const out = new Set<string>();
  for (const scene of storyboard.scenes) {
    if (scene.asset) out.add(scene.asset);
  }
  if (storyboard.brand.logo) out.add(storyboard.brand.logo);
  return [...out];
}
