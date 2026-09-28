import { Composition } from "remotion";
import { FPS, H, W } from "./brand";
import { HelloDockentra } from "./HelloDockentra";
import { SameOrderThreeWays } from "./SameOrderThreeWays";
import { CreatorSamples, DURATION_S as CREATOR_S } from "./creator/CreatorSamples";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CreatorSamples" component={CreatorSamples} durationInFrames={CREATOR_S * FPS} fps={FPS} width={W} height={H} defaultProps={{ freezeCamera: false }} />
    <Composition id="SameOrderThreeWays" component={SameOrderThreeWays} durationInFrames={36 * FPS} fps={FPS} width={W} height={H} />
    <Composition id="HelloDockentra" component={HelloDockentra} durationInFrames={45} fps={30} width={1080} height={1920} />
  </>
);
