"""Acceptance checklist from .claude/skills/dockentra-motion/SKILL.md, run
against a rendered MP4 (pixels) and the composition source (easings, colours).

    python3 scripts/checklist.py out/<video>.mp4 [--seed N]

Exit code 0 only if every item passes.
"""
import argparse
import colorsys
import random
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--seed", type=int, default=None)
args = ap.parse_args()

FF = imageio_ffmpeg.get_ffmpeg_exe()


def decode(w, h, fmt, ch):
    raw = subprocess.run([FF, "-v", "error", "-i", args.video, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, ch) if ch > 1 else np.frombuffer(raw, np.uint8).reshape(-1, h, w)


gray = decode(270, 480, "gray", 1).astype(np.int16)
rgb = decode(135, 240, "rgb24", 3).astype(np.float32) / 255
n = len(gray)
SY = 480 / 1920  # scale factor for y bands

# Foreground = text/icons/subtitles: bright on the ink scenes, dark on the Bay Grey card.
light = gray.mean(axis=(1, 2)) > 180
fg = gray > 90
fg[light] = gray[light] < 170
diff = np.abs(np.diff(gray, axis=0)) > 12
moving = (diff & (fg[1:] | fg[:-1])).sum(axis=(1, 2))           # per transition
MOVE_PX = 25                                                     # of 129,600 px


def longest_static(mask_moving, lo=0, hi=None):
    hi = len(mask_moving) if hi is None else hi
    best, run, start, best_at = 0, 0, lo, lo
    for i in range(lo, hi):
        if not mask_moving[i]:
            if run == 0:
                start = i
            run += 1
            if run > best:
                best, best_at = run, start
        else:
            run = 0
    return best, best_at


results = []


def report(name, ok, detail):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}\n       {detail}")


is_moving = moving >= MOVE_PX

# ---- Hard rule: nothing visually unchanged for more than 1 s ----
run, at = longest_static(is_moving)
report("Hard rule: no frame unchanged > 1 s",
       run < FPS, f"longest foreground-static stretch: {run} frames = {run / FPS:.2f} s at {(at + 1) / FPS:.2f} s")

# ---- 1. 0.25x review: motion in every segment ----
SEGMENTS = [("hook", 0, 4), ("polybag", 4, 12), ("mailer", 12, 20), ("box", 20, 27), ("recap", 27, 33), ("question+logo", 33, 36)]
rows, ok1 = [], True
for name, a, b in SEGMENTS:
    lo, hi = a * FPS, min(b * FPS, n - 1)
    r, _ = longest_static(is_moving, lo, hi)
    share = is_moving[lo:hi].mean()
    ok1 &= r < FPS and share > 0.5
    rows.append(f"{name:14s} motion in {share:5.0%} of frames, longest still {r / FPS:.2f} s")
report("1. Motion visible in every segment (0.25x review)", ok1, "\n       ".join(rows))

# ---- 2. Pause at 5 random timecodes: >= 4 show an element mid-animation ----
seed = args.seed if args.seed is not None else random.SystemRandom().randrange(1 << 30)
rng = random.Random(seed)
picks = sorted(rng.sample(range(n - 1), 5))
hits = [bool(is_moving[p]) for p in picks]
report("2. Paused at 5 random timecodes: >= 4/5 mid-animation",
       sum(hits) >= 4,
       f"seed {seed}: " + ", ".join(f"{p / FPS:.2f}s {'moving' if h else 'still'}" for p, h in zip(picks, hits))
       + f"  |  over all frames: {is_moving.mean():.0%} mid-animation")

# ---- 3. Pattern interrupt: at least one hard cut / impact ----
full = np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2))
local = np.array([np.median(full[max(0, i - 15):i + 15]) for i in range(len(full))])
spike = full / (local + 0.5)
cuts = []
for i in np.argsort(-spike):
    if spike[i] <= 6 or len(cuts) == 4:
        break
    if all(abs(i - c) > FPS for c in cuts):
        cuts.append(int(i))
report("3. At least one pattern interrupt", len(cuts) > 0,
       "hard cuts / impacts: " + ", ".join(f"{(c + 1) / FPS:.2f} s (x{spike[c]:.0f} vs local)" for c in sorted(cuts)))

