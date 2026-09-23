import React from "react";
import {
  AbsoluteFill,
  Composition,
  continueRender,
  delayRender,
  interpolate,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { FORMATS, FPS, STATIC_FORMATS } from "../../config/config";
import { CarouselPiece, ReelPiece, StaticPiece } from "./Pieces";
import type { CarouselSpec, PieceSpec, ReelSpec, StaticSpec } from "../specs";

/* ─────────────── specs de demostración (Studio / test:render) ─────────────── */

const DEMO_BRAND = {
  bg: "#141516",
  primary: "#FFFFFF",
  accent: "#999D9E",
  handle: "@hlucasdev",
  logo: "projects/portfolio/assets/logo/logoHL-mark.png",
};

const DEMO_ASSET = "projects/portfolio/assets/screenshots/es-desktop-1.png";

export const DEMO_REEL_SPEC: ReelSpec = {
  kind: "reel",
  format: "9:16",
  brand: DEMO_BRAND,
  category: "venta",
  blocks: [
    {
      block: "hook",
      variant: "stack",
      text: "Tu web no convierte",
      sub: "y el problema no es el tráfico.",
      caption: "Los 3 errores que matan las consultas",
      durationInSeconds: 3,
    },
    {
      block: "statement",
      variant: "left",
      eyebrow: "EL PROBLEMA",
      text: "Un sitio lindo que no vende es un folleto caro.",
      durationInSeconds: 3.4,
    },
    {
      block: "screen",
      variant: "browser",
      eyebrow: "CASO REAL",
      asset: DEMO_ASSET,
      caption: "Rediseño con foco en conversión",
      durationInSeconds: 4,
    },
    {
      block: "metrics",
      variant: "grid",
      eyebrow: "RESULTADO",
      items: [
        { value: "+40%", label: "consultas en 60 días" },
        { value: "2×", label: "velocidad de carga" },
      ],
      durationInSeconds: 4,
    },
    {
      block: "cta",
      variant: "pill",
      text: "¿Hablamos de tu sitio?",
      cta: "Escribime",
      durationInSeconds: 4,
    },
  ],
};

export const DEMO_STATIC_SPEC: StaticSpec = {
  kind: "static",
  aspect: "4:5",
  brand: DEMO_BRAND,
  category: "opiniones",
  blocks: [
    { block: "hook", variant: "serif", eyebrow: "OPINIÓN", text: "El portfolio no es un CV." },
    {
      block: "statement",
      variant: "center",
      text: "Es tu mejor vendedor",
      sub: "cuando muestra cómo pensás, no solo qué hiciste.",
    },
  ],
};

export const DEMO_CAROUSEL_SPEC: CarouselSpec = {
  kind: "carousel",
  aspect: "4:5",
  brand: DEMO_BRAND,
  category: "proyectos",
  pages: [
    { blocks: [{ block: "hook", variant: "stack", text: "De Django a React", eyebrow: "CASO" }] },
    {
      blocks: [
        {
          block: "statement",
          variant: "left",
          eyebrow: "EL DESAFÍO",
          text: "Una plataforma que frenaba el negocio en cada release.",
        },
      ],
    },
    {
      blocks: [
        { block: "screen", variant: "browser", eyebrow: "DESPUÉS", asset: DEMO_ASSET },
      ],
    },
    {
      blocks: [
        {
          block: "metrics",
          variant: "hero",
          eyebrow: "RESULTADO",
          items: [
            { value: "6", label: "meses destrabados en semanas" },
            { value: "0", label: "regresiones en producción" },
          ],
        },
      ],
    },
    { blocks: [{ block: "cta", variant: "pill", text: "¿Tenés un caso así?", cta: "Escribime" }] },
  ],
};

/* ─────────────── composiciones ─────────────── */

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelPiece"
        component={ReelPiece}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ spec: DEMO_REEL_SPEC }}
        calculateMetadata={({ props }) => {
          const spec = props.spec;
          const dims = FORMATS[spec.format] ?? FORMATS["9:16"];
          const seconds = spec.blocks.reduce((a, b) => a + (b.durationInSeconds ?? 3), 0);
          return { width: dims.width, height: dims.height, durationInFrames: Math.ceil(seconds * FPS) };
        }}
      />
      <Composition
        id="StaticPiece"
        component={StaticPiece}
        fps={FPS}
        width={1080}
        height={1350}
        durationInFrames={120}
        defaultProps={{ spec: DEMO_STATIC_SPEC }}
        calculateMetadata={({ props }) => {
          const dims = STATIC_FORMATS[props.spec.aspect] ?? STATIC_FORMATS["4:5"];
          return { width: dims.width, height: dims.height };
        }}
      />
      <Composition
        id="CarouselPiece"
        component={CarouselPiece}
        fps={FPS}
        width={1080}
        height={1350}
        durationInFrames={120}
        defaultProps={{ spec: DEMO_CAROUSEL_SPEC, pageIndex: 0 }}
        calculateMetadata={({ props }) => {
          const dims = STATIC_FORMATS[props.spec.aspect] ?? STATIC_FORMATS["4:5"];
          return { width: dims.width, height: dims.height };
        }}
      />
      <Composition
        id="PiecePreview"
        component={PiecePreview}
        fps={FPS}
        width={1080}
        height={1350}
        durationInFrames={120}
        defaultProps={PIECE_PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({
          width: props.w,
          height: props.h,
          durationInFrames: props.kind === "reel" ? 900 : 120,
        })}
      />
      <Composition
        id="QuickAd"
        component={QuickAd}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={240}
        defaultProps={{ imageDataUrl: "", headline: "Una idea para tu marca", brandName: "" }}
      />
    </>
  );
};

