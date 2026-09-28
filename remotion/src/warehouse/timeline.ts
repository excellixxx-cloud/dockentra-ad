import gsap from "gsap";
import { EASE_MOVE, clamp, lerp, ramp } from "../brand";
import { CAGE, JARS, P3, PACK, RECV, RoomState, SHELF } from "./Room";

export const DURATION_S = 28;

/** Story beats, seconds. Scene boundaries follow the brief (6 and 7 shifted
 *  0.4 s earlier so every headline can stand 2.5 s). */
export const T = {
  toRecv: 3.9, cartonIn: 4.3, cartonDown: 5.2, flaps: 5.4, jarsOut: 5.9, flash: 7.45, thumb: 7.6, damaged: 7.85,
  toMsg: 9.0, plaque: 9.6,
  toShelf: 12.9, collapse: 13.0, jarsUp: 13.3, chip: 15.1,
  order: 17.1, pick: 17.6, toPack: 18.2, intoMailer: 19.2, tape: 19.5, toScale: 20.0, print: 20.5, labelOn: 21.35,
  toCage: 21.6, mailerFly: 21.7, cageRoll: 23.2,
  toWide: 24.7, logo: 26.5,
} as const;

export type Cam = { x: number; y: number; z: number; zoom: number };

/** The camera path: one paused GSAP timeline, seeked every frame. */
export function buildCamera() {
  const cam: Cam = { x: 30, y: 20, z: 2, zoom: 0.98 };
  const tl = gsap.timeline({ paused: true });
  const go = (at: number, dur: number, to: Cam, ease = "power2.inOut") => tl.to(cam, { ...to, duration: dur, ease }, at);
  go(0, 3.9, { x: 30, y: 20, z: 2, zoom: 1.05 }, "sine.inOut");                  // slow push on the wide shot
  go(T.toRecv, 1.0, { x: 17.5, y: 21.5, z: 10, zoom: 2.35 });                    // to receiving
  go(T.toRecv + 1.0, 4.1, { x: 17.8, y: 21.5, z: 10, zoom: 2.45 }, "sine.inOut");
  go(T.toMsg, 0.8, { x: 20.5, y: 21.5, z: 10, zoom: 1.9 });                      // step back for the message
  go(T.toMsg + 0.8, 3.1, { x: 20.8, y: 21.3, z: 10, zoom: 1.96 }, "sine.inOut");
  go(T.toShelf, 1.1, { x: 10, y: 4, z: 9, zoom: 2.2 });                           // to the shelving
  go(T.toShelf + 1.1, 4.2, { x: 10.4, y: 4.2, z: 9, zoom: 2.28 }, "sine.inOut");
  go(T.toPack, 1.0, { x: 41, y: 23, z: 10, zoom: 2.4 });                          // to packing
  go(T.toPack + 1.0, 2.4, { x: 41.3, y: 23, z: 10, zoom: 2.48 }, "sine.inOut");
  go(T.toCage, 0.9, { x: 48, y: 6.5, z: 8, zoom: 2.6 });                          // to the dispatch cage
  go(T.toCage + 0.9, 2.2, { x: 47.6, y: 6.2, z: 8, zoom: 2.66 }, "sine.inOut");
  go(T.toWide, 0.9, { x: 30, y: 20, z: -2, zoom: 1.0 });                          // back to the whole room
  go(T.toWide + 0.9, 2.4, { x: 30, y: 20, z: -2, zoom: 1.03 }, "sine.inOut");
  return { tl, cam };
}

/* ------------------------------------------------------------ objects */
const arc = (a: P3, b: P3, k: number, h: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) + Math.sin(Math.PI * k) * h });
const add = (p: P3, dx: number, dy: number, dz: number): P3 => ({ x: p.x + dx, y: p.y + dy, z: p.z + dz });

const ON_TABLE = (i: number): P3 => ({ x: JARS[i][0], y: JARS[i][1], z: RECV.top });
const IN_CARTON: P3 = { x: RECV.x0 + 4.2, y: RECV.y0 + 4, z: RECV.top + 4.5 };
const ON_SHELF = (i: number): P3 => ({ x: SHELF.x0 + 1.2 + (i % 6) * 1.8, y: SHELF.y0 + 1.8 + Math.floor(i / 6) * 2.2, z: SHELF.levels[1] + 0.5 });
export const PICKED = 11;
const M0: P3 = { x: PACK.x0 + 6.5, y: PACK.y1 - 4.5, z: PACK.top };        // mailer on the table
const M1: P3 = { x: PACK.x0 + 7.2, y: PACK.y0 + 1.7, z: PACK.top + 0.9 };  // mailer on the scale
const PRINTER: P3 = { x: PACK.x1 + 1.2, y: PACK.y0 + 3, z: PACK.top + 2.4 };

export const JAR_OUT = (i: number) => T.jarsOut + i * 0.1;
export const JAR_UP = (i: number) => T.jarsUp + i * 0.09;

