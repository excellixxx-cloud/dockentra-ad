// Downloads the brand fonts from the Google Fonts CDN into public/fonts and
// writes public/fonts/manifest.json for src/fonts.ts. Rendering then never
// depends on the network (Remotion's headless Chromium does not use the
// sandbox proxy, and a render should be reproducible anyway).
//
//   node scripts/fetch-google-fonts.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=block";
// A Chrome UA makes Google serve woff2.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const OUT = path.resolve("public/fonts");
mkdirSync(OUT, { recursive: true });

const css = execFileSync("curl", ["-sSL", "--fail", "-A", UA, CSS_URL]).toString();
const manifest = [];
// Keep only the "latin" subset block of each face.
for (const m of css.matchAll(/\/\* latin \*\/\s*@font-face\s*{([^}]*)}/g)) {
  const block = m[1];
  const family = block.match(/font-family:\s*'([^']+)'/)[1];
  const weight = block.match(/font-weight:\s*(\d+)/)[1];
  const url = block.match(/src:\s*url\(([^)]+)\)/)[1];
  const file = `${family.replace(/\s+/g, "")}-${weight}.woff2`;
  execFileSync("curl", ["-sSL", "--fail", "-o", path.join(OUT, file), url]);
  manifest.push({ family, weight, file, source: url });
}
writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(manifest.map((f) => `${f.family} ${f.weight}`).join("\n"));
