import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { Box, Cyl, FaceText, LINE, S, iso, mix, poly } from "../warehouse/iso";
import { BIN, P3, RECV, Room, RoomState } from "../warehouse/Room";

/* "Two boxes" — 32 s, 1080x1920. Same product, a mailer and a box on the packing table of the
   same warehouse; the tape measure shows what the courier bills. Every state is a function of t,
   so the keyframes (stage 1) and the animation (stage 2) come from the same code. */

export const DURATION_S = 32;
export const TW = 1080, TH = 1920;
const ANCHOR = { x: 540, y: 1150 };
type Cam = { x: number; y: number; z: number; zoom: number };

/* ---------------------------------------------------------------- the packing table (1 unit = 5 cm) */
const T = { x0: 33, x1: 51, y0: 19, y1: 28, top: 9.5 };
const M = { x0: 33.8, y0: 24.0, w: 5, d: 3.6, h: 0.8 };            // mailer 25 x 18 x 4 cm
const B = { x0: 44.9, y0: 22.8, w: 6, d: 5, h: 3 };               // box 30 x 25 x 15 cm
const SC = { x0: 39.4, y0: 23.0, w: 5.3, d: 4.2, h: 0.55 };         // scale platform, display head on the table edge
const TAPE_HOME: P3 = { x: 41.6, y: 20.9, z: T.top };             // tape measure, coiled, between the two (behind the scale)
const PR = 0.9, PH = 0.6;                                         // product: a flat tin, 9 cm across, 3 cm tall
const ON_SCALE: P3 = { x: SC.x0 + SC.w / 2, y: SC.y0 + SC.d / 2, z: T.top + SC.h };
const IN_MAILER: P3 = { x: M.x0 + M.w * 0.55, y: M.y0 + M.d / 2, z: T.top + 0.1 };
const PEEK_MAILER: P3 = { x: M.x0 + M.w + 0.4, y: M.y0 + M.d / 2, z: T.top + 0.1 };   // slid half out of the open end
const IN_BOX: P3 = { x: B.x0 + B.w / 2, y: B.y0 + B.d / 2, z: T.top + B.h - PH - 0.05 };

const arc = (a: P3, b: P3, k: number, h: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) + Math.sin(Math.PI * clamp(k)) * h });
/** A dropped object: falls with weight, then two small rebounds. */
const drop = (t: number, land: number, from = 5) => {
  if (t < land - 0.4) return null;
  if (t < land) { const k = (t - (land - 0.4)) / 0.4; return from * (1 - k * k); }
  const u = t - land;
  return u > 0.6 ? 0 : 0.45 * Math.abs(Math.sin((Math.PI * u) / 0.22)) * Math.exp(-u * 7);
};

/* ---------------------------------------------------------------- timeline */
export const TL = {
  // 1
  push: [0.3, 2.4], mailerLand: 1.25, boxLand: 1.55, tapeLand: 1.8,
  // 2
  open: 5.0, aOut: 5.35, aOnScale: 6.0, aBack: 6.9, bUp: 7.0, bOnScale: 7.65, bBack: 10.3, close: 10.75,
  // 3
  toMailer: 11.1, mL: 11.6, mW: 12.6, mH: 13.6, fM: [12.3, 13.3, 14.2, 14.8, 15.4], tapeIn: 16.6,
  // 4
  toBox: 18.9, bL: 19.4, bW: 20.2, bH: 20.9, fB: [20.0, 20.7, 21.35, 21.7, 22.1], cmpA: 22.5, cmpB: 22.8, tapeIn2: 24.4,
  // 5
  open2: 26.0, move: 26.35, landM: 27.3, closeM: 27.45, boxOut: 27.6,
  // 6
  pull: 29.0, logo: 29.9,
};
export const HEADLINES: [number, number, string][] = [
  [0.4, 5.0, "Same product. Same weight."],
  [5.15, 11.0, "The scale agrees."],
  [11.15, 22.75, "But the courier measures air."],
  [22.8, 26.0, "Billed as six times heavier."],
  [26.05, 29.0, "Same product. Smaller box."],
  [29.05, 32.0, "Measure yours."],
];

