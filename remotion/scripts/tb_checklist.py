"""dockentra-motion acceptance checklist for "Two boxes" (1080x1920, 32 s).

    python3 scripts/tb_checklist.py ../twoboxes/out/dockentra-two-boxes.mp4 [--seed N]
Frames are streamed one at a time; the scene layout and the headline / logo timings are read from
src/twoboxes/TwoBoxes.tsx so the check follows the film."""
import argparse
import json
import random
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
PALETTE = {"#0B0D10", "#4FDCA9", "#0F5F4A", "#F5F7F8", "#FFFFFF"}
BRAND_FONTS = {"Manrope", "Inter", "IBM Plex Mono"}
W, H = 270, 480
MOVE_PX = 25
SCENES = [("1 table", 0, 5), ("2 scale", 5, 11), ("3 mailer measured", 11, 19), ("4 box measured", 19, 26), ("5 repacked", 26, 29), ("6 end", 29, 32)]

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--seed", type=int)
args = ap.parse_args()
src = (ROOT / "src/twoboxes/TwoBoxes.tsx").read_text()
heads = [(float(a), float(b), t) for a, b, t in re.findall(r'\[([\d.]+), ([\d.]+), "([^"]+)"\],', src.split("HEADLINES")[1].split("];")[0])]
logo_in = float(re.search(r"logo: ([\d.]+)", src).group(1))
interrupt = float(re.search(r"cmpB: ([\d.]+)", src).group(1))


