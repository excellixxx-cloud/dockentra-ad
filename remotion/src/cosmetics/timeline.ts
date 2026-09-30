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

/** Landing bounce: a quick hop that dies out — weight, not jelly. */
const hop = (t: number, land: number, amp = 0.8) => {
  if (t < land || t > land + 0.7) return 0;
  const u = t - land;
  return amp * Math.abs(Math.sin((Math.PI * u) / 0.2)) * Math.exp(-u * 7);
};
/** Accelerate out of rest (for things that leave). */
const accel = (k: number) => k * k;

/* ------------------------------------------------------------ mailer 1: the cap */
const SCALE_P: P = [30, 13, 1.9];
const STACK = (i: number): P => [60, 38, i * 1.1];
const WAIT = (i: number): P => [30, 38, i * 1.1];

export function mailer1At(t: number): MailerState {
  const spawn: P = [SLOT(0)[0], SLOT(0)[1] - 14, 7];
  const rest = SLOT(0);
  let p: P = rest;
  if (t < T.m1In) p = spawn;
  else if (t < T.m1In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m1In) / 0.35)), 4);
  let squash = impact(t, T.m1In + 0.35, 0.3);
  const open = ramp(t, T.flapOpen, 0.4, EASE_MOVE) * (1 - ramp(t, T.m1Close, 0.3, EASE_MOVE));
  const stain = ramp(t, T.stainGrow, 1.2, EASE_APPEAR) * (1 - ramp(t, T.m1Close, 0.3, EASE_MOVE));
  let lift = hop(t, T.m1In + 0.35, 0.5);
  if (t >= T.toScale) {
    if (t < T.s1On) p = arc(rest, SCALE_P, EASE_MOVE(clamp((t - T.toScale) / 0.2)), 3);
    else if (t < T.s1Off) p = SCALE_P;
    else if (t < T.s1Off + 0.35) p = arc(SCALE_P, STACK(0), EASE_MOVE(clamp((t - T.s1Off) / 0.35)), 4);
    else p = STACK(0);
    squash = Math.max(impact(t, T.s1On, 0.25), 0.5 * impact(t, T.labelOn, 0.2), impact(t, T.s1Off + 0.35, 0.25));
    lift = hop(t, T.s1On, 0.4) + hop(t, T.s1Off + 0.35, 0.4);
  }
  return { x: p[0], y: p[1], z: p[2], num: "1", open, stain, squash, lift };
}

/* ------------------------------------------------------------ mailer 2: glass */
export function mailer2At(t: number): MailerState {
  const spawn: P = [SLOT(1)[0], SLOT(1)[1] - 14, 7];
  const rest = SLOT(1);
  let p: P = rest;
  let lift = 0, rot = 0;
  if (t < T.m2In) p = spawn;
  else if (t < T.m2In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m2In) / 0.35)), 4);
  lift += hop(t, T.m2In + 0.35, 0.5);
  // the mailer shakes itself: twice with the loose jar inside, once more (silent) when it's packed
  for (const rt of [T.rattle1, T.rattle2, T.silentShake]) {
    if (t >= rt && t < rt + 0.45) {
      const u = t - rt;
      lift += 0.7 * Math.abs(Math.sin(u * 28)) * Math.exp(-u * 4);
      rot += 3 * Math.sin(u * 28) * Math.exp(-u * 4);
    }
  }
  // pattern interrupt: it lifts, slips, falls ~10 cm and lands hard
  if (t >= T.interrupt - 0.35 && t < T.interrupt) lift += 3 * EASE_MOVE(clamp((t - (T.interrupt - 0.35)) / 0.25));
  if (t >= T.interrupt && t < T.land2) lift += 3 * (1 - ((t - T.interrupt) / (T.land2 - T.interrupt)) ** 2);
  lift += hop(t, T.land2, 0.6);
  let squash = Math.max(impact(t, T.m2In + 0.35, 0.3), impact(t, T.land2, 0.35));
  const open = ramp(t, T.m2Open, 0.4, EASE_MOVE) * (1 - ramp(t, T.m2Close, 0.3, EASE_MOVE));
  if (t >= T.toScale) {
    lift = 0; rot = 0;
    const w = WAIT(1);
    if (t < T.toScale + 0.3) p = arc(rest, w, EASE_MOVE(clamp((t - T.toScale) / 0.3)), 3);
    else if (t < T.s2On - 0.2) p = w;
    else if (t < T.s2On) p = arc(w, SCALE_P, EASE_MOVE(clamp((t - (T.s2On - 0.2)) / 0.2)), 3);
    else if (t < T.s2Off) p = SCALE_P;
    else p = arc(SCALE_P, STACK(1), EASE_MOVE(clamp((t - T.s2Off) / 0.3)), 3);
    squash = Math.max(impact(t, T.toScale + 0.3, 0.25), impact(t, T.s2On, 0.25), impact(t, T.s2Off + 0.3, 0.25));
    lift = hop(t, T.s2On, 0.35) + hop(t, T.s2Off + 0.3, 0.35);
  }
  return { x: p[0], y: p[1], z: p[2], num: t >= T.toScale ? undefined : "2", open, lift, squash, rot };
}