type St = {
  cam: Cam;
  mailer: { z: number; flap: number; on: boolean };
  box: { z: number; flaps: number; dx: number; dy: number; on: boolean };
  a: P3 | null; b: P3 | null;      // the two identical products
  tape: { at: P3; strip: null | { from: P3; to: P3 } } | null;
  display: string;
  labels: { p: P3; text: string; k: number }[];
};

const CAM_WIDE: Cam = { x: 31, y: 18, z: 2, zoom: 1.05 };
const CAM_TABLE: Cam = { x: 41.4, y: 23.0, z: 9.6, zoom: 3.1 };
const CAM_SCALE: Cam = { x: 41.8, y: 24.0, z: 9.6, zoom: 3.35 };
const CAM_MAILER: Cam = { x: 39.4, y: 24.4, z: 8.6, zoom: 3.4 };
const CAM_BOX: Cam = { x: 44.4, y: 23.8, z: 8.2, zoom: 3.25 };
const CAM_END: Cam = { x: 39.4, y: 21.6, z: 8.6, zoom: 2.6 };
const lc = (a: Cam, b: Cam, k: number): Cam => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), zoom: lerp(a.zoom, b.zoom, k) });

function cameraAt(t: number): Cam {
  const keys: [number, Cam][] = [
    [TL.push[0], CAM_WIDE], [TL.push[1], CAM_TABLE], [5.0, { ...CAM_TABLE, zoom: 3.2 }], [5.8, CAM_SCALE], [10.6, { ...CAM_SCALE, zoom: 3.5 }],
    [11.4, CAM_MAILER], [18.6, { ...CAM_MAILER, zoom: 3.55, x: 39.8 }], [19.4, CAM_BOX], [22.75, { ...CAM_BOX, zoom: 3.38 }],
    [22.85, { ...CAM_BOX, zoom: 3.55, x: 45.0, y: 23.4 }],                 // the halt: one sharp step in on the comparison
    [25.9, { ...CAM_BOX, zoom: 3.62, x: 45.0, y: 23.4 }], [26.6, CAM_TABLE], [28.9, { ...CAM_TABLE, zoom: 3.2 }], [30.6, CAM_END], [32, { ...CAM_END, zoom: 2.5 }],
  ];
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i], [tb, b] = keys[i + 1];
    if (t <= tb) {
      const long = tb - ta > 1.5;                                          // holds drift with a gentle in-out, moves use the move curve
      return lc(a, b, (long ? (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x) : EASE_MOVE)(clamp((t - ta) / (tb - ta))));
    }
  }
  return keys[keys.length - 1][1];
}

const reading = (t: number, on: number, off: number) => {
  // digits settle over 0.35 s after a product lands, fall back when it leaves
  const up = (t - on) / 0.35, down = (t - off) / 0.25;
  if (t < on || t >= off + 0.25) return "0.000";
  if (t < on + 0.35) return (0.3 * EASE_APPEAR(clamp(up))).toFixed(3);
  if (t < off) return "0.300";
  return (0.3 * (1 - clamp(down))).toFixed(3);
};

