import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { loadBrandFonts } from "../fonts";
import { mix } from "../warehouse/iso";
import { SHOTS, Shot, ShotView, View } from "../wms/Wms";
import TL from "./full.json";

/* Dockentra WMS — the whole system in the style of the approved 66 s cut: every stage shows the desktop
   screen in a browser next to the same screen on an iPhone, with calm camera moves; then the numbers, the
   official colour D with the mint axis passing behind it, and the end card. Times come from full.json
   (apple/full/build.py lays the voice on the clock). */

loadBrandFonts();

type Line = { a: number; b: number; text: string; file: string };
type Sc = { name: string; start: number; end: number; lines: Line[] };
const SC = TL.scenes as Sc[];
const sc = (n: string) => SC.find((s) => s.name === n)!;
export const TOTAL = TL.total;
const LG = TL.logo;
const sm = (x: number) => (1 - Math.cos(Math.PI * clamp(x))) / 2;

/* ---------------------------------------------------------------- screens */
const DESK = (n: string): Shot => ({ src: `wms/${n}.png`, iw: 2880, ih: 1800 });
// the specimen label also hides its "NEXT DAY" service box (no delivery-time promise on screen)
const LABEL: Shot = { ...SHOTS.label, blur: [...(SHOTS.label.blur ?? []), [400, 18, 300, 104]] };
type Beat = { at: number; d: Shot; p: Shot; outline?: [number, number, number, number]; cut?: boolean };
const PLAN: [string, number, Omit<Beat, "at">][] = [
  ["portal", 0, { d: SHOTS.portalD, p: SHOTS.portalP }],
  ["shops", 0, { d: SHOTS.platformsD, p: SHOTS.platformsP }],
  ["order", 0, { d: SHOTS.newOrderD, p: SHOTS.newOrderP, outline: [40, 435, 843, 1379] }],
  ["pick", 0, { d: DESK("03-sborka-skan-aktivnaya-desktop"), p: SHOTS.pickActiveP }],
  ["pick", 4.6, { d: SHOTS.pickD, p: SHOTS.pickP }],
  ["pack", 0, { d: DESK("04-upakovka-skan-desktop"), p: SHOTS.packP }],
  ["label", 0, { d: SHOTS.shipD, p: SHOTS.shipP }],
  ["handover", 0, { d: SHOTS.handoverD, p: SHOTS.handoverP }],
  ["track", 0, { d: SHOTS.shipmentsD, p: SHOTS.shipmentsP }],
  ["billing", 0.1, { d: SHOTS.invoiceD, p: SHOTS.invoiceP, cut: true }],          // swaps at the snap-zoom peak
  ["billing", 5.0, { d: DESK("08-schet-klient-desktop"), p: SHOTS.invoiceP }],
];
const BEATS: Beat[] = PLAN.map(([n, off, b]) => ({ ...b, at: sc(n).start + off }));
const beatAt = (T: number) => BEATS.reduce((n, b, i) => (T >= b.at ? i : n), 0);

const Screen: React.FC<{ T: number; i: number; phone: boolean; cw: number; ch: number }> = ({ T, i, phone, cw, ch }) => {
  const b = BEATS[i], shot = phone ? b.p : b.d;
  const vw = shot.iw, vh = vw * ch / cw;
  const next = BEATS[i + 1]?.at ?? b.at + 9;
  const scroll = phone ? sm((T - b.at) / Math.max(4, next - b.at)) : 0;
  const view: View = { cx: vw / 2, cy: Math.min(vh / 2 + scroll * Math.max(0, shot.ih - vh), shot.ih - vh / 2), w: vw };
  const s = cw / vw, top = view.cy - vh / 2;
  const o = phone ? b.outline : undefined;
  const ok = o ? ramp(T, b.at + 1.0, 0.4, EASE_APPEAR) : 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ShotView shot={shot} view={view} cw={cw} ch={ch} />
      {o && ok > 0 && <div style={{ position: "absolute", left: o[0] * s - 3, top: (o[1] - top) * s - 3, width: o[2] * s + 6, height: o[3] * s + 6, borderRadius: 34 * s + 3, border: `2.5px solid ${C.mint}`, opacity: ok }} />}
    </div>
  );
};

