# Pipeline

Offline asset pipeline. Input: one video source per exercise (Pexels, Pixabay, YouTube, or self-filmed). Output: three committed artifacts per exercise in `../assets/`:

- `assets/animations/<exercise>.json` — 60-frame looped landmark trajectory
- `assets/rom/<exercise>.json` — joint-angle min/max baseline
- `assets/picker/<exercise>.png` — minimalist silhouette for the picker card

See `docs/specs/animation-pipeline-implementation.md` for the spec.

## Setup

```
cd pipeline
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
```

## Layout

```
pipeline/
  requirements.txt
  sources.yaml            # exercise -> source URL + trim range (Scott curates)
  picker_prompts.yaml     # exercise -> pose description for imagegen
  exercise_angles.yaml    # exercise -> joint triplets for ROM extraction
  extract_trajectory.py   # source clip -> raw .npz (MediaPipe complexity=2)
  normalize_loop.py       # raw .npz -> assets/animations/<ex>.json
  emit_rom.py             # canonical JSON -> assets/rom/<ex>.json
  generate_picker.py      # picker_prompts entry -> assets/picker/<ex>.png (via imagegen skill)
  .cache/                 # yt-dlp downloads (gitignored)
  raw/                    # .npz intermediate dumps (gitignored)
```

## Run one exercise end-to-end

```
python extract_trajectory.py --exercise squat
python normalize_loop.py    --exercise squat
python emit_rom.py          --exercise squat
python generate_picker.py   --exercise squat
```

## Front-view exercises

`auto_detect_cycle` in `normalize_loop.py` autocorrelates pelvis y to find one
rep. That works for side-view standing exercises (squat, lunge, pushup) where
the hips rise and fall clearly. Front-view `hanging_front` preset exercises —
**pullup, deadhang, archhang, scapularpull** — often don't move the pelvis
much; their dominant signal is elbow angle or shoulder position.

If `normalize_loop.py` prints

```
[warn] detected cycle lag at floor (N frames); this often means no clear rep was detected.
```

…autocorrelation didn't find a peak. The resulting "cycle" is a ~9-frame
spurious window. Fix it with manual bounds:

```
python normalize_loop.py --exercise pullup --preset hanging_front \
    --start-frame 30 --end-frame 120
```

Eyeball the raw `.npz` or the source clip to pick start/end. Trimming from a
top-of-hang frame to the next top-of-hang frame gives the cleanest loop.

## Landmark indices

MediaPipe Pose 33-landmark model. Common joints (left side):

| Index | Landmark |
|-------|----------|
| 0     | nose     |
| 11    | l shoulder |
| 12    | r shoulder |
| 13    | l elbow  |
| 14    | r elbow  |
| 15    | l wrist  |
| 16    | r wrist  |
| 23    | l hip    |
| 24    | r hip    |
| 25    | l knee   |
| 26    | r knee   |
| 27    | l ankle  |
| 28    | r ankle  |

Angle at B, given triplet A-B-C, is computed from vectors BA and BC.