export function stateAt(t: number): St {
  const cam = cameraAt(t);
  // 1 — the mailer and the box are set down, the tape measure lands between them
  const mz = drop(t, TL.mailerLand), bz = drop(t, TL.boxLand), tz = drop(t, TL.tapeLand, 3);
  // flaps: open at 2, closed for measuring at the end of 2, the mailer opens again in 5
  const mFlap = ramp(t, TL.open, 0.45, EASE_MOVE) * (1 - ramp(t, TL.close, 0.4, EASE_MOVE)) + ramp(t, TL.open2, 0.35, EASE_MOVE) * (1 - ramp(t, TL.closeM, 0.4, EASE_MOVE));
  const bFlaps = ramp(t, TL.open + 0.1, 0.5, EASE_MOVE) * (1 - ramp(t, TL.close, 0.45, EASE_MOVE)) + ramp(t, TL.open2, 0.35, EASE_MOVE);
  // product A (mailer)
  let a: P3 | null = IN_MAILER;
  if (t >= TL.open) a = arc(IN_MAILER, PEEK_MAILER, EASE_MOVE(clamp((t - TL.open - 0.15) / 0.3)), 0);
  if (t >= TL.aOut) a = arc(PEEK_MAILER, ON_SCALE, EASE_MOVE(clamp((t - TL.aOut) / (TL.aOnScale - TL.aOut))), 2.2);
  if (t >= TL.aBack) a = arc(ON_SCALE, IN_MAILER, EASE_MOVE(clamp((t - TL.aBack) / 0.55)), 2.0);
  // product B (box)
  let b: P3 | null = IN_BOX;
  if (t >= TL.bUp) b = arc(IN_BOX, ON_SCALE, EASE_MOVE(clamp((t - TL.bUp) / (TL.bOnScale - TL.bUp))), 2.4);
  if (t >= TL.bBack) b = arc(ON_SCALE, IN_BOX, EASE_MOVE(clamp((t - TL.bBack) / 0.5)), 2.0);
  if (t >= TL.move) b = arc(IN_BOX, IN_MAILER, EASE_MOVE(clamp((t - TL.move) / (TL.landM - TL.move))), 4.2);
  const display = t < TL.bUp ? reading(t, TL.aOnScale, TL.aBack) : reading(t, TL.bOnScale, TL.bBack);
  // the box leaves to the left in 5
  const out = ramp(t, TL.boxOut, 1.0, EASE_MOVE);
  // tape measure: mailer edges in 3, box edges in 4
  const mx1 = M.x0 + M.w, my1 = M.y0 + M.d, bx1 = B.x0 + B.w, by1 = B.y0 + B.d;
  const mzT = T.top, bzT = T.top;
  const ext = (a0: P3, a1: P3, s: number, d = 0.45) => ({ from: a0, to: arc(a0, a1, EASE_MOVE(clamp((t - s) / d)), 0) });
  let tape: St["tape"] = tz === null ? null : { at: { ...TAPE_HOME, z: TAPE_HOME.z + tz }, strip: null };
  const mLp: [P3, P3] = [{ x: M.x0, y: my1 + 0.25, z: mzT }, { x: mx1, y: my1 + 0.25, z: mzT }];
  const mWp: [P3, P3] = [{ x: M.x0 - 0.55, y: my1, z: mzT }, { x: M.x0 - 0.55, y: M.y0, z: mzT }];
  const mHp: [P3, P3] = [{ x: M.x0 - 0.3, y: my1 + 0.3, z: mzT }, { x: M.x0 - 0.3, y: my1 + 0.3, z: mzT + M.h }];
  const bLp: [P3, P3] = [{ x: B.x0, y: by1 + 0.25, z: bzT }, { x: bx1, y: by1 + 0.25, z: bzT }];
  const bWp: [P3, P3] = [{ x: bx1 + 0.25, y: by1, z: bzT }, { x: bx1 + 0.25, y: B.y0, z: bzT }];
  const bHp: [P3, P3] = [{ x: bx1 + 0.2, y: by1 + 0.2, z: bzT }, { x: bx1 + 0.2, y: by1 + 0.2, z: bzT + B.h }];
  const segs: [number, [P3, P3], number][] = [[TL.mL, mLp, TL.mW - 0.15], [TL.mW, mWp, TL.mH - 0.15], [TL.mH, mHp, TL.tapeIn], [TL.bL, bLp, TL.bW - 0.15], [TL.bW, bWp, TL.bH - 0.15], [TL.bH, bHp, TL.tapeIn2]];
  if (tape) {
    if (t >= TL.toMailer && t < TL.mL) tape.at = arc(TAPE_HOME, mLp[0], EASE_MOVE(clamp((t - TL.toMailer) / 0.45)), 1.2);
    for (const [s, [p0, p1], e] of segs) {
      if (t >= s && t < e + 0.35) {
        const ret = ramp(t, e, 0.35, EASE_MOVE);
        const st = ext(p0, p1, s);
        tape = { at: p0, strip: { from: p0, to: arc(st.to, p0, ret, 0) } };
      }
    }
    if (t >= TL.tapeIn + 0.35 && t < TL.toBox) tape.at = arc(mHp[0], TAPE_HOME, EASE_MOVE(clamp((t - TL.tapeIn - 0.35) / 0.5)), 1.2);
    if (t >= TL.toBox && t < TL.bL) tape.at = arc(TAPE_HOME, bLp[0], EASE_MOVE(clamp((t - TL.toBox) / 0.45)), 1.5);
    if (t >= TL.tapeIn2 + 0.35) tape.at = arc(bHp[0], TAPE_HOME, EASE_MOVE(clamp((t - TL.tapeIn2 - 0.35) / 0.5)), 1.5);
  }
  const mid = (p: [P3, P3], off: P3 = { x: 0, y: 0, z: 0 }): P3 => ({ x: (p[0].x + p[1].x) / 2 + off.x, y: (p[0].y + p[1].y) / 2 + off.y, z: (p[0].z + p[1].z) / 2 + off.z });
  const lab = (p: P3, text: string, at: number, gone: number) => ({ p, text, k: ramp(t, at, 0.3) * (1 - ramp(t, gone, 0.3, EASE_MOVE)) });
  const labels = [
    lab(mid(mLp, { x: 0, y: 0.9, z: 0 }), "25", TL.mL + 0.45, TL.toBox - 0.2), lab(mid(mWp, { x: -1.3, y: 0, z: 0 }), "18", TL.mW + 0.45, TL.toBox - 0.2), lab(mid(mHp, { x: -0.9, y: 1.2, z: 0.2 }), "4", TL.mH + 0.45, TL.toBox - 0.2),
    lab(mid(bLp, { x: 0, y: 1.1, z: 0 }), "30", TL.bL + 0.45, TL.open2 - 0.2), lab(mid(bWp, { x: 0.9, y: 0, z: 0 }), "25", TL.bW + 0.45, TL.open2 - 0.2), lab(mid(bHp, { x: 1.1, y: 1.1, z: 0 }), "15", TL.bH + 0.45, TL.open2 - 0.2),
  ].filter((l) => l.k > 0.001);
  return {
    cam,
    mailer: { z: mz ?? 0, flap: mFlap, on: mz !== null },
    box: { z: bz ?? 0, flaps: bFlaps, dx: -2 * out, dy: 16 * out, on: bz !== null && out < 1 },
    a: t >= TL.landM ? null : a, b: bz === null ? null : out >= 1 && t < TL.move ? null : b,
    tape, display, labels,
  };
}

