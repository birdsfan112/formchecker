# Animation + Picker Image Paradigm Evaluation

**Status:** DRAFT for Scott's review — not a decision.
**Author:** Claude (investigation; no code changes).
**Date:** 2026-04-17.

**Scope note:** An earlier version of this doc evaluated four "show-the-user-a-human-doing-the-exercise" paradigms. Scott's clarification: the goal is **an automated asset pipeline** — sources are private inputs, outputs are derived assets (skeleton animations + picker images). This version reflects that.

---

## Problem

Two asset layers in FormChecker are hand-authored and low-quality:

1. **How-to animations** (`HOW_TO_KEYFRAMES` in `index.html:2642`): 22 exercises × 2 keyframes each, linearly interpolated on the guide canvas during idle. Only pull-ups look acceptable; the other 21 read as broken geometry. (See "Why only pull-ups" below.)
2. **Picker card silhouettes** (`assets/silhouettes/*.svg`): 7 hand-drawn SVGs covering 22 exercises via `drawStyle+drawVariant` mapping. Functional but generic — one SVG serves 3–5 exercises.

Scott's goals:
- **Automate as much as possible.** Minimize hand-authored frames, hand-drawn shapes, hand-tuned thresholds.
- **Both layers should be driven by the same pipeline** — pick a source per exercise, run it through an automated extraction pipeline, and emit picker image + animation + (optionally) calibration baseline as outputs of the same pass.
- **Sources are interchangeable** — online imagery, Mixamo rigged motion, self-filmed clips, stock video — whichever is cheapest per exercise.
- **User-facing output is still the app's own visual language** (MediaPipe-style skeleton for animations; clean stylized silhouette for picker) — raw source imagery is not shown.

---

## Current State

**How-to animations.** `HOW_TO_KEYFRAMES` is a JS object keyed by exercise: `{ period, frames: [frameA, frameB] }`, each frame a list of line segments in normalized 0–1 canvas coords. `drawHowToSkeleton(w, h, ex)` (index.html:2935) cosine-lerps between the two frames and strokes blue lines. Called from `drawGuide()` at line 3029 on the 7.5fps idle throttle.

*Why only pull-ups work:* Pull-ups are a front-view hanging exercise — the dominant motion is near-vertical translation of a rigid-ish torso between "arms extended" and "chin over bar." A 2-keyframe linear lerp approximates that trajectory well. Every other exercise has multi-joint rotational motion (squat: ankle+knee+hip arc; pushup: elbow+shoulder arc; lunge: asymmetric legs; catcow: spine curvature). Linearly interpolating segment endpoints does not trace those arcs — it slides line segments across each other, breaks limb-length preservation, and reads as broken geometry.

**Picker images.** `EXERCISE_SVGS` map + `getSvgKey(drawStyle, drawVariant)` (index.html:4528, 4545) — 7 SVGs in `assets/silhouettes/` assigned to one of: `standing`, `horizontal-plank`, `horizontal-pushup`, `hanging`, `kneeling`, `quadruped`, `quadruped-birddog`. This means multiple exercises share the same silhouette — e.g., every standing exercise (squat, lunge, pistol, dip, band pull-apart, shoulder dislocate, wrist warm-up) uses the same `standing.svg`. Acceptable today; weak identification at a glance.

**Constraints any replacement must respect.**
- Single-file `index.html` app — no build step for the app itself. A one-time asset-generation pipeline *outside* the app (Node/Python script) is fine.
- iOS Safari on a phone, 6+ feet away, MediaPipe Pose already running at `modelComplexity: 0`.
- GitHub Pages deploy on push to `main`.
- Existing layers that must NOT change: MediaPipe skeleton overlay on the live user during workouts, alignment-tint guide silhouette (`drawStandingSide`, etc.) — that's a separate layer.

---

## Paradigm: Automated Asset Pipeline

The common structure across every candidate below is:

```
┌────────┐   ┌────────────┐   ┌─────────────┐   ┌──────────────────┐
│ source │ → │  extractor │ → │ canonical   │ → │ three outputs:   │
│  per   │   │ (MediaPipe │   │ per-exercise│   │  • anim JSON     │
│exercise│   │ Pose, etc.)│   │ trajectory  │   │  • picker PNG/SVG│
└────────┘   └────────────┘   └─────────────┘   │  • ROM baseline  │
                                                 └──────────────────┘
```

The **canonical trajectory** is a JSON file per exercise: `N` frames × 33 landmarks × `[x, y, visibility]`, in normalized 0–1 coords. This is the same landmark format MediaPipe emits, so the on-device replay is a trivial extension of existing draw code. The picker image is one stylized frame from the same trajectory (or a separately generated silhouette). The ROM baseline is the min/max of the relevant joint angle across the trajectory.

