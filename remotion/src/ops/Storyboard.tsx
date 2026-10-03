import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../brand";
import { loadBrandFonts } from "../fonts";
import { Box, Cyl, FaceText, iso, mix, poly, V3 } from "../warehouse/iso";
import { BIN, CAGE, CELLS, DAMAGED, JARS, PACK, RECV, Room, RoomState, ShipLabel, SHELF, STAND } from "../warehouse/Room";

loadBrandFonts();

/** 16:9 YouTube layout: the scene lives in the right two-thirds, text sits in the left third over the light wall. */
export const OW = 1920, OH = 1080;
const ANCHOR = { x: 1280, y: 560 };
type Cam = { x: number; y: number; z: number; zoom: number };
const sc = (cam: Cam, x: number, y: number, z: number) => {
  const p = iso(x, y, z), c = iso(cam.x, cam.y, cam.z);
  return { x: ANCHOR.x + (p.X - c.X) * cam.zoom, y: ANCHOR.y + (p.Y - c.Y) * cam.zoom };
};
const LN = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };

/* ------------------------------------------------------------ cameras */
const CAM: Record<string, Cam> = {
  wide: { x: 28, y: 18, z: 6, zoom: 1.25 },
  dispatch: { x: 47, y: 7, z: 8, zoom: 2.0 },
  recv: { x: 17, y: 21.5, z: 10, zoom: 2.35 },
  recvClose: { x: 20, y: 21.5, z: 11, zoom: 2.9 },
  shelf: { x: 15, y: 5, z: 10, zoom: 1.9 },
  shelfA2: { x: 9, y: 4, z: 11, zoom: 3.0 },
  pack: { x: 42, y: 23.5, z: 10, zoom: 2.35 },
  packClose: { x: 43, y: 22.5, z: 10.5, zoom: 3.0 },
  aisle: { x: 30, y: 14, z: 9, zoom: 1.6 },
};

/* ------------------------------------------------------------ room states */
const onTable = (i: number) => ({ x: JARS[i][0], y: JARS[i][1], z: RECV.top });
const onShelf = (slot: number) => ({ x: SHELF.x0 + 1.2 + (slot % 6) * 1.8, y: SHELF.y0 + 1.8 + Math.floor(slot / 6) * 2.2, z: SHELF.levels[1] + 0.5 });
const BIN_HOOK = { x: RECV.x1 + 0.2, y: RECV.y0 + 2.2, z: RECV.top - BIN.h + 0.4, hooked: true };
const BIN_SHELF = { x: SHELF.x0 + SHELF.bay + 0.6, y: SHELF.y0 + 0.8, z: SHELF.levels[0] + 0.5, hooked: false };
const base: RoomState = { carton: null, jars: [], mailer: null, printer: 0, cageOut: 0, recvFade: 1, flyLabel: null, holdBin: BIN_HOOK, highlightCells: false };
const GOOD = JARS.map((_, i) => i).filter((i) => !DAMAGED.includes(i));

