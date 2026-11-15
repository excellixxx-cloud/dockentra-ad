// «40 хвилин» — a nap timer counts down, the film shows where the minutes go, then turns the same 40 minutes
// into a beginning. Vertical 1080x1920, 60 fps, 1200 frames. The timer is on screen in every shot.
// Everything is a pure function of the frame (seek-safe); no CSS animations, no timers.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, spring, staticFile, useCurrentFrame } from "remotion";

export const TOTAL = 1200;
const FPS = 60, W = 1080, H = 1920;
const C = { bg: "#0A0A1A", cool: "#2A2470", peach: "#F2B8A0", violet: "#6366F1", white: "#FFFFFF", grey: "#8A8FB0", card: "#13132B" };
const SANS = "Geist, sans-serif", MONO = "'Geist Mono', monospace";

/* ---------------------------------------------------------------- fonts (local Geist, Cyrillic + Latin subsets) */
const RANGES: Record<string, string> = {
  cyrillic: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  "cyrillic-ext": "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2193, U+2212, U+2215, U+FEFF, U+FFFD",
  "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
};
let fontsP: Promise<void> | null = null;
const useFonts = () => {
  const [h] = useState(() => delayRender("geist"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontsP ??= Promise.all(Object.entries(RANGES).flatMap(([sub, range]) => [
      new FontFace("Geist", `url(${staticFile(`fonts/geist/geist-${sub}.woff2`)})`, { weight: "100 900", unicodeRange: range }),
      new FontFace("Geist Mono", `url(${staticFile(`fonts/geist/geist-mono-${sub}.woff2`)})`, { weight: "100 900", unicodeRange: range }),
    ]).map((f) => f.load().then((ff) => { document.fonts.add(ff); }))).then(() => undefined);
    fontsP.then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

/* ---------------------------------------------------------------- motion helpers */
const cl = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const OUT = Easing.bezier(0.22, 1, 0.36, 1), INOUT = Easing.bezier(0.4, 0, 0.2, 1);
const ep = (f: number, a: number, b: number, e = OUT) => e(cl((f - a) / (b - a)));
/** spring, damping 20 */
const sp = (f: number, s: number, dur = 30) => spring({ frame: f - s, fps: FPS, config: { damping: 20, mass: 0.8, stiffness: 120 }, durationInFrames: dur });
const bump = (f: number, at: number, w: number) => Math.exp(-Math.pow((f - at) / w, 2));

/* ---------------------------------------------------------------- the timer's value */
// [frame, target seconds, roll length, keeps ticking afterwards]
const JUMPS: [number, number, number, boolean][] = [
  [208, 32 * 60 + 14, 14, true], [262, 24 * 60 + 40, 14, true], [332, 17 * 60 + 5, 14, true],
  [390, 9 * 60 + 52, 14, true], [570, 3 * 60 + 10, 14, true], [700, 30, 20, false], [750, 2400, 96, false],
];
/** seconds left on the timer at frame f (float) */
const timeAt = (f: number, upTo = JUMPS.length): number => {
  let k = -1;
  for (let i = 0; i < upTo; i++) if (f >= JUMPS[i][0]) k = i;
  if (k < 0) return 2400 - Math.max(0, Math.floor((f - 60) / 60));
  const [jf, to, dur, ticks] = JUMPS[k];
  if (f < jf + dur) return lerp(timeAt(jf - 1, k), to, INOUT((f - jf) / dur));
  return ticks ? to - Math.floor((f - jf - dur) / 60) : to;
};
const mmss = (s: number) => { const v = Math.max(0, Math.round(s)); return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; };
/** how hard the digits are being thrown right now (0..1), for the blur */
const rollAt = (f: number) => Math.max(...JUMPS.map(([jf, , dur]) => (f >= jf && f < jf + dur ? Math.sin((Math.PI * (f - jf)) / dur) : 0)));

/* ---------------------------------------------------------------- geometry */
const TC = { x: 540, y: 770, r: 400 };            // timer centre and ring radius
const ROWS = [1262, 1340, 1418];                   // the list under the timer
const ICON_X = 400, WORD_X = 470;
const STEP_F = [208, 262, 332];                    // plate, washing machine, phone
const pol = (r: number, deg: number): [number, number] => { const a = ((deg - 90) * Math.PI) / 180; return [r * Math.cos(a), r * Math.sin(a)]; };
/** arc centred on 0,0, clockwise from 12 o'clock, a0 → a1 in degrees */
const arc = (r: number, a0: number, a1: number) => {
  if (a1 - a0 >= 359.99) return `M0 ${-r} A${r} ${r} 0 1 1 -0.01 ${-r}`;
  const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

/* ---------------------------------------------------------------- icons: thin line drawings, blueprint style */
type IconKind = "plate" | "washer" | "phone" | "laptop";
const Icon: React.FC<{ kind: IconKind; size: number; f?: number; color?: string; lit?: number }> = ({ kind, size, f = 0, color = C.white, lit = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", overflow: "visible" }}>
    {kind === "plate" && <><circle cx="24" cy="24" r="17" /><circle cx="24" cy="24" r="10" strokeOpacity={0.55} /><path d="M3 12v8M1 12v5a2 2 0 0 0 4 0v-5M3 20v16" transform="translate(-2 0)" strokeOpacity={0.55} /></>}
    {kind === "washer" && <><rect x="7" y="4" width="34" height="40" rx="4" /><path d="M7 14h34" /><circle cx="13" cy="9" r="1" /><circle cx="18" cy="9" r="1" /><circle cx="24" cy="29" r="9.5" /><path d="M16.5 30c2.5-2.5 5-2.5 7.5 0s5 2.5 7.500 0" strokeOpacity={0.55} transform={`rotate(${f * 4} 24 29)`} /></>}
    {kind === "phone" && <>
      <rect x="12" y="3" width="24" height="42" rx="5" />
      <clipPath id="feed"><rect x="14" y="8" width="20" height="32" /></clipPath>
      <g clipPath="url(#feed)" strokeOpacity={0.55}>
        {[-1, 0, 1, 2, 3, 4].map((i) => { const y = 10 + i * 9 - ((f * 0.35) % 9); return <g key={i}><rect x="16" y={y} width="16" height="5" rx="1.2" /><path d={`M16 ${y + 7.2}h9`} /></g>; })}
      </g>
    </>}
    {kind === "laptop" && <>
      <rect x="8" y="9" width="32" height="22" rx="2.5" fill={C.violet} fillOpacity={0.9 * lit} stroke={lit > 0.5 ? C.violet : color} />
      <path d="M3 37h42M8 31l-3 6M40 31l3 6" />
      {lit > 0 && <path d="M17 20l5 5 9-10" stroke={C.white} strokeOpacity={lit} strokeWidth={2.2} />}
    </>}
  </svg>
);
const ICONS: IconKind[] = ["plate", "washer", "phone"];
const WORDS = ["Посуд.", "Прання.", "Телефон."];

/* ---------------------------------------------------------------- text */
type Seg = string | { v: string };
const Lines: React.FC<{ f: number; a: number; b: number; y: number; size?: number; lines: Seg[][]; still?: boolean }> = ({ f, a, b, y, size = 62, lines, still }) => {
  if (f < a || f > b + 12) return null;
  const out = ep(f, b, b + 10, INOUT);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center" }}>
      {lines.map((ln, i) => {
        const p = still ? cl((f - a) / 8) : sp(f, a + i * 5, 18);
        return (
          <div key={i} style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.22, letterSpacing: "-0.02em", color: C.white, whiteSpace: "nowrap", opacity: cl(p * 1.5) * (1 - out), transform: still ? undefined : `translateY(${(1 - p) * 34 - out * 22}px)` }}>
            {ln.map((s, k) => (typeof s === "string" ? <span key={k}>{s}</span> : <span key={k} style={{ color: C.violet }}>{s.v}</span>))}
          </div>
        );
      })}
    </div>
  );
};
const Mono: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size = 22, color = C.grey, children, style }) => (
  <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: "0.16em", textTransform: "uppercase", color, whiteSpace: "nowrap", ...style }}>{children}</span>
);