# ---- 4. More than one easing profile ----
code = "\n".join(p.read_text() for p in SRC.rglob("*.ts*"))
beziers = set(re.findall(r"Easing\.bezier\(([^)]*)\)", code))
gsap_eases = set(re.findall(r'ease:\s*"([^"]+)"', code))
profiles = {f"bezier({b})" for b in beziers} | {f"gsap {e}" for e in gsap_eases}
report("4. More than one easing profile", len(profiles) > 1, f"{len(profiles)} profiles: " + ", ".join(sorted(profiles)))

# ---- 5. Palette + logo per Brand Book ----
PALETTE = {"#0B0D10", "#4FDCA9", "#0F5F4A", "#F5F7F8", "#FFFFFF"}
hexes = set()
for line in code.splitlines():
    for h in re.findall(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b", line):
        if "mask" in line.lower() or "linear-gradient(45deg, #000" in line:
            continue  # mask alpha, never painted
        hexes.add(h.upper())
stray = hexes - PALETTE
# Pixel check: saturated pixels must sit in the mint / green hue family.
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
mx, mn = rgb.max(-1), rgb.min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
d = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) * 60
colourful = (sat > 0.35) & (mx > 0.2)
logo_frames = np.arange(n) >= int(34.5 * FPS)
ybox, xbox = slice(int(560 / 8), int(980 / 8)), slice(int(340 / 8), int(740 / 8))
colourful[logo_frames, ybox, xbox] = False  # the official logo keeps its own artwork colours
off_hue = colourful & ~((hue > 135) & (hue < 190))
worst = off_hue.sum(axis=(1, 2)).max()
logo_src = (SRC / "scenes" / "Scenes.tsx").read_text() + (SRC / "brand.ts").read_text()
logo_ok = "LOGO_IN = 34.5" in logo_src and "(t - LOGO_IN) / 0.6" in logo_src and "Easing.bezier(0.22, 1, 0.36, 1)" in logo_src
logo_visible = (gray[int(35.2 * FPS):, int(600 * SY):int(900 * SY), int(360 / 4):int(720 / 4)] < 120).mean(axis=(1, 2)).min() > 0.02
report("5. Palette and logo match the Brand Book",
       not stray and worst < 12 and logo_ok and logo_visible,
       f"source colours: {sorted(hexes)}{' — STRAY ' + str(sorted(stray)) if stray else ''}; "
       f"max off-palette-hue pixels in any frame: {worst}; logo fill 600 ms @ 34.5 s with (.22,1,.36,1): {logo_ok}; "
       f"logo on screen for the last 1.5 s: {logo_visible}")

# ---- Prohibited: text standing still for more than 2 s ----
bands = {"title/text band (y 150–720)": (150, 720), "subtitle band (y 1440–1600)": (1440, 1600)}
rows, ok_t = [], True
for name, (y0, y1) in bands.items():
    ys = slice(int(y0 * SY), int(y1 * SY))
    band_fg = fg[:, ys].sum(axis=(1, 2)) > 40
    band_move = (diff[:, ys] & (fg[1:, ys] | fg[:-1, ys])).sum(axis=(1, 2)) >= 10
    band_move |= ~band_fg[1:]  # empty band is not "text standing still"
    r, a = longest_static(band_move)
    ok_t &= r < 2 * FPS
    rows.append(f"{name}: longest still {r / FPS:.2f} s at {(a + 1) / FPS:.2f} s")
report("Prohibited: text motionless > 2 s", ok_t, "\n       ".join(rows))

# ---- Subtitles: never mint, bottom edge >= 240 px ----
sub_src = (SRC / "components" / "Subtitles.tsx").read_text()
bottom = int(re.search(r"SUB_BOTTOM = (\d+)", sub_src).group(1))
ys = slice(int(1440 / 8), int(1600 / 8))
mint_px = ((hue[:, ys] > 145) & (hue[:, ys] < 175) & (sat[:, ys] > 0.4) & (mx[:, ys] > 0.6)).sum(axis=(1, 2)).max()
report("Subtitles: not mint, >= 240 px above the bottom edge", bottom >= 240 and mint_px == 0,
       f"bottom offset {bottom} px; max mint pixels in subtitle band: {mint_px}")

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
