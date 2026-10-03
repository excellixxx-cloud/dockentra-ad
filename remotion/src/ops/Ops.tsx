import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { loadBrandFonts } from "../fonts";
import { Box, Cyl, iso, mix, poly } from "../warehouse/iso";
import { BIN, CAGE, CELLS, DAMAGED, JARS, P3, PACK, RECV, Room, RoomState, ShipLabel, SHELF, STAND } from "../warehouse/Room";
import {
  ANCHOR, Bar, BIN_HOOK, BIN_SHELF, Cam, CAM, Carton2, Check, Mono, PaddedMailer, Panel, Polybag, sc, Tag, WMailer,
} from "./Storyboard";
import TL from "./timeline.json";

loadBrandFonts();

/* ============================================================ timing */
export const FPS = 30;
export const CHAPTERS = TL.chapters;
type Ch = (typeof TL.chapters)[number];
const sine = (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(k));
const life = (T: number, a: number, b = 1e9, inD = 0.45, outD = 0.3) => ramp(T, a, inD, EASE_APPEAR) * (1 - ramp(T, b, outD, EASE_MOVE));
const arc = (a: P3, b: P3, k: number, h: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) + Math.sin(Math.PI * clamp(k)) * h });
const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), zoom: lerp(a.zoom, b.zoom, k) });
const hop = (T: number, land: number, amp = 0.5) => (T < land || T > land + 0.6 ? 0 : amp * Math.abs(Math.sin((Math.PI * (T - land)) / 0.18)) * Math.exp(-(T - land) * 8));

/* ============================================================ spec types */
type CardT = { kicker: string; title: string; body?: string };
type Shot = {
  at: number; cam: Cam; end?: Partial<Cam>; card?: CardT | null;
  overlay?: (cam: Cam, u: number, T: number) => React.ReactNode;
  world?: (u: number, T: number) => React.ReactNode;
};
type Ctx = { S: (k: number) => number; E: (k: number) => number; ch: Ch };
type Spec = {
  shots: (c: Ctx) => Shot[];
  room?: (T: number, c: Ctx) => Partial<RoomState>;
  world?: (T: number, c: Ctx) => React.ReactNode;
  overlay?: (cam: Cam, T: number, c: Ctx) => React.ReactNode;
  final?: (c: Ctx) => number;                  // time the final card starts
};

/* ============================================================ shared world bits */
const IN_CARTON: P3 = { x: RECV.x0 + 4.2, y: RECV.y0 + 4, z: RECV.top + 4.5 };
const tbl = (i: number): P3 => ({ x: JARS[i][0], y: JARS[i][1], z: RECV.top });
const EXTRA: P3 = { x: 26.6, y: 20.2, z: RECV.top };
const MISSING = 10;
const ARRIVED = JARS.map((_, i) => i).filter((i) => i !== MISSING);
const GOODJ = ARRIVED.filter((i) => !DAMAGED.includes(i));
const shelfSlot = (s: number): P3 => ({ x: SHELF.x0 + 1.2 + (s % 6) * 1.8, y: SHELF.y0 + 1.8 + Math.floor(s / 6) * 2.2, z: SHELF.levels[1] + 0.5 });
const BIN_DROP = (b: typeof BIN_HOOK): P3 => ({ x: b.x + BIN.w / 2, y: b.y + BIN.d / 2, z: b.z + 0.8 });
const M0: P3 = { x: PACK.x0 + 6.5, y: PACK.y1 - 4.5, z: PACK.top };
const M1: P3 = { x: PACK.x0 + 7.2, y: PACK.y0 + 1.7, z: PACK.top + 0.9 };
const LABEL_OUT: P3 = { x: PACK.x1 + 0.6, y: PACK.y0 + 1.6, z: PACK.top + 1.5 };
const LABEL_ON: P3 = { x: PACK.x0 + 10, y: PACK.y0 + 2.1, z: PACK.top + 1.63 };
const SLIP = { x: PACK.x1 - 4.6, y: PACK.y1 - 2.7, z: PACK.top };
const A2LABEL = { x: SHELF.x0 + 6, y: SHELF.y1, z: SHELF.levels[1] - 1.05 };

