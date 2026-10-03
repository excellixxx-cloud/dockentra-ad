// Renders stills for the ops chapters: node scripts/ops_stills.mjs OUTDIR "n:t,t,t;n:t" (t in seconds, chapter-local)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, spec] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const part of spec.split(";")) {
  const [n, ts] = part.split(":");
  const comp = await selectComposition({ serveUrl, id: `Ops${n}`, inputProps: { n: +n }, browserExecutable });
  for (const t of ts.split(",")) {
    const frame = Math.min(comp.durationInFrames - 1, Math.round(+t * 30));
    await renderStill({ composition: comp, serveUrl, frame, output: `${out}/ch${n}_${t}.png`, inputProps: { n: +n }, scale: 0.5, browserExecutable });
    console.log(`ch${n} ${t}`);
  }
}
