// «ПРОФЕСІЯ» — one word typed into a DM becomes the whole film. Vertical 1080x1920, 60 fps, 900 frames.
// Everything is driven by the absolute frame F; every element has its from-state at t=0 (seek-safe).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Img, Sequence, continueRender, delayRender, spring, staticFile, useCurrentFrame } from "remotion";

export const TOTAL = 900;
const FPS = 60;
const W = 1080, H = 1920;
const C = { bg: "#0F1B2D", glow: "#16294A", text: "#F4F1EA", sub: "#9FB0C8", amber: "#F5B841", card: "#13243D" };
const SANS = "Geist, sans-serif";
const MONO = "'Geist Mono', monospace";
const SHADOW = "0 50px 90px -30px rgba(0,0,0,.75), 0 18px 36px -12px rgba(0,0,0,.5)";
const BORDER = "1px solid rgba(255,255,255,.12)";

// ---------------------------------------------------------------- fonts
const RANGES: Record<string, string> = {
  cyrillic: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  "cyrillic-ext": "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2193, U+2212, U+2215, U+FEFF, U+FFFD",
  "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
};
let fontsP: Promise<void> | null = null;
const loadFonts = () =>
  (fontsP ??= Promise.all(
    Object.entries(RANGES).flatMap(([sub, range]) => [
      new FontFace("Geist", `url(${staticFile(`fonts/geist/geist-${sub}.woff2`)})`, { weight: "100 900", unicodeRange: range }),
      new FontFace("Geist Mono", `url(${staticFile(`fonts/geist/geist-mono-${sub}.woff2`)})`, { weight: "100 900", unicodeRange: range }),
    ]).map((f) => f.load().then((ff) => { document.fonts.add(ff); })),
  ).then(() => undefined));
const useFonts = () => {
  const [h] = useState(() => delayRender("geist"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => { setReady(true); continueRender(h); }).catch((e) => { console.error(e); setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};
let ctx: CanvasRenderingContext2D | null = null;
/** rendered width of a string (px), including tracking given in em */
const tw = (text: string, size: number, weight = 800, family = "Geist", track = 0) => {
  ctx ??= document.createElement("canvas").getContext("2d");
  ctx!.font = `${weight} ${size}px ${family === "Geist" ? "Geist" : "'Geist Mono'"}`;
  return ctx!.measureText(text).width + track * size * text.length;
};

// ---------------------------------------------------------------- motion helpers
const cl = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const EIN = Easing.bezier(0.55, 0, 0.9, 0.4);
const ep = (F: number, a: number, b: number, e = EASE) => e(cl((F - a) / (b - a)));
/** spring with damping 20 / mass 0.8, stretched to `dur` frames */
const sp = (F: number, s: number, dur = 30) =>
  spring({ frame: F - s, fps: FPS, config: { damping: 20, mass: 0.8, stiffness: 120 }, durationInFrames: dur });
const RGB = (on: boolean, k = 1) => (on ? `${-7 * k}px 0 rgba(255,70,70,.85), ${7 * k}px 0 rgba(70,215,255,.85)` : "none");
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------------------------------------------------------------- camera (one transform, shared by every chapter)
const cam = (F: number) => {
  let s = 1 + 0.05 * (F / TOTAL); // slow continuous dolly-in
  s *= lerp(1, 0.3, sp(F, 750, 24)); // 05: fast pull back
  const rx = 11 - 3 * (F / TOTAL); // 11° → 8°
  return { s, rx };
};
const Cam: React.FC<{ F: number; depth?: number; children: React.ReactNode }> = ({ F, depth = 1, children }) => {
  const c = cam(F);
  const s = 1 + (c.s - 1) * depth;
  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 50%" }}>
      <AbsoluteFill style={{ transform: `rotateX(${c.rx * depth}deg) scale(${s})`, transformOrigin: "50% 55%", transformStyle: "preserve-3d" }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- atoms
const Mono: React.FC<{ size?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ size = 24, color = C.sub, style, children }) => (
  <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: "0.12em", textTransform: "uppercase", color, whiteSpace: "nowrap", ...style }}>{children}</span>
);
const Abs: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>
);
const Check: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="24" fill={C.amber} />
    <path d="M14 24.5l7 7 13-14" stroke={C.bg} strokeWidth="4.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Arrow: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M24 35V13M14 22l10-10 10 10" stroke={C.bg} strokeWidth="4.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** an image cut into horizontal slices; `pose(i)` returns the per-slice transform / opacity / filter */
type Pose = { tf?: string; o?: number; blur?: number };
const Sliced: React.FC<{ src: string; x: number; y: number; w: number; iw: number; ih: number; cuts: number[]; pose: (i: number) => Pose; plate?: number }> = ({ src, x, y, w, iw, ih, cuts, pose, plate = 0 }) => {
  const s = w / iw;
  return (
    <>
      {plate > 0 && <Abs x={x} y={y} w={w} h={ih * s} style={{ borderRadius: 28, boxShadow: SHADOW, opacity: plate }} />}
      {cuts.slice(0, -1).map((c0, i) => {
        const c1 = cuts[i + 1];
        const p = pose(i);
        const first = i === 0, last = i === cuts.length - 2;
        return (
          <Abs key={i} x={x} y={y + c0 * s} w={w} h={(c1 - c0) * s}
            style={{
              overflow: "hidden", transform: p.tf, opacity: p.o ?? 1, filter: p.blur ? `blur(${p.blur}px)` : undefined,
              borderTopLeftRadius: first ? 28 : 0, borderTopRightRadius: first ? 28 : 0,
              borderBottomLeftRadius: last ? 28 : 0, borderBottomRightRadius: last ? 28 : 0,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)", backfaceVisibility: "hidden",
            }}>
            <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -c0 * s, width: w, height: ih * s, display: "block" }} />
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)", borderRadius: "inherit" }} />
          </Abs>
        );
      })}
    </>
  );
};
/** standard assemble: slices slide in from alternating sides with staggered springs */
const assemble = (F: number, start: number, i: number, dist = 900, stagger = 4) => {
  const p = sp(F, start + i * stagger, 32);
  const dir = i % 2 ? 1 : -1;
  return { tf: `translateX(${(1 - p) * dir * dist}px) rotateY(${(1 - p) * dir * -18}deg)`, o: cl(p * 2.2), blur: (1 - p) * 10 } as Pose;
};

