import React from "react";
import type { Storyboard } from "../../src/storyboard/types";
import { StoryboardRouter } from "./StoryboardRouter";
import type { TemplateVariant, Tokens } from "./scenes";

/**
 * Factory de templates: todos usan el mismo motor de escenas, pero cada
 * template define su variante (acentos, jerarquías y transiciones).
 * Para agregar un template nuevo: creá una carpeta hermana, llamá
 * createTemplate con tu variant, y registralo en templates/registry.ts.
 */
export const createTemplate =
  (variant: TemplateVariant) =>
  ({ storyboard }: { storyboard: Storyboard }) => {
    const tokens: Tokens = {
      accent: storyboard.brand.primary,
      accent2: storyboard.brand.accent,
      variant,
    };
    return <StoryboardRouter storyboard={storyboard} tokens={tokens} />;
  };