Candidates differ only in **where the source comes from**. Extractor, canonical format, and outputs are shared.

---

## Candidate Comparison

| Dimension | A. Pose-extract from self-filmed | B. Pose-extract from Mixamo | C. Pose-extract from online video | D. AI image gen for picker + keep current anim |
|---|---|---|---|---|
| **Automation level** | Medium. Scott films once (~2–3 hrs), pipeline does the rest. Re-filming required for any exercise change. | High. Pipeline downloads FBX, renders via headless three.js/Blender, extracts landmarks. Zero filming. | Highest. Pipeline queries a URL or YouTube ID, downloads clip, runs MediaPipe, emits JSON. Fully hands-off. | Very high for picker (one imagegen call per exercise). Zero improvement for animations. |
| **22-exercise coverage** | 22/22 by construction. | ~5–8/22. Common lifts only. Band pull-aparts, scapular pulls, foam roller, wrist warm-ups, arch hang, shoulder dislocates unlikely to exist. | 22/22 in principle — YouTube has everything. Quality varies; some "scapular pull tutorial" clips are low-light, cluttered, or partial-body and break MediaPipe extraction. | Picker: 22/22 via DALL-E/Replicate. Animations: still broken (21/22 still hand-authored). |
| **Output quality ceiling** | Highest. Real human motion, real limb lengths, matches Scott's own ROM. | High. Mocap-quality, anatomically correct, clean. May look "generic rig." | Medium–high. Depends on clip quality. Best clips rival self-film; worst are unusable. | Picker quality high (imagegen is mature). Animation quality unchanged. |
| **Licensing + cost** | Free, Scott owns it. No review needed. | Free (Mixamo TOS permits commercial). Adobe may sunset Mixamo someday but existing exports remain usable. | **Gray zone.** Shipping landmark trajectories derived from copyrighted video is legally ambiguous. We ship no pixels — only coordinates — but the derivation is from a copyrighted work. Low practical risk for a hobby app, real risk if it grows. | AI image gen: per-image API cost (~$0.04/image × 22 = ~$1). License clean. |
| **Pipeline complexity** | Medium. Video → MediaPipe Pose Python API → trajectory JSON. ~100 lines of Python. | High. FBX loader + headless 3D rendering + 2D projection to match the app's camera angles per exercise. ~300 lines + Blender dependency. | Medium. `yt-dlp` or `ffmpeg` to grab a clip + MediaPipe Pose. ~150 lines of Python. | Low. `imagegen` skill is already wired. Animation side = no pipeline work, just accepts current state. |
| **Failure modes** | Scott's form in one take becomes "the reference." If the take is imperfect, it's baked in until he re-films. | Mixamo clips framed inconsistently across exercises; projecting to MediaPipe coords requires per-exercise camera setup. | Source clip quality is heterogeneous. Need to hand-pick a good clip per exercise (partial automation). Pose extraction fails on dim lighting, baggy clothing, partial body. | Animations stay broken. Only addresses half the problem. |
| **Maintenance** | Re-film if Scott wants to tweak. Batch-re-process is free. | Swap FBX, re-run pipeline. Zero-touch if pipeline is stable. | Swap clip URL, re-run pipeline. Zero-touch. | Per-image re-gen is one imagegen call. |
| **Fits single-file constraint** | Yes — JSON files in `assets/animations/` (~5–20KB each, ~200–400KB total). | Same. | Same. | Same. |
| **Time to first demo** | 1 filming session + 2 days pipeline = ~3 days. | 4–5 days (Blender/three.js integration). | 2–3 days. | Hours for picker; animations unchanged. |

---

## Recommendation

**Primary: Hybrid C+A with D for the picker layer.**

Concretely:

1. **Picker images → AI generation (D).** Use the existing `imagegen` skill to generate 22 pose-specific silhouette PNGs, one per exercise, in a consistent art style. One pass, ~$1, ~1 hour of prompt iteration. Replaces the 7-to-22 SVG mapping with true per-exercise imagery.
2. **Animations → online video extraction first, self-film fallback (C primary, A fallback).**
   - For each of the 22 exercises, hand-pick one well-framed YouTube or Pexels clip (~5 min of curation per exercise = ~2 hours).
   - Run a shared extraction pipeline: clip → MediaPipe Pose → landmark trajectory JSON → loop-clean → commit to `assets/animations/<exercise>.json`.
   - For any exercise where online sources produce broken trajectories (bad lighting, partial body, occlusion), Scott films that one exercise himself. Expect this to be 3–8 exercises out of 22, not all 22.
