import React from "react";
import {
  AbsoluteFill,
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_BODY, FONT_DISPLAY, FONT_SERIF, springConfig } from "../design/tokens";
import { Signature } from "../design/blocks";
import type { Block, StaticSpec } from "../specs";

/**
 * Layouts minimalistas de piezas estáticas.
 *
 * Regla de producto: SOLO usan el screenshot oficial del proyecto + los datos
 * reales del brief. Fondo plano de marca, tipografía del design system, cero
 * estética "IA". Nunca construyen escenas ni elementos ficticios.
 */

type LayoutProps = { spec: StaticSpec; s: number };

const enterAt = (frame: number, fps: number, delay: number, rise = 24) => {
  const p = spring({ frame: frame - delay, fps, config: springConfig });
  return { opacity: p, transform: `translateY(${(1 - p) * rise}px)` };
};

/** tamaño de titular adaptativo según largo (evita overflow) */
const fitSize = (text: string | null | undefined, base: number): number => {
  const len = (text ?? "").length;
  if (len <= 24) return base;
  if (len <= 40) return base * 0.82;
  if (len <= 60) return base * 0.66;
  if (len <= 90) return base * 0.52;
  return base * 0.42;
};

const Background: React.FC<{ bg: string }> = ({ bg }) => (
  <AbsoluteFill style={{ backgroundColor: bg || COLORS.bg }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 50%, transparent 62%, rgba(0,0,0,0.4) 135%)",
      }}
    />
  </AbsoluteFill>
);

const Eyebrow: React.FC<{ text: string; s: number; style?: React.CSSProperties }> = ({
  text,
  s,
  style,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16 * s,
      fontFamily: FONT_BODY,
      fontWeight: 600,
      fontSize: 26 * s,
      letterSpacing: 5 * s,
      textTransform: "uppercase",
      color: COLORS.textFaint,
      ...style,
    }}
  >
    <div style={{ width: 40 * s, height: 2, background: COLORS.hairline }} />
    {text}
  </div>
);

const Card: React.FC<{ s: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  s,
  style,
  children,
}) => (
  <div
    style={{
      borderRadius: 24 * s,
      overflow: "hidden",
      border: `1px solid ${COLORS.hairline}`,
      background: COLORS.surface,
      boxShadow: `0 ${44 * s}px ${120 * s}px rgba(0,0,0,0.55)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** chrome de navegador minimalista sobre el screenshot oficial */
const BrowserCard: React.FC<{ asset: string; s: number; style?: React.CSSProperties }> = ({
  asset,
  s,
  style,
}) => (
  <Card s={s} style={style}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9 * s,
        padding: `${15 * s}px ${20 * s}px`,
        borderBottom: `1px solid ${COLORS.hairlineSoft}`,
      }}
    >
      {["rgba(255,255,255,0.22)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.22)"].map((c, i) => (
        <div key={i} style={{ width: 13 * s, height: 13 * s, borderRadius: 999, background: c }} />
      ))}
    </div>
    <Img src={staticFile(asset)} style={{ width: "100%", display: "block", objectFit: "cover" }} />
  </Card>
);

const textBlock = (blocks: Block[]): Block | undefined =>
  blocks.find((b) => (b.block === "hook" || b.block === "statement" || b.block === "quote") && b.text);
const screenBlock = (blocks: Block[]): Block | undefined =>
  blocks.find((b) => b.block === "screen" && !!b.asset);

/** A — product-shot: screenshot oficial grande + claim corto */
export const ProductShotLayout: React.FC<LayoutProps> = ({ spec, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = textBlock(spec.blocks);
  const screen = screenBlock(spec.blocks);
  const eyebrow = head?.eyebrow ?? spec.blocks.find((b) => b.eyebrow)?.eyebrow ?? null;
  const claim = head?.text ?? "";
  const eHead = enterAt(frame, fps, 0, 16);
  const eShot = enterAt(frame, fps, 6, 34);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Background bg={spec.brand.bg} />
      <AbsoluteFill
        style={{
          padding: `${120 * s}px ${84 * s}px ${186 * s}px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {eyebrow && <Eyebrow text={eyebrow} s={s} style={eHead} />}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 46 * s,
          }}
        >
          {screen?.asset && (
            <Card s={s} style={{ ...eShot, width: "100%", height: 440 * s }}>
              <Img
                src={staticFile(screen.asset)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </Card>
          )}
        </div>
        {claim && (
          <div
            style={{
              ...eShot,
              fontFamily: FONT_DISPLAY,
              fontSize: fitSize(claim, 96 * s),
              lineHeight: 0.98,
              letterSpacing: "0.01em",
              color: COLORS.text,
              marginTop: 30 * s,
            }}
          >
            {claim}
          </div>
        )}
      </AbsoluteFill>
      <Signature brand={spec.brand} s={s} />
    </AbsoluteFill>
  );
};

/** B — editorial-split: frase editorial arriba + pantalla cortada abajo */
export const EditorialSplitLayout: React.FC<LayoutProps> = ({ spec, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = textBlock(spec.blocks);
  const screen = screenBlock(spec.blocks);
  const text = head?.text ?? "";
  const eHead = enterAt(frame, fps, 0, 30);
  const eShot = enterAt(frame, fps, 8, 44);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Background bg={spec.brand.bg} />
      <div style={{ position: "absolute", top: 150 * s, left: 96 * s, right: 96 * s, ...eHead }}>
        {head?.eyebrow && (
          <Eyebrow text={head.eyebrow} s={s} style={{ marginBottom: 34 * s }} />
        )}
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: fitSize(text, 94 * s),
            lineHeight: 1.16,
            color: COLORS.text,
            maxWidth: "94%",
          }}
        >
          {text}
        </div>
      </div>
      {screen?.asset && (
        <div
          style={{
            position: "absolute",
            bottom: 108 * s,
            left: 84 * s,
            right: 84 * s,
            height: 420 * s,
            ...eShot,
          }}
        >
          <BrowserCard asset={screen.asset} s={s} style={{ height: "100%" }} />
        </div>
      )}
      <Signature brand={spec.brand} s={s} />
    </AbsoluteFill>
  );
};

