"""Background track + sound accents for the Remotion "Same order, three ways" (36 s).

Original synthesis only (no samples): soft pad, plucked arpeggio and sub bass
in D major at 96 BPM, plus quiet accents locked to the animation — icon drops,
polybag presses, the mailer's spring and landing, the box's rigid lock, the
recap verdicts and the logo. The track dips during the 0.5 s static pause.

    python3 scripts/gen_music.py   # -> public/music-raw.wav, then loudnorm -> public/music.wav
"""
import wave
from pathlib import Path

import numpy as np

SR = 48_000
DUR = 36.0
BPM = 96
EIGHTH = 60 / BPM / 2
N = int(SR * DUR)
rng = np.random.default_rng(11)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


DMAJ9 = [62, 66, 69, 73, 76]
BM7 = [59, 62, 66, 69, 74]
GMAJ7 = [55, 59, 62, 66, 71]
EM7 = [55, 59, 62, 64, 67]
ASUS = [57, 62, 64, 69, 74]
A = [57, 61, 64, 69, 73]
CHORDS = [  # (start, end, notes, bass)
    (0.0, 4.0, DMAJ9, 38), (4.0, 8.0, BM7, 35), (8.0, 12.0, GMAJ7, 31),
    (12.0, 16.0, EM7, 28), (16.0, 20.0, ASUS, 33), (20.0, 24.0, GMAJ7, 31),
    (24.0, 27.0, A, 33), (27.0, 30.0, BM7, 35), (30.0, 33.0, ASUS, 33),
    (33.0, 36.0, DMAJ9, 38),
]


def env(n, a, r):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai) ** 2
    e[n - ri:] *= np.linspace(1, 0, ri) ** 2
    return e


def pad_voice(f, n, cents):
    t = np.arange(n) / SR
    f = f * 2 ** (cents / 1200)
    s = np.sin(2 * np.pi * f * t) + .18 * np.sin(4 * np.pi * f * t) + .05 * np.sin(6 * np.pi * f * t)
    return s * (.85 + .15 * np.sin(2 * np.pi * .13 * t + rng.uniform(0, 6.3)))


music = np.zeros((N, 2))
for start, end, notes, bass in CHORDS:
    s = int(start * SR)
    e = min(N, int((end + 1.1) * SR))
    n = e - s
    ev = env(n, .9 if start else .5, 1.2)
    for i, m in enumerate(notes):
        pan = .5 + (i - 2) * .12
        music[s:e, 0] += pad_voice(hz(m), n, -4) * ev * (1 - pan) * .05
        music[s:e, 1] += pad_voice(hz(m), n, 4) * ev * pan * .05
    tb = np.arange(n) / SR
    music[s:e] += (np.sin(2 * np.pi * hz(bass) * tb) * env(n, .5, .6) * .085)[:, None]

# plucked arpeggio from 4.0 s, thinning out into the question
pattern = [0, 2, 1, 3, 2, 4, 3, 1]
k, tn = 0, 4.0
while tn < 33.0:
    notes = next(c[2] for c in CHORDS if c[0] <= tn < c[1])
    m = notes[pattern[k % 8]] + 12
    s = int(tn * SR)
    e = min(N, s + int(.8 * SR))
    tt = np.arange(e - s) / SR
    f = hz(m)
    body = np.sin(2 * np.pi * f * tt) + .25 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 18)
    lvl = min(1, (tn - 4.0) / 1.5) * min(1, max(0, (33.0 - tn) / 1.5)) * (.75 + .25 * (k % 2 == 0))
    sig = body * np.exp(-tt * 7) * np.minimum(1, tt / .004) * .045 * lvl
    pan = .35 if k % 2 == 0 else .65
    music[s:e, 0] += sig * (1 - pan) * 2
    music[s:e, 1] += sig * pan * 2
    tn += EIGHTH
    k += 1

# ---------------- accents ----------------
fx = np.zeros((N, 2))


def add(at, *parts, pan=.5, gain=1.0):
    """Mix one or more (signal, level) parts, of any lengths, in at `at` seconds."""
    sig = np.zeros(max(len(p) for p, _ in parts))
    for p, lvl in parts:
        sig[:len(p)] += p * lvl
    s = int(at * SR)
    e = min(N, s + len(sig))
    fx[s:e, 0] += sig[:e - s] * (1 - pan) * 2 * gain
    fx[s:e, 1] += sig[:e - s] * pan * 2 * gain


def blip(freq, dur=.18, decay=28, bend=0.0):
    t = np.arange(int(dur * SR)) / SR
    f = freq * (1 + bend * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * decay) * np.minimum(1, t / .002)


def thump(freq=90, dur=.25, decay=18):
    t = np.arange(int(dur * SR)) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay)


def click(dur=.03):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    return np.diff(np.concatenate([[0], noise])) * np.exp(-t * 180) * .5


# icons drop into the row (0:02)
for i, at in enumerate([2.15, 2.27, 2.39]):   # lands at 2.70 / 2.82 / 2.94
    add(at + .55, (thump(110 - i * 8, .2, 22), .5), (blip(880 + i * 110, .12, 40), .25), pan=.3 + i * .2, gain=.9)
# focus changes
add(4.0, (blip(660, .25, 16), .35))
add(12.0, (blip(740, .5, 7, bend=.35), .3))            # springy
add(20.0, (click(), .9))                                   # the hard cut
add(20.24, (thump(70, .3, 14), .8), (click(), .5))       # box slams down       # firm
# polybag presses: soft, muted
for at in (6.1, 9.4, 10.7):
    add(at + .1, (thump(140, .22, 20), .35), gain=.9)
# mailer landing + little bounce
add(18.25, (thump(95, .3, 15), .6))
add(18.47, (thump(120, .15, 25), .2))
# box locks: rigid click
add(21.45, (click(.04), 1.2), (blip(1320, .06, 90), .25))
# recap: chips arrive, verdicts
for at, pan in ((29.9, .3), (31.9, .7)):
    add(at, (blip(990, .1, 45), .25), pan=pan)
for at, pan in ((30.0, .3), (32.0, .7)):
    add(at, (blip(330, .28, 14), .3), (blip(311, .28, 14), .2), pan=pan)
# logo fill: soft two-note chime
add(34.5, (blip(hz(74), 1.2, 3.5), .22), (blip(hz(81), 1.2, 3.0), .12))

mix = music.copy()
# duck the music during the static pause (27.0–27.5), smooth edges
tt = np.arange(N) / SR
duck = 1 - .55 * np.clip(np.minimum((tt - 26.85) / .15, (27.65 - tt) / .15), 0, 1)
mix *= duck[:, None]
mix += fx

# reverb
ir_len = int(2.0 * SR)
ti = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-ti * 3.4)[:, None]
ir /= np.sqrt((ir ** 2).sum(axis=0))
nfft = 1 << (N + ir_len - 1).bit_length()
wet = np.stack([np.fft.irfft(np.fft.rfft(mix[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], axis=1)
out = mix * .78 + wet * .4

fi, fo = int(.3 * SR), int(1.2 * SR)
out[:fi] *= np.linspace(0, 1, fi)[:, None]
out[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]
out /= np.abs(out).max() / 10 ** (-3 / 20)

dst = Path(__file__).resolve().parent.parent / "public" / "music-raw.wav"
with wave.open(str(dst), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print(dst)
