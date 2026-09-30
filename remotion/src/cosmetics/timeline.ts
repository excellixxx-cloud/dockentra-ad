import gsap from "gsap";
import { clamp, EASE_APPEAR, EASE_MOVE, lerp, ramp } from "../brand";
import { Cam } from "./Keyframes";
import { MailerState } from "./Props";
import { P } from "./geo";

export const DURATION_S = 34;

/** Story beats, seconds — follows the brief's scene numbering. */
export const T = {
  // 1 — hook
  wide: 0.5, dollyEnd: 1.7, headline0: 1.0,
  // 2 — three mailers
  m1In: 2.0, m2In: 2.25, m3In: 2.5, kf2: 4.0,
  // 3 — the cap
  toM1: 5.0, flapOpen: 5.0, bottleOut: 5.2, capOpen: 5.9, dropForm: 6.15, stainGrow: 6.3,
  head1: 8.5, capShut: 9.0, tapeWind: 9.3, bagZip: 10.0, m1Close: 12.0,
  // 4 — glass
  toM2: 13.0, rattle1: 13.3, rattle2: 14.3, interrupt: 15.5, land2: 15.62, m2Open: 15.7, crack: 15.75,
  head2: 16.5, bubbleUnroll: 17.0, wrapOn: 17.6, fillerIn: 19.0, m2Close: 19.9, silentShake: 20.3,
  // 5 — storage
  toM3: 21.0, m3Open: 21.0, itemsOut: 21.0, boxIn: 21.8, head3: 23.5, boxSwap: 24.0, bagIn3: 25.0, m3Close: 26.2,
  // 6 — summary
  toScale: 27.8, s1On: 28.0, print: 28.5, labelFly: 28.9, labelOn: 29.2, s1Off: 29.5,
  s2On: 29.75, s2Off: 30.05, s3On: 30.15, s3Off: 30.45, stackDone: 30.9,
  // 7 — final
  toWide: 30.9, dim: 31.0, logo: 31.6,
} as const;

const arc = (a: P, b: P, k: number, h: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) + Math.sin(Math.PI * clamp(k)) * h];
const life = (t: number, a: number, b: number, inDur = 0.35, outDur = 0.3) => ramp(t, a, inDur, EASE_APPEAR) * (1 - ramp(t, b, outDur, EASE_MOVE));
/** Impact pulse: 0 → 1 → 0, for a squash/shadow bump right as something lands. */
const impact = (t: number, land: number, dur = 0.3) => ramp(t, land, 0.05, EASE_APPEAR) * (1 - ramp(t, land + 0.05, dur, EASE_MOVE));

export const SLOT = (i: number): P => [14 + i * 23, 56, 0];
/** The three mailers don't exist on the table until they flop in. */
export const mailerVisible = (idx: 0 | 1 | 2, t: number) => ramp(t, [T.m1In, T.m2In, T.m3In][idx] - 0.05, 0.15, EASE_APPEAR);
/** A sharp white impact-flash at the pattern interrupt — the film's one hard cut. */
export const flashAt = (t: number) => {
  if (t < T.interrupt || t >= T.interrupt + 0.22) return 0;
  if (t < T.interrupt + 0.07) return 1;                                     // a clean, instant white hit
  return 1 - ramp(t, T.interrupt + 0.07, 0.15, EASE_MOVE);
};

