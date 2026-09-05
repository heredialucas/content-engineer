import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/** Barra fina de progreso del video en el borde inferior */
export const Progress: React.FC<{ accent: string; accent2: string }> = ({ accent, accent2 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames - 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 8,
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${p * 100}%`,
          background: `linear-gradient(90deg, ${accent}, ${accent2})`,
          borderRadius: "0 8px 8px 0",
        }}
      />
    </div>
  );
};
