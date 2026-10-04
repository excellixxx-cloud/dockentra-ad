import React from "react";
import { C, FONT } from "../brand";
import { Box, Cyl, FaceText, iso, LINE, mix, poly, V3 } from "./iso";

/** One small warehouse, world units (1 ≈ 10 cm). */
export const ROOM = { W: 60, D: 40, H: 26 };
export const DOOR = { x0: 43, x1: 55, h: 19, open: 0.55 };
export const SHELF = { x0: 3, bay: 12, y0: 0.6, y1: 7, levels: [2.4, 9.2, 16], top: 22.6 };
export const RECV = { x0: 9, x1: 25, y0: 17, y1: 26, top: 9.5 };
export const PACK = { x0: 33, x1: 51, y0: 20, y1: 28, top: 9.5 };
export const CAGE = { x0: 44, y0: 3, w: 8, d: 7, h: 15 };
export const JARS: [number, number][] = [18, 20, 22, 24].flatMap((x) => [19.5, 21.7, 23.9].map((y) => [x, y] as [number, number]));
export const DAMAGED = [7, 2]; // indices into JARS
export const CELLS = ["A1", "A2", "A3", "A4", "A5", "A6"];
/** Copy stand: pole at the table's back-right corner, arm over the product rows, lens down. */
export const STAND = { pole: { x: 24.2, y: 17.2 }, head: { x: 22.3, y: 21.3 }, armZ: 18.6, lensZ: 16 };

/** Damaged units go here, away from sellable stock. */
export const BIN = { w: 3.2, d: 3.0, h: 2.6 };
const HoldBin: React.FC<{ p: P3 & { hooked: boolean } }> = ({ p }) => (
  <g>
    {p.hooked && <Box x={RECV.x1 - 0.2} y={p.y + 1.1} z={p.z + BIN.h - 0.5} w={0.6} d={0.8} h={0.6} color={C.ink} line={false} />}
    <Box x={p.x} y={p.y} z={p.z} w={BIN.w} d={BIN.d} h={BIN.h} color={C.white} top={mix(C.grey, C.ink, 0.35)} />
    <polygon points={poly([[p.x + 0.35, p.y + 0.35, p.z + BIN.h], [p.x + BIN.w - 0.35, p.y + 0.35, p.z + BIN.h], [p.x + BIN.w - 0.35, p.y + BIN.d - 0.35, p.z + BIN.h], [p.x + 0.35, p.y + BIN.d - 0.35, p.z + BIN.h]])} fill={mix(C.grey, C.ink, 0.55)} {...LINE} />
  </g>
);

/** Flat shipping label with a barcode, lying on a horizontal surface. */
export const ShipLabel: React.FC<{ x: number; y: number; z: number; w: number; d: number }> = ({ x, y, z, w, d }) => (
  <g>
    <polygon points={poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]])} fill={C.white} {...LINE} />
    {[0.18, 0.34, 0.46, 0.62, 0.78].map((k, i) => (
      <polyline key={i} points={poly([[x + w * k, y + d * 0.2, z + 0.01], [x + w * k, y + d * 0.8, z + 0.01]])} fill="none" stroke={C.ink} strokeWidth={i % 2 ? 2 : 3} vectorEffect="non-scaling-stroke" />
    ))}
  </g>
);

export type P3 = { x: number; y: number; z: number };
export type RoomState = {
  carton: null | { z: number; flaps: number; collapse: number };   // z above the table top; flaps 0 closed → 1 open
  jars: P3[];                                                    // every product jar in world space
  mailer: null | (P3 & { taped: number; label: number; inCage: boolean });
  printer: number;              // label coming out of the printer, 0..1
  cageOut: number;              // 0 at its spot, 1 in the doorway
  recvFade: number;             // receiving table + copy stand: 1 shown, 0 dissolved (storage shot)
  flyLabel: null | P3;          // the shipping label on its way from the printer to the mailer
  holdBin: P3 & { hooked: boolean };  // tote for damaged units: hooked on the receiving table, later on the bottom shelf
  highlightCells: boolean;
};

const wall = (pts: V3[], fill: string) => <polygon points={poly(pts)} fill={fill} {...LINE} />;

