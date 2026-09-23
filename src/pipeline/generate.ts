import fs from "node:fs/promises";
import path from "node:path";
import { loadProject, ensurePublicAssets, type ProjectInfo } from "../project/load-project";
import { generatePlatformCaption, generateTextPost } from "../../agents/copywriter";
import { composePiece } from "../../agents/composer";
import { analyzeProject, createBriefsRaw } from "../../agents/creative-director";
import { renderVideo } from "../render/render-video";
import { renderCarouselSlides, renderStaticImage } from "../render/render-still";
import { conditionSpec } from "../assets/condition";
import {
  PieceSpecSchema,
  type Block,
  type Brand,
  type Brief,
  type CarouselSpec,
  type PieceSpec,
  type ReelSpec,
  type StaticSpec,
  type StaticLayout,
} from "../specs";
import {
  PLATFORMS,
  PLATFORM_ALLOWED_TYPES,
  PLATFORM_DEFAULT_ASPECT,
  STATIC_ASPECTS,
  type ContentType,
  type FormatId,
  type Platform,
  type StaticAspect,
} from "../../config/config";
import { computeQuotas, resolveContentMix } from "../../config/content-mix";
import { feedbackSummary, appendHistory, hookSimilarity, isHookRepeated, loadHistory, summarizeForPrompt, type HistoryEntry, type PieceMetrics } from "../history";
import { manualIdeasPrompt } from "../knowledge";
import { RawBriefs } from "../../agents/creative-director/prompts";

const step = (n: number, msg: string) => console.log(`\n🔹 Paso ${n} — ${msg}`);

/* ─────────────── marca (desde info.md — por encima de la IA) ─────────────── */

