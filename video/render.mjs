// Renders video/src/ad.html frame by frame with headless Chromium and
// encodes it to an H.264 MP4 (1080x1920, 30 fps) with a silent AAC track.
//
//   FFMPEG=/path/to/ffmpeg node video/render.mjs            # full video
//   node video/render.mjs --stills 1.5,7,12,20,27           # PNG stills only
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const DURATION = 30;
const OUT = path.join(here, "out");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "src", "ad.html")).href);
await page.evaluate(() => document.fonts.ready);

const stillsArg = process.argv.indexOf("--stills");
if (stillsArg !== -1) {
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(OUT, `still-${String(t).padStart(4, "0")}s.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ffmpeg = spawn(process.env.FFMPEG || "ffmpeg", [
  "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "128k", "-shortest",
  "-movflags", "+faststart",
  path.join(OUT, "dockentra-batch-photo-9x16.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });

const total = FPS * DURATION;
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.render(t), f / FPS);
  const buf = await page.screenshot({ type: "png" });
  if (!ffmpeg.stdin.write(buf)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (f % 150 === 0) console.log(`frame ${f}/${total}`);
}
ffmpeg.stdin.end();
await new Promise((r) => ffmpeg.on("close", r));
await browser.close();
console.log("done");
