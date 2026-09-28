import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../brand";
import { loadBrandFonts } from "../fonts";
import { iso } from "./iso";
import { CAGE, DAMAGED, JARS, PACK, RECV, Room, RoomState, SHELF } from "./Room";

loadBrandFonts();

export const DURATION_S = 28;

/** Where the camera looks (a world point) and how close it is. */
type Cam = { x: number; y: number; z: number; zoom: number };
/** Screen point the camera target lands on: the lower two-thirds, under the headline. */
const ANCHOR = { x: 540, y: 1150 };

export type Pose = {
  cam: Cam;
  room: RoomState;
  headline: string[];
  subtitle?: string;
  thumb?: boolean;
  plaque?: boolean;
  order?: boolean;
  price?: boolean;
  logo?: boolean;
};

const base: RoomState = {
  carton: 0, jarsOnTable: 0, damagedMark: false, flash: 0, jarsOnShelf: 0, highlightCells: false,
  pickedFromShelf: false, mailer: "none", taped: false, label: "none", cageOut: 0, hand: null,
};

/** The seven approved key frames — the animation will move between these. */
export const POSES: Pose[] = [
  { // 1 — wide
    cam: { x: 30, y: 20, z: 2, zoom: 1.03 },
    room: { ...base, carton: 1, jarsOnShelf: 0 },
    headline: ["Your orders.", "Packed in Limerick."],
    subtitle: "This is Dockentra, a fulfilment warehouse in Limerick",
  },
  { // 2 — receiving
    cam: { x: 17.5, y: 21.5, z: 10, zoom: 2.35 },
    room: { ...base, carton: 1, jarsOnTable: 12, damagedMark: true, flash: 1, hand: "carton" },
    headline: ["Every delivery", "photographed on arrival."],
    subtitle: "for TikTok Shop and Shopify brands.",
    thumb: true,
  },
  { // 3 — the message to the brand
    cam: { x: 20.5, y: 21.5, z: 10, zoom: 1.9 },
    room: { ...base, carton: 1, jarsOnTable: 12, damagedMark: true },
    headline: ["You know before", "your customer does."],
    plaque: true,
  },
  { // 4 — storage
    cam: { x: 10, y: 4, z: 9, zoom: 2.2 },
    room: { ...base, carton: 0, jarsOnShelf: 12, highlightCells: true },
    headline: ["Stored and counted."],
    subtitle: "We store it, pick it, pack it and ship it.",
  },
  { // 5 — order, pick, pack
    cam: { x: 41, y: 23, z: 10, zoom: 2.4 },
    room: { ...base, jarsOnShelf: 12, pickedFromShelf: true, mailer: "scale", taped: true, label: "printing", hand: "packing" },
    headline: ["Picked, packed, labelled."],
    subtitle: "We store it, pick it, pack it and ship it.",
    order: true,
  },
  { // 6 — dispatch
    cam: { x: 48, y: 6.5, z: 8, zoom: 2.6 },
    room: { ...base, jarsOnShelf: 11, mailer: "cage", cageOut: 0.55, hand: "cage" },
    headline: ["Out to your customer."],
  },
  { // 7 — wide again, price, logo
    cam: { x: 30, y: 20, z: -2, zoom: 1.0 },
    room: { ...base, jarsOnShelf: 11, cageOut: 0 },
    headline: ["From €2.60 per order", "dockentra.ie"],
    price: true,
    logo: true,
  },
];

/* ------------------------------------------------------------ helpers */
export const toScreen = (cam: Cam, x: number, y: number, z: number) => {
  const p = iso(x, y, z), c = iso(cam.x, cam.y, cam.z);
  return { x: ANCHOR.x + (p.X - c.X) * cam.zoom, y: ANCHOR.y + (p.Y - c.Y) * cam.zoom };
};

const Card: React.FC<{ x: number; y: number; w: number; children: React.ReactNode; tail?: { x: number; y: number } }> = ({ x, y, w, children, tail }) => (
  <>
    {tail && (
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x + w / 2} y1={y + 40} x2={tail.x} y2={tail.y} stroke={C.ink} strokeWidth={2} strokeDasharray="6 6" />
        <circle cx={tail.x} cy={tail.y} r={6} fill={C.ink} />
      </svg>
    )}
    <div style={{ position: "absolute", left: x, top: y, width: w, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 18, padding: "20px 24px", boxSizing: "border-box", boxShadow: `6px 6px 0 ${C.ink}` }}>{children}</div>
  </>
);

