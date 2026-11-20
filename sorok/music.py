"""Studio soundtrack for «40 хвилин» (20 s, no voice): music + effects, mastered.

    python3.13 sorok/music.py  ->  sorok/out/music.wav, sorok/out/sfx.wav, sorok/out/mix.wav
                                    (48 kHz stereo; mix at -14 LUFS integrated, true peak <= -1 dBTP)

Music, 80 BPM (beat 0.75 s, bar 3 s):
  0–12 s     A minor lullaby: felt piano + music box over a warm pad. Am(add9) | Fmaj7 | Dm9 | Esus4→E.
             The melody loses notes bar by bar as the timer runs down; bar 4 is almost bare.
  11.1–12 s  a reversed, reverb-soaked piano chord swells into one warm low hit on the violet flash (12.0 s),
             then near-silence while the ring starts to refill.
  12.77 s →  the same melody in A major, fuller: A | E/G♯ | F♯m7 | Dmaj9 Esus4, a gentle eighth-note piano pulse,
             strings from the card (15.77 s); resolves on A(add9) exactly when the @motiv_atorex pill lands (18.77 s)
             and rings out.
Instruments are additive models: piano with three detuned strings per note, inharmonic partials, two-stage decay
and a hammer thump; a tine music box; saw pads and strings with a cutoff that moves over time. Stereo convolution
reverb with frequency-dependent decay; master bus: low cut, gentle glue compression, light tape saturation.
Effects are tuned to the key and timed to the picture (frame f of the film is f/60 s). Deterministic."""
import sys, tempfile, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from loud import loudnorm, measure

SR = 48000; DUR = 20.0; N = int(SR * DUR)
rng = np.random.default_rng(4000)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)
fr = lambda f: f / 60
BEAT = 0.75; E8 = BEAT / 2; BAR = 4 * BEAT
T_MAJ = 12.77                                   # major section downbeat; +3 s = card lands, +6 s = pill lands
T_PILL = T_MAJ + 2 * BAR                        # 18.77 s = frame 1126

def tt(n): return np.arange(n) / SR
def stereo(): return np.zeros((N, 2), np.float32)
def put(dst, x, at, gain=1.0, pan=0.0):
    """mono (n,) or stereo (n,2) into dst at time `at`, equal-power pan for mono"""
    i = int(round(at * SR))
    if i >= N or len(x) == 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: N - i]
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        dst[i:i + len(x), 0] += x * gain * l * 1.414
        dst[i:i + len(x), 1] += x * gain * r * 1.414
    else:
        dst[i:i + len(x)] += x * gain
def band(x, lo=0.0, hi=None, order=2):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo > 0: m *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: m *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if x.ndim == 2: m = m[:, None]
    return np.fft.irfft(X * m, len(x), axis=0).astype(np.float32)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def pan_of(m): return float(np.clip((m - 64) / 30, -0.6, 0.6))      # low notes left, high right, like a piano seen from the bench

