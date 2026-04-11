# Playwright Test Fixtures

This folder holds Y4M video files used as fake webcam input during Playwright tests.

---

## What is a Y4M file?

Y4M (YUV4MPEG2) is a raw video container. Chromium's
`--use-file-for-fake-video-capture` flag plays a Y4M file in a loop as the
camera stream, so tests can drive the MediaPipe pose pipeline without a real
webcam or screen recording.

A Y4M file consists of:
- One ASCII header line: `YUV4MPEG2 W<width> H<height> F<fps> Ip A0:0 C420`
- One or more frames, each preceded by the token `FRAME`
- Per frame: `width × height` bytes for the Y (luma) plane, then
  `(width/2) × (height/2)` bytes each for the Cb and Cr (chroma) planes.

---

## Files in this folder

| File | Description |
|------|-------------|
| `black-frame-320x240.y4m` | 1-frame black 320×240 video. Used by all three "real" smoke tests. MediaPipe returns `poseLandmarks = null` on every frame → rep counter stays at 0. Deterministic output. |
| `generate-stubs.js` | Script that regenerated `black-frame-320x240.y4m`. Run `node generate-stubs.js` if the file is missing. |
| `write-placeholders.js` | One-time generator for the 19 placeholder spec files. Kept here for reference; do not re-run unless rebuilding the scaffold from scratch. |

---

## How to record a new Y4M reference video

Each exercise's pose-detection assertions need a real recording of someone
doing that exercise. Use ffmpeg to capture from your webcam:

```bash
# macOS/Linux — record 30 seconds from the default webcam at 640×480
ffmpeg \
  -f avfoundation -r 30 -video_size 640x480 -i "0" \
  -t 30 \
  -vf scale=640:480 \
  tests/playwright/fixtures/<exercise-id>-reps.y4m
```

```bash
# Windows — record from webcam (device index 0)
ffmpeg \
  -f dshow -i video="Integrated Camera" \
  -t 30 \
  -vf scale=640x480 \
  tests/playwright/fixtures/<exercise-id>-reps.y4m
```

Tips for a useful recording:
1. **Full body in frame** — stay 6–8 feet from camera so MediaPipe can see all landmarks.
2. **Complete reps** — do 5–8 slow, deliberate reps (or hold for 20–30 seconds for timed exercises).
3. **Steady start** — stand in the starting position for 2 seconds before moving.
4. **Keep it short** — 15–30 seconds is plenty; shorter files mean faster tests.
5. **Commit the file** — Y4M files are checked into git alongside their test spec.

**Find your webcam device name on Windows:**
```bash
ffmpeg -list_devices true -f dshow -i dummy
```

---

## Y4M file size estimates

| Resolution | Duration | Approx size |
|------------|----------|-------------|
| 320×240    | 1 frame  | 115 KB (the black-frame stub) |
| 640×480    | 30 s @ 30fps | ~830 MB (too large — use 10fps) |
| 640×480    | 30 s @ 10fps | ~275 MB |
| 320×240    | 30 s @ 10fps | ~70 MB |

Recommend: `320x240 @ 10fps` for reference videos — good enough for MediaPipe,
small enough to commit. Add Y4M files > 50 MB to `.gitattributes` as LFS objects
if the repo grows large.
