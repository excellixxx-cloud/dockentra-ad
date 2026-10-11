"""Calm instrumental bed for the WMS video, then the final mix.
  wms/out/music.wav       pads + a soft arpeggio, quiet (about 17 dB under the voice), dips under each phrase
  wms/out/mix-master.wav  voice + music, -14 LUFS, <= -1 dBTP, 48 kHz 16-bit
    python3 wms/music.py"""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "remotion/scripts")); sys.path.insert(0, str(ROOT / "youtube/tts"))
import gen_music as gm
from gen_music import SR, Track
from loud import loudnorm, measure
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

TLJ = json.loads((ROOT / "remotion/src/wms/timeline.json").read_text())
DUR = TLJ["total"]
tr = Track(DUR, 21)
prog = [(gm.DMAJ9, 38), (gm.BM7, 35), (gm.GMAJ7, 31), (gm.ASUS, 33)]
chords, t, i = [], 0.0, 0
while t < DUR:
    notes, bass = prog[i % 4]; chords.append((t, min(DUR, t + 5.0), notes, bass)); t += 5.0; i += 1
tr.chords(chords)
tr.arpeggio(2.0, DUR - 2.5)
tr.music *= 0.8
# the bed dips a little under every phrase so the voice stays on top
for sc in TLJ["scenes"]:
    for l in sc["lines"]:
        tr.duck(l["a"], l["b"], 0.35, edge=.3)
fo = int(2.5 * SR); tr.music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
out = ROOT / "wms/out"
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    x = tr.music / np.abs(tr.music).max() * 0.7
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    i_l, _ = measure(tmp.name)
    subprocess.run([FF, "-loglevel", "error", "-y", "-i", tmp.name, "-af", f"volume={-33 - i_l:.2f}dB", "-ar", "48000", str(out / "music.wav")], check=True)
print("music", measure(out / "music.wav"))
raw = out / "mix_raw.wav"
subprocess.run([FF, "-v", "error", "-y", "-i", str(out / "narration.wav"), "-i", str(out / "music.wav"),
                "-filter_complex", f"[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=longest:normalize=0,atrim=0:{DUR}[a]",
                "-map", "[a]", "-ar", "48000", "-c:a", "pcm_s16le", str(raw)], check=True)
loudnorm(raw, out / "mix-master.wav", I=-14, TP=-1.0); raw.unlink()