export function parseMarca(info: ProjectInfo): Brand {
  const raw = info.sections["marca"] ?? "";
  const pick = (re: RegExp): string | undefined => {
    const m = raw.match(re);
    return m?.[1]?.trim();
  };
  const hex = (re: RegExp, fallback: string): string => {
    const v = pick(re);
    return v && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
  };
  const handle = pick(/handle[^:]*:\s*([^\n]+)/i)?.replace(/^@?/, "@");
  const name = pick(/nombre[^:]*:\s*([^\n]+)/i);
  let logo = pick(/logo[^:]*:\s*([^\n]+)/i);
  if (logo && !logo.startsWith("projects/")) {
    logo = logo.replace(/^\.\//, "");
    logo = logo.startsWith("assets/")
      ? `projects/${info.name}/${logo}`
      : `projects/${info.name}/assets/${logo}`;
  }
  return {
    bg: hex(/fondo[^:]*:\s*([^\n]+)/i, "#141516"),
    primary: hex(/primario[^:]*:\s*([^\n]+)/i, "#FFFFFF"),
    accent: hex(/acento[^:]*:\s*([^\n]+)/i, "#999D9E"),
    name: name ?? null,
    handle: handle ?? null,
    logo: logo ?? null,
  };
}

/** título/bajada de la pieza de presentación (sección "## Presentación" de info.md) */
export function parsePresentation(info: ProjectInfo): {
  title: string | null;
  subtitle: string | null;
} {
  const raw = info.sections["presentación"] ?? info.sections["presentacion"] ?? "";
  const pick = (re: RegExp): string | null => raw.match(re)?.[1]?.trim() ?? null;
  return {
    title: pick(/t[ií]tulo[^:]*:\s*([^\n]+)/i),
    subtitle: pick(/bajada[^:]*:\s*([^\n]+)/i) ?? pick(/subt[ií]tulo[^:]*:\s*([^\n]+)/i),
  };
}

/* ─────────────── ids y archivos ─────────────── */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * id de pieza: `<tipo>-<nombre>-<YYYYMMDD>-<HHMMSS>`.
 * El nombre sale del tema del brief; la fecha y hora son las de generación.
 * Si dos piezas caen en el mismo segundo, agrega un sufijo `-2`, `-3`, etc.
 */
async function makePieceId(
  projectName: string,
  prefix: string,
  name?: string
): Promise<string> {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const slug = name ? slugify(name) : "";
  const base = [prefix, slug, date, time].filter(Boolean).join("-");

  const piecesDir = path.join("projects", projectName, "pieces");
  let id = base;
  let n = 2;
  for (;;) {
    try {
      await fs.access(path.join(piecesDir, `${id}.json`));
      id = `${base}-${n++}`;
    } catch {
      return id;
    }
  }
}

async function saveJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

/* ─────────────── normalización de composiciones ─────────────── */

const fit = (v: string | null | undefined, max: number): string | null | undefined =>
  v == null ? v : v.slice(0, max);

function fitBlock(block: Block): Block {
  return {
    ...block,
    variant: fit(block.variant, 30) ?? null,
    eyebrow: fit(block.eyebrow, 60) ?? null,
    text: fit(block.text, 240) ?? null,
    sub: fit(block.sub, 320) ?? null,
    cta: fit(block.cta, 40) ?? null,
    caption: fit(block.caption, 130) ?? null,
    asset: fit(block.asset, 200) ?? null,
    items: block.items?.slice(0, 6).map((i) => ({ label: fit(i.label, 90) ?? "", value: fit(i.value ?? null, 40) ?? null })) ?? null,
    durationInSeconds:
      block.durationInSeconds == null
        ? null
        : Math.min(8, Math.max(1.2, block.durationInSeconds)),
  };
}

const validAssetSet = (info: ProjectInfo) =>
  new Set(info.assets.filter((a) => a.kind === "image").map((a) => a.staticPath));

/** elimina ctas que repiten el handle de la marca (ej: cta "@hlucasdev" + brand.handle) */
const stripHandleCta = (blocks: Block[], brand: Brand): Block[] => {
  if (!brand.handle) return blocks;
  const handle = brand.handle.toLowerCase().replace(/^@/, "");
  return blocks.map((b) => {
    if (!b.cta) return b;
    const cta = b.cta.toLowerCase().replace(/^@/, "");
    if (cta.includes(handle) || handle.includes(cta)) return { ...b, cta: null };
    return b;
  });
};

/** bloque con límites pensados para stills (4:5): textos más cortos */
const fitStillBlock = (block: Block): Block => ({
  ...fitBlock(block),
  text: fit(block.text, 150) ?? null,
  sub: fit(block.sub, 190) ?? null,
});

/** screen sin asset real → statement (misma copia, sin asset) */
function repairBlocks(blocks: Block[], validAssets: Set<string>): Block[] {
  return blocks.map((b): Block => {
    if (b.block === "screen" && (!b.asset || !validAssets.has(b.asset))) {
      return { ...b, block: "statement" as const, asset: null, variant: null };
    }
    return b;
  });
}

/** variante flat solo cuando el bloque va solo (si no, browser) */
function repairFlat(blocks: Block[], alone: (b: Block) => boolean): Block[] {
  return blocks.map((b): Block =>
    b.block === "screen" && b.variant === "flat" && !alone(b)
      ? { ...b, variant: "browser" }
      : b
  );
}

const DEFAULT_CTA_BLOCK = (): Block => ({
  block: "cta",
  variant: "pill",
  text: "¿Hablamos?",
  cta: "Escribime",
});

function normalizeReel(
  raw: Block[],
  args: { brief: Brief; info: ProjectInfo; brand: Brand; format: FormatId }
): ReelSpec {
  const valid = validAssetSet(args.info);
  let blocks: Block[] = raw
    .map(fitBlock)
    .map((b) => ({ ...b, durationInSeconds: b.durationInSeconds ?? 3 }));
  blocks = repairBlocks(blocks, valid);
  blocks = repairFlat(blocks, () => false);

  if (blocks[0]?.block !== "hook") {
    blocks = [
      { block: "hook", variant: "stack", text: args.brief.hook, durationInSeconds: 3 },
      ...blocks,
    ];
  }
  if (blocks[blocks.length - 1]?.block !== "cta") {
    blocks = [...blocks.slice(0, 9), DEFAULT_CTA_BLOCK()];
  }
  blocks = blocks.slice(0, 10);

  const total = blocks.reduce((a, b) => a + (b.durationInSeconds ?? 3), 0);
  if (total > 45) {
    const scale = 45 / total;
    blocks = blocks.map((b) => ({
      ...b,
      durationInSeconds: Math.max(1.5, Math.round((b.durationInSeconds ?? 3) * scale * 10) / 10),
    }));
  }

  return PieceSpecSchema.parse({
    kind: "reel",
    format: args.format,
    brand: args.brand,
    category: args.brief.category,
    blocks,
  }) as ReelSpec;
}

function normalizeStatic(
  raw: Block[],
  args: {
    brief: Brief;
    info: ProjectInfo;
    brand: Brand;
    aspect: StaticAspect;
    layout?: StaticLayout | null;
    /** asset oficial de fallback para layouts que necesitan screenshot */
    fallbackAsset?: string | null;
    /** título del proyecto para el layout presentación */
    presentationTitle?: string | null;
    /** bajada corta opcional para el layout presentación */
    presentationSubtitle?: string | null;
  }
): StaticSpec {
  const valid = validAssetSet(args.info);
  let blocks = stripHandleCta(raw.map(fitStillBlock), args.brand);
  blocks = repairBlocks(blocks, valid);
  blocks = repairFlat(blocks, (b) => blocks.length === 1 && b.block === "screen");

  let layout: StaticLayout | null = args.layout ?? null;

  // presentación: composición determinística (imagen + nombre del proyecto),
  // sin hooks ni textos largos de IA.
  if (layout === "presentation") {
    const asset = args.fallbackAsset && valid.has(args.fallbackAsset) ? args.fallbackAsset : null;
    if (asset) {
      return PieceSpecSchema.parse({
        kind: "static",
        aspect: args.aspect,
        layout,
        brand: args.brand,
        category: args.brief.category,
        blocks: [
          {
            block: "screen",
            variant: "framed",
            eyebrow: args.presentationTitle ?? null,
            text: args.presentationSubtitle ?? null,
            asset,
          },
        ],
      }) as StaticSpec;
    }
    // sin asset real no se puede presentar: se degrada a stack
    layout = null;
  }

  let isLayout = !!layout && layout !== "stack";

  if (isLayout) {
    const hasScreen = () => blocks.some((b) => b.block === "screen" && !!b.asset && valid.has(b.asset));
    // los layouts minimalistas se apoyan en el screenshot oficial: si el
    // composer no lo incluyó, se inyecta el asset real de fallback
    if (!hasScreen() && args.fallbackAsset && valid.has(args.fallbackAsset)) {
      blocks = [
        {
          block: "screen",
          variant: layout === "editorial-split" ? "browser" : "framed",
          asset: args.fallbackAsset,
        },
        ...blocks,
      ];
    }
    if (!hasScreen()) {
      // sin asset real no se fuerza el layout (se degrada a stack)
      layout = null;
      isLayout = false;
    }
  }

  if (isLayout) {
    // los layouts fijos manejan su propia composición (hasta 4 bloques)
    blocks = blocks.slice(0, 4);
  } else if (blocks.length > 2) {
    // 4:5 no da para más de 2 bloques apilados sin overflow
    blocks =
      blocks[0].block === "hook" ? [blocks[0], blocks[blocks.length - 1]] : blocks.slice(0, 2);
  }
  return PieceSpecSchema.parse({
    kind: "static",
    aspect: args.aspect,
    layout,
    brand: args.brand,
    category: args.brief.category,
    blocks,
  }) as StaticSpec;
}

function normalizeCarousel(
  rawPages: { blocks: Block[] }[],
  args: { brief: Brief; info: ProjectInfo; brand: Brand; aspect: StaticAspect }
): CarouselSpec {
  const valid = validAssetSet(args.info);
  let pages: { blocks: Block[] }[] = rawPages
    .slice(0, 8)
    .map((p) => ({
      blocks: stripHandleCta(repairBlocks(p.blocks.map(fitStillBlock), valid), args.brand).slice(0, 2),
    }));
  pages = pages
    .map((p) => repairFlat(p.blocks, (b) => p.blocks.length === 1 && b.block === "screen"))
    .map((blocks) => ({ blocks }));

  while (pages.length < 3) {
    pages.push({ blocks: [{ block: "statement", text: args.brief.topic }] });
  }

  if (!pages[0].blocks.some((b) => b.block === "hook")) {
    const firstBlocks: Block[] = [
      { block: "hook", variant: "stack", text: args.brief.hook },
      ...pages[0].blocks,
    ];
    pages[0] = { blocks: firstBlocks.slice(0, 2) };
  }
  if (!pages[pages.length - 1].blocks.some((b) => b.block === "cta")) {
    pages[pages.length - 1] = { blocks: [DEFAULT_CTA_BLOCK()] };
  }

  return PieceSpecSchema.parse({
    kind: "carousel",
    aspect: args.aspect,
    brand: args.brand,
    category: args.brief.category,
    pages,
  }) as CarouselSpec;
}

function specAssets(spec: PieceSpec): string[] {
  const out: string[] = [];
  const blocks: Block[] =
    spec.kind === "carousel" ? spec.pages.flatMap((p) => p.blocks) : spec.blocks;
  for (const b of blocks) if (b.asset) out.push(b.asset);
  if (spec.brand.logo) out.push(spec.brand.logo);
  return [...new Set(out.filter(Boolean))];
}

/* ─────────────── briefs: normalización + anti-repetición ─────────────── */

function normalizeBriefs(
  raws: RawBriefs["briefs"],
  opts: {
    platformFilter: Platform | "all";
    formatFilter: ContentType | "auto";
    /**
     * broadcast: cuando se pide un formato explícito para todas las redes,
     * la pieza se publica en TODAS las redes que admiten ese formato
     * (ej: static → instagram + linkedin + x), no solo en la que elige la IA.
     */
    forceAllPlatforms?: boolean;
  }
): Brief[] {
  const out: Brief[] = [];
  for (const r of raws) {
    const contentType: ContentType =
      opts.formatFilter !== "auto" ? opts.formatFilter : r.contentType;
    let platforms: Platform[];
    if (opts.forceAllPlatforms) {
      platforms = defaultPlatformsFor(contentType);
    } else {
      platforms = r.platforms?.length ? [...r.platforms] : defaultPlatformsFor(contentType);
      if (opts.platformFilter !== "all") {
        platforms = platforms.filter((p) => p === opts.platformFilter);
      }
    }
    platforms = [...new Set(platforms)].filter((p) =>
      (PLATFORM_ALLOWED_TYPES[p] as readonly string[]).includes(contentType)
    );
    if (platforms.length === 0) continue;
    out.push({
      category: r.category,
      topic: r.topic,
      idea: r.idea,
      hook: r.hook,
      hookStructure: r.hookStructure,
      contentType,
      platforms,
      aspect: r.aspect ?? undefined,
      reelFormat: r.reelFormat ?? undefined,
      outline: r.outline ?? undefined,
      assetsToUse: r.assetsToUse ?? undefined,
      creativeReason: r.creativeReason,
    });
  }
  return out;
}

function defaultPlatformsFor(contentType: ContentType): Platform[] {
  return PLATFORMS.filter((p) => (PLATFORM_ALLOWED_TYPES[p] as readonly string[]).includes(contentType));
}

const resolveVisualAspect = (brief: Brief, aspectArg?: string): StaticAspect => {
  if (aspectArg && (STATIC_ASPECTS as readonly string[]).includes(aspectArg)) {
    return aspectArg as StaticAspect;
  }
  // broadcast / cross-network: 1:1 es el único encuadre nativo en las 3 redes
  if (brief.platforms.length > 1) return "1:1";
  if (brief.aspect) return brief.aspect;
  return PLATFORM_DEFAULT_ASPECT[brief.platforms[0] as Platform] ?? "4:5";
};

const resolveReelFormat = (brief: Brief, aspectArg?: string): FormatId => {
  if (aspectArg && ["9:16", "1:1", "16:9"].includes(aspectArg)) return aspectArg as FormatId;
  if (brief.reelFormat) return brief.reelFormat;
  return "9:16";
};

/* ─────────────── captions + post md ─────────────── */

const pieceSummaryForCaption = (args: { contentType: ContentType; hook: string; details: string }) =>
  `${args.contentType.toUpperCase()} — ${args.details} Hook de la pieza: "${args.hook}"`;

const describeBlocks = (blocks: Block[]): string =>
  blocks
    .map((b, i) => {
      const parts = [
        b.block,
        b.variant ? `(${b.variant})` : "",
        b.text ? `"${b.text}"` : "",
        b.items ? `[${b.items.map((it) => `${it.value ?? ""} ${it.label}`).join("; ")}]` : "",
      ];
      return `${i + 1}. ${parts.filter(Boolean).join(" ")}`;
    })
    .join(" | ");

async function generatePieceCaptions(args: {
  info: ProjectInfo;
  brief: Brief;
  pieceSummary: string;
  cta?: string | null;
  presentation?: boolean;
}): Promise<Record<string, { caption: string; hashtags: string[] }>> {
  const captions: Record<string, { caption: string; hashtags: string[] }> = {};
  for (const platform of args.brief.platforms) {
    captions[platform] = await generatePlatformCaption({
      info: args.info,
      platform,
      hook: args.brief.hook,
      idea: args.brief.idea,
      category: args.brief.category,
      pieceSummary: args.pieceSummary,
      cta: args.cta ?? null,
      presentation: args.presentation,
    });
  }
  return captions;
}

async function writePiecePostFile(args: {
  projectName: string;
  id: string;
  brief: Brief;
  files: Record<string, string>;
  captions: Record<string, { caption: string; hashtags: string[] }>;
  extraNote?: string;
}): Promise<string> {
  const { projectName, id, brief } = args;
  const dir = path.join("projects", projectName, "posts");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);

  const files = Object.entries(args.files)
    .map(([label, f]) => `- **${label}:** ${f}`)
    .join("\n");

  const captions = args.captions;
  const captionSections = Object.entries(captions)
    .map(([platform, c]) => `### ${platform}\n\n${c.caption}\n\n${(c.hashtags ?? []).join(" ")}`)
    .join("\n\n");

  const md = `# ${id}

- **Proyecto:** ${projectName}
- **Tipo:** ${brief.contentType}
- **Plataformas:** ${brief.platforms.join(", ")}
- **Categoría (mix):** ${brief.category}
- **Estructura de hook:** ${brief.hookStructure}
- **Estado:** ⏳ pendiente de revisión manual

## Idea

${brief.idea}

> Hook: ${brief.hook}

## Archivos

${files}

${captionSections ? `## Captions por plataforma\n\n${captionSections}\n` : ""}
${args.extraNote ? `## Notas\n\n${args.extraNote}\n` : ""}
## Antes de publicar

- Revisá que los datos, capturas y resultados sean reales y actuales.
- Aprobala con: \`pnpm approve-content ${projectName} ${id}\`
`;

  await fs.writeFile(file, md, "utf8");
  return file;
}