3. **Replay code.** Rewrite `drawHowToSkeleton(w, h, ex)` to read from the per-exercise JSON and interpolate across N real frames (30–60) instead of 2 hand-placed ones. The app-side change is additive; the old `HOW_TO_KEYFRAMES` gets deleted when all 22 JSON files are committed.

### Why this hybrid over pure candidates

- **C alone** has a licensing gray zone and quality heterogeneity that can't be resolved without some manual fallback. Gray zone is fine for private prototype data; A catches anything C can't.
- **A alone** requires Scott to film all 22 exercises. Good output, but 2–3 hours of filming + setup is expensive if C can do 80% of the work for free.
- **B (Mixamo)** is tempting but its coverage gap (8/22) means we'd still need C or A as the primary — so B is strictly dominated by C for this job.
- **D for picker only** is clearly the right move for that layer: low cost, high quality, mature tooling already wired up via `imagegen`.

### What this buys Scott beyond what the old paradigm did

- **Real motion, not hand-placed endpoints.** The skeleton actually moves through the correct joint arcs — squats sit back, lunges step through, cat-cows curve the spine.
- **Limb lengths preserved.** Because trajectories come from real pose landmarks, the skeleton doesn't stretch mid-rep.
- **Calibration baseline for free.** The same trajectory files yield min/max joint angles — a starter ROM for calibration per exercise. Reduces the "warmup calibration" burden and is a bonus Phase 5 cleanup.
- **Consistent picker art.** 22 distinct images instead of 7 shared silhouettes — users can tell exercises apart at a glance.
- **Future-proof.** New exercise = add a source URL + run pipeline. No hand-authored 2-keyframe lerp.

---

## Migration Outline

High-level only. Follow-on implementation spec required before code.

1. **Define canonical trajectory format.** JSON schema: `{ period_ms, frames: [ [ [x,y,vis], ...33 ], ...N ] }`. One file per exercise.
2. **Build the extraction pipeline.** Python script (MediaPipe Pose Python bindings). Input: path to video file or URL. Output: canonical JSON. Bonus outputs: a still frame for picker input, ROM min/max summary.
3. **Source acquisition.** Per-exercise table — for each of 22 exercises, pick an online clip URL. Start with Pexels / Pixabay (license-clean); fall back to YouTube; fall back to self-film.
4. **Run pipeline.** Commit one JSON per exercise to `assets/animations/`. Commit one PNG per exercise to `assets/picker/`.
5. **App-side replay.** Rewrite `drawHowToSkeleton` to load the JSON and interpolate across N frames. Read once per exercise change, cache in memory.
6. **Replace picker image map.** Swap `EXERCISE_SVGS` for a per-exercise PNG map. Keep `getSvgKey` as a fallback for exercises that haven't been regenerated yet.
7. **Retire hand-authored assets.** Delete `HOW_TO_KEYFRAMES`, the 7 SVGs in `assets/silhouettes/`, and the `drawMiniSilhouette` function if unused.
8. **Acceptance test.** Phone test all 22 per `docs/exercise-testing-protocol.md` + Playwright spec for "idle shows skeleton animation."

### Scott's decisions (2026-04-17)

1. **YouTube is an allowed source.** Shipping landmark coordinates (not pixels) is acceptable for a hobby-scale app. Pipeline tries Pexels/Pixabay first (clean license), falls back to YouTube when stock coverage is thin.
2. **Picker art style: minimalist silhouette** — solid-color silhouette on transparent background, matching the current visual language. Cheapest imagegen prompt to keep consistent across 22 images.
3. **Trajectory length: 60 frames (~2s loop).** ~20KB per exercise, ~350KB total for 22. Thermally equivalent to the current 2-keyframe version — frame rate at render time is unchanged (still on the 7.5fps idle throttle); "60 frames" is just how many poses are *stored* in the JSON, not drawn per second.
4. **Self-film budget: decide per-exercise.** Run the pipeline on all 22 online sources first. Review the failures together. Decide case-by-case whether each failure is worth filming, rigging, or dropping.
5. **ROM baseline: yes, as a bonus output of the same pipeline pass.** Trajectory JSON already has every joint angle per frame — computing min/max per exercise is free. Feeds the existing smart-calibration logic; may reduce or eliminate warmup calibration for affected exercises.

---

## What's NOT in this doc

- Implementation detail (exact Python deps, frame rate, file sizes beyond ballparks). Follow-on spec.
- Changes to MediaPipe skeleton overlay on the live user, or to the alignment-tint guide silhouette. Separate layers; unchanged.
