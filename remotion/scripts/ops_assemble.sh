#!/usr/bin/env bash
# Joins the per-chapter renders and lays the narration over the object sounds (no music).
#   bash scripts/ops_assemble.sh   (after rendering out/ops/ch0..9.mp4 and running ops_sfx.py)
set -euo pipefail
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
OUT=../youtube/out
: > out/ops/list.txt
for n in 0 1 2 3 4 5 6 7 8 9; do echo "file 'ch$n.mp4'" >> out/ops/list.txt; done
"$FF" -v error -y -f concat -safe 0 -i out/ops/list.txt -c copy out/ops/picture.mp4
# narration stays the lead; the SFX track is already 13 dB under it (ops_sfx.py).
# Mix master: 48 kHz 16-bit, -14 LUFS (YouTube's reference), true peak <= -1 dBTP.
"$FF" -v error -y -i "$OUT/narration.wav" -i "$OUT/sfx.wav" \
  -filter_complex "[0:a]aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[a]" \
  -map "[a]" -ar 48000 -c:a pcm_s16le out/ops/mix_raw.wav
python3 ../youtube/tts/loud.py out/ops/mix_raw.wav "$OUT/mix-master.wav" -14 -1
# AAC carries no bit depth; it is encoded straight from the 48 kHz / 16-bit master at the same rate
"$FF" -v error -y -i out/ops/picture.mp4 -i "$OUT/mix-master.wav" -map 0:v -map 1:a -c:v copy \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT/dockentra-operations-full.mp4"
# repo copy under GitHub's 100 MB file limit: two-pass 1.5 Mbit/s, same audio
( cd out/ops && "$FF" -v error -y -i "../../$OUT/dockentra-operations-full.mp4" -c:v libx264 -preset slow -b:v 1500k -pass 1 -an -f mp4 /dev/null \
  && "$FF" -v error -y -i "../../$OUT/dockentra-operations-full.mp4" -c:v libx264 -preset slow -b:v 1500k -pass 2 -pix_fmt yuv420p -c:a copy -movflags +faststart "../../$OUT/dockentra-operations-full-web.mp4" )
echo "$OUT/dockentra-operations-full.mp4"