// ---------------------------------------------------------------- background, grain, vignette, HUD
const Background: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 55% at 50% 45%, ${C.glow} 0%, ${C.bg} 72%)` }} />
);
const Grain: React.FC<{ F: number }> = ({ F }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={F % 12} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 62% at 50% 48%, rgba(0,0,0,0) 55%, rgba(4,9,18,.55) 100%)" }} />
  </AbsoluteFill>
);

const NAV = ["ПІДБІР", "НАПРЯМИ", "СУПРОВІД", "УМОВИ", "СТАРТ"];
const BOUNDS = [210, 330, 450, 630, 750];
const HUD: React.FC<{ F: number }> = ({ F }) => {
  const size = 21, track = 0.12;
  const sep = tw(" · ", size, 500, "mono", track);
  const widths = NAV.map((n) => tw(n, size, 500, "mono", track));
  const total = widths.reduce((a, b) => a + b, 0) + sep * (NAV.length - 1);
  const xs: number[] = [];
  let x = (W - total) / 2;
  widths.forEach((w) => { xs.push(x); x += w + sep; });
  // underline slides between chapters on springs
  let ux = xs[0], uw = 0;
  BOUNDS.forEach((b, i) => {
    const p = sp(F, b, 26);
    if (i === 0) uw = lerp(0, widths[0] - track * size, p);
    else { ux = lerp(ux, xs[i], p); uw = lerp(uw, widths[i] - track * size, p); }
  });
  const active = BOUNDS.filter((b) => F >= b).length - 1;
  const tc = (F / FPS).toFixed(2).padStart(5, "0");
  const top = 96;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Abs x={64} y={top}><Mono size={22} color={C.text}>MOTIV_ATOREX</Mono></Abs>
      <Abs x={W - 64 - tw("00.00", 22, 500, "mono", 0.12)} y={top}><Mono size={22} color={C.sub} style={{ fontVariantNumeric: "tabular-nums" }}>{tc}</Mono></Abs>
      <Abs x={0} y={1708} w={W}>
        {NAV.map((n, i) => (
          <React.Fragment key={n}>
            <Abs x={xs[i]} y={0}><Mono size={size} color={i === active ? C.text : "rgba(159,176,200,.55)"}>{n}</Mono></Abs>
            {i < NAV.length - 1 && <Abs x={xs[i] + widths[i]} y={0}><Mono size={size} color="rgba(159,176,200,.35)"> · </Mono></Abs>}
          </React.Fragment>
        ))}
        <Abs x={ux} y={36} w={uw} h={3} style={{ background: C.amber, borderRadius: 2 }} />
      </Abs>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- chapter flash: the amber bar sweeps the frame
const FLASHES = [330, 450, 630, 750];
const Flash: React.FC<{ F: number }> = ({ F }) => {
  const c = FLASHES.find((b) => F >= b - 7 && F < b + 7);
  if (c === undefined) return null;
  const grow = ep(F, c - 7, c, EIN), shrink = ep(F, c, c + 7);
  const left = shrink * W, right = lerp(W - 14, 0, grow);
  return <Abs x={left} y={0} w={Math.max(0, W - left - right)} h={H} style={{ background: C.amber, filter: `blur(${(grow < 1 ? grow : 1 - shrink) * 3}px)` }} />;
};

// ---------------------------------------------------------------- headline block (chapters 01–04)
const Headline: React.FC<{ F: number; a: number; n: string; name: string; l1: string; l2: string; sub?: string }> = ({ F, a, n, name, l1, l2, sub }) => {
  const fs = Math.min(116, 900 / Math.max(tw(l1, 1), tw(l2, 1)));
  const line = (text: string, t0: number, color: string, top: number) => {
    const p = sp(F, t0, 30);
    return (
      <Abs x={104} y={top} style={{ overflow: "hidden", height: fs * 1.12, paddingRight: 40 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: fs, letterSpacing: "-0.02em", lineHeight: 1.1, color, whiteSpace: "nowrap", transform: `translateY(${(1 - p) * 105}%)` }}>{text}</div>
      </Abs>
    );
  };
  const y1 = 248, y2 = y1 + fs * 1.06, ys = y2 + fs * 1.06 + 22;
  const bar = sp(F, a, 34);
  const rule = sp(F, a + 2, 26);
  const subP = sp(F, a + 14, 26);
  return (
    <>
      <Abs x={60} y={196} w={14} h={(ys + 34 - 196) * bar} style={{ background: C.amber, borderRadius: 2 }} />
      <Abs x={104} y={196} style={{ display: "flex", alignItems: "center", gap: 18, opacity: rule }}>
        <div style={{ width: 56 * rule, height: 2, background: C.amber }} />
        <Mono size={24} color={C.sub}>{n}</Mono>
        <Mono size={24} color={C.text}>{name}</Mono>
      </Abs>
      {line(l1, a + 4, C.text, y1)}
      {line(l2, a + 10, C.amber, y2)}
      {sub && <Abs x={104} y={ys} style={{ opacity: subP, transform: `translateY(${(1 - subP) * 16}px)` }}><Mono size={23} color={C.sub}>{sub}</Mono></Abs>}
    </>
  );
};

// ---------------------------------------------------------------- shared geometry
const PILL = { x: 100, y: 936, w: 880, h: 128 };
const TXT = 60;
const WORD = "ПРОФЕСІЯ";
const Pill: React.FC<{ chars: number; F: number; cursor: boolean; keyAt?: (i: number) => number; arrowP: number; pulse?: number; style?: React.CSSProperties }> = ({ chars, F, cursor, keyAt, arrowP, pulse = 0, style }) => {
  const blink = cursor && (F < 44 || Math.floor(F / 30) % 2 === 0 || chars < WORD.length) ? 1 : cursor ? 0.15 : 0;
  return (
    <Abs x={PILL.x} y={PILL.y} w={PILL.w} h={PILL.h}
      style={{ borderRadius: PILL.h / 2, background: "rgba(255,255,255,.06)", border: BORDER, boxShadow: SHADOW, display: "flex", alignItems: "center", paddingLeft: 48, boxSizing: "border-box", ...style }}>
      {chars === 0 && <span style={{ position: "absolute", left: 66, fontFamily: SANS, fontWeight: 500, fontSize: 40, color: "rgba(159,176,200,.6)" }}>Повідомлення…</span>}
      {WORD.slice(0, chars).split("").map((ch, i) => {
        const k = keyAt ? sp(F, keyAt(i), 14) : 1;
        return <span key={i} style={{ display: "inline-block", fontFamily: SANS, fontWeight: 700, fontSize: TXT, letterSpacing: "-0.02em", color: C.text, transform: `scale(${lerp(1.45, 1, k)}) translateY(${(1 - k) * -10}px)`, opacity: cl(k * 3) }}>{ch}</span>;
      })}
      <span style={{ display: "inline-block", width: 6, height: 72, marginLeft: 6, background: C.amber, borderRadius: 2, opacity: blink }} />
      <div style={{ position: "absolute", right: 20, top: 20, width: 88, height: 88, borderRadius: 44, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${arrowP * (1 + 0.16 * Math.sin(Math.PI * pulse))})`, boxShadow: `0 0 ${60 * Math.sin(Math.PI * pulse)}px rgba(245,184,65,.7)` }}>
        <Arrow size={52} />
      </div>
      {pulse > 0 && pulse < 1 && <div style={{ position: "absolute", right: 20 - 40 * pulse, top: 20 - 40 * pulse, width: 88 + 80 * pulse, height: 88 + 80 * pulse, borderRadius: 999, border: `2px solid ${C.amber}`, opacity: 1 - pulse }} />}
    </Abs>
  );
};

