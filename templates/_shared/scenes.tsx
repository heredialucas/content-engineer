import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_BODY, FONT_DISPLAY, springConfig } from "./fonts";
import type { Brand, Scene } from "../../src/storyboard/types";

export type TemplateVariant =
  | "portfolio-showcase"
  | "website-demo"
  | "problem-solution"
  | "case-study"
  | "product-promo";

export type Tokens = {
  accent: string;
  accent2: string;
  variant: TemplateVariant;
};

const useS = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width / 1080, height / 1920) * 1.15;
};
export { useS };

/** entrada con spring (pura, usable dentro de mapas y condicionales) */
const enter = (frame: number, delayFrames: number, fps: number, rise = 30) => {
  const p = spring({ frame: frame - delayFrames, fps, config: springConfig });
  return { opacity: p, transform: `translateY(${(1 - p) * rise}px)` };
};

const GradientText: React.FC<{ children: React.ReactNode; accent: string; accent2: string }> = ({
  children,
  accent,
  accent2,
}) => (
  <span
    style={{
      background: `linear-gradient(100deg, ${accent}, ${accent2})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}
  >
    {children}
  </span>
);

const Eyebrow: React.FC<{ text: string; accent: string; s: number }> = ({ text, accent, s }) => (
  <div
    style={{
      fontSize: 30 * s,
      fontFamily: FONT_BODY,
      fontWeight: 700,
      letterSpacing: 7 * s,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 24 * s,
    }}
  >
    {text}
  </div>
);

/* ─────────────────────────── HOOK ─────────────────────────── */

export const HookScene: React.FC<{ scene: Scene; tokens: Tokens; brand: Brand }> = ({
  scene,
  tokens,
  brand,
}) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = (scene.text ?? "").split(" ").filter(Boolean);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${110 * s}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: `${14 * s}px ${26 * s}px`,
          textAlign: "center",
        }}
      >
        {words.map((word, i) => {
          const p = spring({ frame: frame - 4 - i * 4, fps, config: springConfig });
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 138 * s,
                lineHeight: 1.04,
                color: COLORS.text,
                opacity: p,
                transform: `translateY(${(1 - p) * 56}px) rotate(${(1 - p) * 2.4}deg)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      {scene.subtext && (
        <div
          style={{
            marginTop: 48 * s,
            fontFamily: FONT_BODY,
            fontSize: 40 * s,
            color: COLORS.textDim,
            textAlign: "center",
            ...enter(frame, 10 + words.length * 4, fps),
          }}
        >
          {scene.subtext}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: `${interpolate(frame, [0, 20], [0, 100], { easing: Easing.out(Easing.cubic) })}%`,
          height: 6 * s,
          background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent})`,
          borderRadius: 6,
        }}
      />
    </AbsoluteFill>
  );
};

/* ─────────────────────────── TITLE ─────────────────────────── */

export const TitleScene: React.FC<{ scene: Scene; tokens: Tokens }> = ({ scene, tokens }) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${110 * s}px`,
      }}
    >
      {scene.eyebrow && (
        <div style={enter(frame, 2, fps)}>
          <Eyebrow text={scene.eyebrow} accent={tokens.accent} s={s} />
        </div>
      )}
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 104 * s,
          lineHeight: 1.08,
          color: COLORS.text,
          ...enter(frame, 10, fps),
        }}
      >
        {scene.text}
      </div>
      {scene.subtext && (
        <div
          style={{
            marginTop: 30 * s,
            fontFamily: FONT_BODY,
            fontSize: 42 * s,
            lineHeight: 1.4,
            color: COLORS.textDim,
            maxWidth: "88%",
            ...enter(frame, 18, fps),
          }}
        >
          {scene.subtext}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────────────────── SHOWCASE ─────────────────────────── */

export const ShowcaseScene: React.FC<{ scene: Scene; tokens: Tokens; brand: Brand }> = ({
  scene,
  tokens,
  brand,
}) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enterP = spring({ frame: frame - 2, fps, config: springConfig });
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.12], {
    extrapolateRight: "clamp",
  });
  const hasAsset = Boolean(scene.asset);
  const isDemo = tokens.variant === "website-demo";

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${80 * s}px`,
      }}
    >
      {scene.eyebrow && (
        <div style={{ ...enter(frame, 0, fps), marginBottom: 26 * s, width: "100%" }}>
          <Eyebrow text={scene.eyebrow} accent={tokens.accent} s={s} />
        </div>
      )}
      <div
        style={{
          width: "100%",
          maxWidth: 940 * s,
          borderRadius: 28 * s,
          overflow: "hidden",
          background: "rgba(255,255,255,0.045)",
          border: `1px solid ${COLORS.surfaceBorder}`,
          boxShadow: `0 ${40 * s}px ${90 * s}px rgba(0,0,0,0.55)`,
          opacity: enterP,
          transform: `translateY(${(1 - enterP) * 60}px) scale(${0.94 + enterP * 0.06})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            padding: `${16 * s}px ${22 * s}px`,
            background: "rgba(255,255,255,0.05)",
            borderBottom: `1px solid ${COLORS.surfaceBorder}`,
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div
              key={c}
              style={{ width: 15 * s, height: 15 * s, borderRadius: "50%", background: c }}
            />
          ))}
          {isDemo && (
            <div
              style={{
                marginLeft: 14 * s,
                flex: 1,
                padding: `${7 * s}px ${18 * s}px`,
                borderRadius: 10 * s,
                background: "rgba(255,255,255,0.07)",
                color: COLORS.textFaint,
                fontFamily: FONT_BODY,
                fontSize: 22 * s,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {scene.subtext ?? brand.handle ?? ""}
            </div>
          )}
        </div>
        <div style={{ overflow: "hidden", aspectRatio: isDemo ? "16 / 10" : "16 / 11" }}>
          {hasAsset ? (
            <Img
              src={staticFile(scene.asset!)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          ) : (
            <AbsoluteFill
              style={{
                background: `linear-gradient(135deg, ${brand.primary}55, ${brand.accent}33)`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 60 * s,
                  color: "rgba(255,255,255,0.85)",
                  transform: `scale(${zoom})`,
                }}
              >
                {scene.text ?? ""}
              </div>
            </AbsoluteFill>
          )}
        </div>
      </div>
      {scene.text && !isDemo && (
        <div
          style={{
            marginTop: 36 * s,
            fontFamily: FONT_BODY,
            fontSize: 40 * s,
            color: COLORS.textDim,
            textAlign: "center",
            ...enter(frame, 12, fps),
          }}
        >
          {scene.text}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────────────────── FEATURES ─────────────────────────── */

export const FeaturesScene: React.FC<{ scene: Scene; tokens: Tokens }> = ({ scene, tokens }) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items ?? [];
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: `0 ${100 * s}px` }}>
      {scene.eyebrow && (
        <div style={{ marginBottom: 26 * s }}>
          <Eyebrow text={scene.eyebrow} accent={tokens.accent} s={s} />
        </div>
      )}
      {scene.text && (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 72 * s,
            color: COLORS.text,
            marginBottom: 44 * s,
            ...enter(frame, 2, fps),
          }}
        >
          {scene.text}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 * s }}>
        {items.map((item, i) => {
          const e = enter(frame, 8 + i * 6, fps);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22 * s,
                padding: `${24 * s}px ${30 * s}px`,
                borderRadius: 20 * s,
                background: COLORS.surface,
                border: `1px solid ${COLORS.surfaceBorder}`,
                opacity: e.opacity,
                transform: e.transform,
              }}
            >
              <div
                style={{
                  width: 14 * s,
                  height: 14 * s,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 500,
                  fontSize: 42 * s,
                  color: COLORS.text,
                  flex: 1,
                }}
              >
                {item.label}
              </div>
              {item.value && (
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 38 * s,
                    color: tokens.accent2,
                  }}
                >
                  {item.value}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────────────── STATS ─────────────────────────── */

export const StatsScene: React.FC<{ scene: Scene; tokens: Tokens }> = ({ scene, tokens }) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items ?? [];
  const isCase = tokens.variant === "case-study";
  const valueSize = isCase ? 150 * s : 116 * s;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: `0 ${100 * s}px`,
        gap: 30 * s,
      }}
    >
      {scene.eyebrow && (
        <div>
          <Eyebrow text={scene.eyebrow} accent={tokens.accent} s={s} />
        </div>
      )}
      {scene.text && (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 66 * s,
            color: COLORS.text,
            marginBottom: 20 * s,
            ...enter(frame, 2, fps),
          }}
        >
          {scene.text}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 26 * s }}>
        {items.map((item, i) => {
          const e = enter(frame, 8 + i * 7, fps);
          return (
            <div
              key={i}
              style={{
                flex: "1 1 40%",
                padding: `${34 * s}px ${34 * s}px`,
                borderRadius: 24 * s,
                background: COLORS.surface,
                border: `1px solid ${COLORS.surfaceBorder}`,
                opacity: e.opacity,
                transform: `${e.transform} scale(${1 + (1 - e.opacity) * 0.06})`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: valueSize,
                  lineHeight: 1.05,
                }}
              >
                <GradientText accent={tokens.accent} accent2={tokens.accent2}>
                  {item.value ?? ""}
                </GradientText>
              </div>
              <div
                style={{
                  marginTop: 14 * s,
                  fontFamily: FONT_BODY,
                  fontSize: 34 * s,
                  color: COLORS.textDim,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      {scene.subtext && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 38 * s,
            color: COLORS.textDim,
            ...enter(frame, 8 + items.length * 7, fps),
          }}
        >
          {scene.subtext}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────────────────── TEXT ─────────────────────────── */

export const TextScene: React.FC<{ scene: Scene; tokens: Tokens }> = ({ scene, tokens }) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPs = tokens.variant === "problem-solution";
  const titleSize = isPs ? 110 * s : 84 * s;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${120 * s}px`,
        textAlign: "center",
      }}
    >
      {scene.eyebrow && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 30 * s,
            letterSpacing: 7 * s,
            textTransform: "uppercase",
            color: isPs ? tokens.accent2 : tokens.accent,
            marginBottom: 30 * s,
            ...enter(frame, 0, fps),
          }}
        >
          {scene.eyebrow}
        </div>
      )}
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: titleSize,
          lineHeight: 1.12,
          color: COLORS.text,
          ...enter(frame, 6, fps),
        }}
      >
        {scene.text}
      </div>
      {scene.subtext && (
        <div
          style={{
            marginTop: 34 * s,
            fontFamily: FONT_BODY,
            fontSize: 40 * s,
            lineHeight: 1.45,
            color: COLORS.textDim,
            ...enter(frame, 14, fps),
          }}
        >
          {scene.subtext}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────────────────── CTA ─────────────────────────── */

export const CtaScene: React.FC<{ scene: Scene; tokens: Tokens; brand: Brand }> = ({
  scene,
  tokens,
  brand,
}) => {
  const s = useS();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterP = spring({ frame: frame - 4, fps, config: springConfig });
  const pulse = 1 + Math.sin(frame / 9) * 0.035;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${110 * s}px`,
        textAlign: "center",
        gap: 34 * s,
      }}
    >
      <div
        style={{
          width: 132 * s,
          height: 132 * s,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: `0 20px 60px ${tokens.accent}66`,
          overflow: "hidden",
          opacity: enterP,
          transform: `scale(${0.7 + enterP * 0.3})`,
        }}
      >
        {brand.logo ? (
          <Img
            src={staticFile(brand.logo)}
            style={{ width: "62%", height: "62%", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 62 * s,
              color: "#fff",
            }}
          >
            {(brand.handle ?? scene.cta ?? "?").replace("@", "").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 96 * s,
          lineHeight: 1.1,
          color: COLORS.text,
          ...enter(frame, 10, fps),
        }}
      >
        {scene.text ?? scene.cta}
      </div>
      {scene.subtext && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 40 * s,
            color: COLORS.textDim,
            ...enter(frame, 16, fps),
          }}
        >
          {scene.subtext}
        </div>
      )}
      <div
        style={{
          marginTop: 18 * s,
          padding: `${26 * s}px ${64 * s}px`,
          borderRadius: 999,
          background: `linear-gradient(100deg, ${tokens.accent}, ${tokens.accent2})`,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 46 * s,
          color: "#fff",
          boxShadow: `0 ${18 * s}px ${50 * s}px ${tokens.accent}80`,
          opacity: enterP,
          transform: `scale(${enterP * pulse})`,
        }}
      >
        {scene.cta}
      </div>
      {brand.handle && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 32 * s,
            color: COLORS.textFaint,
            ...enter(frame, 22, fps),
          }}
        >
          {brand.handle}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────────── CAPTION (subtítulos) ─────────────────── */

export const SceneCaption: React.FC<{ text: string; s: number }> = ({ text, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(frame, 4, fps);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 118 * s,
        left: 90 * s,
        right: 90 * s,
        display: "flex",
        justifyContent: "center",
        opacity: e.opacity,
        transform: e.transform,
      }}
    >
      <div
        style={{
          padding: `${16 * s}px ${30 * s}px`,
          borderRadius: 16 * s,
          background: "rgba(8,10,18,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px)",
          fontFamily: FONT_BODY,
          fontWeight: 500,
          fontSize: 34 * s,
          lineHeight: 1.35,
          color: "rgba(255,255,255,0.92)",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};
