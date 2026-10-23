"""Voice for "One fold" (15 s): George (Kokoro v0.19, offline), one wav per line, read back by two ASR models.

    python3 onefold/tts.py   ->  onefold/voice/l*.wav + onefold/voice/lines.json
The brand goes through kokoro_direct (DOCK-en-tra). Each line is placed in its scene; speeds keep the read near 145 wpm."""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts")); sys.path.insert(0, str(ROOT / "wms"))
from synth import make_tts
from tts import say, voiced, trim

# the script, cut so every line lands in its own scene: (text, start s, Kokoro speed, spoken form)
LINES = [
    ("Selling on TikTok Shop in Ireland?", 0.55, 1.12, None),
    ("We're Dockentra.", 3.00, 0.95, None),
    ("Every delivery photographed on arrival.", 4.15, 1.15, None),
    ("Three questions. Price by email.", 6.72, 1.05, "Three questions. Price, by email."),
    ("You sell. We ship.", 10.60, 1.05, None),
    ("dockentra.ie", 12.95, 0.90, "Dockentra, dot I E."),
]

def main():
    import kokoro_direct as kd
    tts, sid = make_tts("george")
    out = ROOT / "onefold/voice"; meta = []
    for i, (s, at, SPEED, spoken) in enumerate(LINES):
        sp = say(spoken or s)
        a = np.asarray(tts.generate(sp, sid=sid, speed=SPEED).samples, np.float32)
        if "dockentra" in sp.lower():
            y0, _, _ = kd.generate(sp, sid=sid, speed=SPEED)
            a, _, _ = kd.generate(sp, sid=sid, speed=SPEED * voiced(y0) / voiced(a))
        a = trim(a); a = a / np.abs(a).max() * 0.89
        with wave.open(str(out / f"l{i}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a * 32767).astype("<i2").tobytes())
        d = round(len(a) / 24000, 3)
        meta.append({"i": i, "text": s, "spoken": sp, "file": f"l{i}.wav", "a": at, "b": round(at + d, 3), "dur": d})
        print(f"{at:5.2f}-{at + d:5.2f}  {s}")
    tot = sum(m["dur"] for m in meta); nw = sum(len(m["text"].split()) for m in meta)
    print(f"speech {tot:.2f}s, {nw} words, {nw / tot * 60:.0f} wpm of speech")
    (out / "lines.json").write_text(json.dumps(meta, indent=1))

if __name__ == "__main__":
    main()