/* ------------------------------------------------------------ frame */
export const WarehouseFrame: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { cam, room } = pose;
  const c = iso(cam.x, cam.y, cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`;
  const dmg = JARS[DAMAGED];
  const dm = toScreen(cam, dmg[0], dmg[1], RECV.top + 1.9);
  const camHead = toScreen(cam, RECV.x0 + 8.1, RECV.y0 + 4.9, RECV.top + 9.2);
  const a2 = toScreen(cam, SHELF.x0 + 6, SHELF.y1, SHELF.levels[1] + 3);
  const table = toScreen(cam, RECV.x1, RECV.y1, RECV.top);
  const shelfTop = toScreen(cam, SHELF.x0 + 6, SHELF.y1, SHELF.levels[1] + 6);
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g transform={tf}>
          <Room s={room} />
        </g>
        {/* camera flash above the receiving table */}
        {room.flash > 0 && (
          <g transform={`translate(${camHead.x} ${camHead.y + 10})`} opacity={room.flash}>
            {Array.from({ length: 9 }, (_, i) => {
              const a = Math.PI * (0.1 + (i / 8) * 0.8);
              return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 70} y2={Math.sin(a) * 70} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />;
            })}
          </g>
        )}
      </svg>

      {/* damaged mark — the scene's one mint accent */}
      {room.damagedMark && (
        <div style={{ position: "absolute", left: dm.x - 8, top: dm.y - 86, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ background: C.mint, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 12px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.08em", color: C.ink }}>DAMAGED</div>
          <div style={{ width: 2, height: 34, background: C.ink, marginLeft: 8 }} />
        </div>
      )}

      {/* batch photo thumbnail */}
      {pose.thumb && (
        <div style={{ position: "absolute", right: 60, top: 560, width: 300, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 12, padding: 12, boxShadow: `6px 6px 0 ${C.ink}` }}>
          <svg width={274} height={170} viewBox="0 0 274 170">
            <rect x={1} y={1} width={272} height={168} rx={6} fill={C.grey} stroke={C.ink} strokeWidth={2} />
            {Array.from({ length: 12 }, (_, i) => {
              const col = Math.floor(i / 3), row = i % 3;
              return <circle key={i} cx={52 + col * 56} cy={40 + row * 45} r={15} fill={i === DAMAGED ? C.mint : C.white} stroke={C.ink} strokeWidth={2} />;
            })}
          </svg>
          <div style={{ marginTop: 10, fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.1em", color: C.ink }}>BATCH PHOTO</div>
        </div>
      )}

      {/* message to the brand */}
      {pose.plaque && (
        <Card x={430} y={600} w={590} tail={{ x: table.x - 40, y: table.y - 30 }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", color: C.ink, opacity: 0.7 }}>SENT TO YOU</div>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 52, letterSpacing: "-0.02em", color: C.ink, marginTop: 8, lineHeight: 1.1 }}>120 units, 2 damaged</div>
        </Card>
      )}

      {pose.room.highlightCells && (
        <div style={{ position: "absolute", left: a2.x - 20, top: a2.y - 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "8px 16px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.06em", color: C.ink, boxShadow: `4px 4px 0 ${C.ink}` }}>A2 · 120 units</div>
          <div style={{ width: 2, height: 60, background: C.ink, marginLeft: 20 }} />
        </div>
      )}
      {/* new order, above the shelving */}
      {pose.order && (
        <Card x={60} y={560} w={560} tail={{ x: shelfTop.x, y: shelfTop.y }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", color: C.ink, opacity: 0.7 }}>NEW ORDER</div>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 48, color: C.ink, marginTop: 6 }}>TikTok Shop</div>
        </Card>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 620, background: `linear-gradient(${C.white} 0%, ${C.white} 72%, rgba(255,255,255,0) 100%)` }} />
      {/* headline, top third */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 150, fontFamily: FONT.display, fontWeight: 800, fontSize: pose.price ? 76 : 84, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.ink }}>
        {pose.headline.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {/* logo */}
      {pose.logo && (
        <div style={{ position: "absolute", left: 420, top: 360, width: 240 }}>
          <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
        </div>
      )}

      {/* voice subtitle: small, a different style, never the headline */}
      {pose.subtitle && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 860, background: "rgba(255,255,255,0.92)", border: `2px solid ${C.grey}`, borderRadius: 20, padding: "10px 22px", textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: C.ink }}>
            {pose.subtitle}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Still preview of one key frame (1..7). */
export const WarehouseKeyframe: React.FC<{ scene: number }> = ({ scene }) => <WarehouseFrame pose={POSES[Math.max(1, Math.min(7, scene)) - 1]} />;

export { CAGE, PACK, SHELF };