/* ─────────────── productores por tipo ─────────────── */

const assetsList = (info: ProjectInfo) =>
  info.assets
    .filter((a) => a.kind === "image")
    .map((a) => a.staticPath)
    .join("\n");

async function produceReel(args: {
  info: ProjectInfo;
  brief: Brief;
  id: string;
  brand: Brand;
  format: FormatId;
  presentation?: boolean;
}): Promise<{ files: Record<string, string>; spec: ReelSpec; captions: Record<string, { caption: string; hashtags: string[] }> }> {
  const { info, brief, id, brand, format } = args;
  const composed = await composePiece({
    info,
    kind: "reel",
    briefSummary: `${brief.category} — ${brief.topic}: ${brief.idea}${brief.outline ? ` (outline: ${brief.outline})` : ""}`,
    hook: brief.hook,
    hookStructure: brief.hookStructure,
    assets: assetsList(info),
    category: brief.category,
    outline: brief.outline ?? null,
    suggestedAsset: brief.assetsToUse?.[0] ?? null,
    presentation: args.presentation,
  });

  const spec = await conditionSpec(normalizeReel(composed.blocks, { brief, info, brand, format }), info);
  await ensurePublicAssets(info, specAssets(spec));

  const specFile = await saveJson(path.join("projects", info.name, "pieces", `${id}.json`), spec);

  const videoPath = path.join("projects", info.name, "videos", `${id}.mp4`);
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await renderVideo({ spec, outPath: videoPath });

  const duration = spec.blocks.reduce((a, b) => a + (b.durationInSeconds ?? 3), 0);
  const captions = await generatePieceCaptions({
    info,
    brief,
    pieceSummary: pieceSummaryForCaption({
      contentType: "reel",
      hook: brief.hook,
      details: `video de ~${duration.toFixed(0)}s. Bloques: ${describeBlocks(spec.blocks)}`,
    }),
    cta: spec.blocks[spec.blocks.length - 1].cta ?? null,
    presentation: args.presentation,
  });

  return { files: { video: videoPath, spec: specFile }, spec, captions };
}

