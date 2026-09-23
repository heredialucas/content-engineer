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
import {
  COLORS,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_SERIF,
  SITE_EASE,
  springConfig,
} from "./tokens";
import type { Block, BlockItem, Brand } from "../specs";

/* ─────────────── helpers de animación (funcionan en video y stills) ─────────────── */

const useEnter = (delay: number, rise = 34) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return enterAt(frame, fps, delay, rise);
};

/** variante pura (sin hook) para usar dentro de mapas */
const enterAt = (frame: number, fps: number, delay: number, rise = 22) => {
  const p = spring({ frame: frame - delay, fps, config: springConfig });
  return { opacity: p, transform: `translateY(${(1 - p) * rise}px)` };
};

const easeIn = (frame: number, delay: number, duration = 24) =>
  interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: Easing.bezier(...SITE_EASE),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/* ─────────────── primitivas ─────────────── */

export const Eyebrow: React.FC<{ text: string; s: number; delay?: number; align?: "left" | "center" }> = ({
  text,
  s,
  delay = 0,
  align = "left",
}) => {
  const e = useEnter(delay, 18);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18 * s,
        justifyContent: align === "center" ? "center" : "flex-start",
        opacity: e.opacity,
        transform: e.transform,
      }}
    >
      <div style={{ width: 44 * s, height: 2, background: COLORS.hairline }} />
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 27 * s,
          letterSpacing: 6 * s,
          textTransform: "uppercase",
          color: COLORS.textFaint,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
      {align === "center" && <div style={{ width: 44 * s, height: 2, background: COLORS.hairline }} />}
    </div>
  );
};

const SubText: React.FC<{ text: string; s: number; delay?: number; size?: number; serif?: boolean }> = ({
  text,
  s,
  delay = 12,
  size = 40,
  serif,
}) => {
  const e = useEnter(delay, 22);
  return (
    <div
      style={{
        fontFamily: serif ? FONT_SERIF : FONT_BODY,
        fontStyle: serif ? "italic" : "normal",
        fontSize: size * s,
        lineHeight: 1.45,
        color: COLORS.textDim,
        textAlign: "center",
        opacity: e.opacity,
        transform: e.transform,
        maxWidth: "92%",
      }}
    >
      {text}
    </div>
  );
};

/* ─────────────── tipografía adaptativa ─────────────── */

/** factor de escala según largo del texto: evita overflow en stills y reels */
const textFit = (text: string | null | undefined): number => {
  const len = (text ?? "").length;
  if (len <= 40) return 1;
  if (len <= 70) return 0.82;
  if (len <= 100) return 0.68;
  if (len <= 140) return 0.56;
  return 0.47;
};

/* ─────────────── HOOK ─────────────── */

const HookStack: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = (block.text ?? "").split(" ").filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * s }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" delay={0} />}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: 30 * s,
          rowGap: 6 * s,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const p = spring({ frame: frame - 2 - i * 3, fps, config: springConfig });
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 172 * s * textFit(block.text),
                lineHeight: 0.98,
                color: COLORS.text,
                letterSpacing: "0.01em",
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 60}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={8 + words.length * 3} />}
    </div>
  );
};

const HookSerif: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const e = useEnter(2, 40);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * s }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 104 * s * textFit(block.text),
          lineHeight: 1.12,
          color: COLORS.text,
          textAlign: "center",
          maxWidth: "94%",
          opacity: e.opacity,
          transform: e.transform,
        }}
      >
        {block.text}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={16} />}
    </div>
  );
};

const HookSplit: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const parts = (block.text ?? "").split("|").map((p) => p.trim()).filter(Boolean);
  const fit = textFit(parts.join(" "));
  const e1 = useEnter(0, 36);
  const e2 = useEnter(8, 36);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 * s }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 150 * s * fit,
            lineHeight: 1,
            color: COLORS.text,
            opacity: e1.opacity,
            transform: e1.transform,
          }}
        >
          {parts[0]}
        </div>
        {parts[1] && (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 150 * s * fit,
              lineHeight: 1,
              color: COLORS.textFaint,
              marginTop: 10 * s,
              opacity: e2.opacity,
              transform: e2.transform,
            }}
          >
            {parts.slice(1).join(" ")}
          </div>
        )}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={18} />}
    </div>
  );
};

