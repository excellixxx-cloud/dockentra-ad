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

## Full cut from Motion — `out/full-66s.mp4` (66.0 s, 1920x1080, 30 fps, AAC 48 kHz)
Frame / audio check:
- Logo (scene 7): EXACT.
  - Hard cut to the Dock Ink D at 56.000. The D is pixel-identical 56.03–57.60 and never moves afterwards.
  - The axis is 640x10 px, full length while travelling, behind the D. It enters from off-screen left at 57.600 and settles at 58.200 (18 frames).
  - Measured path vs cubic-bezier(.22,1,.36,1): max error < 1 px.
  - Rest: right end at x 1039 = right edge of the counter (expected 1040.4).
  - Hold 58.2–60.0: zero changed pixels.
- End card: text fade-up 60.03–60.57, then static; the D and axis do not move.
- Background flat (244,245,248) on every corner. Headlines Manrope, subtitles Inter, ink. Subtitle bottom edge 245 px above the frame bottom.
- Scene 3 mint outline on the Recipient card; scene 6 mint scan icon with a Dock Green "PICK & SCAN" caption.
- Real screenshots, blur kept. No forbidden claims, no disclaimer.
- VO: all 7 lines at the requested times (within ~0.2 s), read back by Whisper and Moonshine. The brand is heard as "Doc-Enthra" / "Doc-Entre": first-syllable stress OK, the final "-tra" is a little soft.
- Mix: -14.1 LUFS integrated, -1.2 dBTP.
- Motion in scenes 2–6 is slow drift; at full resolution every frame changes, so no frozen frames before the logo.
