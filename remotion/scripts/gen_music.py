"""Original background tracks + sound accents for the Remotion compositions.

Pure synthesis, no samples or recordings: soft pad, plucked arpeggio and sub
bass at 96 BPM, plus quiet accents locked to each composition's animation.
Output is loudness-normalised to -17 LUFS (true peak -1.5 dBTP).

    python3 scripts/gen_music.py creator       # -> public/music-creator.wav
    python3 scripts/gen_music.py three-ways    # -> public/music-three-ways.wav
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 48_000
BPM = 96
EIGHTH = 60 / BPM / 2


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


DMAJ9 = [62, 66, 69, 73, 76]
BM7 = [59, 62, 66, 69, 74]
GMAJ7 = [55, 59, 62, 66, 71]
EM7 = [55, 59, 62, 64, 67]
ASUS = [57, 62, 64, 69, 74]
A = [57, 61, 64, 69, 73]


class Track:
    def __init__(self, dur, seed):
        self.dur = dur
        self.n = int(SR * dur)
        self.rng = np.random.default_rng(seed)
        self.music = np.zeros((self.n, 2))
        self.fx = np.zeros((self.n, 2))

    # ---------------- sound sources ----------------
    def env(self, n, a, r):
        e = np.ones(n)
        ai, ri = int(a * SR), int(r * SR)
        e[:ai] = np.linspace(0, 1, ai) ** 2
        e[n - ri:] *= np.linspace(1, 0, ri) ** 2
        return e

    def pad_voice(self, f, n, cents):
        t = np.arange(n) / SR
        f = f * 2 ** (cents / 1200)
        s = np.sin(2 * np.pi * f * t) + .18 * np.sin(4 * np.pi * f * t) + .05 * np.sin(6 * np.pi * f * t)
        return s * (.85 + .15 * np.sin(2 * np.pi * .13 * t + self.rng.uniform(0, 6.3)))

    def blip(self, freq, dur=.18, decay=28, bend=0.0):
        t = np.arange(int(dur * SR)) / SR
        f = freq * (1 + bend * np.exp(-t * 30))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay) * np.minimum(1, t / .002)

    def thump(self, freq=90, dur=.25, decay=18):
        t = np.arange(int(dur * SR)) / SR
        f = freq * (1 + 1.5 * np.exp(-t * 40))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay)

    def click(self, dur=.03):
        n = int(dur * SR)
        t = np.arange(n) / SR
        return np.diff(np.concatenate([[0], self.rng.standard_normal(n)])) * np.exp(-t * 180) * .5

    def swish(self, dur=.35, bright=.25):
        """Paper / air movement: low-passed noise with a rise-and-fall envelope."""
        n = int(dur * SR)
        noise = self.rng.standard_normal(n)
        y, out = 0.0, np.empty(n)
        for i in range(n):
            y += bright * (noise[i] - y)
            out[i] = y
        t = np.linspace(0, 1, n)
        return out * np.sin(np.pi * t) ** 2 * 2.2

    # ---------------- arrangement ----------------
    def chords(self, chords):
        self._chords = chords
        for start, end, notes, bass in chords:
            s = int(start * SR)
            e = min(self.n, int((end + 1.1) * SR))
            n = e - s
            ev = self.env(n, .9 if start else .5, 1.2)
            for i, m in enumerate(notes):
                pan = .5 + (i - 2) * .12
                self.music[s:e, 0] += self.pad_voice(hz(m), n, -4) * ev * (1 - pan) * .05
                self.music[s:e, 1] += self.pad_voice(hz(m), n, 4) * ev * pan * .05
            tb = np.arange(n) / SR
            self.music[s:e] += (np.sin(2 * np.pi * hz(bass) * tb) * self.env(n, .5, .6) * .085)[:, None]

    def arpeggio(self, start, end):
        pattern = [0, 2, 1, 3, 2, 4, 3, 1]
        k, tn = 0, start
        while tn < end:
            notes = next(c[2] for c in self._chords if c[0] <= tn < c[1])
            m = notes[pattern[k % 8]] + 12
            s = int(tn * SR)
            e = min(self.n, s + int(.8 * SR))
            tt = np.arange(e - s) / SR
            f = hz(m)
            body = np.sin(2 * np.pi * f * tt) + .25 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 18)
            lvl = min(1, (tn - start) / 1.5) * min(1, max(0, (end - tn) / 1.5)) * (.75 + .25 * (k % 2 == 0))
            sig = body * np.exp(-tt * 7) * np.minimum(1, tt / .004) * .045 * lvl
            pan = .35 if k % 2 == 0 else .65
            self.music[s:e, 0] += sig * (1 - pan) * 2
            self.music[s:e, 1] += sig * pan * 2
            tn += EIGHTH
            k += 1

    def add(self, at, *parts, pan=.5, gain=1.0):
        """Mix (signal, level) parts of any lengths in at `at` seconds."""
        sig = np.zeros(max(len(p) for p, _ in parts))
        for p, lvl in parts:
            sig[:len(p)] += p * lvl
        s = int(at * SR)
        e = min(self.n, s + len(sig))
        self.fx[s:e, 0] += sig[:e - s] * (1 - pan) * 2 * gain
        self.fx[s:e, 1] += sig[:e - s] * pan * 2 * gain

    def duck(self, a, b, depth, edge=.15):
        tt = np.arange(self.n) / SR
        d = 1 - depth * np.clip(np.minimum((tt - (a - edge)) / edge, (b + edge - tt) / edge), 0, 1)
        self.music *= d[:, None]

    def cut_duck(self, a, b, depth):
        """Music sinks over [a, b] and returns instantly at b (a drop)."""
        tt = np.arange(self.n) / SR
        d = 1 - depth * np.clip((tt - a) / (b - a), 0, 1) * (tt < b)
        self.music *= d[:, None]

    def render(self, dst):
        mix = self.music + self.fx
        ir_len = int(2.0 * SR)
        ti = np.arange(ir_len) / SR
        ir = self.rng.standard_normal((ir_len, 2)) * np.exp(-ti * 3.4)[:, None]
        ir /= np.sqrt((ir ** 2).sum(axis=0))
        nfft = 1 << (self.n + ir_len - 1).bit_length()
        wet = np.stack([np.fft.irfft(np.fft.rfft(mix[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:self.n] for c in range(2)], axis=1)
        out = mix * .78 + wet * .4
        fi, fo = int(.3 * SR), int(1.2 * SR)
        out[:fi] *= np.linspace(0, 1, fi)[:, None]
        out[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]
        out /= np.abs(out).max() / 10 ** (-3 / 20)
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            with wave.open(tmp.name, "wb") as w:
                w.setnchannels(2)
                w.setsampwidth(2)
                w.setframerate(SR)
                w.writeframes((out * 32767).astype("<i2").tobytes())
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-y", "-i", tmp.name,
                            "-af", "loudnorm=I=-17:TP=-1.5:LRA=11", "-ar", str(SR), str(dst)], check=True)
        print(dst)


def three_ways():
    """"Same order, three ways" (36 s)."""
    tr = Track(36.0, 11)
    tr.chords([(0.0, 4.0, DMAJ9, 38), (4.0, 8.0, BM7, 35), (8.0, 12.0, GMAJ7, 31), (12.0, 16.0, EM7, 28),
               (16.0, 20.0, ASUS, 33), (20.0, 24.0, GMAJ7, 31), (24.0, 27.0, A, 33), (27.0, 30.0, BM7, 35),
               (30.0, 33.0, ASUS, 33), (33.0, 36.0, DMAJ9, 38)])
    tr.arpeggio(4.0, 33.0)
    for i, at in enumerate([2.15, 2.27, 2.39]):          # icons land at 2.70 / 2.82 / 2.94
        tr.add(at + .55, (tr.thump(110 - i * 8, .2, 22), .5), (tr.blip(880 + i * 110, .12, 40), .25), pan=.3 + i * .2, gain=.9)
    tr.add(4.0, (tr.blip(660, .25, 16), .35))
    tr.add(12.0, (tr.blip(740, .5, 7, bend=.35), .3))     # springy
    tr.add(20.0, (tr.click(), .9))                          # the hard cut
    tr.add(20.24, (tr.thump(70, .3, 14), .8), (tr.click(), .5))
    for at in (6.1, 9.4, 10.7):                             # polybag presses
        tr.add(at + .1, (tr.thump(140, .22, 20), .35), gain=.9)
    tr.add(18.25, (tr.thump(95, .3, 15), .6))
    tr.add(18.47, (tr.thump(120, .15, 25), .2))
    tr.add(21.45, (tr.click(.04), 1.2), (tr.blip(1320, .06, 90), .25))
    for at, pan in ((29.9, .3), (31.9, .7)):
        tr.add(at, (tr.blip(990, .1, 45), .25), pan=pan)
    for at, pan in ((30.0, .3), (32.0, .7)):
        tr.add(at, (tr.blip(330, .28, 14), .3), (tr.blip(311, .28, 14), .2), pan=pan)
    tr.add(34.5, (tr.blip(hz(74), 1.2, 3.5), .22), (tr.blip(hz(81), 1.2, 3.0), .12))
    tr.duck(27.0, 27.5, .55)
    return tr


def creator():
    """"Creator samples" (38 s). Accent times mirror src/creator/timeline.ts (T, SENT_AT, WAVE_AT)."""
    tr = Track(38.0, 29)
    tr.chords([(0.0, 4.0, GMAJ7, 31), (4.0, 10.0, DMAJ9, 38), (10.0, 17.0, BM7, 35),
               (17.0, 24.0, EM7, 28), (24.0, 30.0, BM7, 35), (30.0, 34.0, ASUS, 33), (34.0, 38.0, DMAJ9, 38)])
    tr.arpeggio(4.0, 36.0)
    for d in range(8):                                                     # grid rises in a diagonal wave
        tr.add(0.6 + d * 0.09 + 0.45, (tr.blip(900 + d * 70, .08, 60), .14), pan=.3 + d * .06)
    for d in range(8):                                                     # Monday: outlines light up
        tr.add(4.6 + d * 0.07, (tr.blip(hz(81) * (1 + d * .02), .5, 8), .06), pan=.3 + d * .06)
    tr.add(10.3, (tr.swish(1.0, .15), .3))                                  # calendar glides to Wed
    for k in range(4):                                                     # one box at a time …
        at = 11.5 + k * 1.2
        tr.add(at, (tr.thump(140, .16, 24), .35), (tr.click(.02), .15), pan=.35)
        tr.add(at + 0.6, (tr.blip(hz(86), .35, 10), .22), pan=.6)          # … one creator lights up
    tr.cut_duck(16.2, 17.0, .8)                                             # tension …
    tr.add(17.0, (tr.thump(55, .5, 8), 1.0), (tr.click(.05), 1.0),          # … Friday: 14 go grey at once
           (tr.blip(233, .45, 7), .25), (tr.blip(247, .45, 7), .22))
    tr.add(24.4, (tr.swish(1.1, .12), .35))                                 # grey creators slide into a pile
    tr.add(30.2, (tr.swish(.8, .2), .3))                                    # they come back
    for col in range(5):                                                   # all light up, left → right
        tr.add(31.0 + col * 0.28, (tr.blip(hz(74 + [0, 2, 4, 7, 9][col]), .45, 9), .24), pan=.2 + col * .15)
    tr.add(34.75, (tr.swish(.7, .18), .3))                                  # end card opens
    tr.add(36.5, (tr.blip(hz(74), 1.2, 3.5), .22), (tr.blip(hz(81), 1.2, 3.0), .12))  # logo
    return tr


def warehouse():
    """"Warehouse tour" (28 s). Accent times mirror src/warehouse/timeline.ts (T)."""
    tr = Track(28.0, 41)
    tr.chords([(0.0, 4.0, DMAJ9, 38), (4.0, 9.0, GMAJ7, 31), (9.0, 13.0, BM7, 35), (13.0, 17.0, GMAJ7, 31),
               (17.0, 21.6, EM7, 28), (21.6, 24.8, ASUS, 33), (24.8, 28.0, DMAJ9, 38)])
    tr.arpeggio(3.9, 26.5)
    tr.add(3.9, (tr.swish(1.0, .12), .25))                                   # dolly in to receiving
    tr.add(5.2, (tr.thump(110, .25, 16), .55), (tr.click(.03), .2))          # carton set down
    tr.add(5.4, (tr.swish(.5, .3), .3))                                      # flaps open
    for i in range(12):                                                     # jars laid out in rows
        tr.add(5.9 + i * 0.1 + .45, (tr.blip(1200 + (i % 4) * 90, .05, 90), .09), pan=.3 + (i % 4) * .12)
    tr.cut_duck(7.2, 7.45, .6)
    tr.add(7.45, (tr.click(.05), 1.0), (tr.blip(2600, .06, 80), .25), (tr.swish(.25, .5), .4))  # camera shutter + flash
    tr.add(7.6, (tr.swish(.45, .25), .25), pan=.7)                           # batch photo slides in
    tr.add(9.6, (tr.blip(hz(79), .25, 14), .28), pan=.6)                     # "sent to you"
    tr.add(9.72, (tr.blip(hz(86), .3, 12), .22), pan=.6)
    tr.add(12.9, (tr.swish(1.1, .12), .25))                                  # to the shelving
    tr.add(13.0, (tr.thump(150, .2, 20), .3))                                # carton folded away
    for i in range(12):                                                     # jars onto the shelf
        tr.add(13.3 + i * 0.09 + .75, (tr.blip(900 + (i % 6) * 60, .05, 90), .08), pan=.35)
    tr.add(15.1, (tr.blip(hz(81), .3, 12), .2))                              # A2 · 120 units
    tr.add(17.1, (tr.blip(hz(79), .25, 14), .28), pan=.4)                    # new order
    tr.add(17.22, (tr.blip(hz(86), .3, 12), .22), pan=.4)
    tr.add(17.9, (tr.click(.02), .4))                                        # jar picked
    tr.add(18.2, (tr.swish(1.0, .12), .25))                                  # to packing
    tr.add(19.4, (tr.thump(170, .15, 26), .3))                               # into the mailer
    tr.add(19.5, (tr.swish(.4, .6), .45))                                    # tape
    tr.add(20.4, (tr.blip(1800, .08, 60), .18))                              # scale beep
    for k in range(10):                                                     # label printer
        tr.add(20.5 + k * 0.05, (tr.click(.012), .25), pan=.7)
    tr.add(21.35, (tr.click(.02), .35))                                      # label on
    tr.add(21.6, (tr.swish(.9, .12), .25))                                   # to the cage
    tr.add(22.6, (tr.thump(95, .25, 16), .5))                                # into the cage
    tr.add(23.2, (tr.swish(1.2, .06), .45))                                  # cage rolls
    tr.add(24.7, (tr.swish(.9, .15), .25))                                   # pull back to the whole room
    tr.add(26.5, (tr.blip(hz(74), 1.2, 3.5), .22), (tr.blip(hz(81), 1.2, 3.0), .12))  # logo
    return tr


TRACKS = {"three-ways": three_ways, "creator": creator, "warehouse": warehouse}

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "creator"
    TRACKS[name]().render(Path(__file__).resolve().parent.parent / "public" / f"music-{name}.wav")
