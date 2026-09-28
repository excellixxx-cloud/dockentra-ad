import { useMemo } from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { Words } from "../components/Kinetic";
import { Cue, Subtitles } from "../components/Subtitles";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import { CameraIcon, ClockIcon, Mailer, Parcel, PARCEL_H, PARCEL_W, PriceIcon, ReceiptIcon, Tag, Tile, Viewfinder } from "./Objects";
import {
  buildTimeline, GRID, HERO_FOCUS, JERK, LOGO_POINT, ORDER_DROP, RIGHT, SAMPLE_DROP, STACK, TAG_FLY, TILE_DONE, TILE_FLY,
} from "./timeline";

loadBrandFonts();

export const DURATION_S = 38;
export const LOGO_IN = 36.5;

/* ---------------------------------------------------------------- camera */
// Slow overhead drift (sums of sines — no linear motion), a push-in on the
// hero parcel, and a punch + shake on the pattern interrupt.
const SHAKE = [0, 20, -15, 11, -7, 4, -2, 1];
function camera(t: number, fps: number) {
  const x = 26 * Math.sin(0.31 * t + 0.3) + 10 * Math.sin(0.77 * t + 1.7);
  const y = 22 * Math.sin(0.23 * t + 2.1) + 8 * Math.sin(0.61 * t);
  const push = ramp(t, 14.2, 0.8, EASE_MOVE) * (1 - ramp(t, 22.6, 0.8, EASE_MOVE));
  const punch = t >= JERK ? 0.06 * Math.exp(-(t - JERK) * 5) : 0;
  const f = Math.round((t - JERK) * fps);
  const shake = f >= 0 && f < SHAKE.length ? SHAKE[f] : 0;
  return { x: x + shake, y: y - shake * 0.6, zoom: 1 + 0.08 * push + punch };
}
/** Parallax: the desk moves at 85 % of the objects, the type layer at 108 %. */
const BG_FACTOR = 0.85;
const TYPE_FACTOR = 1.08;
const ORIGIN = "540px 1000px";

/* ---------------------------------------------------------------- script */
const CUES: Cue[] = [
  [0.2, 2.5, "Creator samples are a second fulfilment stream."],
  [2.5, 4.1, "Nobody plans it."],
  [4.3, 6.3, "Everyone plans the regular orders."],
  [6.3, 8.1, "Nobody plans the creator samples."],
  [8.1, 11.1, "Different packaging: no receipt, no price, and it has to look good on an unboxing camera."],
  [11.1, 14.1, "Different deadline: the creator needs it fast, while the trend is alive."],
  [14.3, 16.6, "Same parcel, different job."],
  [16.6, 19.4, "The invoice comes out. The price comes off."],
  [19.4, 22.4, "It gets packed to look good on camera, and tagged as a creator sample."],
  [22.4, 24.1, "Then it joins the sample stream."],
  [24.3, 26.0, "Then an agency sends one request:"],
  [26.0, 30.0, "fifty creator samples."],
  [30.2, 33.3, "50 creators. 50 micro-orders. Overnight."],
  [33.4, 38.0, "If you run an agency pushing creator samples, DM me."],
];

