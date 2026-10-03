"""Offline narration synthesis (sherpa-onnx). Sentence by sentence, with
controlled pauses: 0.5 s between sentences, 1.0 s between paragraphs (speed 0.86 ≈ 145-150 wpm).

    python3 youtube/tts/synth.py <chapter 0-9> <voice> <out.wav> [speed]
voices: george | lewis (Kokoro v0.19, British male) | alan (piper en_GB medium)
"""
import os, re, sys, wave
from pathlib import Path
import numpy as np
import sherpa_onnx

VOICES = Path("/tmp/claude-0/-home-user-dockentra-ad/95514b0c-98c1-59fa-bd4f-3e778dcff093/scratchpad/voices")
NARR = Path(__file__).resolve().parent.parent / "narration.md"

# What the voice reads, where the written form would be read badly (subtitles keep the written form).
SAY = [
    ("A1 to A6", "A one to A six"),
    ("your stock from", "your stock, from"),     # slower read swallowed the final k without the pause
    ("48 hours", "forty-eight hours"),
    ("dockentra.ie", "Dock-entra dot I E"),   # brand: stress and full vowel on "Dock"
    ("Dockentra", "Dock-entra"),
    ("Couriers", "Kooriers"),
    ("TikTok Shop and Shopify", "TikTok Shop, and Shopify"),
]
def say(sent):
    for a, b in SAY:
        sent = sent.replace(a, b)
    return sent

def chapter_paragraphs(n):
    s = NARR.read_text()
    body = s.split(f"\n## {n}.")[1].split("\n## ")[0]
    return [l[2:].strip() for l in body.splitlines() if l.startswith("> ") and l[2:].strip()]

def make_tts(voice):
    if voice in ("george", "lewis"):
        d = VOICES / "kokoro-en-v0_19"
        cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=str(d / "model.onnx"), voices=str(d / "voices.bin"),
                tokens=str(d / "tokens.txt"), data_dir=str(d / "espeak-ng-data")), num_threads=4))
        return sherpa_onnx.OfflineTts(cfg), {"george": 9, "lewis": 10}[voice]
    d = VOICES / "vits-piper-en_GB-alan-medium"
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=str(d / "en_GB-alan-medium.onnx"), tokens=str(d / "tokens.txt"),
            data_dir=str(d / "espeak-ng-data")), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg), 0

GAP_S = float(os.environ.get("GAP_S", 0.5))    # between sentences
GAP_P = float(os.environ.get("GAP_P", 1.0))    # between paragraphs

def synth(n, voice, out, speed=1.0):
    tts, sid = make_tts(voice)
    sr, parts, marks, t = None, [], [], 0.0
    for pi, para in enumerate(chapter_paragraphs(n)):
        sents = re.split(r"(?<=[.?])\s+", para)
        for si, sent in enumerate(sents):
            a = tts.generate(say(sent), sid=sid, speed=speed)
            sr = a.sample_rate
            x = np.asarray(a.samples, dtype=np.float32)
            nz = np.where(np.abs(x) > 0.01)[0]                       # trim synth padding
            if len(nz): x = x[max(0, nz[0] - int(.03 * sr)): nz[-1] + int(.06 * sr)]
            marks.append((round(t, 3), round(t + len(x) / sr, 3), sent))
            parts.append(x); t += len(x) / sr
            gap = GAP_S if si < len(sents) - 1 else GAP_P
            parts.append(np.zeros(int(gap * sr), np.float32)); t += gap
    y = np.concatenate(parts[:-1])
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())
    Path(out).with_suffix(".marks.tsv").write_text("".join(f"{a}\t{b}\t{s}\n" for a, b, s in marks))
    print(out, f"{len(y) / sr:.1f}s", sr, "Hz")

if __name__ == "__main__":
    synth(int(sys.argv[1]), sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 1.0)
