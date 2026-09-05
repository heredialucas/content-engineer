import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Brand } from "../../src/storyboard/types";

/**
 * Fondo animado: gradientes radiales en movimiento lento + grilla sutil + viñeta.
 * Usa los colores de marca del storyboard.
 */
export const Background: React.FC<{ brand: Brand }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / 60;

  const x1 = interpolate(Math.sin(t * 0.9), [-1, 1], [10, 45]);
  const y1 = interpolate(Math.cos(t * 0.7), [-1, 1], [5, 35]);
  const x2 = interpolate(Math.cos(t * 0.6 + 2), [-1, 1], [55, 90]);
  const y2 = interpolate(Math.sin(t * 0.8 + 1), [-1, 1], [55, 90]);
  const pulse = interpolate(Math.sin((frame / durationInFrames) * Math.PI), [0, 1], [0.75, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x1}% ${y1}%, ${brand.primary}38 0%, transparent 55%)`,
          opacity: pulse,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x2}% ${y2}%, ${brand.accent}30 0%, transparent 50%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 80%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 130%)",
        }}
      />
    </AbsoluteFill>
  );
};
