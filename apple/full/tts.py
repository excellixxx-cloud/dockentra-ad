"""Voice for the full Dockentra WMS film (Apple style): George (Kokoro v0.19, offline), one wav per sentence.

    python3 apple/full/tts.py   -> apple/full/voice/*.wav + apple/full/voice/sentences.json
Brand sentences go through kokoro_direct (DOCK-en-tra) at the speed matching the sherpa read."""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "youtube/tts")); sys.path.insert(0, str(ROOT / "wms"))
from synth import make_tts
from tts import SPEED, say, voiced, trim

SCENES = [
    ("portal", ["Dockentra WMS runs the whole warehouse, and gives every client their own portal."]),
    ("shops", ["It's built to connect to a client's Shopify, TikTok Shop, Amazon, eBay or WooCommerce store."]),
    ("order", ["Orders come in from the store, or straight from the portal, in a few taps."]),
    ("pick", ["On the floor, the picker scans the tote, the location and the product."]),
    ("pack", ["Packing is scanned item by item, so the parcel matches the order."]),
    ("label", ["The software builds the shipment record and the carrier label."]),
    ("handover", ["At the courier handover, every parcel is scanned again, so you know exactly what left the building."]),
    ("track", ["Clients see every shipment's status, right up to the handover."]),
    ("billing", ["Every operation is logged and billed automatically.", "The warehouse drafts the invoice, and the client sees the month's estimate."]),
    ("trust", ["Clients never see each other's data.", "The software is built and tested, and our warehouse is opening in Limerick."]),
    ("end", ["This is Dockentra: fulfilment for small sellers, powered by software we built ourselves."]),
]

def main():
    import kokoro_direct as kd
    tts, sid = make_tts("george")
    out = ROOT / "apple/full/voice"; meta = []
    for scene, sents in SCENES:
        for k, s in enumerate(sents):
            sp = say(s)
            a = np.asarray(tts.generate(sp, sid=sid, speed=SPEED).samples, np.float32)
            if "dockentra" in sp.lower():
                y0, _, _ = kd.generate(sp, sid=sid, speed=SPEED)
                a, _, _ = kd.generate(sp, sid=sid, speed=SPEED * voiced(y0) / voiced(a))
            a = trim(a); a = a / np.abs(a).max() * 0.89
            name = f"{scene}{k}.wav"
            with wave.open(str(out / name), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a * 32767).astype("<i2").tobytes())
            meta.append({"scene": scene, "k": k, "text": s, "file": name, "dur": round(len(a) / 24000, 3)})
            print(f"{scene:9s} {len(a) / 24000:5.2f}  {s}")
    (out / "sentences.json").write_text(json.dumps(meta, indent=1))

if __name__ == "__main__":
    main()