/** The current screen, or a 400 ms horizontal slide-through when this device's screen changes. */
const Slot: React.FC<{ T: number; phone: boolean; cw: number; ch: number }> = ({ T, phone, cw, ch }) => {
  const i = beatAt(T), b = BEATS[i], prev = BEATS[i - 1];
  const changed = prev && (phone ? prev.p !== b.p : prev.d !== b.d);
  if (!changed || b.cut || T >= b.at + 0.4) return <Screen T={T} i={i} phone={phone} cw={cw} ch={ch} />;
  const p = ramp(T, b.at, 0.4, EASE_MOVE);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-p * cw}px)` }}><Screen T={T} i={i - 1} phone={phone} cw={cw} ch={ch} /></div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - p) * cw}px)` }}><Screen T={T} i={i} phone={phone} cw={cw} ch={ch} /></div>
    </>
  );
};

/* ---------------------------------------------------------------- devices */
const BX = 840, BY = 205, BW = 920, BH = 575, BAR = 40;
const Browser: React.FC<{ T: number }> = ({ T }) => (
  <div style={{ position: "absolute", left: BX, top: BY, width: BW, height: BH + BAR, borderRadius: 16, overflow: "hidden", background: C.white, boxShadow: "0 30px 70px rgba(11,13,16,0.16), 0 0 0 1px rgba(11,13,16,0.08)" }}>
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

/** Where the camera settles in each stage: scale and yaw (degrees). */
const TARGET: Record<string, { s: number; ry: number }> = {
  portal: { s: 1.025, ry: 0 }, shops: { s: 1.06, ry: 0 }, order: { s: 1.0, ry: 12 }, pick: { s: 1.04, ry: 0 }, pack: { s: 1.07, ry: -6 },
  label: { s: 1.0, ry: 0 }, handover: { s: 1.03, ry: -12 }, track: { s: 1.06, ry: 0 }, billing: { s: 1.02, ry: 8 },
};
const STAGE_NAMES = Object.keys(TARGET);
const cam = (T: number) => {
  const p0 = sc("portal"), kIn = ramp(T, p0.start, 1.2, EASE_APPEAR);
  let s = (0.9 + 0.1 * kIn), ry = 0;
  let prev = { s: 1.0, ry: 0 };
  for (const n of STAGE_NAMES) {
    const st = sc(n), tg = TARGET[n];
    if (T < st.start) break;
    const k = n === "portal" ? sm((T - st.start - 1.2) / (st.end - st.start - 1.2)) : sm((T - st.start) / (st.end - st.start));
    s = (n === "portal" ? 0.9 + 0.1 * kIn : 1) * lerp(prev.s, tg.s, k);
    ry = lerp(prev.ry, tg.ry, EASE_MOVE(clamp((T - st.start) / 2)));
    prev = tg;
  }
  const bl = sc("billing");
  if (T >= bl.start && T < bl.start + 0.2) s *= 1 + 0.15 * (T < bl.start + 0.1 ? EASE_MOVE(clamp((T - bl.start) / 0.1)) : 1 - EASE_APPEAR(clamp((T - bl.start - 0.1) / 0.1)));
  const ex = ramp(T, sc("trust").start, 0.8, EASE_MOVE);            // the devices leave for the numbers
  const live = ramp(T, p0.start + 0.6, 1.2, EASE_APPEAR);
  return {
    s: s * (1 - 0.12 * ex), ry, rx: 3 * (1 - kIn),
    ty: (1 - kIn) * 760 + live * 9 * Math.sin((2 * Math.PI * T) / 5.5) - 40 * ex, tx: live * 12 * Math.sin((2 * Math.PI * T) / 9),
    live, op: 1 - ex,
  };
};

const ScanIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={2} strokeLinecap="round">
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M7 8v8M10 8v8M13.5 8v8M17 8v8" />
  </svg>
);

const EYEBROW: Record<string, string> = {
  portal: "CLIENT PORTAL", shops: "STORES", order: "NEW ORDER", pick: "PICK & SCAN", pack: "PACK & VERIFY",
  label: "SHIPPING LABEL", handover: "COURIER HANDOVER", track: "TRACKING", billing: "BILLING",
};
const Eyebrow: React.FC<{ T: number }> = ({ T }) => {
  const n = STAGE_NAMES.find((x) => T >= sc(x).start && T < sc(x).end);
  if (!n) return null;
  const st = sc(n), k = ramp(T, st.start + 0.3, 0.4, EASE_APPEAR) * (1 - ramp(T, st.end - 0.3, 0.3, EASE_MOVE));
  return (
    <div style={{ position: "absolute", left: BX + 4, top: BY - 46, display: "flex", alignItems: "center", gap: 10, opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
      {n === "pick" && <ScanIcon size={28} />}
      <span style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 21, letterSpacing: "0.22em", color: C.green }}>{EYEBROW[n]}</span>
    </div>
  );
};

