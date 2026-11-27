/* "Warehouse ad ideas" — the same 16-scene edit as the source clip (same cut points, same kinds of looks), redrawn for
   Dockentra and synced to the new voiceover. The presenter is NOT drawn here: she is matted from the source and
   composited by ffmpeg between two renders of this file:
     IdeasBG  — opaque backgrounds (behind her)
     IdeasFG  — transparent overlays: captions, stickers, cards, HUD (in front of her)
   1920x1080 at 24000/1001 fps, 893 frames (37.25 s). Everything is a function of t = frame / fps (seek-safe). */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, EASE_APPEAR, EASE_MOVE, clamp, lerp, ramp } from "../brand";
import { loadBrandFonts } from "../fonts";
import { Room, RoomState, RECV, SHELF, BIN } from "../warehouse/Room";
import { Box, iso } from "../warehouse/iso";
import { LOGO } from "../onefold2/logo";

export const FPS_I = 24000 / 1001;
export const TOTAL_I = 893;
const W = 1920, H = 1080;
const M = "Manrope, sans-serif";

/* ---------------------------------------------------------------- scenes: the source's own cut points */
export const CUTS = [0, 1.88, 4.05, 5.42, 7.84, 11.01, 14.47, 16.14, 20.19, 20.65, 23.77, 27.9, 31.66, 32.82, 33.83, 34.58, 37.3];
export type SceneId = "intro" | "search" | "chill" | "but" | "shipit" | "sepia" | "kawaii" | "manga" | "storm" | "packed" | "holo" | "regular" | "noway" | "pop" | "pixel" | "grid";
const IDS: SceneId[] = ["intro", "search", "chill", "but", "shipit", "sepia", "kawaii", "manga", "storm", "packed", "holo", "regular", "noway", "pop", "pixel", "grid"];
export const sceneAt = (t: number) => { let i = 0; while (i < IDS.length - 1 && t >= CUTS[i + 1]) i++; return { id: IDS[i], i, a: CUTS[i], b: CUTS[i + 1] }; };
const IDEA: Partial<Record<SceneId, string>> = { chill: "IDEA #1 · SUPER CHILL", shipit: "IDEA #2 · SHIP IT", sepia: "IDEA #3 · FUNNY & ANIMATED", kawaii: "IDEA #4 · KAWAII", manga: "IDEA #5 · MANGA", holo: "IDEA #6 · ULTRA RARE", noway: "IDEA #7 · NO WAY", pop: "IDEA #8 · POP", pixel: "IDEA #9 · PIXEL" };

/* ---------------------------------------------------------------- motion */
/** pop with a little overshoot: 0 → 1.08 → 1 */
const pop = (t: number, at: number, d = 0.3) => { const k = clamp((t - at) / d); return k < 0.6 ? 1.08 * EASE_APPEAR(k / 0.6) : lerp(1.08, 1, EASE_MOVE((k - 0.6) / 0.4)); };
const wob = (t: number, per: number, ph = 0) => Math.sin((2 * Math.PI * t) / per + ph);
const on = (t: number, a: number, b = 1e9) => t >= a && t < b;