// ================================================================ 0–90 COLD OPEN
const ColdOpen: React.FC = () => {
  const F = useCurrentFrame();
  const draw = sp(F, 0, 26); // bar draws upward from the bottom edge
  const bend = sp(F, 22, 20); // ... and bends into the cursor
  const pillIn = sp(F, 26, 22);
  const curX = PILL.x + 48 + 6; // where the inline cursor sits with no text
  const barTop = lerp(H, PILL.y + 28, draw);
  const barBot = lerp(H, PILL.y + 28 + 72, bend);
  const typed = F < 44 ? 0 : Math.min(WORD.length, Math.floor((F - 44) / 4) + 1);
  const pulse = cl((F - 76) / 14);
  return (
    <Cam F={F}>
      {F >= 40 ? (
        <Pill F={F} chars={typed} cursor keyAt={(i) => 44 + i * 4} arrowP={sp(F, 44, 20)} pulse={pulse}
          style={{ transform: `scale(${lerp(0.94, 1, pillIn) + (typed && F - (44 + (typed - 1) * 4) < 4 ? 0.006 : 0)})` }} />
      ) : (
        <>
          <Pill F={F} chars={0} cursor={false} arrowP={0} style={{ opacity: pillIn, transform: `scale(${lerp(0.94, 1, pillIn)})` }} />
          <Abs x={curX - lerp(4, 0, bend)} y={barTop} w={lerp(14, 6, bend)} h={Math.max(0, barBot - barTop)} style={{ background: C.amber, borderRadius: lerp(0, 3, bend), filter: `blur(${(1 - draw) * 2}px)` }} />
        </>
      )}
    </Cam>
  );
};

