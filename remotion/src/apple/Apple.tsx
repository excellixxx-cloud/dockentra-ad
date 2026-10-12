import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { loadBrandFonts } from "../fonts";
import { mix } from "../warehouse/iso";
import { SHOTS, Shot, ShotView, View } from "../wms/Wms";

/* Dockentra WMS, 66 s Apple-style cut. Rebuilds the approved Motion cut 1:1 (scene times, headlines, VO and
   subtitle timings, camera moves; the audio is Motion's own mix) and adds the desktop version of every screen
   in a browser next to the iPhone, plus the official colour D with the mint axis passing behind it. */

loadBrandFonts();

export const TOTAL = 66;
const sm = (x: number) => (1 - Math.cos(Math.PI * clamp(x))) / 2;      // smooth in-out for slow drifts

/* ---------------------------------------------------------------- screens */
const DESK = (n: string): Shot => ({ src: `wms/${n}.png`, iw: 2880, ih: 1800 });
const SCREENS: { d: Shot; p: Shot; outline?: [number, number, number, number] }[] = [
  { d: SHOTS.portalD, p: SHOTS.portalP },                                                  // 6–16 portal
  { d: SHOTS.newOrderD, p: SHOTS.newOrderP, outline: [40, 435, 843, 1379] },               // 16–26 new order: Recipient card
  { d: SHOTS.shipmentsD, p: SHOTS.shipmentsP },                                            // 26–36 shipments
  { d: DESK("08-schet-klient-desktop"), p: SHOTS.invoiceP },                               // 36–46 charged this month
  { d: DESK("03-sborka-skan-aktivnaya-desktop"), p: SHOTS.pickActiveP },                   // 46–56 pick & scan
];
const SWAP = [6, 16, 26, 36.1, 46];          // 36.1: invoices swap in at the peak of the snap-zoom
const SLIDES = [16, 26, 46];                 // slide-through, 400 ms
const idx = (T: number) => SWAP.reduce((n, s, i) => (T >= s ? i : n), 0);
const sceneStart = (i: number) => [6, 16, 26, 36, 46][i];

/** One screen in a cw x ch window; phones scroll gently through the scene. */
const Screen: React.FC<{ T: number; i: number; phone: boolean; cw: number; ch: number }> = ({ T, i, phone, cw, ch }) => {
  const sc = SCREENS[i], shot = phone ? sc.p : sc.d;
  const vw = shot.iw, vh = vw * ch / cw;
  const scroll = phone ? sm((T - sceneStart(i)) / 10) : 0;
  const cy = vh / 2 + scroll * Math.max(0, shot.ih - vh);
  const view: View = { cx: vw / 2, cy: Math.min(cy, shot.ih - vh / 2), w: vw };
  const s = cw / vw, top = view.cy - vh / 2;
  const o = phone && sc.outline ? sc.outline : null;
  const ok = o ? ramp(T, 17.0, 0.4, EASE_APPEAR) : 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ShotView shot={shot} view={view} cw={cw} ch={ch} />
      {o && ok > 0 && (
        <div style={{ position: "absolute", left: o[0] * s - 3, top: (o[1] - top) * s - 3, width: o[2] * s + 6, height: o[3] * s + 6, borderRadius: 34 * s + 3, border: `2.5px solid ${C.mint}`, opacity: ok }} />
      )}
    </div>
  );
};

/** Current screen, or the horizontal slide-through between two screens. */
const Slot: React.FC<{ T: number; phone: boolean; cw: number; ch: number }> = ({ T, phone, cw, ch }) => {
  const b = SLIDES.find((s) => T >= s && T < s + 0.4);
  if (b === undefined) return <Screen T={T} i={idx(T)} phone={phone} cw={cw} ch={ch} />;
  const p = ramp(T, b, 0.4, EASE_MOVE);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-p * cw}px)` }}><Screen T={T} i={idx(b - 0.01)} phone={phone} cw={cw} ch={ch} /></div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - p) * cw}px)` }}><Screen T={T} i={idx(b)} phone={phone} cw={cw} ch={ch} /></div>
    </>
  );
};

