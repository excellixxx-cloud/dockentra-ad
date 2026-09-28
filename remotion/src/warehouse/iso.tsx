import React from "react";
import { C } from "../brand";

/**
 * Isometric projection (30°): world x runs down-right, y runs down-left, z up.
 * 1 world unit = S px at camera zoom 1.
 */
export const S = 12;
const C30 = Math.cos(Math.PI / 6);
export type V3 = [number, number, number];

export const iso = (x: number, y: number, z = 0) => ({ X: (x - y) * C30 * S, Y: (x + y) * 0.5 * S - z * S });
export const poly = (pts: V3[]) => pts.map(([x, y, z]) => { const p = iso(x, y, z); return `${p.X.toFixed(2)},${p.Y.toFixed(2)}`; }).join(" ");

/** Blend two #rrggbb colours — used only to shade faces of brand colours. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
/** Face shades of one flat brand colour: top as is, the two side faces darker. */
export const shade = (c: string) => ({ top: c, right: mix(c, C.ink, 0.1), left: mix(c, C.ink, 0.2) });

const LINE = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };

/** Axis-aligned box. `left` = the +y face, `right` = the +x face (the two a viewer sees). */
export const Box: React.FC<{ x: number; y: number; z?: number; w: number; d: number; h: number; color: string; top?: string; front?: string; side?: string; line?: boolean; opacity?: number }> = ({ x, y, z = 0, w, d, h, color, top, front, side, line = true, opacity = 1 }) => {
  const sh = shade(color);
  const l = line ? LINE : { stroke: "none" };
  return (
    <g opacity={opacity}>
      <polygon points={poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={side ?? sh.right} {...l} />
      <polygon points={poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={front ?? sh.left} {...l} />
      <polygon points={poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={top ?? sh.top} {...l} />
    </g>
  );
};

/** Upright cylinder (jars, tape roll seen from above). */
export const Cyl: React.FC<{ x: number; y: number; z?: number; r: number; h: number; color: string; topColor?: string }> = ({ x, y, z = 0, r, h, color, topColor }) => {
  const b = iso(x, y, z), t = iso(x, y, z + h);
  const rx = 1.2247 * r * S, ry = 0.7071 * r * S;
  return (
    <g>
      <path d={`M${b.X - rx} ${b.Y} A${rx} ${ry} 0 0 0 ${b.X + rx} ${b.Y} L${t.X + rx} ${t.Y} A${rx} ${ry} 0 0 1 ${t.X - rx} ${t.Y} Z`} fill={shade(color).left} {...LINE} />
      <ellipse cx={t.X} cy={t.Y} rx={rx} ry={ry} fill={topColor ?? color} {...LINE} />
    </g>
  );
};

/** Text lying on the +y face (a plane of constant y): runs along x, reads upright. */
export const FaceText: React.FC<{ x: number; y: number; z: number; size: number; children: React.ReactNode; color?: string; weight?: number; family?: string; anchor?: "start" | "middle" }> = ({ x, y, z, size, children, color = C.ink, weight = 500, family = "IBM Plex Mono", anchor = "middle" }) => {
  const p = iso(x, y, z);
  return (
    <text transform={`matrix(${C30} 0.5 0 1 ${p.X} ${p.Y})`} fontFamily={family} fontWeight={weight} fontSize={size} fill={color} textAnchor={anchor} dominantBaseline="central">
      {children}
    </text>
  );
};

/** Flat white glove (hands are allowed, faces are not). Drawn in screen space. */
export const Glove: React.FC<{ x: number; y: number; rot?: number; scale?: number }> = ({ x, y, rot = 0, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    <rect x={-13} y={14} width={26} height={16} rx={4} fill={C.grey} stroke={C.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    <path d="M-15 16 C-17 4 -16 -6 -14 -14 C-13 -18 -8 -18 -8 -13 L-8 -4 L-7 -20 C-6 -25 -1 -25 -1 -20 L-1 -6 L0 -23 C1 -28 6 -28 6 -23 L6 -6 L7 -19 C8 -24 13 -23 12 -18 L11 -2 C14 -6 19 -6 18 -1 C15 6 13 12 13 16 Z" fill={C.white} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </g>
);

export { LINE };
