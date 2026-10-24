"""Fast, driving 128 BPM cue for "One axis" (15 s), synthesized offline. Beat k at 0.15 + 0.46875*k s, so the
signature downbeat (11.4 s) is beat 24, the start of bar 7. Energy: tense ticks (0-2.2) -> kick enters with the
reveal (2.2) -> build -> riser into the wipe (10.2) -> full drop on 11.4 -> pads and shimmer under the logo -> fade.
    python3 onefold/axis/music.py  ->  onefold/axis/music.wav (48 kHz stereo, -14 LUFS, <= -1 dBTP)"""
import sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm
SR, DUR = 48000, 15.0
N = int(SR * DUR)
BEAT, T0 = 60 / 128, 0.15
B = lambda k: T0 + BEAT * k
rng = np.random.default_rng(128)

def put(dst, x, at, g=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i + len(x) <= 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * g * l * 1.414; dst[i:i + len(x), 1] += x * g * r * 1.414
def band(x, lo=0.0, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo > 0: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)
def env(n, a, d):
    t = np.arange(n) / SR
    return (np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4))).astype(np.float32)
def saw(f, n, det=0.004):
    t = np.arange(n) / SR
    return sum(((t * f * (1 + d)) % 1.0) * 2 - 1 for d in (-det, 0, det)).astype(np.float32) / 3
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def kick(g=1.0):
    n = int(0.36 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(48 + 95 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.17)
    x[:120] += np.linspace(0.5, 0, 120) * rng.standard_normal(120)
    return (x * g).astype(np.float32)
def clap():
    n = int(0.2 * SR); x = np.zeros(n, np.float32)
    for k, off in enumerate((0, 0.010, 0.020)):
        i = int(off * SR); x[i:] += rng.standard_normal(n - i).astype(np.float32) * env(n - i, 0.001, 0.014 if k < 2 else 0.07)
    return band(x, 900, 5200)
def hat(o=False):
    n = int((0.12 if o else 0.04) * SR)
    return band(rng.standard_normal(n).astype(np.float32) * env(n, 0.0007, 0.05 if o else 0.011), 7500, 17000)
def bass(m, length):
    n = int(length * SR); t = np.arange(n) / SR
    return band(saw(mtof(m), n, 0.002) * 0.7 + np.sin(2 * np.pi * mtof(m) * t).astype(np.float32) * 0.6, 35, 380) * env(n, 0.004, length * 0.6)
def pluck(m, length=0.22):
    n = int(length * SR); return band(saw(mtof(m), n, 0.003), 250, 4200) * env(n, 0.002, 0.07)
def stab(notes, length=0.2):
    n = int(length * SR); return band(sum(saw(mtof(m), n, 0.006) for m in notes) / len(notes), 200, 3000) * env(n, 0.003, 0.08)
def pad(notes, length):
    n = int(length * SR); x = sum(saw(mtof(m), n) for m in notes) / len(notes)
    e = np.minimum(np.arange(n) / SR / 0.4, 1) * np.minimum((n - np.arange(n)) / SR / 0.5, 1)
    return band(x, 120, 1600) * e.astype(np.float32)
def riser(length):
    n = int(length * SR); t = np.arange(n) / SR; k = (t / length) ** 2.5
    x = rng.standard_normal(n).astype(np.float32)
    return (band(x, 1500, 12000) * k).astype(np.float32) + (np.sin(2 * np.pi * np.cumsum(300 + 2600 * k) / SR) * 0.25 * k).astype(np.float32)
def whoosh(pre=0.35, post=0.12):
    n = int((pre + post) * SR); x = rng.standard_normal(n).astype(np.float32); t = np.arange(n) / SR
    e = np.where(t < pre, (t / pre) ** 3, np.exp(-(t - pre) / (post / 3))).astype(np.float32); k = np.clip(t / pre, 0, 1).astype(np.float32)
    return (band(x, 300, 2000) * (1 - k) + band(x, 2000, 11000) * k) * e
def boom():
    n = int(1.3 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.4) + band(rng.standard_normal(n).astype(np.float32), 200, 7000) * np.exp(-t / 0.3) * 0.35).astype(np.float32)
def tick(f=2800, d=0.0018):
    n = int(0.014 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / d)).astype(np.float32)

