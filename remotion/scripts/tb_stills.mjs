// Keyframes of "Two boxes": node scripts/tb_stills.mjs OUTDIR [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, scale = "1"] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (let i = 0; i < 7; i++) {
  const comp = await selectComposition({ serveUrl, id: "TwoBoxesKeyframe", inputProps: { i }, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: `${out}/kf${i}.png`, inputProps: { i }, scale: +scale, browserExecutable });
  console.log(i);
}
