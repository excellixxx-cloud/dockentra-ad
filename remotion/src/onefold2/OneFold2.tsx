/* "One fold" v2 — one shape travels the whole film: a full stop → a square → a parcel → an isometric box →
   an order card → folded along the logo's own 45° ramp line into the Dockentra mark.
   15 s, 1080x1920, 30 fps, silent. One typeface (Manrope 800 / 500). Everything is a function of T (seconds),
   so every frame is seek-safe.
     0–3   kinetic type      "Orders in. Boxes out."      the full stop grows into a Dock Green square
     3–6   shape morphing    "Photographed on arrival."   square → parcel, mint scan line, flash, thumbnail
     6–9   2D → 3D           "Picked. Packed. Labelled."  parcel unfolds into an iso box, camera pulls back to the warehouse
     9     the one hard whip-pan
     9–12  data / UI         "Every order, tracked."      order card, stepper, cursor; highlight rests on Picked
     12–15 signature         the card folds on the ramp line into the mark; logo fill; end title */
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_MOVE, clamp, lerp, ramp } from "../brand";
import { Box, Cyl, LINE, S, iso, mix, poly } from "../warehouse/iso";
import { CAGE, DOOR, PACK, RECV, ROOM, SHELF } from "../warehouse/Room";
import { LOGO } from "./logo";

export const TOTAL = 15;
const F = "Manrope";
const HAIR = "rgba(11,13,16,0.14)";
const C30 = Math.cos(Math.PI / 6);