/* ------------------------------------------------------------ overlay helpers (screen space) */
const Tag: React.FC<{ x: number; y: number; children: React.ReactNode; fill?: string; color?: string }> = ({ x, y, children, fill = C.white, color = C.ink }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", background: fill, color, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 12px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{children}</div>
);
const Panel: React.FC<{ x: number; y: number; w: number; children: React.ReactNode }> = ({ x, y, w, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${C.ink}`, padding: "18px 22px", boxSizing: "border-box" }}>{children}</div>
);
const Mono: React.FC<{ children: React.ReactNode; size?: number; op?: number }> = ({ children, size = 20, op = 0.7 }) => (
  <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: size, letterSpacing: "0.1em", color: C.ink, opacity: op }}>{children}</div>
);
const Bar: React.FC<{ label: string; w: number; tick?: boolean }> = ({ label, w, tick }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
    <div style={{ width: 130, fontFamily: FONT.body, fontSize: 22, color: C.ink }}>{label}</div>
    <div style={{ height: 14, width: w, background: mix(C.grey, C.ink, 0.25), borderRadius: 7 }} />
    {tick && <div style={{ width: 26, height: 26, borderRadius: 13, background: C.green, color: C.white, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, fontWeight: 700 }}>✓</div>}
  </div>
);
const Check: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, fontFamily: FONT.body, fontSize: 26, color: C.ink }}>
    <div style={{ width: 30, height: 30, border: `2px solid ${C.ink}`, borderRadius: 6, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>✓</div>
    {children}
  </div>
);
const Dashed: React.FC<{ pts: { x: number; y: number }[]; dot?: boolean }> = ({ pts, dot = true }) => (
  <svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="10 9" strokeLinecap="round" />
    {dot && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={8} fill={C.ink} />}
  </svg>
);

/* ------------------------------------------------------------ the frames */
type Frame = {
  ch: string; tc: string; title?: string;
  cam?: Cam; room?: Partial<RoomState>;
  card?: { kicker: string; title: string; body?: string };
  world?: React.ReactNode;                     // extra world-space objects, drawn on top of the room
  overlay?: (cam: Cam) => React.ReactNode;     // screen-space marks
  chapterCard?: { n: string; name: string };
  final?: boolean;
};

const Polybag: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => (
  <g>
    <polygon points={poly([[x, y, z + 0.05], [x + 4.6, y, z + 0.05], [x + 4.6, y + 3.4, z + 0.05], [x, y + 3.4, z + 0.05]])} fill={C.white} fillOpacity={0.55} {...LN} />
    <polyline points={poly([[x + 0.3, y + 0.5, z + 0.4], [x + 4.3, y + 0.5, z + 0.4]])} stroke={C.ink} strokeWidth={1.5} strokeDasharray="3 3" fill="none" vectorEffect="non-scaling-stroke" />
    <Box x={x + 1.2} y={y + 1} z={z + 0.05} w={2.2} d={1.6} h={0.5} color={C.white} />
  </g>
);
const PaddedMailer: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => (
  <g>
    <Box x={x} y={y} z={z} w={4.6} d={3.4} h={0.9} color={C.white} />
    {[0.25, 0.5, 0.75].map((k, i) => <polyline key={i} points={poly([[x + 0.3, y + 3.4 * k, z + 0.92], [x + 3.6, y + 3.4 * k, z + 0.92]])} stroke={mix(C.grey, C.ink, 0.3)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />)}
    <polyline points={poly([[x + 3.9, y, z + 0.92], [x + 3.9, y + 3.4, z + 0.92]])} stroke={C.ink} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
  </g>
);
const Carton2: React.FC<{ x: number; y: number; z: number; w?: number; d?: number; h?: number }> = ({ x, y, z, w = 4, d = 3.4, h = 3 }) => (
  <g>
    <Box x={x} y={y} z={z} w={w} d={d} h={h} color={C.green} />
    <polyline points={poly([[x + w / 2, y, z + h + 0.01], [x + w / 2, y + d, z + h + 0.01]])} stroke={mix(C.green, C.white, 0.35)} strokeWidth={5} fill="none" vectorEffect="non-scaling-stroke" />
  </g>
);
const WMailer: React.FC<{ x: number; y: number; z: number; label?: boolean }> = ({ x, y, z, label }) => (
  <g>
    <Box x={x} y={y} z={z} w={5} d={3.6} h={0.7} color={C.white} />
    <polygon points={poly([[x + 0.4, y + 0.4, z + 0.7], [x + 2.5, y + 1.8, z + 0.7], [x + 0.4, y + 3.2, z + 0.7]])} fill="none" {...LN} />
    {label && <ShipLabel x={x + 2.8} y={y + 0.4} z={z + 0.72} w={1.9} d={2.8} />}
  </g>
);

export const FRAMES: Frame[] = [
  /* 0 — cold open */
  { ch: "0", tc: "0:04", cam: CAM.wide, card: { kicker: "IRELAND · TIKTOK SHOP", title: "Ship by Seller only.", body: "There is no Fulfilled by TikTok here." } },
  { ch: "0", tc: "0:20", cam: CAM.dispatch, room: { cageOut: 0.35 },
    card: { kicker: "SO EVERY ORDER", title: "Ships from the seller, or from a warehouse.", body: "This is what happens in one, step by step." },
    overlay: (cam) => <Dashed pts={[sc(cam, CAGE.x0 + 4, CAGE.y0 + 6, 2), sc(cam, 49, 1, 2)]} /> },
  /* 1 — before anything arrives */
  { ch: "1", tc: "0:30", chapterCard: { n: "01", name: "Before anything arrives" } },
  { ch: "1", tc: "0:45", cam: CAM.recv,
    card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "We know what's coming.", body: "Which products, how many, and when — from you, in advance." },
    overlay: (cam) => { const p = sc(cam, 17, 21, 17); return (
      <Panel x={p.x - 200} y={p.y - 150} w={400}>
        <Mono>INBOUND NOTICE</Mono>
        <Bar label="Products" w={170} /><Bar label="Quantity" w={120} /><Bar label="Arriving" w={150} />
      </Panel>); } },
  { ch: "1", tc: "1:00", cam: CAM.shelf, room: { highlightCells: true },
    card: { kicker: "01 · BEFORE ANYTHING ARRIVES", title: "Every product already has a place.", body: "The shelf is chosen before the van arrives." },
    world: <g>
      <polygon points={poly([[SHELF.x0 + 0.8, SHELF.y0 + 1, SHELF.levels[1] + 0.55], [SHELF.x0 + 11.2, SHELF.y0 + 1, SHELF.levels[1] + 0.55], [SHELF.x0 + 11.2, SHELF.y1 - 0.8, SHELF.levels[1] + 0.55], [SHELF.x0 + 0.8, SHELF.y1 - 0.8, SHELF.levels[1] + 0.55]])} fill={C.mint} fillOpacity={0.25} stroke={C.ink} strokeWidth={2.5} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
    </g>,
    overlay: (cam) => { const p = sc(cam, SHELF.x0 + 6, SHELF.y1, SHELF.levels[1] + 6); return <Tag x={p.x} y={p.y}>RESERVED · A2</Tag>; } },
  /* 2 — receiving and the photo report */
  { ch: "2", tc: "1:20", cam: CAM.recv, room: { carton: { z: 0, flaps: 1, collapse: 0 } },
    card: { kicker: "02 · RECEIVING", title: "Opened on the receiving table.", body: "Checked against the notice you sent." } },
  { ch: "2", tc: "1:35", cam: CAM.recvClose, room: { jars: JARS.map((_, i) => onTable(i)) },
    card: { kicker: "02 · THE PHOTO REPORT", title: "One frame. The whole delivery.", body: "Laid out in rows, photographed from above." },
    overlay: (cam) => {
      const lens = sc(cam, STAND.head.x, STAND.head.y, STAND.lensZ), lit = sc(cam, STAND.head.x, STAND.head.y, RECV.top + 0.1);
      const rx = 1.2247 * 4.3 * 12 * cam.zoom, ry = 0.7071 * 4.3 * 12 * cam.zoom;
      return (<svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
        <polygon points={`${lens.x},${lens.y + 6} ${lit.x - rx},${lit.y} ${lit.x + rx},${lit.y}`} fill={C.white} fillOpacity={0.55} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
        <ellipse cx={lit.x} cy={lit.y} rx={rx} ry={ry} fill={C.white} fillOpacity={0.45} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
      </svg>); } },
  { ch: "2", tc: "1:48", cam: CAM.recv, room: { jars: JARS.map((_, i) => onTable(i)) },
    card: { kicker: "02 · THE PHOTO REPORT", title: "You find out before your customer does.", body: "Photos go to you the day it's received." },
    overlay: () => (
      <>
        <Dashed pts={[{ x: 1240, y: 520 }, { x: 1500, y: 300 }, { x: 1640, y: 250 }]} />
        <Panel x={1600} y={120} w={260}>
          <Mono size={18}>TO · YOUR BRAND</Mono>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 10, background: C.grey, borderRadius: 8 }}>
            {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ width: 30, height: 30, borderRadius: 15, background: C.white, border: `2px solid ${C.ink}` }} />)}
          </div>
          <div style={{ marginTop: 10, fontFamily: FONT.body, fontSize: 20, color: C.ink }}>Delivery photo report</div>
        </Panel>
      </>) },
  { ch: "2", tc: "2:00", cam: CAM.pack, room: { mailer: { x: PACK.x0 + 7.2, y: PACK.y0 + 1.7, z: PACK.top + 0.9, taped: 1, label: 1, inCage: false } },
    card: { kicker: "02 · IF A DELIVERY IS DISPUTED", title: "We collect exactly what TikTok Shop asks for.", body: "Whether it's accepted is the platform's decision." },
    overlay: () => (
      <Panel x={1330} y={140} w={480}>
        <Mono>TIKTOK SHOP ASKS FOR</Mono>
        <Check>Condition at the time of packing</Check>
        <Check>Proof of handover to the carrier</Check>
      </Panel>) },
  /* 3 — when something is wrong */
  { ch: "3", tc: "2:20", cam: CAM.recvClose,
    room: { jars: [...JARS.map((_, i) => onTable(i)).filter((_, i) => i !== 10), { x: 26.6, y: 20.2, z: RECV.top }] },
    card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Damaged. Missing. Extra.", body: "Each one is recorded against your notice." },
    overlay: (cam) => {
      const d = DAMAGED.map((i) => sc(cam, JARS[i][0], JARS[i][1], RECV.top + 1.8));
      const miss = sc(cam, JARS[10][0], JARS[10][1], RECV.top + 0.05);
      const extra = sc(cam, 26.6, 20.2, RECV.top + 2.2);
      return (<>
        <svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
          {d.map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx={13 * cam.zoom} ry={7.5 * cam.zoom} fill="none" stroke={C.mint} strokeWidth={5} />)}
          <ellipse cx={miss.x} cy={miss.y} rx={10 * cam.zoom} ry={6 * cam.zoom} fill="none" stroke={C.ink} strokeWidth={2.5} strokeDasharray="7 6" />
        </svg>
        <Tag x={d[0].x} y={d[0].y - 30} fill={C.mint}>DAMAGED</Tag>
        <Tag x={miss.x} y={miss.y + 60}>MISSING</Tag>
        <Tag x={extra.x} y={extra.y - 20}>EXTRA</Tag>
      </>); } },
  { ch: "3", tc: "2:38", cam: CAM.recv, room: { jars: GOOD.map((i) => onTable(i)) },
    card: { kicker: "03 · WHEN SOMETHING IS WRONG", title: "Damaged goes on hold, not on a shelf.", body: "What happens to it next is your decision." },
    overlay: (cam) => { const p = sc(cam, BIN_HOOK.x + BIN.w / 2, BIN_HOOK.y + BIN.d / 2, BIN_HOOK.z + BIN.h + 0.5); return <Tag x={p.x} y={p.y - 10}>DAMAGED · ON HOLD</Tag>; } },
  /* 4 — putaway */
  { ch: "4", tc: "3:00", cam: CAM.shelf, room: { jars: GOOD.map((_, s) => s < 6 ? onShelf(s) : { x: 9 + s * 0.6, y: 12 - s * 0.4, z: 12 + Math.sin(s) * 1.5 }), highlightCells: true, recvFade: 0, holdBin: BIN_SHELF },
    card: { kicker: "04 · PUTAWAY", title: "Every product gets a cell and a count.", body: "A1 to A6 in this bay." } },
  { ch: "4", tc: "3:18", cam: CAM.shelfA2, room: { jars: GOOD.map((_, s) => onShelf(s)), highlightCells: true, recvFade: 0, holdBin: BIN_SHELF },
    card: { kicker: "04 · THE STOCK RECORD", title: "Shelf and record have to agree.", body: "Checked by recounting, not by trust." },
    overlay: () => (
      <Panel x={1360} y={170} w={420}>
        <Mono>CELL A2 · RECOUNT</Mono>
        <Bar label="On shelf" w={170} tick /><Bar label="In record" w={170} tick />
      </Panel>) },
  /* 5 — the order arrives */
  { ch: "5", tc: "3:42", cam: CAM.pack, room: { holdBin: BIN_SHELF },
    card: { kicker: "05 · THE ORDER ARRIVES", title: "Straight from TikTok Shop or Shopify.", body: "Nobody exports a spreadsheet." },
    overlay: (cam) => { const p = sc(cam, PACK.x0 + 9, PACK.y0 + 4, PACK.top + 1); return (
      <>
        <Dashed pts={[{ x: 1480, y: 150 }, { x: p.x, y: p.y - 40 }]} />
        <Panel x={1350} y={60} w={260}><Mono size={18}>ORDER · TIKTOK SHOP</Mono><Bar label="Items" w={70} /><Bar label="Address" w={80} /></Panel>
        <Panel x={1640} y={150} w={240}><Mono size={18}>ORDER · SHOPIFY</Mono><Bar label="Items" w={60} /><Bar label="Address" w={70} /></Panel>
      </>); } },
  { ch: "5", tc: "3:55", cam: CAM.pack, room: { holdBin: BIN_SHELF },
    card: { kicker: "05 · THE PLATFORM'S CLOCK", title: "48 hours to ship.", body: "TikTok Shop's rule for sellers, not a promise of ours." },
    overlay: () => (
      <svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
        <circle cx={1700} cy={230} r={110} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <path d={`M1700 230 L1700 120 A110 110 0 0 1 ${1700 + 110 * Math.sin(2.1)} ${230 - 110 * Math.cos(2.1)} Z`} fill={C.green} opacity={0.85} />
        <circle cx={1700} cy={230} r={70} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <text x={1700} y={226} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={44} fill={C.ink}>48 h</text>
        <text x={1700} y={262} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} fill={C.ink} opacity={0.7}>PLATFORM RULE</text>
      </svg>) },
  /* 6 — picking */
  { ch: "6", tc: "4:15", cam: CAM.aisle, room: { holdBin: BIN_SHELF, highlightCells: true, jars: [{ x: SHELF.x0 + SHELF.bay + 4, y: SHELF.y1 + 1.5, z: SHELF.levels[1] + 2 }] },
    card: { kicker: "06 · PICKING", title: "By cell address, not by memory.", body: "The order names the product. The record names the cell." },
    overlay: (cam) => <Dashed pts={[sc(cam, PACK.x0 + 3, PACK.y0 - 1, 0.2), sc(cam, 22, 12, 0.2), sc(cam, SHELF.x0 + SHELF.bay + 6, SHELF.y1 + 2, 0.2), sc(cam, SHELF.x0 + SHELF.bay + 4, SHELF.y1 + 1.5, SHELF.levels[1] + 4)]} /> },
  /* 7 — packing */
  { ch: "7", tc: "4:45", cam: CAM.packClose, room: { holdBin: BIN_SHELF },
    card: { kicker: "07 · PACKING", title: "Packaging by category, not by habit.", body: "Soft goods · small things · glass and liquids" },
    overlay: () => (
      <div style={{ position: "absolute", left: 1010, top: 110, display: "flex", gap: 22 }}>
        {([["POLYBAG", "Soft goods that can't break", "bag"], ["PADDED MAILER", "Small things that need cushioning", "mailer"], ["BOX", "Glass, liquids, a shape to protect", "box"]] as const).map(([l, d, k]) => (
          <div key={k} style={{ width: 270, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${C.ink}`, padding: "16px 18px", boxSizing: "border-box" }}>
            <svg width={232} height={150} viewBox="-116 -110 232 150">
              <g transform="scale(1.7)">
                {k === "bag" && <g><polygon points={poly([[-3, -2, 0], [3, -2, 0], [3, 2, 0], [-3, 2, 0]])} fill={C.white} fillOpacity={0.6} {...LN} /><Box x={-1.4} y={-1} z={0} w={2.8} d={2} h={0.7} color={C.white} /><polyline points={poly([[-2.6, -1.4, 0.5], [2.6, -1.4, 0.5]])} stroke={C.ink} strokeDasharray="3 3" strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" /></g>}
                {k === "mailer" && <g transform="translate(0 6)"><Box x={-3} y={-2.2} z={0} w={6} d={4.4} h={1.1} color={C.white} />{[0.3, 0.55, 0.8].map((q, i) => <polyline key={i} points={poly([[-2.6, -2.2 + 4.4 * q, 1.12], [1.8, -2.2 + 4.4 * q, 1.12]])} stroke={mix(C.grey, C.ink, 0.35)} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />)}</g>}
                {k === "box" && <g transform="translate(0 14)"><Box x={-2.6} y={-2} z={0} w={5.2} d={4} h={3.6} color={C.green} /><polyline points={poly([[0, -2, 3.61], [0, 2, 3.61]])} stroke={mix(C.green, C.white, 0.35)} strokeWidth={5} fill="none" vectorEffect="non-scaling-stroke" /></g>}
              </g>
            </svg>
            <Mono size={18} op={0.9}>{l}</Mono>
            <div style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 20, lineHeight: 1.3, color: C.ink, opacity: 0.85 }}>{d}</div>
          </div>))}
      </div>) },
  { ch: "7", tc: "5:00", cam: CAM.packClose, room: { holdBin: BIN_SHELF },
    card: { kicker: "07 · DIMENSIONAL WEIGHT", title: "L × W × H ÷ 5000", body: "The courier bills whichever is larger: that, or the actual weight." },
    world: <Carton2 x={PACK.x0 + 6.4} y={PACK.y0 + 0.9} z={PACK.top + 0.9} w={6.6} d={5.2} h={4.4} />,
    overlay: (cam) => {
      const x0 = PACK.x0 + 6.4, y0 = PACK.y0 + 0.9, z0 = PACK.top + 0.9;
      const L1 = sc(cam, x0, y0 + 5.2 + 1, z0), L2 = sc(cam, x0 + 6.6, y0 + 5.2 + 1, z0);
      const W1 = sc(cam, x0 + 6.6 + 1, y0, z0), W2 = sc(cam, x0 + 6.6 + 1, y0 + 5.2, z0);
      const H1 = sc(cam, x0 + 6.6, y0 + 5.2 + 0.8, z0), H2 = sc(cam, x0 + 6.6, y0 + 5.2 + 0.8, z0 + 4.4);
      const ar = (p: { x: number; y: number }, q: { x: number; y: number }, l: string, k: string) => (
        <g key={k}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={C.ink} strokeWidth={3} markerStart="url(#ah)" markerEnd="url(#ah)" />
          <rect x={(p.x + q.x) / 2 - 22} y={(p.y + q.y) / 2 - 20} width={44} height={40} rx={8} fill={C.white} stroke={C.ink} strokeWidth={2} />
          <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 + 9} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={26} fill={C.ink}>{l}</text></g>);
      return (<svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
        <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill={C.ink} /></marker></defs>
        {ar(L1, L2, "L", "l")}{ar(W1, W2, "W", "w")}{ar(H1, H2, "H", "h")}
      </svg>); } },
  { ch: "7", tc: "5:15", cam: CAM.packClose, room: { holdBin: BIN_SHELF },
    card: { kicker: "07 · COSMETICS", title: "Cap, glass, storage.", body: "There's a separate video on exactly that." },
    overlay: () => (
      <div style={{ position: "absolute", left: 1150, top: 130, display: "flex", gap: 26 }}>
        {[["TAPE THE CAP", "cap"], ["GLASS CAN'T MOVE", "glass"], ["KEEP FROM HEAT", "heat"]].map(([l, k]) => (
          <div key={k} style={{ width: 220, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${C.ink}`, padding: "18px 22px", boxSizing: "border-box" }}>
            <svg width={176} height={130} viewBox="0 0 176 130">
              {k === "cap" && <g><rect x={58} y={40} width={60} height={80} rx={10} fill={C.white} stroke={C.ink} strokeWidth={3} /><rect x={66} y={16} width={44} height={26} rx={5} fill={C.mint} stroke={C.ink} strokeWidth={3} /><rect x={62} y={34} width={52} height={12} fill={mix(C.grey, C.ink, 0.3)} stroke={C.ink} strokeWidth={2} /></g>}
              {k === "glass" && <g><rect x={46} y={46} width={84} height={70} rx={12} fill={mix(C.green, C.white, 0.6)} stroke={C.ink} strokeWidth={3} /><rect x={42} y={30} width={92} height={20} rx={5} fill={C.grey} stroke={C.ink} strokeWidth={3} /><path d="M20 60 h14 M142 60 h14 M20 90 h14 M142 90 h14" stroke={C.ink} strokeWidth={3} /></g>}
              {k === "heat" && <g><rect x={78} y={14} width={20} height={80} rx={10} fill={C.white} stroke={C.ink} strokeWidth={3} /><circle cx={88} cy={104} r={18} fill={C.green} stroke={C.ink} strokeWidth={3} /><rect x={84} y={54} width={8} height={50} fill={C.green} /></g>}
            </svg>
            <Mono size={17} op={0.85}>{l}</Mono>
          </div>))}
      </div>) },
  /* 8 — label and dispatch */
  { ch: "8", tc: "5:35", cam: CAM.packClose, room: { holdBin: BIN_SHELF, printer: 1, mailer: { x: PACK.x0 + 7.2, y: PACK.y0 + 1.7, z: PACK.top + 0.9, taped: 1, label: 0, inCage: false }, flyLabel: { x: PACK.x0 + 12.5, y: PACK.y0 + 2, z: PACK.top + 3.6 } },
    card: { kicker: "08 · LABEL AND DISPATCH", title: "Weighed, then labelled.", body: "The weight and the order make the label." } },
  { ch: "8", tc: "5:50", cam: CAM.dispatch, room: { holdBin: BIN_SHELF, cageOut: 0.6 },
    card: { kicker: "08 · LABEL AND DISPATCH", title: "Into the cage, handed to the carrier.", body: "The tracking number goes back to the platform." },
    overlay: (cam) => { const p = sc(cam, CAGE.x0 + 4, 3, CAGE.h + 2); return (
      <>
        <Dashed pts={[p, { x: p.x - 60, y: p.y - 140 }, { x: 1500, y: 120 }]} />
        <Panel x={1330} y={60} w={360}><Mono size={18}>TRACKING → TIKTOK SHOP · SHOPIFY</Mono><Bar label="Tracking" w={150} tick /></Panel>
      </>); } },
  /* 9 — returns + final */
  { ch: "9", tc: "6:08", cam: CAM.recv, room: { holdBin: BIN_SHELF },
    card: { kicker: "09 · AND WHEN IT COMES BACK", title: "A return is five jobs, not one." },
    world: <WMailer x={RECV.x0 + 6} y={RECV.y0 + 3} z={RECV.top} label />,
    overlay: () => (
      <div style={{ position: "absolute", left: 760, top: 830, display: "flex", gap: 14 }}>
        {["RECEIVE", "INSPECT", "GRADE", "REPACK", "RESTOCK"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "10px 16px", fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", boxShadow: `4px 4px 0 ${C.ink}` }}>{`${i + 1} ${s}`}</div>
            {i < 4 && <div style={{ fontFamily: FONT.body, fontSize: 28, color: C.ink }}>→</div>}
          </div>))}
      </div>) },
  { ch: "9", tc: "6:24", cam: CAM.wide, room: { holdBin: BIN_SHELF }, final: true },
];

/* ------------------------------------------------------------ one frame */
export const OpsFrame: React.FC<{ i: number }> = ({ i }) => {
  const f = FRAMES[i];
  if (f.chapterCard) return <ChapterCard n={f.chapterCard.n} name={f.chapterCard.name} />;
  const cam = f.cam ?? CAM.wide;
  const c = iso(cam.x, cam.y, cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`;
  const room: RoomState = { ...base, ...f.room };
  const dim = f.final ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{ opacity: 1 - 0.7 * dim, filter: dim ? "blur(8px)" : undefined }}>
        <svg width={OW} height={OH} style={{ position: "absolute", inset: 0 }}>
          <g transform={tf}>
            <Room s={room} />
            {f.world}
          </g>
        </svg>
        {f.overlay?.(cam)}
        {/* the light wall behind the text card: left third */}
        {!f.final && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 760, background: `linear-gradient(90deg, ${C.grey} 0%, ${C.grey} 70%, ${C.grey}00 100%)` }} />}
      </AbsoluteFill>
      {f.card && (
        <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 560, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: "34px 36px" }}>
            <Mono size={20}>{f.card.kicker}</Mono>
            <div style={{ marginTop: 14, fontFamily: FONT.display, fontWeight: 800, fontSize: 58, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.ink }}>{f.card.title}</div>
            {f.card.body && <div style={{ marginTop: 18, fontFamily: FONT.body, fontWeight: 400, fontSize: 28, lineHeight: 1.35, color: C.ink, opacity: 0.85 }}>{f.card.body}</div>}
          </div>
        </div>
      )}
      {f.final && <FinalCard />}
    </AbsoluteFill>
  );
};