/* ---------- small fixtures ---------- */
const Mailer: React.FC<{ x: number; y: number; z: number; w?: number; d?: number; label?: number; taped?: number }> = ({ x, y, z, w = 5, d = 3.6, label = 0, taped = 0 }) => (
  <g>
    <Box x={x} y={y} z={z} w={w} d={d} h={0.7} color={C.white} />
    <polygon points={poly([[x + 0.4, y + 0.4, z + 0.7], [x + w / 2, y + d / 2, z + 0.7], [x + 0.4, y + d - 0.4, z + 0.7]])} fill="none" {...LINE} />
    {taped > 0.01 && <polygon points={poly([[x + w * 0.45, y, z + 0.72], [x + w * 0.55, y, z + 0.72], [x + w * 0.55, y + d * taped, z + 0.72], [x + w * 0.45, y + d * taped, z + 0.72]])} fill={C.green} {...LINE} />}
    {label > 0.99 && (
      <g>
        <ShipLabel x={x + w * 0.56} y={y + 0.4} z={z + 0.72} w={w * 0.44 - 0.3} d={d - 0.8} />
      </g>
    )}
  </g>
);

const Carton: React.FC<{ x: number; y: number; z: number; flaps: number; collapse: number }> = ({ x, y, z, flaps, collapse }) => {
  const w = 6, d = 5, h = 5 * (1 - 0.9 * collapse), f = 2.2 * flaps * (1 - collapse);
  const g = C.green;
  const up = f * 0.8, out = f * 0.6;
  return (
    <g>
      <polygon points={poly([[x, y, z + h], [x + w, y, z + h], [x + w, y - out, z + h + up], [x, y - out, z + h + up]])} fill={mix(g, C.ink, 0.25)} {...LINE} />
      <polygon points={poly([[x, y, z + h], [x, y + d, z + h], [x - out, y + d, z + h + up], [x - out, y, z + h + up]])} fill={mix(g, C.ink, 0.15)} {...LINE} />
      <Box x={x} y={y} z={z} w={w} d={d} h={h} color={g} top={flaps > 0.05 ? mix(g, C.ink, 0.45) : g} />
      <polygon points={poly([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d + out, z + h + up], [x, y + d + out, z + h + up]])} fill={g} {...LINE} />
      <polygon points={poly([[x + w, y, z + h], [x + w, y + d, z + h], [x + w + out, y + d, z + h + up], [x + w + out, y, z + h + up]])} fill={mix(g, C.ink, 0.08)} {...LINE} />
      {collapse < 0.3 && (
        <>
          <FaceText x={x + w / 2} y={y + d} z={z + h * 0.62} size={11} color={C.white}>FROM</FaceText>
          <FaceText x={x + w / 2} y={y + d} z={z + h * 0.36} size={11} color={C.white}>BRAND</FaceText>
        </>
      )}
    </g>
  );
};

const Jar: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => <Cyl x={x} y={y} z={z} r={0.75} h={1.8} color={C.white} topColor={C.grey} />;

