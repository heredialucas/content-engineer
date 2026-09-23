import { getTextProvider } from "../../src/ai/registry";
import type { Platform } from "../../config/config";
import type { ProjectInfo } from "../../src/project/load-project";
import {
  CaptionSchema,
  LinkedInCaptionSchema,
  LinkedInPostSchema,
  ThreadSchema,
  XCaptionSchema,
  XPostSchema,
  PLATFORM_JSON,
  buildPlatformCaptionSystem,
  buildPlatformCaptionUser,
  buildTextPostSystem,
  buildTextPostUser,
  postJsonFor,
} from "./prompts";

/** caption por plataforma para una pieza ya producida */
export async function generatePlatformCaption(args: {
  info: ProjectInfo;
  platform: Platform;
  hook: string;
  idea: string;
  category: string;
  pieceSummary: string;
  cta?: string | null;
  presentation?: boolean;
}): Promise<{ caption: string; hashtags: string[] }> {
  const provider = getTextProvider();
  const schema =
    args.platform === "linkedin"
      ? LinkedInCaptionSchema
      : args.platform === "x"
        ? XCaptionSchema
        : CaptionSchema;
  return provider.generateJSON({
    system: buildPlatformCaptionSystem(args.platform, args.category, args.presentation),
    user: buildPlatformCaptionUser(args),
    schemaName: `caption_${args.platform}`,
    jsonSchema: PLATFORM_JSON[args.platform],
    zodSchema: schema,
    maxTokens: 1800,
  });
}

/** posts de texto: linkedin-post | x-post | thread */
export async function generateTextPost(args: {
  info: ProjectInfo;
  platform: "linkedin" | "x";
  variant: "post" | "thread";
  hook: string;
  idea: string;
  category: string;
  outline?: string | null;
  presentation?: boolean;
}): Promise<{ body?: string; tweets?: { text: string }[]; hashtags?: string[] }> {
  const provider = getTextProvider();
  type PostResult = { body?: string; tweets?: { text: string }[]; hashtags?: string[] };
  const zodSchema =
    args.platform === "linkedin"
      ? LinkedInPostSchema
      : args.variant === "thread"
        ? ThreadSchema
        : XPostSchema;
  const result = await provider.generateJSON({
    system: buildTextPostSystem(args.platform, args.variant, args.category, args.presentation),
    user: buildTextPostUser(args),
    schemaName: `text_post_${args.platform}_${args.variant}`,
    jsonSchema: postJsonFor(args.platform, args.variant),
    zodSchema: zodSchema as unknown as import("zod").ZodType<PostResult>,
    maxTokens: 2000,
  });
  return result as PostResult;
}
