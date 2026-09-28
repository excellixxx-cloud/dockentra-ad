import { useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_APPEAR, EASE_LOGO, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { Drift, Words } from "../components/Kinetic";
import { Cue, Subtitles } from "../components/Subtitles";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import script from "./script.json";
import { buildTimeline, CIRCLE, COLS, FRI_LIT, home, LIT_AT, MISSED, N, SENT_AT, T, WAVE_AT, WED_LIT } from "./timeline";

loadBrandFonts();

export const DURATION_S = 38;
export const LOGO_IN = T.logo;

/* ------------------------------------------------------------------ camera */
const SHAKE = [0, 22, -16, 12, -7, 4, -2, 1];
function camera(t: number, fps: number) {
  const x = 16 * Math.sin(0.31 * t + 0.3) + 7 * Math.sin(0.77 * t + 1.7);
  const y = 14 * Math.sin(0.23 * t + 2.1) + 6 * Math.sin(0.61 * t);
  const f = Math.round((t - T.jerk) * fps);
  const shake = f >= 0 && f < SHAKE.length ? SHAKE[f] : 0;
  const punch = t >= T.jerk ? 0.05 * Math.exp(-(t - T.jerk) * 5) : 0;
  return { x: x + shake, y: y - shake * 0.6, zoom: 1 + punch };
}
/** Parallax: background at 85 % of the grid's motion, headlines at 108 %. */
const BG_FACTOR = 0.85;
const TYPE_FACTOR = 1.08;
const ORIGIN = "540px 900px";
type Cam = ReturnType<typeof camera>;

/* ---------------------------------------------------------------- backdrop */
const Backdrop: React.FC<{ cam: Cam }> = ({ cam }) => {
  const t = useT();
  const dx = 18 * Math.sin(t * 0.21), dy = 24 * Math.sin(t * 0.17 + 1);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ inset: -160, backgroundImage: `radial-gradient(circle, ${C.green} 3px, transparent 3.6px)`, backgroundSize: "112px 112px", opacity: 0.35, transform: `translate(${cam.x * 0.6 + dx * 0.5}px, ${cam.y * 0.6 + dy * 0.5}px)` }} />
      <AbsoluteFill style={{ inset: -160, backgroundImage: `radial-gradient(circle, ${C.green} 2px, transparent 2.6px)`, backgroundSize: "56px 56px", opacity: 0.55, transform: `translate(${cam.x * BG_FACTOR + dx}px, ${cam.y * BG_FACTOR + dy}px) scale(${1 + (cam.zoom - 1) * BG_FACTOR})`, transformOrigin: ORIGIN }} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- calendar */
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const CAL = { y: 485, w: 156, h: 70, gap: 14 };
const CAL_X0 = (1080 - (5 * CAL.w + 4 * CAL.gap)) / 2;

function dayIndex(t: number) {
  if (t >= T.plan) return lerp(4, 0, ramp(t, T.plan, 0.8, EASE_MOVE));
  if (t >= T.jerk) return 4;                                   // the jump: no easing, one frame
  return lerp(0, 2, ramp(t, T.toWed, 1.0, EASE_MOVE));         // glides through Tue to Wed
}

