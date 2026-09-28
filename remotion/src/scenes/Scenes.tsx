import { Img, staticFile } from "remotion";
import { C, EASE_LOGO, EASE_MOVE, FONT, clamp, ramp } from "../brand";
import { Chips, Drift, Verdict, Words } from "../components/Kinetic";
import { ROW_Y } from "../components/IconStage";
import { useT } from "../time";

/** 0:00–0:04 — hook, word by word. */
export const Hook: React.FC = () => (
  <Drift from={0} to={4.2}>
    <Words lines={["Same order,", "three ways."]} top={230} size={124} start={0.15} exit={3.85} />
    <Words lines={["Two of these", "are wrong for", "your category."]} top={540} size={76} start={0.95} exit={3.8} mint={["wrong"]} />
  </Drift>
);

/** 0:04–0:12 — polybag: chips, verdicts (title is the shared MorphTitle). */
export const Polybag: React.FC = () => (
  <Drift from={4.2} to={12.0}>
    <Chips items={["CHEAPEST", "THINNEST", "FASTEST TO PACK"]} top={380} start={5.0} exit={11.5} />
    <Verdict ok k="Fine for" v="a T-shirt" top={486} start={7.0} exit={11.55} />
    <Verdict ok={false} k="Useless for" v="leaks · breaks · hard edges" top={548} start={8.7} exit={11.6} mintKey />
  </Drift>
);

/** 0:12–0:20 — padded mailer. */
export const Mailer: React.FC = () => (
  <Drift from={12.0} to={20.0}>
    <Chips items={["SOME CUSHIONING", "SOME STRUCTURE"]} top={380} start={13.0} />
    <Verdict ok k="Good for" v="soft goods · small electronics" top={486} start={14.9} />
    <Verdict ok={false} k="Won’t survive" v="a real drop · glass · ceramic" top={548} start={17.2} mintKey />
  </Drift>
);

/** 0:20–0:27 — box. Arrives on a hard cut (the pattern interrupt): chips
 *  stamp in instead of sliding. */
export const Box: React.FC = () => (
  <Drift from={20.0} to={27.0} dy={-30}>
    <Chips items={["RIGID", "HEAVIEST", "MOST EXPENSIVE"]} top={380} start={20.3} exit={26.35} stagger={0.12} stamp />
    <Words lines={["Protects a shape,", "not just a surface."]} top={488} size={64} start={23.3} exit={26.3} mint={["shape"]} />
  </Drift>
);

/** 0:27–0:33 — recap headline (icons, chips and verdicts are on the IconStage). */
export const Recap: React.FC = () => (
  <Drift from={27.5} to={33.2}>
    <Words lines={["Pick by category,", "not by habit."]} top={230} size={100} start={27.6} exit={32.85} mint={["category"]} />
  </Drift>
);

/** 0:33–0:34.5 — the question, scaling in word by word. */
export const Question: React.FC = () => (
  <Drift from={33.0} to={34.7} dy={-24}>
    <Words lines={["Which one", "are you", "actually using?"]} top={520} size={128} start={33.05} mode="scale" mint={["actually"]} />
  </Drift>
);

/** 0:34.2–0:36 — Bay Grey opens as a circle from the point the icons
 *  collapsed into, then the logo fills diagonally (brand book: 600 ms,
 *  cubic-bezier(.22,1,.36,1), no bounce) and holds for the last 1.5 s. */
export const LOGO_IN = 34.5;
export const EndCard: React.FC = () => {
  const t = useT();
  const r = ramp(t, 34.25, 0.45, EASE_MOVE) * 2300;
  const fill = t < LOGO_IN ? 0 : EASE_LOGO(clamp((t - LOGO_IN) / 0.6));
  const edge = -20 + fill * 140;
  const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
  const url = "dockentra.ie";
  const n = Math.floor(clamp((t - 35.15) * 24, 0, url.length));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.grey, clipPath: `circle(${r}px at 540px ${ROW_Y}px)` }} />
      <div style={{ position: "absolute", left: 340, top: 560, width: 400, WebkitMaskImage: mask, maskImage: mask, opacity: t >= LOGO_IN ? 1 : 0 }}>
        <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1070, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: "0.08em", color: C.ink }}>
        {url.slice(0, n)}
      </div>
    </>
  );
};
