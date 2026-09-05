import { getTextProvider } from "../../src/ai/registry";
import type { FormatId } from "../../config/config";
import type { ProjectInfo } from "../../src/project/load-project";
import {
  IdeasResponseSchema,
  buildIdeasSystem,
  buildIdeasUser,
  ideasJsonSchema,
  type Idea,
} from "./prompts";

/**
 * Marketing: analiza el proyecto y propone ideas de contenido.
 * Devuelve ideas ordenadas por score (mayor a menor).
 */
export async function generateIdeas(args: {
  info: ProjectInfo;
  format: FormatId;
  count?: number;
}): Promise<Idea[]> {
  const provider = getTextProvider();
  const res = await provider.generateJSON({
    system: buildIdeasSystem(),
    user: buildIdeasUser({ info: args.info, format: args.format, count: args.count ?? 6 }),
    schemaName: "marketing_ideas",
    jsonSchema: ideasJsonSchema,
    zodSchema: IdeasResponseSchema,
    maxTokens: 2500,
  });
  return res.ideas.sort((a, b) => b.score - a.score);
}
