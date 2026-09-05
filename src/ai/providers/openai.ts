import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/chat/completions";
import type { GenerateJSONArgs, JsonSchema, TextProvider } from "../text-provider";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OpenAITextProvider implements TextProvider {
  readonly name = "openai";
  readonly model: string;
  private client: OpenAI;
  private reasoning: "none" | "low" | "medium" | "high";

  constructor(opts: { apiKey: string; model: string; reasoning?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
    const r = opts.reasoning ?? "low";
    this.reasoning = (["none", "low", "medium", "high"].includes(r) ? r : "low") as
      | "none"
      | "low"
      | "medium"
      | "high";
  }

  async generateJSON<T>(args: GenerateJSONArgs<T>): Promise<T> {
    const system: ChatCompletionSystemMessageParam = { role: "system", content: args.system };
    const user: ChatCompletionUserMessageParam = { role: "user", content: args.user };
    const messages: ChatCompletionMessageParam[] = [system, user];

    let lastError = "";
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const feedback: ChatCompletionUserMessageParam | null =
          attempt > 1 && lastError
            ? {
                role: "user",
                content: `Tu respuesta anterior falló la validación: ${lastError}\nDevolvé nuevamente el JSON, corrigiendo ese error y sin agregar nada fuera del esquema.`,
              }
            : null;
        const msgs = feedback ? [...messages, feedback] : messages;

        const res = await this.client.chat.completions.create({
          model: this.model,
          messages: msgs,
          response_format: {
            type: "json_schema",
            json_schema: { name: args.schemaName, schema: args.jsonSchema, strict: true },
          },
          reasoning_effort: this.reasoning,
          max_completion_tokens: args.maxTokens ?? 4000,
        });

        const content = res.choices[0]?.message?.content ?? "";
        const parsed = JSON.parse(content);
        const validated = args.zodSchema.safeParse(parsed);
        if (validated.success) return validated.data;
        lastError = validated.error.issues
          .slice(0, 6)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // rate limit / error transitorio → backoff y reintento
        if (/rate limit|429|503|timeout|overloaded/i.test(msg) && attempt < maxAttempts) {
          await sleep(1500 * attempt);
          continue;
        }
        if (attempt === maxAttempts) {
          throw new Error(`[openai] falló generateJSON (${args.schemaName}): ${msg}${lastError ? ` | validación: ${lastError}` : ""}`);
        }
        lastError = msg;
        await sleep(800);
      }
    }
    throw new Error(`[openai] generateJSON agotó reintentos (${args.schemaName})${lastError ? `: ${lastError}` : ""}`);
  }
}

/** helper para construir schemas estrictos sin repetir additionalProperties */
export const obj = (properties: Record<string, unknown>, required?: string[]): JsonSchema => ({
  type: "object",
  properties,
  required: required ?? Object.keys(properties),
  additionalProperties: false,
});