/* ---------- the room ---------- */
export const Room: React.FC<{ s: RoomState; bare?: boolean }> = ({ s, bare = false }) => {
  const { W, D, H } = ROOM;
  const cy = CAGE.y0 - (CAGE.y0 - 0.2) * s.cageOut; // cage rolls toward the door
  const m = s.mailer;
  return (
    <g>
      {/* floor with a painted walkway */}
      {wall([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]], C.grey)}
      {Array.from({ length: 5 }, (_, i) => (
        <polyline key={i} points={poly([[0, 8 * (i + 1), 0], [W, 8 * (i + 1), 0]])} stroke={mix(C.grey, C.ink, 0.08)} strokeWidth={1.5} fill="none" />
      ))}
      <polygon points={poly([[DOOR.x0, 12, 0.01], [DOOR.x1, 12, 0.01], [DOOR.x1, 12.8, 0.01], [DOOR.x0, 12.8, 0.01]])} fill={C.green} opacity={0.5} />
      {/* back walls */}
      {wall([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]], mix(C.grey, C.ink, 0.06))}
      {wall([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], C.white)}
      {/* roller door, half up: dark outside below the shutter */}
      {wall([[DOOR.x0, 0, 0], [DOOR.x1, 0, 0], [DOOR.x1, 0, DOOR.h], [DOOR.x0, 0, DOOR.h]], C.ink)}
      <polygon points={poly([[DOOR.x0, 0, DOOR.h * DOOR.open], [DOOR.x1, 0, DOOR.h * DOOR.open], [DOOR.x1, 0, DOOR.h], [DOOR.x0, 0, DOOR.h]])} fill={C.grey} {...LINE} />
      {Array.from({ length: 6 }, (_, i) => {
        const z = DOOR.h * DOOR.open + ((DOOR.h * (1 - DOOR.open)) / 6) * (i + 0.5);
        return <polyline key={i} points={poly([[DOOR.x0, 0, z], [DOOR.x1, 0, z]])} stroke={C.ink} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />;
      })}
      <FaceText x={(DOOR.x0 + DOOR.x1) / 2} y={0} z={DOOR.h + 2.2} size={20} weight={500}>DISPATCH</FaceText>

      <Shelving s={s} />
      <Cage y0={cy} s={s} />

      {/* receiving table: light grey top, mint edge along the front */}
      {s.recvFade > 0.001 && (
        <g opacity={s.recvFade} transform={`translate(0 ${(1 - s.recvFade) * 30})`}>
          <Table t={RECV} edge={C.green} />
          {/* copy-stand pole at the back-right corner, behind the products */}
          <Box x={STAND.pole.x} y={STAND.pole.y} z={RECV.top} w={0.6} d={0.6} h={STAND.armZ - RECV.top + 0.5} color={C.ink} line={false} />
          {s.carton && <Carton x={RECV.x0 + 1.2} y={RECV.y0 + 1.5} z={RECV.top + s.carton.z} flaps={s.carton.flaps} collapse={s.carton.collapse} />}
        </g>
      )}

      {/* packing table: tape, scale, label printer, a stack of mailers (bare: a video draws its own) */}
      {!bare && <>
      <Table t={PACK} />
      <Mailer x={PACK.x0 + 1} y={PACK.y1 - 4.2} z={PACK.top} />
      <Mailer x={PACK.x0 + 1} y={PACK.y1 - 4.2} z={PACK.top + 0.7} />
      <Mailer x={PACK.x0 + 1} y={PACK.y1 - 4.2} z={PACK.top + 1.4} />
      <Box x={PACK.x0 + 1.2} y={PACK.y0 + 0.8} z={PACK.top} w={3.6} d={2.6} h={0.8} color={C.ink} />
      <Cyl x={PACK.x0 + 3} y={PACK.y0 + 2.1} z={PACK.top + 0.8} r={1.25} h={1.3} color={C.white} topColor={C.white} />
      <ellipse cx={iso(PACK.x0 + 3, PACK.y0 + 2.1, PACK.top + 2.1).X} cy={iso(PACK.x0 + 3, PACK.y0 + 2.1, PACK.top + 2.1).Y} rx={5} ry={3} fill={C.grey} {...LINE} />
      {/* scale */}
      <Box x={PACK.x0 + 7} y={PACK.y0 + 1.2} z={PACK.top} w={5.4} d={4.6} h={0.9} color={C.white} />
      <polygon points={poly([[PACK.x0 + 8.2, PACK.y0 + 5.8, PACK.top + 0.2], [PACK.x0 + 11.2, PACK.y0 + 5.8, PACK.top + 0.2], [PACK.x0 + 11.2, PACK.y0 + 5.8, PACK.top + 0.7], [PACK.x0 + 8.2, PACK.y0 + 5.8, PACK.top + 0.7]])} fill={C.ink} />
      {/* label printer */}
      <Box x={PACK.x1 - 5} y={PACK.y0 + 1} z={PACK.top} w={4} d={4} h={3.2} color={C.white} />
      <polyline points={poly([[PACK.x1 - 1, PACK.y0 + 1.6, PACK.top + 2.2], [PACK.x1 - 1, PACK.y0 + 4.4, PACK.top + 2.2]])} stroke={C.ink} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
      {s.printer > 0.01 && (
        <g>
          <polygon points={poly([[PACK.x1 - 1, PACK.y0 + 1.8, PACK.top + 2.2], [PACK.x1 - 1 + 2.6 * s.printer, PACK.y0 + 1.8, PACK.top + 2.2 - 0.8 * s.printer], [PACK.x1 - 1 + 2.6 * s.printer, PACK.y0 + 4.2, PACK.top + 2.2 - 0.8 * s.printer], [PACK.x1 - 1, PACK.y0 + 4.2, PACK.top + 2.2]])} fill={C.white} {...LINE} />
          {s.printer > 0.9 && [0, 1, 2].map((k) => <polyline key={k} points={poly([[PACK.x1 + 0.2 + k * 0.4, PACK.y0 + 2.3, PACK.top + 1.8], [PACK.x1 + 0.2 + k * 0.4, PACK.y0 + 3.7, PACK.top + 1.8]])} stroke={C.ink} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />)}
        </g>
      )}
      </>}

      {/* a pallet of boxes in the front corner */}
      <Box x={1.5} y={30} z={0} w={8} d={8} h={1.2} color={C.white} />
      {[[1.8, 30.3], [5.7, 30.3], [1.8, 34.2], [5.7, 34.2]].map(([x, y], i) => <Box key={i} x={x} y={y} z={1.2} w={3.8} d={3.8} h={3.6} color={C.green} />)}
      {[[1.8, 30.3], [5.7, 30.3], [1.8, 34.2]].map(([x, y], i) => <Box key={i} x={x} y={y} z={4.8} w={3.8} d={3.8} h={3.6} color={C.green} />)}

      {/* the hold tote for damaged units */}
      <HoldBin p={s.holdBin} />
      {/* product jars, wherever they are (table, air, shelf) */}
      {s.jars.map((j, i) => <Jar key={i} x={j.x} y={j.y} z={j.z} />)}
      {/* copy-stand arm and camera, lens pointing straight down at the rows of products */}
      {s.recvFade > 0.001 && (
        <g opacity={s.recvFade} transform={`translate(0 ${(1 - s.recvFade) * 30})`}>
          <Box x={STAND.pole.x} y={STAND.pole.y} z={STAND.armZ} w={0.6} d={STAND.head.y - STAND.pole.y + 0.3} h={0.5} color={C.ink} line={false} />
          <Box x={STAND.head.x + 0.8} y={STAND.head.y} z={STAND.armZ} w={STAND.pole.x - STAND.head.x - 0.2} d={0.6} h={0.5} color={C.ink} line={false} />
          <Cyl x={STAND.head.x} y={STAND.head.y} z={STAND.lensZ} r={0.75} h={0.9} color={C.ink} />
          <Box x={STAND.head.x - 1.3} y={STAND.head.y - 1.3} z={STAND.lensZ + 0.9} w={2.6} d={2.6} h={1.5} color={C.white} />
        </g>
      )}
      {/* the order's mailer, while it is not inside the cage */}
      {m && !m.inCage && <Mailer x={m.x} y={m.y} z={m.z} taped={m.taped} label={m.label} />}
      {/* the shipping label flying from the printer onto the mailer */}
      {s.flyLabel && <ShipLabel x={s.flyLabel.x} y={s.flyLabel.y} z={s.flyLabel.z} w={1.9} d={2.8} />}
    </g>
  );
};