/** C — tech-card: ficha data-first (nombre + rubro + métricas reales) */
export const TechCardLayout: React.FC<LayoutProps> = ({ spec, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = textBlock(spec.blocks);
  const screen = screenBlock(spec.blocks);
  const metrics = spec.blocks.find((b) => b.block === "metrics" && !!b.items?.length);
  const cta = spec.blocks.find((b) => b.block === "cta");
  const eHead = enterAt(frame, fps, 0, 20);
  const eBody = enterAt(frame, fps, 6, 28);
  const eCta = enterAt(frame, fps, 12, 24);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Background bg={spec.brand.bg} />
      <AbsoluteFill
        style={{
          padding: `${120 * s}px ${84 * s}px ${186 * s}px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={eHead}>
          {head?.eyebrow && <Eyebrow text={head.eyebrow} s={s} style={{ marginBottom: 26 * s }} />}
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: fitSize(head?.text, 96 * s),
              lineHeight: 1.0,
              color: COLORS.text,
            }}
          >
            {head?.text}
          </div>
          {head?.sub && (
            <div
              style={{
                marginTop: 16 * s,
                fontFamily: FONT_BODY,
                fontWeight: 500,
                fontSize: 26 * s,
                letterSpacing: 5 * s,
                textTransform: "uppercase",
                color: COLORS.textFaint,
              }}
            >
              {head.sub}
            </div>
          )}
        </div>

        <div
          style={{
            ...eBody,
            flex: 1,
            display: "flex",
            gap: 44 * s,
            alignItems: "center",
            paddingTop: 54 * s,
          }}
        >
          {screen?.asset && (
            <Card s={s} style={{ width: "44%", flexShrink: 0 }}>
              <Img
                src={staticFile(screen.asset)}
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }}
              />
            </Card>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {(metrics?.items ?? []).map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 20 * s,
                  padding: `${24 * s}px 0`,
                  borderTop: i === 0 ? "none" : `1px solid ${COLORS.hairlineSoft}`,
                }}
              >
                <div style={{ fontFamily: FONT_BODY, fontSize: 28 * s, color: COLORS.textDim }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54 * s, color: COLORS.text }}>
                  {item.value ?? ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {cta && (
          <div style={{ ...eCta, borderTop: `1px solid ${COLORS.hairlineSoft}`, paddingTop: 30 * s }}>
            {cta.text && (
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: 50 * s,
                  lineHeight: 1.15,
                  color: COLORS.text,
                }}
              >
                {cta.text}
              </div>
            )}
            {cta.cta && (
              <div
                style={{
                  marginTop: 14 * s,
                  fontFamily: FONT_BODY,
                  fontSize: 30 * s,
                  color: COLORS.textDim,
                }}
              >
                {cta.cta}
              </div>
            )}
          </div>
        )}
      </AbsoluteFill>
      <Signature brand={spec.brand} s={s} />
    </AbsoluteFill>
  );
};

/** P — presentación: imagen del proyecto + tu nombre/logo + nombre del proyecto (sin hooks) */
export const PresentationLayout: React.FC<LayoutProps> = ({ spec, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const screen = screenBlock(spec.blocks);
  const head = textBlock(spec.blocks);
  const projectName = screen?.eyebrow ?? head?.eyebrow ?? "";
  const subtitle = screen?.text ?? null;
  const eShot = enterAt(frame, fps, 0, 30);
  const eName = enterAt(frame, fps, 8, 18);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Background bg={spec.brand.bg} />
      <AbsoluteFill
        style={{
          padding: `${108 * s}px ${84 * s}px ${178 * s}px`,
          display: "flex",
          flexDirection: "column",
          gap: 52 * s,
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {screen?.asset && (
            <Card s={s} style={{ ...eShot, width: "100%", height: "100%" }}>
              <Img
                src={staticFile(screen.asset)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </Card>
          )}
        </div>

        <div style={{ ...eName, display: "flex", flexDirection: "column", gap: 22 * s }}>
          {projectName && (
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: fitSize(projectName, 116 * s),
                lineHeight: 0.98,
                letterSpacing: "0.01em",
                color: COLORS.text,
              }}
            >
              {projectName}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 32 * s,
                lineHeight: 1.35,
                color: COLORS.textDim,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </AbsoluteFill>
      <Signature brand={spec.brand} s={s} />
    </AbsoluteFill>
  );
};

/**
 * true si el layout puede renderizarse con los bloques disponibles.
 * `stack` siempre se puede; los demás requieren el screenshot oficial.
 */
export const canRenderStaticLayout = (spec: StaticSpec): boolean => {
  const layout = spec.layout ?? "stack";
  if (layout === "stack") return true;
  return !!screenBlock(spec.blocks);
};

export const StaticLayoutView: React.FC<LayoutProps> = ({ spec, s }) => {
  switch (spec.layout) {
    case "presentation":
      return <PresentationLayout spec={spec} s={s} />;
    case "product-shot":
      return <ProductShotLayout spec={spec} s={s} />;
    case "editorial-split":
      return <EditorialSplitLayout spec={spec} s={s} />;
    case "tech-card":
      return <TechCardLayout spec={spec} s={s} />;
    default:
      return null;
  }
};
