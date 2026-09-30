import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, clamp, EASE_LOGO, EASE_MOVE, FONT, ramp } from "../brand";
import { Drift, Words } from "../components/Kinetic";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import { iso } from "../warehouse/iso";
import { Hand, P, PROP } from "./geo";
import {
  BalmJar, BubbleRoll, ClearLid, CreamJar, FillerBox, KraftMailer, LabelPrinter, Lipstick, LotionBottle,
  MailerStack, MaskingTape, Scale, StockBox, TapeDispenser, WallsAndTable,
} from "./Props";
import script from "./script.json";
import {
  boxAt, bottleAt, breathe, buildCamera, DURATION_S, flashAt, handsAt, jarAt, lipBalmAt, mailer1At, mailer2At,
  mailer3At, mailerVisible, printerAt, scaleAt, shakeAt, T,
} from "./timeline";
import { Cam } from "./Keyframes";

loadBrandFonts();
export { DURATION_S };

const toScreen = (cam: Cam, p: P) => {
  const a = iso(p[0], p[1], p[2]), o = iso(cam.x, cam.y, cam.z);
  return { x: cam.ax + cam.zoom * (a.X - o.X), y: cam.ay + cam.zoom * (a.Y - o.Y) };
};
const drawHand = (cam: Cam, p: P, o: { rot: number; curl?: number; mirror?: boolean; thumbOut?: number; k?: number; op?: number }, key: React.Key) => {
  const s = toScreen(cam, p);
  const sc = 0.72 * cam.zoom * (o.k ?? 1);
  const a = (o.rot * Math.PI) / 180, reach = 50 * (1 - 0.4 * (o.curl ?? 0.4));
  return (
    <g key={key} opacity={o.op ?? 1}>
      <Hand x={s.x - reach * sc * Math.cos(a)} y={s.y - reach * sc * Math.sin(a)} rot={o.rot} scale={sc} curl={o.curl ?? 0.4} mirror={o.mirror} thumbOut={o.thumbOut} />
    </g>
  );
};

const SUB_BOTTOM = 250;
const LOGO_IN = T.logo;

