/**
 * Contrato para generación/edición de imágenes.
 *
 * REGLA DE PRODUCTO: la imagen IA solo puede EDITAR assets oficiales ya
 * existentes (screenshot del proyecto, logo, foto real). Nunca genera escenas,
 * personas ni mockups ficticios. Por eso la interfaz expone `edit` y exige
 * `referencePaths`; no hay `generate()` libre.
 */
export type ImageEditArgs = {
  /** instrucción de edición acotada (limpiar fondo, recortar, subir resolución, etc.) */
  prompt: string;
  /** rutas absolutas de las imágenes OFICIALES de referencia (al menos una) */
  referencePaths: string[];
  /** ruta de salida del resultado */
  outputPath: string;
  /** nombre lógico para logs y errores */
  label: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
};

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  /** edita una o más imágenes reales de referencia y guarda el resultado */
  edit(args: ImageEditArgs): Promise<string>;
}
