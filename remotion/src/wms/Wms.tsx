import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { iso, mix } from "../warehouse/iso";
import { BIN, RECV, Room, RoomState } from "../warehouse/Room";
import TL from "./timeline.json";

/* Dockentra WMS product video, 16:9 and 9:16 from one scene engine. Only the uploaded screenshots are
   shown (browser frame for desktop, iPhone frame for phone); personal data and MOCK/emulator marks are
   blurred; every screen carries a "demo data · local test stand" chip. */

type F = { w: number; h: number; v: boolean };
type Line = { a: number; b: number; text: string; sub: boolean };
type Scene = { name: string; start: number; end: number; lines: Line[] };
const SC: Scene[] = TL.scenes as Scene[];
const scene = (n: string) => SC.find((s) => s.name === n)!;
export const TOTAL = TL.total;
const glide = (k: number) => { const c = clamp(k); return 1.3 * c - 0.3 * c * c; };   // eases out, never stops

/* ---------------------------------------------------------------- screenshots */
type Shot = { src: string; iw: number; ih: number; blur?: [number, number, number, number][] };
const D = (n: string, blur?: Shot["blur"]): Shot => ({ src: `wms/${n}.png`, iw: 2880, ih: 1800, blur });
const P = (n: string, blur?: Shot["blur"]): Shot => ({ src: `wms/${n}.png`, iw: 1170, ih: 2532, blur });
const SHOTS = {
  portalD: D("01-portal-klienta-desktop"),
  portalP: P("01-portal-klienta-phone"),
  invoiceP: P("08-schet-klient-phone"),
  platformsD: D("02-magaziny-platformy-desktop"),
  platformsP: P("02-magaziny-platformy-phone"),
  pickD: D("03-sborka-skan-desktop"),
  pickP: P("03-sborka-skan-phone"),
  pickActiveP: P("03-sborka-skan-aktivnaya-phone"),
  packP: P("04-upakovka-skan-phone"),
  shipD: D("05-kartochka-otgruzki-desktop", [[1055, 775, 240, 45], [435, 1078, 240, 35], [460, 1210, 300, 38], [598, 1336, 360, 40], [2205, 660, 400, 135], [2205, 1135, 400, 150]]),
  shipP: P("05-kartochka-otgruzki-phone", [[230, 1135, 300, 50], [95, 1760, 345, 50], [130, 2008, 410, 48], [478, 2462, 390, 55]]),
  label: { src: "wms/06-etiketka-100x150.png", iw: 709, ih: 1063, blur: [[15, 15, 325, 128], [30, 195, 425, 55], [28, 285, 650, 310], [225, 882, 260, 42], [28, 955, 300, 35]] } as Shot,
  handoverD: D("07-peredacha-kurieru-zakryt-desktop"),
  handoverP: P("07-peredacha-kurieru-phone"),
  invoiceD: D("08-schet-sklad-desktop"),
  newOrderD: { src: "wms/10-new-order-desktop.png", iw: 2000, ih: 1250, blur: [[1050, 336, 180, 38], [1050, 418, 205, 38], [1050, 502, 100, 38]] } as Shot,
  newOrderP: { src: "wms/10-new-order-phone.png", iw: 924, ih: 2000, blur: [[100, 545, 260, 62], [100, 770, 370, 62], [100, 990, 180, 58]] } as Shot,
  shipmentsD: { src: "wms/09-shipments-desktop.png", iw: 2000, ih: 1250, blur: [[928, 586, 145, 32], [928, 731, 145, 32], [928, 874, 125, 32], [928, 1018, 132, 32]] } as Shot,
  shipmentsP: { src: "wms/09-shipments-phone.png", iw: 924, ih: 2000, blur: [[330, 1175, 310, 45], [330, 1652, 305, 45]] } as Shot,
};
type View = { cx: number; cy: number; w: number };
const lv = (a: View, b: View, k: number): View => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), w: lerp(a.w, b.w, k) });

/** The screenshot seen through a cw x ch window, centred on view (image px), with its blur boxes. */
const ShotView: React.FC<{ shot: Shot; view: View; cw: number; ch: number }> = ({ shot, view, cw, ch }) => {
  const s = cw / view.w, vh = ch / s;
  const left = -(view.cx - view.w / 2) * s, top = -(view.cy - vh / 2) * s;
  const W = shot.iw * s, H = shot.ih * s;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.white }}>
      <Img src={staticFile(shot.src)} style={{ position: "absolute", left, top, width: W, height: H }} />
      {(shot.blur ?? []).map(([x, y, w, h], i) => (
        <div key={i} style={{ position: "absolute", left: left + x * s, top: top + y * s, width: w * s, height: h * s, overflow: "hidden", borderRadius: 6 * s + 2 }}>
          <Img src={staticFile(shot.src)} style={{ position: "absolute", left: -x * s, top: -y * s, width: W, height: H, filter: `blur(${Math.max(6, 16 * s)}px)` }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(245,247,248,0.35)" }} />
        </div>
      ))}
    </div>
  );
};

