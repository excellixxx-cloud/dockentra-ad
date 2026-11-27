"""Voice for the "warehouse ad ideas" remake: edge-tts (en-US-EmmaNeural) converted to the character's timbre with
OpenVoice V2 (MIT). The converter adds its inaudible watermark to every line (on by default; left on).

    python3.13 ideas/voice.py SCRATCH_DIR
SCRATCH_DIR holds clone/vocals.wav, clone/bed.wav (Demucs stems of the original) and ov/ (OpenVoice repo, checkpoint,
ref/her_se.pth). Writes ideas/voice/NN.wav, ideas/voice/lines.json, ideas/out/voice.wav, ideas/out/mix.wav.
Each new line sits in the window of the original phrase it replaces and is levelled to that phrase."""
import asyncio, json, os, subprocess, sys, wave
from pathlib import Path
import numpy as np, soundfile as sf
ROOT = Path(__file__).resolve().parents[1]
SCR = Path(sys.argv[1])
sys.path.insert(0, str(SCR / "ov/repo")); sys.path.insert(0, str(ROOT / "youtube/tts"))
import edge_tts
from loud import loudnorm
D = ROOT / "ideas/voice"; OUT = ROOT / "ideas/out"; D.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
BASE = "en-US-EmmaNeural"
# (window start, window end, text, rate)
LINES = [
    (0.00, 2.10, "Okay, warehouse, warehouse, warehouse ad.", "+8%"),
    (2.26, 6.82, "How to ship it all? I think it's going to be super chill, but I think we should make it like,", "+10%"),
    (7.30, 7.92, "like the boxes", "+10%"),
    (10.10, 13.58, "more like funny and animated, like more,", "+4%"),
    (14.56, 16.06, "you know what I mean? Is that cute?", "+10%"),
    (16.28, 23.60, "And like the shelves will be blurred out in the back, but like you'll be like, you can see your orders, like, oh my god, or should we do a really funny one and I'll go like, packed!", "+14%"),
    (25.40, 27.52, "Like you can see the parcel, is it in?", "+8%"),
    (28.56, 33.02, "Okay. Or let's do like a regular, like, Dockentra,", "+0%"),
    (34.74, 35.74, "you tell me.", "+4%"),
]
SR = 48000
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse"
def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)
def rd(p):
    with wave.open(str(p)) as w: x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768; return (x.reshape(-1, w.getnchannels()), w.getframerate())
async def base():
    for i, (_, _, text, rate) in enumerate(LINES):
        p = D / f"base-{i:02d}.mp3"
        if not p.exists() or p.stat().st_size == 0:
            await edge_tts.Communicate(text, BASE, rate=rate, proxy=os.environ.get("HTTPS_PROXY")).save(str(p))
asyncio.run(base())
from openvoice.api import ToneColorConverter
import torch
conv = ToneColorConverter(str(SCR / "ov/ckpt/converter/config.json"), device="cpu")    # watermark on (default)
conv.load_ckpt(str(SCR / "ov/ckpt/converter/checkpoint.pth"))
tgt = torch.load(str(SCR / "ov/ref/her_se.pth"))
her, hsr = rd(SCR / "clone/vocals.wav"); her = her.mean(1)
meta = []
for i, (t0, t1, text, rate) in enumerate(LINES):
    b22 = D / f"base-{i:02d}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(D / f"base-{i:02d}.mp3"), "-af", TRIM, "-ac", "1", "-ar", "22050", str(b22)], check=True)
    cv = D / f"conv-{i:02d}.wav"
    conv.convert(audio_src_path=str(b22), src_se=conv.extract_se([str(b22)]), tgt_se=tgt, output_path=str(cv), tau=0.3)
    # fit the window: speed up (never more than 1.25x), never slow down
    d = dur(cv); win = t1 - t0; tempo = min(1.25, d / win) if d > win else 1.0
    out = D / f"{i:02d}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(cv), "-af", f"atempo={tempo:.4f}," + TRIM, "-ar", str(SR), "-ac", "1", str(out)], check=True)
    d2 = dur(out)
    # level to the original phrase in the same window
    seg = her[int(t0 * hsr): int(t1 * hsr)]; ref_rms = np.sqrt((seg[np.abs(seg) > 0.01] ** 2).mean())
    meta.append({"i": i, "text": text, "start": t0, "end": round(t0 + d2, 3), "window_end": t1, "tempo": round(tempo, 3), "ref_rms": float(ref_rms)})
    print(f"{i} {t0:5.2f}→{t0 + d2:5.2f} (window {t1:5.2f}) tempo {tempo:.2f}{'  OVER' if t0 + d2 > t1 + 0.05 else ''}  {text}")
(D / "lines.json").write_text(json.dumps(meta, indent=1))
bed, bsr = rd(SCR / "clone/bed.wav")
N = len(bed); voice = np.zeros(N, np.float32)
for m in meta:
    x, _ = rd(D / f"{m['i']:02d}.wav"); x = x[:, 0]
    x = x / max(np.sqrt((x[np.abs(x) > 0.01] ** 2).mean()), 1e-6) * m["ref_rms"]
    a = int(m["start"] * SR); voice[a:a + len(x)] += x[: N - a]
def wr(p, y):
    y = np.clip(y, -1, 1)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype("<i2").tobytes())
wr(OUT / "voice.wav", np.stack([voice, voice], 1)); wr(OUT / "bed.wav", bed)
tmp = OUT / "mix-pre.wav"; mix = bed + voice[:, None]; wr(tmp, mix / np.abs(mix).max() * 0.9)
loudnorm(tmp, OUT / "mix.wav", I=-14, TP=-1.0); tmp.unlink()
