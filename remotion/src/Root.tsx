import { Composition } from "remotion";
import { FPS, H, W } from "./brand";
import { HelloDockentra } from "./HelloDockentra";
import { SameOrderThreeWays } from "./SameOrderThreeWays";
import { WarehouseTour, DURATION_S as WAREHOUSE_S } from "./warehouse/WarehouseTour";
import { CreatorSamples, DURATION_S as CREATOR_S } from "./creator/CreatorSamples";
import { CosmeticsKeyframes } from "./cosmetics/Keyframes";
import { KeyframeSheet, SHEET } from "./cosmetics/KeyframeSheet";
import { Cosmetics, DURATION_S as COSMETICS_S } from "./cosmetics/Cosmetics";
import { TwoBoxesKeyframe, TwoBoxes, DURATION_S as TB_S } from "./twoboxes/TwoBoxes";
import { WmsH, WmsV, WmsKey, TOTAL as WMS_T } from "./wms/Wms";
import { AppleWms, AppleKey, TOTAL as APPLE_T } from "./apple/Apple";
import { AppleFull, AppleFullKey, TOTAL as FULL_T } from "./apple/Full";
import { OpsChapter, OpsThumb, CHAPTERS as OPS_CH } from "./ops/Ops";
import { OpsFrame, OpsStoryboardSheet, OW, OH, SHEET as OPS_SHEET } from "./ops/Storyboard";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="WarehouseTour" component={WarehouseTour} durationInFrames={WAREHOUSE_S * FPS} fps={FPS} width={W} height={H} />
    <Composition id="CreatorSamples" component={CreatorSamples} durationInFrames={CREATOR_S * FPS} fps={FPS} width={W} height={H} defaultProps={{ freezeCamera: false }} />
    <Composition id="CosmeticsKeyframes" component={CosmeticsKeyframes} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{ scene: 1 }} />
    <Composition id="CosmeticsKeyframeSheet" component={KeyframeSheet} durationInFrames={1} fps={FPS} width={SHEET.w} height={SHEET.h} />
    <Composition id="Cosmetics" component={Cosmetics} durationInFrames={COSMETICS_S * FPS} fps={FPS} width={W} height={H} />
    <Composition id="OpsFrame" component={OpsFrame} durationInFrames={1} fps={FPS} width={OW} height={OH} defaultProps={{ i: 0 }} />
    <Composition id="OpsStoryboardSheet" component={OpsStoryboardSheet} durationInFrames={1} fps={FPS} width={OPS_SHEET.w} height={OPS_SHEET.h} />
    {OPS_CH.map((c) => (
      <Composition key={c.n} id={`Ops${c.n}`} component={OpsChapter} durationInFrames={Math.round(c.dur * 30)} fps={30} width={1920} height={1080} defaultProps={{ n: c.n }} />
    ))}
    <Composition id="OpsThumb" component={OpsThumb} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="WmsH" component={WmsH} durationInFrames={Math.ceil(WMS_T * 30)} fps={30} width={1920} height={1080} defaultProps={{ withAudio: false }} />
    <Composition id="WmsV" component={WmsV} durationInFrames={Math.ceil(WMS_T * 30)} fps={30} width={1080} height={1920} defaultProps={{ withAudio: false }} />
    <Composition id="WmsKeyH" component={WmsKey} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ i: 0, v: false }} />
    <Composition id="WmsKeyV" component={WmsKey} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ i: 0, v: true }} />
    <Composition id="AppleWms" component={AppleWms} durationInFrames={APPLE_T * 30} fps={30} width={1920} height={1080} />
    <Composition id="AppleKey" component={AppleKey} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ i: 0 }} />
    <Composition id="AppleFull" component={AppleFull} durationInFrames={Math.ceil(FULL_T * 30)} fps={30} width={1920} height={1080} />
    <Composition id="AppleFullKey" component={AppleFullKey} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ i: 0 }} />
    <Composition id="TwoBoxes" component={TwoBoxes} durationInFrames={TB_S * 30} fps={30} width={1080} height={1920} defaultProps={{ withAudio: false }} />
    <Composition id="TwoBoxesKeyframe" component={TwoBoxesKeyframe} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ i: 0 }} />
    <Composition id="SameOrderThreeWays" component={SameOrderThreeWays} durationInFrames={36 * FPS} fps={FPS} width={W} height={H} />
    <Composition id="HelloDockentra" component={HelloDockentra} durationInFrames={45} fps={30} width={1080} height={1920} />
  </>
);
