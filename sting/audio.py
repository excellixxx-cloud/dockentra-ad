"""Sound for the Dockentra WMS sting: a synthesized 124 BPM house cue + SFX, exactly 12.075 s.

    python3 sting/audio.py   ->  sting/out/sting-audio.wav  (48 kHz stereo, -14 LUFS, <= -1 dBTP)
Beat k sits at 0.048 + 0.4838*k s; the drop is beat 5 (2.467 s), led by the f72 cut 2 frames earlier.
Deterministic: noise comes from a seeded generator."""
import subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm

SR = 48000
DUR = 12.075
N = int(round(DUR * SR))
BEAT = 0.4838
B = lambda k: 0.048 + BEAT * k
DROP = B(5)
rng = np.random.default_rng(124)
t_all = np.arange(N) / SR

def buf(): return np.zeros((N, 2), np.float32)

def put(dst, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N: return
    x = x[: N - max(i, 0)]
    if i < 0: x, i = x[-i:], 0
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * gain * l * 1.414
    dst[i:i + len(x), 1] += x * gain * r * 1.414

def band(x, lo=0.0, hi=None, sr=SR):
    """zero-phase brick-ish band filter in the frequency domain (soft edges)."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr)
    m = np.ones_like(f)
    if lo > 0: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)

def env(n, a, d, sus=0.0):
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4))
    return (e * (1 - sus) + sus * (t >= 0)).astype(np.float32)

def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for d in (-detune, 0, detune):
        ph = (t * freq * (1 + d)) % 1.0
        out += (2 * ph - 1).astype(np.float32)
    return out / 3

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ instruments
def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.22)
    x[:200] += np.linspace(0.6, 0, 200) * rng.standard_normal(200) * 0.4
    return x.astype(np.float32)

def clap():
    n = int(0.25 * SR); x = np.zeros(n, np.float32)
    for k, off in enumerate((0, 0.011, 0.022)):
        i = int(off * SR); m = n - i
        x[i:] += rng.standard_normal(m).astype(np.float32) * env(m, 0.001, 0.018 if k < 2 else 0.09)
    return band(x, 900, 5200) * 0.9

def hat(open_=False):
    n = int((0.16 if open_ else 0.05) * SR)
    x = rng.standard_normal(n).astype(np.float32) * env(n, 0.0008, 0.07 if open_ else 0.014)
    return band(x, 7000, 16000)

def bass(m, length):
    n = int(length * SR)
    x = saw(mtof(m), n, 0.003) * 0.6 + np.sin(2 * np.pi * mtof(m) * np.arange(n) / SR).astype(np.float32) * 0.6
    return band(x, 30, 420) * env(n, 0.004, length * 0.55)

def stab(notes, length=0.26):
    n = int(length * SR)
    x = sum(saw(mtof(m), n, 0.006) for m in notes) / len(notes)
    return band(x, 180, 2600) * env(n, 0.003, 0.11)

def pad(notes, length):
    n = int(length * SR)
    x = sum(saw(mtof(m), n, 0.004) for m in notes) / len(notes)
    e = np.minimum(np.arange(n) / SR / 0.6, 1.0) * np.minimum((n - np.arange(n)) / SR / 0.4, 1.0)
    return band(x, 120, 1500) * e.astype(np.float32)

# A minor house progression, one chord per bar (4 beats): Am9 – Fmaj7 – C – G6
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 64]]
ROOTS = [45, 41, 48, 43]

music = buf()
# intro (beats 0–4): soft pad, filtered off-beat hats rising, noise riser into the drop
put(music, pad(CH[0], DROP - 0.05) * 0.5, 0.0, 0.55)
for k in range(5):
    put(music, hat(True) * (0.2 + 0.15 * k), B(k) + BEAT / 2, 0.35, 0.3)
rz = int((DROP - 0.9) * SR); riser = rng.standard_normal(int(0.9 * SR)).astype(np.float32)
riser = band(riser, 2000, 9000) * np.linspace(0, 1, len(riser)).astype(np.float32) ** 3
put(music, riser, DROP - 0.9, 0.22)

# drop: beat 5 to the end
last = int((DUR - 0.048) / BEAT)
for k in range(5, last + 1):
    bar = (k - 5) // 4 % 4
    put(music, kick(), B(k), 0.95)
    if (k - 5) % 2 == 1: put(music, clap(), B(k), 0.55, 0.05)
    put(music, hat(True), B(k) + BEAT / 2, 0.30, -0.25)
    for s in (0.25, 0.75): put(music, hat(), B(k) + BEAT * s, 0.22, 0.25)
    put(music, bass(ROOTS[bar], BEAT * 0.45), B(k) + BEAT / 2, 0.55)
    if (k - 5) % 4 in (0, 2): put(music, stab(CH[bar]), B(k) + (BEAT * 0.75 if (k - 5) % 4 == 2 else 0), 0.40, 0.15)
    if (k - 5) % 4 == 0: put(music, pad(CH[bar], BEAT * 4) * 0.45, B(k), 0.30)
# side-chain style pump: duck everything but the kick a little after each beat
pump = np.ones(N, np.float32)
for k in range(5, last + 1):
    i = int(B(k) * SR); n = int(0.25 * SR)
    seg = 1 - 0.35 * np.exp(-np.arange(n) / SR / 0.08)
    pump[i:i + n] = np.minimum(pump[i:i + n], seg[: len(pump[i:i + n])])

# ------------------------------------------------------------------ SFX
sfx = buf()
def whoosh(peak, pre=0.45, post=0.18, gain=0.5):
    n = int((pre + post) * SR); x = rng.standard_normal(n).astype(np.float32)
    t = np.arange(n) / SR
    e = np.where(t < pre, (t / pre) ** 3, np.exp(-(t - pre) / (post / 3))).astype(np.float32)
    lo, hi = band(x, 300, 2200), band(x, 2200, 11000)
    k = np.clip(t / pre, 0, 1).astype(np.float32)                    # brighter as it peaks
    put(sfx, (lo * (1 - k) + hi * k) * e, peak - pre, gain, 0.0)
def hit(at, gain=0.75):
    n = int(1.4 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.35)
    nz = band(rng.standard_normal(n).astype(np.float32), 400, 7000) * np.exp(-t / 0.5).astype(np.float32) * 0.35
    put(sfx, (body.astype(np.float32) + nz), at, gain)
def click(at, gain=0.35):
    n = int(0.012 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.0018) + 0.5 * np.sin(2 * np.pi * 1400 * t) * np.exp(-t / 0.003)
    put(sfx, x.astype(np.float32), at, gain, 0.1)

put(sfx, (np.sin(2 * np.pi * np.cumsum(50 + 60 * np.exp(-np.arange(int(0.5 * SR)) / SR / 0.04)) / SR) * np.exp(-np.arange(int(0.5 * SR)) / SR / 0.18)).astype(np.float32), 0.10, 0.35)  # soft impact
for p in (2.402, 3.370, 5.305, 10.043): whoosh(p)
hit(6.240); hit(8.175)
click(2.33); click(3.83)
tk = 4.04
while tk <= 5.00:
    click(tk + rng.uniform(-0.004, 0.004), 0.06); tk += 0.032
# shimmer at 10.05
n = int(1.8 * SR); t = np.arange(n) / SR
sh = sum(np.sin(2 * np.pi * f * t) for f in (2093, 2637, 3136, 4186)) * np.exp(-t / 0.7) * (0.75 + 0.25 * np.sin(2 * np.pi * 9 * t))
put(sfx, (sh / 4).astype(np.float32), 10.05, 0.28, 0.0)

mix = music * pump[:, None] * 0.8 + sfx
fade = int(0.060 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = ROOT / "sting/out"; out.mkdir(parents=True, exist_ok=True)
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    x = mix / np.abs(mix).max() * 0.8
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, out / "sting-audio.wav", I=-14, TP=-1.0)
print("drop at", round(DROP, 3), "s; length", DUR, "s")
