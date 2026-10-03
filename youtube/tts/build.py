"""Lay the synthesised chapters on the film's timeline and write everything that depends on it:
  remotion/src/ops/timeline.json   chapter + sentence timing the animation keys off
  youtube/out/narration.wav        the voice alone, full length, 48 kHz (replaceable by a human read)
  youtube/out/subtitles.srt        one cue per spoken phrase, prices in figures
  youtube/out/chapters.txt         YouTube chapter list
Layout per chapter: [2 s title card] [2.5 s picture before the voice] voice [1.8 s tail]. Chapter 0 has
no card and a 1 s lead; chapter 9 holds the final card 4 s after the voice."""
import json, re, subprocess, wave
from pathlib import Path
import numpy as np, imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
VOICE = ROOT / "youtube/voice"
OUT = ROOT / "youtube/out"; OUT.mkdir(exist_ok=True)
NAMES = ["Intro", "Before anything arrives", "Receiving and the photo report", "When something is wrong",
         "Putaway and the stock record", "The order arrives", "Picking", "Packing", "Label and dispatch", "And when it comes back"]
CARD, LEAD, TAIL, LAST_TAIL, LEAD0 = 2.0, 2.5, 1.8, 4.0, 1.0
FIGURES = [("two euro sixty", "€2.60"), ("sixty cents", "€0.60"), ("two hundred and seventy-five euro", "€275"), ("five thousand", "5000")]

def read(p):
    w = wave.open(str(p)); return w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

chapters, t, sr0, track = [], 0.0, None, []
for n in range(10):
    sr, x = read(VOICE / f"ch{n}.wav"); sr0 = sr0 or sr
    marks = [l.rstrip("\n").split("\t") for l in open(VOICE / f"ch{n}.marks.tsv")]
    card = 0.0 if n == 0 else CARD
    vstart = LEAD0 if n == 0 else CARD + LEAD
    vdur = len(x) / sr
    dur = vstart + vdur + (LAST_TAIL if n == 9 else TAIL)
    chapters.append({"n": n, "name": NAMES[n], "start": round(t, 3), "dur": round(dur, 3), "card": card, "voice": round(vstart, 3),
                     "sentences": [{"a": round(vstart + float(a), 3), "b": round(vstart + float(b), 3), "text": s} for a, b, s in marks]})
    track.append((t + vstart, x)); t += dur

total = t
(ROOT / "remotion/src/ops/timeline.json").write_text(json.dumps({"total": round(total, 3), "fps": 30, "chapters": chapters}, indent=1))

# narration.wav — the voice on the film's clock
y = np.zeros(int(total * sr0) + sr0, np.float32)
for at, x in track:
    i = int(at * sr0); y[i:i + len(x)] += x
tmp = OUT / "_narr24k.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr0); w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-y", "-i", str(tmp), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", str(OUT / "narration.wav")], check=True)
tmp.unlink()

# subtitles — one cue per phrase; long sentences split at commas, timed by length
def ts(s):
    ms = int(round(s * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
def figures(s):
    for a, b in FIGURES: s = s.replace(a, b)
    return s
def split(text, limit=84):
    if len(text) <= limit: return [text]
    parts, cur = [], ""
    for piece in re.split(r"(?<=,)\s+|(?<=:)\s+", text):
        if cur and len(cur) + len(piece) + 1 > limit: parts.append(cur); cur = piece
        else: cur = (cur + " " + piece).strip()
    parts.append(cur)
    return parts
def wrap(s, w=42):
    if len(s) <= w: return s
    words, best = s.split(), None
    for i in range(1, len(s.split())):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if best is None or max(len(a), len(b)) < max(len(best[0]), len(best[1])): best = (a, b)
    return best[0] + "\n" + best[1]
cues = []
for ch in chapters:
    for s in ch["sentences"]:
        a, b = ch["start"] + s["a"], ch["start"] + s["b"]
        parts = split(figures(s["text"])); L = sum(len(p) for p in parts); cur = a
        for p in parts:
            e = cur + (b - a) * len(p) / L
            cues.append((cur, e + 0.15, p)); cur = e
srt = "".join(f"{i + 1}\n{ts(a)} --> {ts(min(b, cues[i + 1][0] - 0.02) if i + 1 < len(cues) else b)}\n{wrap(txt)}\n\n" for i, (a, b, txt) in enumerate(cues))
(OUT / "subtitles.srt").write_text(srt)

# chapters — YouTube format
def yt(s):
    s = int(s); return f"{s // 60:02d}:{s % 60:02d}"
(OUT / "chapters.txt").write_text("".join(f"{yt(c['start'])} {c['name']}\n" for c in chapters))
print(f"total {total:.1f} s = {int(total // 60)}:{total % 60:04.1f}")
for c in chapters: print(f"  ch{c['n']}  start {c['start']:6.1f}  dur {c['dur']:5.1f}  {c['name']}")
