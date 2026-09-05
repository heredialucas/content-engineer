import { FPS, TRANSITION_FRAMES } from "../../config/config";
import type { Scene } from "./types";

/** duración total en frames del video, descontando los solapes de transición */
export function storyboardDurationFrames(scenes: Scene[]): number {
  const total = scenes.reduce(
    (acc, s) => acc + Math.max(1, Math.round(s.durationInSeconds * FPS)),
    0
  );
  const transitions = Math.max(0, scenes.length - 1) * TRANSITION_FRAMES;
  return Math.max(FPS, total - transitions);
}