async function produceStatic(args: {
  info: ProjectInfo;
  brief: Brief;
  id: string;
  brand: Brand;
  aspect: StaticAspect;
  imageFormat: "png" | "jpeg";
  layout?: StaticLayout | null;
  presentation?: boolean;
}): Promise<{ files: Record<string, string>; spec: StaticSpec; captions: Record<string, { caption: string; hashtags: string[] }> }> {
  const { info, brief, id, brand, aspect } = args;
  const layout = args.layout ?? (args.presentation ? "presentation" : null);
  const presentation = parsePresentation(info);

  // en presentación la composición es determinística (imagen + nombre del
  // proyecto): no hace falta gastar tokens en el composer.
  let composedBlocks: Block[] = [];
  if (layout !== "presentation") {
    const composed = await composePiece({
      info,
      kind: "static",
      briefSummary: `${brief.category} — ${brief.topic}: ${brief.idea}`,
      hook: brief.hook,
      hookStructure: brief.hookStructure,
      assets: assetsList(info),
      category: brief.category,
      outline: brief.outline ?? null,
      suggestedAsset: brief.assetsToUse?.[0] ?? null,
      presentation: args.presentation,
    });
    composedBlocks = composed.blocks;
  }

  const fallbackAsset =
    brief.assetsToUse?.find((a) => validAssetSet(info).has(a)) ??
    info.assets.find((a) => a.kind === "image" && a.relPath.startsWith("screenshots/"))?.staticPath ??
    info.assets.find((a) => a.kind === "image" && a.relPath.startsWith("projects/"))?.staticPath ??
    info.assets.find((a) => a.kind === "image")?.staticPath ??
    null;

  const spec = await conditionSpec(
    normalizeStatic(composedBlocks, {
      brief,
      info,
      brand,
      aspect,
      layout,
      fallbackAsset,
      presentationTitle: presentation.title,
      presentationSubtitle: presentation.subtitle,
    }),
    info
  );
  await ensurePublicAssets(info, specAssets(spec));

  const outDir = path.join("projects", info.name, "static", id);
  await fs.mkdir(outDir, { recursive: true });
  const ext = args.imageFormat === "jpeg" ? "jpg" : "png";
  const imagePath = path.join(outDir, `image.${ext}`);
  const specFile = await saveJson(path.join("projects", info.name, "pieces", `${id}.json`), spec);
  await renderStaticImage({ spec, outPath: imagePath, imageFormat: args.imageFormat });

  const captions = await generatePieceCaptions({
    info,
    brief,
    pieceSummary: pieceSummaryForCaption({
      contentType: "static",
      hook: brief.hook,
      details: `imagen ${aspect}. Bloques: ${describeBlocks(spec.blocks)}`,
    }),
    cta: spec.blocks.find((b) => b.block === "cta")?.cta ?? null,
    presentation: args.presentation,
  });

  return { files: { image: imagePath, spec: specFile }, spec, captions };
}

