# Spec: Unified Exercise Signature Schema

**Date:** 2026-04-20
**Type:** Feature (Refactor + schema formalization)
**Priority:** High (Step 5.6 of the active asset-pipeline sprint)
**Estimated Complexity:** Large (4hr+ across Commits A/B; C is per-exercise regen; D is a delete pass)
**Owner:** next session
**Supersedes nothing. Extends:** `docs/specs/animation-pipeline-implementation.md`

---

## 1. Goal and Motivation

> **2026-04-20 update — picker silhouette consolidation REVERTED after phone review.** Runtime-Canvas picker silhouette was shipped and reverted same-day. Root cause: at 70x62px, front-view crouched poses (squat bottom, pullup chin-over-bar) don't read as iconic exercise silhouettes — side-view SVGs carry the motion signature that the eye recognizes. Schema kept intact; picker stays on `EXERCISE_SVGS` + `getSvgKey`. Signature still drives how-to animation, ROM, phase markers, and future scoring. Sections 7.2, 12.5, and 16 describe what was built then removed — preserved below for archival.

Consolidate per-exercise asset data that today lives in two files (`assets/animations/<ex>.json`, `assets/rom/<ex>.json`) plus hardcoded picker silhouettes inside `index.html` (`EXERCISE_SVGS`, `getSvgKey`), into a single canonical "exercise signature" file at `assets/animations/<ex>.json`. Same path, additive fields.

A signature is **everything a consumer needs to know about an exercise that was derived from a reference clip**: reference pose trajectory, per-joint angle timeseries, ROM, phase markers, MediaPipe version provenance. It is data, not algorithms.

### The five current consumers (must keep working)
1. **How-to animation** — `drawHowToSkeletonFromTrajectory` in `index.html` (~line 2957).
2. **Picker silhouette** — today rendered from `EXERCISE_SVGS` (~line 4609) via `getSvgKey` (~line 4626) in `renderExercisePicker` (~line 4636). After this spec, rendered at runtime from signature landmarks onto a `<canvas>`.
3. **ROM baseline** — today a pipeline-internal file consumed only by smart-calibration logic that has not yet been wired up. Signature exposes the same numbers to any consumer.
4. **Keyframe fallback** — `HOW_TO_KEYFRAMES` (index.html ~line 2642) + `drawHowToSkeletonFromKeyframes` (~line 3000). Preserved unchanged as a graceful-degradation path when a signature is missing or malformed.
5. **Playwright mock** — `mockTrajectory` helper in `tests/playwright/exercises/_helpers.ts` (line 336). Already mocks the animations endpoint; extends to cover new fields.

### The two future consumers (design for, do not build)
6. **Multi-canonical enrichment** (Step 5.7) — multiple reference reps per exercise to feed a MediaPipe k-NN body-proportion matcher during warmup ("which reference rep does this user's body most resemble?"). Signature already wraps reps in an array to make this additive.
7. **Post-set / post-workout feedback** (Phase 5.x / 6) — rep-by-rep scoring, phase-aligned form comparison, joint-weighted similarity. `phases[]`, `angle_timeseries{}`, and `joint_weights{}` are all placeholders that v1 fills minimally but locks the shape for.

---

## 2. Current State

| Artifact | Path | Produced by | Consumed by |
|---|---|---|---|
| Trajectory JSON | `assets/animations/<ex>.json` | `pipeline/normalize_loop.py` | `loadTrajectory`, `drawHowToSkeletonFromTrajectory` in `index.html` |
| ROM JSON | `assets/rom/<ex>.json` | `pipeline/emit_rom.py` | Nothing in `index.html` yet (smart-calibration consumer is planned but unwired) |
| Picker SVGs | embedded in `index.html` as `EXERCISE_SVGS` (7 shared shapes for 22 exercises) | hand-authored | `renderExercisePicker` |
| Keyframe fallback | embedded in `index.html` as `HOW_TO_KEYFRAMES` | hand-authored | `drawHowToSkeletonFromKeyframes` |
| Raw landmark dump | `pipeline/raw/<ex>.npz` | `pipeline/extract_trajectory.py` | `normalize_loop.py` (input), `emit_rom.py` reads via the JSON (not .npz) |

Trajectory JSON today has 5 fields: `exercise`, `period_ms`, `frame_count`, `landmarks: [60][33][x,y]`, `visibility: [60][33]`. ROM JSON has 2 fields: `exercise`, `angles: { <name>: { min, max, samples } }`. There is **no schema version**, no provenance, no phase info, no angle timeseries, no joint weights.

Shipped signatures exist for squat + pullup only (2/22).

---

## 3. Goal (Outcomes)

When this work is done:

- `assets/animations/<ex>.json` is a single source of truth for everything the app needs to know about an exercise's reference pose.
- The file carries a `schema_version` integer, a `canonical_reps[]` array (1 entry in v1, N in 5.7), a `phases[]` array, per-joint `angle_timeseries{}`, optional `joint_weights{}`, and full MediaPipe provenance.
- The picker renders silhouettes at runtime from the signature (no more 7-shared-SVG fallback). `EXERCISE_SVGS` and `getSvgKey` are deletable once all 22 signatures ship.
- `HOW_TO_KEYFRAMES` continues to serve as the last-resort fallback. Signatures are additive; consumers degrade gracefully when fields are missing.
- ROM values in the signature are explicitly labelled advisory — the live warmup calibration in `analyzeWarmup` / `applyAllCalibrationResults` still wins.
- Version drift between the app's MediaPipe build and the signature's extraction build triggers a `console.warn` (not an error).
- Adding future multi-canonical reps, joint weights, or phase breakdowns does not require a schema bump.

---

## 4. Approach

### 4.1 The signature schema (v1)

Stored at `assets/animations/<ex>.json`. Minified on disk (`json.dump(..., separators=(",",":"))`). Numeric precision preserved from today: landmarks 3 decimals, visibility 2 decimals, angles 1 decimal.

```jsonc
{
  "schema_version": 1,
  "exercise": "squat",
  "bilateral": true,
  "mirror_source": false,

  "provenance": {
    "mediapipe_model_name": "pose_landmarker_heavy",
    "mediapipe_model_sha256": "a1b2c3...",
    "mediapipe_js_version": "0.5.1675469404",
    "source_url": "https://www.pexels.com/video/woman-doing-a-squat-exercise-5025965/",
    "source_provider": "pexels",
    "extracted_at": "2026-04-20T14:12:03Z",
    "pipeline_preset": "standing"
  },

  "canonical_reps": [
    {
      "rep_id": 0,
      "period_ms": 3000,
      "frame_count": 60,
      "landmarks":  [ [ [0.501,0.112], ... ], ... ],   // [60][33][x,y], 3dp
      "visibility": [ [0.98, 0.97, ... ], ... ],        // [60][33], 2dp
      "angle_timeseries": {
        "knee": [173.5, 172.9, ... ],                   // [60], 1dp
        "hip":  [175.5, 174.1, ... ]
      },
      "phases": [
        { "name": "top",    "frame_idx": 0  },
        { "name": "bottom", "frame_idx": 29 }
      ],
      "rom_advisory": {
        "knee": { "min": 72.0, "max": 173.5, "samples": 58 },
        "hip":  { "min": 68.0, "max": 172.0, "samples": 58 }
      }
    }
  ],

  "joint_weights": {}
}
```

#### 4.2 Field-by-field rationale

| Field | Type | Required | Consumer | v1 value | Rationale |
|---|---|---|---|---|---|
| `schema_version` | int | yes | all | `1` | Hard-gated at load. Bump = breaking change. |
| `exercise` | string | yes | all | matches filename stem | Redundant sanity check; already present today. |
| `bilateral` | bool | yes | future (5.x asymmetric specs) | `true` | All 22 current exercises are bilateral. Future side-plank/single-arm-row sets `false`. |
| `mirror_source` | bool | yes | future | `false` | Signal for side-asymmetric exercises where the source clip faces the "wrong" side; lets the draw code horizontally flip on demand. Unused in v1. |
| `provenance.mediapipe_model_name` | string | yes | version-check | `"pose_landmarker_heavy"` | Pipeline uses the Tasks API heavy model (see `pipeline/extract_trajectory.py`). |
| `provenance.mediapipe_model_sha256` | string | yes | version-check | sha256 of `pose_landmarker_heavy.task` at extraction time | Detects model-file drift. |
| `provenance.mediapipe_js_version` | string | yes | version-check | pin from `index.html` line 357 (`@mediapipe/pose@0.5.1675469404`) — see Open Question 1 | App-side warn when loaded signature was extracted under a different JS version. |
| `provenance.source_url` | string | yes | audit | from `pipeline/sources.yaml` | Traceability. |
| `provenance.source_provider` | string | yes | audit | from `sources.yaml` | Traceability. |
| `provenance.extracted_at` | ISO8601 string (UTC) | yes | audit | `datetime.now(timezone.utc).isoformat()` at normalize time | Lets us spot stale signatures. |
| `provenance.pipeline_preset` | string | yes | audit | one of `standing` / `hanging_front` / future presets | Reproduces normalize run. |
| `canonical_reps` | array | yes | how-to anim, picker, post-set (future) | 1 element in v1 | Array wrapper is the structural hedge — Step 5.7 grows to N. See §5. |
| `canonical_reps[i].rep_id` | int | yes | future | `0` | Stable id across regenerations. |
| `canonical_reps[i].period_ms` | int | yes | how-to anim | `3000` (squat), exercise-specific | Loop period for `drawHowToSkeletonFromTrajectory`. Already present today. |
| `canonical_reps[i].frame_count` | int | yes | how-to anim, picker | `60` | Fixed. Already present today. |
| `canonical_reps[i].landmarks` | `[60][33][x,y]` float | yes | how-to anim, picker | 3dp rounded | Identical shape to today's top-level `landmarks` — just nested one level. |
| `canonical_reps[i].visibility` | `[60][33]` float | yes | how-to anim, picker | 2dp rounded | Identical shape to today's top-level `visibility`. |
| `canonical_reps[i].angle_timeseries` | `{ name: [60] float }` | yes | phase auto-detect, post-set (future) | 1dp per-frame angle per configured joint | ~5 KB/exercise. Stored so consumers don't recompute on load. Empty dict allowed for exercises with no angles configured (foam roller, wrist warmup). |
| `canonical_reps[i].phases` | `[{name, frame_idx}]` | yes | how-to anim cue timing (future), post-set | v1 emits 2: `top` + `bottom` | Array, not scalar `{top, bottom}`. Future post-workout scoring wants 4 phases (start/descent/bottom/ascent/top). |
| `canonical_reps[i].rom_advisory` | `{ joint: {min,max,samples} }` | optional | smart-calibration (advisory only) | identical to today's `assets/rom/*.json` inner `angles` block | Renamed from `angles` → `rom_advisory` to flag the boundary: **live warmup beats this**. See §6. |
| `joint_weights` | `{ joint: float }` | optional | post-set similarity (future) | `{}` in v1 | Future weighted similarity scoring. Empty dict keeps product decisions out of code. |