# ------------------------------------------------------------------ instruments
def piano(m, vel=0.5, length=4.0, felt=0.6):
    """additive piano: inharmonic partials, three detuned strings, two-stage decay, hammer thump.
    felt 0..1 darkens the tone (felt piano)."""
    f0 = mtof(m); n = int(length * SR); t = tt(n)
    out = np.zeros(n)
    B = 0.00012 * (f0 / 261.6) ** 0.5
    bright = (0.25 + 0.75 * vel) * (1 - 0.55 * felt)
    tau_long = 4.2 * (130.0 / f0) ** 0.45
    for k in range(1, 28):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 14000: break
        amp = k ** -1.15 * np.exp(-(k - 1) * (1.15 - bright) * 0.55)
        if amp < 0.003: break
        if k in (7, 14): amp *= 0.3                                   # hammer strike point suppresses ~7th partial
        tl = tau_long / (1 + 0.28 * (k - 1)); ts = tl * 0.16
        env = 0.62 * np.exp(-t / ts) + 0.38 * np.exp(-t / tl)
        for d in (-0.00055, 0.0, 0.0006):                            # three strings, ~1 cent apart: slow beating
            out += amp * env * np.sin(2 * np.pi * fk * (1 + d) * t + rng.uniform(0, 2 * np.pi)) / 3
    nh = int(0.04 * SR)
    hammer = band(noise(nh), max(60, f0 * 0.7), min(6000, f0 * 9)) * np.exp(-tt(nh) / 0.007)
    out[:nh] += hammer * 0.12 * vel * (1 - 0.5 * felt)
    out[:int(0.15 * SR)] += np.sin(2 * np.pi * min(f0, 110) * tt(int(0.15 * SR))) * np.exp(-tt(int(0.15 * SR)) / 0.03) * 0.05 * vel   # soundboard knock
    out *= np.minimum(t / 0.0025, 1)
    out = band(out.astype(np.float32), 35, 1800 + 7000 * (1 - felt) + 2500 * vel)
    rel = int(0.08 * SR); out[-rel:] *= np.linspace(1, 0, rel)
    return out * vel
def mbox(m, vel=0.5, length=2.6):
    """music-box tine: strong fundamental, inharmonic upper partials, a tiny pluck click; slightly muted"""
    f = mtof(m); n = int(length * SR); t = tt(n); x = np.zeros(n)
    for ratio, a, tau in ((1.0, 1.0, 1.6), (2.0, 0.05, 0.6), (3.0, 0.03, 0.3), (5.404, 0.16, 0.16), (8.93, 0.06, 0.06)):
        if f * ratio < 16000:
            x += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * ratio * t * (1 + 0.0004 * np.sin(2 * np.pi * 5 * t)))
    x[: int(0.004 * SR)] += noise(int(0.004 * SR)) * 0.08
    x *= np.minimum(t / 0.0015, 1)
    return band(x.astype(np.float32), 200, 7500) * vel
def sawpad(notes, length, cut0, cut1, att, rel, detune=0.006, oct_up=False, vib=0.0):
    """stereo additive saw pad; the low-pass cutoff glides from cut0 to cut1 Hz over the note"""
    n = int(length * SR); t = tt(n)
    cut = cut0 * (cut1 / cut0) ** (t / length)
    out = np.zeros((n, 2))
    for m in notes:
        f0 = mtof(m + (12 if oct_up else 0))
        for ch, ds in enumerate(((-detune, detune * 0.4), (detune * 0.7, -detune * 0.9))):
            for d in ds:
                ph = rng.uniform(0, 2 * np.pi, 40)
                fm = 1 + d + vib * 0.003 * np.sin(2 * np.pi * 5.2 * t + ph[0])
                for k in range(1, 40):
                    fk = k * f0
                    if fk > max(cut1, cut0) * 2.5 or fk > 12000: break
                    a = (1 / k) / np.sqrt(1 + (fk / cut) ** 4)
                    out[:, ch] += a * np.sin(2 * np.pi * fk * np.cumsum(fm) / SR + ph[k])
    e = np.minimum(t / att, 1) ** 1.5 * np.clip((length - t) / rel, 0, 1)
    out *= e[:, None] / (len(notes) * 2)
    return out.astype(np.float32)
def sub(m, length, att=0.08, rel=0.6):
    n = int(length * SR); t = tt(n)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.12 * np.sin(4 * np.pi * mtof(m) * t)
    return (x * np.minimum(t / att, 1) * np.clip((length - t) / rel, 0, 1)).astype(np.float32)