/** The camera path: one paused GSAP timeline, seeked every frame. */
export function buildCamera() {
  const cam: Cam = { x: 42, y: 32, z: 0, zoom: 0.92, ax: 540, ay: 1330 };
  const tl = gsap.timeline({ paused: true });
  const go = (at: number, dur: number, to: Partial<Cam>, ease = "sine.inOut") => tl.to(cam, { ...to, duration: dur, ease }, at);
  go(T.wide, 1.2, { x: 42, y: 32, z: 0, zoom: 1.25, ax: 540, ay: 1115 }, "power2.out");   // fast dolly-in onto the table
  go(2.0, 0.7, { x: 41, y: 62, z: 0, zoom: 1.75, ax: 540, ay: 1170 });                     // to the three mailers
  go(T.toM1, 0.7, { x: 23, y: 66, z: 1, zoom: 2.1, ax: 540, ay: 1080 });                   // to mailer 1 / the cap
  go(T.toM2, 0.7, { x: 40, y: 69, z: 1.8, zoom: 3.0, ax: 520, ay: 1060 });                 // to mailer 2 / glass
  go(T.toM3, 0.7, { x: 63, y: 65, z: 3, zoom: 2.0, ax: 540, ay: 1080 });                   // to mailer 3 / storage
  go(T.toScale, 0.7, { x: 42, y: 22, z: 2, zoom: 1.5, ax: 540, ay: 1040 });                // to the scale / summary
  go(T.toWide, 0.6, { x: 42, y: 32, z: 0, zoom: 1.27, ax: 540, ay: 1115 });                // pull back for the final card
  return { tl, cam };
}
/** Continuous 2–3 % zoom breathing for the current scene's hold — a plain sine,
 *  independent of the GSAP timeline, so it never collides with a tween boundary. */
export function breathe(t: number) {
  const bounds = [0, 2.0, T.toM1, T.toM2, T.toM3, T.toScale, T.toWide, DURATION_S];
  let i = 0;
  while (i < bounds.length - 2 && t >= bounds[i + 1]) i++;
  const span = Math.max(0.6, bounds[i + 1] - bounds[i]);
  return 1 + 0.015 * Math.sin(((t - bounds[i]) / span) * Math.PI * 1.5);
}

/** Pattern-interrupt camera kick: a 6 px shake for 100 ms at the drop. */
export function shakeAt(t: number) {
  const k = t >= T.interrupt && t < T.interrupt + 0.1 ? 1 - (t - T.interrupt) / 0.1 : 0;
  if (k <= 0) return { dx: 0, dy: 0 };
  const n = (f: number) => Math.sin(t * f * 97.3) * Math.cos(t * f * 53.1);
  return { dx: 6 * k * n(1.0), dy: 6 * k * n(1.3) };
}

/* ------------------------------------------------------------ mailer 1: the cap */
export function mailer1At(t: number): MailerState {
  const spawn: P = [SLOT(0)[0], SLOT(0)[1] - 14, 7];
  const rest = SLOT(0);
  let p: P = rest;
  if (t < T.m1In) p = spawn;
  else if (t < T.m1In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m1In) / 0.35)), 4);
  const squash = impact(t, T.m1In + 0.35, 0.3);
  const open = ramp(t, T.flapOpen, 0.4, EASE_MOVE) * (1 - ramp(t, T.m1Close, 0.3, EASE_MOVE));
  const stain = ramp(t, T.stainGrow, 0.8, EASE_APPEAR) * (1 - ramp(t, T.m1Close, 0.3, EASE_MOVE));
  // toward the summary: mailer 1 lifts off the work slot and rides to the scale, then to the stack
  if (t >= T.toScale) {
    const scaleP: P = [30, 13, 1.9];
    const stackP: P = [60, 38, 0];
    if (t < T.s1On) p = arc(rest, scaleP, EASE_MOVE(clamp((t - T.toScale) / 0.2)), 3);
    else if (t < T.s1Off) p = scaleP;
    else if (t < T.s1Off + 0.35) p = arc(scaleP, stackP, EASE_MOVE(clamp((t - T.s1Off) / 0.35)), 4);
    else p = stackP;
  }
  return { x: p[0], y: p[1], z: p[2], num: "1", open, stain, squash };
}

