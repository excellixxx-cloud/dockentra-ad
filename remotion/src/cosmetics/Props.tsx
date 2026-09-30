import React from "react";
import { C } from "../brand";
import { Box, mix, poly } from "../warehouse/iso";
import { blob, Cylinder, hull, LINE, P, PROP, pts2, ring, smooth, sp, TopText } from "./geo";

/** Packing table: world units, x 0..104 (screen down-right), y 0..104 (screen down-left), top at z = 0. */
export const TABLE = { W: 104, D: 104, edge: 1.2, stripe: 0.66 };

/* ------------------------------------------------------------------ walls + table */
export const WallsAndTable: React.FC = () => {
  const { W, D, edge, stripe } = TABLE;
  const H = 80;
  return (
    <g>
      <defs>
        <linearGradient id="wallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.white} /><stop offset="1" stopColor={C.grey} /></linearGradient>
        <linearGradient id="wallR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.white} /><stop offset="1" stopColor={mix(C.grey, C.ink, 0.04)} /></linearGradient>
      </defs>
      {/* walls run down to the floor behind the table; the floor sits 72 units below the top */}
      <polygon points={poly([[-1, -1, -72], [-1, D + 90, -72], [-1, D + 90, H], [-1, -1, H]])} fill="url(#wallL)" />
      <polygon points={poly([[-1, -1, -72], [W + 90, -1, -72], [W + 90, -1, H], [-1, -1, H]])} fill="url(#wallR)" />
      <polygon points={poly([[-1, -1, -72], [W + 90, -1, -72], [W + 90, D + 90, -72], [-1, D + 90, -72]])} fill={mix(C.grey, C.ink, 0.07)} />
      {/* skirting where the walls meet the table */}
      <polyline points={poly([[-1, D + 90, 0.4], [-1, -1, 0.4], [W + 90, -1, 0.4]])} fill="none" stroke={mix(C.grey, C.ink, 0.25)} strokeWidth={3} />
      {/* shadow under the top, black metal legs with adjustable feet */}
      <polygon points={poly([[2, 2, -72], [W + 4, 2, -72], [W + 6, D + 6, -72], [2, D + 4, -72]])} fill={C.ink} opacity={0.06} />
      {([[W - 3.5, 3], [W - 3.5, D / 2 - 1.5], [W - 3.5, D - 3.5], [D / 2 - 1.5, D - 3.5], [3, D - 3.5]] as [number, number][]).map(([lx, ly], i) => (
        <g key={i}>
          <Box x={lx} y={ly} z={-68} w={3} d={3} h={68 - edge} color={C.ink} top={mix(C.ink, C.white, 0.2)} />
          <Cylinder c0={[lx + 1.5, ly + 1.5, -69.2]} c1={[lx + 1.5, ly + 1.5, -68]} axis="z" r={0.7} fill={PROP.silver} />
          <Cylinder c0={[lx + 1.5, ly + 1.5, -72]} c1={[lx + 1.5, ly + 1.5, -69.2]} axis="z" r={2} fill={mix(C.ink, C.white, 0.15)} />
        </g>
      ))}
      <Box x={3} y={D - 2.8} z={-60} w={W - 6} d={1.6} h={2} color={C.ink} top={mix(C.ink, C.white, 0.2)} />
      <Box x={W - 2.8} y={3} z={-60} w={1.6} d={D - 6} h={2} color={C.ink} top={mix(C.ink, C.white, 0.2)} />
      {/* table top with a visible edge and the mint stripe along the front */}
      <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={PROP.top} {...LINE} />
      <polygon points={poly([[W, 0, -edge], [W, D, -edge], [W, D, 0], [W, 0, 0]])} fill={mix(PROP.top, C.ink, 0.1)} {...LINE} />
      <polygon points={poly([[0, D, -edge], [W, D, -edge], [W, D, 0], [0, D, 0]])} fill={mix(PROP.top, C.ink, 0.18)} {...LINE} />
      <polygon points={poly([[0, D, -stripe], [W, D, -stripe], [W, D, 0], [0, D, 0]])} fill={C.mint} />
      <polygon points={poly([[W, 0, -stripe], [W, D, -stripe], [W, D, 0], [W, 0, 0]])} fill={C.mint} />
      {/* faint matte texture */}
      {Array.from({ length: 12 }, (_, i) => (
        <polyline key={i} points={poly([[8 * i + 4, 2, 0.01], [8 * i + 4, D - 2, 0.01]])} stroke={C.ink} strokeOpacity={0.018} strokeWidth={6} fill="none" />
      ))}
    </g>
  );
};

