import type { z } from "zod";

/** Esquema JSON (draft) que exige OpenAI en modo strict. */
export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type GenerateJSONArgs<T> = {
  /** instrucciones del sistema (rol + reglas del agente) */
  system: string;
  /** pedido del usuario (datos del proyecto, contexto, etc.) */
  user: string;
  /** nombre corto para identificar la llamada */
  schemaName: string;
  /** JSON schema estricto que la respuesta debe respetar */
  jsonSchema: JsonSchema;
  /** validación runtime + tipado en TS */
  zodSchema: z.ZodType<T>;
  /** límite de tokens de salida */
  maxTokens?: number;
};

/**
 * Contrato único para generadores de texto. Hoy: OpenAI.
 * Después: cualquier proveedor (Claude, Gemini, etc.) implementando esta interfaz.
 */
export interface TextProvider {
  readonly name: string;
  readonly model: string;
  generateJSON<T>(args: GenerateJSONArgs<T>): Promise<T>;
}