// ================================================================ 90–210 HOOK
const HOOK = [
  { t: "НЕ ЗНАЄТЕ,", a: 116 },
  { t: "З ЧОГО", a: 150 },
  { t: "ПОЧАТИ?", a: 182 },
];
const TICK = "ПРОДАЖІ В ПЕРЕПИСЦІ · ТАРГЕТ · TELEGRAM · CANVA + ШІ · ІНТЕРНЕТ-МАГАЗИН · ";
const Ticker: React.FC<{ F: number; y: number; rot: number; dir: number }> = ({ F, y, rot, dir }) => {
  const unit = tw(TICK, 28, 500, "mono", 0.12);
  const off = ((F * 3.2 * dir) % unit + unit) % unit;
  const open = sp(F, 100, 22);
  return (
    <Abs x={-200} y={y} w={W + 400} h={64}
      style={{ transform: `rotate(${rot}deg)`, overflow: "hidden", borderTop: BORDER, borderBottom: BORDER, clipPath: `inset(0 ${(1 - open) * 50}% 0 ${(1 - open) * 50}%)`, display: "flex", alignItems: "center" }}>
      <div style={{ transform: `translateX(${-off}px)`, display: "flex" }}>
        {[0, 1, 2, 3].map((k) => <Mono key={k} size={28} color={C.sub}>{TICK}</Mono>)}
      </div>
    </Abs>
  );
};
const Hook: React.FC = () => {
  const F = useCurrentFrame() + 90;
  const fly = sp(F, 92, 24);
  const scatter = ep(F, 114, 126);
  const bw = tw(WORD, TXT, 700) + 72;
  const bx = lerp(PILL.x + 12 + bw / 2, W / 2, fly), by = lerp(PILL.y + PILL.h / 2, 960, fly);
  const bs = lerp(1, 1.7, fly);
  const pillOut = ep(F, 92, 110);
  const idx = HOOK.findIndex((h, i) => F >= h.a && (i === HOOK.length - 1 || F < HOOK[i + 1].a));
  const cur = HOOK[idx];
  const flash = ep(F, 199, 210, EIN);
  let qx = 0;
  const word = cur && (() => {
    const fs = Math.min(230, 960 / tw(cur.t, 1));
    const w = tw(cur.t, fs);
    qx = W / 2 + w / 2 - tw("?", fs) / 2;
    const split = F - cur.a < 2;
    const drift = 1 + 0.035 * ep(F, cur.a, cur.a + 34);
    return (
      <Abs x={0} y={960 - fs * 0.55} w={W} style={{ textAlign: "center", transform: `scale(${drift})` }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: fs, letterSpacing: "-0.02em", lineHeight: 1.1, color: C.text, textShadow: RGB(split), whiteSpace: "nowrap" }}>
          {cur.t.split("").map((ch, i) => {
            const p = idx === 0 ? sp(F, 116 + i * 1.5, 22) : 1;
            return <span key={i} style={{ display: "inline-block", color: ch === "?" ? C.amber : undefined, opacity: cl(p * 2), transform: `translateY(${(1 - p) * 60}px) scale(${lerp(0.7, 1, p)})`, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined }}>{ch === " " ? " " : ch}</span>;
          })}
        </span>
      </Abs>
    );
  })();
  return (
    <>
      <Cam F={F}>
        <Ticker F={F} y={700} rot={-4} dir={1} />
        <Ticker F={F} y={1160} rot={4} dir={-1} />
        {pillOut < 1 && <Pill F={F} chars={8} cursor={false} arrowP={1} style={{ opacity: 1 - pillOut, transform: `translateY(${pillOut * 90}px) scale(${1 - 0.1 * pillOut})` }} />}
        {/* the sent bubble flies to centre; its letters break apart into the hook type */}
        {scatter < 1 && (
          <Abs x={bx - bw / 2} y={by - 54} w={bw} h={108} style={{ transform: `scale(${bs})` }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 34, background: "#1D3150", border: BORDER, boxShadow: SHADOW, transform: `scaleX(${1 - scatter})`, opacity: 1 - scatter }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {WORD.split("").map((ch, i) => {
                const s = ep(F, 113 + i * 0.8, 124 + i * 0.8);
                return <span key={i} style={{ display: "inline-block", fontFamily: SANS, fontWeight: 700, fontSize: TXT, letterSpacing: "-0.02em", color: C.text, transform: `translate(${(i - 3.5) * 26 * s}px, ${-70 * s}px) scale(${1 + s})`, opacity: 1 - s, filter: `blur(${s * 10}px)` }}>{ch}</span>;
              })}
            </div>
          </Abs>
        )}
        {word}
      </Cam>
      {flash > 0 && (
        <Abs x={qx - 3000 * flash} y={960 - 3000 * flash} w={6000 * flash} h={6000 * flash} style={{ borderRadius: "50%", background: C.amber }} />
      )}
    </>
  );
};

// ================================================================ 210–330 01 ПІДБІР
const CHAT = { x: 150, y: 660, w: 860, h: 900 };
const QS = ["Чим займаєтесь зараз?", "Скільки годин на тиждень?", "Люди, тексти, візуал чи цифри?", "Ноутбук чи телефон?", "Який результат за 2–3 місяці?"];
const BUB = (i: number) => ({ x: CHAT.x + 40, y: CHAT.y + 190 + i * 132, w: tw(QS[i], 34, 500) + 64, h: 96 });
const ChatCard: React.FC<{ o?: number; s?: number }> = ({ o = 1, s = 1 }) => (
  <Abs x={CHAT.x} y={CHAT.y} w={CHAT.w} h={CHAT.h} style={{ borderRadius: 28, background: C.card, border: BORDER, boxShadow: SHADOW, opacity: o, transform: `scale(${s})` }}>
    <Img src={staticFile("ui/profile.png")} style={{ position: "absolute", left: 40, top: 36, width: 252, borderRadius: 14, border: BORDER }} />
    <div style={{ position: "absolute", left: 318, top: 62 }}><Mono size={22} color={C.text}>MOTIV_ATOREX</Mono></div>
    <div style={{ position: "absolute", left: 318, top: 100 }}><Mono size={20} color={C.sub}>ДЕНИС · ОНЛАЙН-ПРОФЕСІЇ</Mono></div>
    <div style={{ position: "absolute", left: 40, right: 40, top: 160, height: 1, background: "rgba(255,255,255,.1)" }} />
  </Abs>
);
const Bubble: React.FC<{ i: number; style?: React.CSSProperties; textO?: number }> = ({ i, style, textO = 1 }) => {
  const b = BUB(i);
  return (
    <Abs x={b.x} y={b.y} w={b.w} h={b.h} style={{ borderRadius: 30, background: "rgba(255,255,255,.07)", border: BORDER, display: "flex", alignItems: "center", paddingLeft: 32, boxSizing: "border-box", ...style }}>
      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: C.text, whiteSpace: "nowrap", opacity: textO }}>{QS[i]}</span>
    </Abs>
  );
};
const Pidbir: React.FC = () => {
  const F = useCurrentFrame() + 210;
  const k = sp(F, 210, 22); // the flash collapses into the chat card
  const r = { x: lerp(0, CHAT.x, k), y: lerp(0, CHAT.y, k), w: lerp(W, CHAT.w, k), h: lerp(H, CHAT.h, k) };
  const tint = ep(F, 214, 232);
  return (
    <>
      <Cam F={F} depth={0.4}>
        <Headline F={F} a={222} n="01" name="ПІДБІР" l1="10 хвилин." l2="Один напрям." sub="БЕЗКОШТОВНО · БЕЗ ЗОБОВ'ЯЗАНЬ" />
      </Cam>
      <Cam F={F}>
        <div style={{ opacity: ep(F, 222, 236) }}><ChatCard /></div>
        {QS.map((_, i) => {
          const p = sp(F, 236 + i * 8, 26);
          return <Bubble key={i} i={i} style={{ opacity: cl(p * 2), transform: `translateY(${(1 - p) * 40}px) scale(${lerp(0.9, 1, p)})`, transformOrigin: "0 100%" }} />;
        })}
      </Cam>
      {tint < 1 && <Abs x={r.x} y={r.y} w={r.w} h={r.h} style={{ background: C.amber, borderRadius: 28 * k, opacity: 1 - tint }} />}
    </>
  );
};