/* ------------------------------------------------------------ mailer 3: storage */
export function mailer3At(t: number): MailerState {
  const spawn: P = [SLOT(2)[0], SLOT(2)[1] - 14, 7];
  const rest = SLOT(2);
  let p: P = rest;
  if (t < T.m3In) p = spawn;
  else if (t < T.m3In + 0.35) p = arc(spawn, rest, EASE_MOVE(clamp((t - T.m3In) / 0.35)), 4);
  let squash = impact(t, T.m3In + 0.35, 0.3);
  let lift = hop(t, T.m3In + 0.35, 0.5);
  const open = ramp(t, T.m3Open, 0.35, EASE_MOVE) * (1 - ramp(t, T.m3Close, 0.3, EASE_MOVE));
  if (t >= T.toScale) {
    const w = WAIT(0);
    if (t < T.toScale + 0.35) p = arc(rest, w, EASE_MOVE(clamp((t - T.toScale) / 0.35)), 3);
    else if (t < T.s3On - 0.2) p = w;
    else if (t < T.s3On) p = arc(w, SCALE_P, EASE_MOVE(clamp((t - (T.s3On - 0.2)) / 0.2)), 3);
    else if (t < T.s3Off) p = SCALE_P;
    else p = arc(SCALE_P, STACK(2), EASE_MOVE(clamp((t - T.s3Off) / 0.3)), 3);
    squash = Math.max(impact(t, T.toScale + 0.35, 0.25), impact(t, T.s3On, 0.25), impact(t, T.s3Off + 0.3, 0.25));
    lift = hop(t, T.s3On, 0.35) + hop(t, T.s3Off + 0.3, 0.35);
  }
  return { x: p[0], y: p[1], z: p[2], num: t >= T.toScale ? undefined : "3", open, squash, lift };
}