/* ---------------------------------------------------------------- font */
let fontP: Promise<void> | null = null;
const useFont = () => {
  const [h] = useState(() => delayRender("Manrope"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontP ??= new FontFace(F, `url(${staticFile("fonts/Manrope-800.woff2")}) format("woff2")`, { weight: "200 800" }).load().then((f) => { document.fonts.add(f); });
    fontP.then(() => { setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};
let mctx: CanvasRenderingContext2D | null = null;
const tw = (s: string, size: number, weight = 800, ls = -0.035) => {
  mctx ??= document.createElement("canvas").getContext("2d");
  mctx!.font = `${weight} ${size}px ${F}`;
  return mctx!.measureText(s).width + ls * size * s.length;
};

/* ---------------------------------------------------------------- motion: three easing profiles + one spring */
/** the one spring: 0 → 1.05 → 1.0 */
const spring = (T: number, a: number, d = 0.45) => {
  const k = clamp((T - a) / d);
  return k < 0.65 ? 1.05 * EASE_APPEAR(k / 0.65) : lerp(1.05, 1, EASE_MOVE((k - 0.65) / 0.35));
};
const EASE_IN = (x: number) => x * x * x;
const bump = (T: number, at: number, w: number) => Math.exp(-Math.pow((T - at) / w, 2));
const wob = (T: number, per: number, ph = 0) => Math.sin((2 * Math.PI * T) / per + ph);
type P = [number, number];
const lp = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/* ---------------------------------------------------------------- headline: words one by one (75 ms), lift away on exit */
const HX = 90, HY = 300;
const Headline: React.FC<{ T: number; a: number; b: number; lines: string[]; size?: number; color?: string; dotAfter?: boolean }> = ({ T, a, b, lines, size = 132, color = C.ink }) => {
  let i = 0;
  const n = lines.join(" ").split(" ").length;
  if (T < a - 0.05 || T > b + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: HX, top: HY }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: F, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", whiteSpace: "nowrap", color }}>
          {ln.split(" ").map((w, k, arr) => {
            const j = i++;
            const p = ramp(T, a + j * 0.075, 0.45, EASE_APPEAR);
            const q = ramp(T, b + (n - 1 - j) * 0.04, 0.3, EASE_MOVE);
            return <span key={k} style={{ display: "inline-block", opacity: Math.min(1, p * 1.6) * (1 - q), transform: `translateY(${(1 - p) * 0.5 * size - q * 0.6 * size}px)`, marginRight: k < arr.length - 1 ? "0.24em" : 0 }}>{w}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

/* ================================================================ beats 1–2: full stop → square → parcel */
const H1 = 150;                                 // headline 1 size
const PARCEL = { x: 240, y: 920, w: 600, h: 460 };
const SQUARE = { x: 280, y: 890, w: 520, h: 520 };
const Shape: React.FC<{ T: number }> = ({ T }) => {
  if (T >= 6.0) return null;
  // the full stop sits on the baseline right after "out"
  const dot = { w: 0.2 * H1, x: HX + tw("Boxes out", H1) + 0.045 * H1, y: HY + 1.04 * H1 + 0.903 * H1 - 0.2 * H1 };
  const pIn = ramp(T, 0.2 + 3 * 0.075 + 0.12, 0.4, EASE_APPEAR);
  const pulse = 1 + 0.5 * bump(T, 1.12, 0.09);
  const g = ramp(T, 1.3, 1.25, EASE_MOVE);       // grow + travel (x and y on different curves → an arc)
  const gy = Math.pow(g, 1.7);
  const set = 1 + 0.04 * bump(T, 2.56, 0.09);
  const m = spring(T, 2.8, 0.6);                  // square → parcel
  const sq = { x: lerp(dot.x, SQUARE.x, g), y: lerp(dot.y, SQUARE.y, gy), w: lerp(dot.w, SQUARE.w, g) };
  const r = { x: lerp(sq.x, PARCEL.x, m), y: lerp(sq.y, PARCEL.y, m), w: lerp(sq.w, PARCEL.w, m), h: lerp(sq.w, PARCEL.h, m) };
  const col = mix(C.ink, C.green, ramp(T, 1.3, 0.7, EASE_MOVE));
  const det = ramp(T, 3.15, 0.4, EASE_APPEAR);    // tape + label
  const drift = T > 3.4 ? 8 * wob(T, 3.2) : 0;
  const sc = (g > 0 ? set : pulse) * (pIn < 1 ? pIn : 1);
  // scan, flash, thumbnail
  const scan = ramp(T, 3.75, 0.85, EASE_MOVE);
  const flash = bump(T, 4.68, 0.07);
  const br = ramp(T, 3.3, 0.45, EASE_APPEAR), brOut = ramp(T, 5.45, 0.35, EASE_MOVE);
  const brPad = lerp(120, 34, br) + 26 * flash + brOut * 90;
  const th = spring(T, 4.78, 0.5), thBack = ramp(T, 5.5, 0.4, EASE_MOVE);
  const thC: P = lp(lp([540, 1150], [846, 902], Math.min(1, th)), [745, 1300], thBack);
  const thS = th * lerp(1, 0.28, thBack);
  const ck = spring(T, 5.12, 0.4) * (1 - thBack);
  const bx = r.x - brPad, by = r.y - brPad + drift, bw = r.w + 2 * brPad, bh = r.h + 2 * brPad, L = 54;
  return (
    <>
      <div style={{ position: "absolute", left: r.x, top: r.y + drift, width: r.w, height: r.h, background: col, borderRadius: 14 * clamp(m), transform: `scale(${sc})`, overflow: "hidden" }}>
        {det > 0 && <>
          <div style={{ position: "absolute", left: "44%", width: "12%", top: 0, height: `${det * 100}%`, background: mix(C.green, C.ink, 0.28) }} />
          <div style={{ position: "absolute", right: 34, bottom: 34, width: 190, height: 112, background: C.white, borderRadius: 6, transform: `scale(${spring(T, 3.3, 0.45)})`, transformOrigin: "100% 100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            {[5, 9, 4, 7, 4, 10, 5, 8].map((w, i) => <div key={i} style={{ width: w, height: 64, background: C.ink }} />)}
          </div>
        </>}
        {scan > 0 && scan < 1 && <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${scan * 100}%`, background: "linear-gradient(to bottom, rgba(79,220,169,0) 55%, rgba(79,220,169,0.38) 100%)" }} />
        </>}
        <div style={{ position: "absolute", inset: 0, background: C.white, opacity: flash * 0.9 }} />
      </div>
      {/* the mint scan line: the one accent of the scene */}
      {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: r.x - 46, width: r.w + 92, top: r.y + drift + scan * r.h - 4, height: 8, borderRadius: 4, background: C.mint }} />}
      {/* viewfinder corners */}
      {br > 0 && brOut < 1 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: Math.min(1, br * 2) * (1 - brOut) }}>
          {[[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M${x + sx * L} ${y} H${x} V${y + sy * L}`} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
      )}
      {/* photo thumbnail pops into the corner, later slips back into the label */}
      {th > 0 && thBack < 1 && (
        <div style={{ position: "absolute", left: thC[0] - 115, top: thC[1] - 115 + drift, width: 230, height: 230, background: C.white, border: `1px solid ${HAIR}`, borderRadius: 8, transform: `scale(${thS}) rotate(${lerp(-10, 5, Math.min(1, th))}deg)`, boxShadow: "0 18px 40px -18px rgba(11,13,16,0.35)" }}>
          <div style={{ position: "absolute", left: 16, top: 16, right: 16, bottom: 16, background: C.grey, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 130, height: 100, background: C.green, borderRadius: 5, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: "44%", width: "12%", top: 0, bottom: 0, background: mix(C.green, C.ink, 0.28) }} />
              <div style={{ position: "absolute", right: 8, bottom: 8, width: 40, height: 24, background: C.white, borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ position: "absolute", right: -22, top: -22, width: 64, height: 64, borderRadius: 32, background: C.ink, transform: `scale(${ck})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={34} height={34} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================ beat 3: parcel → iso box → the warehouse */
const HERO = { w: 5.2, d: 3.6, h: 4.0 };
const Z0 = 8.5, Z1 = 0.94;
const CAM0: P = [540, 1150], CAM1: P = [540, 1215];
const START = { x: 30, y: 22, z: 12 };                                   // where the box hangs when it becomes 3D
const SLOT = { x: SHELF.x0 + 3.4, y: SHELF.y0 + 0.9, z: SHELF.levels[1] + 0.5 };   // empty cell on the middle shelf
const ROOM_C = iso(ROOM.W / 2, ROOM.D / 2, ROOM.H / 2);
const camAt = (T: number) => {
  const e = ramp(T, 6.45, 1.3, EASE_MOVE);
  const z = Z0 * Math.pow(Z1 / Z0, e) * (1 + 0.035 * ramp(T, 7.75, 1.3, EASE_MOVE));     // pull back, then a slow push-in
  const hc = iso(START.x + HERO.w / 2, START.y + HERO.d / 2, START.z + HERO.h / 2);
  const f: P = lp([hc.X, hc.Y], [ROOM_C.X, ROOM_C.Y], e);
  const c: P = lp(CAM0, CAM1, e);
  return { z, f, c, e };
};
const heroAt = (T: number) => {
  const k = ramp(T, 7.05, 0.95, EASE_MOVE);
  const land = bump(T, 8.03, 0.07);
  return { x: lerp(START.x, SLOT.x, k), y: lerp(START.y, SLOT.y, k), z: lerp(START.z, SLOT.z, k) + 7 * Math.sin(Math.PI * k), k, land };
};
const Hero: React.FC<{ T: number }> = ({ T }) => {
  const cam = camAt(T), h = heroAt(T);
  const m = ramp(T, 6.0, 0.6, EASE_MOVE);                                // flat → isometric
  const u = S * cam.z;
  const o = iso(h.x, h.y, h.z);
  const O1: P = [cam.c[0] + (o.X - cam.f[0]) * cam.z, cam.c[1] + (o.Y - cam.f[1]) * cam.z];
  const kf = PARCEL.w / HERO.w;
  const ex = lp([kf, 0], [C30 * u, 0.5 * u], m), ey = lp([0, 0], [-C30 * u, 0.5 * u], m), ez = lp([0, -kf], [0, -u * (1 - 0.1 * h.land)], m);
  // flat state: the y = d face is the parcel rectangle
  const O: P = lp([PARCEL.x, PARCEL.y + PARCEL.h], O1, m);
  const yOff = m < 1 ? lerp(-HERO.d, 0, m) : 0;                           // so that the front face stays put while depth grows
  const pt = (x: number, y: number, z: number): P => [O[0] + x * ex[0] + (y + yOff) * ey[0] + z * ez[0], O[1] + x * ex[1] + (y + yOff) * ey[1] + z * ez[1]];
  const pg = (pts: P[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const { w, d, h: hh } = HERO;
  const G = C.green, tape = mix(C.green, C.ink, 0.28);
  const st = { stroke: C.ink, strokeWidth: 2 * Math.min(1, m * 3), strokeLinejoin: "round" as const };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <polygon points={pg([pt(w, 0, 0), pt(w, d, 0), pt(w, d, hh), pt(w, 0, hh)])} fill={mix(G, C.ink, 0.12)} {...st} />
      <polygon points={pg([pt(0, 0, hh), pt(w, 0, hh), pt(w, d, hh), pt(0, d, hh)])} fill={mix(G, C.white, 0.1)} {...st} />
      <polygon points={pg([pt(w * 0.44, 0, hh), pt(w * 0.56, 0, hh), pt(w * 0.56, d, hh), pt(w * 0.44, d, hh)])} fill={tape} />
      <polygon points={pg([pt(0, d, 0), pt(w, d, 0), pt(w, d, hh), pt(0, d, hh)])} fill={G} {...st} />
      <polygon points={pg([pt(w * 0.44, d, 0), pt(w * 0.56, d, 0), pt(w * 0.56, d, hh), pt(w * 0.44, d, hh)])} fill={tape} />
      <polygon points={pg([pt(w - 1.94, d, 0.3), pt(w - 0.3, d, 0.3), pt(w - 0.3, d, 1.27), pt(w - 1.94, d, 1.27)])} fill={C.white} />
      {[0.16, 0.28, 0.38, 0.5, 0.6, 0.74, 0.84].map((k, i) => (
        <polyline key={i} points={pg([pt(w - 1.94 + 1.64 * k, d, 0.5), pt(w - 1.94 + 1.64 * k, d, 1.07)])} stroke={C.ink} strokeWidth={Math.max(1.2, (i % 2 ? 0.06 : 0.09) * Math.hypot(ex[0], ex[1]))} fill="none" />
      ))}
    </svg>
  );
};

const Shelving: React.FC = () => {
  const { x0, bay, y0, y1, levels, top } = SHELF, G = C.green;
  const stock = [[3, 0, 2], [2, 3, 1]];                                   // boxes per cell; the middle-left cell is free for our box
  return (
    <g>
      {[0, 1, 2].map((b) => <Box key={b} x={x0 + b * bay - 0.3} y={y0} z={0} w={0.6} d={0.6} h={top} color={G} line={false} />)}
      {levels.concat(top).map((z, li) => [0, 1].map((b) => <Box key={`${li}${b}`} x={x0 + b * bay} y={y0} z={z} w={bay} d={y1 - y0} h={0.5} color={C.grey} top={C.white} />))}
      {levels.map((z, li) => [0, 1].map((b) => Array.from({ length: stock[b][li] }, (_, k) => <Box key={`${li}${b}${k}`} x={x0 + b * bay + 0.6 + k * 3.8} y={y0 + 0.8} z={z + 0.5} w={3.4} d={4.6} h={4.6} color={G} />)))}
      {[0, 1, 2].map((b) => <Box key={b} x={x0 + b * bay - 0.3} y={y1 - 0.6} z={0} w={0.6} d={0.6} h={top + 0.5} color={G} />)}
      {levels.map((z, li) => [0, 1].map((b) => <Box key={`${li}${b}`} x={x0 + b * bay} y={y1 - 0.6} z={z - 0.2} w={bay} d={0.6} h={0.7} color={G} />))}
    </g>
  );
};
const Table: React.FC<{ t: { x0: number; x1: number; y0: number; y1: number; top: number }; edge?: boolean }> = ({ t, edge }) => (
  <g>
    {[[t.x0 + 0.4, t.y0 + 0.4], [t.x1 - 1.2, t.y0 + 0.4], [t.x0 + 0.4, t.y1 - 1.2], [t.x1 - 1.2, t.y1 - 1.2]].map(([x, y], i) => <Box key={i} x={x} y={y} z={0} w={0.8} d={0.8} h={t.top - 1} color={C.ink} line={false} />)}
    <Box x={t.x0} y={t.y0} z={t.top - 1} w={t.x1 - t.x0} d={t.y1 - t.y0} h={1} color={C.grey} top={C.grey} side={C.white} front={C.white} />
    {/* the 8 mm mint edge stripe of the receiving table: the one accent of the scene */}
    {edge && <polygon points={poly([[t.x0, t.y1, t.top - 0.42], [t.x1, t.y1, t.top - 0.42], [t.x1, t.y1, t.top], [t.x0, t.y1, t.top]])} fill={C.mint} {...LINE} />}
  </g>
);
const Cage: React.FC<{ y0: number }> = ({ y0 }) => {
  const { x0, w, d, h } = CAGE, z0 = 1;
  const post = (x: number, y: number, sw = 2.5) => <polyline points={poly([[x, y, z0], [x, y, z0 + h]])} stroke={C.ink} strokeWidth={sw} fill="none" vectorEffect="non-scaling-stroke" />;
  return (
    <g>
      {[[x0 + 0.6, y0 + 0.6], [x0 + w - 0.6, y0 + 0.6], [x0 + 0.6, y0 + d - 0.6], [x0 + w - 0.6, y0 + d - 0.6]].map(([x, y], i) => { const p = iso(x, y, 0.5); return <circle key={i} cx={p.X} cy={p.Y} r={5} fill={C.ink} />; })}
      <Box x={x0} y={y0} z={z0 - 0.4} w={w} d={d} h={0.4} color={C.ink} line={false} />
      <Box x={x0 + 0.6} y={y0 + 0.6} z={z0} w={3.4} d={3} h={3} color={C.green} />
      <Box x={x0 + 4.2} y={y0 + 0.8} z={z0} w={3} d={2.8} h={2.4} color={C.green} />
      <Box x={x0 + 0.8} y={y0 + 3.6} z={z0} w={4.6} d={3} h={0.7} color={C.white} />
      <Box x={x0 + 1.2} y={y0 + 3.4} z={z0 + 0.7} w={4.6} d={3} h={0.7} color={C.white} />
      {Array.from({ length: 7 }, (_, i) => <g key={`a${i}`} opacity={0.55}>{post(x0 + (w * (i + 1)) / 8, y0 + d, 1.2)}</g>)}
      {Array.from({ length: 6 }, (_, i) => <g key={`b${i}`} opacity={0.55}>{post(x0 + w, y0 + (d * (i + 1)) / 7, 1.2)}</g>)}
      {post(x0, y0)}{post(x0 + w, y0)}{post(x0, y0 + d)}{post(x0 + w, y0 + d)}
      <polygon points={poly([[x0, y0, z0 + h], [x0 + w, y0, z0 + h], [x0 + w, y0 + d, z0 + h], [x0, y0 + d, z0 + h]])} fill="none" stroke={C.ink} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      <polyline points={poly([[x0, y0 + d, z0 + h / 2], [x0 + w, y0 + d, z0 + h / 2], [x0 + w, y0, z0 + h / 2]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};
/** the same small warehouse as in every Dockentra film; each fixture rises into place while the camera pulls back */
const Warehouse: React.FC<{ T: number }> = ({ T }) => {
  const cam = camAt(T);
  const { W, D, H } = ROOM;
  const up = (i: number) => { const p = ramp(T, 6.5 + i * 0.09, 0.5, EASE_APPEAR); return { transform: `translate(0 ${(1 - p) * 46})`, opacity: Math.min(1, p * 2.5) }; };
  const fl = ramp(T, 6.25, 0.6, EASE_APPEAR);                           // the floor spreads out from under the box
  const hc = iso(START.x + HERO.w / 2, START.y + HERO.d / 2, 0);
  const wall = (pts: [number, number, number][], fill: string) => <polygon points={poly(pts)} fill={fill} {...LINE} />;
  const printer = ramp(T, 8.1, 0.5, EASE_APPEAR);
  const cy = CAGE.y0 - 1.6 * ramp(T, 8.2, 0.7, EASE_MOVE);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${cam.c[0]} ${cam.c[1]}) scale(${cam.z}) translate(${-cam.f[0]} ${-cam.f[1]})`}>
        <g transform={`translate(${hc.X} ${hc.Y}) scale(${fl}) translate(${-hc.X} ${-hc.Y})`}>
          {wall([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]], C.white)}
          {Array.from({ length: 4 }, (_, i) => <polyline key={i} points={poly([[0, 8 * (i + 1), 0], [W, 8 * (i + 1), 0]])} stroke={mix(C.grey, C.ink, 0.1)} strokeWidth={1.5} fill="none" />)}
        </g>
        <g {...up(0)}>
          {wall([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]], mix(C.grey, C.ink, 0.07))}
          {wall([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], mix(C.grey, C.ink, 0.02))}
          {wall([[DOOR.x0, 0, 0], [DOOR.x1, 0, 0], [DOOR.x1, 0, DOOR.h], [DOOR.x0, 0, DOOR.h]], C.ink)}
          <polygon points={poly([[DOOR.x0, 0, DOOR.h * DOOR.open], [DOOR.x1, 0, DOOR.h * DOOR.open], [DOOR.x1, 0, DOOR.h], [DOOR.x0, 0, DOOR.h]])} fill={C.grey} {...LINE} />
          {Array.from({ length: 6 }, (_, i) => { const z = DOOR.h * DOOR.open + ((DOOR.h * (1 - DOOR.open)) / 6) * (i + 0.5); return <polyline key={i} points={poly([[DOOR.x0, 0, z], [DOOR.x1, 0, z]])} stroke={C.ink} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />; })}
        </g>
        <g {...up(1)}><Shelving /></g>
        <g {...up(2)}><Cage y0={cy} /></g>
        <g {...up(3)}><Table t={RECV} edge /></g>
        <g {...up(4)}>
          <Table t={PACK} />
          {[0, 0.7, 1.4].map((z) => <Box key={z} x={PACK.x0 + 1} y={PACK.y1 - 4.2} z={PACK.top + z} w={5} d={3.6} h={0.7} color={C.white} />)}
          <Box x={PACK.x0 + 1.2} y={PACK.y0 + 0.8} z={PACK.top} w={3.6} d={2.6} h={0.8} color={C.ink} />
          <Cyl x={PACK.x0 + 3} y={PACK.y0 + 2.1} z={PACK.top + 0.8} r={1.25} h={1.3} color={C.white} topColor={C.white} />
          <Box x={PACK.x0 + 7} y={PACK.y0 + 1.2} z={PACK.top} w={5.4} d={4.6} h={0.9} color={C.white} />
          <Box x={PACK.x1 - 5} y={PACK.y0 + 1} z={PACK.top} w={4} d={4} h={3.2} color={C.white} />
          {printer > 0.01 && <polygon points={poly([[PACK.x1 - 1, PACK.y0 + 1.8, PACK.top + 2.2], [PACK.x1 - 1 + 2.6 * printer, PACK.y0 + 1.8, PACK.top + 2.2 - 0.8 * printer], [PACK.x1 - 1 + 2.6 * printer, PACK.y0 + 4.2, PACK.top + 2.2 - 0.8 * printer], [PACK.x1 - 1, PACK.y0 + 4.2, PACK.top + 2.2]])} fill={C.white} {...LINE} />}
        </g>
        <g {...up(5)}>
          <Box x={1.5} y={30} z={0} w={8} d={8} h={1.2} color={C.white} />
          {[[1.8, 30.3], [5.7, 30.3], [1.8, 34.2], [5.7, 34.2]].map(([x, y], i) => <Box key={i} x={x} y={y} z={1.2} w={3.8} d={3.8} h={3.6} color={C.green} />)}
          {[[1.8, 30.3], [5.7, 30.3], [1.8, 34.2]].map(([x, y], i) => <Box key={i} x={x} y={y} z={4.8} w={3.8} d={3.8} h={3.6} color={C.green} />)}
        </g>
      </g>
    </svg>
  );
};

/* ================================================================ beat 4: the order card */
const CARD = { x: 90, y: 660, w: 900, h: 820 };
const STEPS = ["Created", "Reserved", "Picked", "Packed", "Shipped"];
const rowY = (i: number) => CARD.y + 240 + i * 118;
const NODE_X = CARD.x + 78;
const STEP_T = [9.55, 10.15, 10.75];
const DMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size * 0.96} height={size} viewBox="0 0 96 100">
    <defs>
      <linearGradient id="tg" x1="2" y1="100" x2="88" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#0A2C26" /><stop offset=".30" stopColor="#123E36" /><stop offset=".62" stopColor="#14806A" /><stop offset=".84" stopColor="#189C7E" /><stop offset="1" stopColor="#0C7261" /></linearGradient>
      <linearGradient id="tr" x1="6" y1="95" x2="76" y2="54" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#D2FBE8" /><stop offset=".28" stopColor="#96EFCC" /><stop offset=".56" stopColor="#4AD7AC" /><stop offset=".82" stopColor="#2CC99C" stopOpacity=".45" /><stop offset="1" stopColor="#2CC99C" stopOpacity="0" /></linearGradient>
      <clipPath id="tc"><path d={LOGO.d} clipRule="evenodd" /></clipPath>
    </defs>
    <path d={LOGO.d} fill="url(#tg)" fillRule="evenodd" />
    <path d={LOGO.mass} fill="url(#tr)" clipPath="url(#tc)" />
  </svg>
);
const UI: React.FC<{ T: number }> = ({ T }) => {
  const out = ramp(T, 11.95, 0.25, EASE_MOVE);            // content leaves as the card starts to fold
  // highlight position
  const hi = lerp(lerp(rowY(0), rowY(1), ramp(T, STEP_T[1], 0.32, EASE_MOVE)), rowY(2), ramp(T, STEP_T[2], 0.32, EASE_MOVE));
  const hiIn = spring(T, STEP_T[0], 0.4);
  const done = (i: number) => (i < 3 ? spring(T, STEP_T[i] + (i ? 0.3 : 0.12), 0.4) : 0);
  const pill = spring(T, 11.1, 0.45);
  const push = 1 + 0.02 * ramp(T, 9.2, 2.8, EASE_MOVE);
  // cursor path
  const cur: P = (() => {
    let p: P = lp([930, 1760], [770, rowY(0) + 14], ramp(T, 9.25, 0.4, EASE_APPEAR));
    p = lp(p, [790, rowY(1) + 14], ramp(T, STEP_T[1] - 0.05, 0.34, EASE_MOVE));
    p = lp(p, [770, rowY(2) + 14], ramp(T, STEP_T[2] - 0.05, 0.34, EASE_MOVE));
    p = lp(p, [840, rowY(2) + 60], ramp(T, 11.2, 0.75, EASE_MOVE));
    return p;
  })();
  const click = bump(T, STEP_T[0], 0.06) + bump(T, STEP_T[1] + 0.3, 0.06) + bump(T, STEP_T[2] + 0.3, 0.06);
  return (
    <>
      {/* slim top bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 132, background: C.white, borderBottom: `1px solid ${HAIR}`, display: "flex", alignItems: "center", paddingLeft: 60, gap: 22, transform: `translateY(${-out * 140}px)` }}>
        <div style={{ width: 64, height: 64, borderRadius: 14, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><DMark size={36} /></div>
        <div style={{ fontFamily: F, fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em", color: C.ink }}>Dockentra WMS</div>
      </div>
      {/* the card (its shell lives on into the fold; see Fold) */}
      {T < 11.95 && <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, background: C.white, border: `1px solid ${HAIR}`, borderRadius: 8, boxSizing: "border-box", transform: `scale(${push})` }} />}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push * (1 - 0.06 * out)})`, transformOrigin: `${CARD.x + CARD.w / 2}px ${CARD.y + CARD.h / 2}px`, opacity: 1 - out, zIndex: 2 }}>
        <div style={{ position: "absolute", left: CARD.x + 56, top: CARD.y + 52, fontFamily: F, fontWeight: 800, fontSize: 68, letterSpacing: "-0.03em", color: C.ink }}>ORD-000030</div>
        {/* pill status */}
        <div style={{ position: "absolute", left: CARD.x + CARD.w - 56 - 218, top: CARD.y + 62, width: 218, height: 68, borderRadius: 34, background: C.grey, border: `1px solid ${HAIR}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, transform: `scale(${pill})` }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: C.green, transform: `scale(${1 + 0.25 * wob(T, 0.9)})` }} />
          <div style={{ fontFamily: F, fontWeight: 800, fontSize: 34, color: C.ink }}>Picked</div>
        </div>
        <div style={{ position: "absolute", left: CARD.x + 56, top: CARD.y + 168, width: CARD.w - 112, height: 1, background: HAIR }} />
        {/* mint highlight steps along the stepper */}
        <div style={{ position: "absolute", left: CARD.x + 24, top: hi - 50, width: CARD.w - 48, height: 100, borderRadius: 12, background: C.mint, transform: `scaleX(${hiIn})`, transformOrigin: "0 50%" }} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {STEPS.slice(0, 4).map((_, i) => T < 11.95 && <line key={i} x1={NODE_X} x2={NODE_X} y1={rowY(i) + 26} y2={rowY(i + 1) - 26} stroke={C.ink} strokeOpacity={0.3} strokeWidth={2} />)}
          {STEPS.map((_, i) => {
            const d = done(i);
            return (
              <g key={i} transform={`translate(${NODE_X} ${rowY(i)})`}>
                <circle r={24} fill={C.white} stroke={C.ink} strokeOpacity={0.3} strokeWidth={2} />
                {d > 0 && <g transform={`scale(${d})`}><circle r={25} fill={C.green} /><path d="M-10 1l7 7L11 -7" fill="none" stroke={C.white} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" /></g>}
              </g>
            );
          })}
        </svg>
        {STEPS.map((s, i) => (
          <div key={s} style={{ position: "absolute", left: NODE_X + 60, top: rowY(i) - 32, fontFamily: F, fontWeight: i <= 2 && done(i) > 0.5 ? 800 : 500, fontSize: 48, lineHeight: "64px", letterSpacing: "-0.02em", color: C.ink, opacity: i > 2 ? 0.55 : 1 }}>{s}</div>
        ))}
      </div>
      {/* cursor */}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: cur[0], top: cur[1], transform: `scale(${1 - 0.14 * click})`, transformOrigin: "20% 10%", opacity: 1 - out, zIndex: 3 }}>
        <path d="M5 3l14 8.2-6.2 1.5L9.5 19z" fill={C.ink} stroke={C.white} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/* ================================================================ beat 5: the fold, the logo, the end title */
const LS = 900 / LOGO.w;                         // logo scale: 900 px wide
const LX = 90, LY = 650;
const FC: P = [43.75, 45.75];                    // a point on the ramp line x + y = 89.5 (through 26.5,63 at 45°), near the D's centre
const K0 = 2.6;                                  // the fold happens big, then the camera eases back to the lock-up
const FS: P = [540, 940];                        // where the fold centre sits on screen while big
const SIDE = 100 * LS * K0;                      // the folding sheet: a square whose diagonal is the ramp line
/** squeeze toward the "/" 45° line: k = |cos θ| of a fold about that line */
const foldM = (k: number) => { const a = 1 + (k - 1) / 2, b = (k - 1) / 2; return `matrix(${a},${b},${b},${a},0,0)`; };
const Fold: React.FC<{ T: number }> = ({ T }) => {
  if (T < 11.95) return null;
  const a = ramp(T, 11.95, 0.4, EASE_MOVE);       // card → square sheet
  const close = ramp(T, 12.3, 0.25, EASE_IN);     // the sheet folds shut onto the ramp line
  const open = ramp(T, 12.55, 0.3, EASE_APPEAR);  // … and opens as the mark
  const pull = ramp(T, 12.57, 0.36, EASE_MOVE);   // camera back to the full lock-up
  const fill = ramp(T, 12.9, 0.6, EASE_APPEAR);   // the one permitted logo animation: 600 ms, cubic-bezier(.22,1,.36,1)
  const push = 1 + 0.01 * ramp(T, 13.5, 1.5, (x) => x);
  const K = lerp(K0, 1, pull);
  const fcFinal: P = [LX + FC[0] * LS, LY + FC[1] * LS];
  const tx = lerp(FS[0] - K0 * fcFinal[0], 0, pull), ty = lerp(FS[1] - K0 * fcFinal[1], 0, pull);
  const P0 = 1.0196;                               // the card's push-in at the moment it lets go
  const r = { x: lerp(CARD.x - CARD.w * (P0 - 1) / 2, FS[0] - SIDE / 2, a), y: lerp(CARD.y - CARD.h * (P0 - 1) / 2, FS[1] - SIDE / 2, a), w: lerp(CARD.w * P0, SIDE, a), h: lerp(CARD.h * P0, SIDE, a) };
  // the stepper's connector swings round and becomes the crease
  const c0 = lp([NODE_X, rowY(0)], [r.x, r.y + r.h], a), c1 = lp([NODE_X, rowY(4)], [r.x + r.w, r.y], a);
  const kc = Math.max(0.012, 1 - close);
  const sheet = mix(C.white, "#14806A", ramp(T, 12.42, 0.13, EASE_MOVE));
  const edge = (LOGO.w - 118) * ramp(T, 12.62, 0.34, EASE_MOVE);
  const words = "Fulfilment for small sellers,|powered by software|we built ourselves.".split("|");
  let wi = 0;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "540px 900px" }}>
      {open <= 0 && (
        <div style={{ position: "absolute", inset: 0, transform: foldM(kc), transformOrigin: `${FS[0]}px ${FS[1]}px` }}>
          <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: sheet, border: `1px solid ${HAIR}`, borderRadius: 8, boxSizing: "border-box", overflow: "hidden" }}>
            {/* the half that folds over is in shadow */}
            <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: 0.16 * close * a, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          </div>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <line x1={c0[0]} y1={c0[1]} x2={c1[0]} y2={c1[1]} stroke={C.ink} strokeOpacity={lerp(0.3, 0.9, a)} strokeWidth={lerp(2, 3, a)} strokeLinecap="round" />
          </svg>
        </div>
      )}
      {open > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="gl1" x1="2" y1="100" x2="88" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#0A2C26" /><stop offset=".30" stopColor="#123E36" /><stop offset=".62" stopColor="#14806A" /><stop offset=".84" stopColor="#189C7E" /><stop offset="1" stopColor="#0C7261" /></linearGradient>
            <linearGradient id="rl1" x1="6" y1="95" x2="76" y2="54" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#D2FBE8" /><stop offset=".28" stopColor="#96EFCC" /><stop offset=".56" stopColor="#4AD7AC" /><stop offset=".82" stopColor="#2CC99C" stopOpacity=".45" /><stop offset="1" stopColor="#2CC99C" stopOpacity="0" /></linearGradient>
            <clipPath id="cl1"><path d={LOGO.d} clipRule="evenodd" /></clipPath>
            {/* fill front: a 45° edge travelling from the bottom-left corner up along the diagonal */}
            <clipPath id="fillc"><polygon points={`-60,100 ${-60 + 200 * fill},100 ${-60 + 200 * fill - 160},-60 -220,-60`} /></clipPath>
            <clipPath id="wordc"><rect x={110} y={-10} width={edge + 8} height={120} /></clipPath>
          </defs>
          <g transform={`translate(${tx} ${ty}) scale(${K}) translate(${LX} ${LY}) scale(${LS})`}>
            <g transform={open < 1 ? `translate(${FC[0]} ${FC[1]}) ${foldM(Math.max(0.012, open))} translate(${-FC[0]} ${-FC[1]})` : undefined}>
              <path d={LOGO.d} fill="url(#gl1)" fillRule="evenodd" />
            </g>
            {fill > 0 && <g clipPath="url(#fillc)"><path d={LOGO.mass} fill="url(#rl1)" clipPath="url(#cl1)" /></g>}
            <g clipPath="url(#wordc)"><g transform="translate(122.0,72.0)"><path d={LOGO.word} fill="#0B0D10" /></g></g>
          </g>
        </svg>
      )}
      {/* end title, word by word, then the URL */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 990, textAlign: "center" }}>
        {words.map((ln, li) => (
          <div key={li} style={{ fontFamily: F, fontWeight: 800, fontSize: 62, lineHeight: 1.16, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>
            {ln.split(" ").map((w, k, arr) => { const p = ramp(T, 13.3 + wi++ * 0.07, 0.42, EASE_APPEAR); return <span key={k} style={{ display: "inline-block", opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 30}px)`, marginRight: k < arr.length - 1 ? "0.24em" : 0 }}>{w}</span>; })}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1296, textAlign: "center", fontFamily: F, fontWeight: 500, fontSize: 48, color: C.ink, opacity: ramp(T, 14.1, 0.3, EASE_APPEAR), transform: `translateY(${(1 - ramp(T, 14.1, 0.42, EASE_APPEAR)) * 22}px)` }}>dockentra.ie</div>
    </div>
  );
};

/* ================================================================ the film */
const WhipBlur: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}><defs>
    {[1, 2, 3, 4, 5, 6].map((i) => <filter key={i} id={`whip${i}`} x="-30%" width="160%"><feGaussianBlur stdDeviation={`${i * 14} 0`} /></filter>)}
  </defs></svg>
);
export const OneFold2Film: React.FC<{ T: number }> = ({ T }) => {
  const ok = useFont();
  // the one hard whip-pan, 8.87 → 9.17: the old frame leaves left, the new one arrives from the right, both smeared
  const wOut = ramp(T, 8.87, 0.13, EASE_IN), wIn = ramp(T, 9.0, 0.19, EASE_APPEAR);
  const speed = T < 9 ? wOut : 1 - wIn;
  const blur = Math.round(clamp(speed * 1.4) * 6);
  const flt = blur > 0 ? `url(#whip${blur})` : undefined;
  const pushA = 1 + 0.03 * ramp(T, 0, 6, (x) => x);
  return (
    <AbsoluteFill style={{ background: C.grey, overflow: "hidden" }}>
      <WhipBlur />
      {ok && T < 9 && (
        <AbsoluteFill style={{ transform: `translateX(${-wOut * 1500}px)`, filter: flt }}>
          {T < 6 && <AbsoluteFill style={{ transform: `scale(${T < 2.6 ? 1 : pushA})`, transformOrigin: "540px 1150px" }}><Shape T={T} /></AbsoluteFill>}
          {/* while the camera is still close, the room stays out of the headline's third */}
          {T >= 6 && <AbsoluteFill style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 600px, #000 720px)", maskImage: "linear-gradient(to bottom, transparent 600px, #000 720px)" }}><Warehouse T={T} /></AbsoluteFill>}
          {T >= 6 && <Hero T={T} />}
          <AbsoluteFill style={{ transform: `translateX(${-wOut * 120}px) scale(${1 + (pushA - 1) * 0.4})`, transformOrigin: "540px 460px" }}>
            <Headline T={T} a={0.2} b={2.95} size={H1} lines={["Orders in.", "Boxes out"]} />
            <Headline T={T} a={3.2} b={5.92} size={118} lines={["Photographed", "on arrival."]} />
            <Headline T={T} a={6.2} b={99} size={118} lines={["Picked. Packed.", "Labelled."]} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {ok && T >= 9 && (
        <AbsoluteFill style={{ transform: `translateX(${(1 - wIn) * 1500}px)`, filter: flt }}>
          <AbsoluteFill style={{ transform: `translateX(${(1 - wIn) * 120}px)` }}>
            <Headline T={T} a={9.12} b={11.9} size={118} lines={["Every order,", "tracked."]} />
          </AbsoluteFill>
          {T < 12.3 && <UI T={T} />}
          <Fold T={T} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
export const OneFold2: React.FC = () => { const fr = useCurrentFrame(), { fps } = useVideoConfig(); return <OneFold2Film T={fr / fps} />; };
export const ONEFOLD2_KEYS = [2.0, 4.6, 8.3, 11.3, 14.9];
export const OneFold2Key: React.FC<{ t: number }> = ({ t }) => <OneFold2Film T={t} />;
