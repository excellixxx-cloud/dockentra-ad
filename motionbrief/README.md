# Motion brief — Dockentra WMS product presentation

`out/prototype.mp4` — 15 s prototype from Motion (job 8e52a4e8-c753-43b8-bb00-8bbeea0da022),
16:9 1920x1080 30 fps, no design system (Apple style described in the prompt; `apple` needs Motion Pro).

Frame check against the brief:
- Screens: real portal / picking screenshots, personal-data blur kept.
- Copy: "Your orders, live." / "Every unit scanned. Every step tracked." / end card text and contacts match the brief.
  No 24h / same-day, no revenue or volume numbers, no operating warehouse.
- One mint accent per scene (nav indicator; axis on the end card).
- Logo animation does NOT match the spec:
  - the axis is drawn as a growing stroke (left end fixed at x 470, right end grows to x 1449), not a segment that travels in from the left;
  - it is painted over the D stem rather than passing through the opening;
  - it runs about 470 ms (11.00 to 11.47 s), not 600 ms; ease-out, no bounce;
  - the D pops in first (10.53 s) with a scale-up, then the axis follows.
  - Hold after settle: 3.5 s (spec >= 1.5 s), OK.
- Audio: -23.7 LUFS integrated, -11.6 dBTP (quiet compared with our -14 LUFS masters).

## Full 66 s cut (technical script) — sent to Motion as a follow-up on the same job
- Logo asset: `remotion/public/apple/d-ink.png` — Dock Ink silhouette of the official D (585x576), cut from
  `brand/dockentra-logo.png`. At row y 264 the counter runs x 153–436; the axis stops flush at x 436, behind the D.
- Scene 7 timing sent: D alone 56.0–57.6, axis 57.6–58.2 (18 frames), hold 58.2–60.0.
- No Submit button exists in either new-order screenshot; the scene 3 mint accent goes on the Recipient card instead.
- VO lines and start times: `apple/tts.py` (George reads in `apple/voice/` for timing reference).
