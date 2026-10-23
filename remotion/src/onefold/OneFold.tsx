import React from "react";
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_MOVE, clamp, lerp, ramp } from "../brand";
import DM from "./dmark.json";

/* "One fold" — the Dockentra "D" builds the warehouse out of cards and folds back into the logo.
   15 s, 1080x1920, 30 fps, one typeface (Manrope, variable). Every scene grows out of the one before:
     0.0–3.0  Bay Grey, the D says "psst", the hook arrives word by word; the D swells into the green fill
     3.0–6.5  three cards ride in, fold into a phone (real client-portal screenshot)
     6.5–7.0  the one hard whip-pan, onto Dock Ink: "Three questions." focuses
     7.0–10.5 a Bay Grey page grows out of the phrase; three cards assemble a grid (real screenshots)
     ~10.0    "Handled." stamp lands on the grid; its Dock Ink badge swells into the next scene
    10.5–12.9 "You sell. We ship."
    12.3–15.0 three cards fold into the D; diagonal brand fill; mint axis through the counter; 1.5 s hold */

/* ---------------------------------------------------------------- font */
if (typeof document !== "undefined") {
  const h = delayRender("Manrope");
  new FontFace("Manrope", `url(${staticFile("fonts/Manrope-800.woff2")}) format("woff2")`, { weight: "200 800" })
    .load().then((f) => { document.fonts.add(f); continueRender(h); });
}
const F = "Manrope";
export const TOTAL = 15;
const PAD = 90;

/* ---------------------------------------------------------------- motion helpers (three easing profiles + one spring) */
/** overshoot spring: 0 → 1.05 (cubic-bezier(.22,1,.36,1)) → 1.0 (cubic-bezier(.4,0,.2,1)) */
const spring = (T: number, a: number, d = 0.45) => {
  const k = clamp((T - a) / d);
  return k < 0.65 ? 1.05 * EASE_APPEAR(k / 0.65) : lerp(1.05, 1, EASE_MOVE((k - 0.65) / 0.35));
};
const sm = (x: number) => (1 - Math.cos(Math.PI * clamp(x))) / 2;
const wob = (T: number, per: number, ph = 0) => Math.sin((2 * Math.PI * T) / per + ph);

/* ---------------------------------------------------------------- the D (vector, traced from the brand logo) */
const DPath: React.FC<{ size: number; flat?: string; id: string; fill?: number }> = ({ size, flat, id, fill = 1 }) => {
  // fill: 0..1 diagonal brand fill, bottom-left → top-right (brand book), over the flat Dock Green D
  const edge = -20 + fill * 140;
  return (
    <svg width={size * DM.w / DM.h} height={size} viewBox={`0 0 ${DM.w} ${DM.h}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}c`}><path d={DM.d} fillRule="evenodd" /></clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stopColor="#0F5F4A" /><stop offset="0.55" stopColor="#139477" /><stop offset="1" stopColor="#1FB08C" /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#E9FFF6" /><stop offset="0.5" stopColor="#7FEBC2" /><stop offset="1" stopColor="#4FDCA9" /></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="1" x2="1" y2="0"><stop offset={`${edge}%`} stopColor="#fff" /><stop offset={`${edge + 0.5}%`} stopColor="#000" /></linearGradient>
        <mask id={`${id}k`}><rect width={DM.w} height={DM.h} fill={`url(#${id}m)`} /></mask>
      </defs>
      <path d={DM.d} fillRule="evenodd" fill={flat ?? C.green} />
      {!flat && fill > 0 && (
        <g mask={`url(#${id}k)`}>
          <path d={DM.d} fillRule="evenodd" fill={`url(#${id}g)`} />
          <path d={DM.fold} clipPath={`url(#${id}c)`} fill={`url(#${id}f)`} />
        </g>
      )}
    </svg>
  );
};