/* ---------------------------------------------------------------- camera: one slow continuous push-in, shared by every chapter */
const camS = (f: number) => 1 + 0.04 * (Math.min(f, 1140) / 1140);
const Cam: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => (
  <AbsoluteFill style={{ transform: `scale(${camS(f)})`, transformOrigin: "540px 860px" }}>{children}</AbsoluteFill>
);

/* ---------------------------------------------------------------- background */
const Background: React.FC<{ f: number }> = ({ f }) => {
  const warm = ep(f, 722, 790, INOUT);
  const flash = f >= 720 && f < 725 ? [1, 1, 0.85, 0.6, 0.3][f - 720] : 0;
  return (
    <>
      <AbsoluteFill style={{ background: C.bg }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 48% at 50% 40%, ${C.cool} 0%, rgba(42,36,112,0) 70%)`, opacity: 0.85 * (1 - 0.55 * warm) }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 95% 58% at 50% 42%, ${C.peach} 0%, rgba(242,184,160,0) 72%)`, opacity: 0.25 * warm }} />
      {flash > 0 && <AbsoluteFill style={{ background: C.violet, opacity: flash }} />}
    </>
  );
};
const Grain: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
      <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 16} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#gr)" />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(3,3,10,0.6) 100%)" }} />
  </AbsoluteFill>
);

