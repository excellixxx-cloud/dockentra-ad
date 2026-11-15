"""Soundtrack for «40 хвилин» (20 s): synthesized music + effects, the edge-tts voice lines, ducking, loudness.

    python3.13 sorok/audio.py
      -> sorok/out/music.wav, sfx.wav, voice-<variant>.wav, mix-<variant>.wav   (48 kHz stereo; mix at -14 LUFS, <= -1 dBTP)
Music, 80 BPM: a sparse music-box lullaby in A minor that thins out as the timer runs down (0–12 s); a reverse swell into
one warm low hit on the flash (12.0 s) and half a second of near-silence; the same motif in A major, fuller, with a soft
pulse (12.6 s on), resolving on a calm chord when the @motiv_atorex pill lands (18.75 s).
Effects are timed to the picture: frame f of the film is f/60 s. Deterministic (seeded noise)."""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm, measure

SR = 48000; DUR = 20.0; N = int(SR * DUR)
rng = np.random.default_rng(40)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
fr = lambda f: f / 60
def buf(): return np.zeros((N, 2), np.float32)
def put(dst, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or len(x) == 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * gain * l * 1.414; dst[i:i + len(x), 1] += x * gain * r * 1.414
def band(x, lo=0.0, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo > 0: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def reverb(x, secs=1.6, mix=0.3):
    n = int(secs * SR); out = np.zeros_like(x)
    for ch in range(2):
        ir = noise(n) * np.exp(-np.arange(n) / SR / (secs / 5)); ir = band(ir, 200, 5000)
        L = len(x) + n
        y = np.fft.irfft(np.fft.rfft(x[:, ch], L) * np.fft.rfft(ir, L), L)[: len(x)]
        out[:, ch] = y
    out *= np.abs(x).max() / max(np.abs(out).max(), 1e-9)
    return (x * (1 - mix * 0.3) + out * mix).astype(np.float32)

# ------------------------------------------------------------------ instruments
def box(m, length=1.6, bright=1.0):
    """muted music box: a few inharmonic partials, quick decay"""
    n = int(length * SR); t = np.arange(n) / SR; f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.35 * bright * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.16) + 0.14 * bright * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.06)
    x *= np.minimum(t / 0.004, 1)
    return x.astype(np.float32)
def felt(m, length=2.4):
    """felt piano: soft sine stack with a dull attack"""
    n = int(length * SR); t = np.arange(n) / SR; f = mtof(m)
    x = sum(np.sin(2 * np.pi * f * k * t) * a * np.exp(-t / (1.1 / k)) for k, a in ((1, 1.0), (2, 0.32), (3, 0.12), (4, 0.05)))
    return (x * np.minimum(t / 0.018, 1)).astype(np.float32)
def pad(notes, length, hi=900, att=1.2, rel=1.2):
    n = int(length * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.004, 0.003):
            x += np.sin(2 * np.pi * mtof(m) * (1 + d) * t + rng.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * mtof(m) * 2 * (1 + d) * t)
    e = np.minimum(t / att, 1) * np.minimum((length - t) / rel, 1)
    return band((x / len(notes)).astype(np.float32), 80, hi) * e.astype(np.float32)
def pulse(m, length=0.6):
    n = int(length * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * mtof(m) * t) * np.minimum(t / 0.03, 1) * np.exp(-t / 0.22)).astype(np.float32)

BEAT = 0.75; E8 = BEAT / 2
music = buf()
# --- 0–12 s, A minor: Am | F | Dm | E(sus) — the motif loses notes bar by bar
MINOR = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 57, 59]]
MOTIF_MIN = [(0, 76), (1, 72), (2, 69), (3, 72), (4, 76), (6, 74), (7, 72)]            # eighths in a bar (E5 C5 A4 C5 E5 – D5 C5)
KEEP = [7, 6, 4, 2]                                                                    # notes kept in bars 1..4
SHIFT_MIN = [0, -4, -7, -5]
for b in range(4):
    t0 = b * 4 * BEAT
    put(music, pad(MINOR[b], 4 * BEAT + 0.8, 800), t0, 0.5 * (1 - 0.18 * b))
    for k, (e, m) in enumerate(MOTIF_MIN[: KEEP[b]]):
        mm = m + (SHIFT_MIN[b] if b in (1, 2) else 0) + (-1 if b == 3 and m == 72 else 0)   # C → B over E
        put(music, box(mm), t0 + e * E8 + 0.01 * (k % 2), 0.34 * (1 - 0.12 * b), 0.25 * (-1) ** k)
    put(music, felt(MINOR[b][0] - 12, 3.0), t0, 0.22 * (1 - 0.15 * b))