const Table: React.FC<{ t: { x0: number; x1: number; y0: number; y1: number; top: number }; edge?: string }> = ({ t, edge }) => {
  const legs: [number, number][] = [[t.x0 + 0.4, t.y0 + 0.4], [t.x1 - 1.2, t.y0 + 0.4], [t.x0 + 0.4, t.y1 - 1.2], [t.x1 - 1.2, t.y1 - 1.2]];
  return (
    <g>
      {legs.map(([x, y], i) => <Box key={i} x={x} y={y} z={0} w={0.8} d={0.8} h={t.top - 1} color={C.ink} line={false} />)}
      <Box x={t.x0} y={t.y0} z={t.top - 1} w={t.x1 - t.x0} d={t.y1 - t.y0} h={1} color={C.grey} top={C.grey} side={C.white} front={edge ?? C.white} />
    </g>
  );
};

const Shelving: React.FC<{ s: RoomState }> = ({ s }) => {
  const { x0, bay, y0, y1, levels, top } = SHELF;
  const G = C.green;
  const stock: Record<string, number> = { A1: 3, A3: 2, A4: 2, A5: 3, A6: 1 };
  return (
    <g>
      {/* back uprights */}
      {[0, 1, 2].map((b) => <Box key={b} x={x0 + b * bay - 0.3} y={y0} z={0} w={0.6} d={0.6} h={top} color={G} line={false} />)}
      {levels.concat(top).map((z, li) => (
        <g key={li}>
          {[0, 1].map((b) => (
            <Box key={b} x={x0 + b * bay} y={y0} z={z} w={bay} d={y1 - y0} h={0.5} color={C.grey} top={C.white} />
          ))}
        </g>
      ))}
      {/* stock on the shelves (green boxes); the left slot of A4 is kept for the hold tote */}
      {levels.map((z, li) =>
        [0, 1].map((b) => {
          const cell = CELLS[b * 3 + li];
          const n = stock[cell] ?? 0;
          return (
            <g key={`${li}-${b}`}>
              {Array.from({ length: n }, (_, k) => <Box key={k} x={x0 + b * bay + 0.6 + (k + (cell === "A4" ? 1 : 0)) * 3.8} y={y0 + 0.8} z={z + 0.5} w={3.4} d={4.6} h={4.6} color={G} />)}
            </g>
          );
        }),
      )}
      {/* front uprights and beams, with a cell label on every beam */}
      {[0, 1, 2].map((b) => <Box key={b} x={x0 + b * bay - 0.3} y={y1 - 0.6} z={0} w={0.6} d={0.6} h={top + 0.5} color={G} />)}
      {levels.map((z, li) =>
        [0, 1].map((b) => {
          const cell = CELLS[b * 3 + li];
          const hl = s.highlightCells;
          return (
            <g key={`${li}-${b}`}>
              <Box x={x0 + b * bay} y={y1 - 0.6} z={z - 0.2} w={bay} d={0.6} h={0.7} color={G} />
              <polygon points={poly([[x0 + b * bay + 4.2, y1, z - 1.9], [x0 + b * bay + 7.8, y1, z - 1.9], [x0 + b * bay + 7.8, y1, z - 0.2], [x0 + b * bay + 4.2, y1, z - 0.2]])} fill={C.white} {...LINE} />
              <FaceText x={x0 + b * bay + 6} y={y1} z={z - 1.05} size={hl ? 15 : 13} weight={500}>{cell}</FaceText>
            </g>
          );
        }),
      )}
    </g>
  );
};