/** The 100x150 label slides in beside the shipment record. */
const LabelCard: React.FC<{ T: number }> = ({ T }) => {
  const st = sc("label");
  if (T < st.start || T > st.end + 0.5) return null;
  const k = ramp(T, st.start + 1.2, 0.6, EASE_APPEAR) * (1 - ramp(T, st.end - 0.3, 0.3, EASE_MOVE));
  const w = 196, h = w * 1063 / 709;
  return (
    <div style={{ position: "absolute", left: 1645, top: 140, width: w, height: h, borderRadius: 8, overflow: "hidden", background: C.white, boxShadow: "0 24px 50px rgba(11,13,16,0.22)", opacity: k, transform: `translateY(${(1 - k) * 60}px) rotate(${4 - 2 * k}deg)` }}>
      <ShotView shot={LABEL} view={{ cx: 709 / 2, cy: 1063 / 2, w: 709 }} cw={w} ch={h} />
    </div>
  );
};

const Devices: React.FC<{ T: number }> = ({ T }) => {
  if (T < sc("portal").start || T >= sc("trust").start + 0.8) return null;
  const c = cam(T);
  const dx = c.live * 7 * Math.sin((2 * Math.PI * T) / 4.3 + 1), dy = c.live * -8 * Math.sin((2 * Math.PI * T) / 4.9 + 2);
  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "1320px 560px", opacity: c.op }}>
      <AbsoluteFill style={{ transformOrigin: "1320px 560px", transform: `translate(${c.tx}px, ${c.ty}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale(${c.s})` }}>
        <Eyebrow T={T} />
        <Browser T={T} />
        <Phone T={T} dx={dx} dy={dy} />
        <LabelCard T={T} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- numbers */