async function produceCarousel(args: {
  info: ProjectInfo;
  brief: Brief;
  id: string;
  brand: Brand;
  aspect: StaticAspect;
  imageFormat: "png" | "jpeg";
  presentation?: boolean;
}): Promise<{ files: Record<string, string>; spec: CarouselSpec; captions: Record<string, { caption: string; hashtags: string[] }> }> {
  const { info, brief, id, brand, aspect } = args;
  const composed = await composePiece({
    info,
    kind: "carousel",
    briefSummary: `${brief.category} — ${brief.topic}: ${brief.idea}${brief.outline ? ` (outline: ${brief.outline})` : ""}`,
    hook: brief.hook,
    hookStructure: brief.hookStructure,
    assets: assetsList(info),
    category: brief.category,
    outline: brief.outline ?? null,
    suggestedAsset: brief.assetsToUse?.[0] ?? null,
    presentation: args.presentation,
  });

  const spec = await conditionSpec(normalizeCarousel(composed.pages, { brief, info, brand, aspect }), info);
  await ensurePublicAssets(info, specAssets(spec));

  const outDir = path.join("projects", info.name, "carousels", id);
  const slidesDir = path.join(outDir, "slides");
  await fs.mkdir(slidesDir, { recursive: true });
  const specFile = await saveJson(path.join("projects", info.name, "pieces", `${id}.json`), spec);

  const slides = await renderCarouselSlides({
    spec,
    outDir: slidesDir,
    imageFormat: args.imageFormat,
    onSlide: (i, total) => {
      process.stdout.write(`  🖼️  Slide ${i}/${total}\r`);
    },
  });
  process.stdout.write("\n");

  const captions = await generatePieceCaptions({
    info,
    brief,
    pieceSummary: pieceSummaryForCaption({
      contentType: "carousel",
      hook: brief.hook,
      details: `carrusel de ${spec.pages.length} páginas (${aspect}). Páginas: ${spec.pages
        .map((p, i) => `${i + 1}. ${describeBlocks(p.blocks)}`)
        .join(" | ")}`,
    }),
    cta: null,
    presentation: args.presentation,
  });

  const manifest = {
    id,
    project: info.name,
    contentType: "carousel",
    platforms: brief.platforms,
    aspect,
    status: "draft",
    slides: slides.map((file, index) => ({ index: index + 1, file })),
    captions,
  };
  const manifestFile = await saveJson(path.join(outDir, "manifest.json"), manifest);

  return {
    files: {
      slides: path.relative("projects", slidesDir),
      spec: specFile,
      manifest: manifestFile,
    },
    spec,
    captions,
  };
}

