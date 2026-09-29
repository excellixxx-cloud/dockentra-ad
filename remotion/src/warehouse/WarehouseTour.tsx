import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, ramp } from "../brand";
import { Drift, Words } from "../components/Kinetic";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import { iso } from "./iso";
import { DAMAGED, JARS, RECV, Room, SHELF, STAND } from "./Room";
import script from "./script.json";
import { buildCamera, Cam, DURATION_S, jarAt, roomAt, SET_ASIDE, T } from "./timeline";
import { BIN } from "./Room";

loadBrandFonts();

export { DURATION_S };
export const LOGO_IN = T.logo;
/** Voice subtitles: small plate, bottom edge 250 px above the frame edge (>= 240). */
export const SUB_BOTTOM = 250;

/** Screen point the camera target lands on: the lower two-thirds, under the headline. */
const ANCHOR = { x: 540, y: 1150 };

export const toScreen = (cam: Cam, x: number, y: number, z: number) => {
  const p = iso(x, y, z), c = iso(cam.x, cam.y, cam.z);
  return { x: ANCHOR.x + (p.X - c.X) * cam.zoom, y: ANCHOR.y + (p.Y - c.Y) * cam.zoom };
};

/** Appear on the brand ease, leave on the move ease: 0 → 1 → 0. */
const life = (t: number, a: number, b: number, inDur = 0.4, outDur = 0.3) => ramp(t, a, inDur, EASE_APPEAR) * (1 - ramp(t, b, outDur, EASE_MOVE));