/* ------------------------------------------------------------------ desk */
const Desk: React.FC<{ cam: ReturnType<typeof camera> }> = ({ cam }) => {
  const z = 1 + (cam.zoom - 1) * BG_FACTOR;
  const marks = [[150, 260], [930, 420], [110, 1480], [980, 1650], [520, 1760], [700, 150]];
  return (
    <AbsoluteFill style={{ background: C.grey, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${cam.x * BG_FACTOR}px, ${cam.y * BG_FACTOR}px) scale(${z})`, transformOrigin: ORIGIN }}>
        <AbsoluteFill style={{ inset: -140, backgroundImage: `radial-gradient(circle, ${C.green} 2px, transparent 2.5px)`, backgroundSize: "44px 44px", opacity: 0.16 }} />
        {marks.map(([x, y], i) => (
          <svg key={i} width={40} height={40} style={{ position: "absolute", left: x - 20, top: y - 20, opacity: 0.18 }}>
            <path d="M20 4V36M4 20H36" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
          </svg>
        ))}
        {/* Overhead desk: mint line along the top edge — the one mint accent. */}
        <div style={{ position: "absolute", left: -140, right: -140, top: -100, height: 136, background: C.mint }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ small bits */
const Counter: React.FC<{ value: number; changedAt: number; x: number; y: number }> = ({ value, changedAt, x, y }) => {
  const t = useT();
  const k = ramp(t, changedAt, 0.3);
  const fmt = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    <div style={{ position: "absolute", left: x, top: y, height: 34, overflow: "hidden", fontFamily: FONT.mono, fontWeight: 500, fontSize: 28, color: C.ink }}>
      <div style={{ transform: `translateY(${(1 - k) * 100}%)` }}>×{fmt(value)}</div>
    </div>
  );
};

const MonoRow: React.FC<{ top: number; left?: number; start: number; exit: number; icon: React.ReactNode; text: string }> = ({ top, left = 96, start, exit, icon, text }) => {
  const t = useT();
  const k = ramp(t, start, 0.5);
  const o = ramp(t, exit, 0.35, EASE_MOVE);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left, top, display: "flex", alignItems: "center", gap: 16, fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.05em", textTransform: "uppercase", color: C.ink, whiteSpace: "nowrap", transform: `translateY(${(1 - k) * 40 - o * 60}px)`, clipPath: `inset(0 ${(1 - k) * 100}% 0 ${o * 100}%)` }}>
      {icon}
      {text}
    </div>
  );
};

const Check: React.FC<{ k: number }> = ({ k }) => (
  <svg width={40} height={40} viewBox="0 0 24 24" style={{ flex: "none" }}>
    <circle cx={12} cy={12} r={10} fill="none" stroke={C.ink} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />
    <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp(k * 2 - 1)} />
  </svg>
);

/* ------------------------------------------------------------ the world */
const World: React.FC<{ tl: ReturnType<typeof buildTimeline>; cam: ReturnType<typeof camera> }> = ({ tl, cam }) => {
  const t = useT();
  const { orders, samples, pile, inv, peel, heroTag, tags, tiles } = tl;
  const hero = orders[6];

  // divider between the two fields: draws, retracts for the close-up, redraws, leaves for the finale
  const div = ramp(t, 0.3, 0.7) * (1 - ramp(t, 14.2, 0.45, EASE_MOVE)) + ramp(t, 23.0, 0.5) * (1 - ramp(t, 30.0, 0.45, EASE_MOVE));
  const labels = ramp(t, 0.5, 0.5) * (1 - ramp(t, 14.2, 0.35, EASE_MOVE)) + ramp(t, 23.0, 0.45) * (1 - ramp(t, 30.0, 0.35, EASE_MOVE));
  const empty = ramp(t, 0.6, 0.5) * (1 - ramp(t, 4.5, 0.6, EASE_MOVE));

  const ordersLanded = orders.filter((_, i) => t >= ORDER_DROP(i) + 0.55).length;
  const lastOrder = ORDER_DROP(Math.max(0, ordersLanded - 1)) + 0.55;
  const samplesLanded = samples.filter((_, i) => t >= SAMPLE_DROP(i) + 0.65).length + (t >= 23.2 ? 1 : 0);
  const stackN = t >= JERK ? 50 : samplesLanded;
  const rightChanged = t >= JERK ? JERK : t >= 23.2 ? 23.2 : SAMPLE_DROP(Math.max(0, samplesLanded - 1)) + 0.65;

  // Swing of a hanging tag after it lands: damped, plus a small idle sway.
  const swing = (land: number, ph: number) => {
    const d = t - land;
    const damped = d > 0 ? 16 * Math.exp(-2.4 * d) * Math.sin(9 * d) : 0;
    return 8 + damped + 3 * Math.sin(t * 1.3 + ph);
  };

  const tagPivot = (i: number) => {
    if (i < 5) {
      const m = samples[i];
      return { x: m.x + pile.right - 78 * m.s, y: m.y - 52 * m.s };
    }
    return { x: hero.x + pile.right - (PARCEL_W / 2 - 22) * hero.s, y: hero.y - (PARCEL_H / 2 - 16) * hero.s };
  };
  const stackSlot = (j: number) => ({ x: STACK.x, y: STACK.y - j * STACK.step });

  // The jerk: tags 6..49 appear in ~2 frames, then the stack wobbles to rest.
  const jerkK = t >= JERK ? clamp((t - JERK) / 0.07) : 0;
  const wobble = t >= JERK ? 6 * Math.exp(-1.4 * (t - JERK)) * Math.sin(12 * (t - JERK)) : 0;
  const topSwing = t >= JERK ? 12 * Math.exp(-1.2 * (t - JERK)) * Math.sin(7 * (t - JERK)) : 0;
  // next to fifty samples the order pile backs off and looks small
  const dwarf = ramp(t, 26.3, 2.9, EASE_MOVE);

  const heroMorph = ramp(t, 18.4, 1.0, EASE_MOVE);
  const strike = ramp(t, 16.9, 0.3, EASE_MOVE);

  return (
    <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`, transformOrigin: ORIGIN }}>
      {/* divider */}
      <svg width={4} height={800} style={{ position: "absolute", left: 538, top: 630, overflow: "visible" }}>
        <path d="M2 0V780" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeDasharray="10 12" pathLength={780} style={{ strokeDashoffset: 0 }} transform={`scale(1 ${div})`} />
      </svg>
      {/* field labels + counters */}
      <div style={{ opacity: labels, transform: `translateY(${(1 - labels) * -30}px)` }}>
        <div style={{ position: "absolute", left: 96, top: 650, fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", color: C.ink }}>ORDERS</div>
        <Counter value={ordersLanded} changedAt={lastOrder} x={96} y={690} />
        <div style={{ position: "absolute", left: 600, top: 650, fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", color: C.ink }}>CREATOR SAMPLES</div>
        <Counter value={stackN} changedAt={rightChanged} x={600} y={690} />
      </div>
      {/* the empty right field breathes until the first sample lands */}
      <svg width={400} height={480} style={{ position: "absolute", left: 610, top: 820, opacity: empty, overflow: "visible" }}>
        <rect x={2} y={2} width={396} height={476} rx={24} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="14 14" strokeDashoffset={14 * Math.sin(t * 1.6)} transform={`translate(200 240) scale(${1 + 0.015 * Math.sin(t * 2.2)}) translate(-200 -240)`} />
      </svg>

      {/* regular orders (hero drawn last) */}
      {orders.slice(0, 6).map((o, i) => (
        <div key={i} style={{ position: "absolute", left: o.x + pile.left - 60 * dwarf - PARCEL_W / 2, top: o.y - PARCEL_H / 2 + 30 * dwarf, width: PARCEL_W, height: PARCEL_H, transform: `rotate(${o.r}deg) scale(${o.s * (1 - 0.14 * dwarf)})`, opacity: 1 }}>
          <Parcel uid={`o${i}`} />
        </div>
      ))}

      {/* creator-sample mailers and their tags */}
      {samples.map((m, i) => (
        <div key={i} style={{ position: "absolute", left: m.x + pile.right - 100, top: m.y - 72, width: 200, height: 143, transform: `rotate(${m.r}deg) scale(${m.s})` }}>
          <Mailer />
        </div>
      ))}
      {samples.map((m, i) => {
        if (t < SAMPLE_DROP(i) + 0.4 || t >= TAG_FLY(i)) return null;
        const pv = tagPivot(i);
        return (
          <div key={i} style={{ position: "absolute", left: pv.x, top: pv.y }}>
            <Tag swing={swing(SAMPLE_DROP(i) + 0.65, i)} scale={0.8} />
          </div>
        );
      })}

      {/* hero parcel: carton → camera-ready sample */}
      <div style={{ position: "absolute", left: hero.x + (t >= 22.6 ? pile.right : pile.left) - PARCEL_W / 2, top: hero.y - PARCEL_H / 2, width: PARCEL_W, height: PARCEL_H, transform: `rotate(${hero.r}deg) scale(${hero.s})`, opacity: 1 }}>
        <Parcel uid="hero" morph={heroMorph} invoice={{ dx: inv.dx, dy: inv.dy, r: inv.r, o: t < 16.5 ? 1 : 0 }} strike={strike} peel={{ dx: peel.dx, dy: peel.dy, r: peel.r, o: t < 18.2 ? 1 : 0 }} />
        {t >= 19.8 && t < TAG_FLY(5) && (
          <div style={{ position: "absolute", left: 22 + heroTag.x, top: 16 + heroTag.y }}>
            <Tag swing={swing(20.4, 5)} scale={0.8 / 0.85} />
          </div>
        )}
      </div>

      {/* viewfinder around the camera-ready parcel */}
      {t >= 20.9 && t < 22.7 && (
        <div style={{ position: "absolute", left: HERO_FOCUS.x, top: HERO_FOCUS.y }}>
          <Viewfinder k={ramp(t, 20.9, 0.3) * (1 - ramp(t, 22.35, 0.3, EASE_MOVE))} w={PARCEL_W * HERO_FOCUS.s + 90} h={PARCEL_H * HERO_FOCUS.s + 90} dot={0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 5))} />
        </div>
      )}

      {/* tag stack: 6 tags fly in along arcs, then the jerk to 50 */}
      {t >= TAG_FLY(0) &&
        Array.from({ length: t >= JERK ? 50 : 6 }, (_, j) => {
          if (j < 6 && t < TAG_FLY(j)) return null;
          if (t >= TILE_FLY(j)) return null;
          let x: number, y: number, s = 0.8;
          if (j < 6) {
            const g = tags[j];
            const a = tagPivot(j), b = stackSlot(j);
            const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 220;
            const u = g.k;
            x = (1 - u) ** 2 * a.x + 2 * (1 - u) * u * cx + u * u * b.x;
            y = (1 - u) ** 2 * a.y + 2 * (1 - u) * u * cy + u * u * b.y;
            s = 0.8 * g.s;
          } else {
            const b = stackSlot(j);
            x = b.x;
            y = lerp(stackSlot(5).y, b.y, jerkK);
          }
          const top = j === (t >= JERK ? 49 : 5);
          const lean = wobble * (j / 49);
          return (
            <div key={j} style={{ position: "absolute", left: x + lean * 6, top: y }}>
              <Tag swing={j < 6 && tags[j].k < 1 ? 8 + 20 * (1 - tags[j].k) : -2 + lean + (top ? topSwing : 0)} scale={s} label={top} />
            </div>
          );
        })}

      {/* 50 micro-orders */}
      {t >= TILE_FLY(0) &&
        tiles.map((g, i) => {
          if (g.k <= 0) return null;
          const a = stackSlot(i);
          const col = i % GRID.cols, row = Math.floor(i / GRID.cols);
          const b = { x: GRID.x0 + col * GRID.dx, y: GRID.y0 + row * GRID.dy };
          const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 260;
          const u = g.k;
          let x = (1 - u) ** 2 * (a.x + 40) + 2 * (1 - u) * u * cx + u * u * b.x;
          let y = (1 - u) ** 2 * (a.y + 30) + 2 * (1 - u) * u * cy + u * u * b.y;
          x = lerp(x, LOGO_POINT.x, g.out);
          y = lerp(y, LOGO_POINT.y, g.out);
          const s = g.s * (1 - g.out);
          if (s <= 0.001) return null;
          return (
            <div key={i} style={{ position: "absolute", left: x - 36, top: y - 26, width: 72, height: 52, transform: `scale(${s}) rotate(${(1 - u) * 14 + g.out * 90}deg)`, opacity: Math.min(1, u * 3) }}>
              <Tile done={ramp(t, TILE_DONE(i), 0.25)} />
            </div>
          );
        })}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------- the type layer */
const TypeLayer: React.FC<{ tl: ReturnType<typeof buildTimeline>; cam: ReturnType<typeof camera> }> = ({ tl, cam }) => {
  const t = useT();
  const ink = { color: C.ink, accentColor: C.green, size: 88 };
  const { card } = tl;
  const clockTicks = (t - 11.6) * 2;
  const clockAngle = t < 11.6 ? 0 : 60 * (Math.floor(clockTicks) + EASE_APPEAR(clamp((clockTicks % 1) / 0.35)));
  return (
    <AbsoluteFill style={{ transform: `translate(${cam.x * TYPE_FACTOR}px, ${cam.y * TYPE_FACTOR}px)` }}>
      <Sequence from={0} durationInFrames={Math.round(4.4 * 30)} layout="none">
        <Words {...ink} lines={["Creator samples", "are a second", "fulfilment stream."]} top={170} start={0.15} exit={3.85} />
        <Words {...ink} lines={["Nobody plans it."]} top={470} start={2.4} exit={3.95} accent={["Nobody"]} />
      </Sequence>
      <Sequence from={Math.round(4.2 * 30)} durationInFrames={Math.round(4.0 * 30)} layout="none">
        <Words {...ink} size={84} lines={["Everyone plans", "the orders."]} top={170} start={4.3} exit={7.8} />
        <Words {...ink} size={84} lines={["Nobody plans", "the samples."]} top={370} start={6.3} exit={7.85} accent={["Nobody"]} />
      </Sequence>
      <Sequence from={Math.round(8.0 * 30)} durationInFrames={Math.round(6.3 * 30)} layout="none">
        <Words {...ink} size={72} lines={["Different packaging."]} top={180} start={8.1} exit={13.85} accent={["packaging"]} />
        <MonoRow top={286} start={8.6} exit={13.8} icon={<ReceiptIcon cross={ramp(t, 8.9, 0.35, EASE_MOVE)} />} text="No receipt" />
        <MonoRow left={500} top={286} start={9.2} exit={13.82} icon={<PriceIcon cross={ramp(t, 9.5, 0.35, EASE_MOVE)} />} text="No price" />
        <MonoRow top={350} start={9.8} exit={13.8} icon={<CameraIcon />} text="Camera-ready" />
        <Words {...ink} size={72} lines={["Different deadline."]} top={430} start={11.1} exit={13.9} />
        <MonoRow top={530} start={11.6} exit={13.85} icon={<ClockIcon angle={clockAngle} />} text="Fast — while the trend is alive" />
      </Sequence>
      <Sequence from={Math.round(14.2 * 30)} durationInFrames={Math.round(8.8 * 30)} layout="none">
        <Words {...ink} lines={["Same parcel.", "Different job."]} top={170} start={14.3} exit={22.45} accent={["Different"]} />
        {[
          ["Invoice — out", 15.5],
          ["Price — off", 16.95],
          ["Packed for the camera", 18.5],
          ["Tagged: creator sample", 19.9],
        ].map(([label, at], i) => (
          <MonoRow key={i} top={390 + i * 56} start={at as number} exit={22.35 + i * 0.04} icon={<Check k={ramp(t, (at as number) + 0.15, 0.45)} />} text={label as string} />
        ))}
      </Sequence>
      {/* agency request card */}
      {t >= 24.2 && t < 30.2 && (
        <div style={{ position: "absolute", left: card.x - 390, top: card.y - 120, width: 780, height: 240, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 24, transform: `rotate(${card.r}deg) scale(${card.s})`, padding: "30px 36px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", color: C.ink }}>
            <span>NEW REQUEST · AGENCY</span>
            <span style={{ opacity: 0.5 + 0.5 * Math.sin(t * 6) ** 2 }}>●</span>
          </div>
          <div style={{ marginTop: 26, fontFamily: FONT.display, fontWeight: 800, fontSize: 76, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1 }}>
            {t < JERK ? "Creator samples" : <><span style={{ color: C.green, position: "relative" }}>50<span style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 6, borderRadius: 3, background: C.green, transform: `scaleX(${ramp(t, 26.3, 0.6)})`, transformOrigin: "left" }} /></span> creator samples</>}
          </div>
        </div>
      )}
      <Sequence from={Math.round(30.2 * 30)} durationInFrames={Math.round(3.4 * 30)} layout="none">
        <Words {...ink} size={92} lines={["50 creators."]} top={170} start={30.3} exit={33.15} />
        <Words {...ink} size={92} lines={["50 micro-orders."]} top={275} start={31.0} exit={33.2} />
        <Words {...ink} size={92} lines={["Overnight."]} top={380} start={31.8} exit={33.25} accent={["Overnight"]} />
      </Sequence>
      <Sequence from={Math.round(33.3 * 30)} durationInFrames={Math.round(3.4 * 30)} layout="none">
        <Words {...ink} size={76} lines={["If you run an agency", "pushing creator", "samples, DM me."]} top={180} start={33.4} exit={36.2} accent={["DM", "me"]} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- logo */
const HANDLE = "@dockentra.ie";   // the TikTok account from dockentra.ie — where the DM goes

const Logo: React.FC = () => {
  const t = useT();
  const typed = Math.floor(clamp((t - 37.05) * 22, 0, HANDLE.length));
  const rule = ramp(t, 37.55, 0.4);
  const fill = t < LOGO_IN ? 0 : EASE_LOGO(clamp((t - LOGO_IN) / 0.6));
  const edge = -20 + fill * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
  return (
    <>
    <div style={{ position: "absolute", left: LOGO_POINT.x - 200, top: LOGO_POINT.y - 156, width: 400, WebkitMaskImage: mask, maskImage: mask, opacity: t >= LOGO_IN ? 1 : 0 }}>
      <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
    </div>
    <div style={{ position: "absolute", left: 0, width: 1080, top: LOGO_POINT.y + 190, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 34, letterSpacing: "0.04em", color: C.ink }}>
      <span style={{ position: "relative", display: "inline-block" }}>
        {HANDLE.slice(0, typed)}
        <span style={{ visibility: "hidden" }}>{HANDLE.slice(typed)}</span>
        <span style={{ position: "absolute", left: 0, right: 0, bottom: -8, height: 3, background: C.ink, transform: `scaleX(${rule})`, transformOrigin: "left" }} />
      </span>
    </div>
    </>
  );
};

/* ---------------------------------------------------------- composition */
/** freezeCamera: diagnostic render with the camera locked, used by the
 *  acceptance check to prove the objects move on their own. */
export const CreatorSamples: React.FC<{ freezeCamera?: boolean }> = ({ freezeCamera = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tl = useMemo(buildTimeline, []);
  tl.tl.seek(t, false);
  const cam = freezeCamera ? { x: 0, y: 0, zoom: 1 } : camera(t, fps);
  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill>
        <Desk cam={cam} />
        <World tl={tl} cam={cam} />
        <TypeLayer tl={tl} cam={cam} />
        <Sequence from={Math.round(36.3 * fps)} layout="none" name="Logo"><Logo /></Sequence>
        <Subtitles cues={CUES} lightFrom={0} end={DURATION_S} />
        <Audio src={staticFile("music-creator.wav")} />
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};