# ------------------------------------------------------------------ space
def make_ir(rt60=2.4, pre=0.02):
    n = int((rt60 + pre) * SR); t = tt(n); ir = np.zeros((n, 2), np.float32)
    p = int(pre * SR)
    for ch in range(2):
        x = noise(n - p)
        lo, mid, hi = band(x, 0, 500), band(x, 500, 4000), band(x, 4000, None)
        tl = tt(n - p)
        tail = lo * np.exp(-tl / (rt60 * 1.15 / 6.91)) + mid * np.exp(-tl / (rt60 / 6.91)) + hi * np.exp(-tl / (rt60 * 0.45 / 6.91))
        tail *= np.minimum(tl / 0.03, 1)                              # diffuse build-up
        ir[p:, ch] = tail
        for d, g in ((0.007, 0.5), (0.013, 0.35), (0.021, 0.28), (0.034, 0.2), (0.047, 0.14)):   # early reflections
            ir[p + int((d + 0.0013 * ch) * SR), ch] += g * (1 if ch else -1) * 6
    ir /= np.sqrt((ir ** 2).sum(0).mean())
    return ir
IR_HALL = make_ir(2.6, 0.022); IR_ROOM = make_ir(1.1, 0.01)
def verb(x, ir, wet, dry=1.0):
    L = len(x) + len(ir); y = np.zeros_like(x)
    for ch in range(2):
        y[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], L) * np.fft.rfft(ir[:, ch], L), L)[: len(x)]
    y = band(y, 180, 9000)
    y *= np.sqrt((x ** 2).mean() / max((y ** 2).mean(), 1e-12))
    return (dry * x + wet * y).astype(np.float32)

# ================================================================== the score
pno, box, pads, strings, low = stereo(), stereo(), stereo(), stereo(), stereo()
def P(m, at, vel, length=4.0, felt=0.6): put(pno, piano(m, vel, length, felt), at, 1.0, pan_of(m))
def MB(m, at, vel, length=2.6): put(box, mbox(m, vel, length), at, 1.0, 0.35 * np.sin(m * 1.7))

# ---- 0–12 s, A minor -----------------------------------------------------------------------------
MINOR = [  # (bass, voicing, pad notes, melody [(eighth, midi)], piano broken-chord pattern [(eighth, midi)])
    (45, [57, 60, 64, 71], [57, 60, 64, 71], [(0, 76), (1, 74), (2, 72), (4, 71), (5, 72), (6, 69)], [(2, 64), (3, 71), (5, 60)]),
    (41, [57, 60, 64, 65], [53, 57, 60, 64], [(0, 72), (1, 71), (2, 69), (4, 67), (6, 69)], [(2, 64), (5, 60)]),
    (38, [53, 57, 60, 64], [50, 57, 60, 65], [(0, 74), (2, 72), (4, 69)], [(3, 64)]),
    (40, [52, 57, 59, 64], [52, 57, 59, 64], [(0, 71), (5, 68)], []),
]
for b, (bass, voicing, padn, mel, brk) in enumerate(MINOR):
    t0 = b * BAR
    thin = 1 - 0.17 * b
    P(bass, t0, 0.42 * thin, 5.0, 0.7); P(bass + 12, t0 + 0.012, 0.28 * thin, 5.0, 0.7)
    if b < 3:
        for e, m in brk: P(m, t0 + e * E8, 0.2 * thin, 3.0, 0.75)
    for k, (e, m) in enumerate(mel):
        MB(m, t0 + e * E8 + 0.006 * (k % 2), (0.5 if e == 0 else 0.4) * thin)
        if b < 2: P(m - 12, t0 + e * E8, 0.14 * thin, 2.4, 0.85)       # piano doubles the tune an octave down, very softly
    cut = (1400, 1150, 900, 700)[b]
    put(pads, sawpad(padn, BAR + 1.2, cut * 0.7, cut, 0.9, 1.1), t0 - 0.05, 0.3 * thin)
put(low, sub(33, 6.2, 0.6, 1.0), 0.0, 0.22)
put(low, sub(28, 6.5, 0.6, 1.4), 6.0, 0.2)
# bar 4 turns E major at the end (G♯ in the box) — the question hangs on the dominant
P(56, 3 * BAR + 5 * E8, 0.16, 2.0, 0.8)