/* ---------------------------------------------------------------- type: words one by one (75 ms), rise with EASE_APPEAR */
type Word = { w: string; accent?: boolean };
const words = (s: string, accent: string[] = []): Word[] => s.split(" ").map((w) => ({ w, accent: accent.includes(w) }));
const Phrase: React.FC<{ T: number; a: number; b?: number; lines: Word[][]; size: number; color: string; accent: string; align?: "left" | "center"; weight?: number }> = ({ T, a, b = 1e9, lines, size, color, accent, align = "left", weight = 800 }) => {
  let i = 0;
  const n = lines.flat().length;
  return (
    <div style={{ textAlign: align }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: F, fontWeight: weight, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}>
          {ln.map((w, k) => {
            const j = i++;
            const p = ramp(T, a + j * 0.075, 0.45, EASE_APPEAR);
            const q = ramp(T, b + (n - 1 - j) * 0.04, 0.32, EASE_MOVE);       // exit: words lift away, last word first
            if (p <= 0 || q >= 1) return <span key={k} style={{ display: "inline-block", opacity: 0, marginRight: k < ln.length - 1 ? "0.24em" : 0 }}>{w.w}</span>;
            return <span key={k} style={{ display: "inline-block", color: w.accent ? accent : color, opacity: Math.min(1, p * 1.6) * (1 - q), transform: `translateY(${(1 - p) * 0.5 * size - q * 0.6 * size}px)`, marginRight: k < ln.length - 1 ? "0.24em" : 0 }}>{w.w}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------- icons: 2 px stroke, round */
const Icon: React.FC<{ kind: "inbound" | "photo" | "stock"; color: string; size?: number }> = ({ kind, color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {kind === "inbound" && <><path d="M3.5 8.5 12 4l8.5 4.5v9L12 22l-8.5-4.5z" /><path d="M3.5 8.5 12 13l8.5-4.5M12 13v9" /></>}
    {kind === "photo" && <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13.5" r="3.6" /></>}
    {kind === "stock" && <><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 18h4" /></>}
  </svg>
);

/* ---------------------------------------------------------------- screenshots: object-fit contain, page colour behind */
const Shot: React.FC<{ src: string; w: number; h: number; bg?: string }> = ({ src, w, h, bg = C.grey }) => (
  <div style={{ width: w, height: h, background: bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <Img src={staticFile(src)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
  </div>
);

/* ================================================================ 0.0–3.0  hook */
const DX = 540, DY = 1530, DSZ = 340;          // the D character: centre-bottom anchor and height
const Hook: React.FC<{ T: number }> = ({ T }) => {
  if (T >= 3.05) return null;
  // the D reacts to every word with a small squash, leans and hops on "Ireland?"
  let sq = 0;
  for (let j = 0; j < 6; j++) sq += 0.05 * Math.exp(-Math.pow((T - (0.5 + j * 0.075 + 0.12)) / 0.07, 2));
  const hop = Math.exp(-Math.pow((T - 1.25) / 0.16, 2));
  const land = Math.exp(-Math.pow((T - 1.52) / 0.06, 2));
  const sy = 1 - sq + 0.10 * hop - 0.12 * land + 0.025 * wob(T, 1.6);
  const tilt = lerp(0, -8, ramp(T, 1.05, 0.5, EASE_MOVE)) + 2 * wob(T, 2.3);
  const lift = -70 * hop;
  // 2.5–3.0: the D swells from inside its stem until its Dock Green is the whole frame
  const grow = T < 2.5 ? 1 : lerp(1, 46, Math.pow(EASE_MOVE(clamp((T - 2.5) / 0.5)), 2.2));
  const dw = DSZ * DM.w / DM.h;
  const ox = dw * 0.12, oy = DSZ * 0.5;                    // inside the stem, so the counter never reads as a hole
  const bub = T < 0.55 ? spring(T, 0.08, 0.3) * (1 - ramp(T, 0.42, 0.13, EASE_MOVE)) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: DX - dw / 2, top: DY - DSZ + lift, width: dw, height: DSZ, transformOrigin: `${ox}px ${grow > 1 ? oy : DSZ}px`,
        transform: grow > 1 ? `scale(${grow})` : `rotate(${tilt}deg) scale(${1 + (1 - sy) * 0.6}, ${sy})` }}>
        <DPath size={DSZ} flat={C.green} id="hookD" />
      </div>
      {bub > 0 && (
        <div style={{ position: "absolute", left: 650, top: 1110, transformOrigin: "0% 100%", transform: `scale(${bub}) rotate(-4deg)`, padding: "18px 34px", borderRadius: 44, background: C.white, fontFamily: F, fontWeight: 800, fontSize: 50, color: C.ink, boxShadow: "0 14px 34px rgba(11,13,16,0.14)" }}>psst</div>
      )}
    </>
  );
};
const HookText: React.FC<{ T: number }> = ({ T }) => {
  if (T >= 3.4) return null;
  const white = ramp(T, 2.62, 0.25, EASE_MOVE);
  const ink = `rgb(${lerp(11, 255, white)},${lerp(13, 255, white)},${lerp(16, 255, white)})`;
  const acc = `rgb(${lerp(15, 255, white)},${lerp(95, 255, white)},${lerp(74, 255, white)})`;
  return (
    <div style={{ position: "absolute", left: PAD, top: 330, transform: `translateY(${-14 * sm(T / 3)}px)` }}>
      <Phrase T={T} a={0.5} b={2.95} size={118} color={ink} accent={acc} lines={[words("Selling on"), words("TikTok Shop"), words("in Ireland?", ["Ireland?"])]} />
    </div>
  );
};

/* ================================================================ 3.0–6.5  cards → phone */
const CARDS: { t: string; icon: "inbound" | "photo" | "stock" }[] = [{ t: "Inbound", icon: "inbound" }, { t: "Photo report", icon: "photo" }, { t: "Stock record", icon: "stock" }];
const PH = { w: 470, x: 540 - 235, y: 690 };                // phone geometry
const phoneH = () => { const bez = PH.w * 0.045, sw = PH.w - 2 * bez; return sw * 2532 / 1170 + 2 * bez; };
const Cards: React.FC<{ T: number }> = ({ T }) => {
  if (T < 3.0 || T >= 6.62) return null;
  const fold = ramp(T, 4.7, 0.8, EASE_MOVE);                // cards fold into the phone screen
  const bez = PH.w * 0.045, sw = PH.w - 2 * bez, sh = sw * 2532 / 1170, h = sh + 2 * bez;
  const drift = sm((T - 5.0) / 1.5);
  const py = PH.y + 40 - 70 * drift, prot = 1.5 * wob(T, 3.1);
  const reveal = ramp(T, 5.05, 0.55, EASE_APPEAR);          // the screen lights from top to bottom (a wipe, not a fade)
  return (
    <>
      {/* the phone body grows around the folding cards */}
      {fold > 0 && (
        <div style={{ position: "absolute", left: PH.x, top: py, width: PH.w, height: h, transformOrigin: "50% 30%", transform: `scale(${lerp(0.7, 1, fold)}) rotate(${prot}deg)`, opacity: Math.min(1, fold * 3) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: PH.w * 0.14, background: C.ink, boxShadow: "0 50px 90px rgba(4,30,22,0.45)" }} />
          <div style={{ position: "absolute", left: bez, top: bez, width: sw, height: sh, borderRadius: PH.w * 0.14 - bez, overflow: "hidden", background: C.grey }}>
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`, transform: `scale(${1 + 0.03 * drift})`, transformOrigin: "50% 0%" }}>
              <div style={{ paddingTop: sw * 0.12, background: C.grey }}><Shot src="wms/01-portal-klienta-phone.png" w={sw} h={sh - sw * 0.12} /></div>
            </div>
            <div style={{ position: "absolute", left: sw / 2 - sw * 0.15, top: sw * 0.025, width: sw * 0.3, height: sw * 0.075, borderRadius: sw, background: C.ink }} />
          </div>
        </div>
      )}
      {CARDS.map((c, i) => {
        const a = 3.2 + i * 0.32;
        const k = spring(T, a, 0.5);
        if (k <= 0) return null;
        const inX = (1 - Math.min(1, clamp((T - a) / 0.33))) * 760;
        const float = 10 * wob(T, 2.2 + i * 0.4, i);
        const x0 = 120 + i * 26, y0 = 700 + i * 150, r0 = (i - 1) * -2.2;
        // folding: each card shrinks into a row of the phone screen, then the screen takes over
        const fx = lerp(x0, PH.x + bez + 24, fold), fy = lerp(y0 + float, py + bez + 180 + i * 96, fold);
        const fw = lerp(760, sw - 48, fold), fh = lerp(150, 80, fold);
        const op = 1 - ramp(T, 5.3, 0.35, EASE_MOVE);
        return (
          <div key={i} style={{ position: "absolute", left: fx + inX, top: fy, width: fw, height: fh, borderRadius: lerp(40, 22, fold), background: C.white, opacity: op,
            boxShadow: "0 24px 50px rgba(4,30,22,0.28)", display: "flex", alignItems: "center", gap: lerp(34, 16, fold), paddingLeft: lerp(44, 20, fold),
            transform: `rotate(${lerp(r0, 0, fold) + (1 - Math.min(k, 1)) * 8}deg) scale(${fold > 0 ? 1 : k})`, transformOrigin: "0% 50%" }}>
            <Icon kind={c.icon} color={c.icon === "photo" ? C.mint : C.green} size={lerp(66, 36, fold)} />
            <span style={{ fontFamily: F, fontWeight: 800, fontSize: lerp(56, 30, fold), letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>{c.t}</span>
          </div>
        );
      })}
    </>
  );
};
const CardsText: React.FC<{ T: number }> = ({ T }) => {
  if (T < 3.0 || T >= 6.62) return null;
  return (
    <div style={{ position: "absolute", left: PAD, top: 300, transform: `translateY(${-18 * sm((T - 3) / 3.5)}px)` }}>
      <Phrase T={T} a={3.05} size={112} color={C.white} accent={C.white} lines={[words("Photographed"), words("on arrival.")]} />
    </div>
  );
};

/* ================================================================ 6.5–7.0  the whip-pan */
const Whip: React.FC<{ T: number }> = ({ T }) => {
  if (T < 6.5 || T >= 7.45) return null;
  const k = clamp((T - 6.5) / 0.4);
  const settle = EASE_APPEAR(k);
  const bx = 70 * (1 - settle);
  const x = (1 - settle) * 900;
  const shrink = ramp(T, 7.0, 0.4, EASE_MOVE);               // 7.0–7.4: the phrase sinks into the growing page
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}><filter id="whip" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={`${bx.toFixed(1)} 0`} /></filter></svg>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: "absolute", left: -300 + ((i * 397) % 700) - x * (1.4 + i * 0.1), top: 330 + i * 180, width: 1600, height: 2 + (i % 3), background: "rgba(245,247,248,0.10)", opacity: 1 - shrink, filter: "url(#whip)" }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, filter: bx > 0.3 ? "url(#whip)" : "none", transform: `translateX(${x}px) scale(${1 - 0.55 * shrink})`, transformOrigin: "50% 60%", opacity: 1 - ramp(T, 7.25, 0.15, EASE_MOVE) }}>
        <Phrase T={99} a={0} size={136} color={C.white} accent={C.mint} align="center" lines={[words("Three"), words("questions.", ["questions."])]} />
      </div>
    </>
  );
};
/** the outgoing phone scene smears off to the left on the whip (6.5–6.62) */
const WhipOut: React.FC<{ T: number; children: React.ReactNode }> = ({ T, children }) => {
  if (T < 6.5) return <>{children}</>;
  if (T >= 6.62) return null;
  const k = (T - 6.5) / 0.12;
  return (
    <AbsoluteFill style={{ transform: `translateX(${-1400 * k * k}px)` }}>
      <svg width="0" height="0" style={{ position: "absolute" }}><filter id="whipout"><feGaussianBlur stdDeviation={`${(20 + 80 * k).toFixed(1)} 0`} /></filter></svg>
      <AbsoluteFill style={{ filter: "url(#whipout)" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================ 7.0–10.5  the grid */
const GRID = [
  { x: 70, y: 660, w: 470, h: 980, title: "Pick & scan" },
  { x: 570, y: 660, w: 440, h: 470, title: "Price request" },
  { x: 570, y: 1170, w: 440, h: 470, title: "Photo report" },
];
const GridCard: React.FC<{ T: number; i: number }> = ({ T, i }) => {
  const g = GRID[i];
  const body = g.h - 92;
  let content: React.ReactNode = null;
  if (i === 0) {
    // the status changes: ORD-000030 in progress → ORD-000028 completed (two real screens, slide-through)
    const p = ramp(T, 8.85, 0.45, EASE_MOVE);
    content = (
      <div style={{ position: "relative", width: g.w, height: body, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-p * body}px)` }}><Shot src="wms/03-sborka-skan-aktivnaya-phone.png" w={g.w} h={body} /></div>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - p) * body}px)` }}><Shot src="wms/03-sborka-skan-phone.png" w={g.w} h={body} /></div>
      </div>
    );
  } else if (i === 1) {
    content = <div style={{ transform: `scale(${1 + 0.035 * sm((T - 7.4) / 3)})`, transformOrigin: "50% 40%" }}><Shot src="onefold/calculator.png" w={g.w} h={body} /></div>;
  } else {
    const pulse = 1 + 0.06 * Math.max(0, wob(T, 1.4));
    content = <div style={{ width: g.w, height: body, background: C.grey, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ transform: `scale(${pulse})` }}><Icon kind="photo" color={C.green} size={120} /></div></div>;
  }
  return (
    <div style={{ width: g.w, height: g.h, borderRadius: 44, background: C.white, boxShadow: "0 24px 60px rgba(11,13,16,0.12)", overflow: "hidden" }}>
      <div style={{ height: 92, padding: "26px 30px 0", fontFamily: F, fontWeight: 800, fontSize: 38, letterSpacing: "-0.02em", color: C.ink, whiteSpace: "nowrap" }}>{g.title}</div>
      {content}
    </div>
  );
};
const Grid: React.FC<{ T: number }> = ({ T }) => {
  if (T < 7.0 || T >= 10.75) return null;
  const page = EASE_MOVE(clamp((T - 7.0) / 0.42));            // the Bay Grey page grows out of the phrase
  const impact = Math.exp(-Math.pow((T - 10.12) / 0.06, 2));   // the stamp lands
  return (
    <>
      <div style={{ position: "absolute", left: 540, top: 960, width: lerp(260, 2300, page), height: lerp(140, 2300, page), transform: "translate(-50%,-50%)", borderRadius: lerp(70, 0, page), background: C.grey }} />
      {GRID.map((g, i) => {
        const k = spring(T, 7.12 + i * 0.04, 0.55);            // all three at once (a 40 ms ripple)
        const from = [[-420, 260], [420, -120], [420, 320]][i];
        const fl = 8 * wob(T, 2.4 + i * 0.5, i * 1.3);
        const par = -22 * sm((T - 7.4) / 3) * (1 + i * 0.25);   // parallax: the cards drift at different speeds
        return (
          <div key={i} style={{ position: "absolute", left: g.x, top: g.y, transformOrigin: "50% 50%",
            transform: `translate(${from[0] * (1 - Math.min(k, 1))}px, ${from[1] * (1 - Math.min(k, 1)) + fl + par}px) scale(${Math.max(0, k) * (1 - 0.025 * impact)}) rotate(${(1 - Math.min(k, 1)) * (i - 1) * 6}deg)` }}>
            <GridCard T={T} i={i} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: PAD, top: 300, transform: `translateY(${-12 * sm((T - 7.3) / 3)}px)` }}>
        <Phrase T={T} a={7.32} size={118} color={C.ink} accent={C.green} lines={[words("Price"), words("by email.", ["email."])]} />
      </div>
    </>
  );
};

/* ================================================================ ~10.0  the stamp, whose Dock Ink badge becomes the next scene */
const Stamp: React.FC<{ T: number }> = ({ T }) => {
  if (T < 9.95 || T >= 10.75) return null;
  const k = clamp((T - 9.95) / 0.2);
  const sc = T < 10.15 ? lerp(1.9, 1.05, EASE_APPEAR(k)) : lerp(1.05, 1.0, EASE_MOVE(clamp((T - 10.15) / 0.15)));
  const rot = T < 10.15 ? lerp(-14, -6, EASE_APPEAR(k)) : -6;
  const grow = EASE_MOVE(clamp((T - 10.32) / 0.38));          // the badge swells into the whole frame
  return (
    <div style={{ position: "absolute", left: 540, top: 1150, transform: `translate(-50%, -50%) rotate(${lerp(rot, 0, grow)}deg) scale(${sc})`, opacity: Math.min(1, k * 4) }}>
      <div style={{ padding: "26px 60px", width: lerp(620, 2600, grow), height: lerp(212, 4200, grow), borderRadius: lerp(36, 0, grow), background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 30px 70px rgba(11,13,16,${0.35 * (1 - grow)})` }}>
        <span style={{ fontFamily: F, fontWeight: 800, fontSize: 150 * (1 + 3 * grow * grow), letterSpacing: "-0.04em", color: C.mint, whiteSpace: "nowrap" }}>Handled.</span>
      </div>
    </div>
  );
};

/* ================================================================ 10.5–15.0  "You sell. We ship." → fold → logo */
const LOGO = { size: 340, top: 720 };
const logoGeo = () => { const s = LOGO.size / DM.h, dw = DM.w * s, DL = 540 - dw / 2; return { s, dw, DL, DT: LOGO.top, axR: DL + 436 * s, axY: LOGO.top + 264.5 * s - 7 }; };
const AX = { len: 700, a: 12.9 };
const Ending: React.FC<{ T: number }> = ({ T }) => {
  if (T < 10.4) return null;
  const G = logoGeo();
  // three small Dock Green cards (the grid in miniature) pop in, the outer two fold onto the middle, the stack becomes the D
  const pop = spring(T, 12.2, 0.35);
  const fold = EASE_MOVE(clamp((T - 12.45) / 0.3));
  const morph = clamp((T - 12.72) / 0.1);
  const dIn = spring(T, 12.72, 0.3);
  const fill = EASE_APPEAR(clamp((T - 12.82) / 0.6));            // brand diagonal fill
  const p = EASE_APPEAR(clamp((T - AX.a) / 0.6));                 // the axis: 600 ms, cubic-bezier(.22,1,.36,1)
  const dx = -(G.axR + 4) * (1 - p);
  const cw = 150, ch = 210, cy = G.DT + LOGO.size / 2;
  return (
    <>
      {T >= 12.2 && morph < 1 && [-1, 0, 1].map((j) => (
        <div key={j} style={{ position: "absolute", left: 540 - cw / 2 + j * (cw + 24) * (1 - fold), top: cy - ch / 2, width: cw, height: ch, borderRadius: 26, background: C.green,
          transformOrigin: j < 0 ? "100% 50%" : j > 0 ? "0% 50%" : "50% 50%", transform: `perspective(900px) rotateY(${j * -180 * fold}deg) scale(${pop})`, opacity: 1 - morph }} />
      ))}
      {T >= AX.a && <div style={{ position: "absolute", left: G.axR - AX.len, top: G.axY, width: AX.len, height: 14, borderRadius: "7px 0 0 7px", background: C.mint, transform: `translateX(${dx}px)` }} />}
      {morph > 0 && (
        <div style={{ position: "absolute", left: G.DL, top: G.DT, transformOrigin: "50% 50%", transform: `scale(${dIn})` }}>
          <DPath size={LOGO.size} id="logoD" fill={fill} />
        </div>
      )}
      <div style={{ position: "absolute", left: PAD, top: 300, transform: `translateY(${-14 * sm((T - 10.4) / 2.6)}px)` }}>
        <Phrase T={T} a={10.45} b={12.95} size={150} color={C.white} accent={C.mint} lines={[words("You sell."), words("We ship.", ["ship."])]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1140 }}>
        <Phrase T={T} a={13.55} size={62} color={C.white} accent={C.white} align="center" lines={[words("Fulfilment for small sellers,"), words("powered by software"), words("we built ourselves.")]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, textAlign: "center", fontFamily: F, fontWeight: 500, fontSize: 46, color: "rgba(245,247,248,0.85)", opacity: ramp(T, 14.15, 0.3, EASE_APPEAR), transform: `translateY(${(1 - ramp(T, 14.15, 0.45, EASE_APPEAR)) * 20}px)` }}>dockentra.ie</div>
    </>
  );
};

/* ================================================================ the film */
export const OneFoldFilm: React.FC<{ T: number }> = ({ T }) => {
  const green = T >= 3.0 && T < 6.5, ink = T >= 6.5;
  return (
    <AbsoluteFill style={{ background: ink ? C.ink : green ? C.green : C.grey, overflow: "hidden" }}>
      <Hook T={T} />
      <HookText T={T} />
      <WhipOut T={T}><Cards T={T} /><CardsText T={T} /></WhipOut>
      <Whip T={T} />
      <Grid T={T} />
      <Stamp T={T} />
      {T >= 10.7 && <AbsoluteFill style={{ background: C.ink }} />}
      <Ending T={T} />
    </AbsoluteFill>
  );
};

export const OneFold: React.FC = () => { const fr = useCurrentFrame(), { fps } = useVideoConfig(); return <OneFoldFilm T={fr / fps} />; };
export const ONEFOLD_KEYS = [1.9, 5.0, 6.75, 8.6, 10.2, 14.6];
export const OneFoldKey: React.FC<{ i: number; t?: number }> = ({ i, t }) => <OneFoldFilm T={t ?? ONEFOLD_KEYS[i]} />;