/* ------------------------------------------------------------ mailer 2: glass */
export function mailer2At(t: number): MailerState {
  const spawn: P = [SLOT(1)[0], SLOT(1)[1] - 14, 7];
  const rest = SLOT(1);
  let p: P = rest;
  let lift = 0;
  if (t < T.m2In) p = spawn;
  else if (t < T.m2In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m2In) / 0.35)), 4);
  // two little rattles (held and shaken)
  for (const rt of [T.rattle1, T.rattle2]) {
    if (t >= rt && t < rt + 0.25) lift += 0.5 * Math.sin((t - rt) * 40) * Math.exp(-(t - rt) * 6);
  }
  // pattern interrupt: slips from the hands, falls ~10 cm, lands hard
  if (t >= T.interrupt - 0.1 && t < T.land2) lift += lerp(0, 3, EASE_APPEAR(clamp((t - (T.interrupt - 0.1)) / 0.1)));
  const squash = impact(t, T.land2, 0.3);
  const open = ramp(t, T.m2Open, 0.4, EASE_MOVE) * (1 - ramp(t, T.m2Close, 0.3, EASE_MOVE));
  if (t >= T.toScale) {
    const stackP: P = [60, 38, 0.9];
    if (t < T.s2On) p = arc(rest, [55, 34, 3], EASE_MOVE(clamp((t - T.toScale) / 0.25)), 2);
    else if (t < T.s2Off + 0.02) p = [32, 15, 1.9];
    else p = arc([32, 15, 1.9], stackP, EASE_MOVE(clamp((t - T.s2Off) / 0.3)), 3);
  }
  return { x: p[0], y: p[1], z: p[2], num: t >= T.toScale ? undefined : "2", open, lift, squash };
}

/* ------------------------------------------------------------ mailer 3: storage */
export function mailer3At(t: number): MailerState {
  const spawn: P = [SLOT(2)[0], SLOT(2)[1] - 14, 7];
  const rest = SLOT(2);
  let p: P = rest;
  if (t < T.m3In) p = spawn;
  else if (t < T.m3In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m3In) / 0.35)), 4);
  const squash = impact(t, T.m3In + 0.35, 0.3);
  const open = ramp(t, T.m3Open, 0.35, EASE_MOVE) * (1 - ramp(t, T.m3Close, 0.3, EASE_MOVE));
  if (t >= T.toScale) {
    const stackP: P = [60, 38, 1.8];
    if (t < T.s3On) p = arc(rest, [32, 15, 3], EASE_MOVE(clamp((t - T.toScale) / 0.2)), 2);
    else if (t < T.s3Off + 0.02) p = [32, 15, 1.9];
    else p = arc([32, 15, 1.9], stackP, EASE_MOVE(clamp((t - T.s3Off) / 0.3)), 3);
  }
  return { x: p[0], y: p[1], z: p[2], num: t >= T.toScale ? undefined : "3", open, squash };
}

/* ------------------------------------------------------------ A. lotion bottle */
export function bottleAt(t: number) {
  if (t < T.bottleOut || t >= T.m1Close) return null;
  const inside: P = [SLOT(0)[0] + 4, SLOT(0)[1] + 2, 3];
  const lying: P = [12, 62, 0];
  const k = clamp((t - T.bottleOut) / 0.5);
  const p = k < 1 ? arc(inside, lying, EASE_MOVE(k), 4) : lying;
  const capGap = ramp(t, T.capOpen, 0.4, EASE_MOVE) * (1 - ramp(t, T.capShut, 0.2, EASE_MOVE));
  const drop = ramp(t, T.dropForm, 0.4, EASE_APPEAR) * (1 - ramp(t, T.capShut, 0.2, EASE_MOVE));
  const taped = ramp(t, T.tapeWind, 0.6, EASE_MOVE);
  const bagged = ramp(t, T.bagZip, 0.4, EASE_MOVE);
  const goingIn = t >= T.m1Close - 1 ? clamp((t - (T.m1Close - 1)) / 1) : 0;
  const pFinal = goingIn > 0 ? arc(lying, inside, EASE_MOVE(goingIn), 3) : p;
  const opacity = ramp(t, T.bottleOut, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m1Close - 0.15, 0.15, EASE_MOVE));
  return { p: pFinal, capGap, drop, taped, bagged, opacity };
}

