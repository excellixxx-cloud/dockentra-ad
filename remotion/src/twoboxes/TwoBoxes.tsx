import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { Box, Cyl, FaceText, LINE, iso, mix, poly } from "../warehouse/iso";
import { BIN, P3, RECV, Room, RoomState } from "../warehouse/Room";

/* "Two boxes" — 32 s, 1080x1920. ONE product and TWO empty packages on the packing table of the
   same warehouse: the same parcel packed two ways. The tape measures the empty packages, because
   that is what the courier bills. Every state is a function of t, so the keyframes (stage 1) and
   the animation (stage 2) come from the same code. */

export const DURATION_S = 32;
export const TW = 1080, TH = 1920;
const ANCHOR = { x: 540, y: 1150 };
type Cam = { x: number; y: number; z: number; zoom: number };

/* ---------------------------------------------------------------- the packing table (1 unit = 5 cm) */
const T = { x0: 33, x1: 52.5, y0: 19, y1: 28, top: 9.5 };
const M = { x0: 33.4, y0: 24.2, w: 5, d: 3.6, h: 0.8 };           // mailer 25 x 18 x 4 cm: flat, a finger thick
const B = { x0: 46.3, y0: 22.9, w: 6, d: 5, h: 3 };               // box 30 x 25 x 15 cm
const SC = { x0: 38.7, y0: 19.6, w: 4.8, d: 3.8, h: 0.55 };       // scale at the back, display facing the viewer
const PR = 0.9, PH = 0.6;                                         // the product: a light tin, 9 cm across, 3 cm tall
const ON_TABLE: P3 = { x: 40.6, y: 26.0, z: T.top };
const ON_SCALE: P3 = { x: SC.x0 + SC.w / 2, y: SC.y0 + SC.d / 2, z: T.top + SC.h };
const IN_MAILER: P3 = { x: M.x0 + M.w / 2, y: M.y0 + M.d / 2, z: T.top + 0.12 };
const TAPE_HOME: P3 = { x: 43.0, y: 27.4, z: T.top };             // the coiled tape, in front between the two packages

const arc = (a: P3, b: P3, k: number, h: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) + Math.sin(Math.PI * clamp(k)) * h });
/** A set-down object: falls with weight, then two small rebounds. null before it appears. */
const drop = (t: number, land: number, from = 5) => {
  if (t < land - 0.4) return null;
  if (t < land) { const k = (t - (land - 0.4)) / 0.4; return from * (1 - k * k); }
  const u = t - land;
  return u > 0.6 ? 0 : 0.45 * Math.abs(Math.sin((Math.PI * u) / 0.22)) * Math.exp(-u * 7);
};

/* ---------------------------------------------------------------- timeline */
export const TL = {
  push: [0.3, 2.4] as [number, number], mailerLand: 1.2, boxLand: 1.5, prodLand: 1.85, tapeLand: 2.15,
  toScale: 5.3, onScale: 5.95, offScale: 8.9, close: 4.35,
  mL: 11.6, mW: 12.6, mH: 13.6, fM: [12.3, 13.3, 14.2, 14.8, 15.4], tapeIn: 16.6, mGone: 18.7,
  bL: 19.4, bW: 20.2, bH: 20.9, fB: [20.0, 20.7, 21.35, 21.7, 22.1], cmpA: 22.5, cmpB: 22.8, tapeIn2: 24.4,
  openM: 26.0, intoMailer: 26.3, inMailer: 27.15, closeM: 27.3, boxOut: 27.5,
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

/* ---------------------------------------------------------------- camera */
const CAM_WIDE: Cam = { x: 31, y: 18, z: 2, zoom: 1.05 };
const CAM_TABLE: Cam = { x: 42.2, y: 23.4, z: 9.0, zoom: 3.0 };
const CAM_SCALE: Cam = { x: 41.6, y: 23.0, z: 9.4, zoom: 3.3 };
const CAM_MAILER: Cam = { x: 38.6, y: 25.0, z: 8.2, zoom: 3.4 };
const CAM_BOX: Cam = { x: 46.6, y: 24.6, z: 8.0, zoom: 3.15 };
const CAM_END: Cam = { x: 37.4, y: 20.2, z: 9.0, zoom: 1.95 };
const lc = (a: Cam, b: Cam, k: number): Cam => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), zoom: lerp(a.zoom, b.zoom, k) });

