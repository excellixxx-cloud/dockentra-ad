import React from "react";
import { C, EASE_APPEAR, EASE_MOVE, FONT, ramp, WORD_STAGGER } from "../brand";
import { useT } from "../time";

type WordsProps = {
  lines: string[];
  top: number;
  size: number;
  start: number;        // first word, seconds
  exit?: number;        // words leave upward from here
  accent?: string[];    // key word(s) set in the accent colour
  accentColor?: string; // mint by default; Dock Green where mint is already used elsewhere
  mode?: "rise" | "scale";
  color?: string;
  left?: number;
  lineHeight?: number;
  stagger?: number;     // seconds between words (60–90 ms)
  rise?: number;        // duration of one word's entrance
  out?: number;         // duration of one word's exit
};

/** Kinetic typography: each word rises out of its own mask (or scales
 *  down into place), 75 ms apart, on the appear ease; exits upward on the
 *  move ease with its own stagger — never a block fade. */
export const Words: React.FC<WordsProps> = ({ lines, top, size, start, exit, accent = [], accentColor = C.mint, mode = "rise", color = C.white, left = 96, lineHeight = 1.06, stagger = WORD_STAGGER, rise = 0.5, out = 0.35 }) => {
  const t = useT();
  let i = 0;
  const total = lines.join(" ").split(" ").length;
  return (
    <>
      {lines.map((line, li) => (
        <div
          key={li}
          style={{ position: "absolute", left, top: top + li * size * lineHeight, whiteSpace: "nowrap", fontFamily: FONT.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, color }}
        >
          {line.split(" ").map((word, wi) => {
            const idx = i++;
            const k = ramp(t, start + idx * stagger, rise, EASE_APPEAR);
            const o = exit === undefined ? 0 : ramp(t, exit + (total - 1 - idx) * 0.03, out, EASE_MOVE);
            const isAccent = accent.includes(word.replace(/[.,?’']/g, ""));
            const inner: React.CSSProperties =
              mode === "rise"
                ? { transform: `translateY(${(1 - k) * 112 - o * 112}%)` }
                : { transform: `translateY(${-o * 112}%) scale(${0.55 + 0.45 * k})`, transformOrigin: "50% 80%", opacity: Math.min(1, k * 2.2) };
            return (
              <React.Fragment key={wi}>
                <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0 0.04em 0.14em", margin: "0 -0.04em -0.14em" }}>
                  <span style={{ display: "inline-block", color: isAccent ? accentColor : undefined, ...inner }}>{word}</span>
                </span>
                {wi < line.split(" ").length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </>
  );
};

/** Slow camera drift for a scene's text block so nothing sits frozen:
 *  moves up and scales a touch across the whole window, on the move ease. */
export const Drift: React.FC<{ from: number; to: number; dy?: number; children: React.ReactNode }> = ({ from, to, dy = -44, children }) => {
  const t = useT();
  const k = ramp(t, from, to - from, EASE_MOVE);
  return <div style={{ position: "absolute", inset: 0, transform: `translateY(${dy * k}px) scale(${1 + 0.018 * k})`, transformOrigin: "96px 0" }}>{children}</div>;
};

type TitleStep = { at: number; type: "type" | "erase" | "cut"; text?: string; cps?: number };

/** One persistent title that is typed, erased and retyped between scenes
 *  (a shared element), or hard-cut for the pattern interrupt. */
export const MorphTitle: React.FC<{ steps: TitleStep[]; top: number; size: number }> = ({ steps, top, size }) => {
  const t = useT();
  let text = "";
  let busy = false;
  let slam = 1;
  for (const s of steps) {
    if (t < s.at) break;
    if (s.type === "type") {
      const n = Math.floor((t - s.at) * (s.cps ?? 16));
      text = s.text!.slice(0, Math.min(n, s.text!.length));
      busy = n < s.text!.length;
    } else if (s.type === "erase") {
      const from = text;
      const n = Math.floor((t - s.at) * (s.cps ?? 26));
      text = from.slice(0, Math.max(0, from.length - n));
      busy = text.length > 0;
    } else {
      text = s.text!;
      busy = false;
      slam = 1 + 0.45 * (1 - ramp(t, s.at, 0.2, EASE_APPEAR));
    }
  }
  const caretOn = busy || Math.floor(t * 2.5) % 2 === 0;
  return (
    <div
      style={{ position: "absolute", left: 96, top, fontFamily: FONT.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, color: C.white, whiteSpace: "nowrap", transform: `scale(${slam})`, transformOrigin: "left center" }}
    >
      {text}
      <span style={{ display: "inline-block", width: "0.08em", height: "0.82em", background: C.white, marginLeft: "0.06em", verticalAlign: "-0.04em", opacity: caretOn ? 1 : 0 }} />
    </div>
  );
};

/** Mono chips that slide in from the right one after another and leave to
 *  the left like a conveyor. */
export const Chips: React.FC<{ items: string[]; top: number; start: number; exit?: number; stagger?: number; stamp?: boolean }> = ({ items, top, start, exit, stagger = 0.09, stamp = false }) => {
  const t = useT();
  return (
    <div style={{ position: "absolute", left: 96, top, display: "flex", gap: 20 }}>
      {items.map((label, i) => {
        const k = ramp(t, start + i * stagger, stamp ? 0.18 : 0.45, EASE_APPEAR);
        const o = exit === undefined ? 0 : ramp(t, exit + i * 0.05, 0.4, EASE_MOVE);
        const tx = stamp ? 0 : (1 - k) * 90 - o * 700;
        const sc = stamp ? 1.35 - 0.35 * k : 1;
        return (
          <div
            key={label}
            style={{ padding: "12px 20px", border: `2px solid ${C.white}`, borderRadius: 12, fontFamily: FONT.mono, fontWeight: 500, fontSize: 28, letterSpacing: "0.08em", color: C.white, whiteSpace: "nowrap", opacity: k > 0.001 ? 1 - o : 0, transform: `translateX(${tx}px) scale(${sc})`, transformOrigin: "left center" }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

const Mark: React.FC<{ ok: boolean; draw: number; size?: number; color?: string }> = ({ ok, draw, size = 40, color = C.white }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none" }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} strokeLinecap="round" />
    <path d={ok ? "M7.5 12.5l3 3 6-6.5" : "M8.5 8.5l7 7M15.5 8.5l-7 7"} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.max(0, draw * 2 - 1)} />
  </svg>
);

/** ✓/✗ verdict row: the mark draws itself, the text wipes in left→right,
 *  and wipes out to the right on exit. */
export const Verdict: React.FC<{ ok: boolean; k: string; v: string; top: number; start: number; exit?: number; mintKey?: boolean }> = ({ ok, k, v, top, start, exit, mintKey }) => {
  const t = useT();
  const a = ramp(t, start, 0.6, EASE_APPEAR);
  const o = exit === undefined ? 0 : ramp(t, exit, 0.4, EASE_MOVE);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 96, top, display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap", fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.05em", textTransform: "uppercase", color: C.white, clipPath: `inset(0 ${(1 - a) * 100}% 0 ${o * 100}%)` }}>
      <Mark ok={ok} draw={a} />
      <span style={{ color: mintKey ? C.mint : C.white, opacity: mintKey ? 1 : 0.62 }}>{k}</span>
      <span>{v}</span>
    </div>
  );
};

export { Mark };