/* ------------------------------------------------------------ B. amber glass jar */
export function jarAt(t: number) {
  if (t < T.m2Open || t >= T.m2Close) return null;
  const inside: P = [SLOT(1)[0] + 4, SLOT(1)[1] + 2, 3];
  const out: P = [40, 68, 0];
  const k = clamp((t - T.m2Open) / 0.4);
  const p = k < 1 ? arc(inside, out, EASE_MOVE(k), 3) : out;
  const crack = ramp(t, T.crack, 0.4, EASE_APPEAR);
  const wrap = ramp(t, T.wrapOn, 0.9, EASE_MOVE);
  const goingIn = t >= T.m2Close - 0.5 ? clamp((t - (T.m2Close - 0.5)) / 0.5) : 0;
  const pFinal = goingIn > 0 ? arc(out, inside, EASE_MOVE(goingIn), 3) : p;
  const opacity = ramp(t, T.m2Open, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m2Close - 0.15, 0.15, EASE_MOVE));
  return { p: pFinal, crack, wrap, opacity };
}

/* ------------------------------------------------------------ C. lipstick + balm */
export function lipBalmAt(t: number) {
  if (t < T.itemsOut || t >= T.m3Close) return null;
  const inside: P = [SLOT(2)[0] + 4, SLOT(2)[1] + 2, 3];
  const lipOut: P = [64, 74, 0], balmOut: P = [72, 75, 0];
  const k = clamp((t - T.itemsOut) / 0.5);
  const lip = k < 1 ? arc(inside, lipOut, EASE_MOVE(k), 3) : lipOut;
  const balm = k < 1 ? arc(inside, balmOut, EASE_MOVE(k), 3) : balmOut;
  const ruined = 1 - ramp(t, T.boxSwap, 0.6, EASE_MOVE);   // melted/cratered → fixed once the box is swapped for A2
  const goingIn = t >= T.m3Close - 0.6 ? clamp((t - (T.m3Close - 0.6)) / 0.6) : 0;
  const lipFinal = goingIn > 0 ? arc(lipOut, inside, EASE_MOVE(goingIn), 3) : lip;
  const balmFinal = goingIn > 0 ? arc(balmOut, inside, EASE_MOVE(goingIn), 3) : balm;
  const opacity = ramp(t, T.itemsOut, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m3Close - 0.15, 0.15, EASE_MOVE));
  return { lip: lipFinal, balm: balmFinal, melted: ruined, crater: ruined, bagged: ramp(t, T.bagIn3, 0.4, EASE_MOVE), opacity };
}

/* ------------------------------------------------------------ stock box: A6 (hot) ↔ A2 (cool) */
export function boxAt(t: number) {
  if (t < T.boxIn || t >= T.m3Close - 0.3) return null;
  const p: P = [67, 54, 0];
  const inOpacity = ramp(t, T.boxIn, 0.2, EASE_APPEAR) * (1 - ramp(t, T.m3Close - 0.5, 0.3, EASE_MOVE));
  const heatA6 = ramp(t, T.boxIn, 0.3, EASE_APPEAR) * (1 - ramp(t, T.boxSwap, 0.3, EASE_MOVE));
  const heatA2 = ramp(t, T.boxSwap + 0.3, 0.3, EASE_APPEAR);
  return { p, opacity: inOpacity, heat: t < T.boxSwap + 0.15 ? heatA6 : heatA2, cell: t < T.boxSwap + 0.15 ? "A6" : "A2" };
}

/* ------------------------------------------------------------ digital scale + label printer */
export function scaleAt(t: number) {
  const onA = t >= T.s1On - 0.2 && t < T.s1Off, onB = t >= T.s2On - 0.05 && t < T.s2Off, onC = t >= T.s3On - 0.05 && t < T.s3Off;
  if (onA) return { reading: (ramp(t, T.s1On - 0.2, 0.25, EASE_MOVE) * 0.312).toFixed(3), flash: ramp(t, T.s1On, 0.15, EASE_APPEAR) };
  if (onB) return { reading: (ramp(t, T.s2On - 0.05, 0.15, EASE_MOVE) * 0.205).toFixed(3), flash: ramp(t, T.s2On, 0.1, EASE_APPEAR) };
  if (onC) return { reading: (ramp(t, T.s3On - 0.05, 0.15, EASE_MOVE) * 0.148).toFixed(3), flash: ramp(t, T.s3On, 0.1, EASE_APPEAR) };
  return { reading: "0.000", flash: 0 };
}
export function printerAt(t: number) {
  const out = t >= T.print && t < T.print + 0.5 ? ramp(t, T.print, 0.45, EASE_MOVE) : t >= T.print + 0.5 && t < T.labelFly ? 1 : 0;
  const flying = t >= T.labelFly && t < T.labelOn;
  return { out, flying, k: flying ? EASE_MOVE(clamp((t - T.labelFly) / (T.labelOn - T.labelFly))) : 0 };
}

