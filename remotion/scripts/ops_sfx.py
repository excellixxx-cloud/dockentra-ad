"""Object sounds for the YouTube operations video. NO MUSIC.

Event times mirror src/ops/Ops.tsx and are keyed to the sentence starts in
src/ops/timeline.json, so a re-synthesised voice re-times the sounds too.
Writes youtube/out/sfx.wav (48 kHz stereo, gated loudness -29 LUFS = 13 dB
under the -16 LUFS narration).

    python3 scripts/ops_sfx.py
"""
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

from gen_music import SR, Track

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/ops/timeline.json").read_text())
OUT = ROOT.parent / "youtube/out/sfx.wav"
SFX_LUFS = -29.0

tr = Track(TL["total"], 71)
ch = None


def S(k):
    return ch["start"] + ch["sentences"][k]["a"]


def at(local):
    return ch["start"] + local


# ---------------- small vocabulary of object sounds ----------------
def pop(t, pan=.6):            # a panel or tag appears: soft paper tick
    tr.add(t, (tr.click(.02), .18), (tr.blip(1250, .05, 70), .05), pan=pan)


def tick(t, pan=.65):          # a field is checked
    tr.add(t, (tr.blip(1500, .07, 55), .09), (tr.click(.012), .1), pan=pan)


def cam(t):                    # a camera move: a breath of air
    tr.add(t, (tr.swish(.9, .06), .1))


def clink(t, pan=.5, f=1800):  # glass jar set down
    tr.add(t, (tr.thump(170, .12, 28), .2), (tr.blip(f, .07, 60), .08), pan=pan)


def land(t, f=110, lvl=.45, pan=.5, bounce=True):   # a box or parcel lands, then settles (the hop in Ops.tsx)
    tr.add(t, (tr.thump(f, .22, 20), lvl), (tr.click(.02), .15), pan=pan)
    if bounce:
        tr.add(t + .18, (tr.thump(f * 1.1, .12, 28), lvl * .35), pan=pan)
        tr.add(t + .36, (tr.thump(f * 1.2, .08, 34), lvl * .12), pan=pan)


def slide(t, dur=.5, pan=.5):  # paper or cardboard sliding
    tr.add(t, (tr.swish(dur, .3), .22), pan=pan)


def roll(t, dur=1.4, pan=.75):  # the cage rolls out on castors
    tr.add(t, (tr.swish(dur, .04), .55), pan=pan)
    for i in range(int(dur / .11)):
        tr.add(t + .05 + i * .11, (tr.click(.012), .07), pan=pan)


def beep(t, pan=.55):          # scale settles
    tr.add(t, (tr.blip(1700, .07, 65), .14), pan=pan)


def printer(t, pan=.4):
    for k in range(9):
        tr.add(t + k * .045, (tr.click(.012), .22), pan=pan)


def chapter_card():            # Bay Grey slides up over the previous chapter's last 0.64 s, then wipes up into the scene
    tr.add(at(-0.66), (tr.swish(.7, .12), .18))
    tr.add(at(1.68), (tr.swish(.45, .2), .25))


def shots_cams(times):
    for t in times:
        cam(t)


# ---------------- 0. cold open ----------------
ch = TL["chapters"][0]
tr.add(at(.15), (tr.swish(1.4, .08), .2))                       # opening push-in
shots_cams([S(2) - .3, S(3) - .3, S(4) - .2])
roll(S(2) + .6)
pop(S(2) + .5)

# ---------------- 1. before anything arrives ----------------
ch = TL["chapters"][1]
chapter_card()
shots_cams([S(1) - .3, S(3) - .3, S(4) - .3, S(5) - .3, S(6) - .4])
pop(S(1) - .1)
for d in (1.7, 2.7, 3.6):
    tick(S(1) + d)
pop(S(3) + .2)
for i in range(12):                                              # ghost outlines drawn, one per expected jar
    tr.add(S(4) - .1 + i * .06, (tr.click(.01), .06), pan=.4 + i * .02)
for d in (1.6, 2.3, 3.0):
    pop(S(5) + d)
tr.add(S(6) + .25, (tr.swish(.55, .1), .2))                      # carton falls in
land(S(6) + .8, 75, .6)
pop(S(7))
for d in (.6, 1.0, 1.4):
    tick(S(7) + d)

