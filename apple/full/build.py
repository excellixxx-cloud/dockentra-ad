"""Lay the full WMS film's voice on the clock and write what depends on it:
  remotion/src/apple/full.json   scene times, VO lines and subtitle cues the animation keys off
  apple/full/out/narration.wav   voice, 48 kHz, -16 LUFS
  apple/full/out/mix-master.wav  voice + calm music bed, -14 LUFS, <= -1 dBTP
    python3 apple/full/build.py"""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "youtube/tts")); sys.path.insert(0, str(ROOT / "remotion/scripts"))
from loud import loudnorm, measure
import gen_music as gm
from gen_music import SR, Track
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

OPEN = 5.0                       # cold open, music only
LEAD, GAP, TAIL, MIN = 0.9, 0.45, 1.2, 8.0
LOGO = 4.0                       # D alone 1.6, axis 0.6, hold 1.8
END = 6.0
ORDER = ["portal", "shops", "order", "pick", "pack", "label", "handover", "track", "billing", "trust"]
sents = json.loads((ROOT / "apple/full/voice/sentences.json").read_text())

def wav(name):
    w = wave.open(str(ROOT / "apple/full/voice" / name))
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

def cues(text, x, a, sr=24000, maxlen=44):
    """A long sentence becomes two cues, split at the comma nearest its middle and timed at the pause the voice makes there."""
    if len(text) <= maxlen or ", " not in text:
        return [[a, a + len(x) / sr, text]]
    commas = [i for i in range(len(text)) if text.startswith(", ", i)]
    c = min(commas, key=lambda i: abs(i - len(text) / 2))
    first, second = text[:c + 1], text[c + 2:]
    hop = int(.01 * sr); env = np.array([np.abs(x[i:i + hop]).max() for i in range(0, len(x) - hop, hop)])
    quiet = env < 0.04; gaps = []; run = 0
    for i, q in enumerate(quiet):
        run = run + 1 if q else 0
        if run == 8: gaps.append(i - 4)
    want = len(first) / len(text) * len(env)
    g = min(gaps, key=lambda g: abs(g - want)) * .01 if gaps else want * .01
    return [[a, a + g, first], [a + g + .05, a + len(x) / sr, second]]

scenes, subs, t = [{"name": "open", "start": 0.0, "end": OPEN, "lines": []}], [], OPEN
for name in ORDER:
    ss = [s for s in sents if s["scene"] == name]; start = t; u = t + LEAD; lines = []
    for k, s in enumerate(ss):
        x = wav(s["file"]); lines.append({"a": round(u, 3), "b": round(u + len(x) / 24000, 3), "text": s["text"], "file": s["file"]})
        subs += cues(s["text"], x, u); u += len(x) / 24000 + (GAP if k < len(ss) - 1 else 0)
    end = max(start + MIN, u + TAIL)
    scenes.append({"name": name, "start": round(start, 3), "end": round(end, 3), "lines": lines}); t = end
logo = round(t, 3)
endline = [s for s in sents if s["scene"] == "end"][0]
ea = logo + 3.6
lines = [{"a": round(ea, 3), "b": round(ea + endline["dur"], 3), "text": endline["text"], "file": endline["file"]}]
total = round(logo + LOGO + END, 3)
tl = {"total": total, "scenes": scenes, "logo": {"start": logo, "axis": round(logo + 1.6, 3), "settle": round(logo + 2.2, 3), "card": round(logo + LOGO, 3)},
      "endLine": lines[0], "subs": [[round(a, 3), round(b, 3), c] for a, b, c in subs]}
(ROOT / "remotion/src/apple/full.json").write_text(json.dumps(tl, indent=1))

# narration
sr = 24000; y = np.zeros(int(total * sr) + sr, np.float32)
for sc in scenes:
    for l in sc["lines"]:
        x = wav(l["file"]); i = int(l["a"] * sr); y[i:i + len(x)] += x
x = wav(endline["file"]); i = int(ea * sr); y[i:i + len(x)] += x
out = ROOT / "apple/full/out"; out.mkdir(parents=True, exist_ok=True)
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, out / "narration.wav", I=-16, TP=-2.0, channels=1)

# calm bed: pads + soft arpeggio, dips under every line, fades on the end card
tr = Track(total, 23)
prog = [(gm.DMAJ9, 38), (gm.BM7, 35), (gm.GMAJ7, 31), (gm.ASUS, 33)]
c, k = 0.0, 0
chords = []
while c < total:
    n, b = prog[k % 4]; chords.append((c, min(total, c + 5.0), n, b)); c += 5.0; k += 1
tr.chords(chords); tr.arpeggio(1.0, total - 2.5); tr.music *= 0.8
for sc in scenes:
    for l in sc["lines"]: tr.duck(l["a"], l["b"], 0.35, edge=.3)
tr.duck(ea, ea + endline["dur"], 0.35, edge=.3)
fo = int(2.5 * SR); tr.music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    m = tr.music / np.abs(tr.music).max() * 0.7
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m * 32767).astype("<i2").tobytes())
    il, _ = measure(tmp.name)
    subprocess.run([FF, "-loglevel", "error", "-y", "-i", tmp.name, "-af", f"volume={-31 - il:.2f}dB", "-ar", "48000", str(out / "music.wav")], check=True)
raw = out / "mix_raw.wav"
subprocess.run([FF, "-v", "error", "-y", "-i", str(out / "narration.wav"), "-i", str(out / "music.wav"),
                "-filter_complex", f"[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=longest:normalize=0,atrim=0:{total}[a]",
                "-map", "[a]", "-ar", "48000", "-c:a", "pcm_s16le", str(raw)], check=True)
loudnorm(raw, out / "mix-master.wav", I=-14, TP=-1.0); raw.unlink()
for sc in scenes: print(f"{sc['name']:9s} {sc['start']:6.2f}-{sc['end']:6.2f}")
print("logo", logo, "total", total, "| mix", measure(out / "mix-master.wav"))
for s in tl["subs"]: print(f"  {s[0]:6.2f}-{s[1]:6.2f} {s[2]}")
