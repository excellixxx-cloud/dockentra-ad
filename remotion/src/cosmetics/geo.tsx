import React from "react";
import { C } from "../brand";
import { iso, mix } from "../warehouse/iso";

/**
 * 3D helpers for the packing-table close-up. Same 30° isometry as the tour
 * (warehouse/iso), plus shapes the tour never needed: cylinders on any axis,
 * glossy highlights, organic blobs and hands.
 */
export type P = [number, number, number];
export const LINE = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" as const };

/** Product colours. The five brand colours dress the scene; these describe real products and materials only. */
export const PROP = {
  top: "#EEF1F2",        // table top (brief)
  kraft: "#C9A57A",
  kraftDark: "#A98256",
  kraftWet: "#8A6644",
  amber: "#B8732A",
  amberDark: "#8C5418",
  silver: "#C9CED2",
  silverDark: "#9BA2A8",
  coral: "#EE7B66",
  beige: "#E6CFAE",
  beigeDark: "#CDB089",
  red: "#D9483B",
  tapeTint: "#D8B98C",
  skin: "#EEF1F2",       // hands: light-grey fill, line style
  sleeve: "#55595E",
};

export const sp = (p: P) => { const q = iso(p[0], p[1], p[2]); return [q.X, q.Y] as [number, number]; };
export const pts2 = (ps: [number, number][]) => ps.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/** Points on a circle of radius r around `c`, in the plane perpendicular to `axis` ("x" | "y" | "z"). */
export function ring(c: P, axis: "x" | "y" | "z", r: number, n = 40): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
    if (axis === "x") return [c[0], c[1] + u, c[2] + v];
    if (axis === "y") return [c[0] + u, c[1], c[2] + v];
    return [c[0] + u, c[1] + v, c[2]];
  });
}

/** 2D convex hull (monotone chain). */
export function hull(ps: [number, number][]) {
  const p = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Viewer looks along -(1,1,1): a face whose normal has a positive sum faces the camera. */
const facing = (axis: "x" | "y" | "z", sign: number) => sign > 0;

/**
 * Cylinder from c0 to c1 along an axis. Side = silhouette hull; the end that
 * faces the camera is drawn on top. `gloss` adds a highlight line along the body.
 */
export const Cylinder: React.FC<{ c0: P; c1: P; axis: "x" | "y" | "z"; r: number; fill: string; end?: string; gloss?: number; opacity?: number; line?: boolean }> = ({ c0, c1, axis, r, fill, end, gloss = 0, opacity = 1, line = true }) => {
  const r0 = ring(c0, axis, r), r1 = ring(c1, axis, r);
  const side = hull([...r0, ...r1].map(sp));
  const k = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const front = c1[k] > c0[k] === facing(axis, 1) ? r1 : r0;
  // highlight: a line along the body at the angle closest to the upper-left
  const hi = (a: number) => {
    const i = Math.round(((a % (Math.PI * 2)) / (Math.PI * 2)) * r0.length) % r0.length;
    return [sp(r0[i]), sp(r1[i])];
  };
  const l = line ? LINE : { stroke: "none" };
  return (
    <g opacity={opacity}>
      <polygon points={pts2(side)} fill={fill} {...l} />
      <polygon points={pts2(front.map(sp))} fill={end ?? mix(fill, C.white, 0.15)} {...l} />
      {gloss > 0 && [0.62, 0.7].map((f, i) => {
        const [a, b] = hi(Math.PI * 2 * (axis === "z" ? 0.62 + i * 0.05 : f));
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.white} strokeWidth={i ? 2 : 4} strokeOpacity={gloss * (i ? 0.5 : 0.85)} strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
      })}
    </g>
  );
};