# --- reverse swell into one warm low hit on the flash, then near-silence
n = int(0.9 * SR); t = np.arange(n) / SR
sw = (pad([57, 64, 69], 0.9, 2400, att=0.85, rel=0.02) * (t / 0.9) ** 2.5) + band(noise(n), 600, 5000) * ((t / 0.9) ** 4).astype(np.float32) * 0.25
put(music, sw.astype(np.float32), 12.0 - 0.9, 0.6)
n = int(1.2 * SR); t = np.arange(n) / SR
hit = np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.16) + 0.4 * np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.12)
put(music, hit.astype(np.float32), 12.0, 0.8)
# --- 12.6 s on, A major: A | D · E | A — fuller, warmer, a soft pulse on the beats
T1 = 12.6
MAJOR = [([57, 61, 64], 4), ([62, 66, 69], 2), ([64, 68, 71], 2)]
MOTIF_MAJ = [(0, 76), (1, 73), (2, 69), (3, 73), (4, 76), (6, 74), (7, 73)]            # the same shape with C♯
t0 = T1
for ci, (ch, beats) in enumerate(MAJOR):
    put(music, pad(ch + [ch[0] + 12], beats * BEAT + 1.0, 1700, att=0.5), t0, 0.5)
    put(music, felt(ch[0] - 12, 3.0), t0, 0.3)
    for k in range(beats): put(music, pulse(ch[0] - 12), t0 + k * BEAT, 0.22)
    t0 += beats * BEAT
for bar in range(2):
    for k, (e, m) in enumerate(MOTIF_MAJ):
        mm = m + ((2 if e < 4 else -1 if m != 76 else 0) if bar == 1 else 0)            # second bar follows D then E
        put(music, box(mm, bright=1.3), T1 + bar * 4 * BEAT + e * E8, 0.36, 0.25 * (-1) ** k)
        put(music, felt(mm - 12, 1.8), T1 + bar * 4 * BEAT + e * E8, 0.16, -0.2 * (-1) ** k)
END = fr(1126)                                                                          # the pill lands: calm A major, ringing out
put(music, pad([57, 61, 64, 69, 73], DUR - END + 0.2, 2000, att=0.25, rel=1.0), END, 0.55)
for k, m in enumerate((45, 57, 64, 69, 73, 76)): put(music, felt(m, 3.0), END + 0.03 * k, 0.26)
put(music, box(81, 2.2, 1.3), END + 0.22, 0.3)
music = reverb(music, 1.8, 0.32)
music[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
g = np.ones(N, np.float32); a, b = int(12.12 * SR), int(12.58 * SR); g[a:b] = 0.12; r_ = int(0.1 * SR)
g[a - r_:a] = np.linspace(1, 0.12, r_); g[b:b + r_] = np.linspace(0.12, 1, r_)          # near-silence after the hit
music *= g[:, None]

# ------------------------------------------------------------------ effects
sfx = buf()
def tick(at, gain, hi=False):
    n = int(0.05 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (2100 if hi else 1500) * t) * np.exp(-t / 0.004) + band(noise(n), 1500, 6000) * np.exp(-t / 0.006) * 0.4
    put(sfx, x.astype(np.float32), at, gain, 0.15 if hi else -0.15)
def drop(at, m, gain=0.3):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = mtof(m) * (1 + 0.5 * np.exp(-t / 0.05))
    put(sfx, (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(t / 0.005, 1) * np.exp(-t / 0.13)).astype(np.float32), at, gain)
def whoosh(peak, pre=0.22, post=0.25, gain=0.2, pan=0.0, up=False):
    n = int((pre + post) * SR); t = np.arange(n) / SR; x = noise(n)
    e = np.where(t < pre, (t / pre) ** 2, np.exp(-(t - pre) / (post / 3))).astype(np.float32)
    k = np.clip(t / (pre + post), 0, 1).astype(np.float32); k = k if up else 1 - k
    put(sfx, (band(x, 300, 1500) * (1 - k) + band(x, 1500, 7000) * k) * e, peak - pre, gain, pan)
# soft clock through the first half (two a second), then one clear tick per second in the "03:10" scene
t = 1.0
while t < 9.4: tick(t, 0.05 + 0.015 * (int(t * 2) % 2), hi=bool(int(t * 2) % 2)); t += 0.5
for f in (584, 644, 700): tick(fr(f), 0.2); tick(fr(f) + 0.5, 0.0)
# timer jumps: a short soft falling tone, lower every time; an icon whoosh on the first three
for f, m in ((208, 69), (262, 66), (332, 62), (390, 57)): drop(fr(f) + 0.04, m)
for k, f in enumerate((208, 262, 332)): whoosh(fr(f) + 0.2, gain=0.16, pan=(-0.3, 0.3, 0.0)[k])
# the ring refills: a rising sweep
n = int(1.7 * SR); t = np.arange(n) / SR
swp = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (t / 1.7 * 2.2)) / SR) * 0.5 + band(noise(n), 800, 6000) * 0.35
swp *= np.sin(np.pi * np.clip(t / 1.7, 0, 1)) ** 1.2
put(sfx, swp.astype(np.float32), fr(750), 0.2)
tick(fr(846), 0.12, hi=True)                                                            # the digits land on 40:00
# the laptop lights up, the card lands, the pill chimes
n = int(0.7 * SR); t = np.arange(n) / SR
put(sfx, (sum(np.sin(2 * np.pi * f * t) for f in (880, 1320)) / 2 * np.exp(-t / 0.2)).astype(np.float32), fr(854), 0.12)
n = int(1.0 * SR); t = np.arange(n) / SR
put(sfx, (np.sin(2 * np.pi * 82 * t) * np.minimum(t / 0.02, 1) * np.exp(-t / 0.3) + band(noise(n), 200, 1200) * np.exp(-t / 0.08) * 0.25).astype(np.float32), fr(946), 0.4)
whoosh(fr(946), pre=0.25, post=0.1, gain=0.1)
n = int(2.0 * SR); t = np.arange(n) / SR
ch = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((1760, 1.0), (2637, 0.5), (3520, 0.25))) * np.exp(-t / 0.5) * np.minimum(t / 0.004, 1)
put(sfx, (ch / 1.75).astype(np.float32), fr(1126), 0.22)
sfx = reverb(sfx, 1.0, 0.18)