/* ---------------------------------------------------------------- props */
const Table2: React.FC = () => {
  const legs: [number, number][] = [[T.x0 + 0.4, T.y0 + 0.4], [T.x1 - 1.2, T.y0 + 0.4], [T.x0 + 0.4, T.y1 - 1.2], [T.x1 - 1.2, T.y1 - 1.2]];
  return (
    <g>
      {legs.map(([x, y], i) => <Box key={i} x={x} y={y} z={0} w={0.8} d={0.8} h={T.top - 1} color={C.ink} line={false} />)}
      <Box x={T.x0} y={T.y0} z={T.top - 1} w={T.x1 - T.x0} d={T.y1 - T.y0} h={1} color={C.grey} top={mix(C.grey, C.ink, 0.04)} side={C.white} front={C.white} />
      {/* mint strip along the front edge */}
      <polygon points={poly([[T.x0, T.y1, T.top - 0.42], [T.x1, T.y1, T.top - 0.42], [T.x1, T.y1, T.top], [T.x0, T.y1, T.top]])} fill={C.mint} {...LINE} />
      {/* tape dispenser */}
      <Box x={T.x0 + 0.7} y={T.y0 + 0.6} z={T.top} w={3.4} d={2.4} h={0.8} color={C.ink} />
      <Cyl x={T.x0 + 2.3} y={T.y0 + 1.8} z={T.top + 0.8} r={1.15} h={1.1} color={C.white} topColor={C.white} />
      <ellipse cx={iso(T.x0 + 2.3, T.y0 + 1.8, T.top + 1.9).X} cy={iso(T.x0 + 2.3, T.y0 + 1.8, T.top + 1.9).Y} rx={4.6} ry={2.7} fill={C.grey} {...LINE} />
      {/* label printer */}
      <Box x={T.x1 - 4.6} y={T.y0 + 0.4} z={T.top} w={3.8} d={3.0} h={2.8} color={C.white} />
      <polyline points={poly([[T.x1 - 0.8, T.y0 + 0.9, T.top + 1.9], [T.x1 - 0.8, T.y0 + 3.1, T.top + 1.9]])} stroke={C.ink} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

const Scale: React.FC<{ text: string }> = ({ text }) => {
  const { x0, y0, w, d, h } = SC;
  return (
    <g>
      <Box x={x0} y={y0} z={T.top} w={w} d={d} h={h} color={C.white} />
      <polygon points={poly([[x0 + 0.5, y0 + 0.5, T.top + h + 0.01], [x0 + w - 0.5, y0 + 0.5, T.top + h + 0.01], [x0 + w - 0.5, y0 + d - 0.5, T.top + h + 0.01], [x0 + 0.5, y0 + d - 0.5, T.top + h + 0.01]])} fill={C.grey} {...LINE} />
      {/* display head on the front edge, screen facing the viewer */}
      <Box x={x0 + 0.1} y={y0 + d} z={T.top} w={w - 0.2} d={0.7} h={1.7} color={C.white} />
      <polygon points={poly([[x0 + 0.3, y0 + d + 0.7, T.top + 0.25], [x0 + w - 0.3, y0 + d + 0.7, T.top + 0.25], [x0 + w - 0.3, y0 + d + 0.7, T.top + 1.5], [x0 + 0.3, y0 + d + 0.7, T.top + 1.5]])} fill={C.ink} />
      <FaceText x={x0 + w / 2} y={y0 + d + 0.7} z={T.top + 0.88} size={10.5} weight={600} color={C.white}>{text} kg</FaceText>
    </g>
  );
};

const Product: React.FC<{ p: P3 }> = ({ p }) => (
  <g>
    <Cyl x={p.x} y={p.y} z={p.z} r={PR} h={PH - 0.2} color={C.white} topColor={C.white} />
    <Cyl x={p.x} y={p.y} z={p.z + PH - 0.22} r={PR + 0.04} h={0.22} color={C.mint} topColor={C.mint} />
  </g>
);

/** Flat mailer, Dock Green, flap line across the right end; the flap lifts to open that end. */
const Mailer2: React.FC<{ x: number; y: number; z: number; flap: number; inner?: React.ReactNode }> = ({ x, y, z, flap, inner }) => {
  const { w, d, h } = M;
  const fx = x + w - 1.1;                      // flap crease
  const lift = flap * 1.3;
  return (
    <g>
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={C.green} />
      {inner}
      {/* the flap: hinged at the crease, lifts its free end */}
      {flap > 0.02 && <polygon points={poly([[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z + h + lift], [x + w, y, z + h + lift]])} fill={mix(C.green, C.ink, 0.6)} {...LINE} />}
      <polygon points={poly([[fx, y, z + h], [fx, y + d, z + h], [fx + 1.1, y + d, z + h + lift], [fx + 1.1, y, z + h + lift]])} fill={flap > 0.02 ? mix(C.green, C.ink, 0.1) : C.green} {...LINE} />
      <polyline points={poly([[fx, y, z + h], [fx, y + d, z + h]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

/** Box, Dock Green, two top flaps meeting on the centre seam; they fold out to open. */
const Box2: React.FC<{ x: number; y: number; z: number; flaps: number; inner?: React.ReactNode }> = ({ x, y, z, flaps, inner }) => {
  const { w, d, h } = B;
  const g = C.green, top = z + h, f = flaps;
  const hd = d / 2;
  // each flap is hd deep; open = rotated 120 degrees about its outer hinge
  const ang = (Math.PI * 2 / 3) * f;
  return (
    <g>
      {/* back flap (hinge on y0) behind everything */}
      {f > 0.02 && <polygon points={poly([[x, y, top], [x + w, y, top], [x + w, y + hd * Math.cos(ang), top + hd * Math.sin(ang)], [x, y + hd * Math.cos(ang), top + hd * Math.sin(ang)]])} fill={mix(g, C.ink, 0.2)} {...LINE} />}
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={g} top={f > 0.02 ? mix(g, C.ink, 0.5) : g} />
      {f > 0.02 && inner}
      {f > 0.02
        ? <polygon points={poly([[x, y + d, top], [x + w, y + d, top], [x + w, y + d - hd * Math.cos(ang), top + hd * Math.sin(ang)], [x, y + d - hd * Math.cos(ang), top + hd * Math.sin(ang)]])} fill={mix(g, C.ink, 0.06)} {...LINE} />
        : <>
          <polyline points={poly([[x, y + hd, top], [x + w, y + hd, top]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
          <polyline points={poly([[x + 0.25, y + 0.25, top], [x + w - 0.25, y + 0.25, top]])} stroke={mix(g, C.ink, 0.4)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
          <polyline points={poly([[x + 0.25, y + d - 0.25, top], [x + w - 0.25, y + d - 0.25, top]])} stroke={mix(g, C.ink, 0.4)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
        </>}
    </g>
  );
};

/** Tape measure: ink-and-white housing; the metal strip is white with ink ticks. */
const Tape: React.FC<{ at: P3; strip: null | { from: P3; to: P3 } }> = ({ at, strip }) => (
  <g>
    {strip && (() => {
      const { from, to } = strip;
      const n = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / 0.5));
      const vert = Math.abs(to.z - from.z) > 0.01;
      const off = vert ? { x: 0.32, y: 0, z: 0 } : Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? { x: 0, y: 0.32, z: 0 } : { x: 0.32, y: 0, z: 0 };
      return (
        <g>
          <polygon points={poly([[from.x, from.y, from.z + 0.02], [to.x, to.y, to.z + 0.02], [to.x + off.x, to.y + off.y, to.z + 0.02], [from.x + off.x, from.y + off.y, from.z + 0.02]])} fill={C.white} {...LINE} />
          {Array.from({ length: n }, (_, i) => {
            const k = (i + 0.5) / n;
            const p: [number, number, number] = [lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.z, to.z, k) + 0.02];
            return <polyline key={i} points={poly([p, [p[0] + off.x * 0.5, p[1] + off.y * 0.5, p[2]]])} stroke={C.ink} strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" />;
          })}
        </g>
      );
    })()}
    <Box x={at.x - 0.8} y={at.y - 0.8} z={at.z} w={1.6} d={1.6} h={1.3} color={C.white} />
    <ellipse cx={iso(at.x, at.y + 0.8, at.z + 0.65).X} cy={iso(at.x, at.y + 0.8, at.z + 0.65).Y} rx={5.5} ry={6} fill={C.white} stroke={C.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    <ellipse cx={iso(at.x, at.y + 0.8, at.z + 0.65).X} cy={iso(at.x, at.y + 0.8, at.z + 0.65).Y} rx={2} ry={2.2} fill={C.ink} />
    <polygon points={poly([[at.x + 0.8, at.y - 0.3, at.z + 0.05], [at.x + 1.05, at.y - 0.3, at.z + 0.05], [at.x + 1.05, at.y + 0.3, at.z + 0.05], [at.x + 0.8, at.y + 0.3, at.z + 0.05]])} fill={C.white} {...LINE} />
  </g>
);

/* ---------------------------------------------------------------- screen-space type */
const sc = (cam: Cam, p: P3) => { const c = iso(cam.x, cam.y, cam.z), q = iso(p.x, p.y, p.z); return { x: ANCHOR.x + (q.X - c.X) * cam.zoom, y: ANCHOR.y + (q.Y - c.Y) * cam.zoom }; };

const Headline: React.FC<{ t: number }> = ({ t }) => (
  <>
    {HEADLINES.map(([a, b, text]) => {
      if (t < a || t > b + 0.3) return null;
      const out = b >= DURATION_S ? 0 : ramp(t, b - 0.05, 0.3, EASE_MOVE);
      const words = text.split(" ");
      const drift = (t - a) / Math.max(1, b - a);
      return (
        <div key={a} style={{ position: "absolute", left: 80, right: 80, top: 190, transform: `translateY(${-12 * drift - out * 40}px)`, opacity: 1 - out }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 92, lineHeight: 1.04, letterSpacing: "-0.035em", color: C.ink }}>
            {words.map((w, i) => {
              const k = ramp(t, a + i * 0.075, 0.45, EASE_APPEAR);
              return <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 8, marginBottom: -8 }}><span style={{ display: "inline-block", transform: `translateY(${(1 - k) * 105}%)` }}>{w}{i < words.length - 1 ? " " : ""}</span></span>;
            })}
          </div>
        </div>
      );
    })}
  </>
);

/** Formula under an object: each term appears in order, the result last. */
const Formula: React.FC<{ t: number; terms: string[]; at: number[]; y: number; dim: number }> = ({ t, terms, at, y, dim }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, height: 84, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `6px 6px 0 ${C.ink}`, opacity: ramp(t, at[0] - 0.1, 0.3) * (1 - 0.0 * dim), fontFamily: FONT.display, fontWeight: 700, fontSize: 54, letterSpacing: "-0.02em", color: mix(C.ink, C.grey, 0.55 * dim) }}>
    {terms.map((s, i) => {
      const k = ramp(t, at[i], 0.35, EASE_APPEAR);
      return <span key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 18}px)`, whiteSpace: "pre", fontWeight: i === terms.length - 1 ? 800 : 700 }}>{s}</span>;
    })}
  </div>
);

export const Subs: React.FC<{ t: number; cues: [number, number, string][] }> = ({ t, cues }) => (
  <>
    {cues.map(([a, b, text]) => {
      if (t < a || t > b + 0.15) return null;
      const k = ramp(t, a, 0.25, EASE_APPEAR), o = ramp(t, b, 0.15, EASE_MOVE);
      return <div key={a} style={{ position: "absolute", left: 120, right: 120, bottom: 250, textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: C.ink, opacity: k * (1 - o), background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: "8px 18px", transform: `translateY(${(1 - k) * 14 - o * 20}px)` }}>{text}</div>;
    })}
  </>
);

/* ---------------------------------------------------------------- the frame */
const ROOM_STATE: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: { x: RECV.x0 + 1, y: RECV.y1 - 0.2 - BIN.d, z: RECV.top - BIN.h - 0.3, hooked: true }, highlightCells: false };

export const TwoBoxesScene: React.FC<{ t: number; cues?: [number, number, string][] }> = ({ t, cues = [] }) => {
  const s = stateAt(t);
  const c = iso(s.cam.x, s.cam.y, s.cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${s.cam.zoom}) translate(${-c.X} ${-c.Y})`;
  const bx = B.x0 + s.box.dx, by = B.y0 + s.box.dy;
  const fm = TL.fM, fb = TL.fB;
  const cmp = ramp(t, TL.cmpA, 0.35), cmpB = ramp(t, TL.cmpB, 0.3, EASE_APPEAR);
  const cmpOut = ramp(t, TL.open2 - 0.2, 0.35, EASE_MOVE);
  const fOut = ramp(t, TL.open2 - 0.2, 0.35, EASE_MOVE);
  const logoK = EASE_LOGO(clamp((t - TL.logo) / 0.6));
  const mask = `linear-gradient(0deg, #000 ${-20 + logoK * 140 - 20}%, transparent ${-20 + logoK * 140}%)`;
  // the products are drawn inside their packaging when they are there
  const inMailer = (p: P3 | null) => p && Math.abs(p.z - IN_MAILER.z) < 0.01 && p.x <= PEEK_MAILER.x + 0.01 && p.y === IN_MAILER.y;
  const inBox = (p: P3 | null) => p && Math.abs(p.x - IN_BOX.x) < 0.01 && Math.abs(p.y - IN_BOX.y) < 0.01 && Math.abs(p.z - IN_BOX.z) < 0.01;
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      <svg width={TW} height={TH} style={{ position: "absolute", inset: 0 }}>
        <g transform={tf}>
          <Room s={ROOM_STATE} bare />
          <Table2 />
          <Scale text={s.display} />
          {s.mailer.on && <Mailer2 x={M.x0} y={M.y0} z={T.top + s.mailer.z} flap={s.mailer.flap} inner={inMailer(s.a) && s.a!.x > IN_MAILER.x + 0.01 ? <Product p={{ ...s.a!, z: s.a!.z + s.mailer.z }} /> : null} />}
          {s.box.on && <Box2 x={bx} y={by} z={T.top + s.box.z} flaps={s.box.flaps} inner={inBox(s.b) ? <Product p={{ x: s.b!.x + s.box.dx, y: s.b!.y + s.box.dy, z: s.b!.z + s.box.z }} /> : null} />}
          {s.a && !inMailer(s.a) && <Product p={s.a} />}
          {s.b && !inBox(s.b) && <Product p={s.b} />}
          {s.tape && <Tape at={s.tape.at} strip={s.tape.strip} />}
        </g>
      </svg>
      {/* edge numbers from the tape */}
      {s.labels.map((l, i) => { const p = sc(s.cam, l.p); return (
        <div key={i} style={{ position: "absolute", left: p.x - 50, top: p.y - 30, width: 100, textAlign: "center", opacity: l.k, transform: `scale(${0.85 + 0.15 * l.k})` }}>
          <span style={{ display: "inline-block", background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 12, padding: "2px 14px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 40, color: C.ink }}>{l.text}</span>
        </div>); })}
      {/* formulas: mailer, then box beneath it */}
      {t >= fm[0] && t < TL.open2 + 0.3 && <Formula t={t} terms={["25 ×", "18 ×", "4", "÷ 5000", "= 0.36 kg"]} at={fm} y={1352} dim={Math.max(ramp(t, fb[0], 0.4), fOut)} />}
      {t >= fb[0] && t < TL.open2 + 0.3 && <Formula t={t} terms={["30 ×", "25 ×", "15", "÷ 5000", "= 2.25 kg"]} at={fb} y={1446} dim={fOut} />}
      {/* the comparison: the one figure that stops the rhythm */}
      {cmp > 0 && cmpOut < 1 && (
        <div style={{ position: "absolute", right: 60, top: 520, width: 330, opacity: cmp * (1 - cmpOut), transform: `translateX(${(1 - cmp) * 40}px)` }}>
          <div style={{ background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: "22px 26px" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.1em", color: C.ink, opacity: 0.75 }}>MAILER</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: C.ink }}>0.36 kg</div>
            <div style={{ marginTop: 14, fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.1em", color: C.ink, opacity: 0.75 * cmpB }}>BOX</div>
            <div style={{ display: "inline-block", opacity: cmpB, background: C.mint, borderRadius: 12, padding: "0 12px", marginLeft: -12, transform: `scale(${1.05 - 0.05 * EASE_APPEAR(clamp((t - TL.cmpB - 0.15) / 0.5))})`, transformOrigin: "0 50%", fontFamily: FONT.display, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: C.ink }}>2.25 kg</div>
          </div>
        </div>
      )}
      {/* the top third stays clear for the headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 470, background: `linear-gradient(180deg, ${C.grey} 0%, ${C.grey} 78%, ${C.grey}00 100%)` }} />
      <Headline t={t} />
      {/* end: url and the logo, diagonal fill bottom to top */}
      {t >= TL.logo - 0.05 && (
        <div style={{ position: "absolute", left: 250, right: 250, top: 1170, display: "flex", flexDirection: "column", alignItems: "center", background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${C.ink}`, padding: "30px 0 26px", opacity: ramp(t, TL.logo - 0.05, 0.25) }}>
          <div style={{ width: 260, WebkitMaskImage: mask, maskImage: mask }}><Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} /></div>
          <div style={{ marginTop: 14, fontFamily: FONT.display, fontWeight: 800, fontSize: 56, color: C.ink, opacity: ramp(t, TL.logo + 0.3, 0.4), transform: `translateY(${(1 - ramp(t, TL.logo + 0.3, 0.4)) * 16}px)` }}>dockentra.ie</div>
        </div>
      )}
      <Subs t={t} cues={cues} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- stage 1: keyframes */
export const KEYFRAMES: { t: number; label: string }[] = [
  { t: 0.5, label: "1 · 0:00 wide, the warehouse" },
  { t: 3.0, label: "1 · 0:03 mailer and box set down" },
  { t: 8.0, label: "2 · 0:08 the scale agrees" },
  { t: 16.0, label: "3 · 0:16 the mailer is measured" },
  { t: 23.0, label: "4 · 0:23 the box is measured" },
  { t: 27.0, label: "5 · 0:27 repacked" },
  { t: 31.2, label: "6 · 0:31 measure yours" },
];
/** Voice lines as subtitles, placed for the keyframes only (real timing comes from the synthesis). */
export const DRAFT_CUES: [number, number, string][] = [
  [0.4, 4.6, "Same product, same weight, two boxes."],
  [5.0, 10.8, "Your courier bills whichever is bigger: the actual weight, or the volumetric one."],
  [11.0, 15.0, "Length times width times height, divided by five thousand."],
  [15.0, 18.8, "In the mailer that's zero point three six kilos."],
  [19.0, 22.6, "In the box, two point two five."],
  [22.7, 28.6, "Same product, billed as six times heavier, on every single order."],
  [29.0, 32.0, "Measure yours."],
];
export const TwoBoxesKeyframe: React.FC<{ i: number }> = ({ i }) => <TwoBoxesScene t={KEYFRAMES[i].t} cues={DRAFT_CUES} />;
