# Animation + Picker Pipeline — Implementation Spec

**Status:** Approved for implementation (2026-04-17).
**Decision doc:** `docs/specs/animation-paradigm-evaluation.md` (Scott's 5 decisions locked in there).
**Owner:** next session.

---

## Goal

Replace the hand-authored `HOW_TO_KEYFRAMES` and the 7 shared picker SVGs with outputs from a single automated asset pipeline. Same pipeline also emits ROM baselines per exercise as a bonus output for smart calibration.

## Architecture

```
                   ┌──────────────────────┐
   source clip  →  │ extract_trajectory.py│  →  raw landmark dump (.npz)
   (Pexels/YT/    └──────────────────────┘
    self-film)                │
                              ▼
                   ┌──────────────────────┐
                   │  normalize_loop.py   │  →  assets/animations/<ex>.json
                   └──────────────────────┘       (canonical trajectory)
                              │
                              ├─→ emit_rom.py   →  assets/rom/<ex>.json
                              │
                              └─→ render_picker.py  →  assets/picker/<ex>.png
                                  (OR generate_picker.py via imagegen skill)
```

The **canonical trajectory JSON** is the single intermediate format. Every consumer reads from it; every source produces it.

## Canonical JSON schema

One file per exercise at `assets/animations/<exercise>.json`:

```json
{
  "exercise": "squat",
  "period_ms": 2000,
  "frame_count": 60,
  "landmarks": [
    [ [0.501, 0.112], [0.512, 0.108], ... ],  // frame 0 — 33 landmarks × [x, y]
    [ [0.501, 0.115], [0.512, 0.111], ... ],  // frame 1
    // ... 60 frames total
  ],
  "visibility": [
    [0.98, 0.97, ...],  // frame 0 — 33 values
    // ... 60 rows
  ]
}
```

**Format notes:**
- Coords normalized [0,1], matching MediaPipe JS output. Origin top-left.
- No `z` axis — current draw code is 2D; skip to save size.
- Visibility split into a separate array so replay code can skip loading it when only drawing is needed.
- Size target: <25KB per exercise uncompressed (~18KB gzipped by GitHub Pages). 22 × 25KB = 550KB total asset weight.

**ROM baseline schema** at `assets/rom/<exercise>.json`:

```json
{
  "exercise": "squat",
  "angles": {
    "knee": { "min": 72, "max": 175, "samples": 58 },
    "hip":  { "min": 68, "max": 172, "samples": 58 }
  }
}
```

Only angles relevant to each exercise (per `exerciseRegistry` config) are emitted. Samples count = frames where both landmarks had visibility > 0.6.

## Pipeline scripts

Lives in `pipeline/` (new top-level dir, not part of the deployed site).

### `pipeline/extract_trajectory.py`
- **Input:** path to local video file or YouTube URL.
- **Deps:** `mediapipe`, `opencv-python`, `yt-dlp` (YouTube only), `numpy`.
- **Steps:**
  1. If URL, `yt-dlp` downloads to `pipeline/.cache/<hash>.mp4`.
  2. Iterate frames with OpenCV; feed each to `mediapipe.solutions.pose.Pose(model_complexity=2, static_image_mode=False)`. Use `complexity=2` here — we want the highest-quality extraction offline, then the app runs at complexity 0 on-device.
  3. Collect per-frame landmark array: 33 × [x, y, visibility].
  4. Save raw dump as `.npz` (compressed NumPy archive) in `pipeline/raw/<exercise>.npz`.

### `pipeline/normalize_loop.py`
- **Input:** raw `.npz` dump + exercise metadata (which frames represent one full rep cycle).
- **Steps:**
  1. Trim to one full cycle (user picks frame range via small CLI inspector, or by default use the longest high-visibility contiguous segment).
  2. Resample to exactly 60 frames using linear time interpolation.
  3. Apply a light smoothing pass (3-frame moving average) to remove MediaPipe jitter.
  4. Check loop seam: if frame[0] and frame[59] differ by > threshold on any landmark, blend last 5 frames toward frame[0]. Flag exercises that need this blend for human review.
  5. Strip `z` axis. Emit canonical JSON.

### `pipeline/emit_rom.py`
- **Input:** canonical JSON + exercise config (which joint angles matter for this exercise — pulled from a new `pipeline/exercise_angles.yaml`).
- **Steps:**
  1. For each relevant joint trio (e.g., hip–knee–ankle for knee angle), compute angle per frame.
  2. Skip frames where any of the 3 landmarks has visibility < 0.6.
  3. Emit min/max + sample count.

### `pipeline/generate_picker.py`
- **Input:** exercise name + pose description from `pipeline/picker_prompts.yaml`.
- **Uses the `imagegen` skill** (DALL-E 3 or Replicate).
- **Prompt template:**
  ```
  Minimalist solid-black silhouette of a person doing a {exercise_name}.
  {pose_description}. Transparent background. No details, no face, no
  clothing patterns — pure silhouette. Centered, full body visible,
  8:10 aspect ratio. Same clean vector-style rendering as a fitness
  app icon.
  ```
- **Consistency strategy:** Run all 22 in one batch with the same template; manually review; re-prompt outliers. Budget ~$1 total for generation.

## Source acquisition

Create `pipeline/sources.yaml` listing one source URL per exercise. Scott curates this once (~2 hrs), pipeline runs from it.

**Acquisition order per exercise:**
1. Pexels (CC0, clean license) — search "<exercise> fitness demo" at pexels.com/videos.
2. Pixabay — same.
3. YouTube — if steps 1–2 produce nothing suitable. Pick a short (~10–30s) clip with good lighting, front-or-side view matching the exercise's expected camera angle, plain background, tight clothing, single person in frame.
4. Self-film — only flagged after pipeline run produces a broken trajectory (low visibility, occluded limbs, garbled loop seam).

**Expected coverage** based on clip availability:
- Pexels/Pixabay likely-covered: squat, lunge, pushup, plank, pike push-up, pull-up, dead hang, leg raise, glute bridge, row, cat-cow, bird-dog, pistol squat. (~13/22)
- YouTube likely-needed: dip, L-sit, scapular pull, arch hang, band pull-apart, shoulder dislocate, wrist warm-up, foam roller, hip flexor stretch. (~9/22)
- Self-film likely-needed: TBD — decide after first pipeline run.

## App-side changes (`index.html`)

Additive first, then subtractive. Keep tests green after each step.

### New: trajectory loader + cache
```js
const trajectoryCache = {};
async function loadTrajectory(ex) {
  if (trajectoryCache[ex]) return trajectoryCache[ex];
  const res = await fetch(`assets/animations/${ex}.json`);
  if (!res.ok) return null;
  const data = await res.json();
  trajectoryCache[ex] = data;
  return data;
}
```
Called on exercise change. Fire-and-forget — `drawHowToSkeleton` no-ops if trajectory not yet loaded.

### Rewrite: `drawHowToSkeleton(w, h, ex)`
- Read current trajectory from `trajectoryCache[ex]`; return if absent.
- Compute `t = (Date.now() % period_ms) / period_ms` → frame index `i = Math.floor(t * frame_count)`, next `j = (i + 1) % frame_count`, fractional `f = t * frame_count - i`.
- Interpolate 33 landmarks: `lerp(landmarks[i], landmarks[j], f)`.
- Draw using MediaPipe's `drawConnectors` + `POSE_CONNECTIONS` (same functions the live-user overlay uses — **visual consistency is a feature, not an accident**). Color: `rgba(96,165,250,0.88)`, line width 5.
- Skip any connector where either endpoint's visibility (averaged from frames `i`/`j`) is < 0.3.

### Picker image swap
- Replace `EXERCISE_SVGS` and `getSvgKey()` with a per-exercise PNG map: `PICKER_IMAGES[ex] = 'assets/picker/<ex>.png'`.
- Update `renderExercisePicker()` to use `<img src="${PICKER_IMAGES[ex]}">`.
- Keep `EXERCISE_SVGS` as fallback for any exercise whose PNG hasn't been generated yet (graceful degradation during staged rollout).

### Retirement
Once all 22 JSONs + PNGs exist and phone tests pass:
- Delete `HOW_TO_KEYFRAMES` (290 lines) and old `drawHowToSkeleton` body.
- Delete `assets/silhouettes/*.svg`, `EXERCISE_SVGS`, `getSvgKey()`.
- Consider `drawMiniSilhouette()` — if unreferenced after picker swap, delete.

### ROM baseline integration
- New `ROM_BASELINES` constant loaded from `assets/rom/*.json` on app init.
- Smart-calibration logic reads from `ROM_BASELINES[ex]` when available, falls back to warmup reps otherwise.
- Out-of-scope for v1: deciding whether to *skip* warmup entirely. For now, baseline is a hint that reduces warmup sensitivity, not a replacement.

## Test plan

**Unit (`tests.js`):**
- New tests for: trajectory JSON schema validation (shape, frame count, landmark count), interpolation math edge cases (frame 59 → frame 0 wrap), ROM baseline consumer logic.
- Existing 289 tests stay green.

**Playwright:**
- New spec `tests/playwright/exercises/animation-loading.spec.ts`:
  - Start at idle, assert a trajectory JSON was fetched (network stub).
  - Assert guide canvas has non-zero paint after trajectory loads.
  - Switch exercise, assert new JSON fetched.
- Existing 38 specs stay green.

**Phone test (Scott):**
- Per `docs/exercise-testing-protocol.md`, add an "animation legibility" check: does the blue skeleton read as the correct exercise at 6 feet?
- Picker cards: do 22 distinct images render cleanly in the picker modal?

## Implementation sequence

Numbered so the next session can check off as it goes.

1. Scaffold `pipeline/` directory: `requirements.txt`, `README.md`, empty `sources.yaml`, `picker_prompts.yaml`, `exercise_angles.yaml`.
2. Write `extract_trajectory.py`; smoke-test on one Pexels clip.
3. Write `normalize_loop.py`; verify output schema against a hand-written reference JSON.
4. Write `emit_rom.py`; verify knee angle min/max on squat trajectory falls in [70°, 180°].
5. Curate `sources.yaml` — 22 URLs. Start with Pexels search, fall back to YouTube. Flag unfound exercises.
6. Batch-run pipeline: `python run_all.py`. Produces 22 trajectory JSONs + 22 ROM JSONs in `assets/`.
7. Manual review: for each exercise, eyeball the trajectory by running `pipeline/preview.py <exercise>` — renders the loop in a window so Scott can approve. Re-run normalize with different frame trim if needed.
8. Write `generate_picker.py`; batch-generate 22 PNGs via imagegen skill. Manual review; re-prompt outliers.
9. App-side: add trajectory loader + cache; rewrite `drawHowToSkeleton`; keep old `HOW_TO_KEYFRAMES` as fallback.
10. App-side: swap picker map to PNGs; keep SVG fallback.
11. Run `node tests.js` + `npx playwright test`. All green.
12. Deploy to a dev branch, have Scott phone-test all 22.
13. If phone test passes: delete old keyframes, SVGs, fallbacks. Merge to `main`.
14. Add regression test for trajectory schema.

## Acceptance criteria

- All 22 exercises have a canonical trajectory JSON committed to `assets/animations/`.
- All 22 exercises have a picker PNG committed to `assets/picker/`.
- All 22 exercises have a ROM baseline JSON committed to `assets/rom/` (even if some are empty for non-rep exercises).
- `HOW_TO_KEYFRAMES` and `assets/silhouettes/*.svg` are deleted.
- 289+ unit tests pass; 38+ Playwright specs pass.
- Scott phone-tests all 22: skeleton reads as the correct exercise at 6 feet, picker cards are distinct, no thermal regression vs. current state.
- Adding exercise #23 in the future is: add a row to `sources.yaml` + `exercise_angles.yaml` + `picker_prompts.yaml`, run pipeline, commit. No hand-authored keyframes.

## Risks + mitigations

- **MediaPipe JS vs Python landmark drift.** Different model versions may output subtly different coords. *Mitigation:* use `complexity=2` Python-side (highest quality), `complexity=0` JS-side (fastest on-device) — same underlying 33-landmark topology. Accept minor smoothing drift as acceptable.
- **Loop seam artifacts.** A clip that doesn't naturally loop will pop at the seam. *Mitigation:* `normalize_loop.py` auto-blends last 5 frames toward frame 0; flags exercises needing human review.
- **Pipeline flakiness on niche exercises.** Wrist warm-up, scapular pulls may produce low-visibility extractions. *Mitigation:* decide per-exercise (Scott's decision 4) — self-film or retain 2-keyframe fallback.
- **imagegen style drift across 22 prompts.** DALL-E may produce inconsistent silhouettes even with a shared template. *Mitigation:* batch-review; re-prompt outliers; worst case, Scott hand-picks a style anchor image and uses image-to-image mode.
- **Thermal regression.** Unlikely (see decision doc §3) but must be verified on-device. *Mitigation:* Scott's phone test includes a 10-minute idle soak per `docs/exercise-testing-protocol.md`.

## Out of scope

- Replacing `drawStandingSide` / `drawHorizontalSide` / etc. — those are the alignment-tint static silhouette, a different layer.
- Replacing the live MediaPipe skeleton overlay on the user during workouts — already good.
- Full replacement of warmup calibration (ROM baseline feeds it; doesn't replace it).
- Video-file user-facing playback (rejected — see paradigm eval v1).
- Multi-angle per-exercise (if side + front views are both useful, that's a v2).
