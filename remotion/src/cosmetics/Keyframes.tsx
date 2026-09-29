import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../brand";
import { Words } from "../components/Kinetic";
import { loadBrandFonts } from "../fonts";
import { TimeContext } from "../time";
import { iso } from "../warehouse/iso";
import { Hand, P, PROP } from "./geo";
import {
  BalmJar, BubbleRoll, ClearLid, CreamJar, FillerBox, KraftMailer, LabelPrinter, Lipstick, LotionBottle,
  MailerStack, MailerState, MaskingTape, Scale, StockBox, TapeDispenser, WallsAndTable,
} from "./Props";

loadBrandFonts();

/** Camera: world point `f` lands on screen (ax, ay) at `zoom`. */
export type Cam = { f: P; zoom: number; ax: number; ay: number };
export const toScreen = (cam: Cam, p: P) => {
  const a = iso(p[0], p[1], p[2]), o = iso(cam.f[0], cam.f[1], cam.f[2]);
  return { x: cam.ax + cam.zoom * (a.X - o.X), y: cam.ay + cam.zoom * (a.Y - o.Y) };
};

/** Mailer slots in the work zone (left third, near edge). */
export const SLOT = (i: number): MailerState => ({ x: 20 + i * 14.5, y: 58 });

type Pose = {
  cam: Cam;
  mailers: MailerState[];
  headline?: string[];
  sub?: string;
  props?: React.ReactNode;
  hands?: (cam: Cam) => React.ReactNode;
  overlay?: (cam: Cam) => React.ReactNode;
  scale?: { reading: string; flash?: number };
  printer?: number;
  final?: boolean;
};

const BASE: Cam = { f: [42, 32, 0], zoom: 1.25, ax: 540, ay: 1115 };
/** A hand whose fingertips reach world point p, arriving along `rot` (degrees, screen). */
const hand = (cam: Cam, p: P, o: { rot: number; curl?: number; mirror?: boolean; thumbOut?: number; k?: number; dx?: number; dy?: number }) => {
  const s = toScreen(cam, p);
  const sc = 0.72 * cam.zoom * (o.k ?? 1);
  const a = (o.rot * Math.PI) / 180, reach = 50 * (1 - 0.4 * (o.curl ?? 0.4));
  return <Hand x={s.x - reach * sc * Math.cos(a) + (o.dx ?? 0)} y={s.y - reach * sc * Math.sin(a) + (o.dy ?? 0)} rot={o.rot} scale={sc} curl={o.curl ?? 0.4} mirror={o.mirror} thumbOut={o.thumbOut} />;
};
const PACKED = (m: MailerState): MailerState => ({ ...m, num: undefined });

const POSES: Record<number, Pose> = {
  /* 0:01.5 — end of the dolly: the whole table, headline on the wall */
  1: {
    cam: BASE,
    mailers: [],
    headline: ["Three ways", "cosmetics", "arrive ruined."],
  },
  /* 0:04 — three closed mailers in a row, marker digits */
  2: {
    cam: { f: [41, 62, 0], zoom: 1.75, ax: 540, ay: 1170 },
    mailers: [0, 1, 2].map((i) => ({ ...SLOT(i), num: String(i + 1), rot: [-2, 1.5, -1][i] })),
    headline: ["Three ways", "cosmetics", "arrive ruined."],
  },
  /* 0:07 — the cap: bottle on its side, lotion out of the gap, wet stain on the mailer */
  3: {
    cam: { f: [29, 68, 1], zoom: 2.4, ax: 540, ay: 1080 },
    mailers: [{ ...SLOT(0), open: 1, stain: 1, num: "1" }, { ...SLOT(1), num: "2" }, { ...SLOT(2), num: "3" }],
    props: <LotionBottle p={[19.5, 73, 0]} capGap={1} drop={1} />,
    hands: (cam) => (
      <>
        {hand(cam, [22, 62, 1], { rot: 25, curl: 0.35, mirror: true, thumbOut: 0.2 })}
        {hand(cam, [36, 75.5, 2.5], { rot: -140, curl: 0.2, thumbOut: 0.7 })}
      </>
    ),
    sub: "One: the cap.",
  },
  /* 0:16 — glass: the amber jar out of mailer 2, crack from the cap edge down */
  4: {
    cam: { f: [40, 71, 2.2], zoom: 3.1, ax: 520, ay: 1060 },
    mailers: [PACKED(SLOT(0)), { ...SLOT(1), open: 1, num: "2" }, { ...SLOT(2), num: "3" }],
    props: <CreamJar p={[40, 72, 0]} crack={1} />,
    hands: (cam) => hand(cam, [42.5, 68.5, 5], { rot: -125, curl: 0.55, thumbOut: 0.4 }),
    sub: "Two: glass.",
  },
  /* 0:22 — storage: melted lipstick and cratered balm by the A6 box, strip in the red */
  5: {
    cam: { f: [61, 68.5, 3], zoom: 2.05, ax: 540, ay: 1080 },
    mailers: [PACKED(SLOT(0)), PACKED(SLOT(1)), { ...SLOT(2), open: 1, num: "3" }],
    props: (
      <g>
        <StockBox p={[63.5, 58.5, 0]} cell="A6" heat={1} />
        <ClearLid p={[61.5, 72.5, 0]} />
        <Lipstick p={[43, 73, 0]} melted={1} />
        <BalmJar p={[56, 74, 0]} crater={1} />
      </g>
    ),
    overlay: (cam) => <HeatWaves cam={cam} p={[68.5, 62.5, 8.5]} />,
    hands: (cam) => hand(cam, [67.5, 59.5, 8.2], { rot: 150, curl: 0.5, thumbOut: 0.3, mirror: true }),
    sub: "Three: storage.",
  },
  /* 0:29 — summary: mailer on the scale, label coming out of the printer */
  6: {
    cam: { f: [38, 20, 3], zoom: 1.95, ax: 510, ay: 1080 },
    mailers: [{ x: 34.3, y: 19.8, z: 1.9 }, PACKED(SLOT(1)), PACKED(SLOT(2))],
    scale: { reading: "0.312" },
    printer: 0.85,
    headline: ["Two are packing.", "One is storage."],
  },
  /* 0:33 — final card over the dimmed, blurred table */
  7: {
    cam: { ...BASE, zoom: 1.27 },
    mailers: [{ x: 62, y: 44 }, { x: 62.3, y: 44.2, z: 0.9 }, { x: 61.8, y: 43.9, z: 1.8 }],
    final: true,
  },
};

