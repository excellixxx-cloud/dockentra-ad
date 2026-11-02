"""Sound for «ПРОФЕСІЯ» (vertical Reels cut with reading holds): a playful 112.5 BPM techno-house cue + SFX.

    python3.13 profesiia/audio.py  ->  profesiia/out/profesiia-audio.wav (48 kHz stereo, -14 LUFS, <= -1 dBTP)
The film runs a 900-frame virtual timeline with holds inserted (remotion/src/profesiia/timing.json).
At 112.5 BPM a beat is exactly 32 frames, and the holds are sized so every chapter change lands on a bar:
ПІДБІР beat 8, НАПРЯМИ 16, СУПРОВІД 24, УМОВИ 36, СТАРТ 44. fr(v) maps a virtual frame to seconds.
Deterministic (seeded noise)."""
import json, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm

T = json.loads((ROOT / "remotion/src/profesiia/timing.json").read_text())
HOLDS = T["holds"]
SR = 48000
DUR = T["total"] / 60
N = int(round(DUR * SR))
BEAT = T["beat_frames"] / 60
B = lambda k: k * BEAT
def fr(v):  # virtual frame -> seconds of the film
    return (v + sum(e for at, e in HOLDS if at < v)) / 60
rng = np.random.default_rng(2830)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

def buf(): return np.zeros((N, 2), np.float32)
def put(dst, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or len(x) == 0: return
    x = x[: N - max(i, 0)]
    if i < 0: x, i = x[-i:], 0
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * gain * l * 1.414
    dst[i:i + len(x), 1] += x * gain * r * 1.414
def band(x, lo=0.0, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo > 0: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)
def env(n, a, d):
    t = np.arange(n) / SR
    return (np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4))).astype(np.float32)
def saw(f, n, det=0.0):
    t = np.arange(n) / SR
    return sum((2 * ((t * f * (1 + d)) % 1.0) - 1) for d in (-det, 0, det)).astype(np.float32) / 3
def noise(n): return rng.standard_normal(n).astype(np.float32)

# ------------------------------------------------------------------ instruments
def kick(punch=1.0):
    n = int(0.38 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(48 + 110 * punch * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.2)
    x[:150] += noise(150) * np.linspace(0.5, 0, 150)
    return np.tanh(x * 1.4).astype(np.float32)
def clap():
    n = int(0.22 * SR); x = np.zeros(n, np.float32)
    for k, off in enumerate((0, 0.009, 0.019, 0.027)):
        i = int(off * SR); x[i:] += noise(n - i) * env(n - i, 0.001, 0.012 if k < 3 else 0.08)
    return band(x, 1000, 6000)
def hat(open_=False):
    n = int((0.18 if open_ else 0.045) * SR)
    return band(noise(n) * env(n, 0.0006, 0.06 if open_ else 0.012), 7500, 16000)
def rim():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.008) + band(noise(n), 2000, 6000) * np.exp(-t / 0.004) * 0.5).astype(np.float32)
def cowbell():
    n = int(0.2 * SR); t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 587 * t)) + np.sign(np.sin(2 * np.pi * 845 * t))
    return band(x.astype(np.float32), 500, 3500) * env(n, 0.001, 0.06)
def tom(m):
    n = int(0.3 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(mtof(m) * (1 + 0.6 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.12)).astype(np.float32)
def bass(m, length):
    n = int(length * SR); f = mtof(m)
    x = saw(f, n, 0.004) * 0.7 + np.sin(2 * np.pi * f * np.arange(n) / SR).astype(np.float32) * 0.8
    return band(x, 30, 700) * env(n, 0.003, length * 0.5)
def pluck(m, length=0.3):
    """marimba-ish FM pluck"""
    n = int(length * SR); t = np.arange(n) / SR; f = mtof(m)
    idx = 2.2 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 0.11)
    return x.astype(np.float32)
def chop(m, length=0.16, vowel=(750, 1200, 2600)):
    """a formant 'ya!' vocal chop from a saw"""
    n = int(length * SR); x = saw(mtof(m), n, 0.006)
    y = sum(band(x, f * 0.82, f * 1.18) * g for f, g in zip(vowel, (1.0, 0.7, 0.35)))
    return y * env(n, 0.004, length * 0.45) * 2.2
def stab(notes, length=0.22):
    n = int(length * SR)
    return band(sum(saw(mtof(m), n, 0.007) for m in notes) / len(notes), 200, 3200) * env(n, 0.002, 0.09)
def pad(notes, length, hi=1600):
    n = int(length * SR)
    x = sum(saw(mtof(m), n, 0.005) for m in notes) / len(notes)
    e = np.minimum(np.arange(n) / SR / 0.4, 1) * np.minimum((n - np.arange(n)) / SR / 0.3, 1)
    return band(x, 150, hi) * e.astype(np.float32)

