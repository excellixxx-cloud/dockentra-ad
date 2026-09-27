// Renders ad.html frame by frame (headless Chromium) and encodes an H.264 MP4,
// 1080x1920 @ 30 fps, 36 s, with music.wav from gen_music.py when present.
//
//   FFMPEG=... CHROMIUM=... node render.mjs                 # full video
//   node render.mjs --stills 1,3.5,6.3,10,13,18.2,22,25,27.2,30.5,33.8,35.8
import { chromium } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const DURATION = 36;
const OUT = path.join(here, "out");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
// Headless Chromium here cannot complete TLS through the sandbox's egress
// proxy, so Google Fonts requests are fetched with curl (which trusts the
// proxy CA) and handed back to the page. The page still loads its fonts
// from the Google Fonts CDN URLs; only the transport changes.
await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
  const url = route.request().url();
  const ua = route.request().headers()["user-agent"];
  const body = execFileSync("curl", ["-sSL", "--fail", "-A", ua, url], { maxBuffer: 1 << 26 });
  const contentType = url.includes("googleapis") ? "text/css; charset=utf-8" : "font/woff2";
  await route.fulfill({ status: 200, body, contentType, headers: { "access-control-allow-origin": "*" } });
});
await page.goto(pathToFileURL(path.join(here, "ad.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
// Force every face in use to load, then list what actually loaded.
const loaded = await page.evaluate(async () => {
  await Promise.all(['800 100px "Manrope"', '600 40px "Inter"', '500 30px "IBM Plex Mono"'].map((f) => document.fonts.load(f)));
  return [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`))];
});
console.log("fonts loaded from Google Fonts CDN:", loaded.join(", "));
for (const fam of ["Manrope", "Inter", "IBM Plex Mono"]) {
  if (!loaded.some((f) => f.startsWith(fam))) throw new Error(`${fam} failed to load`);
}

const stillsArg = process.argv.indexOf("--stills");
if (stillsArg !== -1) {
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(OUT, `still-${t.toFixed(1).padStart(4, "0")}s.png`) });
  }
  await browser.close();
  process.exit(0);
}

const music = path.join(OUT, "music.wav");
const audioIn = existsSync(music) ? ["-i", music] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"];
const audioFx = existsSync(music) ? ["-af", "loudnorm=I=-17:TP=-1.5:LRA=11", "-ar", "48000"] : [];

const ffmpeg = spawn(process.env.FFMPEG || "ffmpeg", [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...audioIn,
  "-map", "0:v", "-map", "1:a", ...audioFx,
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
  path.join(OUT, "dockentra-same-order-three-ways-9x16.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });

const total = FPS * DURATION;
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.render(t), f / FPS);
  const buf = await page.screenshot({ type: "png" });
  if (!ffmpeg.stdin.write(buf)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (f % 180 === 0) console.log(`frame ${f}/${total}`);
}
ffmpeg.stdin.end();
await new Promise((r) => ffmpeg.on("close", r));
await browser.close();
console.log("done");