/** Paper order slip lying on the packing table: two fields that tick once they're filled. */
const OrderSlip: React.FC<{ k: number; items: number; addr: number; hiItem?: number }> = ({ k, items, addr, hiItem = 0 }) => {
  if (k <= 0.01) return null;
  const { x, y, z } = SLIP, zz = z + 0.08 + (1 - k) * 6;
  const q = (dx: number, dy: number): [number, number, number] => [x + dx, y + dy, zz];
  const tick = (cx: number, cy: number, v: number) => {
    const p = iso(x + cx, y + cy, zz + 0.01);
    return <g><circle cx={p.X} cy={p.Y} r={5} fill={v > 0.5 ? C.green : C.white} stroke={C.ink} strokeWidth={1.2} />{v > 0.5 && <path d={`M${p.X - 2.4} ${p.Y} l1.8 1.8 l3 -3.4`} stroke={C.white} strokeWidth={1.4} fill="none" />}</g>;
  };
  return (
    <g opacity={Math.min(1, k * 1.6)}>
      <polygon points={poly([q(0.3, 0.3), q(4.5, 0.3), q(4.5, 2.7), q(0.3, 2.7)].map(([a, b]) => [a, b, z + 0.01]))} fill={C.ink} opacity={0.1 * k} />
      <polygon points={poly([q(0, 0), q(4.2, 0), q(4.2, 2.4), q(0, 2.4)])} fill={C.white} stroke={C.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polyline points={poly([q(0.3, 0.45), q(1.6, 0.45)])} stroke={C.ink} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
      {[[0.95, items, hiItem], [1.65, addr, 0]].map(([dy, v, hi], i) => (
        <g key={i}>
          {hi > 0.01 && <polygon points={poly([q(0.2, dy - 0.3), q(3.4, dy - 0.3), q(3.4, dy + 0.3), q(0.2, dy + 0.3)])} fill={C.mint} opacity={0.45 * hi} />}
          <polyline points={poly([q(0.3, dy), q(0.3 + 2.8 * Math.max(0.15, v), dy)])} stroke={mix(C.grey, C.ink, 0.45)} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
          {tick(3.75, dy, v)}
        </g>
      ))}
    </g>
  );
};

/** Animated dashed path drawn from its start; ends in a dot. */
const Trail: React.FC<{ pts: { x: number; y: number }[]; k: number }> = ({ pts, k }) => {
  if (k <= 0.01) return null;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" strokeDasharray="10 9" pathLength={1000} style={{ strokeDasharray: `10 9`, clipPath: undefined }} opacity={0.9} strokeDashoffset={0} mask="url(#trailmask)" />
      <defs>
        <mask id="trailmask"><path d={d} fill="none" stroke="#fff" strokeWidth={10} pathLength={1} strokeDasharray={`${k} 1`} /></mask>
      </defs>
      {k > 0.98 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={8} fill={C.ink} />}
    </svg>
  );
};

/** Overlay element that pops in on the appear ease and drifts a touch. */
const Pop: React.FC<{ k: number; children: React.ReactNode; from?: "up" | "down" | "left" }> = ({ k, children, from = "up" }) => {
  if (k <= 0.005) return null;
  const off = (1 - k) * 30;
  const tr = from === "up" ? `translate(0, ${off}px)` : from === "down" ? `translate(0, ${-off}px)` : `translate(${-off}px, 0)`;
  return <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, k * 1.4), transform: `${tr} scale(${0.94 + 0.06 * k})`, transformOrigin: "75% 30%" }}>{children}</div>;
};
const Chip: React.FC<{ on: number; children: React.ReactNode }> = ({ on, children }) => (
  <div style={{ background: on > 0.5 ? C.ink : C.white, color: on > 0.5 ? C.white : C.ink, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "10px 16px", fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", boxShadow: `4px 4px 0 ${C.ink}`, transform: `translateY(${-6 * Math.sin(Math.PI * clamp(on * 2))}px)` }}>{children}</div>
);

/* ============================================================ the chapters */
const SPECS: Spec[] = [];

/* ---- 0. Cold open */
SPECS[0] = {
  shots: ({ S }) => [
    { at: 0, cam: { ...CAM.wide, zoom: 1.12 }, end: { zoom: 1.3, x: 30 }, card: { kicker: "IRELAND · TIKTOK SHOP", title: "Ship by Seller only.", body: "There is no Fulfilled by TikTok here." } },
    { at: S(2) - 0.3, cam: CAM.dispatch, end: { zoom: 2.15 }, card: { kicker: "SO", title: "You ship every order. Or a warehouse does." },
      overlay: (cam, u) => <Trail k={ramp(u, 0.8, 1.2, EASE_MOVE)} pts={[sc(cam, CAGE.x0 + 4, CAGE.y0 + 5, 1.5), sc(cam, 49, 1, 1.5)]} /> },
    { at: S(3) - 0.3, cam: { x: CAGE.x0 + 2.8, y: 4.6, z: 3.4, zoom: 4.6 }, end: { zoom: 5.0 }, card: { kicker: "DOCKENTRA · LIMERICK", title: "This is my warehouse.", body: "What happens to your stock, one step at a time." } },
    { at: S(4) - 0.2, cam: CAM.aisle, end: { zoom: 1.75, x: 25 }, card: undefined },
  ],
  room: (T, { S }) => ({ cageOut: 0.32 * ramp(T, S(2) + 0.6, 1.4, EASE_MOVE) }),
};

/* ---- 1. Before anything arrives */
const C1a: CardT = { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "We know what's coming.", body: "Which products, how many, and when — from you, before the van." };
SPECS[1] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: { ...CAM.wide, x: 34, y: 14 }, end: { zoom: 1.4, x: 30 }, card: C1a },
    { at: S(1) - 0.3, cam: CAM.recv, card: C1a,
      overlay: (cam, u, T) => { const p = sc(cam, 17, 21, 17.5); return (
        <Pop k={ramp(u, 0.2, 0.5, EASE_APPEAR)}>
          <Panel x={p.x - 210} y={p.y - 170} w={420}>
            <Mono>INBOUND NOTICE</Mono>
            <Bar label="Products" w={170 * ramp(T, S(1) + 1.2, 0.5, EASE_MOVE)} tick={T > S(1) + 1.7} />
            <Bar label="Quantity" w={120 * ramp(T, S(1) + 2.2, 0.5, EASE_MOVE)} tick={T > S(1) + 2.7} />
            <Bar label="Arriving" w={150 * ramp(T, S(1) + 3.1, 0.5, EASE_MOVE)} tick={T > S(1) + 3.6} />
          </Panel>
        </Pop>); } },
    { at: S(3) - 0.3, cam: { x: A2LABEL.x - 1, y: 4, z: 11, zoom: 4.2 }, end: { zoom: 4.5 },
      card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "Every product already has a place.", body: "The shelf is chosen before the van arrives." },
      world: (u) => <polygon points={poly([[SHELF.x0 + 0.8, SHELF.y0 + 1, SHELF.levels[1] + 0.55], [SHELF.x0 + 11.2, SHELF.y0 + 1, SHELF.levels[1] + 0.55], [SHELF.x0 + 11.2, SHELF.y1 - 0.8, SHELF.levels[1] + 0.55], [SHELF.x0 + 0.8, SHELF.y1 - 0.8, SHELF.levels[1] + 0.55]])} fill={C.mint} fillOpacity={0.18 + 0.12 * Math.sin(u * 4)} stroke={C.ink} strokeWidth={2.5} strokeDasharray="8 6" strokeDashoffset={-u * 30} vectorEffect="non-scaling-stroke" opacity={ramp(u, 0.2, 0.5)} />,
      overlay: (cam, u) => { const p = sc(cam, A2LABEL.x, A2LABEL.y, SHELF.levels[1] + 5.5); return <Pop k={ramp(u, 0.5, 0.45)}><Tag x={p.x} y={p.y}>RESERVED · A2</Tag></Pop>; } },
    { at: S(4) - 0.3, cam: CAM.recvClose, end: { zoom: 3.05 },
      card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "We know what a full delivery looks like.", body: "So we can tell when it isn't." },
      world: (u) => <g>{JARS.map(([x, y], i) => { const k = ramp(u, 0.2 + i * 0.06, 0.3); const p = iso(x, y, RECV.top + 0.02); return <ellipse key={i} cx={p.X} cy={p.Y} rx={9 * k} ry={5.2 * k} fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />; })}</g> },
    { at: S(5) - 0.3, cam: { x: 22, y: 21, z: 10.5, zoom: 4.4 }, end: { zoom: 4.7, x: 21.4 },
      card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "Some items need extra care.", body: "Glass, liquids, anything with a cap." },
      world: () => <g>{JARS.map(([x, y], i) => { const p = iso(x, y, RECV.top + 0.02); return <ellipse key={i} cx={p.X} cy={p.Y} rx={9} ry={5.2} fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />; })}</g>,
      overlay: (cam, u, T) => (<>
        {[["GLASS", 20, 19.5, S(5) + 1.6], ["LIQUIDS", 22, 21.7, S(5) + 2.3], ["CAP", 24, 23.9, S(5) + 3.0]].map(([l, x, y, at]) => {
          const p = sc(cam, x as number, y as number, RECV.top + 2.5);
          return <Pop key={l as string} k={ramp(T, at as number, 0.4)}><Tag x={p.x} y={p.y}>{l as string}</Tag></Pop>;
        })}
      </>) },
    { at: S(6) - 0.4, cam: CAM.recv, end: { zoom: 2.5 }, card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "Checked against your list.", body: "When the carton turns up, nobody is guessing." },
      overlay: (cam, u, T) => { const p = sc(cam, 12, 18, 21); return (
        <Pop k={ramp(T, S(7), 0.45)}>
          <Panel x={p.x - 330} y={p.y - 120} w={300}><Mono size={18}>INBOUND NOTICE</Mono><Bar label="Products" w={90} tick={T > S(7) + 0.6} /><Bar label="Quantity" w={70} tick={T > S(7) + 1.0} /><Bar label="Arriving" w={80} tick={T > S(7) + 1.4} /></Panel>
        </Pop>); } },
  ],
  room: (T, { S }) => {
    const k = ramp(T, S(6) + 0.2, 0.6, EASE_MOVE);
    return T >= S(6) + 0.2 ? { carton: { z: 9 * (1 - k * k) + hop(T, S(6) + 0.8, 0.6), flaps: 0, collapse: 0 } } : {};
  },
};

