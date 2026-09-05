import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import type { FadeProps } from "@remotion/transitions/fade";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { FPS, TRANSITION_FRAMES } from "../../config/config";
import type { Scene, Storyboard } from "../../src/storyboard/types";
import {
  CtaScene,
  FeaturesScene,
  HookScene,
  SceneCaption,
  ShowcaseScene,
  StatsScene,
  TextScene,
  TitleScene,
  useS,
  type Tokens,
} from "./scenes";

type AnyPresentation = TransitionPresentation<FadeProps>;

/**
 * Transiciones CSS puras (slide/fade/wipe): se renderizan igual en
 * headless Chrome sin depender de WebGL.
 */
const transitionFor = (index: number): AnyPresentation => {
  const cycle = index % 4;
  if (cycle === 0) return slide({ direction: "from-right" }) as AnyPresentation;
  if (cycle === 1) return wipe({ direction: "from-left" }) as AnyPresentation;
  if (cycle === 2) return fade() as AnyPresentation;
  return slide({ direction: "from-bottom" }) as AnyPresentation;
};

const SceneRenderer: React.FC<{ scene: Scene; storyboard: Storyboard; tokens: Tokens }> = ({
  scene,
  storyboard,
  tokens,
}) => {
  const s = useS();
  const shared = { scene, tokens, brand: storyboard.brand };

  let body: React.ReactNode;
  switch (scene.type) {
    case "hook":
      body = <HookScene {...shared} />;
      break;
    case "title":
      body = <TitleScene {...shared} />;
      break;
    case "showcase":
      body = <ShowcaseScene {...shared} />;
      break;
    case "features":
      body = <FeaturesScene {...shared} />;
      break;
    case "stats":
      body = <StatsScene {...shared} />;
      break;
    case "cta":
      body = <CtaScene {...shared} />;
      break;
    default:
      body = <TextScene {...shared} />;
  }

  return (
    <AbsoluteFill>
      {body}
      {scene.caption && <SceneCaption text={scene.caption} s={s} />}
    </AbsoluteFill>
  );
};

export const StoryboardRouter: React.FC<{ storyboard: Storyboard; tokens: Tokens }> = ({
  storyboard,
  tokens,
}) => {
  const children: React.ReactNode[] = [];
  storyboard.scenes.forEach((scene, i) => {
    if (i > 0) {
      children.push(
        <TransitionSeries.Transition
          key={`transition-${i}`}
          presentation={transitionFor(i)}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
      );
    }
    children.push(
      <TransitionSeries.Sequence
        key={scene.id}
        durationInFrames={Math.max(1, Math.round(scene.durationInSeconds * FPS))}
      >
        <SceneRenderer scene={scene} storyboard={storyboard} tokens={tokens} />
      </TransitionSeries.Sequence>
    );
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
};