/** Rising heat shimmer above a box (screen space, drawn over the scene). */
const HeatWaves: React.FC<{ cam: Cam; p: P }> = ({ cam, p }) => {
  const s = toScreen(cam, p);
  const z = cam.zoom;
  return (
    <g>
      {[-1, 0, 1].map((i) => {
        const x0 = s.x + i * 34 * z, y0 = s.y - 8 * z;
        const d = `M${x0} ${y0} c${-10 * z} ${-14 * z} ${10 * z} ${-26 * z} 0 ${-40 * z} s${10 * z} ${-26 * z} 0 ${-40 * z} s${10 * z} ${-26 * z} 0 ${-40 * z}`;
        return <path key={i} d={d} fill="none" stroke={PROP.red} strokeWidth={4} strokeLinecap="round" opacity={0.75 - Math.abs(i) * 0.2} />;
      })}
    </g>
  );
};

export const CosmeticsKeyframes: React.FC<{ scene: number }> = ({ scene }) => {
  const pose = POSES[scene];
  const { cam } = pose;
  const o = iso(cam.f[0], cam.f[1], cam.f[2]);
  const tf = `translate(${cam.ax} ${cam.ay}) scale(${cam.zoom}) translate(${-o.X} ${-o.Y})`;
  // Bay Grey band behind the headline when the camera is close enough to lose the real wall
  const apex = toScreen(cam, [0, 0, 0]);
  const band = Math.max(0, Math.min(1, (620 - apex.y) / 260));
  const dim = pose.final ? 1 : 0;
  return (
    <TimeContext.Provider value={20}>
      <AbsoluteFill style={{ background: C.grey }}>
        <AbsoluteFill style={{ opacity: 1 - 0.7 * dim, filter: dim ? `blur(${8 * dim}px)` : undefined }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <g transform={tf}>
              <WallsAndTable />
              <LabelPrinter out={pose.printer ?? 0} />
              <TapeDispenser />
              <BubbleRoll />
              <FillerBox />
              <Scale reading={pose.scale?.reading ?? "0.000"} flash={pose.scale?.flash ?? 0} />
              <MaskingTape />
              <MailerStack />
              {[...pose.mailers].sort((a, b) => a.x + a.y - (b.x + b.y)).map((m, i) => <KraftMailer key={i} m={m} />)}
              {pose.props}
            </g>
            {pose.overlay?.(cam)}
            {pose.hands?.(cam)}
          </svg>
        </AbsoluteFill>

        {band > 0 && !pose.final && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 700, opacity: band, background: `linear-gradient(180deg, ${C.grey} 0%, ${C.grey} 62%, ${C.grey}00 100%)` }} />
        )}

        {pose.headline && <Words lines={pose.headline} top={150} left={80} size={84} start={0} color={C.ink} />}

        {pose.sub && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: 980, background: "rgba(255,255,255,0.92)", border: `2px solid ${C.grey}`, borderRadius: 22, padding: "12px 26px", textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 46, lineHeight: 1.3, color: C.ink }}>
              {pose.sub}
            </div>
          </div>
        )}

        {pose.final && (
          <>
            <div style={{ position: "absolute", left: 324, top: 600, width: 432 }}>
              <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
            </div>
            <Words lines={["What do you sell?"]} top={1010} size={84} center start={0} color={C.ink} />
            <Words lines={["dockentra.ie"]} top={1112} size={64} center start={0} color={C.ink} />
          </>
        )}
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};
