"""Two independent offline ASR models (Whisper base.en, Moonshine base) read the synthesised
narration back. A word is flagged only if BOTH models miss it — each model alone has its own quirks."""
import re, sys, wave, difflib
import numpy as np, sherpa_onnx
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import synth

V = synth.VOICES
W = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{V}/sherpa-onnx-whisper-base.en/base.en-encoder.onnx", decoder=f"{V}/sherpa-onnx-whisper-base.en/base.en-decoder.onnx", tokens=f"{V}/sherpa-onnx-whisper-base.en/base.en-tokens.txt", num_threads=4)
m = f"{V}/sherpa-onnx-moonshine-base-en-int8"
M = sherpa_onnx.OfflineRecognizer.from_moonshine(preprocessor=f"{m}/preprocess.onnx", encoder=f"{m}/encode.int8.onnx", uncached_decoder=f"{m}/uncached_decode.int8.onnx", cached_decoder=f"{m}/cached_decode.int8.onnx", tokens=f"{m}/tokens.txt", num_threads=4)
norm = lambda s: re.findall(r"[a-z0-9]+", s.lower().replace("tiktok", "tik tok").replace("-", " "))

def missed(ref, hyp):
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    bad = set()
    for op, i1, i2, *_ in sm.get_opcodes():
        if op != "equal": bad.update(range(i1, i2))
    return bad

def check(n):
    w = wave.open(f"youtube/voice/ch{n}.wav"); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    issues = []
    for line in open(f"youtube/voice/ch{n}.marks.tsv"):
        a, b, text = line.rstrip("\n").split("\t")
        seg = x[int(float(a) * sr): int(float(b) * sr) + int(.05 * sr)]
        ref = norm(synth.say(text))
        hyps = []
        for rec in (W, M):
            s = rec.create_stream(); s.accept_waveform(sr, seg); rec.decode_stream(s); hyps.append(s.result.text)
        both = missed(ref, norm(hyps[0])) & missed(ref, norm(hyps[1]))
        if both: issues.append((text, [ref[i] for i in sorted(both)], hyps))
    return issues

if __name__ == "__main__":
    for n in map(int, sys.argv[1:] or range(10)):
        iss = check(n)
        print(f"ch{n}: {'OK' if not iss else f'{len(iss)} sentence(s) flagged'}")
        for text, words, hyps in iss:
            print(f"   {words} in: {text}\n      whisper: {hyps[0]}\n      moonshine: {hyps[1]}")