# ---------------- 2. receiving and the photo report ----------------
ch = TL["chapters"][2]
chapter_card()
shots_cams([S(k) - .3 for k in (1, 2, 4, 5, 6, 7, 9, 10)] + [S(3) - .2])
tr.add(S(1) + 1.4, (tr.swish(.5, .3), .3), (tr.thump(140, .15, 26), .2))   # flaps open
for i in range(12):                                              # 11 jars + the extra, out in rows
    clink(S(2) + .2 + i * .12 + .45, pan=.35 + i * .025, f=1700 + 40 * (i % 4))
tr.add(S(3) + 1.25, (tr.click(.03), .5), (tr.swish(.15, .6), .2))          # photo stand shutter
tr.add(S(3) + 1.32, (tr.click(.02), .25))
tr.add(S(4) - .2, (tr.swish(.5, .2), .25), (tr.thump(90, .2, 18), .3))     # carton folds away
tr.add(S(4) + .1, (tr.swish(.8, .25), .14), pan=.7)                         # photos travel to the brand
pop(S(4) + .7, .8)
pop(S(5) + .3)
pop(S(8))
tick(S(8) + 3.6)
tick(S(8) + 6.4)

# ---------------- 3. when something is wrong ----------------
ch = TL["chapters"][3]
chapter_card()
shots_cams([S(1) - .25, S(2) - .25, S(3) - .25, S(4) - .3, S(5) + .4, S(6) - .3, S(7) - .3, S(9) - .3])
pop(S(1))
pop(S(2) - .05)
pop(S(3) + .05)
for d in range(2):                                               # the damaged jars go into the hold tote
    a = S(4) + .7 + d * .3
    tr.add(a, (tr.swish(.4, .2), .12), pan=.45)
    tr.add(a + .6, (tr.thump(130, .15, 24), .3), (tr.blip(1500, .06, 60), .06), pan=.4)
pop(S(5) + .7)
pop(S(6) + .1)
for i in range(8):                                               # received bar counting up
    tr.add(S(6) + 1.2 + i * .085, (tr.click(.01), .07), pan=.7)
pop(S(6) + 2.2)
pop(S(7))
for d in (1.8, 3.0, 3.9):
    tick(S(7) + d)

# ---------------- 4. putaway and the stock record ----------------
ch = TL["chapters"][4]
chapter_card()
shots_cams([S(1) - .4, S(2) - .3, S(3) - .3, S(5) - .3, S(6) - .3, S(7) - .3])
for s in range(9):                                               # jars onto shelf A2
    clink(S(0) + .4 + s * .12 + .75, pan=.3 + s * .02, f=1650 + 50 * (s % 3))
pop(S(2) + .3)
pop(S(5))
for s in range(9):                                               # recount: one tick per jar
    tr.add(S(5) + .6 + s * .24, (tr.blip(1900, .05, 70), .06), (tr.click(.01), .06), pan=.4)
tick(S(5) + 2.9)
tick(S(5) + 3.2)

# ---------------- 5. the order arrives ----------------
ch = TL["chapters"][5]
chapter_card()
shots_cams([S(1) - .3, S(1) + 2.6, S(2) - .3, S(3) - .3])
for d, f in ((1.2, 1320), (2.4, 1480)):                          # two orders land
    tr.add(S(0) + d, (tr.blip(f, .09, 40), .08), (tr.blip(f * 1.5, .09, 40), .05), pan=.75)
slide(S(1) + .3, .7)
tick(S(1) + 3.2)
tick(S(1) + 4.4)
pop(S(2))
t = S(2) + 1.0                                                   # the clock, quietly, to the end of the chapter
while t < ch["start"] + ch["dur"] - .6:
    tr.add(t, (tr.click(.008), .05), (tr.blip(2600, .02, 120), .015), pan=.8)
    t += 1.0

# ---------------- 6. picking ----------------
ch = TL["chapters"][6]
chapter_card()
shots_cams([S(1) - .3, S(2) - .3, S(3) - .3, S(4) - .3, S(6) - .3])
tick(S(1) + .3)
pop(S(2))
tr.add(S(3), (tr.swish(1.4, .12), .12))                          # the route is drawn
clink(S(3) + 1.85, .35, 2000)                                    # jar lifts off the shelf
tr.add(S(3) + 2.3, (tr.swish(1.4, .15), .15), pan=.5)
clink(S(3) + 3.8, .6)                                            # lands on the packing table
pop(S(5) + 2.4, .4)
pop(S(5) + 2.9, .45)