/* ---------------------------------------------------------------- brand pieces */
/** the supplied Dockentra logo vector; wordmark colour switchable for dark backgrounds */
const Logo: React.FC<{ h: number; word?: string; mark?: boolean; fill?: number }> = ({ h, word = "#0B0D10", mark = true, fill = 1 }) => (
  <svg height={h} viewBox={mark ? `0 0 ${LOGO.w} ${LOGO.h}` : `118 0 ${LOGO.w - 118} ${LOGO.h}`} style={{ display: "block", overflow: "visible" }}>
    <defs>
      <linearGradient id="igl" x1="2" y1="100" x2="88" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#0A2C26" /><stop offset=".30" stopColor="#123E36" /><stop offset=".62" stopColor="#14806A" /><stop offset=".84" stopColor="#189C7E" /><stop offset="1" stopColor="#0C7261" /></linearGradient>
      <linearGradient id="irl" x1="6" y1="95" x2="76" y2="54" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#D2FBE8" /><stop offset=".28" stopColor="#96EFCC" /><stop offset=".56" stopColor="#4AD7AC" /><stop offset=".82" stopColor="#2CC99C" stopOpacity=".45" /><stop offset="1" stopColor="#2CC99C" stopOpacity="0" /></linearGradient>
      <clipPath id="icl"><path d={LOGO.d} clipRule="evenodd" /></clipPath>
      <clipPath id="ifill"><polygon points={`-60,100 ${-60 + 200 * fill},100 ${-60 + 200 * fill - 160},-60 -220,-60`} /></clipPath>
    </defs>
    {mark && <><path d={LOGO.d} fill="url(#igl)" fillRule="evenodd" /><g clipPath="url(#ifill)"><path d={LOGO.mass} fill="url(#irl)" clipPath="url(#icl)" /></g></>}
    <g transform="translate(122,72)"><path d={LOGO.word} fill={word} /></g>
  </svg>
);
const DMark: React.FC<{ size: number }> = ({ size }) => <Img src={staticFile("apple/d-color.png")} style={{ width: size, height: size, display: "block" }} />;
/** a Dockentra parcel: green box, darker tape, white label */
const Parcel: React.FC<{ s: number; face?: boolean; blush?: boolean; tint?: string; t?: number }> = ({ s, face, blush, tint = C.green, t = 0 }) => (
  <svg width={s} height={s} viewBox="-60 -70 120 120" style={{ display: "block", overflow: "visible" }}>
    <polygon points="0,-50 52,-24 0,2 -52,-24" fill={mixc(tint, "#ffffff", 0.18)} stroke="#0B0D10" strokeWidth={3} strokeLinejoin="round" />
    <polygon points="-52,-24 0,2 0,50 -52,24" fill={tint} stroke="#0B0D10" strokeWidth={3} strokeLinejoin="round" />
    <polygon points="52,-24 0,2 0,50 52,24" fill={mixc(tint, "#0B0D10", 0.22)} stroke="#0B0D10" strokeWidth={3} strokeLinejoin="round" />
    <polygon points="-8,-46 8,-38 -44,-12 -60,-20" fill={mixc(tint, "#0B0D10", 0.3)} transform="translate(30 6)" />
    <polygon points="14,8 40,-5 40,10 14,23" fill="#ffffff" stroke="#0B0D10" strokeWidth={2} />
    {face && <g transform={`translate(-26 ${22 + 2 * wob(t, 0.8)})`}>
      <ellipse cx={-10} cy={0} rx={4} ry={5.5} fill="#0B0D10" /><ellipse cx={10} cy={-4} rx={4} ry={5.5} fill="#0B0D10" />
      <path d="M-6 8 Q2 15 9 6" stroke="#0B0D10" strokeWidth={3} fill="none" strokeLinecap="round" />
      {blush && <><ellipse cx={-17} cy={8} rx={6} ry={3.5} fill="#FF8FB1" opacity={0.8} /><ellipse cx={17} cy={3} rx={6} ry={3.5} fill="#FF8FB1" opacity={0.8} /></>}
    </g>}
  </svg>
);
function mixc(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
/** a WMS screenshot on a card */
const Shot: React.FC<{ src: string; w: number; tilt?: number; style?: React.CSSProperties; filter?: string }> = ({ src, w, tilt = 0, style, filter }) => (
  <div style={{ width: w, borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 30px 60px -20px rgba(0,0,0,.55), 0 0 0 3px #fff", transform: `rotate(${tilt}deg)`, ...style }}>
    <Img src={staticFile(src)} style={{ width: "100%", display: "block", filter }} />
  </div>
);


/** a phone showing a mobile WMS screen; the screen scrolls a little so it never sits still */
const Phone: React.FC<{ src: string; t: number; at: number; w?: number; tilt?: number; scroll?: number; ar?: number }> = ({ src, t, at, w = 330, tilt = -6, scroll = 60, ar = 2532 / 1170 }) => {
  const sw = w - 28, sh = Math.round(sw * 2.05);
  const p = pop(t, at, 0.35), sc = scroll * ramp(t, at + 0.3, 2.5, EASE_MOVE);
  return (
    <div style={{ width: w, height: sh + 28, borderRadius: 54, background: "#0B0D10", padding: 14, boxSizing: "border-box", boxShadow: "0 40px 80px -20px rgba(0,0,0,.6), inset 0 0 0 3px #2C3036", transform: `perspective(1400px) rotateY(${tilt * 2}deg) rotate(${tilt}deg) translateY(${(1 - p) * 120 + 8 * wob(t, 2.4)}px) scale(${p})`, opacity: clamp(p * 2) }}>
      <div style={{ position: "relative", width: sw, height: sh, borderRadius: 42, overflow: "hidden", background: "#F5F7F8" }}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 44 - sc, width: sw, height: sw * ar, display: "block" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, background: "#F5F7F8" }} />
        <div style={{ position: "absolute", left: sw / 2 - 52, top: 12, width: 104, height: 30, borderRadius: 15, background: "#0B0D10" }} />
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- type */
type Wd = { w: string; at: number; hi?: string };
const words = (s: string, ats: number[], hi: Record<number, string> = {}): Wd[] => s.split(" ").map((w, i) => ({ w, at: ats[Math.min(i, ats.length - 1)], hi: hi[i] }));
/** word-by-word caption: each word pops in at its own time (source style) */
const Cap: React.FC<{ t: number; ws: Wd[]; x: number; y: number; size?: number; color?: string; align?: "left" | "right" | "center"; until?: number; lines?: number[]; font?: string; weight?: number; stroke?: string; italic?: boolean; width?: number }> = ({ t, ws, x, y, size = 64, color = "#fff", align = "left", until = 1e9, lines = [], font = M, weight = 800, stroke, italic, width = 900 }) => {
  if (t < ws[0].at - 0.01 || t >= until) return null;
  const rows: Wd[][] = [[]];
  ws.forEach((w, i) => { if (lines.includes(i) && rows[rows.length - 1].length) rows.push([]); rows[rows.length - 1].push(w); });
  const left = align === "left" ? x : align === "right" ? x - width : x - width / 2;
  return (
    <div style={{ position: "absolute", left, top: y, width, textAlign: align, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.02em", fontStyle: italic ? "italic" : undefined }}>
      {rows.map((r, ri) => (
        <div key={ri} style={{ whiteSpace: "nowrap" }}>
          {r.map((w, k) => {
            const p = pop(t, w.at, 0.22);
            if (t < w.at) return <span key={k} style={{ display: "inline-block", opacity: 0, marginRight: "0.25em" }}>{w.w}</span>;
            return <span key={k} style={{ display: "inline-block", color: w.hi ?? color, transform: `scale(${p})`, transformOrigin: "50% 80%", marginRight: k < r.length - 1 ? "0.25em" : 0, WebkitTextStroke: stroke, paintOrder: "stroke fill", textShadow: stroke ? undefined : "0 4px 18px rgba(0,0,0,.45)" }}>{w.w}</span>;
          })}
        </div>
      ))}
    </div>
  );
};
/** chunky 3D sticker type (GO VIRAL / NO WAY / BUT style) */
const Chunky: React.FC<{ text: string; size: number; fill: string; edge?: string; depth?: number; outline?: string; style?: React.CSSProperties }> = ({ text, size, fill, edge = "#0B0D10", depth = 10, outline = "#fff", style }) => (
  <div style={{ position: "relative", fontFamily: M, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.03em", whiteSpace: "nowrap", ...style }}>
    <div style={{ position: "absolute", left: 0, top: 0, color: edge, WebkitTextStroke: `${size * 0.09}px ${outline}`, paintOrder: "stroke fill", transform: `translate(${depth * 0.4}px, ${depth}px)` }}>{text}</div>
    <div style={{ position: "relative", color: fill, WebkitTextStroke: `${size * 0.05}px ${edge}`, paintOrder: "stroke fill" }}>{text}</div>
  </div>
);
const Bubble: React.FC<{ children: React.ReactNode; w: number; tail?: "left" | "right" | "down"; style?: React.CSSProperties; size?: number; font?: string; bg?: string }> = ({ children, w, tail = "left", style, size = 34, font = M, bg = "#fff" }) => (
  <div style={{ position: "absolute", width: w, padding: "22px 30px", background: bg, border: "4px solid #0B0D10", borderRadius: 28, fontFamily: font, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: "#0B0D10", boxShadow: "6px 8px 0 #0B0D10", ...style }}>
    {children}
    <svg width={60} height={50} style={{ position: "absolute", overflow: "visible", ...(tail === "left" ? { left: 30, bottom: -46 } : tail === "right" ? { right: 30, bottom: -46 } : { left: w / 2 - 30, bottom: -46 }) }}>
      <path d={tail === "right" ? "M10 0 L52 44 L40 0 Z" : "M8 0 L4 44 L44 0 Z"} fill={bg} stroke="#0B0D10" strokeWidth={4} strokeLinejoin="round" />
      <rect x={tail === "right" ? 8 : 6} y={-6} width={42} height={9} fill={bg} />
    </svg>
  </div>
);

/* ================================================================ backgrounds (behind her) */
const ROOM: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: { x: SHELF.x0 + SHELF.bay + 0.6, y: SHELF.y0 + 0.8, z: SHELF.levels[0] + 0.5, hooked: false }, highlightCells: false };
/** the Dockentra room, as a backdrop: zoom, focus point, blur */
const RoomBG: React.FC<{ zoom: number; fx: number; fy: number; fz?: number; blur?: number; filter?: string; t: number }> = ({ zoom, fx, fy, fz = 6, blur = 0, filter = "", t }) => {
  const c = iso(fx, fy, fz);
  const z = zoom * (1 + 0.02 * wob(t, 9));
  return (
    <AbsoluteFill style={{ filter: `${blur ? `blur(${blur}px)` : ""} ${filter}`, transform: "scale(1.04)" }}>
      <svg width={W} height={H}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${z}) translate(${-c.X} ${-c.Y})`}><Room s={ROOM} /></g>
      </svg>
    </AbsoluteFill>
  );
};
/** the studio: Dock Green wall with slats, a glowing D sign, the shelving out of focus, warm key light, a desk */
const Studio: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: "#0E2A23" }}>
    <AbsoluteFill style={{ background: "linear-gradient(#124437, #0B2A23 85%)" }} />
    <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 5px, rgba(0,0,0,.10) 5px 9px, rgba(0,0,0,0) 9px 72px)", filter: "blur(1.2px)", transform: `translateX(${-6 * t}px)` }} />
    {[[260, 300, 120, 0], [1560, 640, 90, 1], [1720, 300, 60, 2], [120, 760, 70, 3]].map(([x, y, r, ph], i) => <div key={i} style={{ position: "absolute", left: x + 12 * wob(t, 6, ph), top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "radial-gradient(rgba(255,214,160,.28), rgba(255,214,160,0) 70%)" }} />)}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 34% 52% at 50% 46%, rgba(255,214,160,.38), rgba(255,214,160,0) 70%), linear-gradient(90deg, rgba(8,30,24,.75), rgba(8,30,24,0) 30%, rgba(8,30,24,0) 70%, rgba(8,30,24,.75))" }} />
    {/* neon D sign on the back wall, right of her */}
    <div style={{ position: "absolute", right: 150, top: 150, filter: "blur(2.5px) drop-shadow(0 0 30px rgba(79,220,169,.75))", opacity: 0.85 + 0.08 * wob(t, 2.3), transform: "rotate(-3deg)" }}><DMark size={210} /></div>
    {/* desk: light-grey top with the mint edge stripe (the receiving table) */}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 86, background: "linear-gradient(#E7ECEE, #CFD6D9)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, height: 14, background: C.mint }} />
  </AbsoluteFill>
);
const Clouds: React.FC<{ t: number; tint: string; n?: number; y0?: number }> = ({ t, tint, n = 7, y0 = 700 }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const x = ((i * 337 + t * (18 + 6 * (i % 3))) % 2400) - 300, y = y0 + (i % 3) * 90 - (i % 2) * 140, s = 1 + (i % 3) * 0.35;
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: 380 * s, height: 140 * s, borderRadius: 999, background: tint, filter: "blur(6px)", boxShadow: `${80 * s}px ${-40 * s}px 0 ${-10 * s}px ${tint}, ${-70 * s}px ${-20 * s}px 0 ${-20 * s}px ${tint}` }} />;
  })}</>
);
const Rays: React.FC<{ t: number; a: string; b: string; cx?: number; cy?: number; n?: number; speed?: number }> = ({ t, a, b, cx = 50, cy = 50, n = 24, speed = 6 }) => (
  <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${t * speed}deg at ${cx}% ${cy}%, ${a} 0deg ${180 / n}deg, ${b} ${180 / n}deg ${360 / n}deg)` }} />
);
const Halftone: React.FC<{ color: string; size?: number; opacity?: number }> = ({ color, size = 14, opacity = 0.35 }) => (
  <AbsoluteFill style={{ backgroundImage: `radial-gradient(${color} 28%, transparent 30%)`, backgroundSize: `${size}px ${size}px`, opacity }} />
);

const DARK: SceneId[] = ["intro", "search", "but", "packed", "regular", "storm", "noway", "pixel", "sepia"];
export const IdeasBG: React.FC = () => {
  const t = useCurrentFrame() / FPS_I;
  const s = sceneAt(t);
  return (
    <AbsoluteFill>
      <Backdrop />
      {s.id !== "grid" && <div style={{ position: "absolute", left: W / 2 - 150, top: 40, filter: "drop-shadow(0 4px 14px rgba(0,0,0,.35))" }}><Logo h={56} word={DARK.includes(s.id) ? "#fff" : "#0B0D10"} /></div>}
    </AbsoluteFill>
  );
};
const Backdrop: React.FC = () => {
  loadBrandFonts();
  const t = useCurrentFrame() / FPS_I;
  const s = sceneAt(t), k = t - s.a;
  switch (s.id) {
    case "intro": case "search": case "but": case "packed": case "regular": return <Studio t={t} />;
    case "chill": return (
      <AbsoluteFill style={{ background: "linear-gradient(#5B5BB6 0%, #C77BB0 38%, #F7A97B 62%, #FFD39A 78%, #F7A97B 100%)" }}>
        <div style={{ position: "absolute", left: 1180, top: 520 - 10 * k, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(#FFF3D6, #FFC97F 60%, rgba(255,201,127,0) 72%)" }} />
        <Clouds t={t} tint="rgba(255,236,228,.92)" y0={760} />
        {[[260, 640, 150, 0], [1500, 360, 120, 1.3], [380, 260, 100, 2.1]].map(([x, y, sz, ph], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y + 14 * wob(t, 3.4, ph), transform: `rotate(${8 * wob(t, 4, ph)}deg)` }}><Parcel s={sz} face t={t} /></div>
        ))}
      </AbsoluteFill>
    );
    case "shipit": return (
      <AbsoluteFill>
        <Rays t={t} a="#FFE15A" b="#53B8F5" cx={58} cy={58} n={18} speed={10} />
        <AbsoluteFill style={{ background: "radial-gradient(circle at 58% 58%, rgba(255,255,255,.55), rgba(255,255,255,0) 40%)" }} />
        <Clouds t={t} tint="#ffffff" n={6} y0={900} />
      </AbsoluteFill>
    );
    case "sepia": return (
      <AbsoluteFill style={{ background: "#E9D9B6" }}>
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <path d={`M0 ${700} Q 300 ${600 + 10 * wob(t, 3)} 640 690 T 1300 670 T 1920 640 L1920 1080 L0 1080 Z`} fill="#CDB487" stroke="#5B4220" strokeWidth={5} />
          <path d="M0 830 Q 420 740 900 820 T 1920 790 L1920 1080 L0 1080 Z" fill="#B99A63" stroke="#5B4220" strokeWidth={5} />
          {Array.from({ length: 9 }, (_, i) => <g key={i} transform={`translate(${120 + i * 210} ${860 + (i % 2) * 40})`}><path d="M0 0 C -6 -30, 6 -30, 0 -60" stroke="#5B4220" strokeWidth={4} fill="none" /><circle cy={-66} r={12} fill="#E9D9B6" stroke="#5B4220" strokeWidth={4} /></g>)}
          {[[300, 180], [900, 120], [1250, 230]].map(([x, y], i) => <g key={i} transform={`translate(${x + 20 * wob(t, 5, i)} ${y})`}><ellipse rx={110} ry={40} fill="#F3E4C2" stroke="#5B4220" strokeWidth={4} /><ellipse cx={-50} cy={-22} rx={50} ry={34} fill="#F3E4C2" stroke="#5B4220" strokeWidth={4} /><ellipse cx={40} cy={-28} rx={58} ry={40} fill="#F3E4C2" stroke="#5B4220" strokeWidth={4} /></g>)}
        </svg>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(233,217,182,0) 50%, rgba(80,55,25,.6) 100%)" }} />
        {/* the old cartoon sun with a face */}
        <svg width={260} height={260} style={{ position: "absolute", left: 1560, top: 40, transform: `rotate(${6 * wob(t, 2)}deg)` }} viewBox="-130 -130 260 260">
          {Array.from({ length: 14 }, (_, i) => <path key={i} d="M0 -118 L12 -82 L-12 -82 Z" fill="#7A5A2F" transform={`rotate(${i * 360 / 14})`} />)}
          <circle r={74} fill="#C9A867" stroke="#5B4220" strokeWidth={5} />
          <circle cx={-24} cy={-12} r={8} fill="#3A2A12" /><circle cx={24} cy={-12} r={8} fill="#3A2A12" /><path d="M-32 18 Q0 50 32 18" stroke="#3A2A12" strokeWidth={6} fill="none" strokeLinecap="round" />
        </svg>
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(60,40,15,.05) 0 2px, transparent 2px 5px)", opacity: 0.8 + 0.2 * Math.sin(t * 40) }} />
      </AbsoluteFill>
    );
    case "kawaii": return (
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #FFC6E2, #F3B6F2 50%, #D9C2FF)" }}>
        {Array.from({ length: 22 }, (_, i) => {
          const x = (i * 211) % 1920, y = ((i * 137 + t * 40) % 1200) - 60;
          return <div key={i} style={{ position: "absolute", left: x, top: y, fontSize: 40 + (i % 3) * 18, color: i % 2 ? "#fff" : "#FF7FB8", fontFamily: M, transform: `rotate(${15 * wob(t, 3, i)}deg)` }}>{i % 3 ? "♥" : "✦"}</div>;
        })}
        {[[110, 640, 230, 0], [1560, 600, 260, 1], [1300, 120, 150, 2]].map(([x, y, sz, ph], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y + 16 * wob(t, 1.6, ph) }}><Parcel s={sz} face blush tint={i === 1 ? "#E58DBA" : "#F3A6CB"} t={t} /></div>
        ))}
      </AbsoluteFill>
    );
    case "manga": return (
      <AbsoluteFill style={{ background: "#fff" }}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 52% 48%, #fff 30%, #D9D9D9 100%)" }} />
        <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${k * 2}deg at 52% 48%, rgba(0,0,0,.85) 0deg 1.2deg, rgba(0,0,0,0) 1.2deg 7deg)`, WebkitMaskImage: "radial-gradient(circle at 52% 48%, transparent 26%, #000 60%)", maskImage: "radial-gradient(circle at 52% 48%, transparent 26%, #000 60%)" }} />
        <Halftone color="#000" size={10} opacity={0.12} />
      </AbsoluteFill>
    );
    case "storm": return (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #6B5BD6, #2A1F6B 70%)" }}>
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {[[200, 0, 1], [1500, 0, -1], [900, 0, 1], [1750, 200, -1]].map(([x, y, d], i) => {
            const fl = (Math.floor(t * 24) + i) % 3 === 0;
            return <path key={i} d={`M${x} ${y} l${40 * d} 180 l${-50 * d} 20 l${70 * d} 220 l${-40 * d} 10 l${60 * d} 260`} stroke={fl ? "#fff" : "#D7CCFF"} strokeWidth={fl ? 10 : 6} fill="none" style={{ filter: "drop-shadow(0 0 18px #B9A8FF)" }} />;
          })}
        </svg>
      </AbsoluteFill>
    );
    case "holo": return (
      <AbsoluteFill style={{ background: `conic-gradient(from ${t * 40}deg at 30% 40%, #FFD1F0, #C8F7FF, #E2FFC8, #FFF1B8, #E3CCFF, #FFD1F0)` }}>
        <AbsoluteFill style={{ background: `linear-gradient(${115 + 20 * wob(t, 3)}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.7) 48%, rgba(255,255,255,0) 62%)` }} />
        {/* the trading card frame, behind her */}
        <div style={{ position: "absolute", left: 760, top: 70, width: 560, height: 860, borderRadius: 26, background: "linear-gradient(160deg, #1B2D6B, #0F5F4A)", border: "14px solid #D9B14A", boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)" }}>
          <div style={{ position: "absolute", left: 24, right: 24, top: 24, bottom: 250, borderRadius: 10, background: "radial-gradient(circle at 50% 35%, #3FA88C, #12324A 75%)" }} />
        </div>
      </AbsoluteFill>
    );
    case "noway": return (
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, #FFF1A8 0%, #FFB23A 18%, #F2581E 42%, #8E1408 80%)" }}>
        {Array.from({ length: 40 }, (_, i) => {
          const a = (i * 137.5) % 360, r = ((t * 900 + i * 60) % 1100);
          return <div key={i} style={{ position: "absolute", left: 960 + Math.cos(a * Math.PI / 180) * r, top: 590 + Math.sin(a * Math.PI / 180) * r * 0.7, width: 14, height: 14, borderRadius: 7, background: i % 2 ? "#FFE58A" : "#FF8A3A", opacity: 1 - r / 1100 }} />;
        })}
      </AbsoluteFill>
    );
    case "pop": return (
      <AbsoluteFill>
        <Rays t={t} a="#E8262B" b="#FFD31A" cx={62} cy={55} n={14} speed={0} />
        <Halftone color="#1F3C9E" size={18} opacity={0.28} />
        <svg width={W} height={H} style={{ position: "absolute" }}><path d="M0 1080 C 200 900, 380 1010, 520 880 S 820 1000, 1000 900 S 1500 1040, 1920 880 L1920 1080 Z" fill="#fff" stroke="#0B0D10" strokeWidth={6} /></svg>
      </AbsoluteFill>
    );
    case "pixel": return (
      <AbsoluteFill style={{ background: "linear-gradient(#25145E, #6A2FA6 55%, #F07BC0)", imageRendering: "pixelated" }}>
        {Array.from({ length: 30 }, (_, i) => <div key={i} style={{ position: "absolute", left: (i * 263) % 1920, top: (i * 97) % 500, width: 10, height: 10, background: (Math.floor(t * 6) + i) % 4 ? "#fff" : "#FFE27A" }} />)}
        <svg width={W} height={H} style={{ position: "absolute" }} shapeRendering="crispEdges">
          {Array.from({ length: 24 }, (_, i) => <rect key={i} x={i * 80} y={760 - ((i * 7919) % 5) * 40} width={80} height={400} fill={i % 2 ? "#3B1F7A" : "#4A2690"} />)}
          {Array.from({ length: 24 }, (_, i) => <rect key={`b${i}`} x={i * 80} y={900 - ((i * 104729) % 3) * 40} width={80} height={300} fill="#24124F" />)}
        </svg>
      </AbsoluteFill>
    );
    case "grid": return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 40%, #173A31, #0B0D10 70%)" }} />;
  }
};

/* ================================================================ overlays (in front of her) */
const HUD: React.FC<{ t: number; id: SceneId; k: number }> = ({ t, id, k }) => {
  const n = Object.keys(IDEA).filter((s) => IDS.indexOf(s as SceneId) <= IDS.indexOf(id)).length;
  return (
    <>
      <div style={{ position: "absolute", left: 40, top: 34, padding: "10px 20px", borderRadius: 999, background: "rgba(11,13,16,.72)", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", color: "#fff" }}>AD IDEAS · VOTE AT THE END</div>
      {n > 0 && (
        <div style={{ position: "absolute", right: 40, top: 34, display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "rgba(11,13,16,.72)", color: "#fff", fontFamily: M, fontWeight: 800, fontSize: 28, transform: `scale(${k < 0.4 && IDEA[id] ? pop(k, 0, 0.35) : 1})` }}>
          <span style={{ color: "#FF4D6D" }}>♥</span>{n}<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 18, opacity: 0.8 }}>IDEAS</span>
        </div>
      )}
      {IDEA[id] && <div style={{ position: "absolute", right: 40, bottom: 34, padding: "8px 16px", borderRadius: 8, background: "rgba(11,13,16,.78)", color: "#fff", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 20, letterSpacing: "0.08em" }}>{IDEA[id]}</div>}
    </>
  );
};
const SearchBar: React.FC<{ t: number }> = ({ t }) => {
  const q = "how to ship it all";
  const typed = q.slice(0, Math.floor(clamp((t - 2.3) / 0.62) * q.length));
  const sug = ["how to ship it all from ireland", "how to ship it all without a warehouse", "how to ship it all on tiktok shop"];
  const open = ramp(t, 3.0, 0.25, EASE_APPEAR);
  return (
    <div style={{ position: "absolute", left: 120, top: 120, width: 780, transform: `scale(${pop(t, 1.9, 0.3)})`, transformOrigin: "0 0" }}>
      <div style={{ height: 76, borderRadius: 38, background: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,.35)", display: "flex", alignItems: "center", padding: "0 30px", gap: 18, fontFamily: M, fontWeight: 700, fontSize: 34, color: "#0B0D10" }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#0B0D10" strokeWidth={2.4} strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
        <span>{typed}<span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0 }}>|</span></span>
      </div>
      {open > 0 && (
        <div style={{ marginTop: 10, borderRadius: 22, background: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: "10px 0", opacity: open, transform: `translateY(${(1 - open) * -12}px)` }}>
          {sug.map((sg, i) => <div key={i} style={{ padding: "12px 30px", fontFamily: M, fontWeight: 500, fontSize: 28, color: "#3A3F47" }}><b style={{ color: "#0B0D10" }}>{q}</b>{sg.slice(q.length)}</div>)}
        </div>
      )}
    </div>
  );
};
const Sticker: React.FC<{ t: number; at: number; children: React.ReactNode; x: number; y: number; rot?: number }> = ({ t, at, children, x, y, rot = 0 }) => t < at ? null : (
  <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot + 2 * wob(t, 1.3)}deg) scale(${pop(t, at, 0.28)})` }}>{children}</div>
);
const StickerCard: React.FC<{ text: string; bg: string; color: string; w: number; size: number; font?: string }> = ({ text, bg, color, w, size, font = M }) => (
  <div style={{ width: w, padding: "18px 0", textAlign: "center", borderRadius: 18, background: bg, border: "6px solid #fff", boxShadow: "0 14px 30px rgba(0,0,0,.4)", fontFamily: font, fontWeight: 800, fontSize: size, color, letterSpacing: "-0.02em" }}>{text}</div>
);
const Stamp: React.FC<{ t: number; at: number; text: string; x: number; y: number; color?: string; size?: number; rot?: number }> = ({ t, at, text, x, y, color = "#E8262B", size = 120, rot = -8 }) => {
  if (t < at) return null;
  const k = clamp((t - at) / 0.18), s = lerp(2.2, 1, EASE_APPEAR(k));
  return <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, opacity: Math.min(1, k * 2), padding: "6px 26px", border: `10px solid ${color}`, borderRadius: 18, color, fontFamily: M, fontWeight: 800, fontSize: size, letterSpacing: "0.02em", mixBlendMode: "normal" }}>{text}</div>;
};

export const IdeasFG: React.FC = () => {
  loadBrandFonts();
  const t = useCurrentFrame() / FPS_I;
  const s = sceneAt(t), k = t - s.a;
  return (
    <AbsoluteFill>
      {s.id !== "grid" && <HUD t={t} id={s.id} k={k} />}
      {/* ---- intro: "okay. warehouse, warehouse, warehouse ad." */}
      {s.id === "intro" && <>
        <Cap t={t} ws={words("okay.", [0.0])} x={110} y={420} size={120} until={0.55} />
        <Sticker t={t} at={0.5} x={120} y={150} rot={-8}><Chunky text="WAREHOUSE" size={86} fill="#FFB22E" edge="#7A1F00" depth={8} /></Sticker>
        <Sticker t={t} at={1.16} x={1380} y={210} rot={7}><StickerCard text="warehouse" bg="#F7B6D8" color="#fff" w={360} size={58} /></Sticker>
        <Sticker t={t} at={1.58} x={140} y={760} rot={-6}><StickerCard text="WAREHOUSE" bg={C.green} color="#fff" w={330} size={44} /></Sticker>
        <Cap t={t} ws={words("ad.", [1.86])} x={1470} y={330} size={110} color={C.mint} />
      </>}
      {s.id === "search" && <>
        <SearchBar t={t} />
        {t >= 3.0 && <div style={{ position: "absolute", left: 1450, top: 330 }}><Phone src="wms/02-magaziny-phone.png" t={t} at={3.0} w={300} tilt={6} /></div>}
        <Cap t={t} ws={words("I think it's going to", [3.46, 3.56, 3.76, 3.96, 4.1])} x={1820} y={300} size={70} align="right" lines={[2]} width={600} />
      </>}
      {s.id === "chill" && <>
        <Cap t={t} ws={words("super", [4.05])} x={150} y={330} size={150} font="Georgia, 'DejaVu Serif', serif" weight={400} italic color="#FFF7EE" />
        <Cap t={t} ws={words("chill", [4.64])} x={230} y={480} size={150} font="Georgia, 'DejaVu Serif', serif" weight={400} italic color="#FFF7EE" />
      </>}
      {s.id === "but" && <>
        <div style={{ position: "absolute", left: 130, top: 380, transform: `scale(${pop(t, 5.42, 0.3)}) rotate(-4deg)` }}><Chunky text="BUT" size={210} fill="#E8262B" edge="#4A0606" depth={14} /></div>
        <Cap t={t} ws={words("I think we should make it, like.", [5.42, 5.42, 5.42, 5.56, 5.74, 5.92, 6.06], { 6: C.mint })} x={1820} y={250} size={70} align="right" lines={[2, 4, 6]} width={600} until={7.0} />
        <Cap t={t} ws={words("like the boxes.", [7.06, 7.42, 7.56], { 2: C.mint })} x={1820} y={300} size={84} align="right" lines={[2]} width={620} />
        {[[260, 640, -12], [1450, 610, 10], [380, 230, 6]].map(([x, y, r], i) => t >= 7.56 + i * 0.07 && (
          <div key={i} style={{ position: "absolute", left: x, top: y + 8 * wob(t, 0.9, i), transform: `rotate(${r}deg) scale(${pop(t, 7.56 + i * 0.07, 0.3)})` }}><Parcel s={190} face t={t} /></div>
        ))}
      </>}
      {s.id === "shipit" && <>
        <div style={{ position: "absolute", left: 60, top: 120, transform: `rotate(-6deg) scale(${pop(t, 7.84, 0.35) * (1 + 0.02 * wob(t, 0.8))})` }}>
          <Chunky text="SHIP IT!" size={230} fill="#FFC21A" edge="#E0590B" depth={18} />
        </div>
        {[[90, 720, 200, 0], [1620, 640, 220, 1], [1700, 220, 150, 2]].map(([x, y, sz, ph], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y - 30 * Math.abs(wob(t, 0.7, ph)), transform: `rotate(${10 * wob(t, 1.4, ph)}deg) scale(${pop(t, 7.9 + i * 0.12, 0.35)})` }}><Parcel s={sz} face t={t} /></div>
        ))}
        <Cap t={t} ws={words("Or like", [10.02, 10.26])} x={110} y={880} size={84} color="#fff" stroke="10px #0B0D10" />
        {t >= 9.9 && <div style={{ position: "absolute", left: 470, top: 640, transform: `rotate(-8deg) scale(${pop(t, 9.9, 0.3)})` }}>
          <div style={{ width: 300, padding: 18, borderRadius: 20, background: "#fff", border: "5px solid #0B0D10", boxShadow: "6px 8px 0 #0B0D10", display: "flex", alignItems: "center", gap: 16 }}>
            <DMark size={70} /><div style={{ fontFamily: M, fontWeight: 800, fontSize: 30, lineHeight: 1.05, color: "#0B0D10" }}>IDEA #2<br /><span style={{ color: C.green }}>LOCKED IN ✓</span></div>
          </div>
        </div>}
      </>}
      {s.id === "sepia" && <>
        <div style={{ position: "absolute", left: 70, top: 150, transform: `rotate(-5deg) scale(${pop(t, 11.05, 0.35)})`, transformOrigin: "0 50%" }}>
          <div style={{ padding: "16px 60px", background: "#F3E4C2", border: "6px solid #4A3416", borderRadius: 10, fontFamily: "Georgia, 'DejaVu Serif', serif", fontWeight: 800, fontSize: 96, color: "#4A3416", letterSpacing: "0.04em" }}>FUNNY</div>
          {t >= 11.35 && <div style={{ marginTop: -6, marginLeft: 90, padding: "8px 40px", background: "#F3E4C2", border: "6px solid #4A3416", borderRadius: 10, fontFamily: "Georgia, 'DejaVu Serif', serif", fontWeight: 800, fontSize: 64, color: "#4A3416", transform: `scale(${pop(t, 11.35, 0.3)})`, transformOrigin: "0 50%" }}>&amp; ANIMATED</div>}
        </div>
        <Cap t={t} ws={words("LIKE, MORE.", [11.62, 11.78])} x={90} y={900} size={70} font="Georgia, 'DejaVu Serif', serif" color="#4A3416" />
        {[[1400, 760, 170, 0], [1640, 820, 140, 1]].map(([x, y, sz, ph], i) => (
          <div key={i} style={{ position: "absolute", left: x + 30 * Math.sin(t * 2 + ph), top: y - 26 * Math.abs(Math.sin(t * 5 + ph)), filter: "sepia(1) saturate(0.6)" }}><Parcel s={sz} face t={t} /></div>
        ))}
      </>}
      {s.id === "kawaii" && <>
        <div style={{ position: "absolute", left: 90, top: 200, transform: `scale(${pop(t, 14.47, 0.3)})`, transformOrigin: "0 100%" }}>
          <Bubble w={560} tail="right" size={44} bg="#FFF5FB">
            {"You know what I mean?".slice(0, Math.ceil(clamp((t - 14.3) / 0.75) * 21))}
            {t >= 15.45 && <><br /><span style={{ color: "#E0478F" }}>{"Is that cute?".slice(0, Math.ceil(clamp((t - 15.45) / 0.4) * 13))}</span></>}
          </Bubble>
        </div>
      </>}
      {s.id === "manga" && <>
        {on(t, 16.28, 17.15) && <div style={{ position: "absolute", left: 1290, top: 140, transform: `scale(${pop(t, 16.28, 0.25)})` }}><Bubble w={520} tail="left" size={38} font="'Comic Sans MS', 'Comic Neue', Manrope">AND, LIKE, THE SHELVES WILL BE...</Bubble></div>}
        {on(t, 17.2, 18.95) && <div style={{ position: "absolute", left: 150, top: 760, transform: `rotate(-6deg) scale(${pop(t, 17.2, 0.25)})` }}><Chunky text="BLURRED OUT" size={110} fill="#E8262B" edge="#fff" outline="#0B0D10" depth={8} /></div>}
        {on(t, 17.58, 18.1) && <div style={{ position: "absolute", left: 1330, top: 160, transform: `scale(${pop(t, 17.58, 0.2)})` }}><Bubble w={380} tail="left" size={40}>IN THE BACK,</Bubble></div>}
        {on(t, 18.1, 19.0) && <div style={{ position: "absolute", left: 1330, top: 160, transform: `scale(${pop(t, 18.1, 0.2)})` }}><Bubble w={420} tail="left" size={40}>BUT, LIKE, YOU'LL BE LIKE,</Bubble></div>}
        <Cap t={t} ws={words("YOU CAN SEE YOUR ORDERS.", [19.04, 19.12, 19.26, 19.4, 19.54], { 4: "#E8262B" })} x={110} y={890} size={80} color="#fff" stroke="12px #0B0D10" />
        {t >= 19.25 && <div style={{ position: "absolute", left: 1460, top: 150 }}><Phone src="wms/09-shipments-phone.png" t={t} at={19.25} w={320} tilt={7} ar={2000 / 924} scroll={120} /></div>}
      </>}
      {s.id === "storm" && <>
        <div style={{ position: "absolute", left: 410, top: 770, transform: `rotate(-4deg) scale(${pop(t, 20.19, 0.12)})`, transformOrigin: "30% 50%" }}><Chunky text="OH, MY" size={190} fill="#E8262B" edge="#fff" outline="#2A1F6B" depth={10} /></div>
        {t >= 20.7 && <div style={{ position: "absolute", left: 1130, top: 760, transform: `rotate(-4deg) scale(${pop(t, 20.7, 0.15)})` }}><Chunky text="GOD!" size={190} fill="#E8262B" edge="#fff" outline="#2A1F6B" depth={10} /></div>}
      </>}
      {s.id === "packed" && <>
        <Cap t={t} ws={words("Or should we do a really funny one", [21.04, 21.26, 21.38, 21.5, 21.6, 21.74, 21.92, 22.14])} x={100} y={260} size={66} lines={[4]} width={760} until={22.36} />
        <Cap t={t} ws={words("and I'll go like,", [22.36, 22.48, 22.62, 22.74])} x={100} y={300} size={70} until={23.1} />
        {t >= 23.1 && <>
          <div style={{ position: "absolute", left: 90, top: 240, transform: `rotate(-4deg) scale(${pop(t, 23.1, 0.3)})` }}><Chunky text="ALL PACKED." size={150} fill={C.mint} edge={C.green} depth={12} /></div>
          <div style={{ position: "absolute", left: 1460, top: 170 }}><Phone src="wms/04-upakovka-skan-phone.png" t={t} at={23.15} w={320} tilt={6} scroll={30} /></div>
        </>}
      </>}
      {s.id === "holo" && <>
        {/* card text in front of her (name strip, stats) */}
        <div style={{ position: "absolute", left: 800, top: 650, display: "flex", alignItems: "center", gap: 10, fontFamily: M, fontWeight: 800, fontSize: 30, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.5)" }}><DMark size={44} />DOCKENTRA</div>
        <div style={{ position: "absolute", left: 1150, top: 640, padding: "6px 14px", background: "linear-gradient(90deg,#FFD84A,#FF8BD0,#8BE3FF)", borderRadius: 8, fontFamily: M, fontWeight: 800, fontSize: 22, color: "#0B0D10", transform: "rotate(8deg)" }}>ULTRA RARE</div>
        <div style={{ position: "absolute", left: 784, top: 700, width: 512, height: 196, borderRadius: 12, background: "#F3E7C6", border: "4px solid #D9B14A", padding: "14px 22px", boxSizing: "border-box", fontFamily: M, fontWeight: 800, fontSize: 24, color: "#0B0D10" }}>
          <div style={{ textAlign: "center", fontSize: 30, marginBottom: 8 }}>THE FULFILMENT PARTNER</div>
          {["PICKED", "PACKED", "SHIPPED"].map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              <span style={{ width: 120 }}>{n}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: "#D8CBA6" }}><div style={{ width: `${100 * ramp(t, 24.0 + i * 0.25, 0.7, EASE_APPEAR)}%`, height: "100%", borderRadius: 8, background: C.green }} /></div>
              <span style={{ color: C.green }}>{t > 24.7 + i * 0.25 ? "✓" : ""}</span>
            </div>
          ))}
        </div>
        <Cap t={t} ws={words("Like, you can see", [25.2, 25.56, 25.68, 25.82])} x={90} y={300} size={70} color="#0B0D10" lines={[2]} width={620} />
        <Cap t={t} ws={words("the parcel,", [25.98, 26.12], { 1: C.green })} x={90} y={460} size={84} color="#0B0D10" />
        <Cap t={t} ws={words("is it in?", [26.46, 26.64, 26.76])} x={90} y={570} size={84} color="#0B0D10" />
        {t >= 25.95 && <div style={{ position: "absolute", left: 1440, top: 200 }}><Phone src="wms/05-kartochka-otgruzki-phone.png" t={t} at={25.95} w={320} tilt={7} scroll={80} /></div>}
      </>}
      {s.id === "regular" && <>
        {t < 31.1 && <div style={{ opacity: 1 - ramp(t, 30.9, 0.2, EASE_MOVE), transform: `translateX(${-200 * ramp(t, 30.9, 0.2, EASE_MOVE)}px)` }}><Stamp t={t} at={28.42} text="OKAY." x={130} y={250} size={130} /></div>}
        <Cap t={t} ws={words("Or let's do, like, a", [29.5, 29.66, 29.94, 30.08, 30.26])} x={1820} y={250} size={68} align="right" lines={[3]} width={620} />
        <Cap t={t} ws={words("“regular,”", [30.44], { 0: "#E7FF52" })} x={1820} y={420} size={96} align="right" width={620} />
        {t >= 31.04 && <Cap t={t} ws={words("like", [31.04])} x={1820} y={540} size={68} align="right" width={620} />}
        {t >= 31.1 && <div style={{ position: "absolute", left: 120, top: 330 }}><Phone src="wms/01-portal-klienta-phone.png" t={t} at={31.1} w={300} tilt={-7} scroll={90} /></div>}
        {t >= 31.22 && <div style={{ position: "absolute", left: 1150, top: 620, padding: "26px 34px", borderRadius: 26, background: "#fff", boxShadow: "0 20px 50px rgba(0,0,0,.45)", transform: `scale(${pop(t, 31.22, 0.35)})` }}><Logo h={92} fill={ramp(t, 31.3, 0.6, EASE_APPEAR)} /></div>}
      </>}
      {s.id === "noway" && <>
        <div style={{ position: "absolute", left: 80, top: 160, transform: `rotate(-8deg) scale(${pop(t, 31.66, 0.25)})` }}><Chunky text="NO" size={260} fill="#FFE14A" edge="#B3120A" depth={16} /></div>
        <div style={{ position: "absolute", left: 1290, top: 420, transform: `rotate(6deg) scale(${pop(t, 31.8, 0.25)})` }}><Chunky text="WAY?!" size={200} fill="#FFE14A" edge="#B3120A" depth={14} /></div>
        <div style={{ position: "absolute", left: 1330, top: 700, padding: "8px 18px", background: "#0B0D10", color: "#fff", fontFamily: M, fontWeight: 800, fontSize: 30, transform: `rotate(6deg) scale(${pop(t, 32.0, 0.25)})` }}>(NOT CLICKBAIT)</div>
        {[[280, 640, 160], [1600, 180, 140]].map(([x, y, sz], i) => <div key={i} style={{ position: "absolute", left: x + 60 * (t - 31.66) * (i ? 1 : -1), top: y - 40 * (t - 31.66), transform: `rotate(${(t - 31.66) * 160 * (i ? 1 : -1)}deg)` }}><Parcel s={sz} face t={t} /></div>)}
      </>}
      {s.id === "pop" && <>
        <div style={{ position: "absolute", left: 220, top: 110, transform: `scale(${pop(t, 32.82, 0.25)})` }}><Bubble w={560} tail="right" size={50}>OH... BUT WHICH AD?!</Bubble></div>
        <div style={{ position: "absolute", left: 1330, top: 560, transform: `rotate(-10deg) scale(${pop(t, 33.05, 0.25)})` }}>
          <svg width={360} height={260} viewBox="-180 -130 360 260" style={{ position: "absolute", left: -40, top: -50 }}><polygon points={Array.from({ length: 24 }, (_, i) => { const r = i % 2 ? 90 : 165, a = (i / 24) * 2 * Math.PI; return `${Math.cos(a) * r},${Math.sin(a) * r * 0.75}`; }).join(" ")} fill="#FFE14A" stroke="#0B0D10" strokeWidth={6} /></svg>
          <Chunky text="POP!" size={120} fill="#E8262B" edge="#0B0D10" depth={8} style={{ position: "relative", left: 60, top: 20 }} />
        </div>
      </>}
      {s.id === "pixel" && <>
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", transform: `scale(${pop(t, 33.85, 0.25)})` }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 170, color: "#FFE27A", textShadow: "10px 10px 0 #E0478F, -4px -4px 0 #0B0D10", letterSpacing: "0.05em" }}>NICE!</span>
        </div>
        <div style={{ position: "absolute", left: 120, top: 760, transform: `scale(${pop(t, 33.95, 0.25)})`, imageRendering: "pixelated" }}><Parcel s={130} face t={t} /></div>
      </>}
      {s.id === "grid" && <Grid t={t} />}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- the last scene: which one? */
const THUMBS = ["chill", "shipit", "sepia", "kawaii", "manga", "holo"];
const Grid: React.FC<{ t: number }> = ({ t }) => {
  const k = t - 34.58;
  return (
    <>
      <div style={{ position: "absolute", left: 90, top: 190 }}>
        <Cap t={t} ws={words("WHICH ONE?", [34.6, 34.68])} x={0} y={0} size={110} lines={[1]} />
        <Cap t={t} ws={words("YOU TELL ME.", [34.7, 34.86, 35.06])} x={0} y={260} size={110} color={C.mint} lines={[1]} />
        {k > 0.9 && <div style={{ position: "absolute", left: 4, top: 560, fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: "#fff", opacity: ramp(t, 35.5, 0.3), letterSpacing: "0.06em", whiteSpace: "nowrap" }}>REPLY WITH A NUMBER</div>}
      </div>
      <div style={{ position: "absolute", left: 860, top: 150, display: "grid", gridTemplateColumns: "repeat(3, 320px)", gap: 22 }}>
        {THUMBS.map((id, i) => (
          <div key={id} style={{ position: "relative", width: 320, height: 180, borderRadius: 14, overflow: "hidden", border: "4px solid #fff", boxShadow: "0 14px 30px rgba(0,0,0,.5)", transform: `scale(${pop(t, 34.62 + i * 0.07, 0.3)}) rotate(${(i % 2 ? 1 : -1) * 1.5}deg)` }}>
            <Img src={staticFile(`ideas/thumb-${id}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", left: 10, top: 8, width: 44, height: 44, borderRadius: 22, background: C.mint, color: "#0B0D10", fontFamily: M, fontWeight: 800, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 860, top: 640, display: "flex", alignItems: "center", gap: 40, opacity: ramp(t, 35.3, 0.4, EASE_APPEAR), transform: `translateY(${(1 - ramp(t, 35.3, 0.4, EASE_APPEAR)) * 20}px)` }}>
        <Logo h={90} word="#fff" fill={ramp(t, 35.45, 0.6, EASE_APPEAR)} />
        <div style={{ fontFamily: M, fontWeight: 500, fontSize: 44, color: "#fff" }}>dockentra.ie</div>
      </div>
    </>
  );
};
