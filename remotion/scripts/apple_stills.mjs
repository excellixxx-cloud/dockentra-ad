// Keyframe stills for the Apple-style WMS films: node scripts/apple_stills.mjs OUTDIR [scale] [AppleKey|AppleFullKey] [count]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, scale = "0.5", id = "AppleKey", n = "15"] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (let i = 0; i < +n; i++) {
  const inputProps = { i };
  const comp = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: `${out}/K${String(i).padStart(2, "0")}.png`, inputProps, scale: +scale, browserExecutable });
}
console.log("done");