async function produceTextPost(args: {
  info: ProjectInfo;
  brief: Brief;
  id: string;
  presentation?: boolean;
}): Promise<{ files: Record<string, string>; captions: Record<string, { caption: string; hashtags: string[] }> }> {
  const { info, brief, id } = args;
  const platform = brief.platforms[0] as "linkedin" | "x";
  const variant = brief.contentType === "thread" ? "thread" : "post";

  const post = await generateTextPost({
    info,
    platform,
    variant,
    hook: brief.hook,
    idea: brief.idea,
    category: brief.category,
    outline: brief.outline ?? null,
    presentation: args.presentation,
  });

  const dir = path.join("projects", info.name, "posts");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);

  const body =
    variant === "thread" && post.tweets
      ? post.tweets.map((t, i) => `${i + 1}. ${t.text}`).join("\n\n")
      : (post.body ?? "");
  const hashtags = post.hashtags ?? [];

  const md = `# ${id}

- **Proyecto:** ${info.name}
- **Tipo:** ${brief.contentType}
- **Plataforma:** ${platform}
- **Categoría (mix):** ${brief.category}
- **Estructura de hook:** ${brief.hookStructure}
- **Estado:** ⏳ pendiente de revisión manual

## Idea

${brief.idea}

> Hook: ${brief.hook}

## Texto (listo para pegar)

${variant === "thread" ? "```\n" : ""}${body}${variant === "thread" ? "\n```" : ""}

${hashtags.length ? `## Hashtags\n\n${hashtags.join(" ")}\n` : ""}
## Antes de publicar

- Copiá el texto de arriba tal cual.
- Aprobala con: \`pnpm approve-content ${info.name} ${id}\`
`;

  await fs.writeFile(file, md, "utf8");

  const captions: Record<string, { caption: string; hashtags: string[] }> = {
    [platform]:
      variant === "thread"
        ? { caption: (post.tweets ?? []).map((t) => t.text).join("\n\n---\n\n"), hashtags: [] }
        : { caption: body, hashtags },
  };

  return { files: { post: file }, captions };
}

/* ─────────────── pipeline principal v3 ─────────────── */

export type CreativeArgs = {
  projectName: string;
  count: number;
  platform?: Platform | "all";
  format?: ContentType | "auto";
  aspect?: string;
  layout?: StaticLayout;
  imageFormat?: "png" | "jpeg";
};