# ---------------- 7. packing ----------------
ch = TL["chapters"][7]
chapter_card()
shots_cams([S(1) - .3, S(4) - .3, S(5) - .3, S(6) - .3, S(7) - .3, S(8) - .3])
tr.add(S(1) + .05, (tr.swish(.35, .6), .2), pan=.6)              # polybag rustle
tr.add(S(2) + .05, (tr.thump(160, .14, 24), .25), (tr.swish(.25, .25), .12), pan=.7)  # padded mailer
tr.add(S(3) + .05, (tr.thump(100, .18, 20), .3), pan=.8)         # box
land(S(4) + .7, 100, .5)                                         # box onto the scale
beep(S(4) + 1.3)
for d in (2.1, 3.0, 3.9):                                        # L, W, H drawn
    tr.add(S(5) + d, (tr.swish(.3, .35), .1), (tr.click(.01), .08))
pop(S(6))
tick(S(6) + 2.4)
tr.add(S(7) + .4, (tr.swish(.5, .3), .25), (tr.thump(150, .12, 26), .15))  # box opened: one small thing inside
tr.add(S(8) + 2.4, (tr.swish(.5, .55), .2), pan=.6)              # tape round the cap
for i in range(4):                                               # glass that could rattle, then can't
    tr.add(S(8) + 3.8 + i * .11, (tr.blip(1900, .05, 70), .05), pan=.7)
pop(S(8) + 5.6, .85)

# ---------------- 8. label and dispatch ----------------
ch = TL["chapters"][8]
chapter_card()
shots_cams([S(0) + 1.0, S(1) - .3, S(1) + 2.6, S(2) - .3, S(3) - .3, S(4) - .3])
land(S(0) + .55, 130, .4)                                        # mailer onto the scale
beep(S(0) + 1.9)
printer(S(1) + .5)
tr.add(S(1) + 1.1, (tr.swish(.5, .35), .15), pan=.4)             # label flies
tr.add(S(1) + 2.0, (tr.click(.02), .35), (tr.swish(.25, .5), .15))  # pressed on, smoothed
tr.add(S(2) + .4, (tr.swish(.8, .2), .15), pan=.7)
land(S(2) + 1.3, 140, .3, pan=.8, bounce=False)                  # into the cage
roll(S(2) + 2.2)
pop(S(3) + .3)
tick(S(3) + 2.7)
pop(S(4) + .1)

# ---------------- 9. and when it comes back ----------------
ch = TL["chapters"][9]
chapter_card()
shots_cams([S(2) - .3, S(3) - .3])
tr.add(S(0) + .25, (tr.swish(.5, .12), .15))
land(S(0) + .8, 130, .4)                                         # the return lands on receiving
pop(S(1))
step = [S(2) + d for d in (0.0, 1.1, 2.0, 2.9, 4.6)]
for t in step:
    tick(t, .5)
tr.add(step[1], (tr.swish(.4, .3), .2))                          # opened, inspected
clink(step[1] + .5)
land(step[3] + .4, 150, .25, bounce=False)                       # fresh mailer
tr.add(step[4] + .1, (tr.swish(.9, .15), .12))
clink(step[4] + .9, .3)                                          # back on the shelf
tr.add(S(3) + .3, (tr.swish(.6, .12), .14))                      # logo
for d in (2.7, 3.4):                                             # TikTok Shop, Shopify chips
    pop(S(3) + d, .5)
tr.add(S(3) + 4.3, (tr.swish(.9, .2), .08))                      # separator rule draws


# ---------------- render: dry + a little room, gated loudness to SFX_LUFS ----------------
def render(dst):
    mix = tr.fx
    ir_len = int(1.2 * SR)
    ti = np.arange(ir_len) / SR
    ir = tr.rng.standard_normal((ir_len, 2)) * np.exp(-ti * 5)[:, None]
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    nfft = 1 << (tr.n + ir_len - 1).bit_length()
    wet = np.stack([np.fft.irfft(np.fft.rfft(mix[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:tr.n] for c in range(2)], axis=1)
    out = mix * .85 + wet * .25
    out /= np.abs(out).max() / 10 ** (-1 / 20)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((out * 32767).astype("<i2").tobytes())
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        r = subprocess.run([ff, "-hide_banner", "-i", tmp.name, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
        i_lufs = float([l for l in r.stderr.splitlines() if l.strip().startswith("I:")][-1].split()[1])
        gain = SFX_LUFS - i_lufs
        subprocess.run([ff, "-loglevel", "error", "-y", "-i", tmp.name, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:level=false",
                        "-ar", "48000", str(dst)], check=True)
    print(dst, f"measured {i_lufs:.1f} LUFS, gain {gain:+.1f} dB")


render(OUT)
