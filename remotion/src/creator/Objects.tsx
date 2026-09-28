import { C, FONT, lerp } from "../brand";

/**
 * Overhead objects for "Creator samples". Everything is drawn as seen from
 * above: white parcels with Dock Ink linework, Dock Green sample mailers.
 * Line work is 2 units on the object's own grid, round caps and joins.
 * No mint here — the desk's top edge is the composition's one mint accent.
 */
const ink = { fill: "none", stroke: C.ink, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const white = { ...ink, stroke: C.white } as const;

export const PARCEL_W = 240;
export const PARCEL_H = 180;

type ParcelProps = {
  /** unique id for this instance's clip path */
  uid: string;
  /** 0 = shipping carton, 1 = camera-ready sample mailer */
  morph?: number;
  /** invoice sheet offset/rotation (local units, 120x90 grid) */
  invoice?: { dx: number; dy: number; r: number; o: number };
  /** price line: strike progress 0..1, label peel 0..1 */
  strike?: number;
  peel?: { dx: number; dy: number; r: number; o: number };
};

/** A regular order seen from above, which can morph into a creator sample:
 *  corners soften, the carton fills Dock Green from the centre outwards,
 *  the tape becomes a crossed band, the shipping label becomes a card. */
export const Parcel: React.FC<ParcelProps> = ({ uid, morph = 0, invoice = { dx: 0, dy: 0, r: 0, o: 1 }, strike = 0, peel = { dx: 0, dy: 0, r: 0, o: 1 } }) => {
  const rx = lerp(4, 14, morph);
  const w = lerp(112, 106, morph);
  const h = lerp(84, 80, morph);
  const x = (120 - w) / 2;
  const y = (90 - h) / 2;
  const fillR = morph * 80;
  const line = morph > 0.5 ? white : ink;
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        <clipPath id={`parcel-body-${uid}`}>
          <rect x={x} y={y} width={w} height={h} rx={rx} />
        </clipPath>
      </defs>
      {/* invoice sheet tucked under the carton, bottom-left */}
      <g transform={`translate(${6 + invoice.dx} ${56 + invoice.dy}) rotate(${-6 + invoice.r} 20 14)`} opacity={invoice.o}>
        <rect x={0} y={0} width={40} height={30} rx={2} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <path {...ink} d="M7 8h20M7 14h26M7 20h14" />
      </g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={C.white} />
      <circle cx={60} cy={45} r={fillR} fill={C.green} clipPath={`url(#parcel-body-${uid})`} />
      <rect {...ink} stroke={morph > 0.5 ? C.green : C.ink} x={x} y={y} width={w} height={h} rx={rx} />
      {/* tape → band: vertical strip, plus a horizontal band growing in */}
      <path {...line} d={`M${56 - 2 * morph} ${y}V${y + h}M${64 + 2 * morph} ${y}V${y + h}`} />
      <path {...line} d={`M${x} 45H${x + w * morph}`} opacity={morph} />
      {/* shipping label (top right) with the price line */}
      <g transform={`translate(${72 + peel.dx} ${14 + peel.dy}) rotate(${peel.r} 0 0)`} opacity={peel.o * (1 - morph)}>
        <rect x={0} y={0} width={30} height={22} rx={2} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <text x={5} y={15} fontFamily={FONT.mono} fontWeight={500} fontSize={8} fill={C.ink}>€24</text>
        <path {...ink} d={`M3 11.5H${3 + 24 * strike}`} opacity={strike > 0.01 ? 1 : 0} />
      </g>
      {/* card that replaces the label once the parcel is a sample */}
      <g opacity={Math.max(0, morph * 2 - 1)}>
        <rect x={74} y={12} width={26} height={18} rx={2} fill={C.white} />
        <path {...ink} d="M79 19h16M79 24h10" />
      </g>
    </svg>
  );
};