/* ---------------------------------------------------------------- HUD */
const Moon: React.FC<{ size: number; color?: string }> = ({ size, color = C.grey }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 14.2A8.2 8.2 0 0 1 9.800 4.500a8.200 8.200 0 1 0 9.700 9.700z" /></svg>
);
const HUD: React.FC<{ f: number }> = ({ f }) => {
  const dim = lerp(1, 0.4, ep(f, 574, 600, INOUT) * (1 - ep(f, 720, 740, INOUT)));
  const p = ep(f, 30, 56);
  return (
    <AbsoluteFill style={{ opacity: dim * p }}>
      <div style={{ position: "absolute", left: 64, top: 266 }}><Mono size={20} color={C.grey}>MOTIV_ATOREX</Mono></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 262, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
        <Moon size={26} /><Mono size={22}>ТИХА ГОДИНА</Mono>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- the timer (hero, on screen in every shot) */
const Timer: React.FC<{ f: number }> = ({ f }) => {
  const t = timeAt(f);
  const frac = cl(t / 2400);
  const txt = mmss(t);
  const roll = rollAt(f);
  // shrinks to the top for the last two chapters
  const up = sp(f, 928, 34);
  const s = lerp(1, 0.34, up), cy = lerp(TC.y, 452, up);
  // intro: the crescent draws itself, then bends open into the ring
  const draw = ep(f, 2, 26, INOUT), bend = ep(f, 22, 50, INOUT);
  const r = lerp(74, TC.r, bend);
  // moods
  const quiet = ep(f, 574, 600, INOUT) * (1 - ep(f, 716, 724));              // the question: everything else dims
  const pulse = f >= 404 && f < 570 ? 0.5 + 0.5 * Math.sin(((f - 404) / 84) * 2 * Math.PI - Math.PI / 2) : 0;
  const warm = ep(f, 722, 790);
  const ringO = lerp(1, 0.45, quiet) * (1 - 0.35 * pulse * ep(f, 404, 430));
  const start = (1 - frac) * 360;
  const ringDone = bend >= 1;
  return (
    <div style={{ position: "absolute", left: TC.x, top: cy, width: 0, height: 0, transform: `scale(${s})` }}>
      <svg width={1} height={1} style={{ position: "absolute", overflow: "visible" }}>
        {/* track */}
        <circle r={TC.r} fill="none" stroke={C.white} strokeOpacity={0.09 * bend} strokeWidth={2} />
        {!ringDone && (
          <g transform={`rotate(${lerp(-28, 0, bend)})`}>
            {/* crescent: outer arc (it becomes the ring) and the inner curve (it lets go) */}
            <path d={arc(r, lerp(30, 0, bend), lerp(30, 0, bend) + lerp(250, 360, bend) * draw)} fill="none" stroke={bend > 0.5 ? C.violet : C.white} strokeWidth={lerp(3, 6, bend)} strokeLinecap="round" />
            <path d={`M${pol(r, 30)[0]} ${pol(r, 30)[1]} A${r * 0.86} ${r * 0.86} 0 1 0 ${pol(r, 280)[0]} ${pol(r, 280)[1]}`} fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${draw * 400} 400`} opacity={(1 - bend) * (1 - bend)} />
          </g>
        )}
        {ringDone && frac > 0.002 && (
          <g opacity={ringO} transform={`scale(${1 + 0.012 * pulse})`}>
            <path d={arc(TC.r, start, 360)} fill="none" stroke={C.violet} strokeWidth={6} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${10 + 14 * warm}px rgba(99,102,241,0.7))` }} />
          </g>
        )}
        {/* the slice each chore takes away: it leaves the ring and shrinks into the icon */}
        {STEP_F.map((sf, k) => {
          if (f < sf || f > sf + 40) return null;
          const p = ep(f, sf + 4, sf + 40, INOUT);
          const a0 = (1 - timeAt(sf - 1) / 2400) * 360, a1 = (1 - JUMPS[k][1] / 2400) * 360;
          const mid = pol(TC.r, (a0 + a1) / 2);
          const tx = lerp(0, ICON_X + 28 - TC.x - mid[0] * 0.2, p) + mid[0] * 0.12 * Math.sin(Math.PI * p);
          const ty = lerp(0, ROWS[k] + 30 - TC.y - mid[1] * 0.2, p);
          return <path key={k} d={arc(TC.r, a0, a1)} fill="none" stroke={C.violet} strokeWidth={6} strokeLinecap="round" opacity={(1 - p) * 0.9} transform={`translate(${tx} ${ty}) scale(${lerp(1, 0.2, p)})`} />;
        })}
      </svg>
      {/* digits */}
      <div style={{ position: "absolute", left: -500, width: 1000, top: -170, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 250, lineHeight: "340px", letterSpacing: "-0.04em", color: C.white, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", filter: roll > 0.05 ? `blur(${roll * 5}px)` : undefined, transform: `translateY(${roll * 14}px) scale(${1 - 0.03 * roll})` }}>
        {txt.split("").map((ch, i) => {
          const p = sp(f, 34 + i * 3, 20);
          return <span key={i} style={{ display: "inline-block", opacity: cl(p * 2), transform: `translateY(${(1 - p) * 60}px) scale(${lerp(0.7, 1, p)})`, color: ch === ":" ? "rgba(255,255,255,0.55)" : undefined }}>{ch}</span>;
        })}
      </div>
    </div>
  );
};

/* ================================================================ chapters */
/** 0–150 START */
const Start: React.FC = () => {
  const f = useCurrentFrame();
  const so = ep(f, 12, 30) * (1 - ep(f, 150, 164, INOUT));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 318, textAlign: "center", opacity: so, transform: `translateY(${(1 - ep(f, 12, 30)) * 12}px)`, fontFamily: SANS, fontWeight: 500, fontSize: 30, color: "rgba(255,255,255,0.82)" }}>Робота з дому для мам у декреті</div>
      <Lines f={f} a={46} b={196} y={1276} lines={[["Тиха година."], ["Єдиний час, коли ", { v: "ви" }, " — це ", { v: "ви" }, "."]]} />
    </>
  );
};
/** 150–570: the list of chores (it stays through WHERE THE MINUTES GO, then fades down) */
const Chores: React.FC<{ f: number }> = ({ f }) => {
  const down = ep(f, 390, 420, INOUT);
  const back = ep(f, 796, 846, INOUT);                    // the icons come back and merge into the laptop
  const lit = sp(f, 852, 30);
  const hide = ep(f, 925, 940, INOUT);
  return (
    <>
      {WORDS.map((w, k) => {
        if (f < STEP_F[k]) return null;
        const p = sp(f, STEP_F[k], 34);
        const wp = sp(f, STEP_F[k] + 8, 22);
        // icon: out of the digits, along a small arc, down to its row
        const fx = lerp(TC.x - 36, ICON_X, p), fy = lerp(TC.y - 36, ROWS[k], p) - 60 * Math.sin(Math.PI * cl(p));
        const x = lerp(fx, 540 - 30, back), y = lerp(fy + down * 46, 1216, back);
        const blur = Math.abs(1 - p) * p * 14;
        const io = f < 796 ? 1 - down : cl(back * 3) * (1 - ep(f, 838, 850));
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: x, top: y, opacity: io, transform: `scale(${lerp(2.4, 1, cl(p)) * lerp(1, 0.7, back)})`, transformOrigin: "50% 50%", filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
              <Icon kind={ICONS[k]} size={60} f={f} />
            </div>
            {down < 1 && <div style={{ position: "absolute", left: WORD_X + 12, top: ROWS[k] - 8, fontFamily: SANS, fontWeight: 700, fontSize: 60, lineHeight: "76px", letterSpacing: "-0.02em", color: C.white, opacity: cl(wp * 1.6) * (1 - down), transform: `translateY(${(1 - wp) * 26 + down * 46}px)` }}>{w}</div>}
          </React.Fragment>
        );
      })}
      {/* one small laptop under the timer; it lights up */}
      {f >= 836 && hide < 1 && (
        <div style={{ position: "absolute", left: 540 - 52, top: 1196, opacity: ep(f, 836, 850) * (1 - hide), transform: `scale(${lerp(0.6, 1, sp(f, 836, 26))})`, filter: `drop-shadow(0 0 ${26 * lit}px rgba(99,102,241,${0.8 * lit}))` }}>
          <Icon kind="laptop" size={104} lit={cl(lit)} />
        </div>
      )}
    </>
  );
};
/** 390–570 THE THOUGHT */
const Thought: React.FC = () => { const f = useCurrentFrame() + 390; return <Lines f={f} a={404} b={556} y={1276} lines={[["Знову просити"], ["гроші на себе."]]} />; };
/** 570–720 THE QUESTION (held still) */
const Question: React.FC = () => { const f = useCurrentFrame() + 570; return <Lines f={f} a={580} b={712} y={1276} lines={[["А ким я буду"], ["після декрету?"]]} />; };
/** 750–960 THE FLIP */
const Flip: React.FC = () => { const f = useCurrentFrame() + 750; return <Lines f={f} a={784} b={916} y={1326} size={60} lines={[["40 хвилин на день —"], ["цього досить, щоб ", { v: "почати" }, "."]]} />; };