/* ---- 2. Receiving and the photo report */
const jarOut = (i: number, S: (k: number) => number) => S(2) + 0.2 + ARRIVED.indexOf(i) * 0.12;
const flash2 = (S: (k: number) => number) => S(3) + 1.3;
SPECS[2] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.recv, end: { zoom: 2.5 }, card: { kicker: "02 · RECEIVING", title: "The step I care about most." } },
    { at: S(1) - 0.3, cam: { ...CAM.recv, zoom: 2.6 }, end: { zoom: 2.75 }, card: { kicker: "02 · RECEIVING", title: "Opened on the receiving table." } },
    { at: S(2) - 0.3, cam: CAM.recvClose, card: { kicker: "02 · RECEIVING", title: "Everything laid out in rows." } },
    { at: S(3) - 0.2, cam: { x: 21, y: 21.6, z: 11, zoom: 3.9 }, end: { zoom: 4.2 }, card: { kicker: "02 · THE PHOTO REPORT", title: "One frame. The whole delivery." },
      overlay: (cam, u, T) => {
        const f = T >= flash2(S) && T < flash2(S) + 0.3 ? ramp(T, flash2(S), 0.04) * (1 - ramp(T, flash2(S) + 0.22, 0.08)) : 0;
        if (f <= 0) return null;
        const lens = sc(cam, STAND.head.x, STAND.head.y, STAND.lensZ), lit = sc(cam, STAND.head.x, STAND.head.y, RECV.top + 0.1);
        const rx = 1.2247 * 4.3 * 12 * cam.zoom, ry = 0.7071 * 4.3 * 12 * cam.zoom;
        return (<svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: f }}>
          <polygon points={`${lens.x},${lens.y + 6} ${lit.x - rx},${lit.y} ${lit.x + rx},${lit.y}`} fill={C.white} fillOpacity={0.6} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
          <ellipse cx={lit.x} cy={lit.y} rx={rx} ry={ry} fill={C.white} fillOpacity={0.5} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
        </svg>);
      } },
    { at: S(4) - 0.3, cam: CAM.recv, end: { zoom: 2.2, x: 18 }, card: { kicker: "02 · THE PHOTO REPORT", title: "Photos go to you the day it's received." },
      overlay: (cam, u) => { const lens = sc(cam, STAND.head.x, STAND.head.y, STAND.lensZ + 1); const k = ramp(u, 0.3, 0.9, EASE_MOVE); return (<>
        <Trail k={k} pts={[lens, { x: lens.x + 160, y: lens.y - 180 }, { x: 1600, y: 250 }]} />
        <Pop k={ramp(u, 1.0, 0.5)}><Panel x={1600} y={110} w={270}><Mono size={18}>TO · YOUR BRAND</Mono>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 10, background: C.grey, borderRadius: 8 }}>
            {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ width: 30, height: 30, borderRadius: 15, background: i === MISSING ? "transparent" : C.white, border: `2px ${i === MISSING ? "dashed" : "solid"} ${C.ink}` }} />)}
          </div>
          <div style={{ marginTop: 10, fontFamily: FONT.body, fontSize: 20, color: C.ink }}>Delivery photo report</div></Panel></Pop>
      </>); } },
    { at: S(5) - 0.3, cam: { x: 20, y: 20.5, z: 11, zoom: 4.3 }, end: { zoom: 4.6 }, card: { kicker: "02 · THE PHOTO REPORT", title: "Crushed, short or wrong:", body: "you see it that day." },
      overlay: (cam, u) => { const d = DAMAGED.map((i) => sc(cam, JARS[i][0], JARS[i][1], RECV.top + 1.8)); const k = ramp(u, 0.6, 0.4); return (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>{d.map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx={13 * cam.zoom * k} ry={7.5 * cam.zoom * k} fill="none" stroke={C.mint} strokeWidth={5} />)}</svg>); } },
    { at: S(6) - 0.3, cam: { ...CAM.wide, x: 24, y: 20 }, end: { zoom: 1.45 }, card: { kicker: "02 · THE PHOTO REPORT", title: "You find out before your customer does." } },
    { at: S(7) - 0.3, cam: CAM.pack, end: { zoom: 2.5 }, card: { kicker: "02 · IF A DELIVERY IS DISPUTED", title: "TikTok Shop asks for two things." },
      overlay: (cam, u, T) => (
        <Pop k={ramp(T, S(8), 0.45)}><Panel x={1330} y={140} w={500}>
          <Mono>TIKTOK SHOP ASKS FOR</Mono>
          <div style={{ opacity: ramp(T, S(8) + 3.6, 0.3) * 0.7 + 0.3 }}><Check>Condition at the time of packing</Check></div>
          <div style={{ opacity: ramp(T, S(8) + 6.4, 0.3) * 0.7 + 0.3 }}><Check>Proof of handover to the carrier</Check></div>
        </Panel></Pop>) },
    { at: S(9) - 0.3, cam: { x: LABEL_ON.x + 1, y: LABEL_ON.y + 1.4, z: LABEL_ON.z, zoom: 5.2 }, end: { zoom: 5.6 }, card: { kicker: "02 · IF A DELIVERY IS DISPUTED", title: "We collect exactly what's on that list.", body: "For every order." } },
    { at: S(10) - 0.3, cam: CAM.pack, end: { zoom: 2.2 }, card: { kicker: "02 · IF A DELIVERY IS DISPUTED", title: "Whether it counts is the platform's decision.", body: "Our job is to make sure the evidence exists." } },
  ],
  room: (T, { S }) => {
    const jars: P3[] = [];
    for (const i of ARRIVED) { const a = jarOut(i, S); if (T >= a) jars.push(arc(IN_CARTON, tbl(i), EASE_MOVE(clamp((T - a) / 0.45)), 3)); }
    const ae = S(2) + 0.2 + ARRIVED.length * 0.12; if (T >= ae) jars.push(arc(IN_CARTON, EXTRA, EASE_MOVE(clamp((T - ae) / 0.45)), 3));
    const collapse = ramp(T, S(4) - 0.2, 0.5, EASE_MOVE);
    return {
      jars,
      carton: collapse < 1 ? { z: 0, flaps: ramp(T, S(1) + 1.4, 0.5, EASE_MOVE), collapse } : null,
      mailer: T > S(7) - 0.4 ? { ...M1, taped: 1, label: 1, inCage: false } : null,
    };
  },
};

/* ---- 3. When something is wrong */
const setAside = (d: number, S: (k: number) => number) => S(4) + 0.7 + d * 0.3;
SPECS[3] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.recv, end: { zoom: 2.55 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Three things can go wrong." } },
    { at: S(1) - 0.25, cam: { x: JARS[DAMAGED[0]][0], y: JARS[DAMAGED[0]][1], z: RECV.top + 1, zoom: 5.0 }, end: { zoom: 5.3 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Damaged." },
      overlay: (cam, u) => { const p = sc(cam, JARS[DAMAGED[0]][0], JARS[DAMAGED[0]][1], RECV.top + 1.8); const k = ramp(u, 0.25, 0.35); return (<>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}><ellipse cx={p.x} cy={p.y} rx={13 * cam.zoom * k} ry={7.5 * cam.zoom * k} fill="none" stroke={C.mint} strokeWidth={6} /></svg>
        <Pop k={k}><Tag x={p.x} y={p.y - 70} fill={C.mint}>DAMAGED</Tag></Pop></>); } },
    { at: S(2) - 0.25, cam: { x: JARS[MISSING][0], y: JARS[MISSING][1], z: RECV.top + 0.8, zoom: 5.0 }, end: { zoom: 5.3 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Missing." },
      overlay: (cam, u) => { const p = sc(cam, JARS[MISSING][0], JARS[MISSING][1], RECV.top + 0.05); const k = ramp(u, 0.2, 0.35); return (<>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}><ellipse cx={p.x} cy={p.y} rx={10 * cam.zoom * k} ry={6 * cam.zoom * k} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="8 7" strokeDashoffset={-u * 30} /></svg>
        <Pop k={k}><Tag x={p.x} y={p.y + 110}>MISSING</Tag></Pop></>); } },
    { at: S(3) - 0.25, cam: { x: EXTRA.x - 0.5, y: EXTRA.y, z: RECV.top + 1, zoom: 4.6 }, end: { zoom: 4.9 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Extra." },
      overlay: (cam, u) => { const p = sc(cam, EXTRA.x, EXTRA.y, RECV.top + 2.4); return <Pop k={ramp(u, 0.3, 0.35)}><Tag x={p.x} y={p.y}>EXTRA · NOT ON THE LIST</Tag></Pop>; } },
    { at: S(4) - 0.3, cam: { ...CAM.recv, x: 20 }, end: { zoom: 2.5 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Damaged goes on hold, not on a shelf." } },
    { at: S(5) + 0.4, cam: { x: BIN_HOOK.x + 1.6, y: BIN_HOOK.y + 1.5, z: BIN_HOOK.z + 2, zoom: 4.6 }, end: { zoom: 5.0 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "One box, marked on hold.", body: "So it can't be picked by mistake." },
      overlay: (cam, u) => { const p = sc(cam, BIN_HOOK.x + BIN.w / 2, BIN_HOOK.y + BIN.d / 2, BIN_HOOK.z + BIN.h + 0.6); return <Pop k={ramp(u, 0.3, 0.4)}><Tag x={p.x} y={p.y - 20} fill={C.mint}>DAMAGED · ON HOLD</Tag></Pop>; } },
    { at: S(6) - 0.3, cam: CAM.recv, end: { zoom: 2.2 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Missing and extra are counted.", body: "Against what you told us to expect." },
      overlay: (cam, u, T) => (
        <Pop k={ramp(u, 0.4, 0.45)}><Panel x={1340} y={120} w={460}>
          <Mono>DELIVERY · AGAINST YOUR NOTICE</Mono>
          <Bar label="Expected" w={220} />
          <Bar label="Received" w={220 * (11 / 12) * ramp(T, S(6) + 1.2, 0.7, EASE_MOVE)} />
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <div style={{ opacity: ramp(T, S(6) + 2.2, 0.3) }}><Tag x={0} y={0}>MISSING</Tag></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 14, opacity: ramp(T, S(6) + 2.2, 0.3) }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 20, border: `2px dashed ${C.ink}`, borderRadius: 8, padding: "4px 10px" }}>MISSING</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 20, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "4px 10px" }}>EXTRA</div>
          </div>
        </Panel></Pop>) },
    { at: S(7) - 0.3, cam: { ...CAM.recv, x: 19, zoom: 2.0 }, end: { zoom: 2.15 }, card: { kicker: "03 · YOUR STOCK", title: "Your decision, not ours.", body: "Send it back to your supplier, write it off, or sell it as seconds — you decide." },
      overlay: (cam, u, T) => (
        <Pop k={ramp(u, 0.3, 0.45)}><Panel x={1330} y={110} w={470}>
          <Mono>YOUR DECISION</Mono>
          {[["Send back to your supplier", S(7) + 1.8], ["Write off", S(7) + 3.0], ["Sell as seconds", S(7) + 3.9]].map(([l, a]) => (
            <div key={l as string} style={{ marginTop: 12, fontFamily: FONT.body, fontSize: 26, color: C.ink, opacity: 0.25 + 0.75 * ramp(T, a as number, 0.3), transform: `translateX(${(1 - ramp(T, a as number, 0.3)) * 16}px)` }}>· {l as string}</div>
          ))}
        </Panel></Pop>) },
    { at: S(9) - 0.3, cam: { x: BIN_HOOK.x + 0.5, y: BIN_HOOK.y + 1, z: BIN_HOOK.z + 2, zoom: 3.2 }, end: { zoom: 3.4 }, card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "We record it and keep it apart.", body: "Until you've decided." } },
  ],
  room: (T, { S }) => {
    const jars: P3[] = ARRIVED.filter((i) => !DAMAGED.includes(i)).map(tbl);
    DAMAGED.forEach((i, d) => { const a = setAside(d, S); if (T < a) jars.push(tbl(i)); else if (T < a + 0.6) jars.push(arc(tbl(i), BIN_DROP(BIN_HOOK), EASE_MOVE((T - a) / 0.6), 2.5)); });
    jars.push(EXTRA);
    return { jars };
  },
};