/* ---------------------------------------------------------------- devices */
const BX = 840, BY = 205, BW = 920, BH = 575, BAR = 40;
const Browser: React.FC<{ T: number }> = ({ T }) => (
  <div style={{ position: "absolute", left: BX, top: BY, width: BW, height: BH + BAR, borderRadius: 16, overflow: "hidden", background: C.white,
    boxShadow: "0 30px 70px rgba(11,13,16,0.16), 0 0 0 1px rgba(11,13,16,0.08)" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: C.grey, borderBottom: `1px solid ${mix(C.grey, C.ink, 0.1)}`, display: "flex", alignItems: "center", gap: 8, paddingLeft: 16 }}>
      {[0.35, 0.25, 0.18].map((k, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: mix(C.grey, C.ink, k) }} />)}
    </div>
    <div style={{ position: "absolute", left: 0, top: BAR, width: BW, height: BH, overflow: "hidden" }}><Slot T={T} phone={false} cw={BW} ch={BH} /></div>
  </div>
);

const PX = 1540, PY = 430, PW = 270;
const Phone: React.FC<{ T: number; dx: number; dy: number }> = ({ T, dx, dy }) => {
  const bez = PW * 0.045, sw = PW - 2 * bez, sh0 = sw * 2.164, bar = sw * 0.12, sh = sh0 - bar, h = sh0 + 2 * bez, r = PW * 0.15;
  return (
    <div style={{ position: "absolute", left: PX + dx, top: PY + dy, width: PW, height: h, borderRadius: r, background: C.ink, boxShadow: "0 34px 70px rgba(11,13,16,0.28)" }}>
      <div style={{ position: "absolute", left: bez, top: bez, width: sw, height: sh0, borderRadius: r - bez, overflow: "hidden", background: C.white }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${sw * 0.09}px`, fontFamily: FONT.body, fontWeight: 600, fontSize: sw * 0.052, color: C.ink }}>
          <span>9:41</span>
          <span style={{ width: sw * 0.075, height: sw * 0.036, borderRadius: 3, border: `1.5px solid ${C.ink}`, padding: 1.5, boxSizing: "border-box" }}><span style={{ display: "block", width: "80%", height: "100%", background: C.ink, borderRadius: 1 }} /></span>
        </div>
        <div style={{ position: "absolute", left: 0, top: bar, width: sw, height: sh, overflow: "hidden" }}><Slot T={T} phone cw={sw} ch={sh} /></div>
        <div style={{ position: "absolute", left: sw / 2 - sw * 0.15, top: sw * 0.028, width: sw * 0.3, height: sw * 0.08, borderRadius: sw, background: C.ink }} />
      </div>
    </div>
  );
};

/** Camera on the browser + phone group: dolly-in, push-in, yaw orbit, snap-zoom punch, recede. */
const cam = (T: number) => {
  const kIn = ramp(T, 6, 1.2, EASE_APPEAR);
  let s: number;
  if (T < 16) s = (0.9 + 0.1 * kIn) * (1 + 0.025 * sm((T - 7.2) / 8.8));
  else if (T < 26) s = lerp(1.025, 1.07, sm((T - 16) / 10));
  else if (T < 28) s = lerp(1.07, 1.0, EASE_MOVE(clamp((T - 26) / 2)));
  else if (T < 36) s = 1 + 0.02 * sm((T - 28) / 8);
  else if (T < 36.2) s = 1.02 * (1 + 0.15 * (T < 36.1 ? EASE_MOVE(clamp((T - 36) / 0.1)) : 1 - EASE_APPEAR(clamp((T - 36.1) / 0.1))));
  else if (T < 46) s = 1.02 + 0.03 * sm((T - 36.2) / 9.8);
  else if (T < 47.2) s = lerp(1.05, 0.86, EASE_MOVE(clamp((T - 46) / 1.2)));
  else s = 0.86 + 0.02 * sm((T - 47.2) / 8.8);
  let ry = 0;
  if (T >= 26 && T < 28) ry = 15 * EASE_MOVE(clamp((T - 26) / 2));
  else if (T >= 28 && T < 36.2) ry = 15 + 1.5 * sm((T - 28) / 8);
  else if (T >= 36.2 && T < 38.2) ry = lerp(16.5, 0, EASE_MOVE(clamp((T - 36.2) / 2)));
  const rx = 3 * (1 - kIn) + 3 * EASE_MOVE(clamp((T - 46) / 1.2));
  const live = ramp(T, 6.6, 1.2, EASE_APPEAR);
  const ty = (1 - kIn) * 760 + live * 9 * Math.sin((2 * Math.PI * T) / 5.5);
  const tx = live * 12 * Math.sin((2 * Math.PI * T) / 9);
  return { s, rx, ry, tx, ty, live };
};

const ScanIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={2} strokeLinecap="round">
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M7 8v8M10 8v8M13.5 8v8M17 8v8" />
  </svg>
);

const Devices: React.FC<{ T: number }> = ({ T }) => {
  if (T < 6 || T >= 56) return null;
  const c = cam(T);
  const dx = c.live * 7 * Math.sin((2 * Math.PI * T) / 4.3 + 1), dy = c.live * -8 * Math.sin((2 * Math.PI * T) / 4.9 + 2);   // phone parallax
  const cap = ramp(T, 46.6, 0.4, EASE_APPEAR);
  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "1320px 560px" }}>
      <AbsoluteFill style={{ transformOrigin: "1320px 560px", transform: `translate(${c.tx}px, ${c.ty}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale(${c.s})` }}>
        {cap > 0 && (
          <div style={{ position: "absolute", left: BX + 4, top: BY - 46, display: "flex", alignItems: "center", gap: 10, opacity: cap, transform: `translateY(${(1 - cap) * 10}px)` }}>
            <ScanIcon size={28} />
            <span style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 21, letterSpacing: "0.22em", color: C.green }}>PICK &amp; SCAN</span>
          </div>
        )}
        <Browser T={T} />
        <Phone T={T} dx={dx} dy={dy} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- type */
/** Words appear 70 ms apart, each scale 0.92→1 + fade over 280 ms. */
const Words: React.FC<{ T: number; a: number; lines: string[]; size: number; center?: boolean; ls?: number }> = ({ T, a, lines, size, center, ls = -0.03 }) => {
  let wi = 0;
  return (
    <>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: `${ls}em`, color: C.ink, textAlign: center ? "center" : "left", whiteSpace: "nowrap" }}>
          {ln.split(" ").map((w, i) => {
            const k = ramp(T, a + (wi++) * 0.07, 0.28, EASE_APPEAR);
            return <span key={i} style={{ display: "inline-block", opacity: k, transform: `scale(${0.92 + 0.08 * k})`, transformOrigin: center ? "50% 70%" : "0% 70%" }}>{w}{i < ln.split(" ").length - 1 ? " " : ""}</span>;
          })}
        </div>
      ))}
    </>
  );
};

const HEADS = [
  { a: 6.5, b: 15.75, lines: ["One portal", "for your orders."] },
  { a: 16.15, b: 25.75, lines: ["Create an order", "in seconds."] },
  { a: 26.15, b: 35.75, lines: ["Track every", "shipment, live."] },
  { a: 36.1, b: 45.75, lines: ["Billing, automatic."] },
  { a: 46.4, b: 99, lines: ["Built for real", "fulfilment."] },
];
const Headline: React.FC<{ T: number }> = ({ T }) => {
  const h = HEADS.find((x) => T >= x.a && T < x.b + 0.3 && T < 56);
  if (!h) return null;
  const out = ramp(T, h.b, 0.25, EASE_MOVE);
  return <div style={{ position: "absolute", left: 162, top: 172, opacity: 1 - out, transform: `translateY(${-16 * out}px)` }}><Words T={T} a={h.a} lines={h.lines} size={76} /></div>;
};

/* Subtitle cues, timed to the voice in the Motion mix. */
const SUBS: [number, number, string][] = [
  [7.5, 9.77, "Dockentra WMS gives your brand"], [9.8, 11.73, "its own client portal."],
  [17.53, 19.53, "Send a new order in a few taps."], [19.6, 21.43, "It goes straight to the warehouse."],
  [28.53, 30.3, "Every shipment shows its status,"], [30.37, 32.1, "right up to the courier handover."],
  [37.83, 39.93, "Charges are logged as the work is done,"], [39.97, 42.7, "and you can see this month’s estimate at any time."],
  [47.6, 49.9, "On the floor, every pick is scanned."],
  [50.8, 53.0, "The software is built and tested,"], [53.03, 55.53, "and our warehouse is opening in Limerick."],
];
export const SUBTITLES = SUBS;
const Subtitle: React.FC<{ T: number }> = ({ T }) => {
  const cue = SUBS.find(([a, b]) => T >= a && T <= b + 0.12);
  if (!cue) return null;
  const k = ramp(T, cue[0], 0.15, EASE_APPEAR) * (1 - ramp(T, cue[1], 0.12, EASE_MOVE));
  return (
    <div style={{ position: "absolute", left: 162, bottom: 245, width: 620, fontFamily: FONT.body, fontWeight: 500, fontSize: 32, lineHeight: 1.28, color: C.ink, opacity: k }}>{cue[2]}</div>
  );
};

const ColdOpen: React.FC<{ T: number }> = ({ T }) => {
  if (T >= 6) return null;
  const out = ramp(T, 5.45, 0.5, EASE_MOVE);
  const ls = lerp(-0.02, -0.035, sm((T - 1.0) / 4.5));      // slow tracking tighten keeps the type alive
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - out, transform: `translateY(${-30 * out}px)` }}>
      <div style={{ marginTop: -60 }}><Words T={T} a={0.3} lines={["Your warehouse.", "Finally organised."]} size={112} center ls={ls} /></div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- logo + end card */
// Official D (585x576 crop of the brand logo): counter x 153–436 on row 264. Axis 640x10 behind the D.
const DS = 320.5 / 576, DL = 960 - (585 * DS) / 2, DT = 400 - (576 * DS) / 2;
const AX_R = DL + 436 * DS, AX_L = AX_R - 640, AX_Y = DT + 264.5 * DS - 5;
export const LOGO = { start: 56.0, axis: 57.6, settle: 58.2, card: 60.0 };
const Logo: React.FC<{ T: number }> = ({ T }) => {
  if (T < LOGO.start) return null;
  const p = EASE_LOGO(clamp((T - LOGO.axis) / 0.6));
  const dx = -(AX_R + 2) * (1 - p);                           // from fully off-screen left, translateX only
  const k1 = ramp(T, LOGO.card, 0.5, EASE_APPEAR), k2 = ramp(T, LOGO.card + 0.15, 0.5, EASE_APPEAR);
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      {T >= LOGO.axis && <div style={{ position: "absolute", left: AX_L, top: AX_Y, width: 640, height: 10, borderRadius: "5px 0 0 5px", background: C.mint, transform: `translateX(${dx}px)` }} />}
      <Img src={staticFile("apple/d-color.png")} style={{ position: "absolute", left: DL, top: DT, width: 585 * DS, height: 576 * DS }} />
      {k1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 618, textAlign: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 46, lineHeight: 1.22, letterSpacing: "-0.02em", color: C.ink, opacity: k1, transform: `translateY(${(1 - k1) * 16}px)` }}>
          Dockentra — fulfilment for small sellers,<br />powered by software we built ourselves.
        </div>
      )}
      {k2 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 34, letterSpacing: "0.01em", color: C.green, opacity: k2, transform: `translateY(${(1 - k2) * 16}px)` }}>dockentra.ie</div>
      )}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- film */
export const AppleFilm: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill style={{ background: C.grey }}>
    <ColdOpen T={T} />
    <Devices T={T} />
    <Headline T={T} />
    <Subtitle T={T} />
    <Logo T={T} />
  </AbsoluteFill>
);

export const AppleWms: React.FC = () => {
  const fr = useCurrentFrame(), { fps } = useVideoConfig();
  return <AppleFilm T={fr / fps} />;
};

export const APPLE_KEYS = [3.0, 6.6, 10, 16.2, 20, 26.3, 30, 36.1, 41, 46.6, 52, 56.5, 57.9, 59, 63];
export const AppleKey: React.FC<{ i: number }> = ({ i }) => <AppleFilm T={APPLE_KEYS[i]} />;
