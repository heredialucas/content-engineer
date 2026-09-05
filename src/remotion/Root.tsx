import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig, interpolate, useCurrentFrame, spring } from "remotion";
import { Composition } from "remotion";
import { FORMATS, FPS, TRANSITION_FRAMES } from "../../config/config";
import { ContentEngine } from "./ContentEngine";
import { storyboardDurationFrames } from "../storyboard/duration";import type { Storyboard } from "../storyboard/types";
import { FONT_DISPLAY, FONT_BODY } from "../../templates/_shared/fonts";

/* ─────────────── storyboard de demostración (render de prueba) ─────────────── */

export const DEMO_STORYBOARD: Storyboard = {
  templateId: "portfolio-showcase",
  format: "9:16",
  title: "Lucas — Full Stack Developer",
  hook: "Tu portfolio también es un producto",
  cta: "Ver proyectos",
  ctaSub: "lucas.dev — desarrollo web full-stack",
  brand: {
    bg: "#0B0F1A",
    primary: "#6366F1",
    accent: "#22D3EE",
    handle: "@lucas.dev",
  },
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationInSeconds: 3.2,
      text: "Tu portfolio también es un producto",
      caption: "Un portfolio que convierte visitas en clientes",
    },
    {
      id: "title",
      type: "title",
      durationInSeconds: 3.4,
      eyebrow: "Portfolio 2026",
      text: "Diseño y construyo productos web completos",
      subtext: "Next.js · React · Node · TypeScript",
      caption: "Del diseño al deploy: un solo responsible",
    },
    {
      id: "shot-1",
      type: "showcase",
      durationInSeconds: 4.6,
      eyebrow: "Interfaz",
      text: "Landing con animaciones y i18n",
      asset: "projects/portfolio/assets/screenshots/shot-1.png",
      caption: "Componentes animados con Framer Motion y GSAP",
    },
    {
      id: "shot-2",
      type: "showcase",
      durationInSeconds: 4.2,
      eyebrow: "Producto real",
      text: "E-commerce completo: front + back",
      asset: "projects/portfolio/assets/screenshots/shot-2.png",
      caption: "React en el front, Node en el back",
    },
    {
      id: "features",
      type: "features",
      durationInSeconds: 4.4,
      eyebrow: "Stack",
      text: "Tecnologías con las que trabajo",
      items: [
        { label: "Next.js 16 + React 19", value: "" },
        { label: "Node + APIs REST", value: "" },
        { label: "Tailwind + GSAP", value: "" },
        { label: "TypeScript end to end", value: "" },
      ],
      caption: "Stack moderno, productos que escalan",
    },
    {
      id: "cta",
      type: "cta",
      durationInSeconds: 4.4,
      text: "¿Tenés un proyecto en mente?",
      cta: "Escribime",
      subtext: "lucas.dev",
      caption: "Hablemos de tu próximo producto",
    },
  ],
};

/* ─────────────── composición principal (dinámica) ─────────────── */

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ContentEngine"
        component={ContentEngine}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ storyboard: DEMO_STORYBOARD }}
        calculateMetadata={({ props }) => {
          const sb = props.storyboard;
          const dims = FORMATS[sb.format] ?? FORMATS["9:16"];
          return {
            width: dims.width,
            height: dims.height,
            durationInFrames: storyboardDurationFrames(sb.scenes),
          };
        }}
      />
      <Composition
        id="PlaceholderScreen"
        component={PlaceholderScreen}
        fps={FPS}
        width={1600}
        height={1000}
        durationInFrames={FPS}
        defaultProps={PLACEHOLDER_DEFAULTS}
        calculateMetadata={({ props }) => ({ width: props.width, height: props.height })}
      />
    </>
  );
};

/* ─────────────── composición auxiliar: screenshots placeholder ─────────────── */

export type PlaceholderProps = {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  colorA: string;
  colorB: string;
  seed: number;
};

export const PLACEHOLDER_DEFAULTS: PlaceholderProps = {
  width: 1600,
  height: 1000,
  title: "Proyecto",
  subtitle: "Screenshot de ejemplo",
  colorA: "#6366F1",
  colorB: "#22D3EE",
  seed: 1,
};

export const PlaceholderScreen: React.FC<PlaceholderProps> = ({
  title,
  subtitle,
  colorA,
  colorB,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 110 } });

  const blocks = [
    { w: 0.62, h: 26 },
    { w: 0.46, h: 18 },
    { w: 0.72, h: 18 },
    { w: 0.3, h: 18 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${125 + seed * 40}deg, ${colorA} 0%, ${colorB} 130%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "78%",
          borderRadius: 22,
          background: "rgba(10,12,20,0.82)",
          border: "1px solid rgba(255,255,255,0.14)",
          padding: 38,
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 9, marginBottom: 26 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: width * 0.038,
            color: "#fff",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: width * 0.02,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 30,
          }}
        >
          {subtitle}
        </div>
        {blocks.map((b, i) => (
          <div
            key={i}
            style={{
              width: `${b.w * 100}%`,
              height: b.h,
              borderRadius: 8,
              marginBottom: 14,
              background: i === 0 ? `linear-gradient(90deg, ${colorA}, ${colorB})` : "rgba(255,255,255,0.12)",
              transform: `translateX(${interpolate(enter, [0, 1], [-40 * i, 0])}px)`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