const Chip: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 20 }) => (
  <span style={{ display: "inline-block", fontFamily: FONT.mono, fontSize: size, fontWeight: 500, letterSpacing: "0.06em", color: C.ink, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 999, padding: `${size * 0.3}px ${size * 0.8}px`, whiteSpace: "nowrap" }}>{children}</span>
);

/** Desktop screenshot in a browser frame. */
const Browser: React.FC<{ x: number; y: number; w: number; ch: number; shot: Shot; view: View; k?: number; tilt?: number; next?: { shot: Shot; view: View; p: number } }> = ({ x, y, w, ch, shot, view, k = 1, tilt = 0, next }) => {
  const bar = 46;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: ch + bar, borderRadius: 16, border: `2px solid ${C.ink}`, background: C.white, boxShadow: `10px 10px 0 ${C.ink}`, overflow: "hidden", opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 60}px) rotate(${tilt}deg)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: C.grey, borderBottom: `2px solid ${C.ink}`, display: "flex", alignItems: "center", gap: 9, paddingLeft: 18 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 13, height: 13, borderRadius: 7, border: `2px solid ${C.ink}`, background: i === 0 ? C.ink : C.white }} />)}
        <div style={{ marginLeft: 16, height: 28, flex: 1, marginRight: 18, borderRadius: 8, background: C.white, border: `1.5px solid ${mix(C.grey, C.ink, 0.25)}`, display: "flex", alignItems: "center", paddingLeft: 12, fontFamily: FONT.mono, fontSize: 15, color: mix(C.ink, C.grey, 0.35), letterSpacing: "0.04em", overflow: "hidden", whiteSpace: "nowrap" }}>Dockentra WMS · demo data · local test stand</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: bar, height: ch, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${next ? -next.p * ch : 0}px)` }}><ShotView shot={shot} view={view} cw={w - 4} ch={ch} /></div>
        {next && next.p > 0 && <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - next.p) * ch}px)` }}><ShotView shot={next.shot} view={next.view} cw={w - 4} ch={ch} /></div>}
      </div>
    </div>
  );
};

/** Phone screenshot in a plain iPhone frame; `scroll` is the image y at the top of the screen. */
/** Phone screenshot in a plain iPhone frame. `zoom` (1 = whole screen) and `fy` (0..1, the image row it
 *  centres on) move the view; `beam` draws the scan line across the screen at an image y. */
const Phone: React.FC<{ x: number; y: number; w: number; shot: Shot; zoom?: number; fy?: number; k?: number; next?: { shot: Shot; zoom?: number; fy?: number; p: number }; chip?: boolean; beam?: number }> = ({ x, y, w, shot, zoom = 1, fy = 0.5, k = 1, next, chip = true, beam }) => {
  const bez = w * 0.045, sw = w - 2 * bez, sh0 = sw * 2.164, bar = sw * 0.12, sh = sh0 - bar, h = sh0 + 2 * bez, r = w * 0.15;
  const view = (sht: Shot, z: number, cy: number): View => {
    const vw = sht.iw / z, vh = vw * sh / sw;
    return { cx: vw / 2, cy: clamp(cy * sht.ih, vh / 2, sht.ih - vh / 2), w: vw };   // anchored left: the UI reads from the left edge
  };
  const v0 = view(shot, zoom, fy);
  const beamY = beam === undefined ? null : (beam - (v0.cy - (v0.w * sh / sw) / 2)) * (sw / v0.w);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 80}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: r, background: C.ink, boxShadow: `10px 10px 0 ${mix(C.ink, C.grey, 0.75)}` }} />
      <div style={{ position: "absolute", left: bez, top: bez, width: sw, height: sh0, borderRadius: r - bez, overflow: "hidden", background: C.white }}>
       <div style={{ position: "absolute", left: 0, right: 0, top: bar, height: sh, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${next ? -next.p * sh : 0}px)` }}><ShotView shot={shot} view={v0} cw={sw} ch={sh} /></div>
        {next && next.p > 0 && <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - next.p) * sh}px)` }}><ShotView shot={next.shot} view={view(next.shot, next.zoom ?? 1, next.fy ?? 0.5)} cw={sw} ch={sh} /></div>}
        {beamY !== null && <div style={{ position: "absolute", left: sw * 0.04, width: sw * 0.92, top: beamY, height: 5, borderRadius: 3, background: C.mint, boxShadow: `0 0 16px ${C.mint}` }} />}
       </div>
        <div style={{ position: "absolute", left: sw / 2 - sw * 0.16, top: sw * 0.03, width: sw * 0.32, height: sw * 0.085, borderRadius: sw, background: C.ink }} />
      </div>
      {chip && <div style={{ position: "absolute", left: 0, right: 0, top: -54, textAlign: "center" }}><Chip size={17}>demo data · local test stand</Chip></div>}
    </div>
  );
};