const Stats: React.FC<{ T: number }> = ({ T }) => {
  const st = sc("trust");
  if (T < st.start + 0.5 || T >= LG.start) return null;
  const rows: [number, string, string][] = [[9339, "automated checks", ""], [0, "failures", "mint"], [4, "security reviews", ""]];
  const drift = sm((T - st.start) / (LG.start - st.start));
  return (
    <div style={{ position: "absolute", left: 900, top: 250, transform: `translateY(${-14 * drift}px)` }}>
      {rows.map(([n, label, acc], i) => {
        const k = ramp(T, st.start + 0.7 + i * 0.25, 0.5, EASE_APPEAR);
        const shown = i === 0 ? Math.round(n * EASE_APPEAR(clamp((T - st.start - 0.7) / 1.4))) : n;
        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 34, height: 170, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
            <div style={{ width: 400, textAlign: "right", fontFamily: FONT.display, fontWeight: 800, fontSize: 124, letterSpacing: "-0.04em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>{shown.toLocaleString("en-IE")}</div>
            <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 34, color: C.ink, position: "relative" }}>
              {label}
              {acc && <div style={{ position: "absolute", left: 0, bottom: -14, height: 5, borderRadius: 3, background: C.mint, width: `${100 * ramp(T, st.start + 1.4, 0.6, EASE_APPEAR)}%` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------------------------------------------------------- type */
const Words: React.FC<{ T: number; a: number; lines: string[]; size: number; center?: boolean; ls?: number }> = ({ T, a, lines, size, center, ls = -0.03 }) => {
  let wi = 0;
  return (
    <>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: `${ls}em`, color: C.ink, textAlign: center ? "center" : "left", whiteSpace: "nowrap" }}>
          {ln.split(" ").map((w, i, arr) => {
            const k = ramp(T, a + (wi++) * 0.07, 0.28, EASE_APPEAR);
            return <span key={i} style={{ display: "inline-block", opacity: k, transform: `scale(${0.92 + 0.08 * k})`, transformOrigin: center ? "50% 70%" : "0% 70%" }}>{w}{i < arr.length - 1 ? " " : ""}</span>;
          })}
        </div>
      ))}
    </>
  );
};

const HEAD: Record<string, string[]> = {
  portal: ["One portal", "for every client."], shops: ["Built to connect", "to your stores."], order: ["Orders,", "in a few taps."],
  pick: ["Every pick,", "scanned."], pack: ["Packed against", "the order."], label: ["A label for", "every parcel."],
  handover: ["Know what", "left the building."], track: ["Track every", "shipment, live."], billing: ["Billing,", "automatic."], trust: ["Built.", "Tested."],
};
const Headline: React.FC<{ T: number }> = ({ T }) => {
  const n = Object.keys(HEAD).find((x) => T >= sc(x).start && T < (x === "trust" ? LG.start : sc(x).end));
  if (!n) return null;
  const st = sc(n), a = st.start + (n === "billing" ? 0.1 : 0.5), b = n === "trust" ? 1e9 : st.end - 0.3;
  const out = ramp(T, b, 0.25, EASE_MOVE);
  return <div style={{ position: "absolute", left: 162, top: 172, opacity: 1 - out, transform: `translateY(${-16 * out}px)` }}><Words T={T} a={a} lines={HEAD[n]} size={76} /></div>;
};

const SUBS = TL.subs as [number, number, string][];
const Subtitle: React.FC<{ T: number }> = ({ T }) => {
  const cue = SUBS.find(([a, b]) => T >= a && T <= b + 0.12);
  if (!cue || T >= LG.start) return null;
  const k = ramp(T, cue[0], 0.15, EASE_APPEAR) * (1 - ramp(T, cue[1], 0.12, EASE_MOVE));
  return <div style={{ position: "absolute", left: 162, bottom: 245, width: 620, fontFamily: FONT.body, fontWeight: 500, fontSize: 32, lineHeight: 1.28, color: C.ink, opacity: k }}>{cue[2]}</div>;
};

const ColdOpen: React.FC<{ T: number }> = ({ T }) => {
  const end = sc("open").end;
  if (T >= end) return null;
  const out = ramp(T, end - 0.55, 0.5, EASE_MOVE);
  const ls = lerp(-0.02, -0.035, sm((T - 1.0) / (end - 1.5)));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - out, transform: `translateY(${-30 * out}px)` }}>
      <div style={{ marginTop: -60 }}><Words T={T} a={0.3} lines={["Your warehouse.", "Finally organised."]} size={112} center ls={ls} /></div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- logo + end card */
const DS = 320.5 / 576, DL = 960 - (585 * DS) / 2, DT = 400 - (576 * DS) / 2;
const AX_R = DL + 436 * DS, AX_L = AX_R - 640, AX_Y = DT + 264.5 * DS - 5;
const Logo: React.FC<{ T: number }> = ({ T }) => {
  if (T < LG.start) return null;
  const p = EASE_LOGO(clamp((T - LG.axis) / 0.6));
  const dx = -(AX_R + 2) * (1 - p);
  const k1 = ramp(T, LG.card, 0.5, EASE_APPEAR), k2 = ramp(T, LG.card + 0.15, 0.5, EASE_APPEAR);
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      {T >= LG.axis && <div style={{ position: "absolute", left: AX_L, top: AX_Y, width: 640, height: 10, borderRadius: "5px 0 0 5px", background: C.mint, transform: `translateX(${dx}px)` }} />}
      <Img src={staticFile("apple/d-color.png")} style={{ position: "absolute", left: DL, top: DT, width: 585 * DS, height: 576 * DS }} />
      {k1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 618, textAlign: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 46, lineHeight: 1.22, letterSpacing: "-0.02em", color: C.ink, opacity: k1, transform: `translateY(${(1 - k1) * 16}px)` }}>
          Dockentra — fulfilment for small sellers,<br />powered by software we built ourselves.
        </div>
      )}
      {k2 > 0 && <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 34, letterSpacing: "0.01em", color: C.green, opacity: k2, transform: `translateY(${(1 - k2) * 16}px)` }}>dockentra.ie</div>}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- film */
export const FullFilm: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill style={{ background: C.grey }}>
    <ColdOpen T={T} />
    <Devices T={T} />
    <Stats T={T} />
    <Headline T={T} />
    <Subtitle T={T} />
    <Logo T={T} />
  </AbsoluteFill>
);

export const AppleFull: React.FC = () => {
  const fr = useCurrentFrame(), { fps } = useVideoConfig();
  return <FullFilm T={fr / fps} />;
};

const mid = (n: string, d = 3) => sc(n).start + d;
export const FULL_KEYS = [2.5, mid("portal"), mid("shops"), mid("order"), mid("pick"), mid("pick", 6), mid("pack"), mid("label", 3.5), mid("handover"), mid("track"), mid("billing", 0.1), mid("billing", 7), mid("trust", 3), LG.axis + 0.3, LG.card + 2];
export const AppleFullKey: React.FC<{ i: number }> = ({ i }) => <FullFilm T={FULL_KEYS[i]} />;
