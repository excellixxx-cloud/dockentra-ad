import gsap from "gsap";
import { useMemo } from "react";
import { useVideoConfig, useCurrentFrame } from "remotion";
import { C, EASE_APPEAR, EASE_MOVE, FONT, clamp, lerp, ramp } from "../brand";
import { inPause, PAUSE, useT } from "../time";
import { BoxIcon, MailerIcon, PolybagIcon, PressArrow } from "./Icons";
import { Mark } from "./Kinetic";

type P = { x: number; y: number; s: number; o: number; r: number };
const ORDER = ["polybag", "mailer", "box"] as const;
type Name = (typeof ORDER)[number];

export const ROW_Y = 1150;
export const SLOTS = [230, 540, 850];
const FOCUS = { x: 540, y: 930, s: 1.75 };
const MINI_Y = 1330;
const MINI_S = 0.42;
const SIZE = 240;

/**
 * Every icon trajectory in the film lives on ONE paused GSAP timeline.
 * Remotion drives it: each frame seeks it to frame/fps, so the timeline is
 * deterministic and every render worker produces identical frames.
 * Arcs come from giving x and y different eases; overshoot from a
 * 1.05 → 1.0 scale keyframe; the mailer's spring from elastic.out; the
 * box slam from a hard set + power4.in fall (the pattern interrupt).
 */
function buildTimeline() {
  const st: Record<Name, P> = {
    polybag: { x: 120, y: -340, s: 0.9, o: 1, r: -16 },
    mailer: { x: 640, y: -380, s: 0.9, o: 1, r: 12 },
    box: { x: 960, y: -420, s: 0.9, o: 1, r: -9 },
  };
  const chips = { cos: { x: -300, y: ROW_Y - 230 }, book: { x: 1180, y: ROW_Y - 230 } };
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });

  // 0:02 — the three icons are thrown in from above along arcs, overshoot on landing.
  ORDER.forEach((n, i) => {
    const at = 2.0 + i * 0.12;
    tl.to(st[n], { x: SLOTS[i], duration: 0.7, ease: "power1.out" }, at)
      .to(st[n], { y: ROW_Y, duration: 0.7, ease: "power3.in" }, at)
      .to(st[n], { r: 0, duration: 0.7, ease: "power2.out" }, at)
      .to(st[n], { s: 1.05, duration: 0.7, ease: "power2.in" }, at)
      .to(st[n], { s: 1, duration: 0.22, ease: "power2.out" }, at + 0.7);
  });

  // 0:04 — polybag arcs to the centre; the others shrink away along arcs.
  tl.to(st.polybag, { x: FOCUS.x, duration: 0.7, ease: "power1.inOut" }, 4.0)
    .to(st.polybag, { y: FOCUS.y, duration: 0.7, ease: "power3.out" }, 4.0)
    .to(st.polybag, { s: FOCUS.s * 1.05, duration: 0.55, ease: "power2.out" }, 4.0)
    .to(st.polybag, { s: FOCUS.s, duration: 0.22, ease: "power2.inOut" }, 4.55);
  tl.to(st.mailer, { x: 700, s: MINI_S, o: 0.35, duration: 0.6, ease: "power2.inOut" }, 4.0)
    .to(st.mailer, { y: MINI_Y, duration: 0.6, ease: "power1.in" }, 4.0);
  tl.to(st.box, { x: 860, s: MINI_S, o: 0.35, duration: 0.6, ease: "power2.inOut" }, 4.06)
    .to(st.box, { y: MINI_Y, duration: 0.6, ease: "power1.in" }, 4.06);

  // 0:12 — the mailer springs into focus; the polybag arcs down-left.
  tl.to(st.mailer, { x: FOCUS.x, duration: 0.7, ease: "power1.inOut" }, 12.0)
    .to(st.mailer, { y: FOCUS.y, duration: 0.7, ease: "power3.out" }, 12.0)
    .to(st.mailer, { s: FOCUS.s, duration: 1.1, ease: "elastic.out(1, 0.42)" }, 12.0)
    .to(st.mailer, { o: 1, duration: 0.25, ease: "power1.out" }, 12.0);
  tl.to(st.polybag, { x: 220, s: MINI_S, o: 0.35, duration: 0.6, ease: "power2.inOut" }, 12.0)
    .to(st.polybag, { y: MINI_Y, duration: 0.6, ease: "power1.in" }, 12.0);

  // 0:20 — PATTERN INTERRUPT: hard cut. Everything jumps, the box slams down.
  tl.set(st.polybag, { x: 220, y: MINI_Y, s: MINI_S, o: 0.35, r: 0 }, 20.0)
    .set(st.mailer, { x: 380, y: MINI_Y, s: MINI_S, o: 0.35, r: 0 }, 20.0)
    .set(st.box, { x: FOCUS.x, y: -380, s: FOCUS.s, o: 1, r: 0 }, 20.0)
    .to(st.box, { y: FOCUS.y, duration: 0.24, ease: "power4.in" }, 20.0);

  // 0:26.6 — all three arc back into the row, overshoot, and are still by 27.0.
  ORDER.forEach((n, i) => {
    const at = 26.6;
    tl.to(st[n], { x: SLOTS[i], o: 1, duration: 0.4, ease: "power2.inOut" }, at)
      .to(st[n], { y: ROW_Y, duration: 0.4, ease: "power1.out" }, at)
      .to(st[n], { s: 1.05, duration: 0.3, ease: "power2.out" }, at)
      .to(st[n], { s: 1, duration: 0.1, ease: "power2.inOut" }, at + 0.3);
  });

  // 0:29 / 0:31 — category chips fly along arcs to the icon they belong to.
  tl.to(chips.cos, { x: SLOTS[0] - 108, duration: 0.8, ease: "power2.inOut" }, 29.1)
    .to(chips.cos, { keyframes: [{ y: ROW_Y - 330, duration: 0.4, ease: "power1.out" }, { y: ROW_Y - 230, duration: 0.4, ease: "power1.in" }] }, 29.1);
  tl.to(chips.book, { x: SLOTS[2] - 55, duration: 0.8, ease: "power2.inOut" }, 31.1)
    .to(chips.book, { keyframes: [{ y: ROW_Y - 330, duration: 0.4, ease: "power1.out" }, { y: ROW_Y - 230, duration: 0.4, ease: "power1.in" }] }, 31.1);

  // 0:33 — the icons spiral into one point: where the end card will open from.
  ORDER.forEach((n, i) => {
    const at = 33.0 + i * 0.06;
    tl.to(st[n], { x: 540, duration: 0.55, ease: "power2.in" }, at)
      .to(st[n], { keyframes: [{ y: ROW_Y - 90, duration: 0.28, ease: "power1.out" }, { y: ROW_Y, duration: 0.27, ease: "power1.in" }] }, at)
      .to(st[n], { s: 0, r: (i - 1) * 120 || 90, duration: 0.55, ease: "back.in(1.6)" }, at);
  });
  return { tl, st, chips };
}

