"""Lay the WMS video's sentences on the film clock and write what depends on it:
  remotion/src/wms/timeline.json   scenes and sentence times the animation keys off
  wms/out/narration.wav            the voice alone, 48 kHz 16-bit, -16 LUFS, <= -2 dBTP
  wms/out/subtitles.srt            burned-in cues (lines that repeat an on-screen card are left out)
    python3 wms/build.py"""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm

LEAD = {"hook": 1.8, "problem": 0.9, "portal": 1.0, "stores": 1.0, "floor": 0.9, "handover": 0.9, "trust": 1.2, "ask": 1.0}
TAIL = {"hook": 1.4, "problem": 0.8, "portal": 0.8, "stores": 0.9, "floor": 0.8, "handover": 0.8, "trust": 0.9, "ask": 0.8}
GAP = 0.45
END_CARD = 5.6                    # logo fill 0.6 s + hold, tagline and contacts after the last line
NO_SUB = {"s61"}                  # repeats the trust cards on screen

sents = json.loads((ROOT / "wms/voice/sentences.json").read_text())
scenes, t = [], 0.0
for name in LEAD:
    ss = [s for s in sents if s["scene"] == name]
    start = t; t += LEAD[name]; lines = []
    for k, s in enumerate(ss):
        lines.append({"a": round(t, 3), "b": round(t + s["dur"], 3), "text": s["text"], "file": s["file"], "sub": s["file"][:-4] not in NO_SUB})
        t += s["dur"] + (GAP if k < len(ss) - 1 else 0)
    t += TAIL[name]
    scenes.append({"name": name, "start": round(start, 3), "end": round(t, 3), "lines": lines})
end_card = {"start": round(t, 3), "end": round(t + END_CARD, 3)}
total = round(t + END_CARD, 3)
(ROOT / "remotion/src/wms").mkdir(exist_ok=True, parents=True)
(ROOT / "remotion/src/wms/timeline.json").write_text(json.dumps({"total": total, "scenes": scenes, "endCard": end_card}, indent=1))

sr = 24000; y = np.zeros(int(round(total * sr)), np.float32)
for sc in scenes:
    for l in sc["lines"]:
        w = wave.open(str(ROOT / "wms/voice" / l["file"])); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        i = int(l["a"] * sr); y[i:i + len(x)] += x
out = ROOT / "wms/out"; out.mkdir(exist_ok=True)
tmp = out / "_narr24k.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
loudnorm(tmp, out / "narration.wav", I=-16, TP=-2.0, channels=1); tmp.unlink()

def ts(s):
    ms = int(round(s * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
cues = [(l["a"], l["b"], l["text"]) for sc in scenes for l in sc["lines"] if l["sub"]]
(out / "subtitles.srt").write_text("".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{txt}\n\n" for i, (a, b, txt) in enumerate(cues)))
for sc in scenes: print(f"{sc['name']:9s} {sc['start']:6.1f}-{sc['end']:6.1f}")
print("total", total, "s")
