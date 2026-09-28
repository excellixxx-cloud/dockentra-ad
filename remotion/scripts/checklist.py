"""Acceptance checklist from .claude/skills/dockentra-motion/SKILL.md, run
against a rendered MP4 (pixels) and the composition source (easings, colours,
fonts, logo timing). Each composition has a spec in scripts/specs/.

    python3 scripts/checklist.py scripts/specs/creator-samples.json out/<video>.mp4 \
        [--frozen out/<camera-frozen render>.mp4] [--seed N]

--frozen: the same composition rendered with the camera locked. Motion
items are then also checked on it, so a camera drift alone cannot pass them.
Exit code 0 only if every item passes.
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
MOVE_PX = 25          # changed foreground pixels (of 129,600) that count as "moving"

ap = argparse.ArgumentParser()
ap.add_argument("spec")
ap.add_argument("video")
ap.add_argument("--frozen")
ap.add_argument("--seed", type=int)
args = ap.parse_args()
spec = json.loads(Path(args.spec).read_text())


def decode(path, w, h, fmt, ch):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                         capture_output=True, check=True).stdout
    shape = (-1, h, w, ch) if ch > 1 else (-1, h, w)
    return np.frombuffer(raw, np.uint8).reshape(shape)


def motion(path):
    """Per-transition count of changed foreground pixels (270x480 grey)."""
    g = decode(path, 270, 480, "gray", 1).astype(np.int16)
    light = g.mean(axis=(1, 2)) > 180
    fg = g > 90
    fg[light] = g[light] < 170          # on Bay Grey, foreground is the dark ink / green
    diff = np.abs(np.diff(g, axis=0)) > 12
    moving = (diff & (fg[1:] | fg[:-1])).sum(axis=(1, 2))
    return g, fg, diff, moving >= MOVE_PX


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


gray, fg, diff, moving = motion(args.video)
frozen = motion(args.frozen)[3] if args.frozen else None
n = len(gray)
SY = 480 / 1920
sources = [p for d in spec["sources"] for p in ([ROOT / d] if (ROOT / d).is_file() else (ROOT / d).rglob("*.ts*"))]
code = "\n".join(p.read_text() for p in sources)

# ---- Hard rule ----
lines, ok = [], True
for label, mv in (("final", moving), ("camera frozen", frozen)):
    if mv is None:
        continue
    r, at = longest_still(mv)
    ok &= r < FPS
    lines.append(f"{label}: longest still {r / FPS:.2f} s at {at:.2f} s")
report("Hard rule: no frame unchanged for more than 1 s", ok, *lines)

# ---- 1. 0.25x: motion in every segment ----
lines, ok = [], True
for name, a, b in spec["segments"]:
    lo, hi = int(a * FPS), min(int(b * FPS), n - 1)
    row = f"{name:12s}"
    for label, mv in (("final", moving), ("frozen", frozen)):
        if mv is None:
            continue
        r, _ = longest_still(mv, lo, hi)
        share = mv[lo:hi].mean()
        ok &= r < FPS and share > 0.5
        row += f"  {label}: {share:4.0%} moving, longest still {r / FPS:.2f} s"
    lines.append(row)
report("1. 0.25x review — motion in every segment", ok, *lines)

# ---- 2. Five random pauses ----
seed = args.seed if args.seed is not None else random.SystemRandom().randrange(1 << 30)
picks = sorted(random.Random(seed).sample(range(n - 1), 5))
ref = frozen if frozen is not None else moving
hits = [bool(ref[p]) for p in picks]
report("2. Pause at 5 random timecodes — >= 4/5 mid-animation", sum(hits) >= 4,
       f"seed {seed}{' (camera-frozen render)' if frozen is not None else ''}: " + ", ".join(f"{p / FPS:.2f}s {'moving' if h else 'STILL'}" for p, h in zip(picks, hits)),
       f"share of all frames mid-animation: final {moving.mean():.0%}" + (f", camera frozen {frozen.mean():.0%}" if frozen is not None else ""))

# ---- 3. Pattern interrupt (and no hard cuts elsewhere if the spec says so) ----
full = np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2))
local = np.array([np.median(full[max(0, i - 15):i + 15]) for i in range(len(full))])
spike = full / (local + 0.5)
prev = np.r_[0, full[:-1]]
ahead = np.array([full[i:i + 10].max() for i in range(len(full))])
# A hard cut changes the most on its very first frame (sharp onset, then decay);
# a wipe or morph ramps up and peaks later, so its onset frame is not its peak.
single = (full > 2.5 * prev) & (full >= 0.8 * ahead)
cuts = []
for i in np.argsort(-spike):
    if spike[i] <= 6 or len(cuts) == 6:
        break
    if not single[i]:
        continue
    if all(abs(i - c) > FPS // 2 for c in cuts):
        cuts.append(int(i))
cuts.sort()
wa, wb = spec["interrupt_window"]
inside = [c for c in cuts if wa <= (c + 1) / FPS <= wb]
outside = [c for c in cuts if not wa <= (c + 1) / FPS <= wb]
ok = bool(inside) and (not spec.get("no_cuts_outside_interrupt") or not outside)
report("3. Pattern interrupt present" + (" — and the only hard cut" if spec.get("no_cuts_outside_interrupt") else ""), ok,
       "hard cuts (sharp onset): " + (", ".join(f"{(c + 1) / FPS:.2f} s (x{spike[c]:.0f} vs local)" for c in cuts) or "none"),
       f"expected inside {wa}–{wb} s: {'yes' if inside else 'NO'}" + (f"; outside it: {'none' if not outside else 'FOUND'}" if spec.get("no_cuts_outside_interrupt") else ""))

# ---- 4. Easing profiles (and no linear) ----
beziers = {f"bezier({b})" for b in re.findall(r"Easing\.bezier\(([^)]*)\)", code + (ROOT / "src/brand.ts").read_text())}
gsap_eases = {f"gsap {e}" for e in re.findall(r'ease:\s*"([^"]+)"', code)}
springs = {"remotion spring"} if re.search(r"\bspring\(", code) else set()
linear = re.findall(r'Easing\.linear|ease:\s*"(?:none|linear)"', code)
profiles = sorted(beziers | gsap_eases | springs)
report("4. More than one easing profile, no linear", len(profiles) > 1 and not linear,
       f"{len(profiles)} profiles: " + ", ".join(profiles), f"linear easings found: {len(linear)}")

# ---- 5. Palette, fonts, logo ----
rgb = decode(args.video, 135, 240, "rgb24", 3).astype(np.float32) / 255
mx, mn = rgb.max(-1), rgb.min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
d = np.maximum(mx - mn, 1e-6)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) * 60
logo = spec["logo"]
logo_frames = np.arange(n) >= int(logo["in"] * FPS)
x0, y0, x1, y1 = [v // 8 for v in logo["box"]]
colourful = (sat > 0.35) & (mx > 0.2)
colourful[logo_frames, y0:y1, x0:x1] = False            # the official logo keeps its artwork colours
off_hue = (colourful & ~((hue > 135) & (hue < 190))).sum(axis=(1, 2)).max()
hexes = set()
for p in sources + [ROOT / "src/components/Subtitles.tsx", ROOT / "src/components/Kinetic.tsx", ROOT / "src/brand.ts"]:
    for line in p.read_text().splitlines():
        if "mask" in line.lower():
            continue                                    # mask alpha stops, never painted
        hexes |= {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}\b", line)}
stray = hexes - PALETTE
fams = {f["family"] for f in json.loads((ROOT / "public/fonts/manifest.json").read_text())}
font_uses = set(re.findall(r"fontFamily[=:]\s*\{?FONT\.(\w+)", code))
logo_timing = all(m in (ROOT / f).read_text() for f, ms in logo["must"].items() for m in ms) \
    and "Easing.bezier(0.22, 1, 0.36, 1)" in (ROOT / "src/brand.ts").read_text()
tail = gray[int((logo["in"] + 0.6) * FPS):, y0 * 2:y1 * 2, x0 * 2:x1 * 2]
logo_shown = (tail < 120).mean(axis=(1, 2)).min() > 0.02 and (spec["duration"] - logo["in"]) >= 1.5
mint_line = ""
ok_mint = True
if "mint_only_in_y" in spec:
    my = spec["mint_only_in_y"][1] // 8
    is_mint = (hue > 145) & (hue < 172) & (sat > 0.4) & (mx > 0.6)
    stray_mint = is_mint[~logo_frames, my:, :].sum(axis=(1, 2)).max()
    ok_mint = stray_mint <= 3
    mint_line = f"mint pixels outside the desk's top edge (before the logo): max {stray_mint} per frame"
if "no_mint_bands" in spec:
    is_mint = (hue > 145) & (hue < 172) & (sat > 0.4) & (mx > 0.6)
    worst_band = 0
    for ya, yb in spec["no_mint_bands"]:
        worst_band = max(worst_band, is_mint[~logo_frames, ya // 8:yb // 8, :].sum(axis=(1, 2)).max())
    ok_mint &= worst_band <= 3
    mint_line = f"mint pixels inside text bands {spec['no_mint_bands']}: max {worst_band} per frame (mint stays out of the text)"
report("5. Colours, fonts and logo per Brand Book",
       not stray and off_hue < 12 and fams == BRAND_FONTS and logo_timing and logo_shown and ok_mint,
       f"colours in source: {sorted(hexes)}" + (f" — STRAY {sorted(stray)}" if stray else " (all five brand colours only)"),
       f"max off-palette-hue pixels in any frame: {off_hue}",
       f"fonts loaded: {sorted(fams)}; used via FONT.{{{', '.join(sorted(font_uses))}}}",
       f"logo: diagonal fill 600 ms (.22,1,.36,1) at {logo['in']} s: {logo_timing}; on screen for the last {spec['duration'] - logo['in']:.1f} s: {logo_shown}",
       *( [mint_line] if mint_line else []))

# ---- Prohibited: text motionless > 2 s ----
lines, ok = [], True
for name, (ya, yb) in spec["text_bands"].items():
    ys = slice(int(ya * SY), int(yb * SY))
    band_fg = fg[:, ys].sum(axis=(1, 2)) > 40
    band_move = (diff[:, ys] & (fg[1:, ys] | fg[:-1, ys])).sum(axis=(1, 2)) >= 10
    band_move |= ~band_fg[1:]
    r, at = longest_still(band_move)
    ok &= r < 2 * FPS
    lines.append(f"{name}: longest still {r / FPS:.2f} s at {at:.2f} s")
report("Prohibited: text motionless for more than 2 s", ok, *lines)

# ---- Subtitles ----
sub_src = (ROOT / spec.get("subtitle_src", "src/components/Subtitles.tsx")).read_text()
bottom = int(re.search(r"SUB_BOTTOM = (\d+)", sub_src).group(1))
ys = slice(1440 // 8, 1600 // 8)
sub_mint = ((hue[:, ys] > 145) & (hue[:, ys] < 172) & (sat[:, ys] > 0.4) & (mx[:, ys] > 0.6)).sum(axis=(1, 2)).max()
report("Subtitles: not mint, bottom edge >= 240 px above the frame edge", bottom >= 240 and sub_mint == 0,
       f"bottom offset {bottom} px; mint pixels in the subtitle band: {sub_mint}")

# ---- Parallax (Step 1 rule) ----
if "parallax" in spec:
    pf = spec["parallax"]
    src = (ROOT / pf["src"]).read_text()
    bg = float(re.search(r"BG_FACTOR = ([\d.]+)", src).group(1))
    ty = float(re.search(r"TYPE_FACTOR = ([\d.]+)", src).group(1))
    report("Parallax: background and foreground move at different speeds (>= 5 %)", abs(1 - bg) >= 0.05 and abs(ty - 1) >= 0.05,
           f"desk {bg:.0%} of object speed, type layer {ty:.0%}; applied to the camera in every scene")

# ---- 6. Frames for the silent-viewer review (judged by a person, not by this script) ----
if "review_frames" in spec:
    out_paths = []
    for ts in spec["review_frames"]:
        dst = Path(args.video).with_name(f"review-{int(ts):02d}s.png")
        subprocess.run([FF, "-v", "error", "-y", "-ss", str(ts), "-i", args.video, "-frames:v", "1", str(dst)], check=True)
        out_paths.append(str(dst.relative_to(ROOT)) if dst.is_relative_to(ROOT) else str(dst))
    print("[ -- ] 6. Silent-viewer review — frames extracted for a human verdict:")
    for pth in out_paths:
        print(f"       {pth}")

# ---- 7. On-screen text: word limit, reading time, no headline/subtitle duplicates ----
if "script" in spec:
    sc = json.loads((ROOT / spec["script"]).read_text())
    STAGGER, RISE, EXIT = 0.075, 0.5, 0.45
    words = lambda txt: re.findall(r"[A-Za-z0-9']+", txt.lower())
    need = lambda n: 0.8 + 0.3 * n
    lines, ok = [], True
    spans = []
    for h in sc["headlines"]:
        txt = " ".join(h["lines"])
        n = len(txt.split())            # a word is what the viewer reads as one: "€2.60", "dockentra.ie"
        end = h["exit"] if h["exit"] is not None else spec["duration"]
        readable = end - (h["start"] + (n - 1) * h.get("stagger", STAGGER) + h.get("rise", RISE))
        want = max(need(n), spec.get("min_headline_s", 0))
        good = readable >= want and n <= spec.get("max_headline_words", 99)
        ok &= good
        spans.append((h["start"], end + (n - 1) * 0.03 + h.get("out", 0.35), n, txt))
        lines.append(f"{'ok ' if good else 'BAD'} headline {h['id']:6s} {n} words, fully readable {readable:4.1f} s (needs {want:.1f})")
    for a_, b_, txt in sc["subtitles"]:
        n = len(txt.split())
        readable = b_ - (a_ + 0.36)
        good = readable >= need(n)
        ok &= good
        lines.append(f"{'ok ' if good else 'BAD'} subtitle {n} words, readable {readable:4.1f} s (needs {need(n):.1f})")
    # the largest number of big-type words on screen at any moment
    peak, peak_at = 0, 0.0
    for tt in np.arange(0, spec["duration"], 1 / FPS):
        on = sum(nw for a_, b_, nw, _ in spans if a_ <= tt < b_)
        if on > peak:
            peak, peak_at = on, tt
    limit = spec.get("max_big_words", 7)
    ok &= peak <= limit
    lines.append(f"{'ok ' if peak <= limit else 'BAD'} max big-type words on screen at once: {peak} (at {peak_at:.2f} s; limit {limit})")
    dup_worst = 0.0
    for a_, b_, txt in sc["subtitles"]:
        sw = set(words(txt))
        for ha, hb, _, htxt in spans:
            if ha < b_ and a_ < hb:
                hw = set(words(htxt))
                dup_worst = max(dup_worst, len(sw & hw) / len(sw | hw))
    ok &= dup_worst < 0.5
    lines.append(f"{'ok ' if dup_worst < 0.5 else 'BAD'} subtitle vs headline on screen at the same time: max word overlap {dup_worst:.0%} (limit 50 %)")
    report(f"7. All on-screen text is readable in the time it stays, no duplicates, <= {spec.get('max_big_words', 7)} big words", ok, *lines)

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
