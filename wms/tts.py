"""Voice for the Dockentra WMS product video: George (Kokoro v0.19, offline), one wav per sentence.

    python3 wms/tts.py            -> wms/voice/s*.wav + wms/voice/sentences.json (24 kHz, lengths)
Sentences containing the brand go through kokoro_direct (DOCK-en-tra), at the speed that matches the
sherpa read of the same sentence; everything else is the normal sherpa read."""
import json, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "youtube/tts"))
from synth import make_tts

SPEED = 0.86
SCENES = [
    ("hook", ["Small sellers outgrow packing at home.", "Small warehouses outgrow spreadsheets.", "Dockentra is built for both."]),
    ("problem", ["Most small 3PLs track stock in spreadsheets.", "When a client complains about a lost or damaged order, nobody can trace it.",
                 "Warehouse software can cost hundreds of euros a month before setup."]),
    ("portal", ["With Dockentra, the warehouse's clients get their own portal — orders, files, deliveries, returns, stock, shipments and invoices, from a laptop or a phone."]),
    ("stores", ["Dockentra is built to connect to a client's own Shopify, TikTok Shop, Amazon, eBay or WooCommerce store — tested end to end, going live with our first clients."]),
    ("floor", ["Every unit is tracked by its inbound batch, from dock to parcel.", "Staff scan to pick and pack.",
               "A carrier label — An Post, DPD, UPS, DHL or FedEx — is built and tested, printing straight to a Zebra printer, ready to go live once carrier accounts are in place."]),
    ("handover", ["Parcels are handed to couriers with a scanned check.", "Every operation is billed automatically — no spreadsheets."]),
    ("trust", ["Clients can never see each other's data.", "Covered by more than nine thousand automated checks and four security reviews."]),
    ("ask", ["Dockentra WMS is built and tested.", "Our own warehouse space in Limerick will be the first pilot, once it's open.",
             "Next: our first clients, then other small warehouses across Ireland and the UK."]),
]
SAY = [("3PLs", "three P Ls"), ("WMS", "W M S"), ("DPD", "D P D"), ("UPS", "U P S"), ("DHL", "D H L"), (" — ", ", "), ("Next:", "Next,")]

def say(s):
    for a, b in SAY: s = s.replace(a, b)
    return s

def voiced(x, sr=24000):
    nz = np.where(np.abs(x) > 0.01)[0]
    return (nz[-1] - nz[0]) / sr

def trim(x, sr=24000):
    nz = np.where(np.abs(x) > 0.01)[0]
    return x[max(0, nz[0] - int(.03 * sr)): nz[-1] + int(.06 * sr)]

def main():
    import kokoro_direct as kd
    tts, sid = make_tts("george")
    out = ROOT / "wms/voice"; meta = []
    for si, (scene, sents) in enumerate(SCENES):
        for k, s in enumerate(sents):
            sp = say(s)
            a = np.asarray(tts.generate(sp, sid=sid, speed=SPEED).samples, np.float32)
            if "dockentra" in sp.lower():
                y0, _, _ = kd.generate(sp, sid=sid, speed=SPEED)
                a, _, ph = kd.generate(sp, sid=sid, speed=SPEED * voiced(y0) / voiced(a))
            a = trim(a); a = a / np.abs(a).max() * 0.89
            name = f"s{si}{k}.wav"
            with wave.open(str(out / name), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a * 32767).astype("<i2").tobytes())
            meta.append({"scene": scene, "i": si, "k": k, "text": s, "spoken": sp, "file": name, "dur": round(len(a) / 24000, 3)})
            print(f"{scene:9s} {len(a) / 24000:5.2f}  {s}")
    (out / "sentences.json").write_text(json.dumps(meta, indent=1))
    print("total voice", round(sum(m["dur"] for m in meta), 1), "s,", sum(len(m["text"].split()) for m in meta), "words")

if __name__ == "__main__":
    main()
