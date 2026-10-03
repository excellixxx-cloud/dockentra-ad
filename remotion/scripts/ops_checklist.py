"""dockentra-motion acceptance checklist for the 16:9 YouTube operations video.

The portrait checklist (checklist.py) assumes 1080x1920 bands and a single
short ad. This one reads the chapter layout from src/ops/timeline.json.

    python3 scripts/ops_checklist.py ../youtube/out/dockentra-operations-full.mp4 [--seed N]
"""
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
W, H = 480, 270            # analysis size (1/4 of 1920x1080)
MOVE_PX = 25

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--seed", type=int)
args = ap.parse_args()
TL = json.loads((ROOT / "src/ops/timeline.json").read_text())


def decode(path, w, h, fmt, ch):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape((-1, h, w, ch) if ch > 1 else (-1, h, w))


def longest_still(is_moving, lo=0, hi=None):
    hi = len(is_moving) if hi is None else hi
    best, run, at, start = 0, 0, lo, lo
    for i in range(lo, hi):
        if is_moving[i]:
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


g = decode(args.video, W, H, "gray", 1).astype(np.int16)
n = len(g)
fg = g < 170                                   # ink / green on the light set
diff = np.abs(np.diff(g, axis=0)) > 12
moving = (diff & (fg[1:] | fg[:-1])).sum(axis=(1, 2)) >= MOVE_PX
chs = TL["chapters"]

# ---- Hard rule ----
r, at = longest_still(moving)
report("Hard rule: no frame unchanged for more than 1 s", r < FPS, f"longest still {r / FPS:.2f} s at {at:.2f} s; frames mid-animation overall {moving.mean():.0%}")

# ---- 1. motion in every chapter ----
lines, ok = [], True
for c in chs:
    lo, hi = int(c["start"] * FPS), min(int((c["start"] + c["dur"]) * FPS), n - 1)
    r, at = longest_still(moving, lo, hi)
    share = moving[lo:hi].mean()
    ok &= r < FPS and share > 0.5
    lines.append(f"ch{c['n']} {c['name'][:30]:30s} {share:4.0%} moving, longest still {r / FPS:.2f} s")
report("1. 0.25x review — motion in every chapter", ok, *lines)

# ---- 2. five random pauses ----
seed = args.seed if args.seed is not None else random.SystemRandom().randrange(1 << 30)
picks = sorted(random.Random(seed).sample(range(n - 1), 5))
hits = [bool(moving[p]) for p in picks]
report("2. Pause at 5 random timecodes — >= 4/5 mid-animation", sum(hits) >= 4,
       f"seed {seed}: " + ", ".join(f"{p / FPS:.2f}s {'moving' if h else 'STILL'}" for p, h in zip(picks, hits)))

# ---- 3. transitions: chapter cards are the pattern interrupt, entered by wipes, never by hard cuts ----
full = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
prev = np.r_[0, full[:-1]]
ahead = np.array([full[i:i + 10].max() for i in range(len(full))])
local = np.array([np.median(full[max(0, i - 15):i + 15]) for i in range(len(full))])
cuts = [i for i in range(len(full)) if full[i] / (local[i] + 0.5) > 6 and full[i] > 2.5 * prev[i] and full[i] >= 0.8 * ahead[i]]
cards = []
for c in chs[1:]:
    f = g[int((c["start"] + 1.0) * FPS)]
    grey_share = ((f > 235) & (f < 250)).mean()          # Bay Grey #F5F7F8 fills the frame
    cards.append((c["n"], grey_share))
ok = not cuts and all(s > 0.75 for _, s in cards)
report("3. Pattern interrupt: 9 full-screen chapter cards, every one entered by a wipe (no hard cuts)", ok,
       "chapter cards at +1.0 s (Bay Grey share): " + ", ".join(f"{k:02d} {s:.0%}" for k, s in cards),
       "hard cuts (sharp single-frame onset): " + (", ".join(f"{(i + 1) / FPS:.2f} s" for i in cuts) or "none"))