/* ------------------------------------------------------------------ kraft mailer */
export type MailerState = {
  x: number; y: number; z?: number; w?: number; d?: number;
  num?: string;          // marker digit
  open?: number;         // flap 0 closed → 1 folded back
  stain?: number;        // wet stain 0..1 (grows from inside)
  lift?: number;         // extra z (drops, shakes)
  squash?: number;       // landing deformation 0..1
  rot?: number;          // small in-plane jitter, degrees (screen)
};
export const KraftMailer: React.FC<{ m: MailerState }> = ({ m }) => {
  const { x, y, w = 20, d = 14.5, num, open = 0, stain = 0, lift = 0, squash = 0 } = m;
  const z = (m.z ?? 0) + lift;
  const h = 1.1 * (1 - 0.35 * squash);
  const flap = 3.6;
  // a closed mailer's padded top bulges a little
  const bulge = (1 - open) * 0.35;
  const [cx, cy] = sp([x + w / 2, y + d / 2, z + h]);
  return (
    <g transform={m.rot ? `rotate(${m.rot} ${cx} ${cy})` : undefined}>
      {/* soft shadow */}
      <path d={smooth(blob(x + w / 2 + 0.6, y + d / 2 + 0.8, 0.01, Math.max(w, d) * 0.55 * (1 + lift * 0.02), 3, 0.06))} fill={C.ink} opacity={0.08 / (1 + lift * 0.3)} />
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={PROP.kraft} />
      {/* paper grain + seam */}
      {[0.22, 0.48, 0.74].map((f, i) => <polyline key={i} points={poly([[x + 0.6, y + d * f, z + h + bulge * Math.sin(Math.PI * f)], [x + w - flap - 0.4, y + d * f + 0.3, z + h + bulge * Math.sin(Math.PI * f)]])} stroke={PROP.kraftDark} strokeOpacity={0.45} strokeWidth={1.2} fill="none" />)}
      {/* crimped seal along the closed end */}
      <polyline points={Array.from({ length: 15 }, (_, i) => sp([x + 0.55 + (i % 2) * 0.35, y + 0.3 + (i * (d - 0.6)) / 14, z + h])).map((q) => q.join(",")).join(" ")} fill="none" stroke={PROP.kraftDark} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      {/* wet stain soaking through the top */}
      {stain > 0 && (
        <g>
          <path d={smooth(blob(x + w * 0.42, y + d * 0.55, z + h + 0.02, 1.2 + 3.1 * stain, 7, 0.45, 34))} fill={PROP.kraftWet} opacity={0.85} />
          <path d={smooth(blob(x + w * 0.42, y + d * 0.55, z + h + 0.03, 0.8 + 2.2 * stain, 11, 0.5, 30))} fill={mix(PROP.kraftWet, C.ink, 0.2)} opacity={0.6} />
          {/* bubble-wrap bits stuck to the wet patch */}
          {stain > 0.5 && [[0.36, 0.42], [0.5, 0.66], [0.3, 0.64]].map(([fx, fy], i) => {
            const [bx, by] = sp([x + w * fx, y + d * fy, z + h + 0.05]);
            return <g key={i}><circle cx={bx} cy={by} r={4} fill={C.white} fillOpacity={0.8} stroke={C.ink} strokeWidth={1} /><circle cx={bx - 1.3} cy={by - 1.3} r={1.2} fill={C.white} /></g>;
          })}
        </g>
      )}
      {/* flap: closed = a seam line; open = folded back with a curve */}
      {open < 0.02 ? (
        <polyline points={poly([[x + w - flap, y, z + h], [x + w - flap, y + d, z + h]])} stroke={PROP.kraftDark} strokeWidth={2} fill="none" />
      ) : (
        <path
          d={(() => {
            const a = Math.PI * 0.95 * open, hx = x + w - flap;
            const tip = (yy: number): [number, number] => sp([hx + flap * Math.cos(a), yy, z + h + flap * Math.sin(a)]);
            const mid = (yy: number): [number, number] => sp([hx + flap * 0.5 * Math.cos(a * 0.8), yy, z + h + flap * 0.7 * Math.sin(a * 0.8)]);
            const h0 = sp([hx, y, z + h]), h1 = sp([hx, y + d, z + h]);
            const t0 = tip(y), t1 = tip(y + d), m0 = mid(y), m1 = mid(y + d);
            return `M${h0} Q${m0} ${t0} L${t1} Q${m1} ${h1} Z`;
          })()}
          fill={mix(PROP.kraft, C.white, 0.18)}
          {...LINE}
        />
      )}
      {/* opened: the dark inside shows */}
      {open > 0.3 && <polygon points={poly([[x + w - flap - 0.2, y + 0.5, z + h], [x + w - flap + 0.1, y + 0.5, z + h - 0.1], [x + w - flap + 0.1, y + d - 0.5, z + h - 0.1], [x + w - flap - 0.2, y + d - 0.5, z + h]])} fill={C.ink} opacity={0.7} />}
      {num && <TopText p={[x + w * 0.4, y + d * 0.45, z + h + 0.02]} size={82} weight={500} rot={-8}>{num}</TopText>}
    </g>
  );
};

/* ------------------------------------------------------------------ stack of mailers + zip-bag roll */
export const MailerStack: React.FC<{ x?: number; y?: number }> = ({ x = 2, y = 30 }) => (
  <g>
    {Array.from({ length: 9 }, (_, i) => (
      <Box key={i} x={x + (i % 2) * 0.35} y={y - (i % 3) * 0.3} z={i * 0.5} w={21} d={16} h={0.5} color={i % 2 ? PROP.kraft : mix(PROP.kraft, C.white, 0.08)} />
    ))}
    <polyline points={poly([[x + 18.2, y, 4.5], [x + 18.2, y + 16, 4.5]])} stroke={PROP.kraftDark} strokeWidth={2} fill="none" />
    {/* roll of clear zip bags lying on the stack */}
    <Cylinder c0={[x + 2, y + 8, 6.2]} c1={[x + 18.5, y + 8, 6.2]} axis="x" r={1.7} fill={mix(C.white, PROP.silver, 0.35)} end={C.white} gloss={1} opacity={0.95} />
    <Cylinder c0={[x + 18.5, y + 8, 6.2]} c1={[x + 18.7, y + 8, 6.2]} axis="x" r={0.6} fill={PROP.silverDark} />
    <polygon points={poly([[x + 2, y + 10, 5.9], [x + 17, y + 10, 5.9], [x + 17, y + 14.5, 4.6], [x + 2, y + 14.5, 4.6]])} fill={C.white} fillOpacity={0.55} {...LINE} strokeOpacity={0.5} />
    {/* zip line on the hanging bag */}
    <polyline points={poly([[x + 2, y + 12.2, 5.25], [x + 17, y + 12.2, 5.25]])} stroke={C.ink} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="3 2" fill="none" />
  </g>
);

/* ------------------------------------------------------------------ tape dispenser */
export const TapeDispenser: React.FC<{ x?: number; y?: number; pull?: number }> = ({ x = 14, y = 8, pull = 0 }) => (
  <g>
    <Box x={x} y={y} z={0} w={9} d={4.2} h={2.2} color={C.ink} top={mix(C.ink, C.white, 0.18)} />
    <polygon points={poly([[x + 1, y, 2.2], [x + 5, y, 2.2], [x + 5, y, 5.6], [x + 1, y, 5.6]])} fill={mix(C.ink, C.white, 0.1)} {...LINE} />
    {/* clear roll with a brown cast, axle along y */}
    <Cylinder c0={[x + 3.6, y + 0.4, 5]} c1={[x + 3.6, y + 3.8, 5]} axis="y" r={2.6} fill={PROP.tapeTint} end={mix(PROP.tapeTint, C.white, 0.35)} gloss={0.8} opacity={0.9} />
    <Cylinder c0={[x + 3.6, y + 3.8, 5]} c1={[x + 3.6, y + 3.9, 5]} axis="y" r={1.2} fill={C.white} end={mix(PROP.tapeTint, C.white, 0.6)} />
    {/* tape running to the serrated blade */}
    <polygon points={poly([[x + 6.2, y + 0.6, 5], [x + 8.8, y + 0.6, 2.8 - pull * 0.4], [x + 8.8, y + 3.6, 2.8 - pull * 0.4], [x + 6.2, y + 3.6, 5]])} fill={PROP.tapeTint} fillOpacity={0.6} {...LINE} />
    <polyline
      points={Array.from({ length: 11 }, (_, i) => sp([x + 9.1 + (i % 2) * 0.35, y + 0.4 + i * 0.34, 2.4 + (i % 2) * 0.25])).map((p) => p.join(",")).join(" ")}
      fill="none" stroke={PROP.silver} strokeWidth={2.5} vectorEffect="non-scaling-stroke"
    />
  </g>
);

