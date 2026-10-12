// Frame renderer for the sting:  node sting/render.mjs stills OUTDIR 40 86 150 230
//                                 node sting/render.mjs all OUTDIR        (720 half frames → 59.94 master)
//                                 node sting/render.mjs range OUTDIR 490 601   (re-render some half frames)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));   // global install
const [mode, out, ...rest] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.resolve("sting/index.html"));
await page.evaluate(() => window.ready);
const stage = await page.$("#stage");
const idx = mode === "range" ? Array.from({ length: +rest[1] - +rest[0] + 1 }, (_, k) => +rest[0] + k) : Array.from({ length: 720 }, (_, i) => i);
const frames = mode === "stills" ? rest.map(Number) : idx.map((i) => i / 2);
for (const [i, f] of frames.entries()) {
  await page.evaluate((f) => window.seek(f), f);
  await page.evaluate(() => Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r))))));
  const name = mode === "stills" ? `f${String(f).padStart(3, "0")}.png` : `${String(idx[i]).padStart(4, "0")}.png`;
  await stage.screenshot({ path: path.join(out, name) });
}
await browser.close();
console.log("rendered", frames.length);
