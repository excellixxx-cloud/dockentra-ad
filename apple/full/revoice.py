"""Re-voice the full film with another narration recorded in one take (13 lines in order, pauses between).

    python3 apple/full/revoice.py TAKE.wav
Splits the take at its pauses into the 13 lines, puts each line where the current line starts (scene times
stay as they are), re-cuts the subtitles at the new pauses, and rebuilds narration + music + mix.
Lines that would run into the next one are sped up slightly (at most 8 %)."""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "youtube/tts")); sys.path.insert(0, str(ROOT / "apple/full"))
from loud import loudnorm, measure
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 24000

def load(path):
    raw = subprocess.run([FF, "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def split(x, n):
    hop = int(.01 * SR); env = np.array([np.sqrt((x[i:i + hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)])
    th = max(env.max() * 0.02, np.percentile(env, 20) * 3)
    voiced = env > th; segs = []; st = None; quiet = 0
    for i, v in enumerate(voiced):
        if v:
            if st is None: st = i
            quiet = 0
        elif st is not None:
            quiet += 1
            if quiet >= 60:                                  # 600 ms of silence ends a line
                segs.append([st, i - quiet + 1]); st = None; quiet = 0
    if st is not None: segs.append([st, len(voiced)])
    segs = [s for s in segs if s[1] - s[0] > 40]
    while len(segs) > n:                                     # merge the closest pair until we have n lines
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        k = int(np.argmin(gaps)); segs[k] = [segs[k][0], segs[k + 1][1]]; del segs[k + 1]
    if len(segs) != n: sys.exit(f"found {len(segs)} lines in the take, expected {n}")
    return [x[max(0, a * hop - int(.04 * SR)): b * hop + int(.08 * SR)] for a, b in segs]

def tempo(x, f):
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / "a.wav", Path(d) / "b.wav"
        with wave.open(str(a), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
        subprocess.run([FF, "-v", "error", "-y", "-i", str(a), "-af", f"atempo={f:.4f}", str(b)], check=True)
        return load(b)

tl_path = ROOT / "remotion/src/apple/full.json"
tl = json.loads(tl_path.read_text())
slots = [l for sc in tl["scenes"] for l in sc["lines"]] + [tl["endLine"]]
lines = split(load(sys.argv[1]), len(slots))
out = ROOT / "apple/full/voice_motion"; out.mkdir(exist_ok=True)
from build import cues                                       # same subtitle cutting as the original build
subs = []
starts = [l["a"] for l in slots] + [tl["total"] - 0.4]
for i, (slot, x) in enumerate(zip(slots, lines)):
    room = starts[i + 1] - slot["a"] - 0.35
    if len(x) / SR > room:
        f = min(1.08, len(x) / SR / room); x = tempo(x, f); print(f"line {i + 1}: sped up x{f:.3f}")
    x = x / np.abs(x).max() * 0.89
    name = f"m{i:02d}.wav"
    with wave.open(str(out / name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    slot["b"] = round(slot["a"] + len(x) / SR, 3); slot["file"] = "../voice_motion/" + name
    if slot is not tl["endLine"]: subs += cues(slot["text"], x, slot["a"])
    print(f"{i + 1:2d} {slot['a']:6.2f}-{slot['b']:6.2f} ({len(x) / SR:4.2f}s, room {room:4.2f}s)  {slot['text']}")
tl["subs"] = [[round(a, 3), round(b, 3), c] for a, b, c in subs]
tl_path.write_text(json.dumps(tl, indent=1))
print("timeline updated; now run:  python3 apple/full/build.py --mix-only")