/* ---- 4. Putaway and the stock record */
const toShelf = (s: number, S: (k: number) => number) => S(0) + 0.4 + s * 0.12;
SPECS[4] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: { ...CAM.recv, x: 16, y: 18, zoom: 2.0 }, end: { zoom: 1.9 }, card: { kicker: "04 · PUTAWAY", title: "Good stock goes to the shelves." } },
    { at: S(1) - 0.4, cam: CAM.shelf, end: { zoom: 2.05 }, card: { kicker: "04 · PUTAWAY", title: "Every product gets a cell and a count.", body: "A1 to A6 in this bay." } },
    { at: S(2) - 0.3, cam: { x: 9, y: 4, z: 11, zoom: 2.9 }, end: { zoom: 3.05 }, card: { kicker: "04 · THE STOCK RECORD", title: "Shelf and record have to agree." },
      overlay: (cam, u) => (<Pop k={ramp(u, 0.6, 0.45)}><Panel x={1380} y={150} w={420}><Mono>CELL A2</Mono><Bar label="On shelf" w={170} /><Bar label="In record" w={170} /></Panel></Pop>) },
    { at: S(3) - 0.3, cam: { x: 9, y: 4, z: 11, zoom: 2.6 }, end: { zoom: 2.7 }, card: { kicker: "04 · THE STOCK RECORD", title: "Not by trust. By counting." } },
    { at: S(5) - 0.3, cam: { x: 8.5, y: 3.8, z: 10.5, zoom: 4.8 }, end: { zoom: 5.1, x: 9.3 }, card: { kicker: "04 · THE STOCK RECORD", title: "Recount. Compare." },
      overlay: (cam, u, T) => (<Pop k={ramp(u, 0.3, 0.45)}><Panel x={1380} y={110} w={420}><Mono>CELL A2 · RECOUNT</Mono>
        <Bar label="On shelf" w={170 * ramp(T, S(5) + 0.6, 2.2, EASE_MOVE)} tick={T > S(5) + 2.9} /><Bar label="In record" w={170} tick={T > S(5) + 3.2} /></Panel></Pop>) },
    { at: S(6) - 0.3, cam: CAM.shelf, end: { zoom: 2.0 }, card: { kicker: "04 · THE STOCK RECORD", title: "If they don't match, we find out why.", body: "Before it turns into an order we can't fill." } },
    { at: S(7) - 0.3, cam: { x: A2LABEL.x, y: A2LABEL.y, z: A2LABEL.z + 0.6, zoom: 6.0 }, end: { zoom: 6.4 }, card: { kicker: "04 · THE STOCK RECORD", title: "A stock figure is only useful if someone checked it." } },
  ],
  room: (T, { S }) => {
    const jars: P3[] = [];
    GOODJ.forEach((i, s) => {
      const a = toShelf(s, S); let p = T < a ? tbl(i) : arc(tbl(i), shelfSlot(s), EASE_MOVE(clamp((T - a) / 0.75)), 8);
      // recount: each jar gives a small hop as it is counted
      p = { ...p, z: p.z + hop(T, S(5) + 0.6 + s * 0.24, 0.45) };
      jars.push(p);
    });
    jars.push(EXTRA);
    return { jars, highlightCells: T > S(1), recvFade: 1 - ramp(T, S(1) - 0.2, 0.5, EASE_MOVE), holdBin: T > S(0) ? BIN_SHELF : BIN_HOOK };
  },
};
const ShelfJars = (T: number): P3[] => GOODJ.map((_, s) => shelfSlot(s));

/* ---- 5. The order arrives */
SPECS[5] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: { ...CAM.wide, x: 34, y: 20 }, end: { zoom: 1.4 }, card: { kicker: "05 · THE ORDER ARRIVES", title: "A customer buys.", body: "On TikTok Shop or on your Shopify store." },
      overlay: (cam, u, T) => (<>
        <Pop k={ramp(T, S(0) + 1.2, 0.45)}><Panel x={1380} y={70} w={240}><Mono size={18}>TIKTOK SHOP</Mono><Bar label="Order" w={60} /></Panel></Pop>
        <Pop k={ramp(T, S(0) + 2.4, 0.45)}><Panel x={1650} y={150} w={220}><Mono size={18}>SHOPIFY</Mono><Bar label="Order" w={50} /></Panel></Pop>
      </>) },
    { at: S(1) - 0.3, cam: CAM.pack, end: { zoom: 2.5 }, card: { kicker: "05 · THE ORDER ARRIVES", title: "The order has to reach the warehouse.", body: "Items and address together, before anything is picked." } },
    { at: S(1) + 2.6, cam: { x: SLIP.x + 2.1, y: SLIP.y + 1.2, z: SLIP.z, zoom: 6.4 }, end: { zoom: 6.8 }, card: undefined },
    { at: S(2) - 0.3, cam: CAM.pack, end: { zoom: 2.2 }, card: { kicker: "05 · THE PLATFORM'S CLOCK", title: "The clock has already started." } },
    { at: S(3) - 0.3, cam: { ...CAM.pack, zoom: 2.0 }, end: { zoom: 2.1 }, card: { kicker: "05 · THE PLATFORM'S CLOCK", title: "48 hours to ship.", body: "TikTok Shop's rule for sellers, not a promise of ours." } },
  ],
  world: (T, { S }) => <OrderSlip k={ramp(T, S(1) + 0.3, 0.7, EASE_MOVE)} items={ramp(T, S(1) + 3.2, 0.5)} addr={ramp(T, S(1) + 4.4, 0.5)} />,
  overlay: (cam, T, { S, ch }) => {
    const k = ramp(T, S(2), 0.5);
    if (k <= 0) return null;
    const sweep = 0.08 + 0.55 * ramp(T, S(2) + 0.3, ch.dur - S(2), EASE_MOVE);   // the hand keeps moving through the chapter
    const a = 2 * Math.PI * sweep, big = T > S(3) - 0.3 ? 1.25 : 1;
    const cx = 1690, cy = 260, r = 110 * big;
    return (
      <Pop k={k}><svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <path d={`M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${sweep > 0.5 ? 1 : 0} 1 ${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)} Z`} fill={C.green} opacity={0.85} />
        <circle cx={cx} cy={cy} r={r * 0.64} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <text x={cx} y={cy - 2} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={44 * big} fill={C.ink}>48 h</text>
        <text x={cx} y={cy + 32 * big} textAnchor="middle" fontFamily={FONT.mono} fontSize={15 * big} fill={C.ink} opacity={0.7}>PLATFORM RULE</text>
      </svg></Pop>);
  },
  room: () => ({ holdBin: BIN_SHELF, jars: ShelfJars(0), highlightCells: false }),
};