/** 960–1200 FIRST STEP and END: the card rises, then collapses into the handle pill (outside the camera: the text does not move) */
const CARD = { x: 70, y: 670, w: 940, h: 470 }, PILL = { x: 240, y: 874, w: 600, h: 124 };
const Closing: React.FC<{ f: number }> = ({ f }) => {
  if (f < 928) return null;
  const rise = sp(f, 930, 32);
  const col = sp(f, 1104, 26);
  const pulse = bump(f, 1132, 5);
  const r = { x: lerp(CARD.x, PILL.x, col), y: lerp(CARD.y, PILL.y, col) + (1 - rise) * 1100, w: lerp(CARD.w, PILL.w, col), h: lerp(CARD.h, PILL.h, col) };
  const mixc = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], cl(col)))).join(",")})`;
  const tIn = cl((f - 958) / 8) * (1 - cl((f - 1098) / 6));
  const end = (a: number) => ep(f, a, a + 16);
  return (
    <>
      <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: lerp(36, 62, cl(col)), background: mixc([19, 19, 43], [99, 102, 241]), border: `1px solid rgba(255,255,255,${0.12 * (1 - cl(col))})`, boxSizing: "border-box", boxShadow: `0 40px 90px -30px rgba(0,0,0,0.7), 0 0 ${60 * pulse + 30 * cl(col)}px rgba(99,102,241,${0.35 * cl(col) + 0.4 * pulse})`, transform: `scale(${1 + 0.045 * pulse})` }} />
      {tIn > 0 && (
        <div style={{ position: "absolute", left: CARD.x, width: CARD.w, top: CARD.y + 92, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 66, lineHeight: 1.3, letterSpacing: "-0.02em", color: C.white, opacity: tIn }}>
          <div>Перший крок —</div><div>зрозуміти, що підходить</div><div>саме <span style={{ color: C.violet }}>вам</span>.</div>
        </div>
      )}
      {f >= 1112 && <>
        <div style={{ position: "absolute", left: PILL.x, width: PILL.w, top: PILL.y, height: PILL.h, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 58, letterSpacing: "-0.01em", color: C.white, opacity: end(1114), transform: `scale(${1 + 0.045 * pulse})` }}>@motiv_atorex</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: PILL.y - 92, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 36, color: "rgba(255,255,255,0.88)", opacity: end(1116), transform: `translateY(${(1 - end(1116)) * 14}px)` }}>Онлайн-професія з нуля</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: PILL.y + PILL.h + 44, textAlign: "center", opacity: end(1120), transform: `translateY(${(1 - end(1120)) * -14}px)` }}><Mono size={25}>ПІДПИСУЙТЕСЬ. ПОЧНЕМО РАЗОМ.</Mono></div>
      </>}
    </>
  );
};

/* ================================================================ composition */
export const SorokKhvylyn: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Background f={f} />
      {ready && (
        <>
          <Cam f={f}>
            <Timer f={f} />
            <Chores f={f} />
            <Sequence from={0} durationInFrames={212} layout="none"><Start /></Sequence>
            <Sequence from={390} durationInFrames={180} layout="none"><Thought /></Sequence>
            <Sequence from={570} durationInFrames={156} layout="none"><Question /></Sequence>
            <Sequence from={750} durationInFrames={180} layout="none"><Flip /></Sequence>
          </Cam>
          <Closing f={f} />
          <HUD f={f} />
        </>
      )}
      <Grain f={Math.min(f, 1140)} />
    </AbsoluteFill>
  );
};
