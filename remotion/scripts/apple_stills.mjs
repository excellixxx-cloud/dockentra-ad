// Keyframe stills for the 66 s Apple-style WMS cut: node scripts/apple_stills.mjs OUTDIR [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (let i = 0; i < 15; i++) {
  const inputProps = { i };
  const comp = await selectComposition({ serveUrl, id: "AppleKey", inputProps, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: `${out}/K${String(i).padStart(2, "0")}.png`, inputProps, scale: +scale, browserExecutable });
}
console.log("done");
