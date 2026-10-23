import React from "react";
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_MOVE, clamp, lerp, ramp } from "../brand";
import DM from "./dmark.json";

/* "One fold" — the Dockentra "D" builds the warehouse out of cards and folds back into the logo.
   15 s, 1080x1920, 30 fps. One typeface (Manrope, variable 200–800). Real WMS screenshots only.
   Stage 1 (this file today): the six key states, all driven by T so stage 2 only adds the in-betweens. */

/* ---------------------------------------------------------------- font: Manrope variable (Medium + ExtraBold) */
let fontsReady = false;
if (typeof document !== "undefined" && !fontsReady) {
  const h = delayRender("Manrope");
  const face = new FontFace("Manrope", `url(${staticFile("fonts/Manrope-800.woff2")}) format("woff2")`, { weight: "200 800" });
  face.load().then((f) => { document.fonts.add(f); fontsReady = true; continueRender(h); });
}
const F = "Manrope";

export const W = 1080, H = 1920, TOTAL = 15;

/* ---------------------------------------------------------------- the D (vector, traced from the brand logo) */
const DPath: React.FC<{ size: number; flat?: string; id: string }> = ({ size, flat, id }) => (
  <svg width={size * DM.w / DM.h} height={size} viewBox={`0 0 ${DM.w} ${DM.h}`} style={{ display: "block", overflow: "visible" }}>
    <defs>
      <clipPath id={`${id}c`}><path d={DM.d} fillRule="evenodd" /></clipPath>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stopColor="#0F5F4A" /><stop offset="0.55" stopColor="#139477" /><stop offset="1" stopColor="#1FB08C" /></linearGradient>
      <linearGradient id={`${id}f`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#E9FFF6" /><stop offset="0.5" stopColor="#7FEBC2" /><stop offset="1" stopColor="#4FDCA9" /></linearGradient>
    </defs>
    <path d={DM.d} fillRule="evenodd" fill={flat ?? `url(#${id}g)`} />
    {!flat && <path d={DM.fold} clipPath={`url(#${id}c)`} fill={`url(#${id}f)`} />}
  </svg>
);

/* ---------------------------------------------------------------- type */
type Word = { w: string; accent?: boolean };
const words = (s: string, accent: string[] = []): Word[] => s.split(" ").map((w) => ({ w, accent: accent.includes(w) }));
/** words appear one by one, 75 ms apart, rising with cubic-bezier(.22,1,.36,1) */
const Line: React.FC<{ T: number; a: number; lines: Word[][]; size: number; color: string; accent: string; align?: "left" | "center"; weight?: number }> = ({ T, a, lines, size, color, accent, align = "left", weight = 800 }) => {
  let i = 0;
  return (
    <div style={{ textAlign: align }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: F, fontWeight: weight, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}>
          {ln.map((w, k) => {
            const p = ramp(T, a + (i++) * 0.075, 0.45, EASE_APPEAR);
            return <span key={k} style={{ display: "inline-block", color: w.accent ? accent : color, opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 0.5 * size}px)`, marginRight: k < ln.length - 1 ? "0.24em" : 0 }}>{w.w}</span>;
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

/* ---------------------------------------------------------------- screenshots: contain, page colour behind */
const Shot: React.FC<{ src: string; w: number; h: number; bg?: string }> = ({ src, w, h, bg = C.grey }) => (
  <div style={{ width: w, height: h, background: bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <Img src={staticFile(src)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
  </div>
);

const Phone: React.FC<{ w: number; src: string }> = ({ w, src }) => {
  const bez = w * 0.045, sw = w - 2 * bez, sh = sw * 2532 / 1170, h = sh + 2 * bez;
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.14, background: C.ink, padding: bez, boxShadow: "0 40px 80px rgba(11,13,16,0.35)" }}>
      <div style={{ width: sw, height: sh, borderRadius: w * 0.14 - bez, overflow: "hidden", background: C.grey, position: "relative" }}>
        <Shot src={src} w={sw} h={sh} />
        <div style={{ position: "absolute", left: sw / 2 - sw * 0.15, top: sw * 0.025, width: sw * 0.3, height: sw * 0.075, borderRadius: sw, background: C.ink }} />
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- scenes (state at T) */
const PAD = 90;

const Hook: React.FC<{ T: number }> = ({ T }) => {
  const tilt = lerp(0, -9, ramp(T, 1.3, 0.6, EASE_MOVE));            // the D leans toward the last word
  const squash = 1 - 0.06 * Math.sin(clamp((T - 0.5) / 0.4) * Math.PI);
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      <div style={{ position: "absolute", left: PAD, top: 330 }}>
        <Line T={T} a={0.5} size={118} color={C.ink} accent={C.green} lines={[words("Selling on"), words("TikTok Shop"), words("in Ireland?", ["Ireland?"])]} />
      </div>
      <div style={{ position: "absolute", left: 540 - 170, top: 1360, transformOrigin: "50% 100%", transform: `rotate(${tilt}deg) scale(${1 / Math.sqrt(squash)}, ${squash})` }}>
        <DPath size={340} flat={C.green} id="hookD" />
      </div>
      {T < 0.5 && <div style={{ position: "absolute", left: 690, top: 1250, padding: "18px 30px", borderRadius: 40, background: C.white, fontFamily: F, fontWeight: 800, fontSize: 46, color: C.ink, boxShadow: "0 12px 30px rgba(11,13,16,0.12)" }}>psst</div>}
    </AbsoluteFill>
  );
};

const CARDS: { t: string; icon: "inbound" | "photo" | "stock" }[] = [
  { t: "Inbound", icon: "inbound" }, { t: "Photo report", icon: "photo" }, { t: "Stock record", icon: "stock" },
];
const Cards: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill style={{ background: C.green }}>
    <div style={{ position: "absolute", left: PAD, top: 300 }}>
      <Line T={T} a={2.7} size={112} color={C.white} accent={C.white} lines={[words("Photographed"), words("on arrival.")]} />
    </div>
    {CARDS.map((c, i) => (
      <div key={i} style={{ position: "absolute", left: 120 + i * 26, top: 700 + i * 150, width: 760, height: 150, borderRadius: 40, background: C.white,
        boxShadow: "0 24px 50px rgba(4,30,22,0.28)", display: "flex", alignItems: "center", gap: 34, paddingLeft: 44, transform: `rotate(${(i - 1) * -2.2}deg)` }}>
        <Icon kind={c.icon} color={c.icon === "photo" ? C.mint : C.green} size={66} />
        <span style={{ fontFamily: F, fontWeight: 800, fontSize: 56, letterSpacing: "-0.03em", color: C.ink }}>{c.t}</span>
      </div>
    ))}
    <div style={{ position: "absolute", left: 540 - 210, top: 1230 }}><Phone w={420} src="wms/01-portal-klienta-phone.png" /></div>
  </AbsoluteFill>
);

const Whip: React.FC<{ T: number }> = ({ T }) => {
  const focus = ramp(T, 6.55, 0.4, EASE_APPEAR);
  const bx = 60 * (1 - focus);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width="0" height="0" style={{ position: "absolute" }}><filter id="whip" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={`${bx.toFixed(1)} 0`} /></filter></svg>
      {[...Array(7)].map((_, i) => <div key={i} style={{ position: "absolute", left: -200, right: -200, top: 360 + i * 210, height: 3 + (i % 3), background: "rgba(245,247,248,0.10)", filter: "url(#whip)" }} />)}
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, filter: "url(#whip)", transform: `translateX(${(1 - focus) * -140}px)` }}>
        <Line T={99} a={0} size={136} color={C.white} accent={C.mint} align="center" lines={[words("Three"), words("questions.", ["questions."])]} />
      </div>
    </AbsoluteFill>
  );
};

const GridCard: React.FC<{ w: number; h: number; title: string; src?: string; sub?: string }> = ({ w, h, title, src, sub }) => (
  <div style={{ width: w, height: h, borderRadius: 44, background: C.white, boxShadow: "0 24px 60px rgba(11,13,16,0.12)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "26px 30px 18px", fontFamily: F, fontWeight: 800, fontSize: 38, letterSpacing: "-0.02em", color: C.ink }}>{title}</div>
    {src ? <Shot src={src} w={w} h={h - 92} /> : <div style={{ flex: 1, background: C.grey, display: "flex", alignItems: "flex-end", padding: 30, fontFamily: F, fontWeight: 500, fontSize: 26, color: "#8C9592" }}>{sub}</div>}
  </div>
);
const Grid: React.FC<{ T: number; stamp?: boolean }> = ({ T, stamp }) => {
  const sp = ramp(T, 9.95, 0.35, EASE_APPEAR);
  const s = stamp ? (sp < 1 ? lerp(1.6, 1.05, sp) : 1.05) * (T > 10.3 ? 1 / 1.05 : 1) : 1;
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      <div style={{ position: "absolute", left: PAD, top: 300 }}>
        <Line T={T} a={7.1} size={118} color={C.ink} accent={C.green} lines={[words("Price"), words("by email.", ["email."])]} />
      </div>
      <div style={{ position: "absolute", left: 70, top: 660 }}><GridCard w={470} h={980} title="ORD-000030" src="wms/03-sborka-skan-aktivnaya-phone.png" /></div>
      <div style={{ position: "absolute", left: 570, top: 660 }}><GridCard w={440} h={470} title="Price calculator" sub="dockentra.ie" /></div>
      <div style={{ position: "absolute", left: 570, top: 1170 }}><GridCard w={440} h={470} title="Photo report" sub="" /></div>
      {stamp && (
        <div style={{ position: "absolute", left: 540, top: 1150, transform: `translate(-50%, -50%) rotate(-6deg) scale(${s})`, padding: "26px 60px", borderRadius: 36, background: C.ink, boxShadow: "0 30px 70px rgba(11,13,16,0.35)" }}>
          <span style={{ fontFamily: F, fontWeight: 800, fontSize: 150, letterSpacing: "-0.04em", color: C.mint }}>Handled.</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const AXIS_LEN = 720;
const Final: React.FC<{ T: number }> = ({ T }) => {
  const size = 380, s = size / DM.h, dw = DM.w * s, DL = 540 - dw / 2, DT = 560;
  const axR = DL + 436 * s, axY = DT + 264.5 * s - 7;
  const p = EASE_APPEAR(clamp((T - 12.9) / 0.6));
  const dx = -(axR + 4) * (1 - p);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: axR - AXIS_LEN, top: axY, width: AXIS_LEN, height: 14, borderRadius: "7px 0 0 7px", background: C.mint, transform: `translateX(${dx}px)` }} />
      <div style={{ position: "absolute", left: DL, top: DT }}><DPath size={size} id="logoD" /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060 }}>
        <Line T={T} a={13.6} size={64} color={C.white} accent={C.white} align="center" lines={[words("Fulfilment for small sellers,"), words("powered by software"), words("we built ourselves.")]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1360, textAlign: "center", fontFamily: F, fontWeight: 500, fontSize: 44, color: "rgba(245,247,248,0.82)", opacity: ramp(T, 14.2, 0.4, EASE_APPEAR) }}>dockentra.ie</div>
    </AbsoluteFill>
  );
};

export const OneFoldFilm: React.FC<{ T: number }> = ({ T }) => {
  if (T < 2.5) return <Hook T={T} />;
  if (T < 6.5) return <Cards T={T} />;
  if (T < 7.0) return <Whip T={T} />;
  if (T < 10.5) return <Grid T={T} stamp={T >= 9.95} />;
  if (T < 12.5) return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center" }}>
      <div style={{ position: "absolute", left: PAD, top: 360 }}><Line T={T} a={10.6} size={150} color={C.white} accent={C.mint} lines={[words("You sell."), words("We ship.", ["ship."])]} /></div>
    </AbsoluteFill>
  );
  return <Final T={T} />;
};

export const OneFold: React.FC = () => { const fr = useCurrentFrame(), { fps } = useVideoConfig(); return <OneFoldFilm T={fr / fps} />; };
export const ONEFOLD_KEYS = [1.9, 5.0, 6.75, 8.6, 10.2, 14.6];
export const OneFoldKey: React.FC<{ i: number }> = ({ i }) => <OneFoldFilm T={ONEFOLD_KEYS[i]} />;