/* ---- 6. Picking */
const PICK = GOODJ.length - 1;
SPECS[6] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.pack, end: { zoom: 2.5 }, card: { kicker: "06 · PICKING", title: "By location, not by memory." } },
    { at: S(1) - 0.3, cam: { x: SLIP.x + 2.1, y: SLIP.y + 1.2, z: SLIP.z, zoom: 6.0 }, end: { zoom: 6.3 }, card: { kicker: "06 · PICKING", title: "The order says which product." } },
    { at: S(2) - 0.3, cam: { x: A2LABEL.x, y: A2LABEL.y, z: A2LABEL.z + 1.5, zoom: 4.6 }, end: { zoom: 4.9 }, card: { kicker: "06 · PICKING", title: "The record says which cell." },
      overlay: (cam, u) => (<Pop k={ramp(u, 0.3, 0.4)}><Panel x={1400} y={120} w={380}><Mono>RECORD</Mono><Bar label="Product" w={120} /><div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 30, fontWeight: 500 }}>→ CELL A2</div></Panel></Pop>) },
    { at: S(3) - 0.3, cam: CAM.aisle, end: { zoom: 1.7 }, card: { kicker: "06 · PICKING", title: "Go to that address. Take it from that cell." },
      overlay: (cam, u) => <Trail k={ramp(u, 0.3, 1.4, EASE_MOVE)} pts={[sc(cam, PACK.x0 + 3, PACK.y0 - 1, 0.2), sc(cam, 22, 12, 0.2), sc(cam, SHELF.x0 + 6, SHELF.y1 + 2, 0.2)]} /> },
    { at: S(4) - 0.3, cam: { x: 8, y: 4, z: 13, zoom: 3.0 }, end: { zoom: 3.2 }, card: { kicker: "06 · PICKING", title: "It doesn't break when two products look the same." },
      overlay: (cam, u, T) => { const a = sc(cam, shelfSlot(2).x, shelfSlot(2).y, shelfSlot(2).z + 2.6), b = sc(cam, SHELF.x0 + 3, SHELF.y0 + 2.8, SHELF.levels[2] + 2.9); return (<>
        <Pop k={ramp(T, S(5) + 2.4, 0.4)}><Tag x={a.x} y={a.y}>A2</Tag></Pop><Pop k={ramp(T, S(5) + 2.9, 0.4)}><Tag x={b.x} y={b.y}>A3</Tag></Pop></>); } },
    { at: S(6) - 0.3, cam: { x: A2LABEL.x, y: A2LABEL.y, z: A2LABEL.z + 0.6, zoom: 6.0 }, end: { zoom: 6.5 }, card: { kicker: "06 · PICKING", title: "An address can be checked.", body: "Memory can't." } },
  ],
  world: (T, { S }) => <g>
    <OrderSlip k={1} items={1} addr={1} hiItem={ramp(T, S(1) + 0.3, 0.4) * (1 - ramp(T, S(2), 0.3))} />
    {/* look-alike product in A3, one cell up */}
    {[0, 1, 2].map((k) => <Cyl key={k} x={SHELF.x0 + 1.4 + k * 1.8} y={SHELF.y0 + 2.8} z={SHELF.levels[2] + 0.5} r={0.75} h={1.8} color={C.white} topColor={C.grey} />)}
  </g>,
  room: (T, { S }) => {
    const jars = ShelfJars(T).map((p, s) => {
      if (s !== PICK) return p;
      const a = S(3) + 1.8;   // leaves its cell and rides to the packing table
      if (T < a) return p;
      const top: P3 = { x: p.x, y: p.y + 4, z: p.z + 1.5 };
      const dest: P3 = { x: PACK.x0 + 13.5, y: PACK.y1 - 2.2, z: PACK.top };
      return T < a + 0.4 ? arc(p, top, EASE_MOVE((T - a) / 0.4), 0.4) : arc(top, dest, EASE_MOVE(clamp((T - a - 0.4) / 1.6)), 6);
    });
    return { holdBin: BIN_SHELF, jars, highlightCells: T > S(2) - 0.3 && T < S(4) };
  },
};

/* ---- 7. Packing */
const CAT: CardT = { kicker: "07 · PACKING", title: "Packaging by category, not by habit." };
SPECS[7] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.pack, end: { zoom: 2.5 }, card: CAT },
    { at: S(1) - 0.3, cam: { ...CAM.pack, zoom: 2.2 }, end: { zoom: 2.3 }, card: CAT,
      overlay: (cam, u, T) => (
        <div style={{ position: "absolute", left: 1010, top: 110, display: "flex", gap: 22 }}>
          {([["POLYBAG", "Soft goods that can't break", "bag", S(1)], ["PADDED MAILER", "Small things that need cushioning", "mailer", S(2)], ["BOX", "Glass, liquids, a shape to protect", "box", S(3)]] as const).map(([l, d, k, a]) => {
            const kk = ramp(T, a, 0.45);
            return (
              <div key={k} style={{ width: 270, opacity: Math.min(1, kk * 1.4), transform: `translateY(${(1 - kk) * 30}px)`, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${C.ink}`, padding: "16px 18px", boxSizing: "border-box" }}>
                <svg width={232} height={150} viewBox="-116 -110 232 150"><g transform={`scale(1.7) translate(0 ${-4 * Math.sin(Math.PI * clamp((T - a) * 2))})`}>
                  {k === "bag" && <g><Polybag x={-2.3} y={-1.7} z={0} /></g>}
                  {k === "mailer" && <g transform="translate(0 6)"><PaddedMailer x={-2.3} y={-1.7} z={0} /></g>}
                  {k === "box" && <g transform="translate(0 14)"><Carton2 x={-2.6} y={-2} z={0} w={5.2} d={4} h={3.6} /></g>}
                </g></svg>
                <Mono size={18} op={0.9}>{l}</Mono>
                <div style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 20, lineHeight: 1.3, color: C.ink, opacity: 0.85 }}>{d}</div>
              </div>);
          })}
        </div>) },
    { at: S(4) - 0.3, cam: CAM.pack, end: { zoom: 2.6 }, card: { kicker: "07 · PACKING", title: "Size matters as much as protection." } },
    { at: S(5) - 0.3, cam: { x: PACK.x0 + 9.6, y: PACK.y0 + 3.5, z: PACK.top + 2.4, zoom: 4.1 }, end: { zoom: 4.35 }, card: { kicker: "07 · DIMENSIONAL WEIGHT", title: "L × W × H ÷ 5000" },
      overlay: (cam, u, T) => <Dims cam={cam} T={T} t0={S(5)} /> },
    { at: S(6) - 0.3, cam: { x: PACK.x0 + 9.6, y: PACK.y0 + 4.5, z: PACK.top + 1.2, zoom: 5.0 }, end: { zoom: 5.3 }, card: { kicker: "07 · DIMENSIONAL WEIGHT", title: "The courier bills the larger.", body: "That figure, or the actual weight." },
      overlay: (cam, u, T) => (<Pop k={ramp(u, 0.3, 0.45)}><Panel x={1380} y={110} w={430}>
        <Mono>BILLED WEIGHT</Mono>
        <Bar label="Volumetric" w={200 * ramp(T, S(6) + 0.6, 0.6, EASE_MOVE)} tick={T > S(6) + 2.4} />
        <Bar label="Actual" w={70 * ramp(T, S(6) + 1.2, 0.5, EASE_MOVE)} />
      </Panel></Pop>) },
    { at: S(7) - 0.3, cam: { x: PACK.x0 + 9.6, y: PACK.y0 + 3.5, z: PACK.top + 2, zoom: 3.6 }, end: { zoom: 3.8 }, card: { kicker: "07 · DIMENSIONAL WEIGHT", title: "A light item in a big box is paid for as heavy." } },
    { at: S(8) - 0.3, cam: { ...CAM.pack, zoom: 2.1 }, end: { zoom: 2.2 }, card: { kicker: "07 · COSMETICS", title: "Cap, glass, storage.", body: "There's a separate video on exactly that." },
      overlay: (cam, u, T) => (
        <div style={{ position: "absolute", left: 1120, top: 120, display: "flex", gap: 26 }}>
          {([["TAPE THE CAP", "cap", S(8) + 2.2], ["GLASS CAN'T MOVE", "glass", S(8) + 3.8], ["KEEP FROM HEAT", "heat", S(8) + 5.6]] as const).map(([l, k, a]) => {
            const kk = ramp(T, a, 0.45), heat = ramp(T, a + 0.3, 1.2, EASE_MOVE);
            return (
              <div key={k} style={{ width: 230, opacity: Math.min(1, kk * 1.4), transform: `translateY(${(1 - kk) * 30}px) scale(${k === "heat" ? 1 + 0.12 * ramp(T, a + 0.2, 0.5) : 1})`, transformOrigin: "50% 0%", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${C.ink}`, padding: "18px 22px", boxSizing: "border-box" }}>
                <svg width={186} height={130} viewBox="0 0 176 130">
                  {k === "cap" && <g><rect x={58} y={40} width={60} height={80} rx={10} fill={C.white} stroke={C.ink} strokeWidth={3} /><rect x={66} y={16} width={44} height={26} rx={5} fill={C.mint} stroke={C.ink} strokeWidth={3} /><rect x={62} y={34} width={52 * ramp(T, a + 0.3, 0.6)} height={12} fill={mix(C.grey, C.ink, 0.3)} stroke={C.ink} strokeWidth={2} /></g>}
                  {k === "glass" && <g transform={`translate(${2 * Math.sin(T * 9) * (1 - ramp(T, a + 0.9, 0.3))} 0)`}><rect x={46} y={46} width={84} height={70} rx={12} fill={mix(C.green, C.white, 0.6)} stroke={C.ink} strokeWidth={3} /><rect x={42} y={30} width={92} height={20} rx={5} fill={C.grey} stroke={C.ink} strokeWidth={3} /><path d="M20 60 h14 M142 60 h14 M20 90 h14 M142 90 h14" stroke={C.ink} strokeWidth={3} /></g>}
                  {k === "heat" && <g><rect x={78} y={14} width={20} height={80} rx={10} fill={C.white} stroke={C.ink} strokeWidth={3} /><circle cx={88} cy={104} r={18} fill={C.green} stroke={C.ink} strokeWidth={3} /><rect x={84} y={94 - 60 * (0.2 + 0.6 * heat)} width={8} height={60 * (0.2 + 0.6 * heat) + 10} fill={C.green} /><path d={`M118 ${70 - 10 * heat} q6 -8 0 -16 q-6 -8 0 -16`} stroke={C.ink} strokeWidth={2.5} fill="none" opacity={heat} /></g>}
                </svg>
                <Mono size={17} op={0.85}>{l}</Mono>
              </div>);
          })}
        </div>) },
  ],
  world: (T, { S }) => {
    const k = ramp(T, S(4) + 0.2, 0.5, EASE_MOVE);
    if (T < S(4) + 0.2) return null;
    const lift = (1 - k) * 7 + hop(T, S(4) + 0.7, 0.5);
    const open = ramp(T, S(7) + 0.4, 0.5, EASE_MOVE);
    return <g>
      <Carton2 x={PACK.x0 + 6.4} y={PACK.y0 + 0.9} z={PACK.top + 0.9 + lift} w={6.6} d={5.2} h={4.4} />
      {open > 0.01 && <g>
        <polygon points={poly([[PACK.x0 + 6.8, PACK.y0 + 1.3, PACK.top + 5.31], [PACK.x0 + 12.6, PACK.y0 + 1.3, PACK.top + 5.31], [PACK.x0 + 12.6, PACK.y0 + 5.7, PACK.top + 5.31], [PACK.x0 + 6.8, PACK.y0 + 5.7, PACK.top + 5.31]])} fill={mix(C.green, C.ink, 0.45)} opacity={open} />
        <Box x={PACK.x0 + 9} y={PACK.y0 + 3} z={PACK.top + 5.31 - 0.8 + 0.8 * open} w={1.4} d={1.2} h={0.8} color={C.white} opacity={open} />
      </g>}
    </g>;
  },
  room: () => ({ holdBin: BIN_SHELF, jars: ShelfJars(0).slice(0, PICK) }),
};
/** Dimension arrows for the box on the scale, drawn on "length", "width", "height". */
const Dims: React.FC<{ cam: Cam; T: number; t0: number }> = ({ cam, T, t0 }) => {
  const x0 = PACK.x0 + 6.4, y0 = PACK.y0 + 0.9, z0 = PACK.top + 0.9;
  const L = [sc(cam, x0, y0 + 6.2, z0), sc(cam, x0 + 6.6, y0 + 6.2, z0)], W = [sc(cam, x0 + 7.6, y0, z0), sc(cam, x0 + 7.6, y0 + 5.2, z0)], H = [sc(cam, x0 + 6.6, y0 + 6, z0), sc(cam, x0 + 6.6, y0 + 6, z0 + 4.4)];
  const ar = ([p, q]: { x: number; y: number }[], l: string, a: number) => {
    const k = ramp(T, a, 0.4, EASE_MOVE); if (k <= 0) return null;
    const qq = { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) };
    return <g key={l}><line x1={p.x} y1={p.y} x2={qq.x} y2={qq.y} stroke={C.ink} strokeWidth={3} markerEnd="url(#ah2)" />
      <rect x={(p.x + q.x) / 2 - 24} y={(p.y + q.y) / 2 - 22} width={48} height={44} rx={8} fill={C.white} stroke={C.ink} strokeWidth={2} opacity={k} />
      <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 + 10} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={28} fill={C.ink} opacity={k}>{l}</text></g>;
  };
  return <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
    <defs><marker id="ah2" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={C.ink} /></marker></defs>
    {ar(L, "L", t0 + 2.1)}{ar(W, "W", t0 + 3.0)}{ar(H, "H", t0 + 3.9)}
  </svg>;
};

