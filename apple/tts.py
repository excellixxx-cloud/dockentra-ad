"""Voice for the 66 s Apple-style WMS film (technical script): George (Kokoro v0.19, offline), one wav per line.

    python3 apple/tts.py      -> apple/voice/*.wav + apple/voice/lines.json
Scene 2's line is from the script; the others are ours, one or two short lines per scene, with pauses."""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts")); sys.path.insert(0, str(ROOT / "wms"))
from synth import make_tts
from tts import SPEED, say, voiced, trim

# (id, start on the film clock in s, text)
LINES = [
    ("portal", 7.4, "Dockentra WMS gives your brand its own client portal."),
    ("order", 17.4, "Send a new order in a few taps. It goes straight to the warehouse."),
    ("ship", 28.4, "Every shipment shows its status, right up to the courier handover."),
    ("bill", 37.6, "Charges are logged as the work is done, and you can see this month's estimate at any time."),
    ("floor1", 47.4, "On the floor, every pick is scanned."),
    ("floor2", 50.6, "The software is built and tested, and our warehouse is opening in Limerick."),
    ("end", 59.6, "Dockentra. Fulfilment for small sellers, powered by software we built ourselves."),
]

def main():
    import kokoro_direct as kd
    tts, sid = make_tts("george")
    out = ROOT / "apple/voice"; meta = []
    for name, at, s in LINES:
        sp = say(s)
        a = np.asarray(tts.generate(sp, sid=sid, speed=SPEED).samples, np.float32)
        if "dockentra" in sp.lower():
            y0, _, _ = kd.generate(sp, sid=sid, speed=SPEED)
            a, _, _ = kd.generate(sp, sid=sid, speed=SPEED * voiced(y0) / voiced(a))
        a = trim(a); a = a / np.abs(a).max() * 0.89
        with wave.open(str(out / f"{name}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a * 32767).astype("<i2").tobytes())
        d = round(len(a) / 24000, 3)
        meta.append({"id": name, "a": at, "b": round(at + d, 3), "text": s, "file": f"{name}.wav"})
        print(f"{name:7s} {at:5.1f}-{at + d:5.1f}  {s}")
    (out / "lines.json").write_text(json.dumps(meta, indent=1))

if __name__ == "__main__":
    main()
