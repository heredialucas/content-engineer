import { getTextProvider } from "../../src/ai/registry";
import type { ProjectInfo } from "../../src/project/load-project";
import type { Idea } from "../marketing/prompts";
import type { Storyboard } from "../../src/storyboard/types";
import {
  CaptionSchema,
  ScriptSchema,
  buildCaptionSystem,
  buildCaptionUser,
  buildScriptSystem,
  buildScriptUser,
  captionJsonSchema,
  scriptJsonSchema,
  type Script,
} from "./prompts";

/** Copywriter: idea → guion (hook + líneas en pantalla + CTA) */
export async function generateScript(args: {
  info: ProjectInfo;
  idea: Idea;
}): Promise<Script> {
  const provider = getTextProvider();
  return provider.generateJSON({
    system: buildScriptSystem(),
    user: buildScriptUser({ info: args.info, idea: args.idea }),
    schemaName: "copywriter_script",
    jsonSchema: scriptJsonSchema,
    zodSchema: ScriptSchema,
    maxTokens: 2500,
  });
}

/** Copywriter: guion + storyboard → caption + hashtags para la publicación */
export async function generateCaption(args: {
  info: ProjectInfo;
  idea: Idea;
  script: Script;
  storyboard: Storyboard;
}) {
  const provider = getTextProvider();
  return provider.generateJSON({
    system: buildCaptionSystem(),
    user: buildCaptionUser(args),
    schemaName: "copywriter_caption",
    jsonSchema: captionJsonSchema,
    zodSchema: CaptionSchema,
    maxTokens: 1200,
  });
}
