import type { ProjectInfo } from "../../src/project/load-project";

/**
 * Reglas compartidas del MODO PRESENTACIÓN.
 * Presentar el proyecto (qué es, qué hace, cómo funciona) sin usar el
 * currículum (## Experiencia) ni material de venta (## Venta).
 */

/** secciones que NUNCA se usan en modo presentación */
export const PRESENTATION_FORBIDDEN = new Set([
  "experiencia",
  "venta",
  "content mix",
  "marca",
]);

/** info del proyecto filtrada para presentación: sin CV ni material de venta */
export function presentationInfoText(info: ProjectInfo): string {
  const parts = Object.entries(info.sections)
    .filter(([key]) => !PRESENTATION_FORBIDDEN.has(key))
    .map(([key, value]) => `## ${key}\n${value}`)
    .filter((p) => p.trim().length > 0);
  return parts.join("\n\n");
}

export const PRESENTATION_TONE = `MODO PRESENTACIÓN: mostrá el producto/sitio en sí (qué es, qué hace, cómo se ve).
PROHIBIDO: usar "## Experiencia" (currículum), "## Venta", clientes o logros pasados, dolores del cliente, objeciones u ofertas.
TEXTOS ULTRA-CORTOS: el caption no supera 3 líneas cortas; nada de párrafos largos ni hooks largos.
PROHIBIDO el estilo "nadie te cuenta esto", contrarian o clickbait. Describí, no vendas.
Cero venta dura. Cierre suave (invitar a verlo). Nada inventado.`;