export type HandDesc = { p: P; rot: number; curl?: number; mirror?: boolean; thumbOut?: number; k?: number; op: number };
const FADE = 0.18;
/** A hand fades in and out of its action window — it never pops. */
const win = (t: number, a: number, b: number) => ramp(t, a, FADE, EASE_APPEAR) * (1 - ramp(t, b, FADE, EASE_MOVE));
/** Hands appear only during their action window, fading at each edge. */
export function handsAt(t: number): HandDesc[] {
  const hs: HandDesc[] = [];
  const push = (a: number, b: number, p: P, rest: Omit<HandDesc, "p" | "op">) => {
    const op = win(t, a, b);
    if (op > 0.01) hs.push({ p, op, ...rest });
  };
  // scene 3 — opening mailer 1, then steadying the bottle while the stain spreads
  // hand steadies the bottle, then sweeps across the mailer to press the spreading stain (big, readable motion)
  const sweep = Math.sin(Math.PI * clamp((t - 6.0) / 1.3));
  push(T.flapOpen - 0.1, T.stainGrow + 1.05, [15 + 7 * sweep, 60 + 3 * sweep, 1 + 0.4 * sweep], { rot: 25 - 10 * sweep, curl: 0.32 + 0.25 * sweep, mirror: true, thumbOut: 0.2 });
  push(T.capShut - 0.3, T.capShut + 0.3, [24, 61, 2], { rot: -120, curl: 0.6, thumbOut: 0.2 });
  push(T.tapeWind - 0.1, T.tapeWind + 0.7, [22, 60, 2], { rot: -100, curl: 0.45, thumbOut: 0.4 });
  push(T.bagZip - 0.1, T.bagZip + 0.5, [16, 62, 1.5], { rot: 160, curl: 0.4, mirror: true, thumbOut: 0.4 });
  // scene 4 — mailer 2: rattle grip, opening, wrapping
  push(T.rattle1 - 0.15, T.rattle1 + 0.4, [37, 60, 3], { rot: -100, curl: 0.55, thumbOut: 0.3 });
  push(T.rattle2 - 0.15, T.rattle2 + 0.4, [37, 60, 3], { rot: -100, curl: 0.55, thumbOut: 0.3 });
  push(T.m2Open - 0.1, T.m2Open + 0.5, [42, 67, 4.5], { rot: -125, curl: 0.55, thumbOut: 0.4 });
  push(T.bubbleUnroll - 0.1, T.wrapOn + 0.4, [37, 62, 4], { rot: -95, curl: 0.4, thumbOut: 0.5 });
  push(T.fillerIn - 0.1, T.fillerIn + 0.6, [40, 64, 1.5], { rot: -70, curl: 0.5, mirror: true, thumbOut: 0.3 });
  // scene 5 — storage
  push(T.itemsOut - 0.1, T.itemsOut + 0.6, [58, 60, 1], { rot: -80, curl: 0.4, thumbOut: 0.4 });
  push(T.boxIn - 0.15, T.boxIn + 0.5, [70, 55.5, 7.8], { rot: 150, curl: 0.5, mirror: true, thumbOut: 0.3 });
  push(T.bagIn3 - 0.1, T.bagIn3 + 0.5, [56, 68, 1.5], { rot: -80, curl: 0.4, thumbOut: 0.4 });
  // scene 6 — label onto the mailer
  push(T.print - 0.1, T.print + 0.5, [26, 5, 7.5], { rot: -70, curl: 0.3, thumbOut: 0.6, k: 0.85 });
  push(T.labelOn - 0.1, T.labelOn + 0.4, [30, 13, 3], { rot: -60, curl: 0.3, thumbOut: 0.6, k: 0.9 });
  return hs;
}
