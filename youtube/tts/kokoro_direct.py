"""Kokoro v0.19 straight from phonemes, for the few words the bundled en-us espeak gets wrong.

sherpa-onnx phonemises with en-us espeak and ignores a lexicon for this model, so a brand name cannot
be corrected through it. Here the whole sentence is phonemised with the same espeak data (weak forms and
sentence stress intact), the listed words are swapped for hand-written phonemes, and the ONNX model is
run directly with the same speaker style. Callers match the speed to the sherpa read of the sentence."""
import numpy as np
import onnxruntime as ort
import piper_phonemize as pp
from synth import VOICES

D = VOICES / "kokoro-en-v0_19"
FIX = {"dockentra": "dˈɒkɛntɹə"}          # DOCK-en-tra: British short o, stress on the first syllable only

_tok = {}
for line in open(D / "tokens.txt", encoding="utf-8"):
    line = line.rstrip("\n")
    idx = line.split(" ")[-1]
    _tok[line[: -len(idx) - 1]] = int(idx)
_sess = ort.InferenceSession(str(D / "model.onnx"))
_voices = np.fromfile(D / "voices.bin", dtype=np.float32).reshape(11, 511, 256)


def _espeak(text):
    return " ".join("".join(x) for x in pp.phonemize_espeak(text, "en-us", data_path=str(D / "espeak-ng-data")))


def phonemes(text):
    ph = _espeak(text)
    for word, fixed in FIX.items():
        ph = ph.replace(_espeak(word.capitalize()), fixed).replace(_espeak(word), fixed)
    return ph


def generate(text, sid=9, speed=0.86, ph=None):
    ph = ph or phonemes(text)
    ids = [_tok[c] for c in ph if c in _tok]
    style = _voices[sid, min(len(ids), 510)][None, :]
    audio = _sess.run(None, {"tokens": np.array([[0, *ids, 0]], np.int64), "style": style, "speed": np.array([speed], np.float32)})[0]
    return np.asarray(audio, np.float32).reshape(-1), 24000, ph
