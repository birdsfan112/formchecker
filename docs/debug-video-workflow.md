# Debug Video Workflow

## When to use
When tuning thresholds or debugging features that show debug overlay text on the phone screen (e.g., palm gesture values, form analysis numbers). The debug text is too small and fast to read at workout distance, so a screen recording captures everything for later analysis.

## How it works

### 1. Scott records on his phone
- Use iOS screen recording (swipe down from top-right → screen record button)
- Run through the exercises/gestures with debug overlay enabled
- Stop recording when done — video saves to Camera Roll

### 2. Transfer the video
- Download to the FormChecker project folder (via Google Drive, iCloud, USB, etc.)
- QuickTime .mov files from iOS are typical (can be large — 474MB for ~2 min at 60fps)

### 3. Extract frames with ffmpeg
```bash
# One frame every 5 seconds — good balance of coverage vs. number of frames
ffmpeg -i "recording.mov" -vf "fps=1/5" -q:v 2 frames/frame_%03d.jpg

# For more detail (e.g., catching a specific moment), use fps=1 for every second
ffmpeg -i "recording.mov" -vf "fps=1" -q:v 2 frames/frame_%03d.jpg
```

### 4. Read the debug overlay from still frames
- Claude can view the extracted JPG frames directly and read the overlay text
- Look for the debug values (visibility scores, distances, thresholds, detection status)
- Compile into a table for analysis

## Example output (from March 2026 palm gesture tuning)

| Exercise | wrist-above | fingerVis | wristVis | Result |
|----------|-------------|-----------|----------|--------|
| Push-ups | 0.027 | 0.95 | 0.96 | no |
| Push-ups | 0.040 | 0.98 | 0.99 | DETECTED |
| Pull-ups | 0.185 | 0.90 | 0.96 | DETECTED |

This format makes it easy to spot patterns (e.g., "wrist-above is the gating factor") and decide which thresholds to adjust.

## Tips
- Debug overlays should be temporary — enable for tuning, remove when done
- 5-second intervals usually catch enough frames; go to 1-second if hunting a specific moment
- Phone recordings at 60fps produce large files; the frame extraction step compresses this dramatically