/* ------------------------------------------------------------------ digital scale */
export const Scale: React.FC<{ x?: number; y?: number; reading?: string; flash?: number }> = ({ x = 34, y = 18, reading = "0.000", flash = 0 }) => (
  <g>
    <Box x={x} y={y} z={0} w={13} d={13} h={1.4} color={mix(C.ink, C.white, 0.25)} />
    <Box x={x + 0.6} y={y + 0.6} z={1.4} w={11.8} d={11.3} h={0.5} color={PROP.silver} top={mix(PROP.silver, C.white, 0.25)} />
    {/* brushed-metal lines */}
    {Array.from({ length: 7 }, (_, i) => <polyline key={i} points={poly([[x + 1.2, y + 1.5 + i * 1.5, 1.91], [x + 12, y + 1.5 + i * 1.5, 1.91]])} stroke={C.white} strokeOpacity={0.7} strokeWidth={1.2} fill="none" />)}
    {/* display on the front face */}
    <polygon points={poly([[x + 2.5, y + 13, 0.15], [x + 10.4, y + 13, 0.15], [x + 10.4, y + 13, 1.3], [x + 2.5, y + 13, 1.3]])} fill={C.ink} {...LINE} />
    <g opacity={0.35 + 0.65 * (1 - flash * 0.6)}>
      {(() => {
        const [X, Y] = sp([x + 6.45, y + 13, 0.72]);
        const c = Math.cos(Math.PI / 6);
        return <text transform={`matrix(${c} 0.5 0 1 ${X} ${Y})`} fontFamily="IBM Plex Mono" fontWeight={500} fontSize={13} fill={C.white} textAnchor="middle" dominantBaseline="central">{reading} kg</text>;
      })()}
    </g>
    <circle cx={sp([x + 11.4, y + 13, 0.7])[0]} cy={sp([x + 11.4, y + 13, 0.7])[1]} r={2.2} fill={PROP.silverDark} />
  </g>
);

