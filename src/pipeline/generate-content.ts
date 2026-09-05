import fs from "node:fs/promises";
import path from "node:path";
import { loadProject, ensurePublicAssets } from "../project/load-project";
import { generateIdeas } from "../../agents/marketing";
import { generateScript, generateCaption } from "../../agents/copywriter";
import { buildStoryboard, storyboardAssets } from "../../agents/video";
import { writePostFile } from "../../agents/social-media";
import { renderVideo } from "../render/render-video";
import { StoryboardSchema, type Storyboard } from "../storyboard/types";
import type { FormatId } from "../../config/config";

const step = (n: number, msg: string) => console.log(`\n🔹 Paso ${n} — ${msg}`);

function makeContentId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `reel-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function saveStoryboard(projectName: string, id: string, storyboard: Storyboard) {
  const dir = path.join("projects", projectName, "storyboards");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.json`);
  await fs.writeFile(file, JSON.stringify(storyboard, null, 2), "utf8");
  return file;
}

async function saveScript(
  projectName: string,
  id: string,
  data: { ideaTitle: string; angle: string; audience: string; templateId: string; hook: string; lines: { onScreen: string; subtitle: string }[]; cta: string; ctaSub: string }
) {
  const dir = path.join("projects", projectName, "scripts");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);
  const md = `# ${id} — Guion

- **Idea:** ${data.ideaTitle}
- **Ángulo:** ${data.angle}
- **Audiencia:** ${data.audience}
- **Template:** \`${data.templateId}\`
- **Estado:** ⏳ pendiente de revisión

## Hook

> ${data.hook}

## Guion

| # | Pantalla | Subtítulo |
|---|----------|-----------|
${data.lines.map((l, i) => `| ${i + 1} | ${l.onScreen.replace(/\|/g, "\\|")} | ${l.subtitle.replace(/\|/g, "\\|")} |`).join("\n")}

## CTA

**${data.cta}** — ${data.ctaSub}
`;
  await fs.writeFile(file, md, "utf8");
  return file;
}

export type GenerateArgs = {
  projectName: string;
  count: number;
  format: FormatId;
};

export async function generateContent(args: GenerateArgs): Promise<void> {
  const { projectName, count, format } = args;

  step(1, `Leyendo proyecto "${projectName}" (info.md + assets)`);
  const info = await loadProject(projectName);
  console.log(`   ✓ ${Object.keys(info.sections).length} secciones, ${info.assets.length} assets`);

  for (let i = 0; i < count; i++) {
    const id = makeContentId();
    const suffix = count > 1 ? ` (${i + 1}/${count})` : "";
    console.log(`\n━━━ Generando contenido ${id}${suffix} ━━━`);

    step(2, "Marketing: generando ideas");
    const ideas = await generateIdeas({ info, format, count: 6 });
    const idea = ideas[0];
    console.log(`   ✓ ${ideas.length} ideas — seleccionada: "${idea.title}" (score ${idea.score}/10)`);

    step(3, "Copywriter: escribiendo guion");
    const script = await generateScript({ info, idea });
    console.log(`   ✓ ${script.lines.length} secciones — CTA: "${script.cta}"`);

    step(4, "Video: generando storyboard");
    const storyboard = await buildStoryboard({ info, idea, script, format });
    console.log(`   ✓ ${storyboard.scenes.length} escenas, ~${storyboard.scenes.reduce((a, s) => a + s.durationInSeconds, 0).toFixed(0)}s — template: ${storyboard.templateId}`);

    step(5, "Validando storyboard + preparando assets");
    const validated = StoryboardSchema.parse(storyboard);
    const assets = storyboardAssets(validated);
    await ensurePublicAssets(info, assets);
    console.log(`   ✓ ${assets.length} assets listos en public/`);

    step(6, "Guardando guion + storyboard");
    await saveScript(projectName, id, {
      ideaTitle: idea.title,
      angle: idea.angle,
      audience: idea.audience,
      templateId: validated.templateId,
      hook: script.hook,
      lines: script.lines,
      cta: script.cta,
      ctaSub: script.ctaSub,
    });
    await saveStoryboard(projectName, id, validated);
    console.log(`   ✓ guardados`);

    step(7, `Renderizando MP4 (${validated.format})`);
    const videoPath = path.join("projects", projectName, "videos", `${id}.mp4`);
    await fs.mkdir(path.dirname(videoPath), { recursive: true });
    await renderVideo({ storyboard: validated, outPath: videoPath });
    console.log(`   ✓ ${videoPath}`);

    step(8, "Social media: caption + hashtags");
    const caption = await generateCaption({ info, idea, script, storyboard: validated });
    const postFile = await writePostFile({
      projectName,
      contentId: id,
      caption,
      storyboard: validated,
      videoPath,
    });
    console.log(`   ✓ ${postFile}`);

    console.log(`\n✅ Contenido ${id} listo:\n   🎬 ${videoPath}\n   📝 projects/${projectName}/scripts/${id}.md\n   📋 projects/${projectName}/storyboards/${id}.json\n   📢 ${postFile}`);
  }

  console.log("\n💡 Revisá los resultados y después podés:");
  console.log(`   • Previsualizar:      pnpm studio`);
  console.log(`   • Re-renderizar:      pnpm render ${projectName} <id>`);
}

/** Re-renderiza un contenido ya generado (storyboard guardado) */
export async function reRender(projectName: string, contentId: string): Promise<void> {
  const file = path.join("projects", projectName, "storyboards", `${contentId}.json`);
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  const storyboard = StoryboardSchema.parse(raw);
  const info = await loadProject(projectName);
  const assets = storyboardAssets(storyboard);
  await ensurePublicAssets(info, assets);

  const videoPath = path.join("projects", projectName, "videos", `${contentId}.mp4`);
  console.log(`Re-renderizando ${contentId} (${storyboard.format})…`);
  await renderVideo({ storyboard, outPath: videoPath });
  console.log(`✅ ${videoPath}`);
}