/* ---------------------------------------------------------------- type */
/** Headline: words rise one by one, 75 ms apart; drifts while it stays; leaves before the next. */
const Headline: React.FC<{ f: F; T: number; a: number; b: number; lines: string[]; settled?: boolean; top?: number }> = ({ f, T, a, b, lines, settled, top }) => {
  if (!settled && (T < a || T > b + 0.3)) return null;
  const out = settled ? 0 : ramp(T, b - 0.05, 0.3, EASE_MOVE);
  const size = f.v ? 84 : 72;
  let wi = 0;
  return (
    <div style={{ position: "absolute", left: f.v ? 70 : 110, width: f.v ? 940 : 650, top: top ?? (f.v ? 170 : 120), opacity: 1 - out, transform: `translateY(${-10 * (settled ? 0 : clamp((T - a) / Math.max(1, b - a))) - out * 30}px)` }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: "-0.035em", color: C.ink }}>
          {ln.split(" ").map((w, i) => {
            const k = settled ? 1 : ramp(T, a + (wi++) * 0.075, 0.45, EASE_APPEAR);
            return <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 8, marginBottom: -8 }}><span style={{ display: "inline-block", transform: `translateY(${(1 - k) * 105}%)` }}>{w}{" "}</span></span>;
          })}
        </div>
      ))}
    </div>
  );
};

/** Burned-in subtitles: Inter, ink on white, bottom edge 240 px above the frame edge. */
const Subs: React.FC<{ f: F; T: number }> = ({ f, T }) => {
  const cue = SC.flatMap((s) => s.lines).find((l) => l.sub && T >= l.a && T <= l.b + 0.2);
  if (!cue) return null;
  const k = ramp(T, cue.a, 0.25, EASE_APPEAR), o = ramp(T, cue.b, 0.2, EASE_MOVE);
  return (
    <div style={{ position: "absolute", left: f.v ? 70 : 110, width: f.v ? 940 : 640, bottom: 240, display: "flex", justifyContent: f.v ? "center" : "flex-start", opacity: k * (1 - o), transform: `translateY(${(1 - k) * 12 - o * 16}px)` }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: f.v ? 36 : 32, lineHeight: 1.32, color: C.ink, background: "rgba(255,255,255,0.94)", borderRadius: 14, padding: "10px 18px", textAlign: f.v ? "center" : "left" }}>{cue.text}</div>
    </div>
  );
};

/* ---------------------------------------------------------------- the warehouse (isometric) */
const ROOM: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: { x: RECV.x0 + 1, y: RECV.y1 - 0.2 - BIN.d, z: RECV.top - BIN.h - 0.3, hooked: true }, highlightCells: false };
const Warehouse: React.FC<{ f: F; cam: { x: number; y: number; z: number; zoom: number }; empty?: boolean; op?: number; ax?: number; ay?: number }> = ({ f, cam, empty, op = 1, ax, ay }) => {
  const c = iso(cam.x, cam.y, cam.z);
  return (
    <svg width={f.w} height={f.h} style={{ position: "absolute", inset: 0, opacity: op }}>
      <g transform={`translate(${ax ?? f.w / 2} ${ay ?? f.h / 2}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`}><Room s={ROOM} empty={empty} noStand /></g>
    </svg>
  );
};
/** The dim warehouse behind every screen scene, drifting slowly. */
const Backdrop: React.FC<{ f: F; T: number; seed: number }> = ({ f, T, seed }) => (
  <Warehouse f={f} op={0.2} cam={{ x: 28 + 3 * Math.sin(T / 9 + seed), y: 17 + 2 * Math.cos(T / 11 + seed), z: 6, zoom: (f.v ? 1.5 : 1.35) + 0.08 * Math.sin(T / 7 + seed) }} />
);

/* ---------------------------------------------------------------- scenes */
type SP = { f: F; T: number; sc: Scene; settled?: boolean };
const L = (sc: Scene, k: number) => sc.lines[Math.min(k, sc.lines.length - 1)];