/* ─────────────── preview de piezas reales (Remotion Studio) ─────────────── */

export type PiecePreviewProps = {
  kind: "static" | "carousel" | "reel";
  /** id de la pieza (corré `pnpm previews` para sincronizar) */
  id: string;
  pageIndex: number;
  w: number;
  h: number;
};

export const PIECE_PREVIEW_DEFAULTS: PiecePreviewProps = {
  kind: "static",
  id: "static-ejemplo",
  pageIndex: 0,
  w: 1080,
  h: 1350,
};

export type QuickAdProps = {
  imageDataUrl: string;
  headline: string;
  brandName: string;
};

/** Clip vertical breve para reutilizar una imagen de campaña como video. */
export const QuickAd: React.FC<QuickAdProps> = ({ imageDataUrl, headline, brandName }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 240], [1, 1.1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 18, 222, 240], [0.4, 1, 1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#071a31", overflow: "hidden" }}>
      {imageDataUrl ? (
        <Img
          src={imageDataUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: 92,
          paddingBottom: 180,
          opacity,
          background: "linear-gradient(180deg, rgba(7,26,49,0.05) 15%, rgba(7,26,49,0.24) 42%, rgba(7,26,49,0.92) 100%)",
          color: "white",
          fontFamily: "Montserrat, Arial, sans-serif",
        }}
      >
        {brandName ? (
          <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 30, letterSpacing: 1 }}>
            {brandName.toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1.04, maxWidth: 900 }}>
          {headline}
        </div>
        <div
          style={{
            marginTop: 42,
            width: 116,
            height: 8,
            borderRadius: 8,
            backgroundColor: "#006bff",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CenterMsg: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#101014",
      color: "rgba(255,255,255,0.7)",
      fontFamily: "Inter, sans-serif",
      fontSize: 30,
      textAlign: "center",
      padding: 60,
    }}
  >
    {text}
  </AbsoluteFill>
);

/**
 * Carga una pieza REAL (spec v4 copiado a public/previews/ por `pnpm previews`)
 * y la renderiza con el motor nuevo. Cambiá `id` y `kind` en el panel de props.
 */
export const PiecePreview: React.FC<PiecePreviewProps> = ({ kind, id, pageIndex }) => {
  const [data, setData] = React.useState<{ spec: PieceSpec; pageIndex?: number } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [handle] = React.useState(() => delayRender(`preview ${kind}-${id}`));

  React.useEffect(() => {
    let alive = true;
    fetch(staticFile(`previews/${kind}-${id}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
        continueRender(handle);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [kind, id, handle]);

  if (failed) {
    return (
      <CenterMsg
        text={`Sin preview para "${id}".\n\nCorré: pnpm previews\ny volvé a abrir el Studio.`}
      />
    );
  }
  if (!data) return null;
  const spec = data.spec;
  if (spec.kind === "static") return <StaticPiece spec={spec} />;
  if (spec.kind === "carousel")
    return <CarouselPiece spec={spec} pageIndex={data.pageIndex ?? pageIndex} />;
  return <ReelPiece spec={spec} />;
};
