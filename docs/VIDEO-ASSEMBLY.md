# Video assembly

Inputs: `opener.mp4` (the 12-second motion-graphic opener, already carrying its own VO and SFX), a screen recording of the Slack + console flow, an iPhone recording of the Telegram flow, and one narration WAV covering 0:12–2:00 (the script in `docs/DEMO-SCRIPT.md`).

## 1. Recording

**Slack + console (screen):**
- QuickTime Player → File → New Screen Recording → gear icon → highest available quality, no microphone.
- Set the display to 1920x1080 beforehand (System Settings → Displays), or record native and downscale in ffmpeg (step 3 below).
- Record at 60fps: QuickTime follows the display's refresh rate, so set the display to 60Hz first if it isn't already.
- Record each shot-list segment as its own short clip rather than one long take, so a single beat is easy to re-take.

**Telegram (iPhone):**
- Connect the iPhone by USB cable, unlock it, tap Trust on the phone if prompted.
- QuickTime Player → File → New Movie Recording → click the arrow next to the record button → choose the iPhone as the camera source (and its microphone, or none if audio is added separately).
- Frame the phone recording full-screen; no other UI needed since this becomes a full-frame cutaway.

Save all raw clips to a working folder before editing so ffmpeg paths stay short.

## 2. Narration

- Feed the voiceover script from `docs/DEMO-SCRIPT.md` into ElevenLabs (or any TTS) using a calm, confident voice matching the opener's.
- Export a single mono or stereo WAV at 44.1kHz or 48kHz: `narration.wav`.
- Target length is 1:48 (108 seconds), matching the 0:12–2:00 window. If the render comes out short or long, either adjust the speaking-rate setting in the TTS tool, or time-stretch afterwards without changing pitch:
  ```bash
  ffmpeg -i narration_raw.wav -filter:a "atempo=0.95" narration.wav
  ```
  (`atempo` values between 0.9 and 1.1 keep quality acceptable; chain two `atempo` filters for larger adjustments.)
- Trim leading/trailing silence before the next step.

## 3. Assemble

Normalise both video clips to the same resolution, frame rate and pixel format, and give both an audio stream (the screen recording gets silence so the two clips can be concatenated cleanly):

```bash
ffmpeg -i opener.mp4 -vf "scale=1920:1080,fps=60,format=yuv420p" \
  -c:v libx264 -crf 16 -preset fast -c:a aac -ar 48000 opener_norm.mp4

ffmpeg -i screen.mp4 -f lavfi -i anullsrc=r=48000:cl=stereo \
  -vf "scale=1920:1080,fps=60,format=yuv420p" \
  -c:v libx264 -crf 16 -preset fast -c:a aac -shortest screen_norm.mp4
```

Concatenate opener + screen (concat demuxer, no re-encode needed since both now share codec parameters):

```bash
printf "file 'opener_norm.mp4'\nfile 'screen_norm.mp4'\n" > concat_list.txt
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy combined_video.mp4
```

Overlay `narration.wav`, delayed 12 seconds so it starts exactly as the screen portion begins, mixed under the opener's own (kept) audio and the screen portion's silence:

```bash
ffmpeg -i combined_video.mp4 -i narration.wav \
  -filter_complex "[1:a]adelay=12000|12000[vo]; [0:a][vo]amix=inputs=2:duration=first:dropout_transition=0[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k with_narration.mp4
```

## 4. Loudness normalise to -14 LUFS

```bash
ffmpeg -i with_narration.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 \
  -c:v copy -c:a aac -b:a 192k loudnorm_pass.mp4
```

For a more accurate result there is time for, run loudnorm two-pass: first with `-af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json` to measure, then feed the reported `measured_I`, `measured_TP`, `measured_LRA` and `measured_thresh` back in as `measured_*` parameters on a second pass. Single-pass above is accurate enough for a demo video.

## 5. Final export (1920x1080, H.264, 12 Mbps, AAC 192k)

```bash
ffmpeg -i loudnorm_pass.mp4 -c:v libx264 -b:v 12M -maxrate 12M -bufsize 24M \
  -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -movflags +faststart \
  callsheet-demo-final.mp4
```

## 6. Caption card for the architecture moment

Burns a small text card over the 1:44–1:50 architecture-still beat (adjust the `enable` window to match the final cut's timing):

```bash
ffmpeg -i callsheet-demo-final.mp4 -vf \
  "drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='Slack -> Agent -> Exa + Ambiguous -> Telegram':fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=h-140:enable='between(t,104,110)'" \
  -c:v libx264 -b:v 12M -maxrate 12M -bufsize 24M -c:a copy \
  callsheet-demo-final-captioned.mp4
```

Check the result plays correctly (picture, audio level, caption timing) before uploading.