const Hook: React.FC<SP> = ({ f, T, sc }) => {
  const logoAt = L(sc, 2).a - 0.25;
  const u = T - sc.start, k = glide(u / (sc.end - sc.start));
  const dim = ramp(T, logoAt - 0.3, 0.6, EASE_MOVE);
  const cam = { x: lerp(9, 21, k), y: lerp(5, 3.5, k), z: lerp(13, 11, k), zoom: (f.v ? 3.3 : 3.0) - 0.5 * k };
  const lk = EASE_LOGO(clamp((T - logoAt) / 0.6)), edge = -20 + lk * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;   // diagonal fill, bottom-left to top-right
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.75 * dim }}><Warehouse f={f} cam={cam} /></div>
      {T >= logoAt && (
        <div style={{ position: "absolute", left: 0, right: 0, top: f.v ? 640 : 300, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1 + 0.03 * clamp((T - logoAt) / 4)})` }}>
          <div style={{ width: f.v ? 460 : 420, WebkitMaskImage: mask, maskImage: mask }}><Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} /></div>
          <div style={{ marginTop: 26, fontFamily: FONT.mono, fontSize: f.v ? 30 : 26, letterSpacing: "0.12em", color: C.green, opacity: ramp(T, logoAt + 0.7, 0.4) }}>WAREHOUSE SOFTWARE · LIMERICK</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** A spreadsheet, drawn: the problem, not our product. Cells are bars; the answers are question marks. */
const Problem: React.FC<SP> = ({ f, T, sc, settled }) => {
  const u = T - sc.start;
  const box = f.v ? { x: 70, y: 560, w: 940, h: 880 } : { x: 860, y: 140, w: 960, h: 780 };
  const cols = ["Client", "SKU", "Batch", "Stock", "Parcel"], rowH = f.v ? 58 : 52;
  const scroll = (u * 18) % rowH;
  const firstRow = Math.floor((u * 18) / rowH);
  const qs = [[2, 2], [5, 0], [7, 4], [9, 2], [12, 4], [4, 3]];      // [row, col] cells that hold no answer
  const k = ramp(T, sc.start + 0.15, 0.6, EASE_APPEAR);
  const a = sc.start + 0.4;
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={1} />
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `10px 10px 0 ${C.ink}`, overflow: "hidden", opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * 50}px) rotate(${-1.2 + 0.6 * glide(u / 15)}deg)` }}>
        <div style={{ display: "flex", height: rowH, background: C.grey, borderBottom: `2px solid ${C.ink}` }}>
          <div style={{ width: 60, borderRight: `1px solid ${mix(C.grey, C.ink, 0.2)}` }} />
          {cols.map((c) => <div key={c} style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 14, fontFamily: FONT.body, fontWeight: 600, fontSize: 22, color: C.ink, borderRight: `1px solid ${mix(C.grey, C.ink, 0.2)}` }}>{c}</div>)}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: rowH, bottom: 0, overflow: "hidden" }}>
          <div style={{ transform: `translateY(${-scroll}px)` }}>
            {Array.from({ length: 18 }, (_, r) => {
              const row = r + firstRow;
              return (
                <div key={row} style={{ display: "flex", height: rowH, borderBottom: `1px solid ${mix(C.grey, C.ink, 0.15)}` }}>
                  <div style={{ width: 60, background: C.grey, borderRight: `1px solid ${mix(C.grey, C.ink, 0.2)}` }} />
                  {cols.map((_, ci) => {
                    const q = qs.findIndex(([qr, qc]) => qr === row % 14 && qc === ci);
                    const lit = q === 0 && row === 16;                     // one cell, once
                    return (
                      <div key={ci} style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 14, borderRight: `1px solid ${mix(C.grey, C.ink, 0.15)}`, background: lit ? C.mint : "transparent" }}>
                        {q >= 0 ? <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 30, color: C.ink }}>?</span>
                          : <div style={{ height: 12, width: `${35 + ((row * 7 + ci * 13) % 50)}%`, borderRadius: 6, background: mix(C.grey, C.ink, 0.18) }} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Headline f={f} T={T} a={a} b={sc.end - 0.3} lines={["Which batch?", "Which client?", "Which parcel?"]} settled={settled} />
    </AbsoluteFill>
  );
};

/** Portal: home, then a new order, then shipments, then invoices, as the voice names them. */
const Portal: React.FC<SP> = ({ f, T, sc, settled }) => {
  const l = sc.lines[0], d = l.b - l.a;
  // where the words fall in the line (orders ~0.33, shipments ~0.69, invoices ~0.77 of its length)
  const cuts = [l.a + 0.30 * d, l.a + 0.64 * d, l.a + 0.78 * d];
  const kb = ramp(T, sc.start + 0.1, 0.7, EASE_APPEAR), kp = ramp(T, sc.start + 0.45, 0.7, EASE_APPEAR);
  const seqP = [SHOTS.portalP, SHOTS.newOrderP, SHOTS.shipmentsP, SHOTS.invoiceP];
  const seqD = [SHOTS.portalD, SHOTS.newOrderD, SHOTS.shipmentsD];
  const viewsD: View[] = [{ cx: 1300, cy: 700, w: 2400 }, { cx: 1000, cy: 560, w: 1700 }, { cx: 1000, cy: 600, w: 1700 }];
  const pick = (n: number) => { let i = 0; while (i < n - 1 && i < cuts.length && T >= cuts[i] + 0.5) i++; return i; };
  const iP = pick(seqP.length), iD = pick(seqD.length);
  const t0P = iP === 0 ? sc.start : cuts[iP - 1], t1P = iP < cuts.length ? cuts[iP] : sc.end;
  const gP = glide((T - t0P) / (t1P - t0P + 0.5));
  const nextP = iP < seqP.length - 1 ? { shot: seqP[iP + 1], zoom: 1.05, fy: 0.3, p: ramp(T, cuts[iP], 0.5, EASE_MOVE) } : undefined;
  const t0D = iD === 0 ? sc.start : cuts[iD - 1], t1D = iD < seqD.length - 1 ? cuts[iD] : sc.end;
  const gD = glide((T - t0D) / (t1D - t0D + 0.5));
  const vD = (i: number, g: number): View => ({ ...viewsD[i], w: viewsD[i].w * (1 - 0.12 * g), cy: viewsD[i].cy + 60 * g });
  const nextD = iD < seqD.length - 1 ? { shot: seqD[iD + 1], view: vD(iD + 1, 0), p: ramp(T, cuts[iD], 0.5, EASE_MOVE) } : undefined;
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={2} />
      {!f.v && <Browser x={800} y={130} w={880} ch={550} shot={seqD[iD]} view={vD(iD, gD)} k={kb} next={nextD} />}
      <Phone x={f.v ? 320 : 1460} y={f.v ? 540 : 250} w={f.v ? 440 : 340} shot={seqP[iP]} zoom={1.05 + 0.25 * gP} fy={lerp(0.3, 0.45, gP)} k={kp} next={nextP} />
      <Headline f={f} T={T} a={sc.start + 0.3} b={sc.end - 0.3} lines={["A portal for", "every client."]} settled={settled} />
    </AbsoluteFill>
  );
};

const Stores: React.FC<SP> = ({ f, T, sc, settled }) => {
  const u = T - sc.start, d = sc.end - sc.start;
  const snap = sc.start + 4.2;                                   // pattern interrupt: one sharp step in on the platform list
  const z = T < snap ? 0 : T < snap + 0.12 ? (T - snap) / 0.12 : 1 - 0.25 * glide((T - snap - 0.12) / (sc.end - snap));
  const base = lv({ cx: 1750, cy: 720, w: 2200 }, { cx: 1800, cy: 760, w: 2000 }, glide(u / d));
  const view = { ...base, w: base.w / (1 + 0.45 * z) };
  const kb = ramp(T, sc.start + 0.1, 0.7, EASE_APPEAR), kp = ramp(T, sc.start + 0.5, 0.7, EASE_APPEAR);
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={3} />
      {!f.v && <Browser x={800} y={140} w={900} ch={560} shot={SHOTS.platformsD} view={view} k={kb} />}
      <Phone x={f.v ? 320 : 1490} y={f.v ? 540 : 300} w={f.v ? 440 : 320} shot={SHOTS.platformsP} zoom={1.05 + 0.25 * glide(u / d) + (f.v ? 0.45 * z : 0)} fy={0.3} k={kp} />
      <Headline f={f} T={T} a={sc.start + 0.3} b={sc.end - 0.3} lines={["Shopify to", "WooCommerce."]} settled={settled} />
      <div style={{ position: "absolute", left: f.v ? 0 : 110, right: f.v ? 0 : undefined, textAlign: f.v ? "center" : "left", top: f.v ? 430 : 330, opacity: ramp(T, sc.start + 1.2, 0.4), transform: `translateY(${(1 - ramp(T, sc.start + 1.2, 0.4, EASE_APPEAR)) * 14}px)` }}>
        <Chip size={f.v ? 24 : 21}>Tested on simulators · not live yet</Chip>
      </div>
    </AbsoluteFill>
  );
};

const Floor: React.FC<SP> = ({ f, T, sc, settled }) => {
  const [l0, l1, l2] = sc.lines;
  const cut1 = l1.a - 0.35, cut2 = l1.a + 1.25, cutC = l2.a - 0.4;           // quick cuts: rhythm change on the floor
  const phase = T < cut1 ? 0 : T < cut2 ? 1 : T < cutC ? 2 : 3;
  const u = T - sc.start;
  const kb = ramp(T, sc.start + 0.1, 0.7, EASE_APPEAR);
  let body: React.ReactNode = null, head: string[] = [], ha = sc.start + 0.3, hb = cut1;
  if (phase === 0) {
    const view = lv({ cx: 1150, cy: 760, w: 1900 }, { cx: 1150, cy: 900, w: 1600 }, glide((T - sc.start) / (cut1 - sc.start)));
    body = f.v ? <Phone x={320} y={540} w={440} shot={SHOTS.pickP} zoom={1.05 + 0.3 * glide(u / (cut1 - sc.start))} fy={lerp(0.35, 0.55, glide(u / (cut1 - sc.start)))} k={kb} />
      : <Browser x={800} y={150} w={1000} ch={620} shot={SHOTS.pickD} view={view} k={kb} />;
    head = ["Know where every", "unit came from."];
  } else if (phase === 1 || phase === 2) {
    const shot = phase === 1 ? SHOTS.pickActiveP : SHOTS.packP;
    const t0 = phase === 1 ? cut1 : cut2;
    const g = glide((T - t0) / 1.6);
    const w = f.v ? 460 : 380, x = f.v ? 310 : 1180, y = f.v ? 520 : 150;
    const beam = 2040 + 150 * (((T - t0) * 0.9) % 1);                 // the scan line sweeping the barcode field
    body = <Phone x={x} y={y} w={w} shot={shot} zoom={1.25 + 0.45 * g} fy={lerp(0.6, 0.78, g)} beam={beam} />;
    head = ["No guessing", "on the floor."]; ha = cut1 + 0.1; hb = cutC;
  } else {
    const k2 = ramp(T, cutC, 0.6, EASE_APPEAR), lab = ramp(T, l2.a + 3.5, 1.6, EASE_MOVE);
    const view = lv({ cx: 1150, cy: 800, w: 1700 }, { cx: 1150, cy: 1050, w: 1500 }, glide((T - cutC) / (sc.end - cutC)));
    const lw = f.v ? 380 : 330, lh = lw * 1063 / 709;
    body = (
      <>
        {f.v ? <Phone x={120} y={600} w={420} shot={SHOTS.shipP} zoom={1.2 + 0.3 * glide((T - cutC) / (sc.end - cutC))} fy={lerp(0.45, 0.75, glide((T - cutC) / (sc.end - cutC)))} k={k2} />
          : <Browser x={780} y={150} w={860} ch={560} shot={SHOTS.shipD} view={view} k={k2} />}
        {/* the label comes out of the printer: revealed from its leading edge */}
        <div style={{ position: "absolute", left: f.v ? 600 : 1500, top: f.v ? 760 : 300, width: lw, height: lh, clipPath: `inset(0 0 ${(1 - lab) * 100}% 0)`, transform: `rotate(${3 - 2 * lab}deg) translateY(${(1 - lab) * -30}px)`, border: `2px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.ink}`, background: C.white }}>
          <ShotView shot={SHOTS.label} view={{ cx: 709 / 2, cy: 1063 / 2, w: 709 }} cw={lw - 4} ch={lh - 4} />
        </div>
        <div style={{ position: "absolute", left: f.v ? 0 : 110, right: f.v ? 0 : undefined, textAlign: f.v ? "center" : "left", top: f.v ? 430 : 330, opacity: ramp(T, cutC + 0.8, 0.4) }}>
          <Chip size={f.v ? 24 : 21}>Tested on a simulator · no live keys</Chip>
        </div>
      </>
    );
    head = ["Carrier labels,", "ready for go-live."]; ha = cutC + 0.1; hb = sc.end - 0.3;
  }
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={4} />
      {body}
      <Headline key={ha} f={f} T={T} a={ha} b={hb} lines={head} settled={settled} />
    </AbsoluteFill>
  );
};