// ================================================================ 330–450 02 НАПРЯМИ
const CHIPS = ["ПРОДАЖІ В ПЕРЕПИСЦІ", "ТАРГЕТ", "TELEGRAM", "CANVA + ШІ", "ІНТЕРНЕТ-МАГАЗИН"];
const CARD = { x: 190, y: 680, w: 700 };
const S4 = CARD.w / 1080;
const CUTS4 = [0, 270, 540, 810, 1080, 1350];
const chipW = (i: number) => tw(CHIPS[i], 28, 500, "mono", 0.12) + 96;
const CH_H = 84;
const fanPose = (i: number) => {
  const a = ((i - 2) * 11 * Math.PI) / 180;
  return { cx: 540 + Math.sin(a) * 960, cy: 1940 - Math.cos(a) * 960, rot: (i - 2) * 11 };
};
const Napryamy: React.FC = () => {
  const F = useCurrentFrame() + 330;
  const m = sp(F, 334, 28); // bubbles → chips
  const fan = sp(F, 364, 26);
  const flip = ep(F, 384, 396, EIN);
  return (
    <>
      <Cam F={F} depth={0.4}>
        <Headline F={F} a={334} n="02" name="НАПРЯМИ" l1="Навички," l2="а не обіцянки." />
      </Cam>
      <Cam F={F}>
        {m < 1 && <ChatCard o={1 - ep(F, 332, 350)} s={lerp(1, 0.96, m)} />}
        {flip < 1 && CHIPS.map((_, i) => {
          const b = BUB(i);
          const mi = sp(F, 334 + i * 3, 28);
          const col = { cx: 540, cy: 760 + i * 118 };
          const fp = fanPose(i);
          const fi = sp(F, 364 + Math.abs(i - 2) * 2, 26);
          const cw = chipW(i);
          const w = lerp(b.w, cw, mi), h = lerp(b.h, CH_H, mi);
          const cx = lerp(lerp(b.x + b.w / 2, col.cx, mi), fp.cx, fi);
          const cy = lerp(lerp(b.y + b.h / 2, col.cy, mi), fp.cy, fi);
          const tOut = ep(F, 334 + i * 3, 344 + i * 3), tIn = ep(F, 344 + i * 3, 356 + i * 3);
          return (
            <Abs key={i} x={cx - w / 2} y={cy - h / 2} w={w} h={h}
              style={{ borderRadius: lerp(30, h / 2, mi), background: `rgba(${Math.round(lerp(255, 29, mi))},${Math.round(lerp(255, 49, mi))},${Math.round(lerp(255, 80, mi))},${lerp(0.07, 1, mi)})`, border: BORDER, boxShadow: mi > 0.3 ? SHADOW : undefined, transform: `rotate(${fp.rot * fi}deg) rotateY(${flip * 90}deg)`, zIndex: 10 - Math.abs(i - 2) }}>
              {tOut < 1 && <span style={{ position: "absolute", left: 32, top: (h - 42) / 2, fontFamily: SANS, fontWeight: 500, fontSize: 34, color: C.text, whiteSpace: "nowrap", opacity: 1 - tOut, filter: `blur(${tOut * 8}px)` }}>{QS[i]}</span>}
              {tIn > 0 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, opacity: tIn, filter: `blur(${(1 - tIn) * 8}px)` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: C.sub }} />
                  <Mono size={28} color={C.text}>{CHIPS[i]}</Mono>
                </div>
              )}
            </Abs>
          );
        })}
        {/* each chip flips over and lands as one slice of carousel_4 */}
        {F >= 392 && (
          <Sliced src="ui/carousel_4.png" x={CARD.x} y={CARD.y} w={CARD.w} iw={1080} ih={1350} cuts={CUTS4} plate={sp(F, 412, 20)}
            pose={(i) => {
              const p = sp(F, 392 + i * 4, 32);
              const fp = fanPose(i);
              const sh = (CUTS4[i + 1] - CUTS4[i]) * S4;
              const ox = CARD.x + CARD.w / 2, oy = CARD.y + ((CUTS4[i] + CUTS4[i + 1]) / 2) * S4;
              const sx = lerp(chipW(i) / CARD.w, 1, p), sy = lerp(CH_H / sh, 1, p);
              return { tf: `translate(${(fp.cx - ox) * (1 - p)}px, ${(fp.cy - oy) * (1 - p)}px) rotate(${fp.rot * (1 - p)}deg) rotateY(${-90 * (1 - ep(F, 392 + i * 4, 404 + i * 4))}deg) scale(${sx}, ${sy})`, blur: (1 - p) * 6 };
            }} />
        )}
      </Cam>
    </>
  );
};

