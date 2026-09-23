import { getTextProvider } from "../../src/ai/registry";
import type { Platform } from "../../config/config";
import type { ProjectInfo } from "../../src/project/load-project";
import {
  anglesPrompt,
  hookBankPrompt,
  manualIdeasPrompt,
  structureLibraryPrompt,
} from "../../src/knowledge";
import {
  InsightsSchema,
  RawBriefsSchema,
  briefsJsonSchema,
  buildAnalysisSystem,
  buildAnalysisUser,
  buildBriefsSystem,
  buildBriefsUser,
  insightsJsonSchema,
  type ProjectInsights,
  type RawBriefs,
} from "./prompts";

/**
 * Director creativo — paso 1: excavar material creativo en el proyecto
 * (historias, decisiones, errores, aprendizajes, opiniones, visuales).
 */
export async function analyzeProject(args: {
  info: ProjectInfo;
  presentation?: boolean;
}): Promise<ProjectInsights> {
  const provider = getTextProvider();
  return provider.generateJSON({
    system: buildAnalysisSystem(args.presentation ?? false),
    user: buildAnalysisUser({ info: args.info, presentation: args.presentation }),
    schemaName: "creative_analysis",
    jsonSchema: insightsJsonSchema,
    zodSchema: InsightsSchema,
    maxTokens: 2500,
  });
}

/**
 * Director creativo — paso 2: proponer briefs (idea + estructura de hook + formato).
 * Usa la biblioteca de estructuras + banco de hooks + ángulos + banco manual.
 * `excludedHooks` / `excludedStructures` permiten pedir reemplazos sin repetir.
 */
export async function createBriefsRaw(args: {
  info: ProjectInfo;
  insights: ProjectInsights;
  historySummary: string;
  feedbackSection: string;
  quotas: Record<string, number>;
  platformFilter: Platform | "all";
  formatFilter: string;
  count: number;
  excludedHooks?: string[];
  excludedStructures?: string[];
  presentation?: boolean;
}): Promise<RawBriefs> {
  const provider = getTextProvider();
  const insightsText = args.insights.insights
    .map((i) => `- [${i.kind}] ${i.title}: ${i.description}`)
    .join("\n");
  const visualText = args.insights.visualAssets.length
    ? `\nVisuales destacados:\n${args.insights.visualAssets
        .map((v) => `- ${v.asset} → ${v.why}`)
        .join("\n")}`
    : "";

  const [hookBank, angles, manualIdeas] = await Promise.all([
    hookBankPrompt(),
    anglesPrompt(),
    manualIdeasPrompt(),
  ]);

  return provider.generateJSON({
    system: buildBriefsSystem(args.presentation ?? false),
    user: buildBriefsUser({
      info: args.info,
      insights: insightsText + visualText,
      historySummary: args.historySummary,
      feedbackSection: args.feedbackSection,
      structureLibrary: structureLibraryPrompt(),
      hookBank,
      angles,
      manualIdeas,
      quotas: args.quotas,
      platformFilter: args.platformFilter,
      formatFilter: args.formatFilter,
      count: args.count,
      excludedHooks: args.excludedHooks,
      excludedStructures: args.excludedStructures,
      presentation: args.presentation,
    }),
    schemaName: "creative_briefs",
    jsonSchema: briefsJsonSchema,
    zodSchema: RawBriefsSchema,
    maxTokens: 6000,
  });
}