export const HookBlock: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const variant = block.variant ?? "stack";
  if (variant === "serif") return <HookSerif block={block} s={s} />;
  if (variant === "split") return <HookSplit block={block} s={s} />;
  return <HookStack block={block} s={s} />;
};

/* ─────────────── STATEMENT ─────────────── */

export const StatementBlock: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const variant = block.variant ?? "center";
  const e = useEnter(2, 34);

  if (variant === "left") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 34 * s, width: "100%" }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
        <div
          style={{
            borderLeft: `${4 * s}px solid ${COLORS.text}`,
            paddingLeft: 44 * s,
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 76 * s * textFit(block.text),
            lineHeight: 1.16,
            color: COLORS.text,
            opacity: e.opacity,
            transform: e.transform,
          }}
        >
          {block.text}
        </div>
        {block.sub && <SubText text={block.sub} s={s} delay={16} size={38} />}
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 * s }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 500,
            fontSize: 96 * s * textFit(block.text),
            lineHeight: 1.14,
            color: COLORS.text,
            textAlign: "center",
            maxWidth: "94%",
            opacity: e.opacity,
            transform: e.transform,
          }}
        >
          {block.text}
        </div>
        {block.sub && <SubText text={block.sub} s={s} delay={16} serif size={40} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 * s }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 122 * s * textFit(block.text),
          lineHeight: 1.02,
          color: COLORS.text,
          textAlign: "center",
          maxWidth: "96%",
          opacity: e.opacity,
          transform: e.transform,
        }}
      >
        {block.text}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={16} />}
    </div>
  );
};

/* ─────────────── SCREEN ─────────────── */

