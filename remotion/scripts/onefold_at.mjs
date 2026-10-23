// Stills of the One fold film at arbitrary times: node scripts/onefold_at.mjs OUTDIR SCALE t1 t2 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, scale, ...ts] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const t of ts) {
  const inputProps = { i: 0, t: +t };
  const comp = await selectComposition({ serveUrl, id: "OneFoldKey", inputProps, browserExecutable });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: `${out}/t${(+t).toFixed(2).padStart(5, "0")}.png`, inputProps, scale: +scale, browserExecutable });
}
console.log("done");
