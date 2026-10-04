"""Voice for "Two boxes": George (Kokoro v0.19, offline), one wav per line, placed on the film clock.

    python3 twoboxes/tts.py        -> twoboxes/voice/lines.json + line*.wav (24 kHz), narration.wav (48 kHz 16-bit, -16 LUFS, <= -2 dBTP)
Each line starts at a fixed time in its scene; the subtitle cues come from the real lengths."""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from synth import make_tts
from loud import loudnorm

SPEED = 0.84            # ~145 wpm
DUR = 32.0
# (start s, written line, what the voice reads, subtitled?) — lines that repeat the headline are not subtitled
LINES = [
    (0.6, "Same product, same weight, two boxes.", None, False),
    (5.4, "Your courier bills whichever is bigger: the actual weight, or the volumetric one.", None, True),
    (11.25, "Length times width times height, divided by five thousand.", None, True),
    (15.85, "In the mailer that's zero point three six kilos.", None, True),
    (20.95, "In the box, two point two five.", None, True),
    (23.65, "Same product, billed as six times heavier, on every single order.", "Same product. Billed as six times heavier, on every single order.", False),   # the comma read "billed as" as "builders"
    (29.2, "Measure yours.", None, False),
]

def main(swap=None):
    tts, sid = make_tts("george")
    out = ROOT / "twoboxes/voice"; out.mkdir(exist_ok=True)
    sr = 24000; track = np.zeros(int(DUR * sr) + sr, np.float32); meta = []
    for i, (at, text, say, sub) in enumerate(LINES):
        spoken = say or text
        if swap: spoken = spoken.replace(*swap)
        a = tts.generate(spoken, sid=sid, speed=SPEED)
        x = np.asarray(a.samples, np.float32)
        nz = np.where(np.abs(x) > 0.01)[0]; x = x[max(0, nz[0] - int(.03 * sr)): nz[-1] + int(.06 * sr)]
        with wave.open(str(out / f"line{i}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x / np.abs(x).max() * 0.89 * 32767).astype("<i2").tobytes())
        s = int(at * sr); track[s:s + len(x)] += x / np.abs(x).max() * 0.89
        meta.append({"a": at, "b": round(at + len(x) / sr, 3), "text": text, "spoken": spoken, "sub": sub})
        print(f"{at:5.2f}-{at + len(x) / sr:5.2f}  {text}")
    for m, n in zip(meta, meta[1:]):
        if m["b"] > n["a"] - 0.15: print("OVERLAP:", m["text"], "->", n["text"])
    (out / "lines.json").write_text(json.dumps(meta, indent=1))
    (ROOT / "remotion/src/twoboxes/lines.json").write_text(json.dumps(meta, indent=1))   # the film reads its subtitle cues from here
    tmp = out / "_narr24k.wav"
    track = track[: int(DUR * sr)]
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(track, -1, 1) * 32767).astype("<i2").tobytes())
    loudnorm(tmp, out / "narration.wav", I=-16, TP=-2.0, channels=1); tmp.unlink()

if __name__ == "__main__":
    main(tuple(sys.argv[1:3]) if len(sys.argv) > 2 else None)