/* ---- 8. Label and dispatch */
SPECS[8] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.pack, end: { zoom: 2.5 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "The parcel goes on the scale." } },
    { at: S(0) + 1.0, cam: { x: PACK.x0 + 9.7, y: PACK.y0 + 5.8, z: PACK.top + 0.5, zoom: 6.2 }, end: { zoom: 6.6 }, card: undefined,
      overlay: (cam, u) => { const p = sc(cam, PACK.x0 + 9.7, PACK.y0 + 5.8, PACK.top + 0.45); const settle = ramp(u, 0.2, 0.8); return (
        <div style={{ position: "absolute", left: p.x - 150, top: p.y - 210, width: 300, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: C.ink, color: C.white, borderRadius: 10, padding: "12px 22px", fontFamily: FONT.mono, fontSize: 40, letterSpacing: "0.15em", opacity: Math.min(1, settle * 2) }}>{settle < 1 ? ["- -.- -", "--.- -", "- -.--"][Math.floor(u * 10) % 3] : "--.--"} KG</div>
          <div style={{ marginTop: 10 }}><Tag x={150} y={0}>WEIGHED</Tag></div>
        </div>); } },
    { at: S(1) - 0.3, cam: CAM.packClose, end: { zoom: 3.2 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "The weight and the order make the label." } },
    { at: S(1) + 2.6, cam: { x: LABEL_ON.x + 1, y: LABEL_ON.y + 1.4, z: LABEL_ON.z, zoom: 5.6 }, end: { zoom: 6.0 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "The label goes on the parcel." } },
    { at: S(2) - 0.3, cam: CAM.dispatch, end: { zoom: 2.15, y: 6 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "Into the cage, handed to the carrier." } },
    { at: S(3) - 0.3, cam: { x: CAGE.x0 + 3, y: 3.2, z: CAGE.h / 2 + 2, zoom: 4.2 }, end: { zoom: 4.5 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "The tracking number goes onto the order.", body: "So your customer can follow it." },
      overlay: (cam, u, T) => (<Pop k={ramp(u, 0.6, 0.45)}><Panel x={1340} y={110} w={430}><Mono>ORDER</Mono><Bar label="Items" w={120} tick /><Bar label="Address" w={140} tick /><Bar label="Tracking" w={160 * ramp(T, S(3) + 2.0, 0.6, EASE_MOVE)} tick={T > S(3) + 2.7} /></Panel></Pop>) },
    { at: S(4) - 0.3, cam: { ...CAM.wide, x: 36, y: 14 }, end: { zoom: 1.4 }, card: { kicker: "08 · LABEL AND DISPATCH", title: "Planned backwards from the carrier's cut-off.", body: "So the packing is finished before the van arrives." },
      overlay: (cam, u, T) => (<Pop k={ramp(u, 0.4, 0.45)}><Panel x={1240} y={110} w={600}>
        <Mono>THE DAY</Mono>
        <div style={{ position: "relative", marginTop: 18, height: 70 }}>
          <div style={{ position: "absolute", left: 0, top: 22, height: 26, width: 420 * ramp(T, S(5) + 0.4, 3.2, EASE_MOVE), background: C.green, borderRadius: 6 }} />
          <div style={{ position: "absolute", left: 0, top: 22, height: 26, width: 420, border: `2px solid ${C.ink}`, borderRadius: 6 }} />
          <div style={{ position: "absolute", left: 452, top: 0, height: 70, width: 4, background: C.ink }} />
          <div style={{ position: "absolute", left: 6, top: 54, fontFamily: FONT.mono, fontSize: 17 }}>PACKING</div>
          <div style={{ position: "absolute", left: 466, top: 4, fontFamily: FONT.mono, fontSize: 17, lineHeight: 1.2 }}>CARRIER<br />CUT-OFF</div>
        </div>
      </Panel></Pop>) },
  ],
  room: (T, { S }) => {
    const toScale = S(0) + 0.1, print = S(1) + 0.5, fly = S(1) + 1.1, on = S(1) + 2.0, toCage = S(2) + 0.4, roll = S(2) + 2.2;
    let m: P3 = M0; if (T >= toScale) m = arc(M0, M1, EASE_MOVE(clamp((T - toScale) / 0.45)), 0.8);
    m = { ...m, z: m.z + hop(T, toScale + 0.45, 0.3) };
    const inCage: P3 = { x: CAGE.x0 + 1.8, y: CAGE.y0 - (CAGE.y0 - 0.2) * 0.0 + 1.2, z: 1 + 3.4 };
    let mailer: RoomState["mailer"] = { ...m, taped: 1, label: T >= on ? 1 : 0, inCage: false };
    if (T >= toCage) { const k = EASE_MOVE(clamp((T - toCage) / 0.9)); mailer = k >= 1 ? { ...inCage, taped: 1, label: 1, inCage: true } : { ...arc(M1, inCage, k, 7), taped: 1, label: 1, inCage: false }; }
    return {
      holdBin: BIN_SHELF, jars: ShelfJars(0).slice(0, PICK), mailer,
      printer: T >= print && T < fly ? ramp(T, print, 0.45, EASE_MOVE) : 0,
      flyLabel: T >= fly && T < on ? arc(LABEL_OUT, LABEL_ON, EASE_MOVE((T - fly) / (on - fly)), 2.2) : null,
      cageOut: 0.55 * ramp(T, roll, 1.4, EASE_MOVE),
    };
  },
};

