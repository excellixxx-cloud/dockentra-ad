"""Synthesises the ad's background track (original, royalty-free by construction).

Calm pad + soft plucked arpeggio + sub bass in D major, 96 BPM, 30 s.
Chord changes are placed so the progression resolves to the tonic exactly
when the CTA scene starts (24 s).

    python3 video/gen_music.py            # -> video/out/music.wav (48 kHz stereo)
"""
import wave
from pathlib import Path

import numpy as np

SR = 48_000
DUR = 30.0
BPM = 96
EIGHTH = 60 / BPM / 2
N = int(SR * DUR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# (start, end, pad notes as MIDI, bass root MIDI)
D, B, G, E, A = 50, 47, 43, 52, 45
CHORDS = [
    (0.0, 5.0, [62, 66, 69, 73, 76], D - 12),   # Dmaj9
    (5.0, 10.0, [59, 62, 66, 69, 74], B - 12),  # Bm7(add11)
    (10.0, 15.0, [55, 59, 62, 66, 71], G - 12), # Gmaj7
    (15.0, 20.0, [55, 59, 62, 64, 67], E - 12), # Em7 (voiced)
    (20.0, 22.0, [57, 62, 64, 69, 74], A - 12), # Asus4
    (22.0, 24.0, [57, 61, 64, 69, 73], A - 12), # A
    (24.0, 30.0, [62, 66, 69, 73, 76], D - 12), # Dmaj9 — resolves on the CTA
]


def envelope(n, attack, release, sr=SR):
    env = np.ones(n)
    a, r = int(attack * sr), int(release * sr)
    env[:a] = np.linspace(0, 1, a) ** 2
    env[n - r:] *= np.linspace(1, 0, r) ** 2
    return env


def pad_voice(freq, n, detune_cents):
    t = np.arange(n) / SR
    f = freq * 2 ** (detune_cents / 1200)
    # sine with a touch of 2nd/3rd harmonic: warm, no buzz
    sig = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) + 0.06 * np.sin(6 * np.pi * f * t)
    # slow tremolo-free "breathing" via gentle amplitude drift
    sig *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6.28))
    return sig


out = np.zeros((N, 2))

# ---- pad (overlapping chords, 1.2 s attack / 1.4 s release) ----
for start, end, notes, _ in CHORDS:
    s = int(start * SR)
    e = min(N, int((end + 1.2) * SR))
    n = e - s
    env = envelope(n, 1.2 if start > 0 else 0.8, 1.4)
    for i, m in enumerate(notes):
        pan = 0.5 + (i - 2) * 0.12
        left = pad_voice(hz(m), n, -4) * env
        right = pad_voice(hz(m), n, +4) * env
        out[s:e, 0] += left * (1 - pan) * 0.055
        out[s:e, 1] += right * pan * 0.055

# ---- sub bass (pure sine, follows the root) ----
for start, end, _, root in CHORDS:
    s, e = int(start * SR), min(N, int((end + 0.6) * SR))
    n = e - s
    tt = np.arange(n) / SR
    sig = np.sin(2 * np.pi * hz(root) * tt) * envelope(n, 0.6, 0.6) * 0.09
    out[s:e] += sig[:, None]

# ---- plucked arpeggio: enters with the process scene, thins out for the CTA ----
ARP_START, ARP_END = 3.2, 26.5
pattern = [0, 2, 1, 3, 2, 4, 3, 1]
k = 0
tn = ARP_START
while tn < ARP_END:
    chord = next(c for c in CHORDS if c[0] <= tn < c[1])
    m = chord[2][pattern[k % len(pattern)]] + 12
    n = int(0.9 * SR)
    s = int(tn * SR)
    e = min(N, s + n)
    tt = np.arange(e - s) / SR
    f = hz(m)
    body = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 18)
    env = np.exp(-tt * 6.5) * np.minimum(1, tt / 0.004)
    vel = 0.75 + 0.25 * (k % 2 == 0)
    # the arp swells in over the first 2 s and fades out before the end card settles
    level = min(1.0, (tn - ARP_START) / 2.0) * min(1.0, max(0.0, (ARP_END - tn) / 2.5))
    sig = body * env * 0.05 * vel * level
    pan = 0.35 if k % 2 == 0 else 0.65
    out[s:e, 0] += sig * (1 - pan) * 2
    out[s:e, 1] += sig * pan * 2
    tn += EIGHTH
    k += 1

# ---- very soft scene-change "air" swell (filtered noise) ----
for cut in (3.2, 9.8, 14.2, 24.0):
    n = int(1.0 * SR)
    s = int((cut - 0.8) * SR)
    noise = rng.standard_normal((n, 2))
    # one-pole low-pass for a soft, breathy texture
    for ch in range(2):
        y, a = 0.0, 0.08
        col = noise[:, ch]
        filt = np.empty(n)
        for i in range(n):
            y += a * (col[i] - y)
            filt[i] = y
        noise[:, ch] = filt
    tt = np.linspace(0, 1, n)
    env = (tt ** 2) * np.exp(-((tt - 0.8) ** 2) * 30) * 3
    out[s:s + n] += noise * env[:, None] * 0.05

# ---- reverb: convolution with a decaying stereo noise tail ----
ir_len = int(2.2 * SR)
ti = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-ti * 3.2)[:, None]
ir[:, 0] /= np.sqrt((ir[:, 0] ** 2).sum())
ir[:, 1] /= np.sqrt((ir[:, 1] ** 2).sum())
L = N + ir_len
nfft = 1 << (L - 1).bit_length()
wet = np.stack([
    np.fft.irfft(np.fft.rfft(out[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N]
    for c in range(2)
], axis=1)
mix = out * 0.75 + wet * 0.45

# ---- master: fades, normalise to -3 dBFS peak (loudness is set at mux time) ----
fade_in, fade_out = int(0.4 * SR), int(2.5 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
mix[-fade_out:] *= (np.linspace(1, 0, fade_out) ** 1.5)[:, None]
mix /= np.abs(mix).max() / 10 ** (-3 / 20)

dst = Path(__file__).parent / "out" / "music.wav"
pcm = (mix * 32767).astype("<i2")
with wave.open(str(dst), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(dst)
