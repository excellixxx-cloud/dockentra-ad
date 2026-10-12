# Dockentra WMS — 66 s Apple-style cut (Remotion rebuild of the Motion cut)

`out/dockentra-wms-66s.mp4` — 1920x1080, 30 fps, 66.0 s.
Picture: `remotion/src/apple/Apple.tsx` (composition `AppleWms`).
Sound: copied untouched from the Motion cut `motionbrief/out/full-66s.mp4` (VO + music, -14.1 LUFS).

What changed against the Motion cut:
- Every screen shows its desktop version in a browser next to the iPhone, with the same camera moves:
  - portal home;
  - new order;
  - my shipments;
  - charged this month;
  - pick & scan.
- Logo: the official colour D (`remotion/public/apple/d-color.png`) with the mint axis passing behind it.
  - D static 56.0–57.6;
  - axis 57.6–58.2 (EASE_LOGO);
  - hold 58.2–60.0 with zero changed pixels;
  - same path as the Motion cut.
- End card: the tagline and `dockentra.ie`; WhatsApp removed at the client's request.

Render:
    cd remotion && npx remotion render src/index.ts AppleWms ../apple/out/_video.mp4 --muted --crf=16
    ffmpeg -i apple/out/_video.mp4 -i motionbrief/out/full-66s.mp4 -map 0:v -map 1:a -c copy apple/out/dockentra-wms-66s.mp4
