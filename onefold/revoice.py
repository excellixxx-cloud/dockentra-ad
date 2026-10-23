"""Swap the One fold narration for a one-take read (6 lines in order, pauses between).

    python3 onefold/revoice.py TAKE.(mp4|wav)  ->  onefold/voice_motion/l*.wav + lines.json, then:  python3 onefold/audio.py onefold/voice_motion
Each line starts where the current line starts (or just after the previous one ends) and must finish before its
scene changes; if it would not, it is sped up slightly (at most 10 %)."""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apple/full"))
from revoice import load, split, tempo, SR                    # same splitter as the full WMS film

ENDS = [2.95, 4.10, 6.48, 10.40, 12.40, 14.90]               # each line must end before its scene changes
cur = json.loads((ROOT / "onefold/voice/lines.json").read_text())
lines = split(load(sys.argv[1]), len(cur))
out = ROOT / "onefold/voice_motion"; out.mkdir(exist_ok=True)
prev_b, meta = 0.0, []
for i, (m, x) in enumerate(zip(cur, lines)):
    a = max(m["a"], prev_b + 0.12)
    room = ENDS[i] - a
    if len(x) / SR > room:
        a = max(m["a"] - 0.25, prev_b + 0.08); room = ENDS[i] - a
    if len(x) / SR > room:
        f = min(1.10, len(x) / SR / room); x = tempo(x, f); print(f"line {i + 1}: sped up x{f:.3f}")
    x = x / np.abs(x).max() * 0.89
    with wave.open(str(out / m["file"]), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    d = round(len(x) / SR, 3); prev_b = a + d
    meta.append({**m, "a": round(a, 3), "b": round(a + d, 3), "dur": d})
    print(f"{i + 1} {a:6.2f}-{a + d:6.2f} (ends by {ENDS[i]:5.2f})  {m['text']}")
(out / "lines.json").write_text(json.dumps(meta, indent=1))