/** Creator-sample mailer from above: Dock Green, white flap, soft corners. */
export const Mailer: React.FC = () => (
  <svg viewBox="0 0 120 86" width="100%" height="100%" style={{ overflow: "visible" }}>
    <rect x={4} y={4} width={112} height={78} rx={12} fill={C.green} />
    <path {...white} d="M8 10L60 46L112 10" />
    <path {...white} d="M44 70h32" />
  </svg>
);

/** "CREATOR SAMPLE" swing tag. The string runs from (0,0) — the pivot. */
export const Tag: React.FC<{ swing: number; label?: boolean; scale?: number }> = ({ swing, label = true, scale = 1 }) => (
  <div style={{ position: "absolute", left: 0, top: 0, transform: `rotate(${swing}deg) scale(${scale})`, transformOrigin: "0 0" }}>
    <svg width={34} height={34} style={{ position: "absolute", left: -2, top: -2, overflow: "visible" }}>
      <path {...ink} d="M2 2L24 24" />
    </svg>
    <div
      style={{ position: "absolute", left: 20, top: 20, width: 176, height: 52, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontFamily: FONT.mono, fontWeight: 500, fontSize: 17, letterSpacing: "0.06em", color: C.ink, whiteSpace: "nowrap", transform: "rotate(-8deg)", transformOrigin: "0 0" }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 5, border: `2px solid ${C.ink}`, flex: "none" }} />
      {label ? "CREATOR SAMPLE" : ""}
    </div>
  </div>
);

/** Viewfinder brackets that snap around the camera-ready parcel. */
export const Viewfinder: React.FC<{ k: number; w: number; h: number; dot: number }> = ({ k, w, h, dot }) => {
  const s = 1.18 - 0.18 * k;
  const L = 46;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: -w / 2, top: -h / 2, overflow: "visible", opacity: k, transform: `scale(${s})` }}>
      <path fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" d={`M2 ${L}V2H${L}M${w - L} 2H${w - 2}V${L}M${w - 2} ${h - L}V${h - 2}H${w - L}M${L} ${h - 2}H2V${h - L}`} />
      <circle cx={30} cy={30} r={8} fill={C.ink} opacity={dot} />
    </svg>
  );
};

/* ---------- 24-grid line icons for the packaging / deadline rows ---------- */
const Icon: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 46 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none", overflow: "visible" }}>{children}</svg>
);
const Cross: React.FC<{ k: number }> = ({ k }) => <path {...ink} d="M3 3L21 21" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />;

export const ReceiptIcon: React.FC<{ cross: number }> = ({ cross }) => (
  <Icon><path {...ink} d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" /><path {...ink} d="M9 8h6M9 12h6" /><Cross k={cross} /></Icon>
);
export const PriceIcon: React.FC<{ cross: number }> = ({ cross }) => (
  <Icon><path {...ink} d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle {...ink} cx={8} cy={8} r={1.5} /><Cross k={cross} /></Icon>
);
export const CameraIcon: React.FC = () => (
  <Icon><path {...ink} d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4" /><circle {...ink} cx={12} cy={12} r={3.5} /></Icon>
);
/** Clock whose hand advances in eased one-second ticks (never linear). */
export const ClockIcon: React.FC<{ angle: number }> = ({ angle }) => (
  <Icon><circle {...ink} cx={12} cy={12} r={9} /><path {...ink} d="M12 12V6.5" transform={`rotate(${angle} 12 12)`} /><path {...ink} d="M12 12h3.5" /></Icon>
);

/** Micro-order tile for the 50-order grid: outline → processed. */
export const Tile: React.FC<{ done: number }> = ({ done }) => (
  <svg viewBox="0 0 64 46" width="100%" height="100%" style={{ overflow: "visible" }}>
    <rect x={2} y={2} width={60} height={42} rx={8} fill={done > 0.5 ? C.green : C.white} stroke={done > 0.5 ? C.green : C.ink} strokeWidth={2} />
    <path fill="none" stroke={done > 0.5 ? C.white : C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 7L32 25L58 7" />
  </svg>
);
