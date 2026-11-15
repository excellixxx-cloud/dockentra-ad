"""Voiceover for «40 хвилин»: edge-tts (Microsoft neural TTS), voice uk-UA-PolinaNeural, one file per line.

    python3.13 sorok/tts.py [--force]
      -> sorok/voice/raw/<variant>-NN.mp3, sorok/voice/<variant>/NN.wav (48 kHz mono), sorok/voice/<variant>/lines.json
Lines are trimmed, pauses inside a line are shortened to 0.14 s where the line has to be tighter, and the lines are
placed one after another: each starts at its wanted time, or 0.12 s after the previous one ends if that is later.

Two variants, because the script does not fit 20 s at a calm pace:
  full  all nine lines; the last three are generated faster (+15 %) so that the last one ends by 19.8 s
  calm  the last spoken line («Підписуйтесь. Почнемо разом.») is left to the on-screen text; nothing is rushed"""
import asyncio, json, os, subprocess, sys
from pathlib import Path
import edge_tts
D = Path(__file__).resolve().parent / "voice"
VOICE = "uk-UA-PolinaNeural"
END = 19.8
# wanted start s, text, rate, pitch, gain dB, squeeze pauses
BASE = [
    (0.25, "Тиха година. Єдиний час, коли ви — це ви.", "+0%", "-6Hz", -1.5, True),
    (3.0, "Посуд.", "-10%", "-8Hz", -1.0, False),
    (4.3, "Прання.", "-6%", "-8Hz", -1.0, False),
    (5.6, "Телефон.", "-10%", "-10Hz", -2.5, False),
    (6.8, "Знову просити гроші на себе.", "-8%", "-9Hz", -1.0, False),
    (9.8, "А ким я буду після декрету?", "-8%", "-6Hz", -3.0, False),
]
VARIANTS = {
    "full": BASE + [
        (12.62, "Сорок хвилин на день — цього досить, щоб почати.", "+15%", "+2Hz", 0.0, True),
        (15.3, "Перший крок — зрозуміти, що підходить саме вам.", "+15%", "+0Hz", 0.0, True),
        (18.0, "Підписуйтесь. Почнемо разом.", "+22%", "+3Hz", 0.0, True),
    ],
    "calm": BASE + [
        (12.7, "Сорок хвилин на день — цього досить, щоб почати.", "-4%", "+2Hz", 0.0, False),
        (16.1, "Перший крок — зрозуміти, що підходить саме вам.", "-2%", "+0Hz", 0.0, False),
    ],
}
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse"
SQUEEZE = ",silenceremove=stop_periods=-1:stop_duration=0.14:stop_threshold=-40dB:stop_silence=0.14"
def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)
async def main():
    (D / "raw").mkdir(parents=True, exist_ok=True)
    for name, lines in VARIANTS.items():
        (D / name).mkdir(exist_ok=True)
        out, prev = [], 0.0
        print(f"--- {name}")
        for i, (want, text, rate, pitch, gain, squeeze) in enumerate(lines):
            raw = D / "raw" / f"{name}-{i:02d}.mp3"
            if not raw.exists() or raw.stat().st_size == 0 or "--force" in sys.argv:
                await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch, proxy=os.environ.get("HTTPS_PROXY")).save(str(raw))
            wav = D / name / f"{i:02d}.wav"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af", TRIM + (SQUEEZE if squeeze else ""), "-ar", "48000", "-ac", "1", str(wav)], check=True)
            d = dur(wav)
            start = max(want, prev + 0.08 if out else want)
            if 12.0 < start < 12.6: start = 12.6           # the flash stays silent
            prev = start + d
            out.append({"i": i, "text": text, "rate": rate, "pitch": pitch, "wanted": want, "start": round(start, 3), "end": round(prev, 3), "dur": round(d, 3), "gain": gain})
            print(f"{i}  {start:5.2f} → {prev:5.2f}  ({d:.2f} s, rate {rate}){'' if prev <= END else '  OVER 19.8'}  {text}")
        (D / name / "lines.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
asyncio.run(main())
