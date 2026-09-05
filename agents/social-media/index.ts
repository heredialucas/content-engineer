import fs from "node:fs/promises";
import path from "node:path";
import type { Storyboard } from "../../src/storyboard/types";
import type { Caption } from "../copywriter/prompts";

/** Interfaz lista para conectar Buffer (u otro publicador) más adelante. */
export interface PublishProvider {
  readonly name: string;
  /** publicar un contenido ya revisado. Devolvé el id del proveedor. */
  publish(post: PublishRequest): Promise<{ externalId: string; url?: string }>;
}

export type PublishRequest = {
  projectName: string;
  contentId: string;
  caption: string;
  hashtags: string[];
  videoPath: string;
  scheduledFor?: Date;
};

/** Stub inerte: no publica nada. Reemplazar por BufferProvider cuando corresponda. */
export class ManualPublishProvider implements PublishProvider {
  readonly name = "manual";
  async publish(): Promise<{ externalId: string }> {
    throw new Error("Publicación automática no habilitada todavía (revisión manual). Conectá Buffer en agents/social-media/publishers.");
  }
}

export type PostPackage = {
  id: string;
  caption: Caption;
  storyboard: Storyboard;
};

/** Escribe posts/<id>.md con todo lo necesario para revisar y publicar */
export async function writePostFile(args: {
  projectName: string;
  contentId: string;
  caption: Caption;
  storyboard: Storyboard;
  videoPath: string;
}): Promise<string> {
  const { projectName, contentId, caption, storyboard, videoPath } = args;
  const postsDir = path.join("projects", projectName, "posts");
  await fs.mkdir(postsDir, { recursive: true });

  const duration = storyboard.scenes.reduce((a, s) => a + s.durationInSeconds, 0);
  const md = `# ${contentId}

- **Proyecto:** ${projectName}
- **Template:** \`${storyboard.templateId}\`
- **Formato:** ${storyboard.format}
- **Duración:** ~${duration.toFixed(0)}s
- **Video:** ${path.relative("projects", videoPath)}
- **Estado:** ⏳ pendiente de revisión manual

## Caption

${caption.caption}

## Hashtags

${caption.hashtags.join(" ")}

## Hook del video

> ${storyboard.hook}

## Escenas

| # | Tipo | Dur | Texto |
|---|------|-----|-------|
${storyboard.scenes
  .map(
    (s, i) =>
      `| ${i + 1} | ${s.type} | ${s.durationInSeconds}s | ${(s.text ?? s.cta ?? "—").replace(/\|/g, "\\|")} |`
  )
  .join("\n")}

## Al publicar

- El MP4 sale silencioso: **agregá un audio trending dentro de Instagram** al publicar.
- Copiá el caption de arriba tal cual y pegalo en IG.
- Antes de publicar, revisá que los datos y el screenshot del video sean reales y actuales.
`;

  const file = path.join(postsDir, `${contentId}.md`);
  await fs.writeFile(file, md, "utf8");
  return file;
}
