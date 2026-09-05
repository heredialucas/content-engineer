import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT_BODY } from "../../templates/_shared/fonts";
import { Background } from "../../templates/_shared/Background";
import { Progress } from "../../templates/_shared/Progress";
import { TemplateRouter } from "../../templates/registry";
import type { Storyboard } from "../storyboard/types";

export const ContentEngine: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: storyboard.brand.bg, fontFamily: FONT_BODY }}>
      <Background brand={storyboard.brand} />
      <TemplateRouter storyboard={storyboard} />
      <Progress accent={storyboard.brand.primary} accent2={storyboard.brand.accent} />
    </AbsoluteFill>
  );
};
