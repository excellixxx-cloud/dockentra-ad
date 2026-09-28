import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

// Minimal smoke-test composition: one word sliding in on the brand ease.
export const HelloDockentra: React.FC = () => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
  return (
    <AbsoluteFill style={{ background: "#0B0D10", justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: "#FFFFFF", fontSize: 120, fontWeight: 800, transform: `translateY(${(1 - k) * 80}px)`, opacity: k }}>
        Dockentra
      </div>
    </AbsoluteFill>
  );
};
