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
# narration stays the lead; the SFX track is already 13 dB under it (ops_sfx.py)
"$FF" -v error -y -i out/ops/picture.mp4 -i "$OUT/narration.wav" -i "$OUT/sfx.wav" \
  -filter_complex "[1:a]aformat=channel_layouts=stereo,aresample=48000[v];[2:a]aresample=48000[s];[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT/dockentra-operations-full.mp4"
echo "$OUT/dockentra-operations-full.mp4"