export async function generateCreativeContent(args: CreativeArgs): Promise<void> {
  const { projectName, count } = args;
  const imageFormat = args.imageFormat ?? "png";

  let platformFilter = args.platform ?? "all";
  let formatFilter = args.format ?? "auto";

  if (formatFilter !== "auto" && platformFilter !== "all") {
    const allowed = PLATFORM_ALLOWED_TYPES[platformFilter];
    if (!(allowed as readonly string[]).includes(formatFilter)) {
      const replacement = PLATFORMS.find((p) =>
        (PLATFORM_ALLOWED_TYPES[p] as readonly string[]).includes(formatFilter)
      );
      console.log(`⚠️  "${formatFilter}" no aplica a ${platformFilter}; usando ${replacement}.`);
      platformFilter = replacement ?? "all";
    }
  }

  // Modo broadcast: formato explícito + todas las redes → replica en cada red que admite el formato.
  const forceAllPlatforms = platformFilter === "all" && formatFilter !== "auto";
  if (forceAllPlatforms) {
    const targets = PLATFORMS.filter((p) =>
      (PLATFORM_ALLOWED_TYPES[p] as readonly string[]).includes(formatFilter)
    );
    console.log(`📡 Broadcast: "${formatFilter}" → ${targets.join(" + ")}`);
  }

  step(1, `Leyendo proyecto "${projectName}" (info.md + assets)`);
  const info = await loadProject(projectName);
  const brand = parseMarca(info);
  console.log(
    `   ✓ ${Object.keys(info.sections).length} secciones, ${info.assets.length} assets · marca: ${brand.bg} / ${brand.handle ?? "sin handle"}`
  );

  step(2, "Historial + base de conocimiento");
  const history = await loadHistory(projectName);
  const historySummary = summarizeForPrompt(history);
  const feedbackSection = feedbackSummary(history);
  const manualIdeas = await manualIdeasPrompt();
  console.log(`   ✓ ${history.length} piezas en historial · ${manualIdeas.startsWith("(banco") ? "banco manual vacío" : "banco manual cargado"}`);

  step(3, "Director creativo: analizando el proyecto");
  const mix = resolveContentMix(info.sections);
  const quotas = computeQuotas(count, mix);
  // modo presentación: el mix pide presentación y no hay venta/promo en el lote
  const presentation =
    (quotas.presentacion ?? 0) > 0 &&
    (quotas.venta ?? 0) + (quotas.promocional ?? 0) === 0;
  if (presentation) {
    console.log("   📣 Modo PRESENTACIÓN: se muestra el proyecto (sin CV ni venta)");
  }
  const insights = await analyzeProject({ info, presentation });
  console.log(`   ✓ ${insights.insights.length} insights, ${insights.visualAssets.length} visuales destacados`);

  step(4, "Director creativo: generando briefs (estructura de hook por pieza)");
  console.log(
    `   ✓ mix: ${Object.entries(quotas).filter(([, n]) => n > 0).map(([k, v]) => `${k}×${v}`).join(", ")}`
  );

  const accepted: Brief[] = [];
  const rejectedHooks: string[] = [];
  let excludedHooks: string[] = [];
  let excludedStructures: string[] = [];

  for (let pass = 0; pass < 3 && accepted.length < count; pass++) {
    const raw = await createBriefsRaw({
      info,
      insights,
      historySummary,
      feedbackSection,
      quotas,
      platformFilter,
      formatFilter,
      count: count - accepted.length,
      excludedHooks: pass > 0 ? excludedHooks : undefined,
      excludedStructures: pass > 0 ? excludedStructures : undefined,
      presentation,
    });

    const pending = normalizeBriefs(raw.briefs, { platformFilter, formatFilter, forceAllPlatforms });
    for (const brief of pending) {
      if (accepted.length >= count) break;
      const repeatedInHistory = isHookRepeated(brief.hook, history);
      const repeatedInBatch = accepted.some(
        (a) => a.contentType === brief.contentType && hookSimilarity(a.hook, brief.hook) >= 0.55
      );
      const structureInBatch = accepted.some((a) => a.hookStructure === brief.hookStructure);
      if (repeatedInHistory || repeatedInBatch || (structureInBatch && count <= 6)) {
        rejectedHooks.push(brief.hook);
        console.log(`   ⚠️  descartado (${repeatedInHistory ? "hook repetido" : structureInBatch ? "estructura repetida" : "repetido en lote"}): "${brief.hook}"`);
        continue;
      }
      accepted.push(brief);
    }
    excludedHooks = [...new Set([...rejectedHooks, ...accepted.map((a) => a.hook)])];
    excludedStructures = [...new Set(accepted.map((a) => a.hookStructure))];
    if (accepted.length < count) {
      console.log(`   ↻ ${accepted.length}/${count} briefs aceptados, pidiendo reemplazos…`);
    }
  }

  if (accepted.length === 0) {
    throw new Error("El director creativo no produjo briefs válidos. Revisá info.md y el historial.");
  }
  if (accepted.length < count) {
    console.log(`   ⚠️  se generaron ${accepted.length} de ${count} piezas pedidas`);
  }

  console.log(`   ✓ ${accepted.length} briefs listos`);
  for (const brief of accepted) {
    console.log(
      `     • [${brief.category}] ${brief.contentType} → ${brief.platforms.join("/")} — (${brief.hookStructure}) "${brief.hook}"`
    );
  }

  for (let i = 0; i < accepted.length; i++) {
    const brief = accepted[i];
    const suffix = accepted.length > 1 ? ` (${i + 1}/${accepted.length})` : "";
    console.log(`\n━━━ Produciendo ${brief.contentType}${suffix} — "${brief.topic}" ━━━`);

    const idPrefix =
      brief.contentType === "reel"
        ? "reel"
        : brief.contentType === "static"
          ? "static"
          : brief.contentType === "carousel"
            ? "carousel"
            : `post-${brief.contentType}`;
    const id = await makePieceId(projectName, idPrefix, brief.topic);

    let files: Record<string, string>;
    let captions: Record<string, { caption: string; hashtags: string[] }> = {};
    let extraNote: string | undefined;

    if (brief.contentType === "reel") {
      console.log(`   🎬 Composición → render…`);
      const res = await produceReel({ info, brief, id, brand, format: resolveReelFormat(brief, args.aspect), presentation });
      files = res.files;
      captions = res.captions;
      extraNote = `Formato: ${res.spec.format}. Bloques: ${res.spec.blocks.map((b) => b.block).join(" → ")}.`;
    } else if (brief.contentType === "static") {
      console.log(`   🖼️  Composición → render de imagen…`);
      const res = await produceStatic({
        info,
        brief,
        id,
        brand,
        aspect: resolveVisualAspect(brief, args.aspect),
        imageFormat,
        layout: args.layout ?? null,
        presentation,
      });
      files = res.files;
      captions = res.captions;
      extraNote = `Aspecto: ${res.spec.aspect}. Bloques: ${res.spec.blocks.map((b) => b.block).join(" + ")}.`;
    } else if (brief.contentType === "carousel") {
      console.log(`   📑 Composición → render de slides…`);
      const res = await produceCarousel({
        info,
        brief,
        id,
        brand,
        aspect: resolveVisualAspect(brief, args.aspect),
        imageFormat,
        presentation,
      });
      files = res.files;
      captions = res.captions;
      extraNote = `Carrusel de ${res.spec.pages.length} páginas (${res.spec.aspect}).`;
    } else {
      console.log(`   ✍️  Copy por plataforma…`);
      const res = await produceTextPost({ info, brief, id, presentation });
      files = res.files;
      captions = res.captions;
    }

    const postFile = await writePiecePostFile({ projectName, id, brief, files, captions, extraNote });
    files = { ...files, post: postFile };

    const entry: HistoryEntry = {
      id,
      date: new Date().toISOString(),
      project: projectName,
      platforms: brief.platforms as Platform[],
      contentType: brief.contentType,
      category: brief.category,
      topic: brief.topic,
      hook: brief.hook,
      hookStructure: brief.hookStructure,
      idea: brief.idea,
      files,
      status: "draft",
    };
    await appendHistory(projectName, entry);

    console.log(`   ✅ ${id}`);
    for (const [label, f] of Object.entries(files)) {
      console.log(`      ${label}: ${f}`);
    }
  }

  try {
    const { syncProjectPreviews } = await import("../previews/sync");
    const n = await syncProjectPreviews(projectName);
    console.log(`\n🗂️  ${n} pieza(s) sincronizada(s) en public/previews/ (Studio)`);
  } catch {
    /* previews son mejor esfuerzo */
  }

  console.log(`\n✅ ${accepted.length} pieza(s) lista(s) para revisión:\n`);
  for (const brief of accepted) {
    console.log(
      `   🟢 [${brief.category}] ${brief.contentType} → ${brief.platforms.join("/")}\n      (${brief.hookStructure}) "${brief.hook}"`
    );
  }
  console.log(`\n💡 Próximos pasos:`);
  console.log(`   • Revisá las piezas en projects/${projectName}/ (o pnpm studio)`);
  console.log(`   • Aprobá: pnpm approve-content ${projectName} <id>`);
  console.log(`   • Re-render sin gastar tokens: pnpm render ${projectName} <id>`);
  console.log(`   • Después de publicar, cargá resultados: pnpm feedback ${projectName} <id> --views N --dms N`);
}

