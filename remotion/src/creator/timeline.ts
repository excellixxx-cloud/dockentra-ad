import gsap from "gsap";

/** 20 creators: 5 columns × 4 rows. Index = row * 5 + col. */
export const COLS = 5;
export const ROWS = 4;
export const N = COLS * ROWS;
export const home = (i: number) => ({ x: 160 + (i % COLS) * 190, y: 660 + Math.floor(i / COLS) * 155 });
export const CIRCLE = 112;

/** Story beats (seconds). */
export const T = {
  appear: 0.3,       // grid rises in a wave
  confirm: 4.6,      // Monday: every creator lights an outline — waiting
  toWed: 10.3,       // calendar slides Mon → Wed
  jerk: 17.0,        // PATTERN INTERRUPT: calendar jumps to Fri, 14 creators go grey
  heap: 24.4,        // grey creators slide into one pile
  plan: 30.2,        // they return; calendar back to Mon
  wave: 31.0,        // all 20 light up, left → right
  wipe: 34.75,       // end card opens from the grid
  logo: 36.5,
} as const;

/** Creators who get a sample: four by Wednesday (one every 1.2 s — slowly),
 *  two more by Friday. The other fourteen miss the trend. */
export const WED_LIT = [1, 3, 6, 8];
export const FRI_LIT = [0, 9];
export const SENT_AT = (k: number) => 11.5 + k * 1.2;         // box k lands on the pile
export const LIT_AT: Record<number, number> = Object.fromEntries([
  ...WED_LIT.map((id, k) => [id, SENT_AT(k) + 0.6]),
  ...FRI_LIT.map((id) => [id, T.jerk]),
]);
export const MISSED = Array.from({ length: N }, (_, i) => i).filter((i) => !(i in LIT_AT));
export const WAVE_AT = (i: number) => T.wave + (i % COLS) * 0.28 + Math.floor(i / COLS) * 0.05;

const APPEAR_AT = (i: number) => T.appear + ((i % COLS) + Math.floor(i / COLS)) * 0.09;
// One pile, lower centre: deterministic jitter so it reads as a heap.
const HEAP = MISSED.map((_, k) => {
  const a = k * 2.399963; // golden angle
  const r = 26 * Math.sqrt(k + 1);
  return { x: 540 + Math.cos(a) * r * 1.35, y: 1040 + Math.sin(a) * r * 0.8, rot: ((k * 37) % 50) - 25 };
});
export const ROW_DOT = { y: 1235, pitch: 34, scale: 18 / CIRCLE };
export const rowDot = (i: number) => ({ x: 540 + (i - (N - 1) / 2) * ROW_DOT.pitch, y: ROW_DOT.y });

type P = { x: number; y: number; s: number; r: number; o: number };

/** Every circle trajectory on ONE paused GSAP timeline, seeked to frame/fps. */
export function buildTimeline() {
  const c: P[] = Array.from({ length: N }, (_, i) => {
    const h = home(i);
    return { x: h.x + ((i % 3) - 1) * 40, y: h.y + 170, s: 0.5, r: 0, o: 0 };
  });
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });

  // 0:00.6 — the grid rises in a diagonal wave, each circle on a short arc
  // with a 1.05 → 1.0 overshoot.
  c.forEach((p, i) => {
    const at = APPEAR_AT(i);
    const h = home(i);
    tl.to(p, { x: h.x, duration: 0.55, ease: "power1.out" }, at)
      .to(p, { y: h.y, duration: 0.55, ease: "power3.out" }, at)
      .to(p, { o: 1, duration: 0.2, ease: "power1.out" }, at)
      .to(p, { s: 1.05, duration: 0.4, ease: "power2.out" }, at)
      .to(p, { s: 1, duration: 0.15, ease: "power2.inOut" }, at + 0.4);
  });

  // 0:24.4 — the fourteen grey creators slide into one pile, along arcs.
  MISSED.forEach((id, k) => {
    const at = T.heap + k * 0.05;
    tl.to(c[id], { x: HEAP[k].x, duration: 0.8, ease: "power2.inOut" }, at)
      .to(c[id], { y: HEAP[k].y, duration: 0.8, ease: "power1.in" }, at)
      .to(c[id], { s: 0.82, r: HEAP[k].rot, duration: 0.8, ease: "power2.inOut" }, at);
  });

  // 0:30.2 — back to their places, with overshoot.
  MISSED.forEach((id, k) => {
    const at = T.plan + k * 0.04;
    const h = home(id);
    tl.to(c[id], { x: h.x, duration: 0.7, ease: "power2.inOut" }, at)
      .to(c[id], { y: h.y, duration: 0.7, ease: "power1.out" }, at)
      .to(c[id], { r: 0, duration: 0.7, ease: "power2.out" }, at)
      .to(c[id], { s: 1.05, duration: 0.55, ease: "power2.out" }, at)
      .to(c[id], { s: 1, duration: 0.15, ease: "power2.inOut" }, at + 0.55);
  });

  // 0:34.75 — the grid gathers into a row of dots under the logo.
  c.forEach((p, i) => {
    const at = T.wipe + i * 0.012;
    const d = rowDot(i);
    tl.to(p, { x: d.x, duration: 0.6, ease: "power2.inOut" }, at)
      .to(p, { y: d.y, duration: 0.6, ease: "power1.out" }, at)
      .to(p, { s: ROW_DOT.scale, duration: 0.6, ease: "power2.inOut" }, at);
  });

  return { tl, c };
}
