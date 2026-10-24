#!/bin/sh
# 9:16 from the 16:9 Motion render: sharp centre crop (x 180-1740) over a flat wash of the frame mean colour (it turns green with the wipe).
# The docked "Dockentra" wordmark (outside the crop) is re-placed top-left while it is on screen (3.6-12.3 s).
FF="$1"; IN=one-axis.mp4; AUD=music.wav; OUT=one-axis-music-9x16.mp4
$FF -v error -y -i $IN -i $AUD -filter_complex "
[0:v]split=3[a][b][c];
[a]scale=1:1:flags=area,scale=1080:1920:flags=neighbor,format=yuv420p[bg];
[b]crop=1560:1080:180:0,scale=1080:-2,format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='255*clip(min(Y,H-1-Y)/26,0,1)'[fg];
[c]crop=300:60:30:40,scale=206:-2,pad=iw+34:ih:34:0:color=0xF1F3F2[wm];
[bg][fg]overlay=0:(H-h)/2:format=auto[t];
[t][wm]overlay=0:613:enable='between(t,3.6,12.3)'[v]" -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -shortest -movflags +faststart $OUT