/* ─────────────── re-render (sin tokens) ─────────────── */

async function readSpec(projectName: string, contentId: string): Promise<PieceSpec> {
  const file = path.join("projects", projectName, "pieces", `${contentId}.json`);
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  return PieceSpecSchema.parse(raw) as PieceSpec;
}

export async function reRender(projectName: string, contentId: string): Promise<void> {
  const info = await loadProject(projectName);
  const spec = await readSpec(projectName, contentId);
  await ensurePublicAssets(info, specAssets(spec));

  if (spec.kind === "reel") {
    const videoPath = path.join("projects", projectName, "videos", `${contentId}.mp4`);
    console.log(`Re-renderizando ${contentId} (reel ${spec.format})…`);
    await renderVideo({ spec, outPath: videoPath });
    console.log(`✅ ${videoPath}`);
    return;
  }
  if (spec.kind === "static") {
    const outDir = path.join("projects", projectName, "static", contentId);
    await fs.mkdir(outDir, { recursive: true });
    const existing = (await fs.readdir(outDir)).find((f) => f.startsWith("image."));
    const outPath = path.join(outDir, existing ?? "image.png");
    console.log(`Re-renderizando ${contentId} (static ${spec.aspect})…`);
    await renderStaticImage({
      spec,
      outPath,
      imageFormat: existing?.endsWith(".jpg") ? "jpeg" : "png",
    });
    console.log(`✅ ${outPath}`);
    return;
  }
  const slidesDir = path.join("projects", projectName, "carousels", contentId, "slides");
  console.log(`Re-renderizando ${contentId} (carousel ${spec.pages.length} páginas, ${spec.aspect})…`);
  await renderCarouselSlides({ spec, outDir: slidesDir });
  console.log(`✅ ${slidesDir}`);
}

/* ─────────────── feedback (métricas manuales) ─────────────── */

export async function recordFeedback(args: {
  projectName: string;
  contentId: string;
  metrics: PieceMetrics;
}): Promise<void> {
  const { setEntryMetrics } = await import("../history");
  const ok = await setEntryMetrics(args.projectName, args.contentId, args.metrics);
  if (!ok) {
    throw new Error(`No se encontró "${args.contentId}" en el historial de ${args.projectName}.`);
  }
  const loaded = await loadHistory(args.projectName);
  const entry = loaded.find((e) => e.id === args.contentId);
  console.log(`✅ Métricas guardadas para ${args.contentId}: ${JSON.stringify(entry?.metrics)}`);
}