function jarAt(i: number, t: number): P3 | null {
  if (t < JAR_OUT(i)) return null;                                          // still in the carton
  if (t < JAR_UP(i)) return arc(IN_CARTON, ON_TABLE(i), EASE_MOVE(clamp((t - JAR_OUT(i)) / 0.45)), 3);
  const shelf = arc(ON_TABLE(i), ON_SHELF(i), EASE_MOVE(clamp((t - JAR_UP(i)) / 0.75)), 8);
  if (i !== PICKED || t < T.pick + 0.3) return shelf;
  // the picked jar: out of the cell, carried to the packing table, into the mailer
  const lifted = add(ON_SHELF(i), 0, 4, 3);
  if (t < T.pick + 0.7) return arc(ON_SHELF(i), lifted, EASE_MOVE(clamp((t - T.pick - 0.3) / 0.4)), 0.5);
  const above = add(M0, 2.5, 1.8, 2);
  if (t < T.intoMailer) return arc(lifted, above, EASE_MOVE(clamp((t - T.pick - 0.7) / (T.intoMailer - T.pick - 0.7))), 6);
  if (t < T.intoMailer + 0.25) return arc(above, add(M0, 2.5, 1.8, 0.2), clamp((t - T.intoMailer) / 0.25) ** 2, 0);
  return null;                                                              // inside the mailer
}

function mailerAt(t: number, cageY: number): RoomState["mailer"] {
  if (t < T.order) return null;
  const taped = ramp(t, T.tape, 0.4, EASE_MOVE);
  const label = t >= T.labelOn ? 1 : 0;
  let p = M0;
  if (t >= T.toScale) p = arc(M0, M1, EASE_MOVE(clamp((t - T.toScale) / 0.4)), 0.8);
  const inCage: P3 = { x: CAGE.x0 + 1.8, y: cageY + 1.2, z: 1 + 3.4 };
  if (t >= T.mailerFly) {
    const k = EASE_MOVE(clamp((t - T.mailerFly) / 0.9));
    if (k >= 1) return { ...inCage, taped, label, inCage: true };
    p = arc(M1, inCage, k, 7);
  }
  return { ...p, taped, label, inCage: false };
}

function handAt(t: number, jar: P3 | null, mailer: RoomState["mailer"]): RoomState["hand"] {
  const grip = (p: P3, rot = 185) => ({ ...add(p, 0, 0, 1.6), rot });
  if (t >= T.cartonIn && t < T.cartonDown + 0.05) {
    const z = lerp(9, 0, EASE_MOVE(clamp((t - T.cartonIn) / (T.cartonDown - T.cartonIn))));
    return { x: RECV.x0 + 1.2, y: RECV.y0 + 4.6, z: RECV.top + z + 4.6, rot: 80 };
  }
  if (t >= T.cartonDown + 0.05 && t < T.cartonDown + 0.5) {
    const k = EASE_MOVE(clamp((t - T.cartonDown - 0.05) / 0.45));
    return { x: RECV.x0 + 1.2 - 3 * k, y: RECV.y0 + 4.6, z: RECV.top + 4.6 + 6 * k, rot: 80 };
  }
  if (t >= T.pick - 0.3 && t < T.pick) {
    const k = EASE_MOVE(clamp((t - T.pick + 0.3) / 0.3));
    return { ...arc(add(ON_SHELF(PICKED), 0, 7, 7), add(ON_SHELF(PICKED), 0, 0, 1.6), k, 0), rot: 185 };
  }
  if (t >= T.pick && t < T.intoMailer + 0.25 && jar) return grip(jar);
  if (!mailer) return null;
  if (t >= T.tape - 0.05 && t < T.toScale) {                                // run the tape along the mailer
    const k = EASE_MOVE(clamp((t - T.tape) / 0.4));
    return { x: M0.x + 2.5, y: M0.y + 3.6 * k, z: M0.z + 1.5, rot: 200 };
  }
  if (t >= T.toScale && t < T.print) return grip(add(mailer, 2.5, 1.8, 0));
  if (t >= T.print && t < T.print + 0.5) return { ...arc(add(M1, 2.5, 1.8, 1.6), PRINTER, EASE_MOVE(clamp((t - T.print) / 0.5)), 1), rot: 200 };
  if (t >= T.print + 0.5 && t < T.labelOn) return { ...arc(PRINTER, add(M1, 3.8, 1.8, 1.5), EASE_MOVE(clamp((t - T.print - 0.5) / (T.labelOn - T.print - 0.5))), 1.2), rot: 200 };
  if (t >= T.labelOn && t < T.mailerFly + 0.9) return grip(add(mailer, 2.5, 1.6, 0));
  if (t >= T.mailerFly + 0.9 && t < T.mailerFly + 1.3) {
    const k = EASE_MOVE(clamp((t - T.mailerFly - 0.9) / 0.4));
    return { ...add(mailer, 2.5, 1.6, 1.6 + 6 * k), rot: 185 };
  }
  return null;
}

/** Full state of the room at time t. */
export function roomAt(t: number): RoomState & { cageY: number } {
  const cageOut = 0.6 * ramp(t, T.cageRoll, 1.2, EASE_MOVE);
  const cageY = CAGE.y0 - (CAGE.y0 - 0.2) * cageOut;
  const carton = t >= T.cartonIn && t < T.collapse + 0.55
    ? { z: lerp(9, 0, EASE_MOVE(clamp((t - T.cartonIn) / (T.cartonDown - T.cartonIn)))), flaps: ramp(t, T.flaps, 0.5), collapse: ramp(t, T.collapse, 0.5, EASE_MOVE) }
    : null;
  const jars = JARS.map((_, i) => jarAt(i, t)).filter((p): p is P3 => p !== null);
  const mailer = mailerAt(t, cageY);
  const hand = handAt(t, jarAt(PICKED, t), mailer);
  const printer = t >= T.print && t < T.labelOn - 0.1 ? ramp(t, T.print, 0.5, EASE_MOVE) : 0;
  return { carton, jars, mailer, printer, cageOut, hand, highlightCells: t >= T.jarsUp + 0.9 && t < T.order, cageY };
}

export { ON_TABLE };
