import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, clamp, EASE_LOGO, EASE_MOVE, FONT, ramp } from "../brand";
import { Drift, Words } from "../components/Kinetic";
import { loadBrandFonts } from "../fonts";
import { TimeContext, useT } from "../time";
import { iso } from "../warehouse/iso";
import { P, PROP, sp } from "./geo";
import {
  BalmJar, BubbleRoll, BubbleSheet, BubbleWrapJar, ClearLid, CreamJar, FillerBox, KraftMailer, LabelPrinter, LiftShadow,
  Lipstick, LotionBottle, MailerStack, MaskingTape, PaperBall, Scale, ShippingLabel, StockBox, TapeDispenser, TapeRibbon,
  WallsAndTable, ZipBagBack, ZipBagFront,
} from "./Props";
import script from "./script.json";
import {
  ballsAt, bottleAt, boxesAt, breathe, buildCamera, DURATION_S, flashAt, jarAt, labelAt, lipBalmAt, mailer1At,
  mailer2At, mailer3At, mailerVisible, printerAt, scaleAt, shakeAt, T,
} from "./timeline";
import { Cam } from "./Keyframes";

loadBrandFonts();
export { DURATION_S };

const toScreen = (cam: Cam, p: P) => {
  const a = iso(p[0], p[1], p[2]), o = iso(cam.x, cam.y, cam.z);
  return { x: cam.ax + cam.zoom * (a.X - o.X), y: cam.ay + cam.zoom * (a.Y - o.Y) };
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
  const balls = ballsAt(t);
  const lipBalm = lipBalmAt(t);
  const boxes = boxesAt(t);
  const sc = scaleAt(t);
  const pr = printerAt(t);
  const label = labelAt(t, m1);

  const apex = toScreen(cam, [0, 0, 0]);
  const band = clamp((620 - apex.y) / 260);
  const dim = ramp(t, T.dim, 0.6, EASE_MOVE);

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
              {bottle && (() => {
                const bb = bottle.bag;
                const box = bb ? { x0: bb.at[0] - 1.5, y0: bb.at[1] - 2.6, x1: bb.at[0] + 16.5, y1: bb.at[1] + 2.6, z0: bb.at[2] + 0.02, zTop: bb.at[2] + 3.5 } : null;
                const base = sp(bottle.p);
                return (
                  <g opacity={bottle.opacity}>
                    {box && <ZipBagBack b={box} op={bb!.op} />}
                    <LiftShadow x={bottle.p[0] + 7} y={bottle.p[1]} r={6.5} lift={bottle.p[2]} />
                    <g transform={`rotate(${bottle.rot} ${base[0]} ${base[1]})`}>
                      <LotionBottle p={bottle.p} capGap={bottle.capGap} drop={bottle.drop} taped={bottle.taped} />
                    </g>
                    {bottle.tape && <TapeRibbon from={bottle.tape.from} to={bottle.tape.to} op={bottle.tape.op} />}
                    {box && <ZipBagFront b={box} open={bb!.open} zip={bb!.zip} op={bb!.op} />}
                  </g>
                );
              })()}
              {jar && (
                <g opacity={jar.opacity}>
                  <LiftShadow x={jar.p[0]} y={jar.p[1]} r={3} lift={jar.p[2]} seed={5} />
                  <CreamJar p={jar.p} crack={jar.crack} />
                  <BubbleWrapJar p={jar.p} wrap={jar.wrap} taped={jar.taped} />
                </g>
              )}
              {jar?.sheet && (
                <g>
                  <LiftShadow x={jar.sheet.c[0]} y={jar.sheet.c[1]} r={3 * jar.sheet.s} lift={jar.sheet.c[2]} seed={9} />
                  <BubbleSheet c={jar.sheet.c} s={jar.sheet.s} />
                </g>
              )}
              {balls.map((b, i) => (
                <g key={i} opacity={b.op}>
                  <LiftShadow x={b.c[0]} y={b.c[1]} r={1.3} lift={Math.max(0, b.c[2] - 1.1)} seed={b.seed} />
                  <PaperBall c={b.c} seed={b.seed} squash={b.squash} />
                </g>
              ))}
              {lipBalm && (() => {
                const bg = lipBalm.bag;
                const box = bg ? { x0: bg.b.x0, y0: bg.b.y0, x1: bg.b.x0 + 15, y1: bg.b.y0 + 6.5, z0: bg.b.z0, zTop: bg.b.z0 + 2.4 } : null;
                return (
                  <g opacity={lipBalm.opacity}>
                    {box && <ZipBagBack b={box} op={bg!.op} />}
                    <Lipstick p={lipBalm.lip} melted={lipBalm.melted} />
                    <BalmJar p={lipBalm.balm} crater={lipBalm.crater} />
                    {!bg && <ClearLid p={[lipBalm.balm[0] + 4, lipBalm.balm[1] + 2, 0]} />}
                    {box && <ZipBagFront b={box} open={bg!.open} zip={bg!.zip} op={bg!.op} />}
                  </g>
                );
              })()}
              {boxes.map((bx) => (
                <g key={bx.cell} opacity={bx.opacity}>
                  <StockBox p={bx.p} cell={bx.cell} heat={bx.heat} />
                  {bx.cell === "A6" && bx.heat > 0.05 && (() => {
                    const s0 = sp([bx.p[0] + 4, bx.p[1] + 4, 9.5]);
                    return (
                      <g opacity={bx.heat}>
                        {[-1, 0, 1].map((i) => {
                          const x0 = s0[0] + i * 30, y0 = s0[1] - 6 * Math.sin(t * 5 + i);
                          const d = `M${x0} ${y0} c-9 -13 9 -24 0 -37 s9 -24 0 -37`;
                          return <path key={i} d={d} fill="none" stroke={PROP.red} strokeWidth={4} strokeLinecap="round" opacity={0.7 - Math.abs(i) * 0.2} vectorEffect="non-scaling-stroke" />;
                        })}
                      </g>
                    );
                  })()}
                </g>
              ))}
              {label && (
                <g>
                  {label.flying && <LiftShadow x={label.c[0]} y={label.c[1]} r={2.4} lift={label.c[2] - 3} seed={11} />}
                  <ShippingLabel c={label.c} tilt={label.tilt} sheen={label.sheen} />
                </g>
              )}
            </g>
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
