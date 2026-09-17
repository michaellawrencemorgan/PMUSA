import { create } from "zustand";

export type Phase = "loading" | "title" | "play" | "win" | "fail";

export type HudState = {
  phase: Phase;
  progress: number;
  ready: boolean;
  tank: number;
  timeLeft: number;
  flameCount: number;
  nearHydrant: boolean;
};

export const useHud = create<HudState>(() => ({
  phase: "title",
  progress: 0,
  ready: false,
  tank: 0.7,
  timeLeft: 60,
  flameCount: 3,
  nearHydrant: false,
}));

export function patchHud(partial: Partial<HudState>) {
  useHud.setState(partial);
}
