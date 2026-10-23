"""Sound for "One fold": voice (George, offline) + a synthesized cue + SFX keyed to the picture.

    python3 onefold/audio.py  ->  onefold/out/voice.wav (-16 LUFS, -2 dBTP), onefold/out/mix.wav (-14 LUFS, -1 dBTP, 48 kHz)
                                  remotion/src/onefold/vo.json (subtitle cues)
0.0–0.5 silence; soft pad + hats under the hook and the cards; the beat lands on the whip-pan (6.5 s);
it drops out for the fold; a shimmer as the axis settles (13.5 s). Deterministic noise (seeded)."""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm, measure
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR, DUR = 48000, 15.0
N = int(SR * DUR)
rng = np.random.default_rng(15)
BEAT = 60 / 120
OUT = ROOT / "onefold/out"; OUT.mkdir(parents=True, exist_ok=True)

def put(dst, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N: return
    x = x[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * gain * l * 1.414; dst[i:i + len(x), 1] += x * gain * r * 1.414
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
def kick():
    n = int(0.4 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(46 + 85 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.2)).astype(np.float32)
def hat(o=False):
    n = int((0.14 if o else 0.045) * SR)
    return band(rng.standard_normal(n).astype(np.float32) * env(n, 0.0008, 0.06 if o else 0.012), 7000, 16000)
def clap():
    n = int(0.22 * SR); x = np.zeros(n, np.float32)
    for k, off in enumerate((0, 0.011, 0.021)):
        i = int(off * SR); x[i:] += rng.standard_normal(n - i).astype(np.float32) * env(n - i, 0.001, 0.016 if k < 2 else 0.08)
    return band(x, 900, 5000)
def pad(notes, length):
    n = int(length * SR); x = sum(saw(mtof(m), n) for m in notes) / len(notes)
    e = np.minimum(np.arange(n) / SR / 0.5, 1) * np.minimum((n - np.arange(n)) / SR / 0.4, 1)
    return band(x, 120, 1400) * e.astype(np.float32)
def pluck(m, length=0.35):
    n = int(length * SR); return band(saw(mtof(m), n, 0.002), 200, 3200) * env(n, 0.003, 0.09)
def bass(m, length):
    n = int(length * SR); t = np.arange(n) / SR
    return band(saw(mtof(m), n, 0.002) * 0.6 + np.sin(2 * np.pi * mtof(m) * t).astype(np.float32) * 0.6, 30, 400) * env(n, 0.004, length * 0.5)
def whoosh(peak, pre=0.35, post=0.15):
    n = int((pre + post) * SR); x = rng.standard_normal(n).astype(np.float32); t = np.arange(n) / SR
    e = np.where(t < pre, (t / pre) ** 3, np.exp(-(t - pre) / (post / 3))).astype(np.float32)
    k = np.clip(t / pre, 0, 1).astype(np.float32)
    return (band(x, 300, 2000) * (1 - k) + band(x, 2000, 11000) * k) * e, peak - pre
def hit():
    n = int(1.1 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(52 + 110 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.3)
    return (body + band(rng.standard_normal(n).astype(np.float32), 300, 6000) * np.exp(-t / 0.35) * 0.3).astype(np.float32)
def tick(f=3000, g=1.0):
    n = int(0.015 * SR); t = np.arange(n) / SR
    return (g * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.002)).astype(np.float32)
def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(500 + 900 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.035)).astype(np.float32)

# ------------------------------------------------------------------ music (A minor, 120 BPM)
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 64]]
ROOT_N = [45, 41, 48, 43]
music = np.zeros((N, 2), np.float32)
put(music, pad(CH[0], 3.0), 0.5, 0.5); put(music, pad(CH[1], 3.6), 3.0, 0.5)
for k in range(int((6.5 - 0.5) / (BEAT / 2))):                       # light off-beat hats + plucks before the drop
    t = 0.5 + k * BEAT / 2
    if k % 2: put(music, hat(), t, 0.18, 0.3)
    if k % 4 == 0: put(music, pluck(CH[(k // 8) % 2][k % 3 + 1] + 12), t, 0.16, -0.2)
for k in range(int((12.4 - 6.5) / BEAT)):                            # the beat: whip-pan to the fold
    t = 6.5 + k * BEAT; bar = (k // 4) % 4
    put(music, kick(), t, 0.9)
    if k % 2 == 1: put(music, clap(), t, 0.45, 0.05)
    put(music, hat(True), t + BEAT / 2, 0.24, -0.25)
    put(music, bass(ROOT_N[bar], BEAT * 0.45), t + BEAT / 2, 0.5)
    if k % 4 == 0: put(music, pad(CH[bar], BEAT * 4) * 0.5, t, 0.32)
put(music, pad(CH[0], 2.6), 12.4, 0.55)                               # breakdown under the logo
n = int(1.6 * SR); tt = np.arange(n) / SR
put(music, (sum(np.sin(2 * np.pi * f * tt) for f in (1760, 2217, 2637, 3520)) / 4 * np.exp(-tt / 0.6)).astype(np.float32), 13.5, 0.22)

# ------------------------------------------------------------------ SFX on the picture
sfx = np.zeros((N, 2), np.float32)
put(sfx, pop(), 0.10, 0.35, 0.3)                                      # "psst" bubble
for p, g in ((2.95, 0.35), (6.5, 0.6), (7.05, 0.25), (10.42, 0.18), (12.92, 0.3)):   # fill, whip, page, ink swell, axis
    x, a = whoosh(p); put(sfx, x, a, g)
for t in (3.2, 3.52, 3.84): x, a = whoosh(t + 0.25, 0.25, 0.08); put(sfx, x, a, 0.14, 0.4)   # cards ride in
put(sfx, tick(2400, 0.8), 8.9, 0.25); put(sfx, hit(), 10.12, 0.7)     # status swap, stamp
for t in (12.2, 12.45, 12.72): put(sfx, tick(1800, 1.0), t, 0.3)      # the fold

# ------------------------------------------------------------------ voice
lines = json.loads((ROOT / "onefold/voice/lines.json").read_text())
v = np.zeros(N, np.float32)
for l in lines:
    w = wave.open(str(ROOT / "onefold/voice" / l["file"])); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    x = np.interp(np.arange(int(len(x) * 2)) / 2, np.arange(len(x)), x).astype(np.float32)   # 24 k -> 48 k
    i = int(l["a"] * SR); v[i:i + len(x)] += x[: N - i]
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(v, -1, 1) * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, OUT / "voice.wav", I=-16, TP=-2.0, channels=1)
w = wave.open(str(OUT / "voice.wav")); vv = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
vv = np.pad(vv, (0, max(0, N - len(vv))))[:N]

# duck the music under the voice
duck = np.ones(N, np.float32)
for l in lines:
    a, b = int((l["a"] - 0.1) * SR), int((l["b"] + 0.15) * SR)
    duck[max(0, a):b] = 0.45
k = np.ones(int(0.12 * SR)) / int(0.12 * SR); duck = np.convolve(duck, k, "same").astype(np.float32)
bed = music * duck[:, None]
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    x = bed / max(1e-6, np.abs(bed).max()) * 0.7
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    il, _ = measure(tmp.name); bed = x * 10 ** ((-27 - il) / 20)          # bed sits ~11 LU under the voice
mix = bed + sfx * 0.5 + np.stack([vv, vv], 1)
mix[: int(0.5 * SR)] *= 0.0                                              # 0.0–0.5 s: silence, as briefed
mix[: int(0.5 * SR)] += sfx[: int(0.5 * SR)] * 0.5                       # (only the bubble pop)
fade = int(0.06 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    with wave.open(tmp.name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix / max(1, np.abs(mix).max()), -1, 1) * 32767).astype("<i2").tobytes())
    loudnorm(tmp.name, OUT / "mix.wav", I=-14, TP=-1.0)

# subtitle cues (white, from the voice timings); the two-part line is split at its full stop
cues = []
for l in lines:
    if l["text"] == "Three questions. Price by email.":
        mid = l["a"] + 1.05; cues += [[l["a"], mid, "Three questions."], [mid + 0.05, l["b"], "Price by email."]]
    elif l["text"] != "dockentra.ie":                    # the address is already on screen in the end card
        cues.append([l["a"], l["b"], l["text"]])
(ROOT / "remotion/src/onefold/vo.json").write_text(json.dumps([[round(a, 3), round(b, 3), t] for a, b, t in cues], indent=1))
print("voice", measure(OUT / "voice.wav"), "| mix", measure(OUT / "mix.wav"))