export const ChapterCard: React.FC<{ n: string; name: string }> = ({ n, name }) => (
  <AbsoluteFill style={{ background: C.grey, justifyContent: "center", paddingLeft: 200 }}>
    <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 64, letterSpacing: "0.12em", color: C.green }}>{n}</div>
    <div style={{ marginTop: 18, width: 120, height: 6, background: C.mint }} />
    <div style={{ marginTop: 34, fontFamily: FONT.display, fontWeight: 800, fontSize: 112, letterSpacing: "-0.035em", lineHeight: 1, color: C.ink }}>{name}</div>
  </AbsoluteFill>
);

const FinalCard: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
    <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: 380 }} />
    <div style={{ marginTop: 40, fontFamily: FONT.display, fontWeight: 800, fontSize: 72, letterSpacing: "-0.03em", color: C.ink }}>From €2.60 per order</div>
    <div style={{ marginTop: 18, fontFamily: FONT.body, fontSize: 32, color: C.ink, opacity: 0.85 }}>€0.60 per additional item in the same order · €275 minimum per month · No setup fee</div>
    <div style={{ marginTop: 26, fontFamily: FONT.display, fontWeight: 800, fontSize: 54, color: C.ink }}>dockentra.ie</div>
  </AbsoluteFill>
);

/* ------------------------------------------------------------ contact sheet */
const TW = 600, TH = 338, LAB = 46, GAP = 18, COLS = 4;
export const SHEET = { w: COLS * TW + (COLS + 1) * GAP, h: Math.ceil(FRAMES.length / COLS) * (TH + LAB + GAP) + GAP };
export const OpsStoryboardSheet: React.FC = () => (
  <AbsoluteFill style={{ background: C.white }}>
    {FRAMES.map((f, i) => {
      const x = GAP + (i % COLS) * (TW + GAP), y = GAP + Math.floor(i / COLS) * (TH + LAB + GAP);
      return (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: TW, height: TH + LAB }}>
          <div style={{ height: LAB, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, color: C.ink }}>
            <span style={{ background: C.ink, color: C.white, borderRadius: 6, padding: "2px 10px" }}>{`#${String(i + 1).padStart(2, "0")}`}</span>
            <span>{`ch ${f.ch} · ${f.tc}`}</span>
          </div>
          <div style={{ position: "relative", width: TW, height: TH, overflow: "hidden", border: `2px solid ${C.grey}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: OW, height: OH, transform: `scale(${TW / OW})`, transformOrigin: "0 0" }}>
              <OpsFrame i={i} />
            </div>
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);
