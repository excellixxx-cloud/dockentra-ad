"""Object sounds for "Two boxes" (no music). Times mirror TL in remotion/src/twoboxes/TwoBoxes.tsx.
Writes twoboxes/voice/sfx.wav (48 kHz stereo, gated -29 LUFS: 13 dB under the -16 LUFS voice) and
twoboxes/out/mix-master.wav (voice + sfx, -14 LUFS, <= -1 dBTP, 48 kHz 16-bit).

    python3 twoboxes/sfx.py"""
import re, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "remotion/scripts")); sys.path.insert(0, str(ROOT / "youtube/tts"))
from gen_music import SR, Track
from loud import loudnorm, measure
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

src = (ROOT / "remotion/src/twoboxes/TwoBoxes.tsx").read_text()
tl = src.split("export const TL = {")[1].split("};")[0]
TL = {k: float(v) for k, v in re.findall(r"(\w+): ([\d.]+)", tl)}
lists = {k: [float(x) for x in v.split(",")] for k, v in re.findall(r"(\w+): \[([\d., ]+)\]", tl)}
tr = Track(32.0, 32)

def thump(t, f, lvl, pan=.5, bounce=True):
    tr.add(t, (tr.thump(f, .22, 20), lvl), (tr.click(.02), .12), pan=pan)
    if bounce:
        tr.add(t + .22, (tr.thump(f * 1.1, .1, 30), lvl * .3), pan=pan)
def tin(t, pan=.5): tr.add(t, (tr.thump(210, .1, 32), .25), (tr.blip(2300, .05, 70), .06), pan=pan)
def swish(t, d=.4, b=.25, lvl=.18, pan=.5): tr.add(t, (tr.swish(d, b), lvl), pan=pan)
def tick(t, pan=.5, lvl=.08): tr.add(t, (tr.blip(1600, .05, 70), lvl), (tr.click(.01), .08), pan=pan)
def whirr(t, d, pan=.5, lvl=.07):
    for i in range(int(d / .03)): tr.add(t + i * .03, (tr.click(.008), lvl), pan=pan)

swish(.3, 1.6, .08, .2)                                   # push in to the table
thump(TL["mailerLand"], 150, .3, .35)                     # flat mailer: light slap
thump(TL["boxLand"], 85, .55, .65)                        # box: heavier
tin(TL["prodLand"]); tr.add(TL["prodLand"] + .2, (tr.thump(230, .06, 40), .08))
thump(TL["tapeLand"], 190, .2, .55, bounce=False); tr.add(TL["tapeLand"], (tr.click(.02), .2))
swish(TL["close"], .35, .3, .15, .35); thump(TL["close"] + .45, 120, .2, .65, bounce=False)   # both close
swish(TL["toScale"], .5, .2, .12); tin(TL["onScale"], .45)
tr.add(TL["onScale"] + .35, (tr.blip(1750, .08, 55), .12))                                   # scale settles: beep
swish(TL["offScale"], .45, .2, .12); tin(TL["offScale"] + .6, .5)
edges = [TL[k] for k in ("mL", "mW", "mH", "bL", "bW", "bH")]
winds = [TL["mW"] - .2, TL["mH"] - .2, TL["tapeIn"], TL["bW"] - .2, TL["bH"] - .2, TL["tapeIn2"]]
for i, (s, w) in enumerate(zip(edges, winds)):
    pan = .35 if i < 3 else .65
    if i % 3 == 0: swish(s - .5, .45, .2, .1, pan)
    whirr(s, .45, pan); tr.add(s + .45, (tr.click(.015), .15), pan=pan)                       # strip runs out, hook catches
    tick(s + .45, pan, .06)                                                                     # the number arrives
    whirr(w, .3, pan, .05); tr.add(w + .32, (tr.click(.02), .22), (tr.thump(300, .05, 50), .08), pan=pan)   # winds back, snaps
for t in lists["fM"] + lists["fB"]: tick(t, .5, .05)                                          # formula terms
tr.add(lists["fM"][-1], (tr.blip(1900, .07, 50), .08)); tr.add(lists["fB"][-1], (tr.blip(1900, .07, 50), .08))
tick(TL["cmpA"], .7, .07)
tr.add(TL["cmpB"], (tr.thump(70, .35, 10), .5), (tr.blip(1250, .18, 18), .1), pan=.7)       # the halt
swish(TL["openM"], .3, .3, .12, .35)
swish(TL["intoMailer"], .45, .25, .12, .4); swish(TL["intoMailer"] + .5, .5, .5, .14, .35)  # hop, slide in
thump(TL["closeM"] + .35, 160, .2, .35, bounce=False)                                       # flap shut
o = TL["boxOut"]
swish(o, .5, .3, .18, .55)                                # box slides to the edge
thump(o + .82, 70, .65, .4)                               # drops to the floor
swish(o + .95, .75, .2, .16, .25)                         # slides away left
swish(TL["pull"], 1.3, .08, .14)                          # pull back
swish(TL["logo"], .6, .12, .12)

def render():
    out = tr.fx
    out /= np.abs(out).max() / 10 ** (-1 / 20)
    (ROOT / "twoboxes/out").mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
        i, _ = measure(tmp.name)
        subprocess.run([FF, "-loglevel", "error", "-y", "-i", tmp.name, "-af", f"volume={-29 - i:.2f}dB,alimiter=limit=0.89:level=false", "-ar", "48000", str(ROOT / "twoboxes/voice/sfx.wav")], check=True)
    print("sfx", measure(ROOT / "twoboxes/voice/sfx.wav"))
    raw = ROOT / "twoboxes/out/mix_raw.wav"
    subprocess.run([FF, "-v", "error", "-y", "-i", str(ROOT / "twoboxes/voice/narration.wav"), "-i", str(ROOT / "twoboxes/voice/sfx.wav"),
                    "-filter_complex", "[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=longest:normalize=0,atrim=0:32[a]",
                    "-map", "[a]", "-ar", "48000", "-c:a", "pcm_s16le", str(raw)], check=True)
    loudnorm(raw, ROOT / "twoboxes/out/mix-master.wav", I=-14, TP=-1.0); raw.unlink()

render()