/* ------------------------------------------------------------------ label printer */
export const LabelPrinter: React.FC<{ x?: number; y?: number; out?: number }> = ({ x = 24, y = 1, out = 0 }) => (
  <g>
    <Box x={x} y={y} z={0} w={8} d={8} h={6} color={C.white} top={C.white} />
    <Box x={x + 0.4} y={y + 0.4} z={6} w={7.2} d={7.2} h={0.6} color={mix(C.white, C.ink, 0.04)} />
    {/* exit slot on top */}
    <polygon points={poly([[x + 1.5, y + 4.2, 6.61], [x + 6.5, y + 4.2, 6.61], [x + 6.5, y + 4.8, 6.61], [x + 1.5, y + 4.8, 6.61]])} fill={C.ink} />
    {/* green status LED + button on the front */}
    <circle cx={sp([x + 6.6, y + 8, 4.8])[0]} cy={sp([x + 6.6, y + 8, 4.8])[1]} r={3.2} fill={C.green} stroke={C.ink} strokeWidth={1} />
    <polygon points={poly([[x + 1.2, y + 8, 4.2], [x + 3.4, y + 8, 4.2], [x + 3.4, y + 8, 5.2], [x + 1.2, y + 8, 5.2]])} fill={mix(C.white, C.ink, 0.12)} {...LINE} />
    {/* printed label rising out of the slot */}
    {out > 0.01 && (
      <g>
        <polygon points={poly([[x + 1.8, y + 4.5, 6.6], [x + 6.2, y + 4.5, 6.6], [x + 6.2, y + 4.5 - 0.8 * out, 6.6 + 5 * out], [x + 1.8, y + 4.5 - 0.8 * out, 6.6 + 5 * out]])} fill={C.white} {...LINE} />
        {out > 0.4 && [2.4, 2.9, 3.2, 3.8, 4.3, 4.9, 5.4].map((bx, i) => (
          <polyline key={i} points={poly([[x + bx, y + 4.5 - 0.8 * out * 0.55, 6.6 + 5 * out * 0.45], [x + bx, y + 4.5 - 0.8 * out * 0.9, 6.6 + 5 * out * 0.85]])} stroke={C.ink} strokeWidth={i % 3 ? 2 : 3} fill="none" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    )}
  </g>
);

/* ------------------------------------------------------------------ bubble wrap roll on a holder */
export const BubbleRoll: React.FC<{ x?: number; y?: number; unrolled?: number }> = ({ x = 33, y = 4.5, unrolled = 0 }) => {
  const r = 3.4, z = 5.8, len = 11;
  const bubbles: React.ReactElement[] = [];
  for (let a = 0; a < 7; a++) {
    for (let t = 0; t < 7; t++) {
      const ang = Math.PI * (0.15 + a * 0.13);
      const p: P = [x + 1 + t * 1.5 + (a % 2) * 0.75, y + Math.cos(ang) * r * 1.02, z + Math.sin(ang) * r * 1.02];
      const [bx, by] = sp(p);
      bubbles.push(<g key={`${a}-${t}`}><ellipse cx={bx} cy={by} rx={6} ry={4.5} fill={C.white} fillOpacity={0.55} stroke={C.ink} strokeOpacity={0.35} strokeWidth={1} /><circle cx={bx - 2} cy={by - 1.5} r={1.4} fill={C.white} /></g>);
    }
  }
  return (
    <g>
      {/* holder */}
      {[x - 0.6, x + len + 0.1].map((hx, i) => (
        <g key={i}>
          <Box x={hx} y={y - 0.3} z={0} w={0.5} d={0.6} h={z} color={C.ink} line={false} />
          <Box x={hx - 0.2} y={y - 2} z={0} w={0.9} d={4} h={0.5} color={C.ink} line={false} />
        </g>
      ))}
      <Cylinder c0={[x, y, z]} c1={[x + len, y, z]} axis="x" r={r} fill={mix(C.white, PROP.silver, 0.45)} end={mix(C.white, PROP.silver, 0.2)} gloss={1} />
      {bubbles}
      <Cylinder c0={[x + len, y, z]} c1={[x + len + 0.2, y, z]} axis="x" r={1.1} fill={PROP.kraftDark} />
      {/* free end hanging towards the table */}
      <polygon points={poly([[x, y + r, z], [x + len, y + r, z], [x + len, y + r + 1 + unrolled * 6, z - 3.5 - unrolled * 1.5], [x, y + r + 1 + unrolled * 6, z - 3.5 - unrolled * 1.5]])} fill={C.white} fillOpacity={0.5} {...LINE} strokeOpacity={0.5} />
    </g>
  );
};

/* ------------------------------------------------------------------ box of crumpled kraft paper + masking tape */
export const FillerBox: React.FC<{ x?: number; y?: number }> = ({ x = 48, y = 14 }) => {
  const w = 12, d = 10, h = 7;
  const balls: [number, number, number, number][] = [[2.5, 2.5, 7.8, 2.4], [6, 3, 8.4, 2.6], [9.3, 2.8, 7.9, 2.3], [3.4, 6.6, 8.2, 2.5], [7.2, 6.8, 8.6, 2.7], [10, 7, 7.6, 2]];
  return (
    <g>
      <Box x={x} y={y} z={0} w={w} d={d} h={h} color={PROP.kraft} top={PROP.kraftDark} />
      {/* open flaps */}
      <polygon points={poly([[x, y + d, h], [x + w, y + d, h], [x + w, y + d + 2.5, h + 2], [x, y + d + 2.5, h + 2]])} fill={mix(PROP.kraft, C.white, 0.1)} {...LINE} />
      <polygon points={poly([[x + w, y, h], [x + w, y + d, h], [x + w + 2.5, y + d, h + 2], [x + w + 2.5, y, h + 2]])} fill={PROP.kraft} {...LINE} />
      {balls.map(([bx, by, bz, br], i) => (
        <g key={i}>
          <path d={smooth(blob(x + bx, y + by, bz, br, i * 3 + 1, 0.5, 11))} fill={mix(PROP.kraft, C.white, 0.22 + (i % 2) * 0.08)} {...LINE} />
          <path d={`M${sp([x + bx - br * 0.4, y + by, bz])} L${sp([x + bx + br * 0.1, y + by - br * 0.3, bz])} L${sp([x + bx + br * 0.4, y + by + br * 0.2, bz])}`} fill="none" stroke={PROP.kraftDark} strokeWidth={1.2} />
        </g>
      ))}
    </g>
  );
};
export const MaskingTape: React.FC<{ x?: number; y?: number }> = ({ x = 56, y = 34 }) => (
  <g>
    <Cylinder c0={[x, y, 0]} c1={[x, y, 2.2]} axis="z" r={3.2} fill={PROP.beige} end={mix(PROP.beige, C.white, 0.25)} />
    <polygon points={pts2(ring([x, y, 2.21], "z", 1.9).map(sp))} fill={PROP.top} {...LINE} />
  </g>
);

/* ------------------------------------------------------------------ A. lotion bottle (250 ml, flip-top) */
/** Indices of a 40-point x-axis ring that face the camera (normal · (1,1,1) > 0). */
const visibleArc = (rg: P[]) => [...rg.slice(35), ...rg.slice(0, 16)];
export const LotionBottle: React.FC<{ p: P; lying?: boolean; capGap?: number; drop?: number; taped?: number }> = ({ p, lying = true, capGap = 0, drop = 0, taped = 0 }) => {
  const r = 1.7, body = 12, capL = 2.4, rc = r * 0.8;
  if (!lying) {
    const [x, y, z] = p;
    return (
      <g>
        <Cylinder c0={[x, y, z]} c1={[x, y, z + body]} axis="z" r={r} fill={C.white} end={mix(C.white, C.grey, 0.5)} gloss={0.9} />
        <Cylinder c0={[x, y, z + body]} c1={[x, y, z + body + capL]} axis="z" r={rc} fill={C.mint} end={mix(C.mint, C.white, 0.3)} />
      </g>
    );
  }
  // lying along x, cap towards +x (camera side)
  const [x, y, z] = p;
  const cz = z + r;
  const xs = x + body + 0.7;             // cap collar starts here
  const hinge = sp([xs + 0.5, y, cz - rc]);
  return (
    <g>
      <path d={smooth(blob(x + body / 2 + 0.5, y + 1, 0.02, body * 0.58, 2, 0.05))} fill={C.ink} opacity={0.09} />
      <Cylinder c0={[x, y, cz]} c1={[x + body, y, cz]} axis="x" r={r} fill={C.white} end={mix(C.white, C.grey, 0.6)} />
      {/* blank light-grey label wrapped round the body */}
      <polygon points={pts2([...visibleArc(ring([x + 2, y, cz], "x", r + 0.02)).map(sp), ...visibleArc(ring([x + 8.3, y, cz], "x", r + 0.02)).map(sp).reverse()])} fill={mix(C.grey, C.ink, 0.06)} {...LINE} strokeOpacity={0.55} />
      {/* gloss along the body */}
      {(() => { const a = sp([x + 0.6, y + 0.2, cz + r * 0.95]), b2 = sp([x + body - 0.4, y + 0.2, cz + r * 0.95]); return <line x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} stroke={C.white} strokeWidth={5} strokeLinecap="round" />; })()}
      {/* tapered shoulder + neck */}
      <polygon points={pts2(hull([...ring([x + body, y, cz], "x", r), ...ring([xs, y, cz], "x", rc * 0.85)].map(sp)))} fill={C.white} {...LINE} />
      {/* flip-top: collar, then the lid tilted open at the hinge */}
      <Cylinder c0={[xs, y, cz]} c1={[xs + 0.6, y, cz]} axis="x" r={rc} fill={mix(C.mint, C.ink, 0.08)} end={C.mint} />
      {capGap > 0 && <polygon points={pts2([sp([xs + 0.6, y - rc * 0.8, cz + rc * 0.55]), sp([xs + 0.6, y, cz + rc]), sp([xs + 0.6, y + rc * 0.8, cz + rc * 0.55]), sp([xs + 0.9, y + rc * 0.8, cz + rc * 0.55 + 0.5 * capGap]), sp([xs + 0.9, y, cz + rc + 0.6 * capGap]), sp([xs + 0.9, y - rc * 0.8, cz + rc * 0.55 + 0.5 * capGap])])} fill={C.ink} />}
      <g transform={`rotate(${-9 * capGap} ${hinge[0]} ${hinge[1]})`}>
        <Cylinder c0={[xs + 0.6, y, cz]} c1={[xs + capL, y, cz]} axis="x" r={rc} fill={C.mint} end={mix(C.mint, C.white, 0.3)} gloss={0.7} />
        {/* thumb notch on the lid */}
        {(() => { const a = sp([xs + capL - 0.1, y - 0.5, cz + rc * 0.75]), b2 = sp([xs + capL - 0.1, y + 0.5, cz + rc * 0.75]); return <line x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />; })()}
      </g>
      {/* lotion: one bead hanging at the seam, ready to fall — plus a small, palm-sized pool under the bottle */}
      {drop > 0 && (() => {
        const gx = sp([xs + 0.85, y + 0.05, cz + rc * 0.7]);
        const puddle: P = [xs + 0.6, y + rc + 1.7, 0.02];
        return (
          <g opacity={Math.min(1, drop * 1.4)}>
            <path d={smooth(blob(puddle[0], puddle[1], puddle[2], 1.3 + 0.9 * drop, 4, 0.4, 22))} fill={C.white} {...LINE} strokeOpacity={0.75} />
            <path d={smooth(blob(puddle[0] + 0.15, puddle[1] - 0.1, puddle[2] + 0.005, 0.75 + 0.5 * drop, 9, 0.35, 16))} fill={mix(C.white, C.grey, 0.15)} opacity={0.55} />
            {/* a single teardrop clinging to the cap seam */}
            <path
              d={`M${gx[0]} ${gx[1] - 5} C${gx[0] + 4.5} ${gx[1] - 1.5} ${gx[0] + 3.5} ${gx[1] + 6.5} ${gx[0]} ${gx[1] + 9} C${gx[0] - 3.5} ${gx[1] + 6.5} ${gx[0] - 4.5} ${gx[1] - 1.5} ${gx[0]} ${gx[1] - 5} Z`}
              fill={C.white} stroke={C.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" opacity={Math.min(1, drop * 1.6)}
            />
            <circle cx={gx[0] - 1.3} cy={gx[1] - 0.8} r={1.2} fill={PROP.silver} />
          </g>
        );
      })()}
      {/* tape wrapped around the cap seam */}
      {taped > 0 && <Cylinder c0={[xs - 0.1, y, cz]} c1={[xs + 1.1, y, cz]} axis="x" r={rc * 1.08} fill={PROP.tapeTint} end={mix(PROP.tapeTint, C.white, 0.3)} opacity={0.75 * taped} gloss={0.5} />}
    </g>
  );
};

/* ------------------------------------------------------------------ B. amber glass cream jar (50 ml) */
export const CreamJar: React.FC<{ p: P; crack?: number }> = ({ p, crack = 0 }) => {
  const [x, y, z] = p;
  const r = 2.5, hG = 3.0, hC = 1.2;
  const ridges = Array.from({ length: 18 }, (_, i) => {
    const a = ((-38 + (i / 17) * 166) * Math.PI) / 180;
    const b: P = [x + Math.cos(a) * r * 1.06, y + Math.sin(a) * r * 1.06, z + hG + 0.1];
    const t: P = [b[0], b[1], z + hG + hC - 0.1];
    return [sp(b), sp(t)];
  });
  const [c0x, c0y] = sp([x + r * 0.55, y + r * 0.84, z + hG]);
  return (
    <g>
      <path d={smooth(blob(x + 0.6, y + 0.7, 0.02, r * 1.3, 5, 0.05))} fill={C.ink} opacity={0.1} />
      {/* thick amber glass */}
      <Cylinder c0={[x, y, z]} c1={[x, y, z + hG]} axis="z" r={r} fill={PROP.amber} end={PROP.amberDark} opacity={0.95} />
      {/* white cream seen through the glass */}
      <Cylinder c0={[x, y, z + 0.6]} c1={[x, y, z + hG - 0.3]} axis="z" r={r * 0.7} fill={mix(PROP.amber, C.white, 0.55)} end={mix(PROP.amber, C.white, 0.6)} line={false} />
      {/* glass highlights */}
      {[[118, 5], [104, 2.5], [8, 3]].map(([deg, sw], i) => {
        const a = (deg * Math.PI) / 180;
        const b = sp([x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97, z + 0.5]);
        const t = sp([x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97, z + hG - 0.4]);
        return <line key={i} x1={b[0]} y1={b[1]} x2={t[0]} y2={t[1]} stroke={C.white} strokeWidth={sw} strokeOpacity={0.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
      })}
      {/* ridged silver screw cap */}
      <Cylinder c0={[x, y, z + hG]} c1={[x, y, z + hG + hC]} axis="z" r={r * 1.06} fill={PROP.silver} end={mix(PROP.silver, C.white, 0.35)} />
      {ridges.map(([b, t], i) => <line key={i} x1={b[0]} y1={b[1]} x2={t[0]} y2={t[1]} stroke={PROP.silverDark} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />)}
      {/* crack from the cap edge down almost to the base, cream pressing into it — unmissable at a glance */}
      {crack > 0 && (() => {
        const main = `M${c0x} ${c0y} l5 8 l-6 7 l7 8 l-4 8 l6 8 l-5 7`;
        const b1 = `M${c0x + 1} ${c0y + 15} l-9 5 l-4 7`;
        const b2 = `M${c0x + 4} ${c0y + 29} l9 4 l4 6`;
        return (
          <g>
            <path d={`M${c0x - 1} ${c0y + 8} q-8 5 -5 12 q5 4 8 -2 z`} fill={C.white} opacity={0.9 * crack} stroke={C.ink} strokeWidth={1} strokeOpacity={0.4} />
            {[main, b1, b2].map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke={C.ink} strokeWidth={i ? 6 : 10} strokeOpacity={0.9} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - crack} vectorEffect="non-scaling-stroke" />
                <path d={d} fill="none" stroke={C.white} strokeWidth={i ? 3 : 5} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - crack} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {/* two chips of glass knocked loose onto the table */}
            <polygon points={pts2([sp([x + r + 1.1, y + r * 0.15, 0.05]), sp([x + r + 1.6, y + r * 0.05, 0.05]), sp([x + r + 1.4, y + r * 0.45, 0.05])])} fill={PROP.amber} {...LINE} opacity={crack} />
            <polygon points={pts2([sp([x - r * 0.2, y + r + 1.0, 0.05]), sp([x + r * 0.3, y + r + 1.3, 0.05]), sp([x + r * 0.05, y + r + 1.7, 0.05])])} fill={PROP.amber} {...LINE} opacity={crack} />
          </g>
        );
      })()}
    </g>
  );
};

/* ------------------------------------------------------------------ C. lipstick + balm jar */
export const Lipstick: React.FC<{ p: P; melted?: number; out?: number }> = ({ p, melted = 0, out = 1 }) => {
  const [x, y, z] = p;
  const r = 0.72, caseL = 3.2, collar = 1.0, rb = 0.52;
  const cz = z + r;
  const x1 = x + caseL + collar;          // bullet leaves the collar here
  const bl = 2.0 * out;                   // bullet length when upright
  const W = rb * 2 * 12;                  // bullet width in scene units
  // centreline of the bullet: straight, or slumped over the collar onto the table
  const b0 = sp([x1 - 0.2, y, cz]);
  const straightTip = sp([x1 + bl, y, cz]);
  const slumpMid = sp([x1 + 1.1, y + 0.4, cz - 0.3]);
  const slumpTip = sp([x1 + 2.2, y + 1.3, rb * 0.7]);
  const mid = [b0[0] + (straightTip[0] - b0[0]) * 0.5 * (1 - melted) + (slumpMid[0] - b0[0]) * melted, b0[1] + (straightTip[1] - b0[1]) * 0.5 * (1 - melted) + (slumpMid[1] - b0[1]) * melted];
  const tip = [straightTip[0] * (1 - melted) + slumpTip[0] * melted, straightTip[1] * (1 - melted) + slumpTip[1] * melted];
  const spine = `M${b0} Q${mid} ${tip}`;
  return (
    <g>
      <path d={smooth(blob(x + caseL / 2 + 1, y + 0.7, 0.02, caseL * 0.75, 4, 0.05))} fill={C.ink} opacity={0.1} />
      {/* melted: a glossy coral puddle and drops on the table */}
      {melted > 0 && (
        <g opacity={Math.min(1, melted * 1.4)}>
          <path d={smooth(blob(x1 + 1.8, y + 1.1, 0.03, 0.35 + 0.75 * melted, 21, 0.4, 20))} fill={PROP.coral} {...LINE} />
          {[[x1 + 3.0, y + 0.5, 0.24], [x1 + 0.8, y + 1.8, 0.2], [x1 + 2.6, y + 2.0, 0.15]].map(([dx, dy, rr], i) => (
            <path key={i} d={smooth(blob(dx, dy, 0.03, rr * melted + 0.04, i + 30, 0.2, 12))} fill={PROP.coral} {...LINE} />
          ))}
          <ellipse cx={sp([x1 + 1.6, y + 0.9, 0.03])[0] - 4} cy={sp([x1 + 1.6, y + 0.9, 0.03])[1] - 2} rx={5} ry={1.8} fill={C.white} opacity={0.8} />
        </g>
      )}
      {/* black glossy case + silver collar */}
      <Cylinder c0={[x, y, cz]} c1={[x + caseL, y, cz]} axis="x" r={r} fill={mix(C.ink, C.white, 0.06)} end={mix(C.ink, C.white, 0.2)} gloss={1} />
      <Cylinder c0={[x + caseL, y, cz]} c1={[x1, y, cz]} axis="x" r={r * 0.96} fill={PROP.silver} end={mix(PROP.silver, C.white, 0.3)} gloss={0.9} />
      {[0.35, 0.7].map((f, i) => { const a = sp([x + caseL + collar * f, y - r * 0.7, cz + r * 0.7]), b2 = sp([x + caseL + collar * f, y + r * 0.9, cz + r * 0.3]); return <line key={i} x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} stroke={PROP.silverDark} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />; })}
      {/* coral bullet: outline, body, slanted tip, gloss */}
      {out > 0 && (
        <g>
          <path d={spine} fill="none" stroke={C.ink} strokeWidth={W + 4} strokeLinecap="round" />
          <path d={spine} fill="none" stroke={PROP.coral} strokeWidth={W} strokeLinecap="round" />
          {melted < 0.5 && <path d={`M${tip[0] - 9} ${tip[1] - 11} L${tip[0] + 9} ${tip[1] + 5}`} stroke={mix(PROP.coral, C.ink, 0.25)} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
          <path d={`M${b0[0] + 3} ${b0[1] - W * 0.3} Q${mid[0] + 2} ${mid[1] - W * 0.32} ${tip[0] - 4} ${tip[1] - W * 0.28}`} fill="none" stroke={C.white} strokeWidth={3.5} strokeOpacity={0.8} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};
export const BalmJar: React.FC<{ p: P; crater?: number; lidOff?: boolean }> = ({ p, crater = 0, lidOff = true }) => {
  const [x, y, z] = p;
  const r = 2.15, h = 1.8;
  return (
    <g>
      <path d={smooth(blob(x + 0.5, y + 0.6, 0.02, r * 1.3, 8, 0.05))} fill={C.ink} opacity={0.1} />
      {/* oily ring on the table where the balm seeped out */}
      {crater > 0 && <path d={smooth(blob(x + 0.3, y + 0.3, 0.02, r * (1.25 + 0.3 * crater), 17, 0.18, 30))} fill={PROP.beige} fillOpacity={0.45 * crater} stroke={PROP.beigeDark} strokeWidth={1.5} strokeOpacity={0.8 * crater} />}
      <Cylinder c0={[x, y, z]} c1={[x, y, z + h]} axis="z" r={r} fill={C.white} end={C.white} gloss={0.8} />
      {/* thread ring under the lid */}
      <Cylinder c0={[x, y, z + h - 0.5]} c1={[x, y, z + h]} axis="z" r={r * 0.94} fill={mix(C.white, C.grey, 0.7)} end={C.white} line={false} />
      {lidOff ? (
        <g>
          {/* beige balm surface: smooth, or cratered with an oily ring */}
          <polygon points={pts2(ring([x, y, z + h + 0.01], "z", r * 0.84).map(sp))} fill={PROP.beige} {...LINE} />
          {crater > 0 && (
            <g>
              <polygon points={pts2(ring([x, y, z + h + 0.02], "z", r * 0.8).map(sp))} fill="none" stroke={mix(PROP.beige, C.white, 0.5)} strokeWidth={5} strokeOpacity={0.9 * crater} />
              <path d={smooth(blob(x + 0.2, y - 0.1, z + h + 0.03, r * 0.42, 9, 0.35, 18))} fill={PROP.beigeDark} opacity={crater} stroke={C.ink} strokeWidth={1} strokeOpacity={0.5} />
              <path d={smooth(blob(x + 0.3, y, z + h + 0.04, r * 0.22, 13, 0.4, 14))} fill={mix(PROP.beigeDark, C.ink, 0.25)} opacity={crater} />
              <ellipse cx={sp([x - r * 0.55, y + r * 0.2, z + h])[0]} cy={sp([x - r * 0.55, y + r * 0.2, z + h])[1]} rx={6} ry={2.5} fill={C.white} opacity={0.8 * crater} />
            </g>
          )}
        </g>
      ) : (
        <Cylinder c0={[x, y, z + h]} c1={[x, y, z + h + 0.8]} axis="z" r={r * 1.04} fill={C.white} end={C.white} opacity={0.45} gloss={1} />
      )}
    </g>
  );
};
/** The balm's clear lid, lying on the table. */
export const ClearLid: React.FC<{ p: P }> = ({ p }) => (
  <Cylinder c0={p} c1={[p[0], p[1], p[2] + 0.7]} axis="z" r={2.3} fill={C.white} end={mix(C.white, PROP.silver, 0.15)} opacity={0.55} gloss={1} />
);

/* ------------------------------------------------------------------ green stock box with a heat indicator */
export const StockBox: React.FC<{ p: P; cell: string; heat: number }> = ({ p, cell, heat }) => {
  const [x, y, z] = p;
  const w = 10, d = 8, h = 8;
  const segs = 8;
  const c = Math.cos(Math.PI / 6);
  const [lx, ly] = sp([x + 3, y + d, z + h - 2.6]);
  return (
    <g>
      <path d={smooth(blob(x + w / 2 + 0.8, y + d / 2 + 1, 0.02, w * 0.62, 6, 0.04))} fill={C.ink} opacity={0.1} />
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={C.green} />
      {/* lid seam and a hand hole on the side */}
      <polyline points={poly([[x, y + d, z + h - 1], [x + w, y + d, z + h - 1], [x + w, y, z + h - 1]])} stroke={mix(C.green, C.ink, 0.35)} strokeWidth={2} fill="none" />
      <polygon points={pts2(ring([x + w, y + d / 2, z + h - 2.4], "x", 0.9, 16).map(sp).map(([a, b2], i) => [a, b2 + (i < 8 ? 0 : 0)] as [number, number]))} fill={mix(C.green, C.ink, 0.5)} />
      {/* cell label on the front (+y) face */}
      <polygon points={poly([[x + 0.8, y + d, z + h - 1.5], [x + 5.2, y + d, z + h - 1.5], [x + 5.2, y + d, z + h - 3.9], [x + 0.8, y + d, z + h - 3.9]])} fill={C.white} {...LINE} />
      <text transform={`matrix(${c} 0.5 0 1 ${lx} ${ly})`} fontFamily="IBM Plex Mono" fontWeight={600} fontSize={26} fill={C.ink} textAnchor="middle" dominantBaseline="central">{cell}</text>
      {/* thermo strip: vertical, cool at the bottom, red zone at the top — sized to read without zooming in */}
      <polygon points={poly([[x + 5.0, y + d, z + 0.3], [x + 9.6, y + d, z + 0.3], [x + 9.6, y + d, z + 7.7], [x + 5.0, y + d, z + 7.7]])} fill={C.white} {...LINE} strokeWidth={2.5} />
      {Array.from({ length: segs }, (_, i) => {
        const z0 = z + 0.75 + i * 0.83, lit = i < Math.round(heat * segs);
        const col = i >= segs - 2 ? PROP.red : C.green;
        return <polygon key={i} points={poly([[x + 5.5, y + d + 0.01, z0], [x + 9.1, y + d + 0.01, z0], [x + 9.1, y + d + 0.01, z0 + 0.66], [x + 5.5, y + d + 0.01, z0 + 0.66]])} fill={lit ? col : mix(C.white, C.grey, 0.6)} stroke={C.ink} strokeWidth={1.4} strokeOpacity={0.6} />;
      })}
      {/* red-zone bracket */}
      <polyline points={poly([[x + 10.0, y + d, z + 6.3], [x + 10.5, y + d, z + 6.3], [x + 10.5, y + d, z + 7.6], [x + 10.0, y + d, z + 7.6]])} fill="none" stroke={PROP.red} strokeWidth={3} vectorEffect="non-scaling-stroke" />
    </g>
  );
};

/* ------------------------------------------------------------------ pieces that act on their own (no hands) */

/** Soft contact shadow on the table; shrinks and fades as the object rises. */
export const LiftShadow: React.FC<{ x: number; y: number; r: number; lift: number; seed?: number }> = ({ x, y, r, lift, seed = 2 }) => (
  <path d={smooth(blob(x + 0.4 + lift * 0.15, y + 0.5 + lift * 0.15, 0.015, r * (1 + lift * 0.06), seed, 0.06))} fill={C.ink} opacity={0.12 / (1 + lift * 0.35)} />
);

type BagBox = { x0: number; y0: number; x1: number; y1: number; z0: number; zTop: number };
/** Zip bag, back half (under the contents): a clear sheet lying on the table. */
export const ZipBagBack: React.FC<{ b: BagBox; op?: number }> = ({ b, op = 1 }) => (
  <g opacity={op}>
    <polygon points={poly([[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0]])} fill={C.white} fillOpacity={0.45} {...LINE} strokeOpacity={0.45} />
  </g>
);
/** Zip bag, front half: the top sheet lifts to open the mouth, then the zip runs left → right. */
export const ZipBagFront: React.FC<{ b: BagBox; open: number; zip: number; op?: number }> = ({ b, open, zip, op = 1 }) => {
  const zt = b.zTop + open * 2.6;
  const zipAt = b.x0 + 0.6 + (b.x1 - b.x0 - 1.2) * zip;
  return (
    <g opacity={op}>
      {/* sides of the pouch */}
      <polygon points={poly([[b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, zt], [b.x0, b.y1, zt]])} fill={C.white} fillOpacity={0.22} {...LINE} strokeOpacity={0.35} />
      <polygon points={poly([[b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, zt], [b.x1, b.y0, zt]])} fill={C.white} fillOpacity={0.18} {...LINE} strokeOpacity={0.35} />
      {/* top sheet with a glint */}
      <polygon points={poly([[b.x0, b.y0, zt], [b.x1, b.y0, zt], [b.x1, b.y1, zt], [b.x0, b.y1, zt]])} fill={C.white} fillOpacity={0.3} {...LINE} strokeOpacity={0.5} />
      <polyline points={poly([[b.x0 + 1.5, b.y0 + 1, zt + 0.02], [b.x0 + (b.x1 - b.x0) * 0.45, b.y0 + 1, zt + 0.02]])} stroke={C.white} strokeWidth={4} strokeOpacity={0.9} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {/* zip track: dashed while open, solid behind the slider */}
      <polyline points={poly([[b.x0 + 0.6, b.y0 + 0.5, zt + 0.03], [b.x1 - 0.6, b.y0 + 0.5, zt + 0.03]])} stroke={C.ink} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="3 3" fill="none" vectorEffect="non-scaling-stroke" />
      {zip > 0 && <polyline points={poly([[b.x0 + 0.6, b.y0 + 0.5, zt + 0.04], [zipAt, b.y0 + 0.5, zt + 0.04]])} stroke={C.ink} strokeWidth={2.5} fill="none" vectorEffect="non-scaling-stroke" />}
      {zip > 0 && zip < 1 && <polygon points={poly([[zipAt - 0.4, b.y0 + 0.1, zt + 0.05], [zipAt + 0.5, b.y0 + 0.1, zt + 0.05], [zipAt + 0.5, b.y0 + 1.1, zt + 0.05], [zipAt - 0.4, b.y0 + 1.1, zt + 0.05]])} fill={PROP.silverDark} {...LINE} />}
    </g>
  );
};

/** Bubble wrap winding round the jar: coverage climbs as it turns, then a tape band. */
export const BubbleWrapJar: React.FC<{ p: P; wrap: number; taped?: number }> = ({ p, wrap, taped = 0 }) => {
  if (wrap <= 0.01) return null;
  const [x, y, z] = p;
  const r = 2.95, h = 4.6 * wrap;
  const dots: React.ReactElement[] = [];
  const rows = Math.max(1, Math.floor(h / 0.8));
  for (let row = 0; row < rows; row++) {
    for (let k = 0; k < 7; k++) {
      const a = ((-30 + k * 25 + (row % 2) * 12) * Math.PI) / 180;
      const [bx, by] = sp([x + Math.cos(a) * r, y + Math.sin(a) * r, z + 0.45 + row * 0.8]);
      dots.push(<g key={`${row}-${k}`}><ellipse cx={bx} cy={by} rx={4.2} ry={3.4} fill={C.white} fillOpacity={0.6} stroke={C.ink} strokeOpacity={0.3} strokeWidth={0.8} /><circle cx={bx - 1.3} cy={by - 1.1} r={1} fill={C.white} /></g>);
    }
  }
  return (
    <g>
      <Cylinder c0={[x, y, z]} c1={[x, y, z + h]} axis="z" r={r} fill={C.white} end={mix(C.white, PROP.silver, 0.15)} opacity={0.5} gloss={0.9} />
      {dots}
      {taped > 0.01 && <Cylinder c0={[x, y, z + 1.6]} c1={[x, y, z + 2.6]} axis="z" r={r + 0.05} fill={PROP.tapeTint} end={mix(PROP.tapeTint, C.white, 0.3)} opacity={0.8 * taped} gloss={0.5} />}
    </g>
  );
};

/** A loose sheet of bubble wrap in flight (flat, bubbles showing). */
export const BubbleSheet: React.FC<{ c: P; s: number }> = ({ c, s }) => {
  const [x, y, z] = c, w = 3.2 * s, d = 2.4 * s;
  return (
    <g>
      <polygon points={poly([[x - w, y - d, z], [x + w, y - d, z], [x + w, y + d, z], [x - w, y + d, z]])} fill={C.white} fillOpacity={0.6} {...LINE} strokeOpacity={0.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const [bx, by] = sp([x - w * 0.7 + (i % 4) * w * 0.46, y - d * 0.55 + Math.floor(i / 4) * d * 0.55, z + 0.02]);
        return <ellipse key={i} cx={bx} cy={by} rx={4} ry={3} fill={C.white} fillOpacity={0.7} stroke={C.ink} strokeOpacity={0.3} strokeWidth={0.8} />;
      })}
    </g>
  );
};

/** Crumpled kraft ball (filler). `squash` flattens it on impact. */
export const PaperBall: React.FC<{ c: P; r?: number; seed: number; squash?: number }> = ({ c, r = 1.4, seed, squash = 0 }) => {
  const [x, y, z] = c;
  const rz = r * (1 - 0.3 * squash);
  return (
    <g>
      <path d={smooth(blob(x, y, z + rz, r * (1 + 0.15 * squash), seed, 0.5, 11))} fill={mix(PROP.kraft, C.white, 0.25)} {...LINE} />
      <path d={`M${sp([x - r * 0.4, y, z + rz])} L${sp([x + r * 0.1, y - r * 0.3, z + rz])} L${sp([x + r * 0.4, y + r * 0.2, z + rz])}`} fill="none" stroke={PROP.kraftDark} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </g>
  );
};

/** Printed shipping label lying flat (barcode + address lines). `press` lowers and flattens it. */
export const ShippingLabel: React.FC<{ c: P; tilt?: number; sheen?: number }> = ({ c, tilt = 0, sheen = 0 }) => {
  const [x, y, z] = c, w = 2.6, d = 1.9;
  const zf = (dx: number) => z + tilt * (dx + w) * 0.35;           // front edge dips while it lands
  const q = (dx: number, dy: number, dz = 0): [number, number, number] => [x + dx, y + dy, zf(dx) + dz];
  return (
    <g>
      <polygon points={poly([q(-w, -d), q(w, -d), q(w, d), q(-w, d)])} fill={C.white} {...LINE} />
      {[-1.9, -1.5, -1.3, -0.9, -0.6, -0.2, 0.1, 0.5].map((bx, i) => (
        <polyline key={i} points={poly([q(bx, -d + 0.35, 0.01), q(bx, -0.2, 0.01)])} stroke={C.ink} strokeWidth={i % 3 ? 1.6 : 2.6} fill="none" vectorEffect="non-scaling-stroke" />
      ))}
      {[0.35, 0.85, 1.35].map((ly, i) => (
        <polyline key={i} points={poly([q(-2, ly, 0.01), q(i === 2 ? 0.2 : 1.6, ly, 0.01)])} stroke={C.ink} strokeOpacity={0.55} strokeWidth={1.4} fill="none" vectorEffect="non-scaling-stroke" />
      ))}
      {sheen > 0 && sheen < 1 && <polyline points={poly([q(-w + 2 * w * sheen, -d, 0.02), q(-w + 2 * w * sheen - 0.6, d, 0.02)])} stroke={C.white} strokeWidth={5} strokeOpacity={0.9} fill="none" vectorEffect="non-scaling-stroke" />}
    </g>
  );
};

/** Packing tape pulled off the dispenser: a brown clear ribbon from the blade to its tip. */
export const TapeRibbon: React.FC<{ from: P; to: P; sag?: number; op?: number }> = ({ from, to, sag = 1.2, op = 1 }) => {
  const mid: P = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, Math.max(from[2], to[2]) + sag];
  const d = `M${sp(from)} Q${sp(mid)} ${sp(to)}`;
  return (
    <g opacity={op}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={13} strokeLinecap="round" strokeOpacity={0.8} />
      <path d={d} fill="none" stroke={PROP.tapeTint} strokeWidth={10} strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.white} strokeWidth={2.5} strokeOpacity={0.6} strokeLinecap="round" />
    </g>
  );
};
