import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, ramp } from "../brand";
import { Drift, Words } from "../components/Kinetic";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import { iso } from "./iso";
import { DAMAGED, JARS, RECV, Room, SHELF } from "./Room";
import script from "./script.json";
import { buildCamera, Cam, DURATION_S, ON_TABLE, roomAt, T } from "./timeline";

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
  const cam: Cam = { ...camTl.cam, x: camTl.cam.x + 0.25 * Math.sin(t * 0.7), y: camTl.cam.y + 0.2 * Math.sin(t * 0.53 + 1) };
  const room = roomAt(t);
  const c = iso(cam.x, cam.y, cam.z);
  const tf = `translate(${ANCHOR.x} ${ANCHOR.y}) scale(${cam.zoom}) translate(${-c.X} ${-c.Y})`;

  const lens = toScreen(cam, RECV.x0 + 8.1, RECV.y0 + 4.9, RECV.top + 9.2);
  const tableCorner = toScreen(cam, RECV.x1, RECV.y1, RECV.top);
  const a2 = toScreen(cam, SHELF.x0 + 6, SHELF.y1, SHELF.levels[1] + 3);
  const shelfTop = toScreen(cam, SHELF.x0 + 10, SHELF.y1, SHELF.levels[2] + 4);
  const flash = t >= T.flash ? 1 - ramp(t, T.flash, 0.45, EASE_MOVE) : 0;
  const whiteout = t >= T.flash && t < T.flash + 0.2 ? 0.65 * (1 - ramp(t, T.flash + 0.07, 0.12, EASE_MOVE)) : 0;
  const dmgK = life(t, T.damaged, T.collapse);
  const dmgPts = DAMAGED.map((i) => { const p = ON_TABLE(i); return toScreen(cam, p.x, p.y, p.z + 1.8); });

  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill style={{ background: C.white }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <g transform={tf}>
            <Room s={room} />
          </g>
          {/* damaged jars: mint ring on the lid — the scene's one mint accent */}
          {dmgK > 0 && dmgPts.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={11 * cam.zoom} ry={6.5 * cam.zoom} fill="none" stroke={C.mint} strokeWidth={5} opacity={dmgK} />
          ))}
          {/* camera flash: rays fanning out under the lens */}
          {flash > 0 && (
            <g transform={`translate(${lens.x} ${lens.y + 10}) scale(${0.7 + 0.5 * (1 - flash)})`} opacity={flash}>
              {Array.from({ length: 9 }, (_, i) => {
                const a = Math.PI * (0.1 + (i / 8) * 0.8);
                return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 70} y2={Math.sin(a) * 70} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />;
              })}
            </g>
          )}
        </svg>
        {whiteout > 0 && <AbsoluteFill style={{ background: C.white, opacity: whiteout }} />}

        {dmgK > 0 && (
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
        <Card x={430} y={600} w={590} k={life(t, T.plaque, T.toShelf, 0.45)} tail={{ x: tableCorner.x - 40, y: tableCorner.y - 30 }}>
          <Mono>SENT TO YOU</Mono>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 52, letterSpacing: "-0.02em", color: C.ink, marginTop: 8, lineHeight: 1.1 }}>120 units, 2 damaged</div>
        </Card>

        {/* storage: the counted cell */}
        {(() => {
          const k = life(t, T.chip, T.order, 0.4);
          if (k <= 0) return null;
          return (
            <div style={{ position: "absolute", left: a2.x - 20, top: a2.y - 150, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
              <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "8px 16px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.06em", color: C.ink, boxShadow: `4px 4px 0 ${C.ink}` }}>A2 · 120 units</div>
              <div style={{ width: 2, height: 60, background: C.ink, marginLeft: 20 }} />
            </div>
          );
        })()}

        {/* a new order pops up over the shelving and travels with the room */}
        <Card x={shelfTop.x - 280} y={shelfTop.y - 170} w={560} k={life(t, T.order, T.toPack + 0.6, 0.45)}>
          <Mono>NEW ORDER</Mono>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 48, color: C.ink, marginTop: 6 }}>TikTok Shop</div>
        </Card>

        {/* headline, top third, on a white fade so it never lies on linework */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 620, background: `linear-gradient(${C.white} 0%, ${C.white} 72%, rgba(255,255,255,0) 100%)` }} />
        {(script.headlines as Headline[]).map((h) => {
          const end = h.exit ?? DURATION_S;
          if (t < h.start - 0.05 || t > end + 0.6) return null;
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
            <div style={{ position: "absolute", left: 420, top: 360, width: 240, WebkitMaskImage: mask, maskImage: mask }}>
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
            <div style={{ maxWidth: 860, background: "rgba(255,255,255,0.92)", border: `2px solid ${C.grey}`, borderRadius: 20, padding: "10px 22px", textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: C.ink }}>
              {text}
            </div>
          </div>
        );
      })}
    </>
  );
};
