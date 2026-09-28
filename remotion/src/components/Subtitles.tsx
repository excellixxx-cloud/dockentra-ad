import { C, EASE_APPEAR, EASE_MOVE, FONT, ramp } from "../brand";
import { useT } from "../time";

export const SUBS: Cue[] = [
  [0.2, 2.0, "Same order, three ways."],
  [2.0, 4.0, "Two of these are wrong for your category."],
  [4.2, 6.8, "Polybag. Cheapest, thinnest, fastest to pack."],
  [6.8, 8.6, "Fine for a T-shirt."],
  [8.6, 12.0, "Useless for anything that leaks, breaks, or has a hard edge."],
  [12.2, 14.8, "Padded mailer. Some cushioning, some structure."],
  [14.8, 17.2, "Good for most soft goods and small electronics."],
  [17.2, 20.0, "Still won’t survive a real drop with anything glass or ceramic."],
  [20.2, 23.2, "Box. Rigid, heaviest, most expensive."],
  [23.2, 27.0, "The only one of the three that protects a shape, not just a surface."],
  [27.6, 29.0, "Pick by category, not by habit."],
  [29.0, 31.0, "Cosmetics in a polybag is how you get a refund request."],
  [31.0, 33.0, "A book in a box is how you overpay on every order."],
  [33.0, 36.0, "Which one are you actually using?"],
];

/** Subtitle bottom edge sits 320 px above the frame edge (brand book: ≥ 240). */
export const SUB_BOTTOM = 320;

/** Karaoke subtitles: each cue slides in, its words light up in reading
 *  order, and the outgoing cue is pushed up rather than faded. Never mint. */
export type Cue = [number, number, string];

export const Subtitles: React.FC<{ lightFrom?: number; cues?: Cue[]; end?: number }> = ({ lightFrom = 0, cues = SUBS, end = 36 }) => {
  const t = useT();
  const onLight = t >= lightFrom;
  const base = onLight ? C.ink : C.white;
  return (
    <div style={{ position: "absolute", left: 90, width: 900, bottom: SUB_BOTTOM, height: 0 }}>
      {cues.map(([a, b, text]) => {
        if (t < a - 0.01 || t > b + 0.16) return null;
        // incoming cue waits for the outgoing one to clear (0.14 s), so two
        // cues never sit on top of each other
        const k = ramp(t, a + 0.1, 0.26, EASE_APPEAR);
        const o = b >= end ? 0 : ramp(t, b, 0.14, EASE_MOVE);
        const words = text.split(" ");
        const span = (b - a) * 0.8;
        return (
          <div
            key={a}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 42, lineHeight: 1.3, color: base, transform: `translateY(${(1 - k) * 28 - o * 36}px)`, opacity: k * (1 - o) }}
          >
            {words.map((w, i) => {
              const lit = ramp(t, a + (i / words.length) * span, 0.14, EASE_APPEAR);
              return (
                <span key={i} style={{ opacity: 0.42 + 0.58 * lit }}>
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
