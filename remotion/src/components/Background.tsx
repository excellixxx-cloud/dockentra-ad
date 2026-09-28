import { AbsoluteFill } from "remotion";
import { C } from "../brand";
import { inPause, PAUSE, useT } from "../time";

/** Two dotted Dock Green grids drifting at different speeds (parallax).
 *  The far grid moves at 45 % of the near one; the foreground drifts on
 *  its own, so all three planes separate. Time freezes during the pause. */
export const Background: React.FC = () => {
  const t = useT();
  const gt = t < PAUSE[0] ? t : inPause(t) ? PAUSE[0] : t - (PAUSE[1] - PAUSE[0]);
  const near = { x: -(gt * 10) % 56, y: -(gt * 16) % 56 };
  const far = { x: -(gt * 4.5) % 112, y: -(gt * 7.2) % 112 };
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          inset: -120,
          backgroundImage: `radial-gradient(circle, ${C.green} 3px, transparent 3.6px)`,
          backgroundSize: "112px 112px",
          opacity: 0.35,
          transform: `translate(${far.x}px, ${far.y}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: -120,
          backgroundImage: `radial-gradient(circle, ${C.green} 2.1px, transparent 2.6px)`,
          backgroundSize: "56px 56px",
          opacity: 0.6,
          transform: `translate(${near.x}px, ${near.y}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
