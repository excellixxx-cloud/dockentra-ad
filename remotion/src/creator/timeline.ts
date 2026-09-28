import gsap from "gsap";

/** World-space layout (px, 1080x1920 frame). */
export const LEFT = { x: 270, y: 1060 };
export const RIGHT = { x: 810, y: 1060 };
export const HERO_FOCUS = { x: 540, y: 990, s: 2.1 };
export const STACK = { x: 700, y: 1190, step: 10 };
export const GRID = { x0: 150, y0: 820, dx: 86, dy: 66, cols: 10 };
export const LOGO_POINT = { x: 540, y: 990 };

export const ORDER_OFF = [[-14, 10, -8], [12, -8, 5], [-6, 12, -3], [16, -12, 7], [-12, 4, -6], [8, -4, 3], [0, 0, -1]];
export const SAMPLE_OFF = [[-40, -70, 8], [36, 40, -6], [-24, 80, 4], [54, -24, 10], [4, 6, -3], [-46, 18, 6]];
export const ORDER_DROP = (i: number) => 0.8 + i * 0.36;
export const SAMPLE_DROP = (i: number) => 4.4 + i * 0.55;
export const TAG_FLY = (j: number) => 24.6 + j * 0.07;
export const TILE_FLY = (i: number) => 30.0 + i * 0.018;
export const TILE_DONE = (i: number) => 31.6 + i * 0.035;
export const TILE_OUT = (i: number) => 35.55 + i * 0.008;
export const JERK = 26.0;

type P = { x: number; y: number; r: number; s: number; o: number };
const p = (x: number, y: number, r = 0, s = 1, o = 1): P => ({ x, y, r, s, o });

/**
 * One paused GSAP timeline for every trajectory in the film; the composition
 * seeks it to frame / fps each frame. Arcs = different eases on x and y;
 * overshoot = a 1.05 → 1.0 scale keyframe on arrival.
 */
