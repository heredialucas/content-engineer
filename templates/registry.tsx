import React from "react";
import type { TemplateId } from "../config/config";
import type { Storyboard } from "../src/storyboard/types";
import { PortfolioShowcase } from "./portfolio-showcase";
import { WebsiteDemo } from "./website-demo";
import { ProblemSolution } from "./problem-solution";
import { CaseStudy } from "./case-study";
import { ProductPromo } from "./product-promo";

const REGISTRY: Record<TemplateId, React.FC<{ storyboard: Storyboard }>> = {
  "portfolio-showcase": PortfolioShowcase,
  "website-demo": WebsiteDemo,
  "problem-solution": ProblemSolution,
  "case-study": CaseStudy,
  "product-promo": ProductPromo,
};

export const TemplateRouter: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  const Template = REGISTRY[storyboard.templateId] ?? PortfolioShowcase;
  return <Template storyboard={storyboard} />;
};