#### 4.3 Estimated size per signature

Back-of-envelope, v1 (single canonical rep):
- Landmarks: 60 × 33 × 2 × 6 chars (incl. commas/brackets) ≈ 24 KB
- Visibility: 60 × 33 × 5 chars ≈ 10 KB
- Angle timeseries: 2 joints × 60 × 6 chars ≈ 1 KB (5 KB if a future exercise has 5 joints)
- Phases + provenance + rom_advisory + wrapper keys: ~1 KB
- **Total: ~36 KB uncompressed** (vs. current 35.7 KB for `squat.json`). ~25 KB gzipped on GitHub Pages.
- 22 exercises × ~36 KB = ~790 KB uncompressed / ~550 KB gzipped. Acceptable; still within the original `<25 KB * 22` aspiration on wire weight.

Step 5.7 with N=3 canonical reps would push a single file to ~100 KB uncompressed / ~70 KB gzipped. Still fine for a once-per-exercise fetch.

---

## 5. Structural hedges (mandatory in v1, baked-in)

Scott confirmed these up front; they are not open for rediscussion:

1. **`canonical_reps: [...]` wraps the trajectory as an array, not a scalar.** V1 always `len(canonical_reps) == 1`. Step 5.7 grows to N. Locking a scalar would force a breaking v2 bump.
2. **`phases: [{name, frame_idx}]` array, not `{top: N, bottom: M}` scalar.** V1 emits exactly two entries (`top`, `bottom`). Future post-workout feedback can add `descent`, `ascent`, or `start` without a schema break.
3. **`joint_weights: {}` optional field, empty dict in v1.** Future weighted-similarity code reads it; v1 code ignores it.
4. **`sources.yaml` entries take a `urls: [list]`, not `url: scalar`.** V1 always `len(urls) == 1`. Step 5.7 extends. **Migration rule:** normalize both `url` (scalar, legacy) and `urls` (list) at load time — do not break existing rows.
5. **`normalize_loop.py` CLI accepts a list of `.npz` inputs** via repeated `--raw <path>` flags, emitting a signature with N `canonical_reps`. V1 passes a single-element list. If zero `--raw` flags are given, default to `pipeline/raw/<exercise>.npz` (preserves today's behaviour).

---

## 6. Advisory vs. prescriptive boundary (critical)

The signature is **DATA**. It must not carry:

- Scoring thresholds (e.g., "count a rep when knee < X°").
- Rep-counter smoothing alpha.
- Grading bands (good/ok/bad angle cutoffs).
- Any voice-coaching cue timing.

Those live in the app (`calibration`, `exerciseRegistry`, `analyzeWarmup`, `applyAllCalibrationResults`) and remain authoritative.

**ROM in the signature is ADVISORY.** `rom_advisory` is what the reference clip's performer did — not what the current user should do. The live pipeline flow is unchanged:

1. `analyzeWarmup` (index.html ~1969) collects the user's valleys + peaks over 3 reps.
2. `applyAllCalibrationResults` (~2092) writes the user-specific thresholds into `calibration[ex]`.
3. Rep-scoring code reads `calibration[ex]` — it does NOT read `rom_advisory` at scoring time.

**Per-user ROM beats per-clip ROM, always.** Document this in:
- A top-of-file comment in `emit_rom.py` (when it still exists).
- A short comment block above `rom_advisory` usage wherever it is eventually read in `index.html`.
- The schema spec section in this document.

**Consumers must handle missing fields gracefully.** Any code reading a signature assumes fields may be absent (old files, forward-compat). Pattern:

```js
const reps = sig?.canonical_reps ?? [];
const rep0 = reps[0];
if (!rep0) { /* fall through to keyframe path */ return; }
const period = rep0.period_ms ?? 3000;
```

---

## 7. MediaPipe version tracking

Every signature carries `provenance.mediapipe_model_name`, `mediapipe_model_sha256`, `mediapipe_js_version`, and `extracted_at`. On load, the app compares the signature's `mediapipe_js_version` against its own pinned version (derived from a new `APP_MEDIAPIPE_VERSION` constant sourced from the existing `<script src="...@mediapipe/pose@X.Y.Z/pose.js">` tag at `index.html` line 357).

On mismatch: `console.warn` with signature name + both versions. **No breaking behaviour.** Future work may promote this to a UI indicator; v1 is just the log hook.

**SHA256 computation:** `normalize_loop.py` adds a helper that reads the model file from `pipeline/.cache/pose_landmarker_heavy.task` and computes `hashlib.sha256(open(path,'rb').read()).hexdigest()`. Cached in memory between exercises in a batch run so we don't rehash 22 times. Falls back to `"unknown"` if the model file is missing (with a warning).

---

## 8. Risks & Mitigations (from investigate phase)

### 8.1 `HOW_TO_KEYFRAMES` fallback must not regress
Signatures are additive. `drawHowToSkeleton` already has the right shape: it picks trajectory if loaded, else keyframes. Do **not** delete `HOW_TO_KEYFRAMES` or `drawHowToSkeletonFromKeyframes` in this sprint. Their retirement is a separate commit (already tracked under Step 5.5 "Delete `HOW_TO_KEYFRAMES` …").

### 8.2 ROM file sunset timing
Do not delete `assets/rom/*.json` in the same commit that lands `rom_advisory`. Emit to **both** files during transition so any rogue consumer that still reads `assets/rom/<ex>.json` keeps working. Delete `assets/rom/` only in Commit D, once:
- All 22 signatures are shipped.
- `index.html` and `tests.js` have been grep'd for any remaining reference.
- `emit_rom.py` has been either deleted or demoted to "legacy compat" with a deprecation banner.

### 8.3 `.npz` raw-cache persistence
Confirmed: `pipeline/raw/*.npz` exists on-disk and is gitignored (`.gitignore` lines 35–36). Between runs on one machine, `normalize_loop.py` re-reads the cached `.npz` — no re-download of source videos. **But** the cache does not travel between dev machines or CI. Spec implication: regenerating all 22 signatures from scratch on a fresh checkout requires running `extract_trajectory.py` for all 22 first (re-downloads source videos, ~5–10 min total at Pexels speeds). Document this in `pipeline/README.md`; do not change caching behaviour in this sprint.

### 8.4 Mobile Canvas perf (picker silhouettes)
22 picker cards rendered at runtime from signature landmarks could jank on older phones, especially if the picker modal scrolls. Mitigation mandated in this spec:

- `renderExercisePicker` renders each silhouette once into an offscreen `<canvas>`, then calls `.toDataURL('image/png')` and caches the result in a module-scope `pickerSilhouetteCache = {}` keyed by exercise id.
- First render is the only cost; subsequent picker opens reuse the data URL.
- If the picker is opened before the signature for that exercise has loaded (`trajectoryCache[ex]` is undefined or null), fall back to the existing `EXERCISE_SVGS[getSvgKey(...)]` path — the card renders "something correct enough" immediately, then is replaced on next picker open once the signature lands.
- **Fallback fallback:** if on-device perf is bad even with caching (phone test surfaces it), add a build-time PNG pre-render step (revive the retired `generate_picker.py`). Track as a follow-up, not part of v1.

### 8.5 Handedness / laterality
All 22 current exercises are bilateral. Future side-plank, single-arm row, etc. require `bilateral: false` + `mirror_source: bool` semantics. Both fields are defined in v1 and default to `true` / `false` respectively. Draw code must already handle `mirror_source: true` by horizontally flipping landmarks at paint time (spec only; no v1 exercise needs it).

---

## 9. Phase-marker auto-detection

Phases are detected from the primary angle's timeseries in `angle_timeseries[primary_angle]`. "Primary" is the first entry in `exercise_angles.yaml` for the exercise. Pseudocode in `normalize_loop.py`:

```python
primary = angle_defs[0]["name"]              # e.g. "knee" for squat
series = angle_timeseries[primary]           # length 60
top_frame    = int(np.argmax(series))        # most-extended joint
bottom_frame = int(np.argmin(series))        # most-flexed joint
phases = [
    {"name": "top",    "frame_idx": top_frame},
    {"name": "bottom", "frame_idx": bottom_frame},
]
```

**Override hook:** if `sources.yaml`'s entry for that exercise contains a `phases_override` key (list of `{name, frame_idx}` dicts), the pipeline uses it verbatim. Unused in v1 but wired so Scott can hand-label edge cases without code changes.

**Timed / static-hold exercises** (plank, deadhang, L-sit, etc.) have no meaningful extrema. For those, `phases` is emitted as `[{"name": "hold", "frame_idx": 0}]` — a one-phase signal that consumers can treat as "no phasing". Detection rule: `angle_timeseries[primary]`'s `max - min < 10°` → treat as timed; emit single `hold` phase.

---

## 10. Migration plan (ordered commits)

### Commit A — Pipeline emits signatures; legacy ROM file still written
- `pipeline/normalize_loop.py`:
  - Accept `--raw <path>` repeated flag (default: `pipeline/raw/<exercise>.npz`).
  - For each `.npz`, produce one `canonical_rep` dict.
  - Compute `angle_timeseries` inline (imports `emit_rom.angle_deg` and `emit_rom.load_angle_config`).
  - Compute `phases` via §9 algorithm.
  - Gather provenance: sha256 of `pipeline/.cache/pose_landmarker_heavy.task`, JS version from a new top-of-file constant (`MEDIAPIPE_JS_VERSION = "0.5.1675469404"`), `extracted_at = now(UTC).isoformat()`, `source_url` + `source_provider` from `sources.yaml`, `pipeline_preset = args.preset`.
  - Emit the nested signature JSON.
- `pipeline/emit_rom.py`:
  - Unchanged external contract; still emits `assets/rom/<ex>.json`.
  - Add a top-of-file deprecation banner.
  - Add a new helper `compute_rom_advisory(trajectory, angle_defs) -> dict` that returns the inner `angles` dict in the shape used by both the legacy file and `rom_advisory`. `normalize_loop.py` imports this helper so the two paths never drift.
- `pipeline/sources.yaml`:
  - Accept either `url: <string>` (legacy) or `urls: [<string>]` (forward-compat). Loader normalizes to list.
- New: `pipeline/lib/provenance.py` — small helper module for sha256 + version lookup (avoids bloating `normalize_loop.py`).

### Commit B — App-side consumers updated
- `index.html`:
  - `loadTrajectory` (~2938): no shape change, but add a post-fetch `validateSignature(data)` helper that:
    - Logs `console.warn` if `data.schema_version !== 1`.
    - Logs `console.warn` if `data.provenance?.mediapipe_js_version !== APP_MEDIAPIPE_VERSION`.
    - Returns the data unchanged in both cases (advisory only).
  - `drawHowToSkeletonFromTrajectory` (~2957): read from `traj.canonical_reps[0]` if present, else from the top-level `landmarks`/`visibility`/`period_ms`/`frame_count` (back-compat for any un-regenerated signature). One helper: `getActiveRep(sig)`.
  - New constant: `APP_MEDIAPIPE_VERSION = "0.5.1675469404"` at the top of the mediapipe-init section.
  - `renderExercisePicker` (~4636): for each card, attempt `renderPickerSilhouetteFromSignature(key)` (new function). On miss, fall back to existing `EXERCISE_SVGS` + `getSvgKey` path.
  - New `renderPickerSilhouetteFromSignature(ex)`:
    - Read `trajectoryCache[ex]`. If absent/malformed → return null.
    - Pick frame index from `phases[]` (prefer the `top` phase for standing exercises, `hold` for timed, else frame 0).
    - Draw connectors + joints on an offscreen 70×62 canvas (same dimensions as today's SVG img).
    - `toDataURL('image/png')` → cache in `pickerSilhouetteCache[ex]`.
    - Return the data URL.
  - Keep `EXERCISE_SVGS`, `getSvgKey`, `HOW_TO_KEYFRAMES`, `drawHowToSkeletonFromKeyframes` in place. Do not delete.

### Commit C — Regenerate squat + pullup signatures; phone review
- Re-run `pipeline/normalize_loop.py --exercise squat` and `--exercise pullup` on cached `.npz` dumps.
- Spot-check the resulting JSON keys + sizes.
- Deploy to `main` (GitHub Pages auto-deploy).
- Scott phone-tests: (1) how-to animation unchanged visually; (2) picker silhouettes render correctly for squat + pullup and still fall back to SVG for the other 20; (3) version-mismatch warn path fires if we temporarily bump `APP_MEDIAPIPE_VERSION`.

### Commit D (later, gated on all 22 shipping) — ROM file sunset
- Delete `assets/rom/*.json` and `pipeline/emit_rom.py`'s `main()` (keep `compute_rom_advisory` + `angle_deg` as the library import).
- Remove the ROM-file emit step from any batch runner.
- Grep `index.html` / tests for any `assets/rom/` reference and delete.

---

## 11. Consumer changes (specific file-by-file edits)

### 11.1 `pipeline/normalize_loop.py` — new + modified functions

| Function | Signature | Purpose |
|---|---|---|
| `build_canonical_rep(landmarks60, visibility60, angle_defs, period_ms) -> dict` (new) | inputs are the smoothed/aligned 60-frame output of the existing pipeline | Produces one `canonical_reps[i]` entry with `landmarks`, `visibility`, `angle_timeseries`, `phases`, `rom_advisory`. |
| `compute_angle_timeseries(landmarks60, angle_defs) -> dict` (new) | 60×33×2 + angle config | Per-joint per-frame angle; reuses `emit_rom.angle_deg`. |
| `auto_detect_phases(angle_series, override) -> list` (new) | primary angle 60-vector | Returns `[{name,frame_idx}]` per §9. |
| `load_sources_entry(exercise) -> dict` (modified) | string | Now normalises `url` → `urls: [url]`. |
| `build_provenance(args, sources_entry) -> dict` (new) | CLI args + sources entry | Gathers the full provenance block (sha256, versions, timestamps). |
| `main()` (modified) | CLI | Accepts `--raw <path>` repeated. Loops over raws → reps. Emits signature JSON via nested schema. |

### 11.2 `pipeline/emit_rom.py`
- `compute_rom(...)` renamed to `compute_rom_advisory(...)` via a one-line alias (keep original name exported for back-compat).
- Top-of-file banner: `"""DEPRECATED — ROM lives in assets/animations/<ex>.json under canonical_reps[i].rom_advisory. This script is kept only to preserve assets/rom/*.json during transition (see docs/specs/exercise-signature-schema.md Commit D)."""`
- No behaviour change in v1.

### 11.3 `index.html`
- ~line 357 area: add `const APP_MEDIAPIPE_VERSION = "0.5.1675469404";` (single source of truth; parse the script tag src at load time if we want to avoid duplication — flagged as Open Question 2).
- `loadTrajectory` (~2938): on success, call `validateSignature(data)` (new) before caching.
- New helper `validateSignature(sig)` (log-only; returns `sig` unchanged).
- New helper `getActiveRep(sig)` returning `sig?.canonical_reps?.[0] ?? sig` (last term is the back-compat shim for old files that still have flat `landmarks`/`visibility`).
- `drawHowToSkeletonFromTrajectory` (~2957): replace direct reads of `traj.landmarks` / `traj.visibility` / `traj.period_ms` / `traj.frame_count` with reads through `getActiveRep(traj)`.
- `renderExercisePicker` (~4636): try `renderPickerSilhouetteFromSignature(key)` first; fall back to existing SVG path.
- New `renderPickerSilhouetteFromSignature(ex)` + module-scope `pickerSilhouetteCache = {}`.

### 11.4 `tests/playwright/exercises/_helpers.ts`
- `mockTrajectory` (line 336) extends with a fourth `mode`: `'v1_valid'` — returns a minimal valid signature payload covering all required fields. Useful for positive-path assertions in the new picker test.
- Optional fifth mode: `'version_mismatch'` — returns a valid signature with `provenance.mediapipe_js_version: "0.0.0-mismatch"` so tests can assert the `console.warn` path.

---

## 12. Test plan

### 12.1 `pipeline/tests/test_normalize_loop.py` (extend)
- Assert the JSON emitted by `main()` contains: `schema_version == 1`, `canonical_reps` is a list of length 1, `canonical_reps[0]` has all nine required keys, `phases` length ≥ 1, all phases have `name` + `frame_idx` ints in `[0, frame_count)`.
- Assert `angle_timeseries[name]` length == `frame_count` for every configured joint.
- Assert `rom_advisory[name].min` ≤ `rom_advisory[name].max` when samples > 0.
- Assert `provenance.extracted_at` parses as ISO 8601.
- Assert `--raw pathA --raw pathB` produces a two-element `canonical_reps` with stable `rep_id` ordering (0, 1).

### 12.2 `pipeline/tests/test_emit_rom.py` (sunset-flag)
- No new tests; add a module-level `pytest.warns(DeprecationWarning)` or a comment flagging sunset. Existing tests continue to run until Commit D.

### 12.3 NEW: `pipeline/tests/test_signature_schema.py`
- `test_schema_version_required`: missing `schema_version` → validation raises.
- `test_canonical_reps_is_array`: object instead of array → raises.
- `test_rom_advisory_optional`: signature without `rom_advisory` still validates.
- `test_joint_weights_default_empty`: missing `joint_weights` tolerated; loader defaults to `{}`.
- `test_bilateral_default_true`: missing `bilateral` tolerated; loader defaults to `true`.
- `test_back_compat_flat_schema`: old-style file (flat `landmarks`, no `canonical_reps`) loads via the shim; `getActiveRep` returns a rep-shaped view.
- `test_advisory_rom_does_not_override_live_calibration`: pure-doc test (string-match a comment in the pipeline source, or skip if enforcement is runtime-only).

### 12.4 `tests/playwright/exercises/_helpers.ts` extensions
- Add `mockTrajectory(page, ex, 'v1_valid')` mode returning a minimal valid v1 signature (inlined as a constant in the helper file).
- Add `mockTrajectory(page, ex, 'version_mismatch')` mode.

### 12.5 NEW Playwright spec: `tests/playwright/exercises/picker-silhouette.spec.ts`
- Test 1: picker card for squat renders a non-blank silhouette image (DOM-observable: `<img>` `src` starts with `data:image/png` and its decoded pixel count > 0).
- Test 2: picker card falls back to SVG when `mockTrajectory(page, 'squat', 'missing')` is active (`<img>` `src` starts with `data:image/svg+xml`).
- Test 3: opening the picker twice does not re-run the offscreen-canvas draw (stub the canvas or introspect `pickerSilhouetteCache` via a test-only hook — flagged as Open Question 3; may require adding a minimal `window.__pickerCacheSize` accessor for test observability, contrary to the no-globals rule).
- Test 4: `console.warn` fires when `mockTrajectory(page, 'squat', 'version_mismatch')` is active.

### 12.6 Existing test guardrails
- `node tests.js` — must stay green (289 → 289+).
- `npx playwright test` — must stay green (44 → 44+ after adding picker spec).

---

## 13. Acceptance criteria (Check agent will run against this)

- [ ] `assets/animations/squat.json` + `assets/animations/pullup.json` regenerated, contain `schema_version: 1`, `canonical_reps: [...]` (length 1), all required provenance fields populated.
- [ ] `pipeline/tests/test_normalize_loop.py` asserts new fields (see §12.1). All pass.
- [ ] New `pipeline/tests/test_signature_schema.py` passes.
- [ ] `pipeline/tests/test_emit_rom.py` still passes (sunset-flagged, not removed).
- [ ] `assets/rom/squat.json` + `assets/rom/pullup.json` still emitted; contents match `canonical_reps[0].rom_advisory` exactly.
- [ ] `index.html`: how-to animation for squat + pullup is visually unchanged on the phone.
- [ ] `index.html`: picker silhouette for squat + pullup renders from the signature (data-url PNG). Other 20 exercises fall back to SVG and still render.
- [ ] `index.html`: loading a signature with a mismatched `mediapipe_js_version` logs a `console.warn` and does not break rendering.
- [ ] `node tests.js` green (no regressions).
- [ ] `npx playwright test` green (new picker spec passing; existing 44 still pass).
- [ ] `HOW_TO_KEYFRAMES`, `drawHowToSkeletonFromKeyframes`, `EXERCISE_SVGS`, `getSvgKey` all still present in `index.html` (no premature deletions).
- [ ] `mockTrajectory` extended with `'v1_valid'` + `'version_mismatch'` modes.
- [ ] Scott approves phone review of squat + pullup under new signature.

---

## 14. Out of scope (explicit — do not let these creep in)

- **Scoring algorithms.** Post-set form similarity, rep-by-rep grading, joint-weighted similarity — all future work. `joint_weights: {}` only reserves the shape.
- **Multi-canonical extraction.** v1 always emits `len(canonical_reps) == 1`. No clustering, no body-proportion k-NN. That is Step 5.7.
- **Post-set feedback UI.** No UI changes for rep playback, form comparison, or score display.
- **Live warmup replacement.** `rom_advisory` is advisory. `analyzeWarmup` and `applyAllCalibrationResults` are unchanged.
- **Picker PNG pre-rendering at build time.** Runtime Canvas path is mandated; pre-rendered PNGs are a fallback-of-last-resort for mobile perf (§8.4), tracked separately.
- **Deleting `HOW_TO_KEYFRAMES` / `EXERCISE_SVGS` / `getSvgKey`.** Separate cleanup commit after all 22 ship, already tracked in Step 5.5.
- **Source clip re-curation.** `sources.yaml` structural change (scalar → list) is in scope; adding new URLs is Scott's job.
- **Full 22-exercise regen.** Commit C covers squat + pullup only. The remaining 20 land as Scott curates their URLs.

---

## 15. Resolved decisions (2026-04-20 — implementer: follow these)

1. **MediaPipe API split: record both sides explicitly.** Provenance carries:
   - `mediapipe_pipeline_api: "tasks"` (constant for now)
   - `mediapipe_pipeline_model: "pose_landmarker_heavy"`
   - `mediapipe_pipeline_model_sha256: "<hash>"`
   - `mediapipe_app_api: "legacy"` (constant for now)
   - `mediapipe_app_version: "0.5.1675469404"` (from `index.html` `<script src>`)

   Future re-unification onto the Tasks API (app side) is explicitly out of scope for this sprint but the schema accommodates it — bump the `api` field value and re-extract, no breaking change.

2. **`APP_MEDIAPIPE_VERSION` source of truth: parse the `<script src>` URL at load time.** One source, no drift risk. Small utility: match `/@mediapipe/pose@([^/"]+)/` from the tag's `src` attribute. If parse fails, log a `console.warn` and skip the version-mismatch check — don't block rendering.

3. **Picker observability: DOM attribute on the `<img>` element.** Add `data-silhouette-source="signature"` or `data-silhouette-source="svg-fallback"` on the image tag. Playwright reads `img.getAttribute('data-silhouette-source')`. Zero JS global exposure.

4. **Timed-exercise phases: use `start`/`middle`/`end` at frames 0/30/59.** Same 3-phase shape as rep exercises. Single consumer codepath. 3 phase entries vs. 1 is negligible bytes.

5. **`sources.yaml`: migrate all 22 rows to `urls: [...]` format in Commit A.** Mechanical YAML edit. Every row becomes a 1-element list. Scott's remaining 20 curations land into a consistent schema.

6. **`extracted_at`: content-hash gated.** Before writing, compute `sha256` of the `canonical_reps[0].landmarks` array. Compare to existing signature on disk. If identical, **preserve the existing `extracted_at`**. Only rewrite when trajectory data actually changed. This keeps git diffs noise-free on no-op re-runs.

---

## 16. Implement checklist (ordered; step-through for the implementer agent)

1. Add `pipeline/lib/provenance.py`: `model_sha256(path)`, `utc_now_iso()`, `JS_VERSION = "0.5.1675469404"`.
2. Extend `pipeline/sources.yaml` loader in both `normalize_loop.py` and `emit_rom.py` to accept `url | urls`.
3. In `pipeline/emit_rom.py`: rename `compute_rom` → `compute_rom_advisory`; add back-compat alias; top-of-file deprecation banner.
4. In `pipeline/normalize_loop.py`:
   a. Add `--raw <path>` repeated CLI flag (default: single `pipeline/raw/<ex>.npz`).
   b. Factor existing pipeline body into a per-raw function `process_one_raw(raw_path, args) -> canonical_rep_dict`.
   c. Implement `compute_angle_timeseries`, `auto_detect_phases`, `build_canonical_rep`, `build_provenance`.
   d. Emit nested signature JSON. Keep precision rules identical.
5. Write `pipeline/tests/test_signature_schema.py` (§12.3).
6. Extend `pipeline/tests/test_normalize_loop.py` (§12.1).
7. Run `pytest pipeline/tests` — all green.
8. Regenerate `assets/animations/squat.json` + `assets/animations/pullup.json`. Spot-check sizes (~36 KB each).
9. Verify `assets/rom/squat.json` + `assets/rom/pullup.json` still emit (back-compat).
10. In `index.html`:
    a. Add `APP_MEDIAPIPE_VERSION` constant.
    b. Add `validateSignature`, `getActiveRep`.
    c. Rewrite `drawHowToSkeletonFromTrajectory` to read via `getActiveRep`.
    d. Add `pickerSilhouetteCache`, `renderPickerSilhouetteFromSignature`.
    e. Modify `renderExercisePicker` to try signature path first, SVG fallback second.
11. `node tests.js` — green.
12. Extend `_helpers.ts`: add `'v1_valid'` + `'version_mismatch'` modes to `mockTrajectory`.
13. Write `tests/playwright/exercises/picker-silhouette.spec.ts` (§12.5).
14. `npx playwright test` — green.
15. Deploy to `main`. Scott phone-tests per §13.
16. On approval: start rolling the remaining 20 exercises as Scott curates URLs (pipeline inherits new schema automatically).
17. (Commit D, later) Delete `assets/rom/`, the `main()` half of `emit_rom.py`, and any remaining references.