const Handover: React.FC<SP> = ({ f, T, sc, settled }) => {
  const [l0, l1] = sc.lines;
  const cut = l1.a - 0.4, second = T >= cut;
  const k = ramp(T, second ? cut : sc.start + 0.1, 0.6, EASE_APPEAR);
  const t0 = second ? cut : sc.start, t1 = second ? sc.end : cut;
  const g = glide((T - t0) / (t1 - t0));
  let body: React.ReactNode;
  if (!second) body = f.v ? <Phone x={320} y={540} w={440} shot={SHOTS.handoverP} zoom={1.05 + 0.3 * g} fy={lerp(0.35, 0.5, g)} k={k} />
    : <Browser x={800} y={150} w={1000} ch={620} shot={SHOTS.handoverD} view={lv({ cx: 1450, cy: 900, w: 2300 }, { cx: 1400, cy: 1050, w: 2000 }, g)} k={k} />;
  else body = <Browser x={f.v ? 70 : 800} y={f.v ? 560 : 150} w={f.v ? 940 : 1000} ch={f.v ? 860 : 620} shot={SHOTS.invoiceD} view={lv({ cx: 1880, cy: f.v ? 700 : 620, w: f.v ? 1500 : 1600 }, { cx: 1880, cy: f.v ? 1100 : 900, w: f.v ? 1400 : 1500 }, g)} k={k} />;
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={5} />
      {body}
      <Headline key={second ? 1 : 0} f={f} T={T} a={t0 + 0.3} b={t1 - (second ? 0.3 : 0.05)} lines={second ? ["The invoice", "writes itself."] : ["Nothing leaves", "unscanned."]} settled={settled} />
    </AbsoluteFill>
  );
};

