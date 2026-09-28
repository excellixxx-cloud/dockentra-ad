import { Config } from "@remotion/cli/config";

// Use a locally installed Chromium instead of letting Remotion download
// chrome-headless-shell (the download host is not reachable from every
// environment). Set REMOTION_BROWSER_EXECUTABLE to override.
Config.setBrowserExecutable(
  process.env.REMOTION_BROWSER_EXECUTABLE ??
    "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
);
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(17);
Config.setConcurrency(4);