/* ---- 9. And when it comes back + the final card */
SPECS[9] = {
  shots: ({ S, ch }) => [
    { at: ch.card, cam: CAM.recv, end: { zoom: 2.5 }, card: { kicker: "09 · AND WHEN IT COMES BACK", title: "A return is five jobs, not one." } },
    { at: S(2) - 0.3, cam: { x: RECV.x0 + 8.5, y: RECV.y0 + 4.8, z: RECV.top + 1, zoom: 4.2 }, end: { zoom: 4.5 }, card: { kicker: "09 · AND WHEN IT COMES BACK", title: "Receive. Inspect. Grade. Repack. Restock." } },
    { at: S(3) - 0.3, cam: { ...CAM.wide, x: 30, y: 18 }, end: { zoom: 1.35 }, card: null },
  ],
  world: (T, { S }) => {
    const inn = ramp(T, S(0) + 0.2, 0.6, EASE_MOVE);
    const step = (k: number) => S(2) + [0.0, 1.1, 2.0, 2.9, 4.6][k];
    const z = (1 - inn) * 8 + hop(T, S(0) + 0.8, 0.5);
    const open = ramp(T, step(1), 0.4, EASE_MOVE);
    const jarK = ramp(T, step(1) + 0.2, 0.5, EASE_MOVE);
    const restock = ramp(T, step(4), 0.9, EASE_MOVE);
    const jar: P3 = restock > 0 ? arc({ x: RECV.x0 + 9.5, y: RECV.y0 + 6, z: RECV.top }, shelfSlot(PICK), restock, 7) : { x: RECV.x0 + 9.5, y: RECV.y0 + 6, z: RECV.top + (1 - jarK) * 0.6 };
    return <g>
      {T >= S(0) + 0.2 && <WMailer x={RECV.x0 + 5} y={RECV.y0 + 3} z={RECV.top + z} label />}
      {open > 0.01 && <polygon points={poly([[RECV.x0 + 5.4, RECV.y0 + 3.4, RECV.top + z + 0.72], [RECV.x0 + 7.4, RECV.y0 + 3.4, RECV.top + z + 0.72 + 1.6 * open], [RECV.x0 + 7.4, RECV.y0 + 6.2, RECV.top + z + 0.72 + 1.6 * open], [RECV.x0 + 5.4, RECV.y0 + 6.2, RECV.top + z + 0.72]])} fill={C.grey} stroke={C.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      {jarK > 0.01 && restock < 1 && <Cyl x={jar.x} y={jar.y} z={jar.z} r={0.75} h={1.8} color={C.white} topColor={C.grey} />}
      {T > step(3) && T < step(4) + 0.3 && <WMailer x={RECV.x0 + 11} y={RECV.y0 + 4.5} z={RECV.top + (1 - ramp(T, step(3), 0.4, EASE_MOVE)) * 5} />}
    </g>;
  },
  overlay: (cam, T, { S }) => {
    const step = (k: number) => S(2) + [0.0, 1.1, 2.0, 2.9, 4.6][k];
    const k = ramp(T, S(1), 0.45) * (1 - ramp(T, S(3) - 0.4, 0.3));
    if (k <= 0) return null;
    return <Pop k={k}><div style={{ position: "absolute", left: 760, top: 840, display: "flex", gap: 14 }}>
      {["RECEIVE", "INSPECT", "GRADE", "REPACK", "RESTOCK"].map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Chip on={ramp(T, step(i), 0.25)}>{`${i + 1} ${s}`}</Chip>
          {i < 4 && <div style={{ fontFamily: FONT.body, fontSize: 28, color: C.ink }}>→</div>}
        </div>))}
    </div></Pop>;
  },
  room: () => ({ holdBin: BIN_SHELF, jars: ShelfJars(0).slice(0, PICK) }),
  final: ({ S }) => S(3) - 0.3,
};

/* ============================================================ engine */
const driftEnd = (s: Shot): Cam => ({ ...s.cam, zoom: s.cam.zoom * 1.05, x: s.cam.x + 0.4, y: s.cam.y - 0.3, ...s.end });

function cameraAt(shots: Shot[], T: number, chDur: number) {
  let i = 0; while (i + 1 < shots.length && T >= shots[i + 1].at) i++;
  const dur = (j: number) => (j + 1 < shots.length ? shots[j + 1].at : chDur) - shots[j].at;
  const glide = (k: number) => { const c = clamp(k); return 1.3 * c - 0.3 * c * c; };   // eases out, never stops before the next shot
  const at = (j: number, u: number) => lerpCam(shots[j].cam, driftEnd(shots[j]), glide(u / dur(j)));
  const u = T - shots[i].at;
  let cam = at(i, u);
  if (i > 0 && u < 0.9) cam = lerpCam(at(i - 1, dur(i - 1)), cam, EASE_MOVE(u / 0.9));
  if (i === 0 && u < 1.6) cam = lerpCam({ ...shots[0].cam, zoom: shots[0].cam.zoom * 0.86 }, cam, EASE_APPEAR(clamp(u / 1.6)));
  return { cam, i, u };
}

/** Text card in the left third: slides in, words rise, drifts while it stays, leaves before the next. */
const LeftCard: React.FC<{ card: CardT; T: number; a: number; b: number }> = ({ card, T, a, b }) => {
  const k = ramp(T, a, 0.55, EASE_APPEAR), out = ramp(T, b - 0.3, 0.3, EASE_MOVE);
  if (k <= 0 || out >= 1) return null;
  const drift = sine((T - a) / Math.max(1, b - a));
  const words = card.title.split(" ");
  return (
    <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 560, display: "flex", flexDirection: "column", justifyContent: "center", opacity: (1 - out) * Math.min(1, k * 1.5), transform: `translate(${(1 - k) * -40 - out * 30}px, ${-10 * drift}px)` }}>
      <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: "34px 36px" }}>
        <Mono size={20}>{card.kicker}</Mono>
        <div style={{ marginTop: 14, fontFamily: FONT.display, fontWeight: 800, fontSize: 58, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.ink }}>
          {words.map((w, i) => { const wk = ramp(T, a + 0.12 + i * 0.06, 0.4, EASE_APPEAR); return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6, marginBottom: -6 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - wk) * 105}%)` }}>{w}{i < words.length - 1 ? " " : ""}</span>
            </span>); })}
        </div>
        {card.body && <div style={{ marginTop: 18, fontFamily: FONT.body, fontSize: 28, lineHeight: 1.35, color: C.ink, opacity: 0.85 * ramp(T, a + 0.35 + words.length * 0.06, 0.4) }}>{card.body}</div>}
      </div>
    </div>
  );
};

/** Full-screen chapter card: number, mint rule, title rising word by word; wipes up into the scene. */
const ChapterCardAnim: React.FC<{ n: number; name: string; T: number }> = ({ n, name, T }) => {
  const wipe = ramp(T, 1.72, 0.32, EASE_MOVE);
  if (wipe >= 1) return null;
  const words = name.split(" ");
  return (
    <AbsoluteFill style={{ background: C.grey, transform: `translateY(${-wipe * 100}%)` }}>
      <div style={{ position: "absolute", left: 200, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", transform: `translateY(${-14 * sine(T / 2)}px) scale(${1 + 0.02 * sine(T / 2)})`, transformOrigin: "0 50%" }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 64, letterSpacing: "0.12em", color: C.green, opacity: ramp(T, 0.05, 0.3), transform: `translateX(${(1 - ramp(T, 0.05, 0.4, EASE_APPEAR)) * -30}px)` }}>{String(n).padStart(2, "0")}</div>
        <div style={{ marginTop: 18, width: 120 * ramp(T, 0.2, 0.5, EASE_APPEAR), height: 6, background: C.mint }} />
        <div style={{ marginTop: 34, fontFamily: FONT.display, fontWeight: 800, fontSize: 112, letterSpacing: "-0.035em", lineHeight: 1.02, color: C.ink, maxWidth: 1500 }}>
          {words.map((w, i) => { const wk = ramp(T, 0.3 + i * 0.07, 0.45, EASE_APPEAR); return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 10, marginBottom: -10 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - wk) * 105}%)` }}>{w}{i < words.length - 1 ? " " : ""}</span>
            </span>); })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Final card, in figures: logo with the brand diagonal fill, then the price lines as the voice reads them. */
