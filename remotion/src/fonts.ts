import { continueRender, delayRender, cancelRender, staticFile } from "remotion";
import manifest from "../public/fonts/manifest.json";

/** Registers the brand fonts (downloaded from the Google Fonts CDN by
 *  scripts/fetch-google-fonts.mjs) and holds the render until they load. */
let loading: Promise<void> | null = null;
export function loadBrandFonts() {
  if (loading) return;
  const handle = delayRender("Loading brand fonts");
  loading = Promise.all(
    manifest.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)}) format("woff2")`, { weight: f.weight });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
}
