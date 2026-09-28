import { C } from "../brand";

/** Line icons on a 64-unit grid: 2 px stroke, round caps and joins,
 *  exactly one mint element each (seal / flap / tape). */
const s = { fill: "none", stroke: C.white, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const m = { ...s, stroke: C.mint };

export const PolybagIcon: React.FC<{ seal?: number; crinkle?: number }> = ({ seal = 2, crinkle = 0 }) => (
  <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ overflow: "visible" }}>
    <path {...s} d="M17 12h30a2 2 0 0 1 2 2l2 37a3 3 0 0 1-3 3.2H16a3 3 0 0 1-3-3.2l2-37a2 2 0 0 1 2-2z" />
    <path {...m} strokeWidth={seal} d="M16 19h32" />
    <path {...s} d="M24 29c2 3 -1 6 1 10" transform={`translate(${crinkle} 0)`} />
    <path {...s} d="M40 27c-2 4 2 7 0 12" transform={`translate(${-crinkle} 0)`} />
    <path {...s} d="M29 15.5h6" />
  </svg>
);

export const MailerIcon: React.FC<{ bubbles?: number[] }> = ({ bubbles = [1, 1, 1, 1, 1] }) => (
  <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ overflow: "visible" }}>
    <rect {...s} x="8" y="17" width="48" height="32" rx="3" />
    <path {...m} d="M8.8 18.5L32 34l23.2-15.5" />
    {bubbles.map((b, i) => (
      <circle key={i} {...s} cx={16 + i * 8} cy={42.5} r={0.4 + 1.5 * b} />
    ))}
  </svg>
);

/** open: 1 = flaps up, 0 = closed. tape / lock / xray: 0..1 */
export const BoxIcon: React.FC<{ open: number; tape: number; lock: number; xray: number; xrayOffset?: number }> = ({ open, tape, lock, xray, xrayOffset = 0 }) => (
  <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ overflow: "visible" }}>
    <path {...s} d={`M12 24L32 24L${32 - 4 * open} ${24 - 12 * open}L${12 - 6 * open} ${24 - 10 * open}Z`} />
    <path {...s} d={`M32 24L52 24L${52 + 6 * open} ${24 - 10 * open}L${32 + 4 * open} ${24 - 12 * open}Z`} />
    <rect {...s} x="12" y="24" width="40" height="28" rx="2" />
    {tape > 0.02 && <path {...m} d={`M32 24V${24 + 11 * tape}`} />}
    <path {...s} d="M26 48V38c0-2 1.5-3 3-3h6c1.5 0 3 1 3 3v10z" strokeDasharray="1.5 2.5" strokeDashoffset={xrayOffset} opacity={xray} />
    <g opacity={lock} transform={`translate(32 32) scale(${1.15 - 0.15 * lock}) translate(-32 -32)`}>
      <path {...s} d="M6 13v-4h4M58 13v-4h-4M6 55v4h4M58 55v4h-4" />
    </g>
  </svg>
);

export const PressArrow: React.FC = () => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <path {...s} d="M32 6v22M24 20l8 8 8-8" />
    <path {...s} d="M18 34h28" />
  </svg>
);