export const Cosmetics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const camTl = useMemo(buildCamera, []);
  camTl.tl.seek(t, false);
  const shake = shakeAt(t);
  const cam: Cam = { ...camTl.cam, zoom: camTl.cam.zoom * breathe(t), ax: camTl.cam.ax + 1.4 * Math.sin(t * 1.1) + shake.dx, ay: camTl.cam.ay + 1.1 * Math.sin(t * 0.87 + 1) + shake.dy };
  const flash = flashAt(t);

  const m1 = mailer1At(t), m2 = mailer2At(t), m3 = mailer3At(t);
  const bottle = bottleAt(t);
  const jar = jarAt(t);
  const lipBalm = lipBalmAt(t);
  const box = boxAt(t);
  const sc = scaleAt(t);
  const pr = printerAt(t);
  const hands = handsAt(t);

  const apex = toScreen(cam, [0, 0, 0]);
  const band = clamp((620 - apex.y) / 260);
  const dim = ramp(t, T.dim, 0.6, EASE_MOVE);

  // the printer's label, torn off and carried to the mailer on the scale
  const labelFrom: P = [26, 4.5, 6.6], labelTo: P = [31, 13.3, 2.8];
  const labelP: P | null = pr.flying ? [
    labelFrom[0] + (labelTo[0] - labelFrom[0]) * pr.k,
    labelFrom[1] + (labelTo[1] - labelFrom[1]) * pr.k,
    labelFrom[2] + (labelTo[2] - labelFrom[2]) * pr.k + Math.sin(Math.PI * pr.k) * 2,
  ] : null;

  const tf = (() => {
    const o = iso(cam.x, cam.y, cam.z);
    return `translate(${cam.ax} ${cam.ay}) scale(${cam.zoom}) translate(${-o.X} ${-o.Y})`;
  })();

  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill style={{ background: C.grey }}>
        <AbsoluteFill style={{ opacity: 1 - 0.7 * dim, filter: dim > 0 ? `blur(${8 * dim}px)` : undefined }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <g transform={tf}>
              <WallsAndTable />
              <LabelPrinter out={pr.out} />
              <TapeDispenser pull={ramp(t, T.tapeWind, 0.6, EASE_MOVE)} />
              <BubbleRoll unrolled={ramp(t, T.bubbleUnroll, 0.6, EASE_MOVE) * (1 - ramp(t, T.wrapOn + 0.3, 0.3, EASE_MOVE))} />
              <FillerBox />
              <Scale reading={sc.reading} flash={sc.flash} />
              <MaskingTape />
              <MailerStack />
              {[m1, m2, m3].map((m, i) => ({ m, i })).sort((a, b) => a.m.x + a.m.y - (b.m.x + b.m.y)).map(({ m, i }) => (
                <g key={i} opacity={mailerVisible(i as 0 | 1 | 2, t)}><KraftMailer m={m} /></g>
              ))}
              {bottle && (
                <g opacity={bottle.opacity}>
                  <LotionBottle p={bottle.p} capGap={bottle.capGap} drop={bottle.drop} taped={bottle.taped} />
                  {bottle.bagged > 0.01 && (
                    <polygon
                      points={`${toScreen(cam, [bottle.p[0] - 1, bottle.p[1] - 2.5, 1.7]).x},${toScreen(cam, [bottle.p[0] - 1, bottle.p[1] - 2.5, 1.7]).y} ${toScreen(cam, [bottle.p[0] + 15, bottle.p[1] - 2.5, 1.7]).x},${toScreen(cam, [bottle.p[0] + 15, bottle.p[1] - 2.5, 1.7]).y} ${toScreen(cam, [bottle.p[0] + 15, bottle.p[1] + 4, 1.7]).x},${toScreen(cam, [bottle.p[0] + 15, bottle.p[1] + 4, 1.7]).y} ${toScreen(cam, [bottle.p[0] - 1, bottle.p[1] + 4, 1.7]).x},${toScreen(cam, [bottle.p[0] - 1, bottle.p[1] + 4, 1.7]).y}`}
                      fill={C.white} fillOpacity={0.3 * bottle.bagged} stroke={C.ink} strokeOpacity={0.4 * bottle.bagged} strokeWidth={1.5} strokeDasharray="4 3"
                    />
                  )}
                </g>
              )}
              {jar && (
                <g opacity={jar.opacity}>
                  <CreamJar p={jar.p} crack={jar.crack} />
                  {jar.wrap > 0.01 && (
                    <ellipse
                      cx={toScreen(cam, [jar.p[0], jar.p[1], jar.p[2] + 2.2]).x} cy={toScreen(cam, [jar.p[0], jar.p[1], jar.p[2] + 2.2]).y}
                      rx={34 * cam.zoom} ry={30 * cam.zoom} fill="none" stroke={C.white} strokeOpacity={0.6 * jar.wrap} strokeWidth={6} strokeDasharray="3 4"
                    />
                  )}
                </g>
              )}
              {lipBalm && (
                <g opacity={lipBalm.opacity}>
                  <Lipstick p={lipBalm.lip} melted={lipBalm.melted} />
                  <BalmJar p={lipBalm.balm} crater={lipBalm.crater} />
                  {lipBalm.balm && <ClearLid p={[lipBalm.balm[0] + 4, lipBalm.balm[1] + 2, 0]} />}
                </g>
              )}
              {box && (
                <g opacity={box.opacity}>
                  <StockBox p={box.p} cell={box.cell} heat={box.heat} />
                </g>
              )}
              {box && box.heat > 0.05 && (() => {
                const s0 = toScreen(cam, [box.p[0] + 4, box.p[1] + 4, 9.5]);
                return (
                  <g opacity={box.heat}>
                    {[-1, 0, 1].map((i) => {
                      const x0 = s0.x + i * 30 * cam.zoom, y0 = s0.y;
                      const d = `M${x0} ${y0} c${-9 * cam.zoom} ${-13 * cam.zoom} ${9 * cam.zoom} ${-24 * cam.zoom} 0 ${-37 * cam.zoom} s${9 * cam.zoom} ${-24 * cam.zoom} 0 ${-37 * cam.zoom}`;
                      return <path key={i} d={d} fill="none" stroke={PROP.red} strokeWidth={4} strokeLinecap="round" opacity={0.7 - Math.abs(i) * 0.2} />;
                    })}
                  </g>
                );
              })()}
            </g>
            {labelP && (() => {
              const s = toScreen(cam, labelP);
              return <rect x={s.x - 16 * cam.zoom} y={s.y - 10 * cam.zoom} width={32 * cam.zoom} height={20 * cam.zoom} fill={C.white} stroke={C.ink} strokeWidth={1.5} transform={`rotate(${pr.k * 30} ${s.x} ${s.y})`} />;
            })()}
            {hands.map((h, i) => drawHand(cam, h.p, h, i))}
          </svg>
        </AbsoluteFill>

        {band > 0 && dim < 0.05 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 700, opacity: band, background: `linear-gradient(180deg, ${C.grey} 0%, ${C.grey} 62%, ${C.grey}00 100%)` }} />
        )}

        {(script.headlines as any[]).map((h) => {
          const end = h.exit ?? DURATION_S;
          if (h.id === "h5") return null; // rendered by the final card below
          // mount only while the words are moving or standing — no clipped slivers of idle headlines
          if (t < h.start - 0.05 || t > end + (h.lines.join(" ").split(" ").length - 1) * 0.03 + h.out + 0.1) return null;
          return (
            <Drift key={h.id} from={h.start} to={end} dy={-22}>
              <Words lines={h.lines} top={150} left={80} size={84} start={h.start} exit={h.exit ?? undefined} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
            </Drift>
          );
        })}

        {flash > 0 && <AbsoluteFill style={{ background: C.white, opacity: flash }} />}

        <VoiceSubtitles />

        {t >= T.dim - 0.2 && (
          <>
            {t >= LOGO_IN && (() => {
              const edge = -20 + EASE_LOGO(clamp((t - LOGO_IN) / 0.6)) * 140;
              const mask = `linear-gradient(45deg, #000 ${edge}%, transparent ${edge + 1}%)`;
              return (
                <div style={{ position: "absolute", left: 324, top: 600, width: 432, WebkitMaskImage: mask, maskImage: mask }}>
                  <Img src={staticFile("brand/dockentra-logo.png")} style={{ width: "100%", display: "block" }} />
                </div>
              );
            })()}
            {(() => {
              const h = (script.headlines as any[]).find((x) => x.id === "h5")!;
              const end = DURATION_S;
              return (
                <Drift from={h.start} to={end} dy={-16}>
                  <Words lines={[h.lines[0]]} top={1010} size={84} center start={h.start} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
                  <Words lines={[h.lines[1]]} top={1112} size={64} center start={h.start + 0.24} color={C.ink} stagger={h.stagger} rise={h.rise} out={h.out} />
                </Drift>
              );
            })()}
          </>
        )}

        <Audio src={staticFile("music-cosmetics.wav")} />
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};

/** Voice subtitles: small plate at the bottom, per spoken phrase — never duplicates a headline. */
const VoiceSubtitles: React.FC = () => {
  const t = useT();
  return (
    <>
      {(script.subtitles as [number, number, string][]).map(([a, b, text]) => {
        const k = ramp(t, a, 0.3) * (1 - ramp(t, b, 0.2, EASE_MOVE));
        if (k <= 0) return null;
        return (
          <div key={a} style={{ position: "absolute", left: 0, right: 0, bottom: SUB_BOTTOM, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 16 - 14 * ramp(t, a, b - a, EASE_MOVE)}px)` }}>
            <div style={{ maxWidth: 980, background: "rgba(255,255,255,0.92)", border: `2px solid ${C.grey}`, borderRadius: 22, padding: "12px 26px", textAlign: "center", fontFamily: FONT.body, fontWeight: 500, fontSize: 46, lineHeight: 1.3, color: C.ink }}>
              {text}
            </div>
          </div>
        );
      })}
    </>
  );
};