def stream(path, w, h, fmt="gray", ch=1):
    p = subprocess.Popen([FF, "-v", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", fmt, "-"], stdout=subprocess.PIPE)
    size = w * h * ch
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape((h, w, ch) if ch > 1 else (h, w))
    p.wait()


def longest_still(mv, lo=0, hi=None):
    hi = len(mv) if hi is None else hi
    best, run, at, start = 0, 0, lo, lo
    for i in range(lo, hi):
        if mv[i]:
            run = 0
            continue
        if run == 0:
            start = i
        run += 1
        if run > best:
            best, at = run, start
    return best, (at + 1) / FPS


results = []


def report(name, ok, *lines):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    for line in lines:
        print(f"       {line}")


mv, fl, prev = [], [], None
for f in stream(args.video, W, H):
    f = f.astype(np.int16)
    if prev is not None:
        d = np.abs(f - prev)
        mv.append(((d > 12) & ((f < 170) | (prev < 170))).sum() >= MOVE_PX)
        fl.append(d.mean())
    prev = f
moving, full = np.array(mv), np.array(fl)
n = len(moving) + 1

r, at = longest_still(moving)
report("Hard rule: no frame unchanged for more than 1 s", r < FPS, f"longest still {r / FPS:.2f} s at {at:.2f} s; frames mid-animation {moving.mean():.0%}")

lines, ok = [], True
for name, a, b in SCENES:
    lo, hi = int(a * FPS), min(int(b * FPS), n - 1)
    r, at = longest_still(moving, lo, hi)
    share = moving[lo:hi].mean()
    ok &= r < FPS and share > 0.5
    lines.append(f"{name:18s} {share:4.0%} moving, longest still {r / FPS:.2f} s at {at:.2f} s")
report("1. 0.25x review — motion in every scene", ok, *lines)

seed = args.seed if args.seed is not None else random.SystemRandom().randrange(1 << 30)
picks = sorted(random.Random(seed).sample(range(n - 1), 5))
hits = [bool(moving[p]) for p in picks]
report("2. Pause at 5 random timecodes — >= 4/5 mid-animation", sum(hits) >= 4, f"seed {seed}: " + ", ".join(f"{p / FPS:.2f}s {'moving' if h else 'STILL'}" for p, h in zip(picks, hits)))

# 3. pattern interrupt: the comparison lands with one sharp step at cmpB; nothing else is a hard cut
local = np.array([np.median(full[max(0, i - 15):i + 15]) for i in range(len(full))])
spike = full / (local + 0.5)
win = range(int((interrupt - 0.2) * FPS), int((interrupt + 0.4) * FPS))
peak = max(spike[i] for i in win)
cuts = [i for i in range(len(full)) if spike[i] > 6 and i not in win]
report("3. Pattern interrupt at the comparison, no other hard cut", peak > 2.5 and not cuts,
       f"strongest frame change at {interrupt:.2f} s: x{peak:.1f} the local median", "sharp changes elsewhere: " + (", ".join(f"{(i + 1) / FPS:.2f} s" for i in cuts) or "none"))

code = src + (ROOT / "src/warehouse/Room.tsx").read_text() + (ROOT / "src/warehouse/iso.tsx").read_text()
brand = (ROOT / "src/brand.ts").read_text()
beziers = {f"bezier({b})" for b in re.findall(r"Easing\.bezier\(([^)]*)\)", brand)}
used = sorted(set(re.findall(r"\b(EASE_APPEAR|EASE_MOVE|EASE_LOGO)\b", src)))
linear = re.findall(r"Easing\.linear|\(x\)\s*=>\s*x\b", code)
report("4. More than one easing profile, no linear", len(used) > 1 and not linear, f"profiles: {', '.join(sorted(beziers))}; used: {', '.join(used)}", f"linear easings found: {len(linear)}")

hexes = set()
for p in (ROOT / "src/twoboxes/TwoBoxes.tsx", ROOT / "src/warehouse/Room.tsx", ROOT / "src/warehouse/iso.tsx", ROOT / "src/brand.ts"):
    for line in p.read_text().splitlines():
        if "mask" not in line.lower():
            hexes |= {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}\b", line)}
off_hue, fi = 0, 0
for f in stream(args.video, 135, 240, "rgb24", 3):
    rgb = f.astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    d = np.maximum(mx - mn, 1e-6)
    r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) * 60
    col = (sat > 0.35) & (mx > 0.2)
    if fi >= int(logo_in * FPS):
        col[170:215, 40:95] = False            # the official logo keeps its artwork colours
    off_hue = max(off_hue, int((col & ~((hue > 135) & (hue < 190))).sum()))
    fi += 1
fams = {f["family"] for f in json.loads((ROOT / "public/fonts/manifest.json").read_text())}
logo_ok = "EASE_LOGO(clamp((t - TL.logo) / 0.6))" in src and "linear-gradient(45deg" in src and 32 - (logo_in + 0.6) >= 1.5
report("5. Colours, fonts and logo per Brand Book", not (hexes - PALETTE) and off_hue < 12 and fams == BRAND_FONTS and logo_ok,
       f"colours in source: {sorted(hexes)}", f"max off-palette-hue pixels in any frame: {off_hue}", f"fonts: {sorted(fams)}",
       f"logo: diagonal fill 600 ms (EASE_LOGO) at {logo_in} s, holds {32 - logo_in - 0.6:.1f} s after the fill")

# Rule 3: one phrase of <= 8 words, top third, >= 2.5 s on screen
lines, ok = [], True
for a, b, t in heads:
    words = len(t.split())
    good = words <= 8 and b - a >= 2.5
    ok &= good
    lines.append(f"{'ok ' if good else 'BAD'} {a:5.2f}-{b:5.2f} ({b - a:4.1f} s) {words} words  {t}")
report("Headlines: <= 8 words, >= 2.5 s each", ok, *lines)

# Prohibited: text motionless > 2 s (headline band)
crop_frames = list(stream(args.video, 540, 960))
band = [c[95:280, 30:510].astype(np.int16) for c in crop_frames]
has = [(b < 90).sum() > 200 for b in band]
alive = [not (has[i] and has[i + 60]) or (np.abs(band[i + 60] - band[i]) > 20).sum() > 40 for i in range(len(band) - 60)]
stills = sum(1 for x in alive if not x)
report("Prohibited: text motionless for more than 2 s (headline band)", stills == 0, f"2 s windows with an unchanged headline: {stills}")

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