/** Deterministic organic blob on a horizontal plane (stains, puddles, crumpled paper outlines). */
export function blob(cx: number, cy: number, z: number, r: number, seed: number, wobble = 0.28, n = 28): [number, number][] {
  const rnd = (i: number) => { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return s - Math.floor(s); };
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wobble * (rnd(i) - 0.5) + 0.12 * Math.sin(a * 3 + seed));
    return sp([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]);
  });
}
/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
export function smooth(ps: [number, number][]) {
  const n = ps.length;
  let d = `M${ps[0][0].toFixed(1)} ${ps[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = ps[(i - 1 + n) % n], p1 = ps[i], p2 = ps[(i + 1) % n], p3 = ps[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

/** Text lying flat on the table (e.g. marker digits on a mailer). */
export const TopText: React.FC<{ p: P; size: number; children: React.ReactNode; color?: string; weight?: number; family?: string; rot?: number }> = ({ p, size, children, color = C.ink, weight = 500, family = "IBM Plex Mono", rot = 0 }) => {
  const [X, Y] = sp(p);
  const c = Math.cos(Math.PI / 6);
  return (
    <text transform={`matrix(${c} 0.5 ${-c} 0.5 ${X} ${Y}) rotate(${rot})`} fontFamily={family} fontWeight={weight} fontSize={size} fill={color} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  );
};
/** Text on a +x face (plane of constant x), reading from front to back. */
export const XFaceText: React.FC<{ p: P; size: number; children: React.ReactNode; color?: string; weight?: number; family?: string }> = ({ p, size, children, color = C.ink, weight = 600, family = "IBM Plex Mono" }) => {
  const [X, Y] = sp(p);
  const c = Math.cos(Math.PI / 6);
  return (
    <text transform={`matrix(${c} -0.5 0 1 ${X} ${Y})`} fontFamily={family} fontWeight={weight} fontSize={size} fill={color} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  );
};

/**
 * A hand seen from above (back of the hand) in the tour's line style: 2 px
 * outline, light-grey fill, dark-grey sleeve, visible to the wrist. Fingers
 * point along +x and lie side by side; `curl` 0 = flat, 1 = gripping (fingers
 * foreshorten and show the middle joint). Right hand by default (thumb on -y);
 * `mirror` makes it a left hand. Screen space, `rot` in degrees.
 */
export const Hand: React.FC<{ x: number; y: number; rot?: number; scale?: number; curl?: number; mirror?: boolean; thumbOut?: number; shadow?: boolean }> = ({ x, y, rot = 0, scale = 1, curl = 0.3, mirror = false, thumbOut = 0.5, shadow = true }) => {
  const st = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  const soft = { fill: "none", stroke: C.ink, strokeWidth: 1.3, strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  const fingers = [
    { y: 22, len: 30, w: 11 },  // little
    { y: 8, len: 40, w: 13 },   // ring
    { y: -7, len: 44, w: 14 },  // middle
    { y: -21, len: 39, w: 13 }, // index
  ];
  // back of the hand with the thumb as one outline; the thumb tip tucks in as the hand grips
  const tx = 10 - 6 * curl, ty = -50 - 12 * thumbOut + 10 * curl;
  const thumbSide = `M-72 -22 C-60 -25 -50 -27 -42 -29 C-30 -37 -14 ${ty + 2} ${tx - 6} ${ty - 2} C${tx + 4} ${ty - 5} ${tx + 11} ${ty + 2} ${tx + 7} ${ty + 9} C${tx + 2} ${ty + 15} -2 -37 3 -31`;
  const palm = `${thumbSide} C9 -20 9 20 3 31 C-22 33 -52 29 -72 24 Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale} ${mirror ? -scale : scale})`}>
      {shadow && <path d={palm} transform="translate(14 18) scale(1.1)" fill={C.ink} opacity={0.07} />}
      {/* sleeve with a cuff */}
      <path d="M-160 -35 L-70 -28 C-64 -9 -64 11 -70 30 L-160 37 Z" fill={PROP.sleeve} {...st} />
      {/* wrist line: a clean seam where the hand meets the cuff */}
      <path d="M-72 -25 C-73 -8 -73 10 -72 27" {...soft} stroke={mix(PROP.sleeve, C.ink, 0.55)} strokeWidth={2.2} strokeOpacity={0.8} />
      <path d="M-84 -29 C-79 -9 -79 11 -84 31" {...soft} stroke={mix(PROP.sleeve, C.white, 0.3)} strokeWidth={2} />
      <path d="M-128 -18 C-112 -13 -100 -15 -90 -20 M-132 16 C-116 11 -104 14 -94 20" {...soft} stroke={mix(PROP.sleeve, C.ink, 0.4)} />
      {/* fingers side by side, from the little finger to the index */}
      {fingers.map((f, i) => {
        const L = f.len * (1 - 0.4 * curl);
        return (
          <g key={i} transform={`translate(0 ${f.y}) rotate(${(i - 1.5) * -2.5})`}>
            <rect x={-10} y={-f.w / 2} width={L + 10} height={f.w} rx={f.w / 2} fill={PROP.skin} {...st} />
            {/* middle joint crease, stronger when curled */}
            <path d={`M${L * 0.52} ${-f.w / 2 + 2.5} q${-2 - 3 * curl} ${f.w / 2 - 2.5} 0 ${f.w - 5}`} {...soft} strokeOpacity={0.4 + 0.4 * curl} />
            {/* nail, disappears as the tip curls under */}
            {curl < 0.75 && <rect x={L - 10} y={-f.w * 0.27} width={7} height={f.w * 0.54} rx={3} fill={mix(PROP.skin, C.white, 0.6)} {...st} strokeWidth={1} strokeOpacity={0.6 * (1 - curl)} />}
          </g>
        );
      })}
      {/* back of the hand over the finger bases; no outline along the knuckles */}
      <path d={palm} fill={PROP.skin} />
      <path d={thumbSide} fill="none" {...st} />
      <path d="M3 31 C-22 33 -52 29 -72 24" fill="none" {...st} />
      {/* thumb nail + the crease where the thumb meets the hand — the thumb reads as a separate digit */}
      <g transform={`translate(${tx + 1} ${ty + 3}) rotate(${-35 + 20 * curl})`}>
        <rect x={-5} y={-4} width={8} height={8} rx={3} fill={mix(PROP.skin, C.white, 0.6)} {...st} strokeWidth={1} strokeOpacity={0.6} />
      </g>
      <path d="M-30 -33 q10 8 24 3" {...soft} strokeOpacity={0.55} strokeWidth={1.8} />
      {/* knuckles + tendons */}
      {[-22, -7, 8, 22].map((ky, i) => <path key={i} d={`M-2 ${ky - 5} q5 5 0 10`} {...soft} strokeOpacity={0.55} strokeWidth={1.6} />)}
      {[-18, -6, 7, 19].map((ky, i) => <path key={i} d={`M-54 ${ky * 0.55} L-12 ${ky}`} {...soft} strokeOpacity={0.16} />)}
    </g>
  );
};
