"""Two-pass EBU R128 loudness normalisation to 48 kHz / 16-bit PCM, with a true-peak ceiling.

    python3 youtube/tts/loud.py <in> <out.wav> [I=-16] [TP=-2]
Pass 1 measures; pass 2 applies the measured values (linear gain when the peak allows it,
otherwise loudnorm's limiter holds the true-peak ceiling). Prints the result as measured on the output."""
import json, re, subprocess, sys
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()


def measure(path):
    r = subprocess.run([FF, "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = r[r.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary).group(1))
    return i, tp


def loudnorm(src, dst, I=-16.0, TP=-2.0, LRA=11, channels=None):
    spec = f"loudnorm=I={I}:TP={TP}:LRA={LRA}"
    r = subprocess.run([FF, "-hide_banner", "-i", str(src), "-af", spec + ":print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(r[r.rfind("{"):r.rfind("}") + 1])
    af = (f"{spec}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    cmd = [FF, "-loglevel", "error", "-y", "-i", str(src), "-af", af, "-ar", "48000", "-c:a", "pcm_s16le"]
    if channels: cmd += ["-ac", str(channels)]
    subprocess.run(cmd + [str(dst)], check=True)
    i, tp = measure(dst)
    print(f"{dst}: {i:.1f} LUFS, true peak {tp:.1f} dBTP, 48 kHz 16-bit")
    return i, tp


if __name__ == "__main__":
    loudnorm(sys.argv[1], sys.argv[2], *(float(a) for a in sys.argv[3:5]))