CH = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64]]        # Am – F – G – Em
ROOTS = [45, 41, 43, 40]
mus = np.zeros((N, 2), np.float32)
kb = lambda k: (k // 4) % 4                                                       # chord per bar
bar_of = lambda t: int((t - T0) / (BEAT * 4))
# 0.0–2.2 problem: dry ticks that stumble, a low pad swelling
put(mus, pad(CH[0], 2.3) * 0.5, 0.0, 0.4)
for k in range(0, 5):
    put(mus, tick(2400 + 200 * (k % 2)), B(k), 0.3, -0.3 + 0.15 * k)
    if k % 2: put(mus, tick(3600, 0.001), B(k) + BEAT * 0.75, 0.18, 0.3)
# 2.2–6.3 reveal + step 1: kick in, bass offbeats, hats
def groove(k0, k1, full=True, perc=1.0):
    for k in range(k0, k1):
        t = B(k)
        put(mus, kick(), t, 0.95 * perc)
        put(mus, hat(True), t + BEAT / 2, 0.26 * perc, -0.25)
        for s in (0.25, 0.75): put(mus, hat(), t + BEAT * s, 0.16 * perc, 0.25)
        if k % 2 == 1: put(mus, clap(), t, 0.5 * perc, 0.05)
        put(mus, bass(ROOTS[kb(k)], BEAT * 0.42), t + BEAT / 2, 0.55 * perc)
        if full:
            ch = CH[kb(k)]
            put(mus, pluck(ch[(k * 3) % 4] + 12), t + BEAT * 0.25, 0.20, -0.2); put(mus, pluck(ch[(k * 3 + 2) % 4] + 12), t + BEAT * 0.75, 0.18, 0.3)
            if k % 4 == 0: put(mus, stab(ch), t, 0.34, 0.1)
k_reveal = int(round((2.2 - T0) / BEAT))                                          # beat 4 = 2.025 s
groove(k_reveal, k_reveal + 8, full=False, perc=0.85)                             # 2.0–5.8  (reveal, step 1)
groove(k_reveal + 8, 24, full=True, perc=1.0)                                     # 5.8–11.4 (steps 2–3, plus the build)
# 9.0–10.2: build — snare roll tightening into the wipe, riser peaking at 10.2
put(mus, riser(1.6), 8.6, 0.30)
for j in range(16):
    t = 9.0 + (j / 16) ** 0.8 * 1.2
    put(mus, clap(), t, 0.14 + 0.02 * j, 0.0)
put(mus, boom(), 10.2, 0.55); put(mus, whoosh(), 10.2 - 0.35, 0.5)                # the wipe
# 10.2–11.4: stripped to bass + kick, a breath before the drop
for k in range(24 - 3, 24):
    put(mus, bass(ROOTS[0], BEAT * 0.9), B(k), 0.6)
# 11.4 signature downbeat: full drop with a crash
put(mus, boom(), 11.4, 0.85)
put(mus, band(rng.standard_normal(int(1.1 * SR)).astype(np.float32), 5000, 17000) * env(int(1.1 * SR), 0.001, 0.4), 11.4, 0.35)
groove(24, 24 + 5, full=True, perc=1.0)                                           # 11.4–13.7
# 12.4– logo: pad and shimmer, rhythm thins out; axis whoosh
put(mus, pad(CH[0], 2.6), 12.4, 0.5)
put(mus, whoosh(0.4, 0.15), 12.6 + 0.0, 0.45)
tt = np.arange(int(1.6 * SR)) / SR
put(mus, (sum(np.sin(2 * np.pi * f * tt) for f in (1760, 2217, 2637, 3520)) / 4 * np.exp(-tt / 0.6)).astype(np.float32), 13.05, 0.25)
# UI clicks: step 1 button (~5.2), photo check (~7.9), stepper steps (~8.6–9.8), the fold into the card (11.4 on)
for t, f in ((5.2, 2200), (7.95, 3300), (8.7, 2600), (9.1, 2800), (9.55, 3000)): put(mus, tick(f), t, 0.35, 0.2)
# fade out over the last 0.6 s (the film dissolves back into the dashed line)
fo = int(0.6 * SR); mus[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.4
out = ROOT / "onefold/axis"
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    x = np.tanh(1.7 * mus / np.abs(mus).max()) / np.tanh(1.7) * 0.85      # soft clip: tames the transient peaks so AAC does not overshoot
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, out / "music.wav", I=-14.0, TP=-3.2)