export const ScreenBlock: React.FC<{ block: Block; s: number; fullBleed?: boolean }> = ({
  block,
  s,
  fullBleed,
}) => {
  const variant = fullBleed ? "flat" : (block.variant ?? "browser");
  const e = useEnter(2, 44);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  if (variant === "flat" && block.asset) {
    return (
      <AbsoluteFill>
        <Img
          src={staticFile(block.asset)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(20,21,22,0.05) 40%, rgba(20,21,22,0.72) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 120 * s,
            left: 80 * s,
            right: 80 * s,
            display: "flex",
            flexDirection: "column",
            gap: 24 * s,
          }}
        >
          {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
          {block.text && (
            <div
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: 52 * s,
                lineHeight: 1.2,
                color: COLORS.text,
                opacity: e.opacity,
                transform: e.transform,
              }}
            >
              {block.text}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 * s, width: "100%" }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
      <div
        style={{
          width: "100%",
          borderRadius: 26 * s,
          overflow: "hidden",
          border: `1px solid ${COLORS.hairline}`,
          background: COLORS.surface,
          boxShadow: `0 ${44 * s}px ${110 * s}px rgba(0,0,0,0.55)`,
          opacity: e.opacity,
          transform: e.transform,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9 * s,
            padding: `${15 * s}px ${20 * s}px`,
            borderBottom: `1px solid ${COLORS.hairlineSoft}`,
          }}
        >
          {["rgba(255,255,255,0.22)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.22)"].map(
            (c, i) => (
              <div key={i} style={{ width: 13 * s, height: 13 * s, borderRadius: 999, background: c }} />
            )
          )}
        </div>
        <div style={{ aspectRatio: "16 / 10", overflow: "hidden" }}>
          {block.asset ? (
            <Img
              src={staticFile(block.asset)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom})`,
              }}
            />
          ) : (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                fontFamily: FONT_DISPLAY,
                fontSize: 54 * s,
                color: COLORS.textFaint,
              }}
            >
              {block.text ?? ""}
            </AbsoluteFill>
          )}
        </div>
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={14} size={38} />}
    </div>
  );
};

/* ─────────────── METRICS ─────────────── */

const MetricCard: React.FC<{ item: BlockItem; s: number; delay: number; valueSize: number }> = ({
  item,
  s,
  delay,
  valueSize,
}) => {
  const e = useEnter(delay, 26);
  return (
    <div
      style={{
        flex: "1 1 40%",
        padding: `${36 * s}px ${34 * s}px`,
        border: `1px solid ${COLORS.hairlineSoft}`,
        borderRadius: 20 * s,
        background: COLORS.surface,
        opacity: e.opacity,
        transform: e.transform,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: valueSize * s,
          lineHeight: 1,
          color: COLORS.text,
        }}
      >
        {item.value ?? ""}
      </div>
      <div
        style={{
          marginTop: 16 * s,
          fontFamily: FONT_BODY,
          fontSize: 31 * s,
          lineHeight: 1.3,
          color: COLORS.textDim,
        }}
      >
        {item.label}
      </div>
    </div>
  );
};

export const MetricsBlock: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const items = block.items ?? [];
  const variant = block.variant ?? "grid";
  const e = useEnter(0, 28);

  if (variant === "hero" && items.length > 0) {
    const [main, ...rest] = items;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 * s, width: "100%" }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
        <div style={{ textAlign: "center", opacity: e.opacity, transform: e.transform }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 260 * s, lineHeight: 0.9, color: COLORS.text }}>
            {main.value ?? ""}
          </div>
          <div
            style={{
              marginTop: 18 * s,
              fontFamily: FONT_BODY,
              fontSize: 36 * s,
              color: COLORS.textDim,
            }}
          >
            {main.label}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {rest.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: `${20 * s}px 0`,
                borderTop: `1px solid ${COLORS.hairlineSoft}`,
              }}
            >
              <div style={{ fontFamily: FONT_BODY, fontSize: 31 * s, color: COLORS.textDim }}>
                {item.label}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52 * s, color: COLORS.text }}>
                {item.value ?? ""}
              </div>
            </div>
          ))}
        </div>
        {block.sub && <SubText text={block.sub} s={s} delay={18} size={36} />}
      </div>
    );
  }

  if (variant === "rows") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 30 * s, width: "100%" }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
        {block.text && (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 84 * s * textFit(block.text),
              lineHeight: 1.04,
              color: COLORS.text,
              opacity: e.opacity,
              transform: e.transform,
            }}
          >
            {block.text}
          </div>
        )}
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: `${24 * s}px 0`,
                borderTop: `1px solid ${COLORS.hairlineSoft}`,
              }}
            >
              <div style={{ fontFamily: FONT_BODY, fontSize: 33 * s, color: COLORS.textDim, flex: 1, paddingRight: 20 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 58 * s, color: COLORS.text }}>
                {item.value ?? ""}
              </div>
            </div>
          ))}
        </div>
        {block.sub && <SubText text={block.sub} s={s} delay={18} size={36} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 * s, alignItems: "center", width: "100%" }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
      {block.text && (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 88 * s * textFit(block.text),
            lineHeight: 1.04,
            color: COLORS.text,
            textAlign: "center",
            opacity: e.opacity,
            transform: e.transform,
          }}
        >
          {block.text}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 * s, justifyContent: "center" }}>
        {items.map((item, i) => (
          <MetricCard key={i} item={item} s={s} delay={8 + i * 5} valueSize={104} />
        ))}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={20} size={36} />}
    </div>
  );
};

/* ─────────────── STEPS ─────────────── */

export const StepsBlock: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const items = block.items ?? [];
  const variant = block.variant ?? "numbered";
  const e = useEnter(0, 26);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (variant === "rows") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 30 * s, width: "100%" }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
        {block.text && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: 64 * s,
              lineHeight: 1.14,
              color: COLORS.text,
              opacity: e.opacity,
              transform: e.transform,
            }}
          >
            {block.text}
          </div>
        )}
        <div>
          {items.map((item, i) => {
            const ie = enterAt(frame, fps, 6 + i * 5);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24 * s,
                  padding: `${22 * s}px 0`,
                  borderTop: `1px solid ${COLORS.hairlineSoft}`,
                  opacity: ie.opacity,
                  transform: ie.transform,
                }}
              >
                <div style={{ fontFamily: FONT_BODY, fontSize: 27 * s, color: COLORS.textFaint, width: 40 * s }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 35 * s, color: COLORS.text, flex: 1 }}>
                  {item.label}
                </div>
                {item.value && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 29 * s, color: COLORS.textDim }}>
                    {item.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 * s, width: "100%" }}>
      {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} />}
      {block.text && (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 86 * s * textFit(block.text),
            lineHeight: 1.04,
            color: COLORS.text,
            opacity: e.opacity,
            transform: e.transform,
          }}
        >
          {block.text}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 * s }}>
        {items.map((item, i) => {
          const ie = enterAt(frame, fps, 6 + i * 6);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30 * s, opacity: ie.opacity, transform: ie.transform }}>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 78 * s,
                  lineHeight: 1,
                  color: "transparent",
                  WebkitTextStroke: `1.5px ${COLORS.textFaint}`,
                  width: 90 * s,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 38 * s, color: COLORS.text, flex: 1 }}>
                {item.label}
                {item.value && (
                  <span style={{ color: COLORS.textDim, fontWeight: 400 }}> — {item.value}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={22} size={36} />}
    </div>
  );
};

/* ─────────────── QUOTE ─────────────── */

export const QuoteBlock: React.FC<{ block: Block; s: number }> = ({ block, s }) => {
  const e = useEnter(2, 36);
  const markE = easeIn(useCurrentFrame(), 0, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 200 * s,
          lineHeight: 0.6,
          color: COLORS.hairline,
          opacity: markE,
          height: 110 * s,
        }}
      >
        “
      </div>
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 88 * s * textFit(block.text),
          lineHeight: 1.2,
          color: COLORS.text,
          textAlign: "center",
          maxWidth: "94%",
          opacity: e.opacity,
          transform: e.transform,
        }}
      >
        {block.text}
      </div>
      {block.sub && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 32 * s,
            letterSpacing: 4 * s,
            textTransform: "uppercase",
            color: COLORS.textFaint,
          }}
        >
          {block.sub}
        </div>
      )}
    </div>
  );
};

/* ─────────────── CTA ─────────────── */

export const CtaBlock: React.FC<{ block: Block; s: number; brand: Brand }> = ({ block, s, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = block.variant ?? "pill";
  const e = useEnter(2, 34);
  const pillP = spring({ frame: frame - 10, fps, config: springConfig });
  const pulse = 1 + Math.sin(frame / 10) * 0.02;

  if (variant === "minimal") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * s }}>
        {block.eyebrow && <Eyebrow text={block.eyebrow} s={s} align="center" />}
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 500,
            fontSize: 88 * s * textFit(block.text),
            lineHeight: 1.14,
            color: COLORS.text,
            textAlign: "center",
            opacity: e.opacity,
            transform: e.transform,
          }}
        >
          {block.text}
        </div>
        <div style={{ width: 80 * s, height: 2, background: COLORS.hairline }} />
        {block.sub && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 38 * s, color: COLORS.textDim, textAlign: "center", maxWidth: "80%" }}>
            {block.sub}
          </div>
        )}
        {block.cta && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 34 * s, color: COLORS.textDim }}>
            {block.cta}
          </div>
        )}
        {brand.handle && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 30 * s, color: COLORS.textFaint }}>
            {brand.handle}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 * s }}>
      {brand.logo ? (
        <Img
          src={staticFile(brand.logo)}
          style={{ width: 110 * s, height: 110 * s, objectFit: "contain", opacity: 0.95 }}
        />
      ) : null}
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 118 * s * textFit(block.text),
          lineHeight: 1.02,
          color: COLORS.text,
          textAlign: "center",
          maxWidth: "94%",
          opacity: e.opacity,
          transform: e.transform,
        }}
      >
        {block.text}
      </div>
      {block.sub && <SubText text={block.sub} s={s} delay={14} size={38} />}
      {block.cta && (
        <div
          style={{
            padding: `${28 * s}px ${70 * s}px`,
            borderRadius: 999,
            background: COLORS.text,
            color: COLORS.onLight,
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 42 * s,
            opacity: pillP,
            transform: `scale(${(0.85 + pillP * 0.15) * pulse})`,
            boxShadow: `0 ${20 * s}px ${60 * s}px rgba(0,0,0,0.45)`,
          }}
        >
          {block.cta}
        </div>
      )}
      {brand.handle && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 30 * s, color: COLORS.textFaint }}>
          {brand.handle}
        </div>
      )}
    </div>
  );
};

/* ─────────────── dispatcher ─────────────── */

export const BlockView: React.FC<{
  block: Block;
  s: number;
  brand: Brand;
  fullBleed?: boolean;
}> = ({ block, s, brand, fullBleed }) => {
  switch (block.block) {
    case "hook":
      return <HookBlock block={block} s={s} />;
    case "statement":
      return <StatementBlock block={block} s={s} />;
    case "screen":
      return <ScreenBlock block={block} s={s} fullBleed={fullBleed} />;
    case "metrics":
      return <MetricsBlock block={block} s={s} />;
    case "steps":
      return <StepsBlock block={block} s={s} />;
    case "quote":
      return <QuoteBlock block={block} s={s} />;
    case "cta":
      return <CtaBlock block={block} s={s} brand={brand} />;
    default:
      return <StatementBlock block={block} s={s} />;
  }
};

/* ─────────────── chrome compartido ─────────────── */

/** subtítulo del reel (píldora inferior) */
export const SceneCaption: React.FC<{ text: string; s: number }> = ({ text, s }) => {
  const e = useEnter(4, 18);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 130 * s,
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
          padding: `${15 * s}px ${30 * s}px`,
          borderRadius: 999,
          border: `1px solid ${COLORS.hairlineSoft}`,
          background: "rgba(20,21,22,0.62)",
          backdropFilter: "blur(12px)",
          fontFamily: FONT_BODY,
          fontWeight: 500,
          fontSize: 33 * s,
          lineHeight: 1.3,
          color: "rgba(255,255,255,0.94)",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** barra de progreso del reel (motivo loader del sitio) */
export const ReelProgress: React.FC<{ progress: number; s: number }> = ({ progress, s }) => (
  <div
    style={{
      position: "absolute",
      bottom: 64 * s,
      left: 90 * s,
      right: 90 * s,
      height: 3 * s,
      borderRadius: 999,
      background: "rgba(255,255,255,0.12)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${Math.min(100, Math.max(0, progress * 100))}%`,
        height: "100%",
        background: COLORS.text,
        borderRadius: 999,
      }}
    />
  </div>
);

