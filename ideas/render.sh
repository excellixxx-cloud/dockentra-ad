#!/bin/bash
# Render the two layers and composite them with the matted presenter and the soundtrack.
#   bash ideas/render.sh SCRATCH_DIR     (SCRATCH_DIR holds upload_v/src.mp4 and rvm/alpha/NNNN.png)
set -e
S="$1"; cd "$(dirname "$0")/../remotion"
BR=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
[ -s ../ideas/render/bg.mp4 ] || npx remotion render src/index.ts IdeasBG ../ideas/render/bg.mp4 --muted --concurrency=4 --crf=12 --browser-executable=$BR 2>&1 | grep -v -i memory | tail -1
npx remotion render src/index.ts IdeasFG ../ideas/render/fg --sequence --image-format=png --concurrency=4 --browser-executable=$BR 2>&1 | grep -v -i memory | tail -1
cd ../ideas
# presenter = source frames + RVM alpha; hidden on the final grid (t >= 34.58 s)
ffmpeg -loglevel error -y -i render/bg.mp4 -i "$S/upload_v/src.mp4" -framerate 24000/1001 -i "$S/rvm/alpha/%04d.png" -framerate 24000/1001 -i render/fg/element-%03d.png -i out/mix.wav \
  -filter_complex "[2:v]format=gray,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[s];[s][a]alphamerge[p];[0:v][p]overlay=enable='lt(t,34.58)':format=auto[bp];[3:v]setpts=PTS-STARTPTS[f];[bp][f]overlay=format=auto,format=yuv420p[v]" \
  -map "[v]" -map 4:a -c:v libx264 -crf 18 -preset medium -r 24000/1001 -c:a aac -b:a 192k -shortest -movflags +faststart out/dockentra-ad-ideas.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of csv=p=0 out/dockentra-ad-ideas.mp4