const Cage: React.FC<{ y0: number; s: RoomState }> = ({ y0, s }) => {
  const { x0, w, d, h } = CAGE;
  const z0 = 1;
  const mesh = (a: V3, b: V3, n: number, dir: "x" | "y") =>
    Array.from({ length: n }, (_, i) => {
      const k = (i + 1) / (n + 1);
      const p: V3 = dir === "x" ? [a[0] + (b[0] - a[0]) * k, a[1], a[2]] : [a[0], a[1] + (b[1] - a[1]) * k, a[2]];
      return <polyline key={i} points={poly([p, [p[0], p[1], p[2] + h]])} stroke={C.ink} strokeWidth={1.2} opacity={0.55} fill="none" vectorEffect="non-scaling-stroke" />;
    });
  return (
    <g>
      {/* wheels */}
      {[[x0 + 0.6, y0 + 0.6], [x0 + w - 0.6, y0 + 0.6], [x0 + 0.6, y0 + d - 0.6], [x0 + w - 0.6, y0 + d - 0.6]].map(([x, y], i) => {
        const p = iso(x, y, 0.5);
        return <circle key={i} cx={p.X} cy={p.Y} r={5} fill={C.ink} />;
      })}
      <Box x={x0} y={y0} z={z0 - 0.4} w={w} d={d} h={0.4} color={C.ink} line={false} />
      {/* parcels already inside */}
      <Box x={x0 + 0.6} y={y0 + 0.6} z={z0} w={3.4} d={3} h={3} color={C.green} />
      <Box x={x0 + 4.2} y={y0 + 0.8} z={z0} w={3} d={2.8} h={2.4} color={C.green} />
      <Mailer x={x0 + 0.8} y={y0 + 3.6} z={z0} w={4.6} d={3} label={1} />
      <Mailer x={x0 + 1.2} y={y0 + 3.4} z={z0 + 0.7} w={4.6} d={3} label={1} />
      <Mailer x={x0 + 3.4} y={y0 + 3.8} z={z0 + 2.4} w={4} d={2.8} label={1} />
      {s.mailer?.inCage && <Mailer x={x0 + 1.8} y={y0 + 1.2} z={z0 + 3.4} label={1} taped={1} />}
      {/* frame + mesh on the two faces toward the viewer */}
      {mesh([x0, y0 + d, z0], [x0 + w, y0 + d, z0], 7, "x")}
      {mesh([x0 + w, y0, z0], [x0 + w, y0 + d, z0], 6, "y")}
      {([[x0, y0], [x0 + w, y0], [x0, y0 + d], [x0 + w, y0 + d]] as [number, number][]).map(([x, y], i) => (
        <polyline key={i} points={poly([[x, y, z0], [x, y, z0 + h]])} stroke={C.ink} strokeWidth={2.5} fill="none" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={poly([[x0, y0, z0 + h], [x0 + w, y0, z0 + h], [x0 + w, y0 + d, z0 + h], [x0, y0 + d, z0 + h]])} fill="none" stroke={C.ink} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      <polyline points={poly([[x0, y0 + d, z0 + h / 2], [x0 + w, y0 + d, z0 + h / 2], [x0 + w, y0, z0 + h / 2]])} stroke={C.ink} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

export { FONT };
