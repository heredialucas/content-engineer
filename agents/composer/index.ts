import { z } from "zod";
import { getTextProvider } from "../../src/ai/registry";
import type { ProjectInfo } from "../../src/project/load-project";
import {
  CarouselComposeSchema,
  ReelComposeSchema,
  StaticComposeSchema,
  buildComposeSystem,
  buildComposeUser,
  carouselComposeJsonSchema,
  reelComposeJsonSchema,
  staticComposeJsonSchema,
} from "./prompts";

type ReelCompose = z.infer<typeof ReelComposeSchema>;
type StaticCompose = z.infer<typeof StaticComposeSchema>;
type CarouselCompose = z.infer<typeof CarouselComposeSchema>;
type ComposeKind = "reel" | "static" | "carousel";

type ComposeArgs = {
  info: ProjectInfo;
  briefSummary: string;
  hook: string;
  hookStructure: string;
  assets: string;
  category: string;
  outline?: string | null;
  suggestedAsset?: string | null;
  presentation?: boolean;
};

/**
 * Composer — convierte un brief en una composición de bloques (v4).
 * Devuelve SOLO el contenido: brand, categoría, aspecto y formato los pone el
 * pipeline (la identidad no se delega a la IA).
 */
export async function composePiece(
  args: ComposeArgs & { kind: "reel" }
): Promise<ReelCompose>;
export async function composePiece(
  args: ComposeArgs & { kind: "static" }
): Promise<StaticCompose>;
export async function composePiece(
  args: ComposeArgs & { kind: "carousel" }
): Promise<CarouselCompose>;
export async function composePiece(
  args: ComposeArgs & { kind: ComposeKind }
): Promise<ReelCompose | StaticCompose | CarouselCompose> {
  const provider = getTextProvider();
  const user = buildComposeUser(args);

  if (args.kind === "reel") {
    return provider.generateJSON({
      system: buildComposeSystem("reel", args.presentation),
      user,
      schemaName: "compose_reel",
      jsonSchema: reelComposeJsonSchema,
      zodSchema: ReelComposeSchema,
      maxTokens: 3500,
    });
  }
  if (args.kind === "static") {
    return provider.generateJSON({
      system: buildComposeSystem("static", args.presentation),
      user,
      schemaName: "compose_static",
      jsonSchema: staticComposeJsonSchema,
      zodSchema: StaticComposeSchema,
      maxTokens: 2000,
    });
  }
  return provider.generateJSON({
    system: buildComposeSystem("carousel", args.presentation),
    user,
    schemaName: "compose_carousel",
    jsonSchema: carouselComposeJsonSchema,
    zodSchema: CarouselComposeSchema,
    maxTokens: 4500,
  });
}