const Calendar: React.FC = () => {
  const t = useT();
  const d = dayIndex(t);
  const flash = t >= T.jerk && t < T.plan ? 1 + 0.18 * (1 - ramp(t, T.jerk, 0.3)) : 1;
  return (
    <>
      {DAYS.map((day, k) => {
        const a = ramp(t, 3.95 + k * 0.07, 0.45);
        const on = Math.abs(d - k) < 0.5;
        return (
          <div key={day} style={{ position: "absolute", left: CAL_X0 + k * (CAL.w + CAL.gap), top: CAL.y, width: CAL.w, height: CAL.h, borderRadius: 14, border: `2px solid rgba(255,255,255,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 28, letterSpacing: "0.12em", color: on ? C.ink : C.white, opacity: a, transform: `translateY(${(1 - a) * 30}px)`, zIndex: on ? 2 : 0 }}>
            {day}
          </div>
        );
      })}
      {t >= 3.95 && (
        <div style={{ position: "absolute", left: CAL_X0 + d * (CAL.w + CAL.gap), top: CAL.y, width: CAL.w, height: CAL.h, borderRadius: 14, background: C.white, opacity: ramp(t, 4.3, 0.3), transform: `scale(${flash})` }} />
      )}
    </>
  );
};

/* ---------------------------------------------------------------- creators */
function stateOf(i: number, t: number) {
  const col = i % COLS, row = Math.floor(i / COLS);
  const wait = ramp(t, T.confirm + (col + row) * 0.07, 0.4);
  const reset = ramp(t, T.plan, 0.35, EASE_MOVE);
  let lit = 0;
  if (i in LIT_AT && t >= LIT_AT[i]) lit = FRI_LIT.includes(i) ? 1 : ramp(t, LIT_AT[i], 0.35);
  lit = Math.max(lit * (1 - reset), ramp(t, WAVE_AT(i), 0.35));
  const grey = MISSED.includes(i) && t >= T.jerk ? 1 - ramp(t, T.plan, 0.5, EASE_MOVE) : 0;
  return { wait, lit, grey };
}

const Creator: React.FC<{ i: number; p: { x: number; y: number; s: number; r: number; o: number } }> = ({ i, p }) => {
  const t = useT();
  const { wait, lit, grey } = stateOf(i, t);
  // in the pile the grey creators keep jostling and slowly settle
  const piled = MISSED.includes(i) ? ramp(t, T.heap + 0.8, 0.4) * (1 - ramp(t, T.plan, 0.2, EASE_MOVE)) : 0;
  const settle = ramp(t, T.heap + 1.0, 4.4, EASE_MOVE);
  const jx = piled * 5 * Math.sin(t * 2.3 + i * 1.7), jy = piled * (4 * Math.sin(t * 1.9 + i) + 16 * settle), js = 1 - piled * 0.06 * settle;
  // a posted video keeps a slow pulse
  const breathe = lit > 0.99 && t < T.wipe ? 1 + 0.04 * Math.sin(t * 3.1 + i * 0.9) : 1;
  // after Friday the grey creators slowly sag, and their crosses draw in one by one
  const k = MISSED.indexOf(i);
  const sag = grey * (1 - piled) * 10 * ramp(t, T.jerk + 0.3, 5, EASE_MOVE);
  const cross = k >= 0 ? ramp(t, T.jerk + 0.15 + k * 0.09, 0.35) : 0;
  const R = CIRCLE / 2;
  const ringA = lerp(0.35, 1, wait) * (1 - grey * 0.75);
  const waiting = wait > 0.5 && lit < 0.5 && grey < 0.5 && t < T.wipe;
  const ping = waiting ? ((t * 0.7 + i * 0.137) % 1) : 0;
  const pop = lit > 0 ? lit * (1 + 0.05 * Math.sin(Math.PI * lit)) : 0;
  // labels hide while the grey creators are piled up (they would pile into a smear)
  const inHeap = MISSED.includes(i) ? ramp(t, T.heap, 0.4, EASE_MOVE) * (1 - ramp(t, T.plan + 0.3, 0.4)) : 0;
  const labelA = lerp(0.55, 1, wait) * (1 - grey * 0.6) * clamp((p.s - 0.5) / 0.4) * (1 - inHeap);
  return (
    <div style={{ position: "absolute", left: p.x + jx, top: p.y + jy + sag, opacity: p.o, transform: `rotate(${p.r}deg) scale(${p.s * js * breathe})` }}>
      <svg width={CIRCLE + 60} height={CIRCLE + 60} viewBox={`${-R - 30} ${-R - 30} ${CIRCLE + 60} ${CIRCLE + 60}`} style={{ position: "absolute", left: -R - 30, top: -R - 30, overflow: "visible" }}>
        {waiting && <circle r={R + 4 + ping * 26} fill="none" stroke={C.white} strokeWidth={2} opacity={0.45 * (1 - ping)} />}
        <circle r={R} fill={`rgba(255,255,255,${0.14 * grey})`} stroke={lit > 0.5 ? C.mint : C.white} strokeOpacity={lit > 0.5 ? 1 : ringA} strokeWidth={2.5} />
        <circle r={R * pop} fill={C.mint} />
        {lit > 0.5 && <path d="M-11 -15 L16 0 L-11 15 Z" fill={C.ink} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" opacity={clamp((lit - 0.5) * 2)}  />}
        {grey > 0.5 && (
          <>
            <path d="M-14 -14L14 14" stroke={C.white} strokeOpacity={0.4 * grey} strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp(cross * 2)} />
            <path d="M14 -14L-14 14" stroke={C.white} strokeOpacity={0.4 * grey} strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp(cross * 2 - 1)} />
          </>
        )}
      </svg>
      <div style={{ position: "absolute", left: -90, width: 180, top: R + 12, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 20, color: C.white, opacity: labelA }}>
        @creator_{String(i + 1).padStart(2, "0")}
      </div>
    </div>
  );
};

/* --------------------------------------------- the (labelled) sample pile */
const STACK = { x: 300, y: 1372, w: 58, h: 19, pitch: 21 };
const Pile: React.FC = () => {
  const t = useT();
  const sent = t >= T.jerk ? 6 : WED_LIT.filter((_, k) => t >= SENT_AT(k)).length;
  const inK = ramp(t, 10.8, 0.5) * (1 - ramp(t, T.heap - 0.2, 0.45, EASE_MOVE));
  const planSent = Array.from({ length: N }, (_, i) => i).filter((i) => t >= WAVE_AT(i) + 0.2).length;
  const planK = ramp(t, T.plan + 0.3, 0.45) * (1 - ramp(t, T.wipe - 0.1, 0.3, EASE_MOVE));
  const counter = (n: number, k: number, x: number) => (
    <div style={{ position: "absolute", left: x, top: 1296, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, color: C.white, fontFamily: FONT.mono, fontWeight: 500 }}>
      <div style={{ fontSize: 24, letterSpacing: "0.14em", opacity: 0.75 }}>SAMPLES SENT</div>
      <div style={{ fontSize: 46, marginTop: 4 }}>{String(n).padStart(2, "0")} / 20</div>
    </div>
  );
  return (
    <>
      {inK > 0 && (
        <>
          {Array.from({ length: sent }, (_, k) => {
            const a = k < 4 ? ramp(t, SENT_AT(k), 0.35) : 1;
            return (
              <div key={k} style={{ position: "absolute", left: STACK.x - STACK.w / 2, top: STACK.y - (k + 1) * STACK.pitch - (1 - a) * 50, width: STACK.w, height: STACK.h, border: `2px solid ${C.white}`, borderRadius: 4, opacity: inK * Math.min(1, a * 2), transform: `scale(${1 + 0.05 * Math.sin(Math.PI * a)})` }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: C.white, transform: "translateX(-1px)" }} />
              </div>
            );
          })}
          {counter(sent, inK, 380)}
        </>
      )}
      {planK > 0 && counter(planSent, planK, 380)}
    </>
  );
};

/** Dashed arc from the pile to the creator it reached (Wed shipments). */
const Trails: React.FC = () => {
  const t = useT();
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {WED_LIT.map((id, k) => {
        const a = ramp(t, SENT_AT(k) + 0.05, 0.5, EASE_MOVE);
        const o = 1 - ramp(t, SENT_AT(k) + 0.9, 0.4, EASE_MOVE);
        if (a <= 0 || o <= 0) return null;
        const from = { x: STACK.x, y: STACK.y - (k + 1) * STACK.pitch };
        const to = home(id);
        const cx = (from.x + to.x) / 2 - 120, cy = Math.min(from.y, to.y) - 60;
        return <path key={id} d={`M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y + CIRCLE / 2}`} fill="none" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 1" pathLength={1} strokeDashoffset={1 - a} opacity={0.8 * o} />;
      })}
    </svg>
  );
};

/* ------------------------------------------------------------- the pile label */
const HeapLabel: React.FC = () => {
  const t = useT();
  const k = ramp(t, T.heap + 0.9, 0.45) * (1 - ramp(t, T.plan, 0.35, EASE_MOVE));
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: 1290, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 32, letterSpacing: "0.12em", color: C.white, clipPath: `inset(0 ${(1 - k) * 50}% 0 ${(1 - k) * 50}%)` }}>
      14 VIDEOS NEVER POSTED
    </div>
  );
};

/* ---------------------------------------------------------------- headlines */
type Headline = { id: string; lines: string[]; start: number; exit: number | null; top?: number; size?: number; accent?: string[] };
const Headlines: React.FC<{ cam: Cam }> = ({ cam }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ transform: `translate(${cam.x * TYPE_FACTOR}px, ${cam.y * TYPE_FACTOR}px)` }}>
      {(script.headlines as Headline[]).map((h) => {
        const end = h.exit ?? DURATION_S;
        if (t < h.start - 0.05 || t > end + 0.5) return null;
        const onLight = h.id === "cta";
        return (
          <Drift key={h.id} from={h.start} to={end} dy={-26}>
            <Words lines={h.lines} top={h.top ?? 160} size={h.size ?? 84} start={h.start} exit={h.exit ?? undefined} color={onLight ? C.ink : C.white} accent={h.accent ?? []} accentColor={C.green} />
          </Drift>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------- finale */
const EndPanel: React.FC = () => {
  const t = useT();
  const r = ramp(t, T.wipe, 0.7, EASE_MOVE) * 2300;
  if (r <= 0) return null;
  return <div style={{ position: "absolute", inset: -240, background: C.grey, clipPath: `circle(${r}px at 780px 1150px)` }} />;
};

const Logo: React.FC = () => {
  const t = useT();
  const fill = t < LOGO_IN ? 0 : EASE_LOGO(clamp((t - LOGO_IN) / 0.6));
  const edge = -20 + fill * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
  return (
    <div style={{ position: "absolute", left: 340, top: 744, width: 400, WebkitMaskImage: mask, maskImage: mask, opacity: t >= LOGO_IN ? 1 : 0 }}>
      <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

/* ------------------------------------------------------------- composition */
/** freezeCamera: diagnostic render with the camera locked, used by the
 *  acceptance check to prove the objects move on their own. */
export const CreatorSamples: React.FC<{ freezeCamera?: boolean }> = ({ freezeCamera = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { tl, c } = useMemo(buildTimeline, []);
  tl.seek(t, false);
  const cam = freezeCamera ? { x: 0, y: 0, zoom: 1 } : camera(t, fps);
  // After the end card opens, the row of dots keeps a slow mint wave going.
  const dotPulse = (i: number) => (t >= T.wipe + 0.6 ? 1 + 0.35 * Math.max(0, Math.sin(t * 5.2 - i * 0.42)) : 1);
  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill>
        <Backdrop cam={cam} />
        <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`, transformOrigin: ORIGIN }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <Calendar />
          </div>
          <Pile />
          <Trails />
          <HeapLabel />
          <EndPanel />
          {c.map((p, i) => (
            <Creator key={i} i={i} p={{ ...p, s: p.s * dotPulse(i) }} />
          ))}
        </AbsoluteFill>
        <Headlines cam={cam} />
        <Logo />
        <Subtitles cues={script.subtitles as Cue[]} lightFrom={99} end={DURATION_S} />
        <Audio src={staticFile("music-creator.wav")} />
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};
