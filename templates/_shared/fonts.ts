import { continueRender, delayRender } from "remotion";
import { loadFont as interLoad, fontFamily as interFamily } from "@remotion/google-fonts/Inter";
import { loadFont as groteskLoad, fontFamily as groteskFamily } from "@remotion/google-fonts/SpaceGrotesk";

/**
 * Carga de fuentes al importar el módulo (side-effect intencional):
 * inyecta @font-face y bloquea el render hasta que estén listas.
 */
interLoad("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
groteskLoad("normal", { weights: ["500", "700"], subsets: ["latin"] });

const fontsReady = delayRender("esperando fuentes de Google");
if (typeof document !== "undefined") {
  document.fonts.ready.then(() => continueRender(fontsReady));
}

export const FONT_DISPLAY = groteskFamily;
export const FONT_BODY = interFamily;

export const COLORS = {
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.68)",
  textFaint: "rgba(255,255,255,0.45)",
  surface: "rgba(255,255,255,0.06)",
  surfaceBorder: "rgba(255,255,255,0.14)",
};

/** escala relativa: diseño base para 1080x1920, adaptado a cada formato */
export const useScale = (width: number, height: number) =>
  Math.min(width / 1080, height / 1920) * 1.15;

export const springConfig = { damping: 18, stiffness: 120, mass: 0.9 };
export const springConfigSoft = { damping: 24, stiffness: 90, mass: 1.1 };