# ---- 4. easing profiles, no linear ----
sources = sorted((ROOT / "src/ops").glob("*.tsx")) + sorted((ROOT / "src/warehouse").glob("*.tsx"))
code = "\n".join(p.read_text() for p in sources)
brand = (ROOT / "src/brand.ts").read_text()
beziers = {f"bezier({b})" for b in re.findall(r"Easing\.bezier\(([^)]*)\)", brand + code)}
used = sorted(set(re.findall(r"\b(EASE_APPEAR|EASE_MOVE|EASE_LOGO|sine)\b", code)))
linear = re.findall(r"Easing\.linear|\(x\)\s*=>\s*x\b", code)
report("4. More than one easing profile, no linear", len(beziers) > 1 and not linear,
       f"profiles defined: {', '.join(sorted(beziers))}; used in src/ops: {', '.join(used)}",
       f"linear easings found: {len(linear)}")

# ---- 5. colours, fonts, logo ----
rgb = decode(args.video, 240, 135, "rgb24", 3).astype(np.float32) / 255
mx, mn = rgb.max(-1), rgb.min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
d = np.maximum(mx - mn, 1e-6)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) * 60
c9 = chs[-1]
logo_in = c9["start"] + c9["sentences"][3]["a"] + 0.3      # final(): S(3) - 0.3, logo 0.6 s later
logo_frames = np.arange(len(rgb)) >= int(logo_in * FPS)
colourful = (sat > 0.35) & (mx > 0.2)
colourful[logo_frames, 30:60, 100:140] = False             # the official logo keeps its artwork colours
off_hue = (colourful & ~((hue > 135) & (hue < 190))).sum(axis=(1, 2)).max()
hexes = set()
for p in sources + [ROOT / "src/brand.ts"]:
    for line in p.read_text().splitlines():
        if "mask" in line.lower():
            continue
        hexes |= {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}\b", line)}
stray = hexes - PALETTE
fams = {f["family"] for f in json.loads((ROOT / "public/fonts/manifest.json").read_text())}
font_uses = set(re.findall(r"fontFamily[=:]\s*\{?FONT\.(\w+)", code))
logo_fill = "EASE_LOGO(clamp((T - logo) / 0.6))" in code and "linear-gradient(45deg" in code
tail_s = TL["total"] - logo_in
report("5. Colours, fonts and logo per Brand Book", not stray and off_hue < 12 and fams == BRAND_FONTS and logo_fill and tail_s >= 1.5,
       f"colours in source: {sorted(hexes)}" + (f" — STRAY {sorted(stray)}" if stray else " (brand colours only)"),
       f"max off-palette-hue pixels in any frame: {off_hue}",
       f"fonts loaded: {sorted(fams)}; used via FONT.{{{', '.join(sorted(font_uses))}}}",
       f"logo: diagonal fill over 0.6 s with EASE_LOGO: {logo_fill}; on screen for the last {tail_s:.1f} s")

# ---- Prohibited: text motionless for more than 2 s (left text card, final card) ----
def decode_crop(path, crop):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-vf", f"scale=960:540,crop={crop}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True, check=True).stdout
    w, h = map(int, crop.split(":")[:2])
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w)


bands = {"left text card (x 40-330)": "290:540:40:0", "final card (centre)": "400:270:280:150"}
lines, ok = [], True
for name, cr in bands.items():
    crop = decode_crop(args.video, cr)
    has_text = (crop < 90).sum(axis=(1, 2)) > 200
    if name.startswith("final"):
        has_text &= np.arange(len(crop)) >= int((logo_in + 1) * FPS)
    else:
        has_text &= np.arange(len(crop)) < int(logo_in * FPS)
    step = 2 * FPS
    alive = np.ones(len(crop) - step, bool)
    for i in range(len(crop) - step):
        if has_text[i] and has_text[i + step]:
            alive[i] = (np.abs(crop[i + step].astype(np.int16) - crop[i]) > 20).sum() > 40
    r, at = longest_still(alive)
    ok &= r == 0
    lines.append(f"{name}: windows of 2 s with no change in the text: {(~alive).sum()}" + (f" (first at {at:.2f} s)" if r else ""))
report("Prohibited: text motionless for more than 2 s", ok, *lines)

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