export function buildTimeline() {
  const orders = ORDER_OFF.map(([dx, dy, r], i) => p(-260 - i * 10, LEFT.y + dy - 380 + i * 20, r - 25, 1.35, 1));
  const samples = SAMPLE_OFF.slice(0, 5).map(([dx, dy, r], i) => p(1340 + i * 20, RIGHT.y + dy - 420 + i * 10, r + 40, 1.3, 1));
  const pile = { left: 0, right: 0 };
  const inv = { dx: 0, dy: 0, r: 0 };
  const peel = { dx: 0, dy: 0, r: 0 };
  const heroTag = { x: 520, y: -620, s: 1 };
  const card = p(1300, -260, 18, 1.2, 1);
  const tags = Array.from({ length: 6 }, () => ({ k: 0, s: 1 }));
  const tiles = Array.from({ length: 50 }, () => ({ k: 0, s: 0.6, out: 0 }));

  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });

  // 0:00.8 — regular orders fall onto the left field, each along an arc.
  orders.forEach((o, i) => {
    const at = ORDER_DROP(i);
    const [dx, dy, r] = ORDER_OFF[i];
    tl.to(o, { x: LEFT.x + dx, duration: 0.55, ease: "power1.out" }, at)
      .to(o, { y: LEFT.y + dy, duration: 0.55, ease: "power3.in" }, at)
      .to(o, { r, duration: 0.55, ease: "power2.out" }, at)
      .to(o, { s: 1.05, duration: 0.55, ease: "power2.in" }, at)
      .to(o, { s: 1 + i * 0.012, duration: 0.2, ease: "power2.out" }, at + 0.55);
  });

  // 0:04.4 — creator-sample mailers arc in from the top right.
  samples.forEach((o, i) => {
    const at = SAMPLE_DROP(i);
    const [dx, dy, r] = SAMPLE_OFF[i];
    tl.to(o, { x: RIGHT.x + dx, duration: 0.65, ease: "power2.out" }, at)
      .to(o, { y: RIGHT.y + dy, duration: 0.65, ease: "power3.in" }, at)
      .to(o, { r, duration: 0.65, ease: "power2.out" }, at)
      .to(o, { s: 1.05, duration: 0.65, ease: "power2.in" }, at)
      .to(o, { s: 1, duration: 0.2, ease: "power2.out" }, at + 0.65);
  });

  // 0:14.2 — the top order lifts to the centre (shared element), piles make room.
  const hero = orders[6];
  tl.to(hero, { x: HERO_FOCUS.x, duration: 0.8, ease: "power2.inOut" }, 14.2)
    .to(hero, { y: HERO_FOCUS.y - 60, duration: 0.4, ease: "power1.out" }, 14.2)
    .to(hero, { y: HERO_FOCUS.y, duration: 0.4, ease: "power1.in" }, 14.6)
    .to(hero, { r: 0, duration: 0.8, ease: "power2.out" }, 14.2)
    .to(hero, { s: HERO_FOCUS.s * 1.05, duration: 0.6, ease: "power2.out" }, 14.2)
    .to(hero, { s: HERO_FOCUS.s, duration: 0.25, ease: "power2.inOut" }, 14.8);
  tl.to(pile, { left: -130, right: 130, duration: 0.7, ease: "power2.inOut" }, 14.2);

  // 0:15.4 — the invoice slides out and leaves the frame along an arc.
  tl.to(inv, { dx: -170, duration: 1.0, ease: "power2.in" }, 15.4)
    .to(inv, { dy: -150, duration: 1.0, ease: "power1.in" }, 15.4)
    .to(inv, { r: -45, duration: 1.0, ease: "power2.in" }, 15.4);
  // 0:17.25 — the price label peels up and away.
  tl.to(peel, { dx: 230, duration: 0.9, ease: "power2.in" }, 17.25)
    .to(peel, { dy: -90, duration: 0.9, ease: "power1.in" }, 17.25)
    .to(peel, { r: 40, duration: 0.9, ease: "power2.in" }, 17.25);
  // 0:19.8 — the creator-sample tag swings in and hooks on.
  tl.to(heroTag, { x: 0, duration: 0.6, ease: "power2.out" }, 19.8)
    .to(heroTag, { y: 0, duration: 0.6, ease: "back.out(1.6)" }, 19.8);

  // 0:22.6 — the finished sample arcs over into the sample pile.
  const [sx, sy, sr] = SAMPLE_OFF[5];
  tl.to(hero, { x: RIGHT.x + sx, duration: 0.8, ease: "power2.inOut" }, 22.6)
    .to(hero, { y: RIGHT.y + sy - 80, duration: 0.4, ease: "power1.out" }, 22.6)
    .to(hero, { y: RIGHT.y + sy, duration: 0.4, ease: "power1.in" }, 23.0)
    .to(hero, { r: sr, duration: 0.8, ease: "power2.inOut" }, 22.6)
    .to(hero, { s: 0.85 * 1.05, duration: 0.6, ease: "power2.inOut" }, 22.6)
    .to(hero, { s: 0.85, duration: 0.2, ease: "power2.out" }, 23.2);
  tl.to(pile, { left: 0, right: 0, duration: 0.7, ease: "power2.inOut" }, 22.7);

  // 0:24.2 — the agency request card drops in along an arc.
  tl.to(card, { x: 540, duration: 0.7, ease: "power2.out" }, 24.2)
    .to(card, { y: 330, duration: 0.7, ease: "power3.out" }, 24.2)
    .to(card, { r: -2, duration: 0.7, ease: "power2.out" }, 24.2)
    .to(card, { s: 1.05, duration: 0.5, ease: "power2.out" }, 24.2)
    .to(card, { s: 1, duration: 0.2, ease: "power2.inOut" }, 24.7)
    .to(card, { x: -700, y: 220, r: -14, duration: 0.7, ease: "power2.in" }, 29.3);

  // 0:24.6 — the six tags leave their parcels and stack up.
  tags.forEach((g, j) => {
    const at = TAG_FLY(j);
    tl.to(g, { k: 1, duration: 0.55, ease: "power2.inOut" }, at)
      .to(g, { s: 1.05, duration: 0.4, ease: "power2.out" }, at)
      .to(g, { s: 1, duration: 0.15, ease: "power2.inOut" }, at + 0.4);
  });

  // 0:30 — the stack of 50 tags deals out into a grid of micro-orders,
  // then everything converges into the point the logo fills from.
  tiles.forEach((g, i) => {
    tl.to(g, { k: 1, duration: 0.7, ease: "power2.inOut" }, TILE_FLY(i))
      .to(g, { s: 1.05, duration: 0.55, ease: "power2.out" }, TILE_FLY(i))
      .to(g, { s: 1, duration: 0.15, ease: "power2.inOut" }, TILE_FLY(i) + 0.55)
      .to(g, { out: 1, duration: 0.55, ease: "back.in(1.4)" }, TILE_OUT(i));
  });
  tl.to(pile, { left: -760, right: 760, duration: 0.8, ease: "power2.in" }, 30.0);

  return { tl, orders, samples, pile, inv, peel, heroTag, card, tags, tiles };
}
