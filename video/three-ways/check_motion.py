"""Motion audit: longest stretch in which the FOREGROUND (text, icons,
subtitles — pixels brighter than the dotted background) does not move.

    python3 check_motion.py out/<video>.mp4
"""
import subprocess, sys
import numpy as np
import imageio_ffmpeg

W, H, FPS = 270, 480, 30
raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", sys.argv[1],
                      "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                     capture_output=True, check=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
fg = f > 90                                  # foreground on the dark scenes
light = f.mean(axis=(1, 2)) > 180            # Bay Grey end card: foreground = dark pixels
fg[light] = f[light] < 170
changed = ((np.abs(np.diff(f, axis=0)) > 12) & (fg[1:] | fg[:-1])).sum(axis=(1, 2))
full = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))

still = changed < 25                         # < 25 px of 130k: nothing visibly moving
runs, start = [], None
for i, s in enumerate(list(still) + [False]):
    if s and start is None: start = i
    if not s and start is not None:
        runs.append((i - start, (start + 1) / FPS, (i + 1) / FPS)); start = None
runs.sort(reverse=True)
print(f"frames: {len(f)}  |  frames with foreground motion: {(~still).sum()}/{len(still)}")
print("longest foreground-static stretches (frames, from s, to s):")
for n, a, b in runs[:6]:
    print(f"  {n:3d} frames = {n / FPS:.2f} s   {a:6.2f} -> {b:6.2f}")
print("any full-frame-identical stretch > 1 s:", any((full[i:i + FPS] == 0).all() for i in range(len(full) - FPS)))
