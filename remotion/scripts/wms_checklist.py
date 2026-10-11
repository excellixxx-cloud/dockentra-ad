"""dockentra-motion acceptance checklist for the Dockentra WMS product video (16:9 or 9:16).

    python3 scripts/wms_checklist.py VIDEO.mp4 [--seed N]
Scene times come from src/wms/timeline.json. The screenshots are the product's real UI, so their own
colours (purple/orange icons) are exempt from the palette check; the check reads our source colours."""
import argparse, json, random, re, subprocess, sys
from pathlib import Path
import imageio_ffmpeg
import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
PALETTE = {"#0B0D10", "#4FDCA9", "#0F5F4A", "#F5F7F8", "#FFFFFF"}
ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--seed", type=int); args = ap.parse_args()
TL = json.loads((ROOT / "src/wms/timeline.json").read_text())
src = (ROOT / "src/wms/Wms.tsx").read_text()
probe = subprocess.run([FF, "-i", args.video], capture_output=True, text=True).stderr
vw, vh = map(int, re.search(r", (\d{3,4})x(\d{3,4})", probe).groups())
W, H = (480, 270) if vw > vh else (270, 480)

def stream(w, h):
    p = subprocess.Popen([FF, "-v", "error", "-i", args.video, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(w * h)
        if len(b) < w * h: break
        yield np.frombuffer(b, np.uint8).reshape(h, w).astype(np.int16)
    p.wait()

def longest_still(mv, lo=0, hi=None):
    hi = len(mv) if hi is None else hi
    best, run, at, start = 0, 0, lo, lo
    for i in range(lo, hi):
        if mv[i]: run = 0; continue
        if run == 0: start = i
        run += 1
        if run > best: best, at = run, start
    return best, (at + 1) / FPS

results = []
def report(name, ok, *lines):
    results.append(ok); print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    for l in lines: print(f"       {l}")

mv, fl, prev = [], [], None
for f in stream(W, H):
    if prev is not None:
        d = np.abs(f - prev); mv.append(((d > 12) & ((f < 200) | (prev < 200))).sum() >= 25); fl.append(d.mean())
    prev = f
moving, full = np.array(mv), np.array(fl); n = len(moving) + 1
print(f"{args.video}: {vw}x{vh}, {n / FPS:.1f} s")

r, at = longest_still(moving)
report("Hard rule: no frame unchanged for more than 1 s", r < FPS, f"longest still {r / FPS:.2f} s at {at:.2f} s; frames mid-motion {moving.mean():.0%}")
segs = [(s["name"], s["start"], s["end"]) for s in TL["scenes"]] + [("end card", TL["endCard"]["start"], TL["endCard"]["end"])]
lines, ok = [], True
for name, a, b in segs:
    lo, hi = int(a * FPS), min(int(b * FPS), n - 1); r, at = longest_still(moving, lo, hi); share = moving[lo:hi].mean()
    ok &= r < FPS and share > 0.5; lines.append(f"{name:9s} {share:4.0%} moving, longest still {r / FPS:.2f} s at {at:.2f} s")
report("1. 0.25x review — motion in every scene", ok, *lines)
seed = args.seed if args.seed is not None else random.SystemRandom().randrange(1 << 30)
picks = sorted(random.Random(seed).sample(range(n - 1), 5)); hits = [bool(moving[p]) for p in picks]
report("2. Pause at 5 random timecodes — >= 4/5 mid-motion", sum(hits) >= 4, f"seed {seed}: " + ", ".join(f"{p / FPS:.2f}s {'moving' if h else 'STILL'}" for p, h in zip(picks, hits)))
local = np.array([np.median(full[max(0, i - 15):i + 15]) for i in range(len(full))]); spike = full / (local + 0.5)
stores = next(s for s in TL["scenes"] if s["name"] == "stores"); floor = next(s for s in TL["scenes"] if s["name"] == "floor")
snap = stores["start"] + 4.2; cuts = [floor["lines"][1]["a"] - 0.35, floor["lines"][1]["a"] + 1.25]
def peak(t): return max(spike[i] for i in range(int((t - .15) * FPS), int((t + .3) * FPS)))
report("3. Pattern interrupts: snap-zoom (stores) and quick cuts (warehouse floor)", peak(snap) > 3 and all(peak(c) > 3 for c in cuts),
       f"snap-zoom at {snap:.2f} s: x{peak(snap):.1f} the local median", "quick cuts at " + ", ".join(f"{c:.2f} s: x{peak(c):.1f}" for c in cuts))
code = src + (ROOT / "src/warehouse/Room.tsx").read_text()
linear = re.findall(r"Easing\.linear|\(x\)\s*=>\s*x\b", code)
used = sorted(set(re.findall(r"\b(EASE_APPEAR|EASE_MOVE|EASE_LOGO)\b", src)))
report("4. More than one easing profile, never linear", len(used) >= 2 and not linear, f"used: {', '.join(used)} (.22,1,.36,1 settling; .4,0,.2,1 movement)", f"linear easings: {len(linear)}")
hexes = {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}\b", src + (ROOT / "src/brand.ts").read_text())}
stagger = "a + (wi++) * 0.075" in src and "a + 0.1 + j * 0.075" in src
logo = "EASE_LOGO(clamp((T - a - 0.3) / 0.6))" in src and src.count("linear-gradient(45deg") >= 2
hold = TL["endCard"]["end"] - (TL["endCard"]["start"] + 0.3 + 0.6)
subs = "bottom: 240" in src and "FONT.body" in src.split("const Subs")[1].split("};")[0] and "mint" not in src.split("const Subs")[1].split("};")[0].lower()
report("5. Brand: palette, kinetic type, logo, subtitles", not (hexes - PALETTE) and stagger and logo and hold >= 1.5 and subs,
       f"colours in our source: {sorted(hexes)} (screenshots keep their own UI colours)", f"headline words staggered 75 ms: {stagger}",
       f"logo: diagonal fill 600 ms, EASE_LOGO (.22,1,.36,1), holds {hold:.1f} s: {logo}", f"subtitles Inter, never mint, bottom edge 240 px from the frame edge: {subs}")
band = (slice(int(0.05 * H), int(0.3 * H)), slice(0, int(0.42 * W))) if vw > vh else (slice(int(0.07 * H), int(0.24 * H)), slice(0, W))
frames = [f[band] for f in stream(W, H)]
has = [(b < 90).sum() > 60 for b in frames]
alive = [not (has[i] and has[i + 60]) or (np.abs(frames[i + 60] - frames[i]) > 20).sum() > 15 for i in range(len(frames) - 60)]
report("Prohibited: headline motionless for more than 2 s", all(alive), f"2 s windows with an unchanged headline: {alive.count(False)}")
print(f"\n{sum(results)}/{len(results)} checks passed"); sys.exit(0 if all(results) else 1)
