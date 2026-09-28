import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "./components/Background";
import { IconStage } from "./components/IconStage";
import { MorphTitle } from "./components/Kinetic";
import { Subtitles } from "./components/Subtitles";
import { loadBrandFonts } from "./fonts";
import { Box, EndCard, Hook, Mailer, Polybag, Question, Recap } from "./scenes/Scenes";
import { SCENES, TimeContext } from "./time";

loadBrandFonts();

/** "Same order, three ways" — Dockentra Overhead content plan, 28.09. */
export const SameOrderThreeWays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const seq = (k: keyof typeof SCENES) => ({ from: Math.round(SCENES[k][0] * fps), durationInFrames: Math.round((SCENES[k][1] - SCENES[k][0]) * fps) });

  return (
    <TimeContext.Provider value={t}>
      <AbsoluteFill>
        <Background />
        <Sequence {...seq("hook")} name="Hook" layout="none"><Hook /></Sequence>
        <Sequence {...seq("polybag")} name="Polybag" layout="none"><Polybag /></Sequence>
        <Sequence {...seq("mailer")} name="Mailer" layout="none"><Mailer /></Sequence>
        <Sequence {...seq("box")} name="Box" layout="none"><Box /></Sequence>
        <Sequence {...seq("recap")} name="Recap" layout="none"><Recap /></Sequence>
        <Sequence {...seq("question")} name="Question" layout="none"><Question /></Sequence>
        {/* Shared elements: live across scene boundaries */}
        <Sequence from={Math.round(4.2 * fps)} durationInFrames={Math.round(22.5 * fps)} name="MorphTitle" layout="none">
          <MorphTitle
            top={210}
            size={124}
            steps={[
              { at: 4.25, type: "type", text: "Polybag.", cps: 16 },
              { at: 11.55, type: "erase", cps: 26 },
              { at: 12.1, type: "type", text: "Padded mailer.", cps: 22 },
              { at: 20.0, type: "cut", text: "Box." },
              { at: 26.35, type: "erase", cps: 26 },
            ]}
          />
        </Sequence>
        <IconStage />
        <Sequence {...seq("logo")} name="EndCard" layout="none"><EndCard /></Sequence>
        <Subtitles lightFrom={34.5} />
        <Audio src={staticFile("music.wav")} />
      </AbsoluteFill>
    </TimeContext.Provider>
  );
};