# ---- 11.1–12.0 s: reverse swell, 12.0 s low hit, near-silence -------------------------------------
chord = stereo()
for k, m in enumerate((45, 52, 57, 60, 64, 69, 71)):
    put(chord, piano(m, 0.5, 3.0, 0.4), 1.0 + 0.004 * k, 1.0, pan_of(m))
seg = verb(chord[: int(4.5 * SR)], IR_HALL, 1.6, 0.4)[int(1.0 * SR): int(4.2 * SR)]
rev = seg[::-1].copy()
L_SW = int(0.95 * SR); rev = rev[-L_SW:]
rev *= (np.linspace(0, 1, L_SW) ** 2.2)[:, None]
rev[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))[:, None]
SWELL = stereo(); put(SWELL, rev, 12.0 - 0.95, 1.0)
HIT = stereo()
for m, v in ((33, 0.7), (45, 0.55), (52, 0.4), (57, 0.32), (61, 0.22)): put(HIT, piano(m, v, 3.2, 0.75), 12.0, 1.0, pan_of(m) * 0.5)
n = int(1.6 * SR); t = tt(n)
boom = np.sin(2 * np.pi * np.cumsum(55 * (1 + 0.6 * np.exp(-t / 0.035))) / SR) * np.exp(-t / 0.45) * np.minimum(t / 0.004, 1)
put(HIT, boom.astype(np.float32), 12.0, 0.55)
put(HIT, band(noise(int(0.12 * SR)), 60, 400) * np.exp(-tt(int(0.12 * SR)) / 0.03), 12.0, 0.25)

# ---- 12.77 s →, A major -----------------------------------------------------------------------------
# beats from T_MAJ: (beat, length in beats, bass, pad notes, pulse chord tones)
MAJOR = [
    (0, 2, 45, [57, 61, 64, 69], [57, 64, 61, 64]),
    (2, 2, 44, [56, 59, 64, 68], [56, 64, 59, 64]),
    (4, 2, 42, [54, 57, 61, 64], [54, 61, 57, 64]),
    (6, 1, 38, [57, 62, 64, 66], [57, 66]),
    (7, 1, 40, [57, 62, 64, 69], [57, 64]),
]
MEL_MAJ = [(-0.5, 73), (0, 76), (1, 74), (2, 73), (4, 71), (5, 73), (6, 76), (7, 78),          # bar 1 (pickup on the 16th before)
           (8, 76), (9, 73), (10, 69), (11, 73), (12, 78), (13, 76), (14, 71), (15, 73)]       # bar 2, eighths
for beat, nb, bass, padn, pulse in MAJOR:
    t0 = T_MAJ + beat * BEAT; ln = nb * BEAT
    P(bass, t0, 0.45, 4.0, 0.6); P(bass + 12, t0 + 0.01, 0.26, 4.0, 0.6)
    put(low, sub(bass - 12, ln + 0.25, 0.04, 0.2), t0, 0.26)
    put(pads, sawpad(padn, ln + 1.0, 1500, 2600, 0.25, 0.9), t0 - 0.04, 0.3)
    for k in range(nb * 2):                                                  # the gentle pulse: soft repeated eighths
        m = pulse[k % len(pulse)] + 12
        P(m, t0 + k * E8 + 0.004 * (k % 2), 0.16 + 0.05 * (k % 2 == 0), 1.6, 0.8)
for k, (e, m) in enumerate(MEL_MAJ):
    at = T_MAJ + e * E8 + (0.1875 - E8 if e < 0 else 0)
    MB(m, at, 0.55 if e in (0, 8, 12) else 0.42)
    P(m - 12, at, 0.2, 2.6, 0.55)
    if e >= 8: P(m, at + 0.004, 0.12, 2.0, 0.7)                             # second bar: the piano joins the tune