export const IconStage: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { tl, st, chips } = useMemo(buildTimeline, []);
  tl.seek(frame / fps, false);

  const live = !inPause(t) && !(t >= 26.6 && t < PAUSE[1]);
  const bob = (ph: number) => (live && t > 3 ? Math.sin(t * 2.1 + ph) * 5 : 0);

  // Polybag squash — three presses (no protection).
  const presses = [6.1, 9.4, 10.7];
  let sx = 1, sy = 1, skew = 0, pressO = 0, pressY = 0;
  for (const p of presses) {
    const k = clamp((t - p) / 0.55);
    if (k > 0 && k < 1) {
      const d = Math.sin(k * Math.PI);
      sy -= 0.2 * d; sx += 0.12 * d; skew += Math.sin(k * Math.PI * 3) * 3 * d;
    }
    const a = clamp((t - (p - 0.35)) / 0.35), b = clamp((t - (p + 0.55)) / 0.3);
    if (a > 0 && b < 1) {
      pressO = Math.max(pressO, EASE_APPEAR(a) * (1 - b));
      pressY = lerp(-30, 0, EASE_APPEAR(a)) + Math.sin(clamp((t - p) / 0.55) * Math.PI) * 26;
    }
  }
  const pbFocus = t >= 4.3 && t < 12;

  // Mailer drop test (17.4 s): lift, fall, soft double bounce.
  let dropY = 0;
  if (t >= 17.4 && t < 20) {
    const up = EASE_MOVE(clamp((t - 17.4) / 0.5));
    const fall = clamp((t - 17.9) / 0.35);
    dropY = -110 * up + 110 * fall * fall;
    const land = t - 18.25;
    if (land > 0) dropY += -Math.exp(-7 * land) * Math.abs(Math.sin(land * 14)) * 22;
  }
  const ground = t >= 17.3 && t < 20 ? ramp(t, 17.3, 0.4) * (1 - ramp(t, 19.6, 0.35, EASE_MOVE)) : 0;

  // Camera shake on the box impact (20.24 s) — part of the interrupt.
  const shakeF = Math.round((t - 20.24) * fps);
  const SHAKE = [0, 16, -12, 8, -5, 3, -1];
  const shake = shakeF >= 0 && shakeF < SHAKE.length ? SHAKE[shakeF] : 0;

  const place = (p: P, extraY = 0, extra = "") => ({
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    opacity: p.o,
    transform: `translate(${p.x - SIZE / 2}px, ${p.y - SIZE / 2 + extraY}px) rotate(${p.r}deg) scale(${p.s}) ${extra}`,
    transformOrigin: "50% 50%",
  });

  // Recap verdicts + icon "wrong" nudge.
  const nudge = (at: number) => {
    const k = clamp((t - at) / 0.4);
    return k > 0 && k < 1 ? Math.sin(k * Math.PI * 4) * 7 * (1 - k) : 0;
  };
  const labelsOn = (t >= 2.9 && t < 4.0) || (t >= 27.0 && t < 33.0);
  const labelK = t < 4 ? ramp(t, 2.9, 0.3) * (1 - ramp(t, 3.85, 0.15, EASE_MOVE)) : ramp(t, 27.0, 0.01) * (1 - ramp(t, 32.8, 0.2, EASE_MOVE));

  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${shake}px)` }}>
      {/* Polybag */}
      <div style={place(st.polybag, bob(0), `translateX(${nudge(30.0)}px)`)}>
        <div style={{ width: "100%", height: "100%", transform: `scale(${sx}, ${sy}) skewX(${skew}deg)`, transformOrigin: "50% 85%" }}>
          <PolybagIcon seal={pbFocus ? 2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 4)) : 2} crinkle={pbFocus ? Math.sin(t * 7) * 0.6 : 0} />
        </div>
      </div>
      <div style={{ position: "absolute", left: FOCUS.x - 60, top: 600 + pressY, width: 120, height: 120, opacity: pressO }}>
        <PressArrow />
      </div>

      {/* Mailer */}
      <div style={place(st.mailer, dropY + (t >= 12 && t < 17.4 ? bob(1) : t < 12 ? bob(1) : 0))}>
        <MailerIcon
          bubbles={[0, 1, 2, 3, 4].map((i) => (t < 12 ? 1 : ramp(t, 12.8 + i * 0.18, 0.35)) + (t >= 12 && t < 20 ? Math.sin(t * 5 + i) * 0.1 : 0))}
        />
      </div>
      <div style={{ position: "absolute", left: 300, width: 480, top: 1210, height: 2, background: C.white, transform: `scaleX(${ground})`, opacity: ground }} />
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1232, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", textTransform: "uppercase", color: C.white, clipPath: `inset(0 ${(1 - ramp(t, 18.3, 0.4)) * 50}% 0 ${(1 - ramp(t, 18.3, 0.4)) * 50}%)`, opacity: t >= 18.3 && t < 20 ? 1 - ramp(t, 19.6, 0.35, EASE_MOVE) : 0 }}>
        Drop test · glass / ceramic
      </div>

      {/* Box — rigid: no bob once it is the hero */}
      <div style={place(st.box, t < 20 ? bob(2) : 0, `translateX(${nudge(32.0)}px) scale(${t >= 21.5 && t < 26.6 ? 1 + 0.04 * ramp(t, 21.5, 5, EASE_MOVE) : 1})`)}>
        <BoxIcon
          open={t < 20.45 ? 1 : 1 - ramp(t, 20.45, 0.6, EASE_MOVE)}
          tape={ramp(t, 21.05, 0.4)}
          lock={t >= 21.45 && t < 26.6 ? ramp(t, 21.45, 0.25) : 0}
          xray={t >= 23.5 && t < 26.6 ? ramp(t, 23.5, 0.6) * (1 - ramp(t, 26.3, 0.3, EASE_MOVE)) : 0}
          xrayOffset={-t * 4}
        />
      </div>

      {/* Row labels (hook + recap) */}
      {labelsOn &&
        ORDER.map((n) => (
          <div key={n} style={{ position: "absolute", left: 0, top: 0, width: 300, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.1em", textTransform: "uppercase", color: C.white, opacity: labelK, transform: `translate(${st[n].x - 150}px, ${st[n].y + 132 + (1 - labelK) * 16}px)` }}>
            {n}
          </div>
        ))}

      {/* Recap: category chips travel to their icon, verdicts draw in */}
      {t >= 29.0 && t < 33.0 && (
        <CatChip label="COSMETICS" x={chips.cos.x} y={chips.cos.y} o={1 - ramp(t, 32.8, 0.2, EASE_MOVE)} />
      )}
      {t >= 31.0 && t < 33.0 && <CatChip label="BOOK" x={chips.book.x} y={chips.book.y} o={1 - ramp(t, 32.8, 0.2, EASE_MOVE)} />}
      <VerdictTag text="Refund request" x={SLOTS[0]} t={t} at={30.0} />
      <VerdictTag text="Overpay" x={SLOTS[2]} t={t} at={32.0} />
    </div>
  );
};

const CatChip: React.FC<{ label: string; x: number; y: number; o: number }> = ({ label, x, y, o }) => (
  <div style={{ position: "absolute", left: 0, top: 0, padding: "12px 20px", border: `2px solid ${C.white}`, borderRadius: 12, fontFamily: FONT.mono, fontWeight: 500, fontSize: 28, letterSpacing: "0.08em", color: C.white, whiteSpace: "nowrap", opacity: o, transform: `translate(${x}px, ${y}px)` }}>
    {label}
  </div>
);

const VerdictTag: React.FC<{ text: string; x: number; t: number; at: number }> = ({ text, x, t, at }) => {
  if (t < at || t >= 33.0) return null;
  const k = ramp(t, at, 0.45);
  const o = ramp(t, 32.8, 0.2, EASE_MOVE);
  return (
    <div style={{ position: "absolute", left: x - 170, top: ROW_Y + 190, width: 340, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.1em", textTransform: "uppercase", color: C.white, opacity: 1 - o, transform: `translateY(${(1 - k) * 22}px)`, clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` }}>
      <Mark ok={false} draw={k} size={30} />
      <span>{text}</span>
    </div>
  );
};