/* ------------------------------------------------------------ A. lotion bottle */
/** Scene 3 beats that replace the hands: tape run, zip bag, into the clean mailer. */
export const B = {
  land: T.bottleOut + 0.5,                       // bottle has tipped onto its side
  tapeTo: T.tapeWind + 0.3,                      // tape tip reaches the cap seam
  tapeCut: T.tapeWind + 0.6,                     // wound, cut at the blade
  bagIn: T.bagZip, bagOpen: T.bagZip + 0.3, hopIn: T.bagZip + 0.5, inBag: T.bagZip + 0.95, zipEnd: T.bagZip + 1.35,
  toMailer: T.m1Close - 0.6,
};
const LYING: P = [12, 62, 0];
const IN_BAG: P = [12, 68, 0];
export function bottleAt(t: number) {
  if (t < T.bottleOut || t >= T.m1Close) return null;
  const inside: P = [SLOT(0)[0] + 4, SLOT(0)[1] + 2, 3];
  // rises out of mailer 1 and tips over onto its side
  const k = clamp((t - T.bottleOut) / 0.5);
  let p: P = k < 1 ? arc(inside, LYING, EASE_MOVE(k), 4) : LYING;
  let rot = -55 * (1 - EASE_MOVE(k)) + 6 * Math.sin((t - B.land) * 22) * Math.exp(-(t - B.land) * 6) * (t > B.land ? 1 : 0);
  // after landing it rocks on its side a little, dying out
  const rock = t > B.land ? 0.45 * Math.sin((2 * Math.PI * (t - B.land)) / 1.1) * Math.exp(-(t - B.land) * 0.8) : 0;
  let z = hop(t, B.land, 0.6) + hop(t, T.capShut + 0.05, 0.3);
  if (t >= B.hopIn && t < B.inBag) p = arc(LYING, IN_BAG, EASE_MOVE(clamp((t - B.hopIn) / (B.inBag - B.hopIn))), 3);
  else if (t >= B.inBag) p = IN_BAG;
  z += hop(t, B.inBag, 0.35);
  if (t >= B.toMailer) p = arc(IN_BAG, inside, EASE_MOVE(clamp((t - B.toMailer) / 0.5)), 3);
  if (t >= B.hopIn) rot = 0;
  const capGap = ramp(t, T.capOpen, 0.35, EASE_MOVE) * (1 - ramp(t, T.capShut, 0.1, EASE_MOVE));
  const drop = ramp(t, T.dropForm, 1.1, EASE_APPEAR) * (1 - ramp(t, T.capShut, 0.15, EASE_MOVE));
  const taped = ramp(t, B.tapeTo, B.tapeCut - B.tapeTo, EASE_MOVE);
  const opacity = ramp(t, T.bottleOut, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m1Close - 0.15, 0.15, EASE_MOVE));
  // zip bag travels in from the left, opens, the bottle drops in, it zips closed, then rides along into the mailer
  const bagSlide = EASE_MOVE(clamp((t - B.bagIn) / 0.3));
  const bagShow = t >= B.bagIn;
  const bagOpen = ramp(t, B.bagOpen, 0.2, EASE_MOVE) * (1 - ramp(t, B.inBag - 0.05, 0.12, EASE_MOVE));
  const zip = ramp(t, B.inBag, B.zipEnd - B.inBag, EASE_MOVE);
  const bagAt: P = t >= B.toMailer ? [p[0], p[1], p[2]] : [IN_BAG[0] - 18 * (1 - bagSlide), IN_BAG[1], 0];
  // tape: tip runs from the blade to the cap seam, then the strip winds on and is cut
  const blade: P = [23.2, 10, 2.6];
  const seam: P = [LYING[0] + 12.7, LYING[1] + rock, 1.7 + 1.36];
  const tapeK = EASE_MOVE(clamp((t - T.tapeWind) / (B.tapeTo - T.tapeWind)));
  const tape = t >= T.tapeWind && t < B.tapeCut + 0.1
    ? { from: blade, to: arc(blade, seam, tapeK, 2.5) as P, op: 1 - ramp(t, B.tapeCut, 0.1, EASE_MOVE) }
    : null;
  return {
    p: [p[0], p[1] + (t < B.hopIn ? rock : 0), p[2] + z] as P, rot, capGap, drop, taped, opacity,
    bag: bagShow ? { at: bagAt, open: bagOpen, zip, op: bagSlide } : null, tape,
  };
}