function cameraAt(t: number): Cam {
  const keys: [number, Cam][] = [
    [TL.push[0], CAM_WIDE], [TL.push[1], CAM_TABLE], [5.0, { ...CAM_TABLE, zoom: 3.15 }], [5.8, CAM_SCALE], [10.6, { ...CAM_SCALE, zoom: 3.45 }],
    [11.4, CAM_MAILER], [18.6, { ...CAM_MAILER, zoom: 3.55, x: 38.9 }], [19.4, CAM_BOX], [22.75, { ...CAM_BOX, zoom: 3.33 }],
    [22.85, { ...CAM_BOX, zoom: 3.5, x: 46.2 }],                                // the halt: one sharp step in on the comparison
    [25.9, { ...CAM_BOX, zoom: 3.57, x: 46.2 }], [26.6, CAM_TABLE], [28.9, { ...CAM_TABLE, zoom: 3.15 }], [30.4, CAM_END], [32, { ...CAM_END, zoom: 1.88 }],
  ];
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i], [tb, b] = keys[i + 1];
    if (t <= tb) {
      const long = tb - ta > 1.5;   // holds drift with a gentle in-out, moves use the move curve
      return lc(a, b, (long ? (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x) : EASE_MOVE)(clamp((t - ta) / (tb - ta))));
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------------------------------------------------------------- measuring: edges and their numbers */
type Edge = { a: P3; b: P3; label: P3; text: string; start: number; end: number };
const mx1 = M.x0 + M.w, my1 = M.y0 + M.d, bx1 = B.x0 + B.w, by1 = B.y0 + B.d;
// mailer: L along the front edge (number in front), W along the left edge (number up-left), H up the front-left corner
// (number to its left). Box: L front (in front), W right edge (to its right), H front-left corner (to its left).
// Three numbers in three different places, none on top of the product or the other props.
export const EDGES: Edge[] = [
  { a: { x: M.x0, y: my1, z: T.top }, b: { x: mx1, y: my1, z: T.top }, label: { x: (M.x0 + mx1) / 2, y: my1 + 1.55, z: T.top }, text: "25", start: TL.mL, end: TL.mGone },
  { a: { x: M.x0, y: my1, z: T.top }, b: { x: M.x0, y: M.y0, z: T.top }, label: { x: M.x0 - 1.5, y: M.y0 + M.d / 2 - 1.1, z: T.top }, text: "18", start: TL.mW, end: TL.mGone },
  { a: { x: M.x0, y: my1, z: T.top }, b: { x: M.x0, y: my1, z: T.top + M.h }, label: { x: M.x0 - 1.3, y: my1 + 1.3, z: T.top + M.h / 2 }, text: "4", start: TL.mH, end: TL.mGone },
  { a: { x: B.x0, y: by1, z: T.top }, b: { x: bx1, y: by1, z: T.top }, label: { x: (B.x0 + bx1) / 2, y: by1 + 1.55, z: T.top }, text: "30", start: TL.bL, end: TL.openM - 0.2 },
  { a: { x: bx1, y: by1, z: T.top }, b: { x: bx1, y: B.y0, z: T.top }, label: { x: bx1 + 1.3, y: B.y0 + B.d / 2, z: T.top }, text: "25", start: TL.bW, end: TL.openM - 0.2 },
  { a: { x: B.x0, y: by1, z: T.top }, b: { x: B.x0, y: by1, z: T.top + B.h }, label: { x: B.x0 - 1.3, y: by1 + 1.6, z: T.top + B.h / 2 }, text: "15", start: TL.bH, end: TL.openM - 0.2 },
];

/* ---------------------------------------------------------------- state */
type St = {
  cam: Cam;
  mailer: { z: number; flap: number; on: boolean };
  box: { z: number; flaps: number; dy: number; on: boolean };
  prod: P3 | null; prodInMailer: boolean;
  tape: { at: P3; strip: null | { from: P3; to: P3 } } | null;
  display: string; displayLit: number;
};

const reading = (t: number) => {
  const on = TL.onScale, off = TL.offScale;
  if (t < on || t >= off + 0.25) return "0.000";
  if (t < on + 0.35) return (0.3 * EASE_APPEAR(clamp((t - on) / 0.35))).toFixed(3);
  if (t < off) return "0.300";
  return (0.3 * (1 - clamp((t - off) / 0.25))).toFixed(3);
};

export function stateAt(t: number): St {
  const cam = cameraAt(t);
  const mz = drop(t, TL.mailerLand), bz = drop(t, TL.boxLand), pz = drop(t, TL.prodLand, 4), tz = drop(t, TL.tapeLand, 3);
  // both packages arrive open and empty, close for measuring at the end of 2; the mailer opens again in 5
  const mFlap = (1 - ramp(t, TL.close, 0.4, EASE_MOVE)) + ramp(t, TL.openM, 0.3, EASE_MOVE) * (1 - ramp(t, TL.closeM, 0.4, EASE_MOVE));
  const bFlaps = 1 - ramp(t, TL.close + 0.1, 0.45, EASE_MOVE);
  // the one product: table -> scale -> table -> mailer
  let prod: P3 | null = pz === null ? null : { ...ON_TABLE, z: ON_TABLE.z + pz };
  if (t >= TL.toScale) prod = arc(ON_TABLE, ON_SCALE, EASE_MOVE(clamp((t - TL.toScale) / (TL.onScale - TL.toScale))), 2.2);
  if (t >= TL.offScale) prod = arc(ON_SCALE, ON_TABLE, EASE_MOVE(clamp((t - TL.offScale) / 0.6)), 2.0);
  if (t >= TL.intoMailer) prod = arc(ON_TABLE, IN_MAILER, EASE_MOVE(clamp((t - TL.intoMailer) / (TL.inMailer - TL.intoMailer))), 2.6);
  const prodInMailer = t >= TL.inMailer;
  // the empty box leaves to the left in 5
  const out = ramp(t, TL.boxOut, 1.1, EASE_MOVE);
  // the tape measure: comes to each edge, runs along it, winds back
  let tape: St["tape"] = tz === null ? null : { at: { ...TAPE_HOME, z: TAPE_HOME.z + tz }, strip: null };
  if (tape) {
    let prev: P3 = TAPE_HOME;
    for (let i = 0; i < EDGES.length; i++) {
      const e = EDGES[i];
      const wind = i === 2 ? TL.tapeIn : i === 5 ? TL.tapeIn2 : EDGES[i + 1].start - 0.2;
      const come = i % 3 === 0 ? e.start - 0.5 : e.start - 0.25;
      if (t >= come && t < e.start) tape = { at: arc(prev, e.a, EASE_MOVE(clamp((t - come) / (e.start - come))), i % 3 === 0 ? 1.2 : 0.3), strip: null };
      if (t >= e.start && t < wind + 0.35) {
        const k = EASE_MOVE(clamp((t - e.start) / 0.45)) * (1 - ramp(t, wind, 0.35, EASE_MOVE));
        tape = { at: e.a, strip: k > 0.001 ? { from: e.a, to: arc(e.a, e.b, k, 0) } : null };
      }
      if ((i === 2 || i === 5) && t >= wind + 0.35 && t < (i === 2 ? TL.bL - 0.5 : 1e9)) tape = { at: arc(e.a, TAPE_HOME, EASE_MOVE(clamp((t - wind - 0.35) / 0.5)), 1.2), strip: null };
      prev = i === 2 ? TAPE_HOME : e.a;
    }
  }
  return {
    cam,
    mailer: { z: mz ?? 0, flap: mFlap, on: mz !== null },
    box: { z: bz ?? 0, flaps: bFlaps, dy: 30 * out, on: bz !== null && out < 1 },
    prod, prodInMailer, tape,
    display: reading(t), displayLit: t >= TL.onScale && t < TL.offScale + 0.25 ? 1 : 0,
  };
}

/* ---------------------------------------------------------------- props */
const Table2: React.FC = () => {
  const legs: [number, number][] = [[T.x0 + 0.4, T.y0 + 0.4], [T.x1 - 1.2, T.y0 + 0.4], [T.x0 + 0.4, T.y1 - 1.2], [T.x1 - 1.2, T.y1 - 1.2]];
  return (
    <g>
      {legs.map(([x, y], i) => <Box key={i} x={x} y={y} z={0} w={0.8} d={0.8} h={T.top - 1} color={C.ink} line={false} />)}
      <Box x={T.x0} y={T.y0} z={T.top - 1} w={T.x1 - T.x0} d={T.y1 - T.y0} h={1} color={C.grey} top={mix(C.grey, C.ink, 0.04)} side={C.white} front={C.white} />
      {/* mint strip along the front edge: part of the furniture */}
      <polygon points={poly([[T.x0, T.y1, T.top - 0.42], [T.x1, T.y1, T.top - 0.42], [T.x1, T.y1, T.top], [T.x0, T.y1, T.top]])} fill={C.mint} {...LINE} />
      {/* tape dispenser, back left */}
      <Box x={T.x0 + 0.6} y={T.y0 + 0.6} z={T.top} w={3.2} d={2.2} h={0.8} color={C.ink} />
      <Cyl x={T.x0 + 2.2} y={T.y0 + 1.7} z={T.top + 0.8} r={1.05} h={1.0} color={C.white} topColor={C.white} />
      <ellipse cx={iso(T.x0 + 2.2, T.y0 + 1.7, T.top + 1.8).X} cy={iso(T.x0 + 2.2, T.y0 + 1.7, T.top + 1.8).Y} rx={4.2} ry={2.5} fill={C.grey} {...LINE} />
      {/* label printer, back right */}
      <Box x={T.x1 - 4.4} y={T.y0 + 0.4} z={T.top} w={3.6} d={2.9} h={2.6} color={C.white} />
      <polyline points={poly([[T.x1 - 0.8, T.y0 + 0.9, T.top + 1.8], [T.x1 - 0.8, T.y0 + 2.9, T.top + 1.8]])} stroke={C.ink} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

const Scale: React.FC<{ text: string; lit: number }> = ({ text, lit }) => {
  const { x0, y0, w, d, h } = SC;
  return (
    <g>
      <Box x={x0} y={y0} z={T.top} w={w} d={d} h={h} color={C.white} />
      <polygon points={poly([[x0 + 0.5, y0 + 0.5, T.top + h + 0.01], [x0 + w - 0.5, y0 + 0.5, T.top + h + 0.01], [x0 + w - 0.5, y0 + d - 0.5, T.top + h + 0.01], [x0 + 0.5, y0 + d - 0.5, T.top + h + 0.01]])} fill={C.grey} {...LINE} />
      <Box x={x0 + 0.1} y={y0 + d} z={T.top} w={w - 0.2} d={0.7} h={1.7} color={C.white} />
      <polygon points={poly([[x0 + 0.3, y0 + d + 0.7, T.top + 0.25], [x0 + w - 0.3, y0 + d + 0.7, T.top + 0.25], [x0 + w - 0.3, y0 + d + 0.7, T.top + 1.5], [x0 + 0.3, y0 + d + 0.7, T.top + 1.5]])} fill={C.ink} />
      {/* the reading: the one accent of scene 2, mint while the product is on the scale */}
      <FaceText x={x0 + w / 2} y={y0 + d + 0.7} z={T.top + 0.88} size={10} weight={600} color={mix(C.white, C.mint, lit)}>{text} kg</FaceText>
    </g>
  );
};

/** The product: light tin, Dock Green lid. */
const Product: React.FC<{ p: P3 }> = ({ p }) => (
  <g>
    <Cyl x={p.x} y={p.y} z={p.z} r={PR} h={PH - 0.2} color={C.white} topColor={C.white} />
    <Cyl x={p.x} y={p.y} z={p.z + PH - 0.22} r={PR + 0.05} h={0.22} color={C.green} topColor={C.green} />
  </g>
);

/** Flat padded mailer, Dock Green: sealed seam round the top, flap line across the right end;
 *  the flap lifts to open that end (dark mouth). */
const Mailer2: React.FC<{ x: number; y: number; z: number; flap: number }> = ({ x, y, z, flap }) => {
  const { w, d, h } = M;
  const fx = x + w - 1.1, lift = flap * 1.2;
  return (
    <g>
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={C.green} />
      <polygon points={poly([[x + 0.25, y + 0.25, z + h + 0.01], [fx, y + 0.25, z + h + 0.01], [fx, y + d - 0.25, z + h + 0.01], [x + 0.25, y + d - 0.25, z + h + 0.01]])} fill="none" stroke={mix(C.green, C.ink, 0.45)} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      {flap > 0.02 && <polygon points={poly([[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z + h + lift], [x + w, y, z + h + lift]])} fill={mix(C.green, C.ink, 0.65)} {...LINE} />}
      <polygon points={poly([[fx, y, z + h], [fx, y + d, z + h], [fx + 1.1, y + d, z + h + lift], [fx + 1.1, y, z + h + lift]])} fill={flap > 0.02 ? mix(C.green, C.ink, 0.08) : C.green} {...LINE} />
      <polyline points={poly([[fx, y, z + h], [fx, y + d, z + h]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

/** Box, Dock Green: two top flaps meeting on the centre seam; open, they stand up and the empty inside shows. */
const Box2: React.FC<{ x: number; y: number; z: number; flaps: number }> = ({ x, y, z, flaps }) => {
  const { w, d, h } = B;
  const g = C.green, top = z + h, f = flaps, hd = d / 2;
  const ang = (Math.PI * 2 / 3) * f, c = Math.cos(ang), s = Math.sin(ang);
  return (
    <g>
      {f > 0.02 && <polygon points={poly([[x, y, top], [x + w, y, top], [x + w, y + hd * c, top + hd * s], [x, y + hd * c, top + hd * s]])} fill={mix(g, C.ink, 0.2)} {...LINE} />}
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={g} top={f > 0.02 ? mix(g, C.ink, 0.55) : g} />
      {f > 0.02 && <>
        {/* inside walls of the empty box */}
        <polygon points={poly([[x + 0.15, y + 0.15, top], [x + w - 0.15, y + 0.15, top], [x + w - 0.15, y + 0.15, top - h * 0.5 * f], [x + 0.15, y + 0.15, top - h * 0.5 * f]])} fill={mix(g, C.ink, 0.35)} />
        <polygon points={poly([[x + 0.15, y + 0.15, top], [x + 0.15, y + d - 0.15, top], [x + 0.15, y + d - 0.15, top - h * 0.5 * f], [x + 0.15, y + 0.15, top - h * 0.5 * f]])} fill={mix(g, C.ink, 0.45)} />
        <polygon points={poly([[x, y + d, top], [x + w, y + d, top], [x + w, y + d - hd * c, top + hd * s], [x, y + d - hd * c, top + hd * s]])} fill={mix(g, C.ink, 0.06)} {...LINE} />
      </>}
      {f <= 0.02 && <>
        <polyline points={poly([[x, y + hd, top], [x + w, y + hd, top]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
        <polyline points={poly([[x + 0.25, y + 0.25, top], [x + w - 0.25, y + 0.25, top]])} stroke={mix(g, C.ink, 0.4)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
        <polyline points={poly([[x + 0.25, y + d - 0.25, top], [x + w - 0.25, y + d - 0.25, top]])} stroke={mix(g, C.ink, 0.4)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
      </>}
    </g>
  );
};

/** Tape measure: a round ink case with a white face; the strip is white with ink ticks. */
const Tape: React.FC<{ at: P3; strip: null | { from: P3; to: P3 } }> = ({ at, strip }) => (
  <g>
    {strip && (() => {
      const { from, to } = strip;
      const n = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / 0.5));
      const vert = Math.abs(to.z - from.z) > 0.01;
      const off = vert ? { x: -0.3, y: 0.3, z: 0 } : Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? { x: 0, y: 0.3, z: 0 } : { x: 0.3, y: 0, z: 0 };
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
    <Cyl x={at.x} y={at.y} z={at.z} r={0.75} h={0.55} color={C.ink} topColor={C.ink} />
    <ellipse cx={iso(at.x, at.y, at.z + 0.56).X} cy={iso(at.x, at.y, at.z + 0.56).Y} rx={7} ry={4} fill={C.white} stroke={C.ink} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
  </g>
);

/* ---------------------------------------------------------------- screen-space type */
const sc = (cam: Cam, p: P3) => { const c = iso(cam.x, cam.y, cam.z), q = iso(p.x, p.y, p.z); return { x: ANCHOR.x + (q.X - c.X) * cam.zoom, y: ANCHOR.y + (q.Y - c.Y) * cam.zoom }; };

/** Headline in the top third. `at` lets a still show a headline settled (stage 1 review). */
const Headline: React.FC<{ t: number; settled?: boolean }> = ({ t, settled }) => (
  <>
    {HEADLINES.map(([a, b, text], idx) => {
      const show = settled ? (t >= a && t < b) || (idx === 0 && t < a) : t >= a && t <= b + 0.3;
      if (!show) return null;
      const out = settled || b >= DURATION_S ? 0 : ramp(t, b - 0.05, 0.3, EASE_MOVE);
      const words = text.split(" ");
      const drift = settled ? 0 : (t - a) / Math.max(1, b - a);
      return (
        <div key={a} style={{ position: "absolute", left: 80, right: 80, top: 190, transform: `translateY(${-12 * drift - out * 40}px)`, opacity: 1 - out }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 92, lineHeight: 1.04, letterSpacing: "-0.035em", color: C.ink }}>
            {words.map((w, i) => {
              const k = settled ? 1 : ramp(t, a + i * 0.075, 0.45, EASE_APPEAR);
              return <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 8, marginBottom: -8 }}><span style={{ display: "inline-block", transform: `translateY(${(1 - k) * 105}%)` }}>{w}{i < words.length - 1 ? " " : ""}</span></span>;
            })}
          </div>
        </div>
      );
    })}
  </>
);

/** Formula card under the scene: terms appear in order, the result last. */
const Formula: React.FC<{ t: number; terms: string[]; at: number[]; y: number; dim: number }> = ({ t, terms, at, y, dim }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, height: 84, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `6px 6px 0 ${C.ink}`, opacity: ramp(t, at[0] - 0.1, 0.3), fontFamily: FONT.display, fontWeight: 700, fontSize: 54, letterSpacing: "-0.02em", color: mix(C.ink, C.grey, 0.55 * dim) }}>
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
      return <div key={a} style={{ position: "absolute", left: 120, right: 120, bottom: 250, textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: C.ink, opacity: k * (1 - o), transform: `translateY(${(1 - k) * 14 - o * 20}px)`, background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: "8px 18px" }}>{text}</div>;
    })}
  </>
);

/** One measured edge: the edge is outlined, the number rides out from it to its place, a short leader stays. */
const EdgeMark: React.FC<{ cam: Cam; e: Edge; t: number }> = ({ cam, e, t }) => {
  const k = ramp(t, e.start + 0.4, 0.45, EASE_APPEAR), out = ramp(t, e.end, 0.3, EASE_MOVE);
  const hl = ramp(t, e.start, 0.3) * (1 - out);
  if (hl <= 0.001) return null;
  const a = sc(cam, e.a), b = sc(cam, e.b), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, lab = sc(cam, e.label);
  const p = { x: lerp(mid.x, lab.x, k), y: lerp(mid.y, lab.y, k) };
  return (
    <>
      <svg width={TW} height={TH} style={{ position: "absolute", inset: 0 }}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.white} strokeWidth={11} strokeLinecap="round" opacity={hl} />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={hl} />
        {k > 0.05 && <line x1={mid.x} y1={mid.y} x2={p.x} y2={p.y} stroke={C.ink} strokeWidth={2.5} opacity={1 - out} />}
        {k > 0.05 && <circle cx={mid.x} cy={mid.y} r={5} fill={C.ink} opacity={1 - out} />}
      </svg>
      {k > 0.02 && (
        <div style={{ position: "absolute", left: p.x - 50, top: p.y - 30, width: 100, textAlign: "center", opacity: Math.min(1, k * 1.5) * (1 - out) }}>
          <span style={{ display: "inline-block", background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 12, padding: "2px 14px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 40, color: C.ink }}>{e.text}</span>
        </div>
      )}
    </>
  );
};

/* ---------------------------------------------------------------- the frame */
const ROOM_STATE: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: { x: RECV.x0 + 1, y: RECV.y1 - 0.2 - BIN.d, z: RECV.top - BIN.h - 0.3, hooked: true }, highlightCells: false };

export const TwoBoxesScene: React.FC<{ t: number; cues?: [number, number, string][]; settled?: boolean }> = ({ t, cues = [], settled }) => {
  const s = stateAt(t);
  const c = iso(s.cam.x, s.cam.y, s.cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${s.cam.zoom}) translate(${-c.X} ${-c.Y})`;
  const fm = TL.fM, fb = TL.fB;
  const cmp = ramp(t, TL.cmpA, 0.35), cmpB = ramp(t, TL.cmpB, 0.3, EASE_APPEAR);
  const cmpOut = ramp(t, TL.openM - 0.2, 0.35, EASE_MOVE);
  const logoK = EASE_LOGO(clamp((t - TL.logo) / 0.6));
  const mask = `linear-gradient(45deg, #000 ${-20 + logoK * 140}%, transparent ${-20 + logoK * 140 + 1}%)`;   // diagonal fill, bottom to top
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      <svg width={TW} height={TH} style={{ position: "absolute", inset: 0 }}>
        <g transform={tf}>
          <Room s={ROOM_STATE} bare noStand />
          <Table2 />
          <Scale text={s.display} lit={s.displayLit} />
          {s.mailer.on && <Mailer2 x={M.x0} y={M.y0} z={T.top + s.mailer.z} flap={s.mailer.flap} />}
          {s.prod && !s.prodInMailer && <Product p={s.prod} />}
          {s.tape && <Tape at={s.tape.at} strip={s.tape.strip} />}
          {s.box.on && <Box2 x={B.x0} y={B.y0 + s.box.dy} z={T.top + s.box.z + Math.sin(Math.PI * clamp(s.box.dy / 30)) * 0.6} flaps={s.box.flaps} />}
        </g>
      </svg>
      {EDGES.map((e, i) => <EdgeMark key={i} cam={s.cam} e={e} t={t} />)}
      {t >= fm[0] && t < TL.openM + 0.3 && <Formula t={t} terms={["25 ×", "18 ×", "4", "÷ 5000", "= 0.36 kg"]} at={fm} y={1352} dim={Math.max(ramp(t, fb[0], 0.4), cmpOut)} />}
      {t >= fb[0] && t < TL.openM + 0.3 && <Formula t={t} terms={["30 ×", "25 ×", "15", "÷ 5000", "= 2.25 kg"]} at={fb} y={1446} dim={cmpOut} />}
      {/* the comparison: the one figure that stops the rhythm, inside the safe zone */}
      {cmp > 0 && cmpOut < 1 && (
        <div style={{ position: "absolute", right: 150, top: 500, width: 320, opacity: cmp * (1 - cmpOut), transform: `translateX(${(1 - cmp) * 40}px)` }}>
          <div style={{ background: C.white, border: `2.5px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: "20px 24px" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.1em", color: C.ink, opacity: 0.75 }}>MAILER</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 62, letterSpacing: "-0.03em", color: C.ink }}>0.36 kg</div>
            <div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.1em", color: C.ink, opacity: 0.75 * cmpB }}>BOX</div>
            <div style={{ display: "inline-block", opacity: cmpB, background: C.mint, borderRadius: 12, padding: "0 12px", marginLeft: -12, transform: `scale(${1.05 - 0.05 * EASE_APPEAR(clamp((t - TL.cmpB - 0.15) / 0.5))})`, transformOrigin: "0 50%", fontFamily: FONT.display, fontWeight: 800, fontSize: 62, letterSpacing: "-0.03em", color: C.ink }}>2.25 kg</div>
          </div>
        </div>
      )}
      {/* the top third stays clear for the headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 470, background: `linear-gradient(180deg, ${C.grey} 0%, ${C.grey} 78%, ${C.grey}00 100%)` }} />
      <Headline t={t} settled={settled} />
      {/* end: logo and url in the free lower third, on the floor in front of the table */}
      {t >= TL.logo - 0.05 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1420, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 250, WebkitMaskImage: mask, maskImage: mask }}><Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} /></div>
          <div style={{ marginTop: 14, fontFamily: FONT.display, fontWeight: 800, fontSize: 56, color: C.ink, opacity: ramp(t, TL.logo + 0.3, 0.4), transform: `translateY(${(1 - ramp(t, TL.logo + 0.3, 0.4)) * 16}px)` }}>dockentra.ie</div>
        </div>
      )}
      <Subs t={t} cues={cues} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- stage 1: keyframes */
export const KEYFRAMES: { t: number; label: string }[] = [
  { t: 0.0, label: "0:00 wide, the warehouse" },
  { t: 3.0, label: "0:03 one product, two empty packages" },
  { t: 8.0, label: "0:08 the scale agrees" },
  { t: 16.0, label: "0:16 the empty mailer is measured" },
  { t: 23.0, label: "0:23 the empty box is measured" },
  { t: 27.0, label: "0:27 into the mailer" },
  { t: 31.0, label: "0:31 measure yours" },
];
/** Voice lines as subtitles, placed for the keyframes only (real timing comes from the synthesis).
 *  Lines that repeat the headline word for word are not subtitled. */
export const DRAFT_CUES: [number, number, string][] = [
  [5.0, 10.8, "Your courier bills whichever is bigger: the actual weight, or the volumetric one."],
  [11.0, 15.0, "Length times width times height, divided by five thousand."],
  [15.0, 18.8, "In the mailer that's zero point three six kilos."],
  [19.0, 22.6, "In the box, two point two five."],
];
/** Stage-1 stills: every headline shown settled, as it stands for most of its time on screen. */
export const TwoBoxesKeyframe: React.FC<{ i: number }> = ({ i }) => <TwoBoxesScene t={KEYFRAMES[i].t} cues={DRAFT_CUES} settled />;