# G major, one chord per bar from the drop: G – Em – C – D
CH = [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 62]]
ROOT_ = [43, 40, 36, 38]
MOTIF = [(0, 74), (0.75, 71), (1.5, 74), (2.0, 76), (2.5, 74), (3.25, 78)]  # (beat in bar, note) over G
SHIFT = [0, -3, -7, -5]
DROP, START, END = 8, 44, fr(834)
q = BEAT / 4  # a 16th

music = buf()
# --- intro (beats 0–4): low-passed pad, cursor blip
put(music, pad(CH[0], B(4) + 0.1, 700), 0.0, 0.32)
put(music, pluck(79, 0.4), fr(26), 0.25, 0.2)
# --- build (beats 4–8): kicks under the hook, claps, 32nd roll and riser into the flash
for k in range(4, 8):
    put(music, kick(0.8), B(k), 0.85)
    put(music, hat(), B(k) + 2 * q, 0.25, 0.2)
for k in (5, 7): put(music, clap(), B(k), 0.45)
put(music, pad(CH[1], B(4), 1100), B(4), 0.25)
for j in range(8): put(music, clap(), B(7) + j * q / 2, 0.12 + 0.05 * j, 0.1 * (-1) ** j)
r = noise(int((B(8) - B(5.6)) * SR)); r = band(r, 1500, 9000) * np.linspace(0, 1, len(r)).astype(np.float32) ** 3
put(music, r, B(5.6), 0.35)
# --- groove (beats 8–44)
for k in range(DROP, START):
    b = ((k - DROP) // 4) % 4; pos = k % 4
    put(music, kick(), B(k), 0.95)
    if pos in (1, 3): put(music, clap(), B(k), 0.5, 0.05)
    put(music, hat(True), B(k) + 2 * q, 0.28, -0.25)
    for s16, g in ((q + 0.02, 0.16), (3 * q + 0.02, 0.2)): put(music, hat(), B(k) + s16, g, 0.3)  # swung 16ths
    for s16, oc in ((q, 0), (2 * q, 12), (3 * q, 0)): put(music, bass(ROOT_[b] + oc, q * 0.9), B(k) + s16, 0.5)
    if k >= 16 and pos in (1, 3): put(music, cowbell(), B(k) + 3 * q, 0.16, 0.4)  # НАПРЯМИ on
    if pos == 0: put(music, rim(), B(k) + q, 0.18, -0.4)
    if pos == 0: put(music, pad(CH[b], B(4)), B(k), 0.14)
    if pos in (0, 2): put(music, stab([m + 12 for m in CH[b]]), B(k) + (3 * q if pos == 2 else 0), 0.22, 0.15)
    if k >= 24 and pos == 0:  # marimba hook from СУПРОВІД on
        for off, m in MOTIF: put(music, pluck(m + SHIFT[b], 0.4), B(k) + off * BEAT, 0.24, 0.25 * np.sin(off * 3))
    if pos == 3:
        put(music, chop(CH[b][2] + 12), B(k) + 2 * q, 0.22, -0.2)
        put(music, chop(CH[b][3] + 12, vowel=(500, 900, 2400)), B(k) + 3 * q, 0.2, 0.2)
for j, m in enumerate((50, 47, 43, 40)): put(music, tom(m), B(35) + j * q, 0.45, (-0.4, -0.1, 0.1, 0.4)[j])  # fill into УМОВИ
# --- СТАРТ (beat 44 → END): pull-back break, kick drops out, accelerating roll and riser into the end card
put(music, pad(CH[3], END - B(START), 900), B(START), 0.3)
for k in range(START, int(END / BEAT) + 1): put(music, bass(ROOT_[3], BEAT * 0.8), B(k), 0.35)
t = B(START + 1); step = 2 * q
while t < END - 0.02:
    put(music, clap(), t, 0.1 + 0.3 * (t - B(START + 1)) / (END - B(START + 1)), 0.1 * np.sin(t * 40)); t += step; step = max(0.04, step * 0.85)
r = noise(int((END - B(START)) * SR)); r = band(r, 1800, 11000) * np.linspace(0, 1, len(r)).astype(np.float32) ** 2.5
put(music, r, B(START), 0.3)
# --- end card: one big chord hit, held tail, marimba sparkle
put(music, kick(1.2), END, 1.0)
put(music, stab([m + 12 for m in CH[0]] + [79], 0.7), END, 0.4)
put(music, chop(74), END + 0.02, 0.3)
put(music, pad(CH[0] + [69], DUR - END, 2200), END, 0.24)
for j, m in enumerate((79, 83, 86)): put(music, pluck(m, 0.7), END + B(0.5) + j * q, 0.18, (-0.3, 0, 0.3)[j])

pump = np.ones(N, np.float32)
for at in [B(k) for k in range(DROP, START)] + [END]:
    i = int(at * SR); n = int(0.26 * SR)
    seg = 1 - 0.4 * np.exp(-np.arange(n) / SR / 0.08)
    pump[i:i + n] = np.minimum(pump[i:i + n], seg[: len(pump[i:i + n])])

# ------------------------------------------------------------------ SFX on the picture
sfx = buf()
def whoosh(peak, pre=0.35, post=0.15, gain=0.45, pan=0.0):
    n = int((pre + post) * SR); x = noise(n); t = np.arange(n) / SR
    e = np.where(t < pre, (t / pre) ** 3, np.exp(-(t - pre) / (post / 3))).astype(np.float32)
    k = np.clip(t / pre, 0, 1).astype(np.float32)
    put(sfx, (band(x, 300, 2200) * (1 - k) + band(x, 2200, 11000) * k) * e, peak - pre, gain, pan)
def hit(at, gain=0.6):
    n = int(1.0 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(50 + 130 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.3)
    put(sfx, (body + band(noise(n), 500, 8000) * np.exp(-t / 0.35) * 0.3).astype(np.float32), at, gain)
def key(at, gain=0.3):
    n = int(0.03 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.002) + band(noise(n), 1500, 7000) * np.exp(-t / 0.004) * 0.6
    put(sfx, x.astype(np.float32), at, gain, rng.uniform(-0.3, 0.3))
def glitch(at, gain=0.35):
    n = int(0.07 * SR); x = np.zeros(n, np.float32)
    for j in range(4):
        i = int(j * 0.017 * SR); m = min(n - i, int(0.012 * SR))
        x[i:i + m] += np.sign(np.sin(2 * np.pi * (900 + 600 * j) * np.arange(m) / SR)).astype(np.float32) * 0.5
    put(sfx, band(x, 400, 9000), at, gain)
def pop(at, gain=0.4):
    n = int(0.12 * SR); t = np.arange(n) / SR
    put(sfx, (np.sin(2 * np.pi * np.cumsum(400 + 900 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.04)).astype(np.float32), at, gain)
def tick(at, gain=0.12):
    n = int(0.01 * SR); t = np.arange(n) / SR
    put(sfx, (np.sin(2 * np.pi * 4200 * t) * np.exp(-t / 0.0015)).astype(np.float32), at, gain, 0.2)

# cold open: bar rises (glide), typing, send
n = int(0.45 * SR); t = np.arange(n) / SR
put(sfx, (np.sin(2 * np.pi * np.cumsum(180 + 900 * (t / 0.45) ** 2) / SR) * np.minimum(t / 0.05, 1) * np.exp(-np.maximum(t - 0.35, 0) / 0.05) * 0.5).astype(np.float32), 0.0, 0.25)
for i in range(8): key(fr(44 + i * 4))
pop(fr(76), 0.45)
whoosh(fr(104), 0.3, 0.12, 0.35)                     # bubble flies to centre
for f in (116, 150, 182): glitch(fr(f))              # hard type replacements (RGB split)
whoosh(fr(206), 0.25, 0.1, 0.5); hit(fr(207), 0.55)  # "?" flash
for f in range(236, 276, 8): pop(fr(f), 0.14)        # question bubbles
for c in (330, 450, 630, 750): whoosh(fr(c), 0.12, 0.12, 0.4, 0.3)  # chapter flash sweeps
for f, st in ((392, 4), (458, 3), (662, 4)): [tick(fr(f + i * st) + 0.03, 0.1) for i in range(6)]  # slice assembles
for i in range(8): tick(fr(590 + i * 2), 0.16)      # week checks
for j in range(18): tick(fr(656) + j * 0.034, 0.07) # price count-up
glitch(fr(698), 0.3); whoosh(fr(704), 0.15, 0.1, 0.3)  # price splits
whoosh(fr(760), 0.2, 0.35, 0.5)                      # fast pull-back
n = int(0.4 * SR); rv = band(noise(n), 800, 9000) * (np.linspace(0, 1, n) ** 4).astype(np.float32)
put(sfx, rv, fr(834) - 0.4, 0.35)                    # wall collapses into the pill (reverse swell)
hit(fr(834), 0.5)
n = int(0.8 * SR); t = np.arange(n) / SR             # bar pulse chime
put(sfx, (sum(np.sin(2 * np.pi * f * t) for f in (1568, 2349, 3136)) / 3 * np.exp(-t / 0.3)).astype(np.float32), fr(888), 0.22)

mix = music * pump[:, None] * 0.85 + sfx
fade = int(0.08 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = ROOT / "profesiia/out"; out.mkdir(parents=True, exist_ok=True)
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    x = mix / np.abs(mix).max() * 0.8
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, out / "profesiia-audio.wav", I=-14, TP=-1.0)