# ------------------------------------------------------------------ voice, ducking, mix
def read(p):
    with wave.open(str(p)) as w: return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
def write(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
OUT = ROOT / "sorok/out"; OUT.mkdir(parents=True, exist_ok=True)
pk = max(np.abs(music).max(), 1e-9); music = music / pk * 0.7
sfx = sfx / max(np.abs(sfx).max(), 1e-9) * 0.5
write(OUT / "music.wav", music); write(OUT / "sfx.wav", sfx)
for variant in ("full", "calm"):
    lines = json.loads((ROOT / f"sorok/voice/{variant}/lines.json").read_text())
    voice = buf(); act = np.zeros(N, np.float32)
    for ln in lines:
        x = read(ROOT / f"sorok/voice/{variant}/{ln['i']:02d}.wav")
        x = x / max(np.sqrt((x ** 2).mean()), 1e-6) * 0.09 * 10 ** (ln["gain"] / 20)     # level every line on its own
        x = band(x, 90) + 0.35 * band(x, 2200, 6500)                                    # clean lows, a little presence for phone speakers
        put(voice, x, ln["start"])
        act[int((ln["start"] - 0.1) * SR): int((ln["end"] + 0.08) * SR)] = 1
    # duck the music by 10 dB under every line (60 ms down, 350 ms back up)
    env = np.zeros(N, np.float32); v = 0.0
    up_, dn_ = 1 / (0.06 * SR), 1 / (0.35 * SR)
    for i in range(N):
        v = min(1.0, v + up_) if act[i] else max(0.0, v - dn_); env[i] = v
    duck = 10 ** (-10 * env / 20)
    voice = np.tanh(voice * 2.2) / 2.2 * 1.9
    mix = music * duck[:, None] * 0.75 + sfx * (10 ** (-3 * env / 20))[:, None] * 0.6 + voice
    mix[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
    write(OUT / f"voice-{variant}.wav", voice)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        write(tmp.name, mix / max(np.abs(mix).max(), 1e-9) * 0.8)
        loudnorm(tmp.name, OUT / f"mix-{variant}.wav", I=-14, TP=-1.0)
    vi, vt = measure(OUT / f"voice-{variant}.wav")
    print(f"voice-{variant}: {vi:.1f} LUFS; lines:", ", ".join(f"{l['start']:.2f}–{l['end']:.2f}" for l in lines))