// ================================================================ 450–630 03 СУПРОВІД (signature)
const CUTS5 = [0, 460, 624, 732, 894, 1060, 1350]; // header, step 1, 2, 3, 4, footer (cut on the rules)
const ROW = 4;
const rowRect0 = { x: CARD.x, y: CARD.y + CUTS5[ROW] * S4, w: CARD.w, h: (CUTS5[ROW + 1] - CUTS5[ROW]) * S4 };
const ROW_W = 1000;
const rowRect1 = { x: 40, y: 690, w: ROW_W, h: (CUTS5[ROW + 1] - CUTS5[ROW]) * (ROW_W / 1080) };
const COLS = { y: rowRect1.y + rowRect1.h + 26, h: 400, gap: 10 };
const colW = (ROW_W - 7 * COLS.gap) / 8;
const RowPanel: React.FC<{ r: { x: number; y: number; w: number; h: number }; o?: number; lift?: number; imgO?: number; radius?: number; children?: React.ReactNode }> = ({ r, o = 1, lift = 0, imgO = 1, radius = 20, children }) => {
  const s = r.w / 1080;
  return (
    <Abs x={r.x} y={r.y} w={r.w} h={r.h} style={{ borderRadius: radius, overflow: "hidden", background: C.card, border: BORDER, boxShadow: lift ? `0 ${60 * lift}px ${110 * lift}px -30px rgba(0,0,0,.8)` : undefined, opacity: o }}>
      <Img src={staticFile("ui/carousel_5.png")} style={{ position: "absolute", left: 0, top: -CUTS5[ROW] * s, width: r.w, height: 1350 * s, opacity: imgO, filter: imgO < 1 ? `blur(${(1 - imgO) * 8}px)` : undefined }} />
      {children}
    </Abs>
  );
};
const Week: React.FC<{ i: number; F: number; unfold: number; squeeze?: number }> = ({ i, F, unfold, squeeze = 0 }) => {
  const x0 = 40 + i * (colW + COLS.gap);
  const tx = (540 - (x0 + colW / 2)) * squeeze;
  const ck = sp(F, 596 + i * 3, 20);
  return (
    <Abs x={x0} y={COLS.y} w={colW} h={COLS.h}
      style={{ transformOrigin: "50% 0", transform: `translateX(${tx}px) perspective(900px) rotateX(${-90 * (1 - unfold)}deg) scaleX(${1 - squeeze})`, borderRadius: 20, background: "rgba(255,255,255,.05)", border: BORDER, opacity: cl(unfold * 3) * (1 - squeeze) }}>
      <div style={{ position: "absolute", left: (colW - 60) / 2, top: 28, transform: `scale(${ck})` }}><Check size={60} /></div>
      <div style={{ position: "absolute", left: colW / 2, top: COLS.h - 28, transform: "rotate(-90deg)", transformOrigin: "0 0" }}>
        <div style={{ transform: "translateY(-50%)" }}><Mono size={26} color={C.text}>{`ТИЖДЕНЬ ${i + 1}`}</Mono></div>
      </div>
    </Abs>
  );
};
const Suprovid: React.FC = () => {
  const F = useCurrentFrame() + 450;
  const push = sp(F, 490, 52) * (1 - sp(F, 552, 48)); // camera pushes toward step 4, then settles
  const z = 1 + 0.1 * push;
  const lift = sp(F, 540, 44);
  const r = { x: lerp(rowRect0.x, rowRect1.x, lift), y: lerp(rowRect0.y, rowRect1.y, lift), w: lerp(rowRect0.w, rowRect1.w, lift), h: lerp(rowRect0.h, rowRect1.h, lift) };
  const rowY = rowRect0.y + rowRect0.h / 2;
  return (
    <>
      <Cam F={F} depth={0.4}>
        <Headline F={F} a={454} n="03" name="СУПРОВІД" l1="2 місяці" l2="поруч." sub="ПЕРЕВІРКА ДЗ · ВІДПОВІДЬ ПРОТЯГОМ ДНЯ" />
      </Cam>
      <Cam F={F}>
        <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `540px ${rowY + 130}px` }}>
          {/* carousel_4 leaves slice by slice as carousel_5 assembles in its place */}
          {F < 500 && <Sliced src="ui/carousel_4.png" x={CARD.x} y={CARD.y} w={CARD.w} iw={1080} ih={1350} cuts={CUTS4} plate={1 - ep(F, 452, 470)}
            pose={(i) => { const p = sp(F, 452 + i * 3, 28); return { tf: `translateX(${-p * 1000}px) rotateY(${p * 22}deg)`, o: 1 - cl(p * 1.4), blur: p * 10 }; }} />}
          <Sliced src="ui/carousel_5.png" x={CARD.x} y={CARD.y} w={CARD.w} iw={1080} ih={1350} cuts={CUTS5} plate={sp(F, 480, 20) * (1 - lift * 0.6)}
            pose={(i) => {
              const a = sp(F, 458 + i * 4, 32);
              if (i === ROW) return { tf: `translateX(${(1 - a) * 1000}px) rotateY(${(1 - a) * -18}deg)`, o: lift > 0.02 ? 0 : cl(a * 2.2), blur: (1 - a) * 10 };
              const par = (i - ROW) * 14 * push; // parallax between slices while the camera pushes
              return { tf: `translateX(${(1 - a) * 1000}px) translateY(${par}px) rotateY(${(1 - a) * -18}deg)`, o: cl(a * 2.2) * (1 - 0.68 * lift), blur: (1 - a) * 10 + 7 * lift };
            }} />
          {lift > 0.02 && <RowPanel r={r} lift={lift} radius={lerp(0, 20, lift)} />}
          {F >= 576 && Array.from({ length: 8 }, (_, i) => <Week key={i} i={i} F={F} unfold={sp(F, 576 + i * 3, 24)} />)}
        </AbsoluteFill>
      </Cam>
    </>
  );
};

