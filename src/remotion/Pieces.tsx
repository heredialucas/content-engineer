import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import type { FadeProps } from "@remotion/transitions/fade";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { FPS, TRANSITION_FRAMES } from "../../config/config";
import type { CarouselSpec, ReelSpec, StaticSpec } from "../specs";
import {
  BlockView,
  BrandFooter,
  CarouselRail,
  PageFooter,
  ReelProgress,
  SceneCaption,
} from "../design/blocks";
import { COLORS, reelScale, stillScale } from "../design/tokens";
import { StaticLayoutView, canRenderStaticLayout } from "./StaticLayouts";

/* fondo base: carbón + glow sutil blanco (estética hlucas.cloud) */
const PieceBackground: React.FC<{ bg: string }> = ({ bg }) => (
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

type AnyPresentation = TransitionPresentation<FadeProps>;

/** transiciones CSS puras (compatibles con headless swiftshader) */
const transitionFor = (index: number): AnyPresentation => {
  const cycle = index % 3;
  if (cycle === 0) return slide({ direction: "from-right" }) as AnyPresentation;
  if (cycle === 1) return fade() as AnyPresentation;
  return slide({ direction: "from-bottom" }) as AnyPresentation;
};

/* ─────────────── REEL ─────────────── */

export const ReelPiece: React.FC<{ spec: ReelSpec }> = ({ spec }) => {
  const { width, height } = useVideoConfig();
  const s = reelScale(width, height);
  const children: React.ReactNode[] = [];
  const durations = spec.blocks.map(
    (b) => Math.max(1.2, Math.round((b.durationInSeconds ?? 3) * 100) / 100)
  );
  const totalSeconds = durations.reduce((a, b) => a + b, 0);

  spec.blocks.forEach((block, i) => {
    if (i > 0) {
      children.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={transitionFor(i)}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
      );
    }
    const secondsBefore = durations.slice(0, i).reduce((a, b) => a + b, 0);
    children.push(
      <TransitionSeries.Sequence
        key={block.block + i}
        durationInFrames={Math.max(1, Math.round(durations[i] * FPS))}
      >
        <ReelScene
          spec={spec}
          blockIndex={i}
          s={s}
          progressStart={secondsBefore / totalSeconds}
          progressSpan={durations[i] / totalSeconds}
        />
      </TransitionSeries.Sequence>
    );
  });

  return (
    <AbsoluteFill>
      <PieceBackground bg={spec.brand.bg} />
      <AbsoluteFill>
        <TransitionSeries>{children}</TransitionSeries>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ReelScene: React.FC<{
  spec: ReelSpec;
  blockIndex: number;
  s: number;
  progressStart: number;
  progressSpan: number;
}> = ({ spec, blockIndex, s, progressStart, progressSpan }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const block = spec.blocks[blockIndex];
  const isFullBleed = block.block === "screen" && block.variant === "flat";

  return (
    <AbsoluteFill>
      {isFullBleed ? (
        <BlockView block={block} s={s} brand={spec.brand} fullBleed />
      ) : (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: `0 ${100 * s}px`,
          }}
        >
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <BlockView block={block} s={s} brand={spec.brand} />
          </div>
        </AbsoluteFill>
      )}
      {block.caption && <SceneCaption text={block.caption} s={s} />}
      <ReelProgress progress={progressStart + (frame / durationInFrames) * progressSpan} s={s} />
    </AbsoluteFill>
  );
};

/* ─────────────── STATIC ─────────────── */

const CATEGORY_LABEL: Record<string, string> = {
  venta: "Venta",
  proyectos: "Proyectos",
  educativo: "Educativo",
  opiniones: "Opinión",
  proceso: "Proceso",
  personal: "Personal",
  promocional: "Promo",
};

export const StaticPiece: React.FC<{ spec: StaticSpec }> = ({ spec }) => {
  const { width, height } = useVideoConfig();
  const s = stillScale(width, height);

  // layouts minimalistas fijos (screenshot oficial + datos reales)
  if ((spec.layout ?? "stack") !== "stack" && canRenderStaticLayout(spec)) {
    return <StaticLayoutView spec={spec} s={s} />;
  }

  const only = spec.blocks.length === 1 ? spec.blocks[0] : null;
  const isFullBleed = only?.block === "screen" && only.variant === "flat";

  return (
    <AbsoluteFill>
      {isFullBleed && only ? (
        <BlockView block={only} s={s} brand={spec.brand} fullBleed />
      ) : (
        <>
          <PieceBackground bg={spec.brand.bg} />
          <AbsoluteFill
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: `${140 * s}px ${96 * s}px ${200 * s}px`,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 64 * s,
                alignItems: "center",
              }}
            >
              {spec.blocks.map((block, i) => (
                <div key={i} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                  <BlockView block={block} s={s} brand={spec.brand} />
                </div>
              ))}
            </div>
          </AbsoluteFill>
          <BrandFooter brand={spec.brand} s={s} tag={CATEGORY_LABEL[spec.category] ?? null} />
        </>
      )}
    </AbsoluteFill>
  );
};

/* ─────────────── CAROUSEL ─────────────── */

export const CarouselPiece: React.FC<{ spec: CarouselSpec; pageIndex: number }> = ({
  spec,
  pageIndex,
}) => {
  const { width, height } = useVideoConfig();
  const s = stillScale(width, height);
  const total = spec.pages.length;
  const index = Math.min(Math.max(pageIndex, 0), total - 1);
  const page = spec.pages[index];
  const blocks = page?.blocks ?? [];
  const only = blocks.length === 1 ? blocks[0] : null;
  const isFullBleed = only?.block === "screen" && only.variant === "flat";

  return (
    <AbsoluteFill>
      {isFullBleed && only ? (
        <BlockView block={only} s={s} brand={spec.brand} fullBleed />
      ) : (
        <>
          <PieceBackground bg={spec.brand.bg} />
          <AbsoluteFill
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: `${150 * s}px ${90 * s}px ${190 * s}px`,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 56 * s,
                alignItems: "center",
              }}
            >
              {blocks.map((block, i) => (
                <div key={i} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                  <BlockView block={block} s={s} brand={spec.brand} />
                </div>
              ))}
            </div>
          </AbsoluteFill>
          <CarouselRail index={index} total={total} s={s} />
          <PageFooter brand={spec.brand} index={index} total={total} s={s} />
        </>
      )}
    </AbsoluteFill>
  );
};