const Final: React.FC<{ T: number; t0: number; end: number; S: (k: number) => number }> = ({ T, t0, end, S }) => {
  const logo = t0 + 0.6;
  const edge = -20 + EASE_LOGO(clamp((T - logo) / 0.6)) * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
  const line = (txt: string, a: number, size: number, weight: number, family: string, mt: number) => {
    const k = ramp(T, a, 0.5, EASE_APPEAR);
    return <div style={{ marginTop: mt, fontFamily: family, fontWeight: weight, fontSize: size, letterSpacing: family === FONT.display ? "-0.03em" : 0, color: C.ink, opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * 26}px)` }}>{txt}</div>;
  };
  const kd = clamp((T - t0) / (end - t0));
  const drift = 1.3 * kd - 0.3 * kd * kd;   // eases out but never stops: still travelling on the last frame
  const typed = (txt: string, a: number, cps: number) => txt.slice(0, Math.max(0, Math.floor((T - a) * cps)));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", transform: `translateY(${-24 * drift}px) scale(${1 + 0.05 * drift})` }}>
      {T >= logo && <div style={{ width: 260, WebkitMaskImage: mask, maskImage: mask }}><Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} /></div>}
      <div style={{ marginTop: 22, height: 40, fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.14em", color: C.green }}>{typed("LIMERICK · IRELAND", S(3) + 0.9, 16)}</div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.body, fontSize: 36, color: C.ink }}>
        <span style={{ opacity: ramp(T, S(3) + 2.1, 0.4), transform: `translateY(${(1 - ramp(T, S(3) + 2.1, 0.4, EASE_APPEAR)) * 16}px)` }}>For brands on</span>
        {([["TikTok Shop", S(3) + 2.7], ["Shopify", S(3) + 3.4]] as const).map(([l, a]) => (
          <span key={l} style={{ opacity: Math.min(1, ramp(T, a, 0.35) * 1.4), transform: `scale(${0.8 + 0.2 * ramp(T, a, 0.35, EASE_APPEAR)})`, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "4px 14px", fontFamily: FONT.mono, fontSize: 26, fontWeight: 500, boxShadow: `4px 4px 0 ${C.ink}` }}>{l}</span>))}
      </div>
      <div style={{ marginTop: 26, width: 520 * ramp(T, S(3) + 4.3, 0.9, EASE_MOVE), height: 4, background: C.mint }} />
      {line("From €2.60 per order", S(4), 80, 800, FONT.display, 26)}
      {line("€0.60 per additional item in the same order", S(4) + 2.6, 56, 600, FONT.body, 22)}
      {line("€275 minimum per month · No setup fee", S(4) + 5.6, 56, 600, FONT.body, 12)}
      {line("dockentra.ie", S(5), 64, 800, FONT.display, 30)}
    </AbsoluteFill>
  );
};

export const OpsChapter: React.FC<{ n: number }> = ({ n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps;
  const ch = CHAPTERS[n];
  const ctx: Ctx = { S: (k) => ch.sentences[k].a, E: (k) => ch.sentences[k].b, ch };
  const spec = SPECS[n];
  const shots = spec.shots(ctx);
  const Ts = Math.max(T, ch.card);                         // the scene under the chapter card is frozen at its first frame of action
  const { cam, i, u } = cameraAt(shots, Ts, ch.dur);
  const c = iso(cam.x, cam.y, cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`;
  const room: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: BIN_HOOK, highlightCells: false, ...spec.room?.(Ts, ctx) };
  const finalAt = spec.final?.(ctx) ?? 1e9;
  const dim = ramp(Ts, finalAt, 0.7, EASE_MOVE);
  // card runs: consecutive shots that share a card (undefined = keep the previous one)
  const runs: { card: CardT; a: number; b: number }[] = [];
  let cur: CardT | null = null;
  shots.forEach((s, j) => {
    const card = s.card === undefined ? cur : s.card;
    if (card !== cur) { if (runs.length) runs[runs.length - 1].b = s.at; if (card) runs.push({ card, a: s.at, b: ch.dur }); cur = card; }
  });
  if (runs.length) runs.forEach((r) => (r.b = Math.min(r.b, finalAt)));
  const sh = shots[i];
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{ opacity: 1 - 0.72 * dim, filter: dim > 0 ? `blur(${8 * dim}px)` : undefined }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <g transform={tf}>
            <Room s={room} />
            {spec.world?.(Ts, ctx)}
            {sh.world?.(u, Ts)}
          </g>
        </svg>
        {spec.overlay?.(cam, Ts, ctx)}
        {sh.overlay?.(cam, u, Ts)}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 760, opacity: 1 - dim, background: `linear-gradient(90deg, ${C.grey} 0%, ${C.grey} 70%, ${C.grey}00 100%)` }} />
      </AbsoluteFill>
      {runs.map((r, j) => <LeftCard key={j} card={r.card} T={Ts} a={r.a} b={r.b} />)}
      {dim > 0 && <Final T={Ts} t0={finalAt} end={ch.dur} S={ctx.S} />}
      {n > 0 && T < ch.card + 0.1 && <ChapterCardAnim n={n} name={ch.name} T={T} />}
      {n < CHAPTERS.length - 1 && T > ch.dur - 0.64 && <AbsoluteFill style={{ background: C.grey, opacity: ramp(T, ch.dur - 0.64, 0.6, EASE_MOVE), transform: `translateY(${(1 - ramp(T, ch.dur - 0.64, 0.6, EASE_MOVE)) * 14}%)` }} />}
    </AbsoluteFill>
  );
};

/** YouTube thumbnail (render at scale 2/3 for 1280×720): the receiving table mid-delivery, one short line. */
export const OpsThumb: React.FC = () => {
  const ch = CHAPTERS[2];
  const ctx: Ctx = { S: (k) => ch.sentences[k].a, E: (k) => ch.sentences[k].b, ch };
  const T = ctx.S(3) + 1;
  const cam: Cam = { x: 23, y: 20.5, z: 9, zoom: 2.7 };
  const c = iso(cam.x, cam.y, cam.z);
  const room: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: BIN_HOOK, highlightCells: false, ...SPECS[2].room?.(T, ctx) };
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${ANCHOR.x + 330} ${ANCHOR.y + 40}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`}><Room s={room} /></g>
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1080, background: `linear-gradient(90deg, ${C.grey} 0%, ${C.grey} 86%, ${C.grey}00 100%)` }} />
      <div style={{ position: "absolute", left: 96, top: 0, bottom: 0, width: 880, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 40, letterSpacing: "0.12em", color: C.green }}>EVERY STEP</div>
        <div style={{ marginTop: 22, fontFamily: FONT.display, fontWeight: 800, fontSize: 150, lineHeight: 0.98, letterSpacing: "-0.04em", color: C.ink }}>Receiving to dispatch.</div>
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 22 }}>
          <Img src={staticFile("brand/dockentra-logo.png")} style={{ height: 92 }} />
          <div style={{ fontFamily: FONT.mono, fontSize: 34, letterSpacing: "0.08em", color: C.ink, opacity: 0.8 }}>LIMERICK · IRELAND</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