# strings enter with the card and swell into the resolution
put(strings, sawpad([69, 73, 76], BAR + 0.4, 900, 3200, 1.6, 0.4, 0.004, True, vib=1.0), T_MAJ + BAR - 0.2, 0.2)
# ---- 18.77 s: the pill lands — A(add9), rolled, ringing out --------------------------------------------
for k, m in enumerate((33, 45, 52, 57, 61, 64, 71, 73)):
    P(m, T_PILL + 0.028 * k, 0.5 - 0.03 * k, 3.0, 0.55)
put(low, sub(33, DUR - T_PILL + 0.2, 0.05, 1.0), T_PILL, 0.3)
put(pads, sawpad([57, 61, 64, 69, 71], DUR - T_PILL + 0.3, 1800, 3400, 0.3, 1.2), T_PILL - 0.03, 0.34)
put(strings, sawpad([69, 73, 76, 81], DUR - T_PILL + 0.3, 2600, 3600, 0.3, 1.2, 0.004, True, vib=1.0), T_PILL, 0.2)
MB(81, T_PILL + 0.24, 0.5, 2.0); MB(88, T_PILL + 0.62, 0.32, 1.6)

# ------------------------------------------------------------------ mix the music
def gain_curve(points):
    """piecewise-linear gain over time from [(t, g), ...]"""
    ts, gs = zip(*points); return np.interp(tt(N), ts, gs).astype(np.float32)[:, None]
music = (verb(pno, IR_HALL, 0.42) * 0.9 + verb(box, IR_HALL, 0.6) * 0.62 + verb(pads, IR_HALL, 0.35) * 0.55
         + verb(strings, IR_HALL, 0.5) * 0.5 + low * 0.8)
# thin out with the timer, near-silence after the hit, back for the turn
music *= gain_curve([(0, 1), (8.6, 0.9), (9.5, 0.62), (11.0, 0.55), (11.95, 0.6), (12.0, 1), (12.13, 1), (12.4, 0.16), (12.7, 0.16), (12.77, 1), (20, 1)])
music += verb(SWELL, IR_ROOM, 0.2) * 0.55 + verb(HIT, IR_HALL, 0.45) * 0.85 * gain_curve([(0, 1), (12.18, 1), (12.42, 0.18), (12.77, 0.12), (13.6, 0.0), (20, 0.0)])
music = band(music, 28, None)

# ------------------------------------------------------------------ effects (tuned to the key, under the music)
sfx = stereo()
def tick(at, gain, hi=False):
    n = int(0.05 * SR); t = tt(n)
    x = np.sin(2 * np.pi * (1500 if hi else 1150) * t) * np.exp(-t / 0.004) + band(noise(n), 1200, 4500) * np.exp(-t / 0.004) * 0.25
    x *= np.minimum(t / 0.0006, 1)
    put(sfx, band(x.astype(np.float32), 0, 5000), at, gain, 0.2 if hi else -0.2)
def drop(at, m, gain):
    n = int(0.7 * SR); t = tt(n)
    f = mtof(m) * (1 + 0.25 * np.exp(-t / 0.04))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + 0.25 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * np.exp(-t / 0.08)
    put(sfx, (x * np.minimum(t / 0.004, 1)).astype(np.float32), at, gain)
def whoosh(peak, pre=0.24, post=0.26, gain=0.2, pan=0.0, rising=False):
    n = int((pre + post) * SR); t = tt(n); x = noise(n)
    e = np.where(t < pre, (t / pre) ** 2, np.exp(-(t - pre) / (post / 3))).astype(np.float32)
    k = np.clip(t / (pre + post), 0, 1).astype(np.float32); k = k if rising else 1 - k
    put(sfx, band((band(x, 500, 1800) * (1 - k) + band(x, 1800, 7000) * k) * e, 300, None, 4), peak - pre, gain, pan)