/** rail segmentado de carrusel (arriba) */
export const CarouselRail: React.FC<{ index: number; total: number; s: number }> = ({
  index,
  total,
  s,
}) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      display: "flex",
      gap: 7 * s,
      padding: `${28 * s}px ${84 * s}px 0`,
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 3 * s,
          borderRadius: 999,
          background: i <= index ? COLORS.text : "rgba(255,255,255,0.14)",
        }}
      />
    ))}
  </div>
);

/** footer de slide de carrusel: firma + numeración */
export const PageFooter: React.FC<{ brand: Brand; index: number; total: number; s: number }> = ({
  brand,
  index,
  total,
  s,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 54 * s,
      left: 84 * s,
      right: 84 * s,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <BrandSignature brand={brand} s={s} />
    <div style={{ fontFamily: FONT_BODY, fontSize: 27 * s, color: COLORS.textFaint }}>
      {index + 1} / {total}
    </div>
  </div>
);

/* ─────────────── firma de marca (posición fija en todas las imágenes) ─────────────── */

/**
 * Lockup de firma: logo + nombre. Se usa en TODAS las piezas para que la marca
 * quede siempre en el mismo lugar (firma consistente).
 */
export const BrandSignature: React.FC<{ brand: Brand; s: number; size?: number }> = ({
  brand,
  s,
  size = 40,
}) => {
  const name = brand.name ?? brand.handle ?? "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * s }}>
      {brand.logo && (
        <Img
          src={staticFile(brand.logo)}
          style={{ width: size * s, height: size * s, objectFit: "contain", opacity: 0.9 }}
        />
      )}
      {name && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: size * 0.7 * s,
            letterSpacing: 1 * s,
            color: COLORS.textFaint,
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
};

/** firma absoluta en posición fija (esquina inferior izquierda) */
export const Signature: React.FC<{ brand: Brand; s: number }> = ({ brand, s }) => (
  <div style={{ position: "absolute", left: 84 * s, bottom: 54 * s }}>
    <BrandSignature brand={brand} s={s} />
  </div>
);

/** footer de pieza estática: logo + handle + hairline */
export const BrandFooter: React.FC<{ brand: Brand; s: number; tag?: string | null }> = ({
  brand,
  s,
  tag,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 58 * s,
      left: 84 * s,
      right: 84 * s,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: `1px solid ${COLORS.hairlineSoft}`,
      paddingTop: 28 * s,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 15 * s }}>
      {brand.logo && (
        <Img
          src={staticFile(brand.logo)}
          style={{ width: 42 * s, height: 42 * s, objectFit: "contain", opacity: 0.9 }}
        />
      )}
      {brand.handle && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 28 * s, color: COLORS.textFaint }}>
          {brand.handle}
        </div>
      )}
    </div>
    {tag && (
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 24 * s,
          letterSpacing: 4 * s,
          textTransform: "uppercase",
          color: COLORS.textFaint,
        }}
      >
        {tag}
      </div>
    )}
  </div>
);
