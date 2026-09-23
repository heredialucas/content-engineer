import { continueRender, delayRender } from "remotion";
import { loadFont as bebasLoad, fontFamily as bebasFamily } from "@remotion/google-fonts/BebasNeue";
import {
  loadFont as playfairLoad,
  fontFamily as playfairFamily,
} from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as interLoad, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

/**
 * Identidad visual v4 — derivada de hlucas.cloud:
 * - Bebas Neue: titulares/hooks/números gigantes (condensada, cartel)
 * - Playfair Display: acentos editoriales (itálica), citas
 * - Inter: cuerpo, labels, captions
 * - Fondo carbón #141516, tinta blanca pura, hairlines blancos al 10-15%
 * - Monocromo: nada de acentos por categoría ni gradientes de color
 */
bebasLoad("normal", { weights: ["400"], subsets: ["latin"] });
playfairLoad("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
playfairLoad("italic", { weights: ["400", "500", "600"], subsets: ["latin"] });
interLoad("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const fontsReady = delayRender("esperando fuentes de Google");
if (typeof document !== "undefined") {
  document.fonts.ready.then(() => continueRender(fontsReady));
}

export const FONT_DISPLAY = bebasFamily;
export const FONT_SERIF = playfairFamily;
export const FONT_BODY = interFamily;

export const COLORS = {
  /** fondo por defecto (el brand de info.md puede overridear) */
  bg: "#141516",
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.64)",
  textFaint: "rgba(255,255,255,0.42)",
  hairline: "rgba(255,255,255,0.14)",
  hairlineSoft: "rgba(255,255,255,0.08)",
  surface: "rgba(255,255,255,0.045)",
  /** tinta sobre superficies blancas (píldora CTA) */
  onLight: "#141516",
};

/** easing del sitio (cubic-bezier(0.22,1,0.36,1)) */
export const SITE_EASE = [0.22, 1, 0.36, 1] as const;

export const springConfig = { damping: 20, stiffness: 110, mass: 0.9 };
export const springConfigSoft = { damping: 26, stiffness: 85, mass: 1.1 };

/** escala para reels (base 1080x1920) */
export const reelScale = (width: number, height: number) =>
  Math.min(width / 1080, height / 1920) * 1.15;

/** escala para statics y slides de carrusel (base 1080) */
export const stillScale = (width: number, height: number) =>
  (Math.min(width, height) / 1080) * 1.12;