// ================================================================ 630–750 04 УМОВИ
const PRICE = { x: 70, y: 900, w: 640, h: 250 };
const TOP = { x: 70, y: 800, w: 640, h: 220 };
const BOT = { x: 70, y: 1044, w: 640, h: 220 };
const STORY = { x: 540, y: 650, w: 500 };
const lr = (a: typeof PRICE, b: typeof PRICE, t: number) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const PriceCard: React.FC<{ r: typeof PRICE; children?: React.ReactNode; style?: React.CSSProperties }> = ({ r, children, style }) => (
  <Abs x={r.x} y={r.y} w={r.w} h={r.h} style={{ borderRadius: 28, background: C.card, border: BORDER, boxShadow: SHADOW, overflow: "hidden", ...style }}>{children}</Abs>
);
const Umovy: React.FC = () => {
  const F = useCurrentFrame() + 630;
  const comp = sp(F, 634, 30); // timeline compresses into the price card
  const count = ep(F, 656, 692, Easing.out(Easing.cubic));
  const split = sp(F, 698, 30);
  const splitOn = F >= 698;
  const rgb = F >= 698 && F < 700;
  const r = lr(rowRect1, PRICE, comp);
  const lineP = sp(F, 716, 24);
  return (
    <>
      <Cam F={F} depth={0.4}>
        <Headline F={F} a={634} n="04" name="УМОВИ" l1="Чесна ціна." l2="До оплати." />
      </Cam>
      <Cam F={F}>
        {/* story_4 assembles behind the price */}
        <AbsoluteFill style={{ perspective: 1800 }}>
          <div style={{ position: "absolute", inset: 0, transform: "rotateY(-12deg)", transformOrigin: `${STORY.x + STORY.w}px 50%` }}>
            <Sliced src="ui/story_4.png" x={STORY.x} y={STORY.y} w={STORY.w} iw={1080} ih={1920} cuts={[0, 384, 768, 1152, 1536, 1920]} plate={sp(F, 690, 20)}
              pose={(i) => ({ ...assemble(F, 662, i, 700), o: cl(sp(F, 662 + i * 4, 32) * 2.2) * 0.92 })} />
          </div>
        </AbsoluteFill>
        {comp < 1 && Array.from({ length: 8 }, (_, i) => <Week key={i} i={i} F={F} unfold={1} squeeze={comp} />)}
        {!splitOn && (
          <PriceCard r={r}>
            {comp < 0.6 && <RowPanel r={{ x: 0, y: 0, w: r.w, h: r.w * (166 / 1080) }} imgO={1 - comp / 0.6} radius={0} />}
            <div style={{ position: "absolute", left: 44, top: 44, opacity: ep(F, 650, 662) }}><Mono size={22} color={C.sub}>ДО ОПЛАТИ</Mono></div>
            <div style={{ position: "absolute", left: 40, top: 92, fontFamily: SANS, fontWeight: 800, fontSize: 104, letterSpacing: "-0.02em", color: C.text, opacity: ep(F, 652, 664), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {fmt(2830 * count)} <span style={{ color: C.sub, fontSize: 64 }}>грн</span>
            </div>
          </PriceCard>
        )}
        {splitOn && (
          <>
            {[{ to: TOP, n: "2 460", l: "— наставнику" }, { to: BOT, n: "370", l: "— сервісний збір платформи" }].map((c, k) => {
              const rr = lr(PRICE, c.to, split);
              const showNew = ep(F, 708 + k * 3, 720 + k * 3);
              const oldO = 1 - ep(F, 698, 704);
              return (
                <PriceCard key={k} r={rr} style={{ transform: `rotate(${(k ? 1 : -1) * 1.5 * Math.sin(Math.PI * split)}deg)` }}>
                  {oldO > 0 && (
                    <div style={{ position: "absolute", left: 40, top: 92, fontFamily: SANS, fontWeight: 800, fontSize: 104, letterSpacing: "-0.02em", color: C.text, whiteSpace: "nowrap", textShadow: RGB(rgb), opacity: oldO, clipPath: k ? "inset(50% 0 0 0)" : "inset(0 0 50% 0)", transform: `translateY(${(k ? -1 : 1) * (rr.y - PRICE.y) * 0}px)` }}>
                      2{" "}830 <span style={{ color: C.sub, fontSize: 64 }}>грн</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", left: 40, top: 30, opacity: showNew, transform: `translateY(${(1 - showNew) * 24}px)` }}>
                    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, letterSpacing: "-0.02em", color: C.text, whiteSpace: "nowrap" }}>
                      {c.n} <span style={{ color: C.sub, fontSize: 56 }}>грн</span>
                    </div>
                    <div style={{ marginTop: 6 }}><Mono size={24} color={C.sub}>{c.l}</Mono></div>
                  </div>
                </PriceCard>
              );
            })}
          </>
        )}
        <Abs x={74} y={1300} w={600} style={{ opacity: lineP, transform: `translateY(${(1 - lineP) * 16}px)`, fontFamily: SANS, fontWeight: 500, fontSize: 32, lineHeight: 1.3, color: C.sub }}>
          Без гарантій доходу. Навчання дає навички.
        </Abs>
      </Cam>
    </>
  );
};

// ================================================================ 750–900 05 СТАРТ
const ASSETS = [
  ...Array.from({ length: 7 }, (_, i) => ({ src: `ui/carousel_${i + 1}.png`, ar: 1350 / 1080 })),
  ...Array.from({ length: 5 }, (_, i) => ({ src: `ui/story_${i + 1}.png`, ar: 1920 / 1080 })),
  { src: "ui/profile.png", ar: 310 / 720 },
];
const TILE = 300, GAP = 26;
const Wall: React.FC<{ F: number }> = ({ F }) => {
  const appear = (d: number) => sp(F, 750 + d * 0.012, 26);
  const cols = Array.from({ length: 13 }, (_, k) => k - 6);
  return (
    <>
      {cols.map((c) => {
        const seq = ASSETS.map((_, j) => ASSETS[(j + c * 5 + 65) % 13]);
        const hs = seq.map((a) => a.ar * TILE);
        const T = hs.reduce((a, b) => a + b + GAP, 0);
        const off = ((F * 2.4 * (c % 2 ? 1 : -1) + c * 137) % T + T) % T;
        const x = c * (TILE + GAP) - TILE / 2;
        const tiles: React.ReactNode[] = [];
        for (let rep = -2; rep <= 1; rep++) {
          let y = rep * T + off - T / 2;
          seq.forEach((a, j) => {
            const h = hs[j];
            if (y + h > -1900 && y < 1900) {
              const d = Math.hypot(x + TILE / 2, y + h / 2);
              const p = appear(d);
              tiles.push(
                <Img key={`${rep}-${j}`} src={staticFile(a.src)}
                  style={{ position: "absolute", left: x, top: y, width: TILE, height: h, borderRadius: 16, border: BORDER, boxShadow: "0 24px 50px -18px rgba(0,0,0,.7)", opacity: cl(p * 2), transform: `scale(${lerp(0.6, 1, p)})` }} />,
              );
            }
            y += h + GAP;
          });
        }
        return <React.Fragment key={c}>{tiles}</React.Fragment>;
      })}
    </>
  );
};
const Start: React.FC = () => {
  const F = useCurrentFrame() + 750;
  const flat = sp(F, 774, 40);
  const collapse = ep(F, 810, 834, Easing.bezier(0.7, 0, 0.84, 0));
  const pillIn = sp(F, 826, 22);
  const up = sp(F, 832, 26);
  const oldOut = ep(F, 752, 772);
  const bar = sp(F, 834, 22);
  const n1 = sp(F, 836, 24), n2 = sp(F, 840, 24), cta = sp(F, 846, 22);
  const pulse = cl((F - 888) / 12);
  const wallS = lerp(0.58, 0.95, sp(F, 750, 30)) * lerp(1, 0.02, collapse);
  return (
    <>
      {/* the previous chapter, shrinking away under the fast pull-back */}
      {oldOut < 1 && (
        <Cam F={F}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - oldOut }}>
            <Abs x={STORY.x} y={STORY.y} w={STORY.w} h={STORY.w * 1920 / 1080} style={{ borderRadius: 28, overflow: "hidden", boxShadow: SHADOW, transform: "perspective(1800px) rotateY(-12deg)" }}>
              <Img src={staticFile("ui/story_4.png")} style={{ width: "100%", height: "100%" }} />
            </Abs>
            <PriceCard r={TOP} /><PriceCard r={BOT} />
          </div>
        </Cam>
      )}
      {collapse < 1 && (
        <AbsoluteFill style={{ perspective: 2000 }}>
          <div style={{ position: "absolute", left: W / 2, top: 960, transformStyle: "preserve-3d",
            transform: `rotateX(${lerp(48, 0, flat)}deg) rotateZ(${lerp(-16, 0, flat)}deg) scale(${wallS})`, opacity: 1 - collapse * collapse, filter: collapse > 0 ? `blur(${collapse * 6}px)` : undefined }}>
            <Wall F={F} />
          </div>
        </AbsoluteFill>
      )}
      <Cam F={F} depth={0}>
        {F >= 826 && <Pill F={F} chars={8} cursor={false} arrowP={1} style={{ transform: `translateY(${lerp(0, -230, up)}px) scale(${lerp(0.3, 1, pillIn)})`, opacity: cl(pillIn * 2) }} />}
        {F >= 834 && (
          <>
            <Abs x={96} y={1000} w={14} h={340 * bar} style={{ background: C.amber, borderRadius: 2, transform: `scaleX(${1 + 1.2 * Math.sin(Math.PI * pulse)})`, boxShadow: `0 0 ${50 * Math.sin(Math.PI * pulse)}px rgba(245,184,65,.8)` }} />
            <Abs x={144} y={1000} style={{ overflow: "hidden", height: 112 }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, letterSpacing: "-0.02em", lineHeight: 1.12, color: C.text, transform: `translateY(${(1 - n1) * 105}%)`, whiteSpace: "nowrap" }}>Денис |</div>
            </Abs>
            <Abs x={144} y={1104} style={{ overflow: "hidden", height: 112, paddingRight: 30 }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, letterSpacing: "-0.02em", lineHeight: 1.12, color: C.text, transform: `translateY(${(1 - n2) * 105}%)`, whiteSpace: "nowrap" }}>Онлайн-професії</div>
            </Abs>
            <Abs x={148} y={1260} style={{ opacity: cta, transform: `translateY(${(1 - cta) * 16}px)` }}>
              <Mono size={26} color={C.text}>НАПИШІТЬ «ПРОФЕСІЯ» <span style={{ color: C.amber }}>→</span> @MOTIV_ATOREX</Mono>
            </Abs>
          </>
        )}
      </Cam>
    </>
  );
};

// ================================================================ composition
export const ProfesiiaReel: React.FC = () => {
  const ready = useFonts();
  const F = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Background />
      {ready && (
        <>
          <Sequence from={0} durationInFrames={90} layout="none"><ColdOpen /></Sequence>
          <Sequence from={90} durationInFrames={120} layout="none"><Hook /></Sequence>
          <Sequence from={210} durationInFrames={120} layout="none"><Pidbir /></Sequence>
          <Sequence from={330} durationInFrames={120} layout="none"><Napryamy /></Sequence>
          <Sequence from={450} durationInFrames={180} layout="none"><Suprovid /></Sequence>
          <Sequence from={630} durationInFrames={120} layout="none"><Umovy /></Sequence>
          <Sequence from={750} durationInFrames={150} layout="none"><Start /></Sequence>
          <Flash F={F} />
          <HUD F={F} />
        </>
      )}
      <Grain F={F} />
    </AbsoluteFill>
  );
};