const Card: React.FC<{ x: number; y: number; w: number; k: number; children: React.ReactNode; tail?: { x: number; y: number } }> = ({ x, y, w, k, children, tail }) => {
  if (k <= 0.001) return null;
  const s = 0.7 + 0.3 * k + 0.05 * Math.sin(Math.PI * k); // settles with a 1.05 → 1.0 overshoot
  return (
    <>
      {tail && (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: k }}>
          <line x1={x + w / 2} y1={y + 60} x2={tail.x} y2={tail.y} stroke={C.ink} strokeWidth={2} strokeDasharray="6 6" />
          <circle cx={tail.x} cy={tail.y} r={6} fill={C.ink} />
        </svg>
      )}
      <div style={{ position: "absolute", left: x, top: y, width: w, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 18, padding: "20px 24px", boxSizing: "border-box", boxShadow: `6px 6px 0 ${C.ink}`, opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 40}px) scale(${s})`, transformOrigin: "50% 100%" }}>{children}</div>
    </>
  );
};

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", color: C.ink, opacity: 0.7 }}>{children}</div>
);

type Headline = { id: string; lines: string[]; start: number; exit: number | null; stagger: number; rise: number; out: number };

/* ------------------------------------------------------------ the film */
export const WarehouseTour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const camTl = useMemo(buildCamera, []);
  camTl.tl.seek(t, false);
  // a slight hand-held drift on top of the dolly moves
  // + a short shutter "kick" at the flash (the one sharp beat of the film)
  const kick = t >= T.flash ? 0.05 * Math.exp(-(t - T.flash) * 12) : 0;
  const cam: Cam = { ...camTl.cam, x: camTl.cam.x + 0.25 * Math.sin(t * 0.7), y: camTl.cam.y + 0.2 * Math.sin(t * 0.53 + 1), zoom: camTl.cam.zoom * (1 + kick) };
  const room = roomAt(t);
  const c = iso(cam.x, cam.y, cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`;

  const lens = toScreen(cam, STAND.head.x, STAND.head.y, STAND.lensZ);
  const lit = toScreen(cam, STAND.head.x, STAND.head.y, RECV.top + 0.1);
  const tableCorner = toScreen(cam, RECV.x1, RECV.y1, RECV.top);
  const a2 = toScreen(cam, SHELF.x0 + 6, SHELF.y1, SHELF.levels[1] + 3);
  const shelfTop = toScreen(cam, SHELF.x0 + 10, SHELF.y1, SHELF.levels[2] + 4);
  // flash: a light cone from the lens onto the rows of products, 0.3 s
  const flash = t >= T.flash && t < T.flash + 0.3 ? ramp(t, T.flash, 0.04, EASE_APPEAR) * (1 - ramp(t, T.flash + 0.22, 0.08, EASE_MOVE)) : 0;
  const coneR = { x: 1.2247 * 4.3 * 12 * cam.zoom, y: 0.7071 * 4.3 * 12 * cam.zoom };
  // finale: the warehouse steps back — 30 % and blurred — behind the logo and the price
  const dim = ramp(t, 24.9, 0.6, EASE_MOVE);
  // damaged: mint rings ride on the two jars until they drop into the hold tote
  const dmgK = life(t, T.damaged, T.setAside - 0.05, 0.35, 0.25);
  const dmgPts = DAMAGED.map((i) => { const p = jarAt(i, t); return p ? { ...toScreen(cam, p.x, p.y, p.z + 1.8), on: true } : { x: 0, y: 0, on: false }; });
  const ringK = life(t, T.damaged, SET_ASIDE(1) + 0.45, 0.35, 0.15);
  const bin = room.holdBin;
  const binTop = toScreen(cam, bin.x + BIN.w / 2, bin.y + BIN.d / 2, bin.z + BIN.h);
  const binK = life(t, SET_ASIDE(1) + 0.4, T.order - 0.1, 0.35);

  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill style={{ background: C.white }}>
        <AbsoluteFill style={{ opacity: 1 - 0.7 * dim, filter: dim > 0 ? `blur(${8 * dim}px)` : undefined }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <g transform={tf}>
            <Room s={room} />
          </g>
          {/* damaged jars: mint ring on the lid — the scene's one mint accent */}
          {ringK > 0 && dmgPts.map((p, i) => p.on && (
            <ellipse key={i} cx={p.x} cy={p.y} rx={11 * cam.zoom} ry={6.5 * cam.zoom} fill="none" stroke={C.mint} strokeWidth={5} opacity={ringK} />
          ))}
          {/* camera flash: a light cone from the lens onto the product rows */}
          {flash > 0 && (
            <g opacity={flash}>
              <polygon points={`${lens.x},${lens.y + 6} ${lit.x - coneR.x},${lit.y} ${lit.x + coneR.x},${lit.y}`} fill={C.white} fillOpacity={0.55} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
              <ellipse cx={lit.x} cy={lit.y} rx={coneR.x} ry={coneR.y} fill={C.white} fillOpacity={0.45} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
            </g>
          )}
        </svg>

        {dmgK > 0 && dmgPts[0].on && (
          <div style={{ position: "absolute", left: dmgPts[0].x - 10, top: dmgPts[0].y - 96, opacity: dmgK, transform: `translateY(${(1 - dmgK) * 20}px)` }}>
            <div style={{ background: C.mint, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 12px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.08em", color: C.ink }}>DAMAGED</div>
            <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              {dmgPts.map((p, i) => <line key={i} x1={10} y1={40} x2={p.x - dmgPts[0].x + 10} y2={p.y - dmgPts[0].y + 96 - 8} stroke={C.ink} strokeWidth={2} />)}
            </svg>
          </div>
        )}

        {/* batch photo thumbnail slides in after the flash */}
        {(() => {
          const k = life(t, T.thumb, T.toMsg + 0.1, 0.45, 0.35);
          if (k <= 0) return null;
          return (
            <div style={{ position: "absolute", right: 60, top: 560, width: 300, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 12, padding: 12, boxShadow: `6px 6px 0 ${C.ink}`, transform: `translateX(${(1 - k) * 380}px) rotate(${(1 - k) * 6}deg)` }}>
              <svg width={274} height={170} viewBox="0 0 274 170">
                <rect x={1} y={1} width={272} height={168} rx={6} fill={C.grey} stroke={C.ink} strokeWidth={2} />
                {JARS.map((_, i) => {
                  const col = Math.floor(i / 3), row = i % 3;
                  return <circle key={i} cx={52 + col * 56} cy={40 + row * 45} r={15} fill={DAMAGED.includes(i) ? C.mint : C.white} stroke={C.ink} strokeWidth={2} />;
                })}
              </svg>
              <div style={{ marginTop: 10, fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.1em", color: C.ink }}>BATCH PHOTO</div>
            </div>
          );
        })()}

        {/* the message to the brand */}
        <Card x={400} y={590} w={640} k={life(t, T.plaque, T.toShelf, 0.45)} tail={{ x: tableCorner.x - 40, y: tableCorner.y - 30 }}>
          <Mono>SENT TO YOU</Mono>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 52, letterSpacing: "-0.02em", color: C.ink, marginTop: 8, lineHeight: 1.1 }}>120 units, 2 damaged,<br />set aside</div>
        </Card>

        {/* storage: the counted cell */}
        {(() => {
          const k = life(t, T.chip, T.order, 0.4);
          if (k <= 0) return null;
          return (
            <div style={{ position: "absolute", left: a2.x - 20, top: a2.y - 150, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
              <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "8px 16px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.06em", color: C.ink, boxShadow: `4px 4px 0 ${C.ink}` }}>A2 · 118 units</div>
              <div style={{ width: 2, height: 60, background: C.ink, marginLeft: 20 }} />
            </div>
          );
        })()}

        {/* the hold tote's label travels with the tote: table edge → bottom shelf */}
        {binK > 0 && (
          <div style={{ position: "absolute", left: binTop.x - 30, top: binTop.y - 118, opacity: binK, transform: `translateY(${(1 - binK) * 18}px)` }}>
            <div style={{ background: C.mint, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 12px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.08em", color: C.ink, whiteSpace: "nowrap" }}>DAMAGED · ON HOLD</div>
            <div style={{ width: 2, height: 64, background: C.ink, marginLeft: 30 }} />
          </div>
        )}

        {/* a new order pops up over the shelving and travels with the room */}
        <Card x={shelfTop.x - 280} y={shelfTop.y - 170} w={560} k={life(t, T.order, T.toPack + 0.6, 0.45)}>
          <Mono>NEW ORDER</Mono>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 48, color: C.ink, marginTop: 6 }}>TikTok Shop</div>
        </Card>

        {/* headline, top third, on a white fade so it never lies on linework */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 620, background: `linear-gradient(${C.white} 0%, ${C.white} 72%, rgba(255,255,255,0) 100%)` }} />
        </AbsoluteFill>
        {(script.headlines as Headline[]).map((h) => {
          const end = h.exit ?? DURATION_S;
          if (t < h.start - 0.05 || t > end + 0.6) return null;
          // finale: price and address centred under the logo
          if (h.id === "s7") {
            return (
              <Drift key={h.id} from={h.start} to={end} dy={-16}>
                <Words lines={[h.lines[0]]} top={1010} size={84} center start={h.start} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
                <Words lines={[h.lines[1]]} top={1112} size={64} center start={h.start + 0.24} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
              </Drift>
            );
          }
          // the headline stands for its full time but never sits frozen: a slow drift
          return (
            <Drift key={h.id} from={h.start} to={end} dy={-22}>
              <Words lines={h.lines} top={150} left={80} size={h.id === "s7" ? 76 : 84} start={h.start} exit={h.exit ?? undefined} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
            </Drift>
          );
        })}

        {/* logo: diagonal fill, bottom-left to top-right, 600 ms, cubic-bezier(.22,1,.36,1) */}
        {t >= LOGO_IN && (() => {
          const edge = -20 + EASE_LOGO(clamp((t - LOGO_IN) / 0.6)) * 140;
          const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
          return (
            <div style={{ position: "absolute", left: 324, top: 600, width: 432, WebkitMaskImage: mask, maskImage: mask }}>
              <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
            </div>
          );
        })()}

        <VoiceSubtitles />
        <Audio src={staticFile("music-warehouse.wav")} />
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};

/** Voice subtitles: small plate at the bottom, a different style from the headline. */
const VoiceSubtitles: React.FC = () => {
  const t = useT();
  return (
    <>
      {(script.subtitles as [number, number, string][]).map(([a, b, text]) => {
        const k = life(t, a, b, 0.3, 0.2);
        if (k <= 0) return null;
        return (
          <div key={a} style={{ position: "absolute", left: 0, right: 0, bottom: SUB_BOTTOM, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 16 - 14 * ramp(t, a, b - a, EASE_MOVE)}px)` }}>
            <div style={{ maxWidth: 980, background: "rgba(255,255,255,0.92)", border: `2px solid ${C.grey}`, borderRadius: 22, padding: "12px 26px", textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 46, lineHeight: 1.3, color: C.ink }}>
              {text}
            </div>
          </div>
        );
      })}
    </>
  );
};
