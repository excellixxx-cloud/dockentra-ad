import { Easing } from "remotion";

/** Dockentra Brand Book v2.0 — the only colours allowed in a frame. */
export const C = {
  ink: "#0B0D10",
  mint: "#4FDCA9",
  green: "#0F5F4A",
  grey: "#F5F7F8",
  white: "#FFFFFF",
} as const;

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const FONT = {
  display: "Manrope",
  body: "Inter",
  mono: "IBM Plex Mono",
} as const;

/** Appearance: decelerates into place (dockentra-motion skill). */
export const EASE_APPEAR = Easing.bezier(0.22, 1, 0.36, 1);
/** Movement between positions (dockentra-motion skill). */
export const EASE_MOVE = Easing.bezier(0.4, 0, 0.2, 1);
/** Logo fill — brand book: 600 ms, cubic-bezier(.22,1,.36,1), no bounce. */
export const EASE_LOGO = Easing.bezier(0.22, 1, 0.36, 1);

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0→1 progress of [start, start+dur] at time t (seconds), eased. */
export const ramp = (t: number, start: number, dur: number, ease: (x: number) => number = EASE_APPEAR) =>
  ease(clamp((t - start) / dur));

/** Words appear one by one — 60–90 ms apart (dockentra-motion skill). */
export const WORD_STAGGER = 0.075;