/* ------------------------------------------------------------ B. amber glass jar */
export const G = {
  land: T.m2Open + 0.4,
  sheetFrom: T.bubbleUnroll + 0.35, sheetTo: T.wrapOn,
  wrapEnd: T.wrapOn + 0.9, tapeEnd: T.wrapOn + 1.2,
  toMailer: T.fillerIn - 0.1, inMailer: T.fillerIn + 0.35,
  ball: (i: number) => T.fillerIn + 0.35 + i * 0.12,
};
const JAR_OUT: P = [40, 68, 0];
const JAR_IN: P = [SLOT(1)[0] + 4, SLOT(1)[1] + 2, 1.1];
export function jarAt(t: number) {
  if (t < T.m2Open || t >= T.m2Close + 0.3) return null;
  const inside: P = [SLOT(1)[0] + 4, SLOT(1)[1] + 2, 3];
  const k = clamp((t - T.m2Open) / 0.4);
  let p: P = k < 1 ? arc(inside, JAR_OUT, EASE_MOVE(k), 3) : JAR_OUT;
  if (t >= G.toMailer) p = arc(JAR_OUT, JAR_IN, EASE_MOVE(clamp((t - G.toMailer) / (G.inMailer - G.toMailer))), 4);
  const z = hop(t, G.land, 0.5) + hop(t, G.inMailer, 0.3);
  const crack = ramp(t, T.crack, 0.4, EASE_APPEAR);
  const wrap = ramp(t, T.wrapOn, G.wrapEnd - T.wrapOn, EASE_MOVE);
  const taped = ramp(t, G.wrapEnd, G.tapeEnd - G.wrapEnd, EASE_MOVE);
  const opacity = ramp(t, T.m2Open, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m2Close, 0.25, EASE_MOVE));
  // a sheet of bubble wrap peels off the roll and flies to the jar
  const sk = clamp((t - G.sheetFrom) / (G.sheetTo - G.sheetFrom));
  const sheet = t >= G.sheetFrom && t < G.sheetTo + 0.05 ? { c: arc([39, 9.5, 3], [JAR_OUT[0], JAR_OUT[1], 2.4], EASE_MOVE(sk), 4), s: 1 - 0.55 * sk } : null;
  return { p: [p[0], p[1], p[2] + z] as P, crack, wrap, taped, opacity, sheet };
}
/** Crumpled paper balls drop out of the filler box beside the jar in the mailer, each landing with a squash. */
export function ballsAt(t: number) {
  const from: P = [54, 19, 9];
  const spots: P[] = [[JAR_IN[0] - 3.2, JAR_IN[1] - 1.5, 1.1], [JAR_IN[0] + 3.4, JAR_IN[1] - 1.2, 1.1], [JAR_IN[0] - 2.8, JAR_IN[1] + 3.2, 1.1], [JAR_IN[0] + 3.2, JAR_IN[1] + 3.4, 1.1]];
  const op = 1 - ramp(t, T.m2Close, 0.25, EASE_MOVE);
  if (t >= T.m2Close + 0.3) return [];
  return spots.flatMap((to, i) => {
    const a = G.ball(i);
    if (t < a) return [];
    const k = clamp((t - a) / 0.3);
    const c = k < 1 ? arc([from[0] + i * 1.2, from[1], from[2]], to, k * k * 0.4 + EASE_MOVE(k) * 0.6, 5) : to;
    return [{ c: [c[0], c[1], c[2] + hop(t, a + 0.3, 0.35)] as P, squash: impact(t, a + 0.3, 0.2), seed: i * 5 + 3, op }];
  });
}

/* ------------------------------------------------------------ C. lipstick + balm */
export function lipBalmAt(t: number) {
  if (t < T.itemsOut || t >= T.m3Close) return null;
  const inside: P = [SLOT(2)[0] + 4, SLOT(2)[1] + 2, 3];
  const lipOut: P = [64, 74, 0], balmOut: P = [72, 75, 0];
  const lipBag: P = [64, 79, 0], balmBag: P = [72, 80, 0];
  const k = clamp((t - T.itemsOut) / 0.5);
  let lip = k < 1 ? arc(inside, lipOut, EASE_MOVE(k), 3) : lipOut;
  let balm = k < 1 ? arc(inside, balmOut, EASE_MOVE(k), 3) : balmOut;
  const hopIn = T.bagIn3 + 0.3, inBag = T.bagIn3 + 0.6, zipEnd = T.bagIn3 + 0.9, toMailer = T.m3Close - 0.35;
  if (t >= hopIn) {
    const kk = EASE_MOVE(clamp((t - hopIn) / (inBag - hopIn)));
    lip = arc(lipOut, lipBag, kk, 2.5);
    balm = arc(balmOut, balmBag, kk, 2.5);
  }
  if (t >= toMailer) {
    const kk = EASE_MOVE(clamp((t - toMailer) / 0.35));
    lip = arc(lipBag, inside, kk, 3);
    balm = arc(balmBag, [inside[0] + 3, inside[1], inside[2]], kk, 3);
  }
  const z = hop(t, T.itemsOut + 0.5, 0.45) + hop(t, inBag, 0.3);
  lip = [lip[0], lip[1], lip[2] + z];
  balm = [balm[0], balm[1], balm[2] + z];
  const ruined = 1 - ramp(t, T.boxSwap, 0.6, EASE_MOVE);   // melted/cratered → fixed once the box is swapped for A2
  const opacity = ramp(t, T.itemsOut, 0.15, EASE_APPEAR) * (1 - ramp(t, T.m3Close - 0.15, 0.15, EASE_MOVE));
  const bagSlide = EASE_MOVE(clamp((t - T.bagIn3) / 0.3));
  const bag = t >= T.bagIn3 ? {
    b: { x0: 61.5 - 16 * (1 - bagSlide) + (t >= toMailer ? lip[0] - lipBag[0] : 0), y0: 76.5 + (t >= toMailer ? lip[1] - lipBag[1] : 0), z0: t >= toMailer ? lip[2] : 0.02 },
    open: ramp(t, T.bagIn3 + 0.2, 0.15, EASE_MOVE) * (1 - ramp(t, inBag - 0.05, 0.1, EASE_MOVE)),
    zip: ramp(t, inBag, zipEnd - inBag, EASE_MOVE), op: bagSlide,
  } : null;
  return { lip, balm, melted: ruined, crater: ruined, opacity, bag };
}