const CARDS = ["Client data separated at database level", "9,339 automated checks, 0 failures", "4 security reviews", "Buyer data deleted per marketplace rules (GDPR)"];
const Trust: React.FC<SP> = ({ f, T, sc, settled }) => {
  const u = T - sc.start;
  return (
    <AbsoluteFill>
      <Backdrop f={f} T={T} seed={6} />
      {CARDS.map((txt, i) => {
        const a = sc.start + 0.3 + i * 1.3, k = settled ? 1 : ramp(T, a, 0.55, EASE_APPEAR);
        const pos = f.v ? { x: 70, y: 220 + i * 290, w: 940, h: 250 } : { x: 110 + (i % 2) * 860, y: 120 + Math.floor(i / 2) * 330, w: 800, h: 270 };
        const words = txt.split(" ");
        const drift = Math.sin((u + i) / 2.2) * 4;
        return (
          <div key={i} style={{ position: "absolute", left: pos.x, top: pos.y, width: pos.w, height: pos.h, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 22, boxShadow: `10px 10px 0 ${C.ink}`, opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * 50 + drift}px)`, display: "flex", alignItems: "center", padding: "0 44px", boxSizing: "border-box", overflow: "hidden" }}>
            {i === 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: C.mint }} />}
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: f.v ? 56 : 50, lineHeight: 1.1, letterSpacing: "-0.03em", color: C.ink }}>
              {words.map((w, j) => { const kw = settled ? 1 : ramp(T, a + 0.1 + j * 0.075, 0.45, EASE_APPEAR); return <span key={j} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6, marginBottom: -6 }}><span style={{ display: "inline-block", transform: `translateY(${(1 - kw) * 105}%)` }}>{w}{" "}</span></span>; })}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Ask: React.FC<SP> = ({ f, T, sc, settled }) => {
  const k = glide((T - sc.start) / (sc.end - sc.start + 3));
  return (
    <AbsoluteFill>
      <Warehouse f={f} empty cam={{ x: lerp(26, 30, k), y: lerp(14, 16, k), z: 5, zoom: (f.v ? 1.45 : 1.25) + 0.25 * k }} ay={f.v ? 1100 : 600} ax={f.v ? 540 : 1180} />
      <Headline f={f} T={T} a={sc.start + 0.3} b={sc.end + 0.2} lines={["Built. Tested.", "Pilot next."]} settled={settled} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ f: F; T: number }> = ({ f, T }) => {
  const a = TL.endCard.start, up = ramp(T, a - 0.45, 0.5, EASE_MOVE);
  const lk = EASE_LOGO(clamp((T - a - 0.3) / 0.6)), edge = -20 + lk * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;   // diagonal fill, bottom-left to top-right
  const words = ["Fulfilment", "and", "warehouse", "software", "for", "small", "operators"];
  const drift = clamp((T - a) / 6);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.grey, transform: `translateY(${(1 - up) * 100}%)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: f.v ? 560 : 210, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${-14 * drift}px) scale(${1 + 0.03 * drift})` }}>
        <div style={{ width: f.v ? 420 : 360, WebkitMaskImage: mask, maskImage: mask, transform: "rotate(0deg)" }}><Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} /></div>
        <div style={{ marginTop: 40, maxWidth: f.v ? 900 : 1300, textAlign: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: f.v ? 58 : 56, lineHeight: 1.12, letterSpacing: "-0.03em", color: C.ink }}>
          {words.map((w, i) => { const k = ramp(T, a + 1.0 + i * 0.075, 0.45, EASE_APPEAR); return <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6, marginBottom: -6 }}><span style={{ display: "inline-block", transform: `translateY(${(1 - k) * 105}%)` }}>{w}{" "}</span></span>; })}
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: f.v ? "column" : "row", gap: f.v ? 18 : 28, alignItems: "center", opacity: ramp(T, a + 1.9, 0.4), transform: `translateY(${(1 - ramp(T, a + 1.9, 0.5, EASE_APPEAR)) * 16}px)` }}>
          <Chip size={f.v ? 30 : 28}>WhatsApp +353 85 158 4185</Chip>
          <Chip size={f.v ? 30 : 28}>TikTok @dockentra.ie</Chip>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- the film */
const RENDER: Record<string, React.FC<SP>> = { hook: Hook, problem: Problem, portal: Portal, stores: Stores, floor: Floor, handover: Handover, trust: Trust, ask: Ask };

export const WmsFilm: React.FC<{ T: number; f: F; settled?: boolean }> = ({ T, f, settled }) => {
  return (
    <AbsoluteFill style={{ background: C.grey }}>
      {SC.map((sc, i) => {
        if (T < sc.start - 0.5 || T > sc.end + 0.5) return null;
        // push transition: the next scene comes up from below while this one moves up and out
        const inK = i === 0 ? 1 : ramp(T, sc.start - 0.25, 0.55, EASE_MOVE);
        const outK = i === SC.length - 1 ? 0 : ramp(T, sc.end - 0.25, 0.55, EASE_MOVE);
        if (inK <= 0 || outK >= 1) return null;
        const Comp = RENDER[sc.name];
        return (
          <AbsoluteFill key={sc.name} style={{ transform: `translateY(${(1 - inK) * f.h * 0.35 - outK * f.h * 0.35}px)`, opacity: Math.min(inK, 1 - outK) * 0.6 + 0.4 }}>
            <Comp f={f} T={T} sc={sc} settled={settled} />
          </AbsoluteFill>
        );
      })}
      {T >= TL.endCard.start - 0.5 && <EndCard f={f} T={T} />}
      <Subs f={f} T={T} />
    </AbsoluteFill>
  );
};

const FH: F = { w: 1920, h: 1080, v: false }, FV: F = { w: 1080, h: 1920, v: true };
export const WmsH: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  const fr = useCurrentFrame(), { fps } = useVideoConfig();
  return <>{<WmsFilm T={fr / fps} f={FH} />}{withAudio && <Audio src={staticFile("wms-mix.wav")} />}</>;
};
export const WmsV: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  const fr = useCurrentFrame(), { fps } = useVideoConfig();
  return <>{<WmsFilm T={fr / fps} f={FV} />}{withAudio && <Audio src={staticFile("wms-mix.wav")} />}</>;
};

/* ---------------------------------------------------------------- stage 1: one still per scene */
const at = (n: string, k: number, d = 1.6) => { const s = scene(n); return Math.min(s.lines[k].a + d, s.end - 0.6); };
export const WMS_KEYS: { t: number; label: string }[] = [
  { t: scene("hook").lines[0].a + 1.2, label: "1 hook: the warehouse shelf" },
  { t: scene("hook").lines[2].a + 1.4, label: "1 hook: the logo" },
  { t: at("problem", 1), label: "2 problem: the spreadsheet" },
  { t: at("portal", 0, 4.8), label: "3a client portal: new order" },
  { t: at("portal", 0, 7.6), label: "3b client portal: shipments" },
  { t: at("stores", 0, 6), label: "4 connected stores (after the snap-zoom)" },
  { t: at("floor", 0, 1.8), label: "5a floor: picking" },
  { t: at("floor", 1, 0.4), label: "5b floor: scan to pack" },
  { t: at("floor", 2, 7), label: "5c floor: shipment card + label" },
  { t: at("handover", 0, 1.5), label: "6a courier handover" },
  { t: at("handover", 1, 2), label: "6b draft invoice" },
  { t: at("trust", 1, 2), label: "7 trust cards" },
  { t: at("ask", 1, 1), label: "8 where we are" },
  { t: TL.endCard.start + 3.2, label: "8 end card" },
];
export const WmsKey: React.FC<{ i: number; v: boolean }> = ({ i, v }) => <WmsFilm T={WMS_KEYS[i].t} f={v ? FV : FH} settled />;
