// Stills of one composition at given frames: node scripts/frames.mjs OUTDIR ID scale f1 f2 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, id, scale, ...frames] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id, browserExecutable });
for (const f of frames) {
  await renderStill({ composition: comp, serveUrl, frame: +f, output: `${out}/f${String(f).padStart(3, "0")}.png`, scale: +scale, browserExecutable });
  console.log("frame", f);
}