/* ------------------------------------------------------------ stock boxes: A6 (hot) slides away, A2 (cool) takes its place */
export function boxesAt(t: number) {
  const home: P = [67, 54, 0];
  const out: { p: P; cell: string; heat: number; opacity: number; squash: number }[] = [];
  const endFade = 1 - ramp(t, T.m3Close - 0.5, 0.3, EASE_MOVE);
  const a6In = T.boxIn - 0.3;
  if (t >= a6In && t < T.boxSwap + 0.45) {
    const kin = EASE_MOVE(clamp((t - a6In) / 0.3));           // decelerates in from the right
    const kout = accel(clamp((t - T.boxSwap) / 0.4));          // accelerates away to the right
    const x = home[0] + 16 * (1 - kin) + 20 * kout;
    out.push({ p: [x, home[1], hop(t, a6In + 0.3, 0.35)], cell: "A6", heat: ramp(t, T.boxIn - 0.08, 0.25, EASE_APPEAR), opacity: ramp(t, a6In, 0.12, EASE_APPEAR) * (1 - ramp(t, T.boxSwap + 0.3, 0.12, EASE_MOVE)), squash: impact(t, a6In + 0.3, 0.2) });
  }
  const a2In = T.boxSwap + 0.3;
  if (t >= a2In && t < T.m3Close - 0.2) {
    const kin = EASE_MOVE(clamp((t - a2In) / 0.35));           // slides in from behind and settles
    out.push({ p: [home[0], home[1] - 16 * (1 - kin), hop(t, a2In + 0.35, 0.35)], cell: "A2", heat: 0.38, opacity: ramp(t, a2In, 0.12, EASE_APPEAR) * endFade, squash: impact(t, a2In + 0.35, 0.2) });
  }
  return out;
}

/* ------------------------------------------------------------ digital scale + label printer + label */
export function scaleAt(t: number) {
  const onA = t >= T.s1On - 0.2 && t < T.s1Off, onB = t >= T.s2On - 0.05 && t < T.s2Off, onC = t >= T.s3On - 0.05 && t < T.s3Off;
  if (onA) return { reading: (ramp(t, T.s1On - 0.2, 0.25, EASE_MOVE) * 0.312).toFixed(3), flash: ramp(t, T.s1On, 0.15, EASE_APPEAR) };
  if (onB) return { reading: (ramp(t, T.s2On - 0.05, 0.15, EASE_MOVE) * 0.205).toFixed(3), flash: ramp(t, T.s2On, 0.1, EASE_APPEAR) };
  if (onC) return { reading: (ramp(t, T.s3On - 0.05, 0.15, EASE_MOVE) * 0.148).toFixed(3), flash: ramp(t, T.s3On, 0.1, EASE_APPEAR) };
  return { reading: "0.000", flash: 0 };
}
export function printerAt(t: number) {
  const out = t >= T.print && t < T.labelFly ? ramp(t, T.print, 0.4, EASE_MOVE) : 0;
  return { out };
}
/** The label: leaves the slot, flies to the mailer on the scale, presses down, a sheen smooths it; then rides with mailer 1. */
export function labelAt(t: number, m1: MailerState) {
  if (t < T.labelFly) return null;
  const onMailer = (m: MailerState): P => [m.x + 12.5, m.y + 7, (m.z ?? 0) + (m.lift ?? 0) + 1.1 * (1 - 0.35 * (m.squash ?? 0)) + 0.03];
  const from: P = [28, 4.5, 11.2];
  if (t < T.labelOn) {
    const k = EASE_MOVE(clamp((t - T.labelFly) / (T.labelOn - T.labelFly)));
    return { c: arc(from, onMailer(m1), k, 3), tilt: 0.6 * (1 - k), sheen: 0, flying: true };
  }
  return { c: onMailer(m1), tilt: 0, sheen: clamp((t - T.labelOn - 0.08) / 0.25), flying: false };
}