t = 1.0
while t < 9.4: tick(t, (0.025 if int(t * 2) % 2 else 0.035) * (1 - 0.3 * t / 9.4), hi=bool(int(t * 2) % 2)); t += 0.5      # soft clock, half seconds
for f in (584, 644, 700): tick(fr(f), 0.1)                                                      # one tick a second at 03:10
for f, m in ((208, 69), (262, 64), (332, 60), (390, 57)): drop(fr(f) + 0.03, m + 12, 0.2)       # timer jumps: A E C A
for k, f in enumerate((208, 262, 332)): whoosh(fr(f) + 0.22, gain=0.14, pan=(-0.35, 0.35, 0.0)[k])
n = int(1.65 * SR); t = tt(n)                                                                   # the ring refills: rising sweep
sw = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.0 * t / 1.65)) / SR) * 0.4 + band(noise(n), 900, 4500) * 0.18
sw *= np.sin(np.pi * np.clip(t / 1.65, 0, 1)) ** 1.4
put(sfx, sw.astype(np.float32), fr(750), 0.12)
tick(fr(846), 0.12, hi=True)                                                                    # digits land on 40:00
n = int(1.0 * SR); t = tt(n)                                                                    # laptop lights up
put(sfx, ((np.sin(2 * np.pi * 1318.5 * t) + 0.6 * np.sin(2 * np.pi * 1760 * t)) / 1.6 * np.exp(-t / 0.3) * np.minimum(t / 0.003, 1)).astype(np.float32), fr(854), 0.07, 0.2)
n = int(1.2 * SR); t = tt(n)                                                                    # the card lands: soft low tone
put(sfx, (np.sin(2 * np.pi * 110 * t) * np.minimum(t / 0.015, 1) * np.exp(-t / 0.35) + band(noise(n), 150, 900) * np.exp(-t / 0.06) * 0.2).astype(np.float32), fr(946), 0.3)
whoosh(fr(946), pre=0.3, post=0.1, gain=0.08)
n = int(2.4 * SR); t = tt(n)                                                                    # the pill: a clean chime in A
ch = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in ((1760, 1.0, 0.9), (2637, 0.45, 0.6), (3520, 0.2, 0.35), (5274, 0.08, 0.15)))
put(sfx, (ch / 1.7 * np.minimum(t / 0.003, 1)).astype(np.float32), fr(1126), 0.14, 0.1)
sfx = verb(sfx, IR_ROOM, 0.35)

# ------------------------------------------------------------------ master
def glue(x, thr_db=-20, ratio=2.0, att=0.015, rel=0.25):
    """gentle RMS bus compressor"""
    p = (x ** 2).mean(1)
    w = int(0.03 * SR); rms = np.sqrt(np.convolve(p, np.ones(w) / w, "same") + 1e-12)
    lvl = 20 * np.log10(rms); over = np.maximum(lvl - thr_db, 0)
    gr = -over * (1 - 1 / ratio)
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); g = np.zeros_like(gr); v = 0.0
    for i in range(0, len(gr), 64):                                             # smoothed in 64-sample steps
        tgt = gr[i]; c = a if tgt < v else r; v = tgt + (v - tgt) * c ** 64; g[i:i + 64] = v
    return (x * (10 ** (g / 20))[:, None]).astype(np.float32)
def write(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
music = music / np.abs(music).max() * 0.7
sfx = sfx / np.abs(sfx).max() * 0.5
mix = music + sfx * 0.55
mix = glue(mix / np.abs(mix).max() * 0.8)
mix = np.tanh(mix * 1.15) / np.tanh(1.15)                                     # light tape saturation
air = band(mix, 9000, None); mix = mix + 0.12 * air                            # a touch of air
fade_in = int(0.01 * SR); mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade = int(0.35 * SR); mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]
OUT = ROOT / "sorok/out"; OUT.mkdir(parents=True, exist_ok=True)
write(OUT / "music.wav", music); write(OUT / "sfx.wav", sfx)
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    write(tmp.name, mix / np.abs(mix).max() * 0.85)
    loudnorm(tmp.name, OUT / "mix.wav", I=-14, TP=-1.0)
