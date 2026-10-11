// Stage-1 stills for the WMS video: node scripts/wms_stills.mjs OUTDIR H|V [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, fmt, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const v = fmt === "V";
for (let i = 0; i < 13; i++) {
  const inputProps = { i, v };
  const comp = await selectComposition({ serveUrl, id: v ? "WmsKeyV" : "WmsKeyH", inputProps, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: `${out}/${fmt}${String(i).padStart(2, "0")}.png`, inputProps, scale: +scale, browserExecutable });
}
console.log("done");
