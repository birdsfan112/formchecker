# FormChecker Session Log Archive

<!-- Reverse-chronological. Most recent entries moved from roadmap.md during Workstream C migration (2026-05-04).
     When adding new entries, prepend them above this comment. -->

## 2026-04-30 — Roadmap compaction + voice-architecture.md → docs/specs/

**Compaction:** trimmed 4 entries (2026-04-26, 2026-04-24, 2026-04-20, 2026-04-18; all ≤40%). No coalesce (no same-day groups), no archive (8 entries, none >30 days). Session Log: 169 → 128 lines; total: 295 → 252 lines. Also moved `docs/voice-architecture.md` → `docs/specs/voice-architecture.md` (roadmap-review spec-file violation); refs updated in `CLAUDE.md` + `docs/refactor-audit-2026-04-10.md`. Archive mentions left unchanged.

## 2026-04-26 — Roadmap archaeology + form-cue audit (Backlog #2 closed)

Ran `roadmap-archaeologist`; 4 items acted on:

- **Sprint umbrella re-scoped** — "Phone test all 22 exercises" replaced with per-exercise checklist for the 13 untested; surface real progress that the open-since-2026-04-09 umbrella lacked.
- **Backlog #2 (form-cue audit) — closed same-day.** Code-reviewer agent audited all 33 cues across 22 exercises in ~2 min. Findings: **7 UNREACHABLE + 3 SUSPECT + 23 clean** — `docs/specs/form-cue-audit-2026-04-26.md`. Both seed-hypothesis patterns from the 2026-04-10 backlog item confirmed.
- **Backlog #3 (dip orientation nudge) — parked.** Re-open trigger: dip-specific tracking issue on phone-test.
- **Decisions table 2026-04-24 row re-scoped** to capture the manual web-UI generation pivot.

**Form-cue UNREACHABLE fixes shipped same-day (commit `2ea1901`).** Framework `buildRepAnalyzer` extended to pass `goingUp` + `phaseExtremum` to form-check `check()` + dynamic-message callbacks; existing checks ignore the extra positional args. The 5× `goDeeper` cues rewritten as `phase === 'down' && goingUp && phaseExtremum > (calibration_bottom - 12)`. **Sign-flip:** audit recommended `+ 12` — wrong direction. `phaseExtremum` is monotonically ≤ `bottomThreshold` (set on phase entry, only decreases), so `> bottom + 12` is unreachable AND would false-fire on rising portion of clean deep reps. `- 12` is correct. The 2× `hipsTooHigh` cues removed (`hipSag`/`hipSagSevere` cover dropped-hips). **289/289 node + 44/44 Playwright pass.**

3 SUSPECT cues left for phone-test verification before code change: `glutebridge.driveHigher` (145°), `pullup.chinOverBar` (100° vs calibrated 80°), `lunge.torsoLean` (140° + no phase gate + left-only landmarks). Will surface during Sprint Step 2.

Picker artifacts (`docs/specs/picker-png-prompts.md`, `pipeline/gen_silhouettes.py`) committed from working tree where untracked.

**Pattern observation:** FormChecker's drift shape is **"sprint-adjacent backlog rot"** — items added when a sprint closes (form-cue audit + dip nudge both born 2026-04-10) get orphaned when the next sprint pivots. Fix: explicit deadline OR park at write time.

Skill deviation: dispatched code-reviewer (read-only) for the audit; `implementer` would have fit better for "do it with a sub agent."

## 2026-04-24 — Roadmap compaction + picker silhouette rev (SVG → PNG)

**Compaction:** trimmed 6 entries (2026-04-20 through 2026-04-11; all ≤40%). No coalesce, no archive. Session Log: 169 → 125 lines; total: 259 → 214 lines. First pass (`7344dab`) over-trimmed — reverted in `e57ea7b` before the corrected pass.

**Picker silhouette rev: SVG → PNG.** Started executing Backlog 4 with dips as calibration. Hand-coded geometric SVG (`a0215d7`): side-3/4 view with two parallel bars, Z-bend bent elbow. Aesthetic params + 4-exercise fan-out plan captured in `docs/specs/SVG_PIPELINE_NOTES.md`. Held off pushing pending phone review.

Scott countered with a Gemini-generated reference (solid white silhouette + thin black contour lines + bars in perspective + knees tucked) that read instantly at thumbnail size; hand-coded SVG was a pile of sticks at 70×62. The geometric-stick-figure aesthetic that worked for 17 cards can't hit iconicity for the equipment-and-dynamic-pose ones.

**Scope flip to all-22 PNG rebuild via Gemini.** Replacing only 5 audit targets in the new style would leave a mixed picker; coherent means redoing all 22. New spec `docs/specs/picker-png-rebuild.md` (`df3661f`); `picker-svg-audit-fix.md` SUPERSEDED. Calibration artifacts stay as placeholder; wire-up removes them post-batch.

**Skill deviation:** skipped imagegen's "ask about API keys" step — should have surfaced the Gemini-access choice (Scott had it all along). Worth a Claude System backlog item to add Gemini to imagegen's provider list.

**Next session:** Scott generates 22 PNGs, drops them in `assets/silhouettes/`. Then wire-up.

## 2026-04-20 — Step 5.6 Unified Exercise Signature Schema v1 shipped

Four-phase dev loop run by 5-agent team (2× Explore, planner, implementer + retry, code-reviewer + recheck — all Opus). Triggered by one-thing-inquiry. Single-file signature consolidates trajectory + ROM + phase markers + angle timeseries + MediaPipe provenance + picker frame.

- **Investigate** — codebase map (producers `normalize_loop.py`/`emit_rom.py`; consumers `loadTrajectory`, `drawHowToSkeletonFromTrajectory`, picker, `EXERCISE_SVGS`; `HOW_TO_KEYFRAMES` silent-fallback). Prior-art: no commercial app publishes schema; academic datasets ship raw pose; MediaPipe docs recommend k-NN classifier over single-template. **v1 is data, not algorithms.**
- **Calibrate** — `docs/specs/exercise-signature-schema.md` (~400 lines). Scott resolved 6 open questions: dual `mediapipe_pipeline_*` + `mediapipe_app_*` provenance; APP version regex from `<script src>`; `data-silhouette-source` DOM attribute for Playwright; `start`/`middle`/`end` for timed exercises; `urls: [...]` list form; `extracted_at` content-hash gated.
- **Implement** (`5287008`, `3901a4c`, `03ef8d6`). Structural hedges: `canonical_reps[]` array (v1 len=1; 5.7 grows), `phases[]` array, `joint_weights: {}` optional, `mediapipe_*` provenance. Runtime Canvas picker replaces SVGs; SVG fallback preserved.
- **Check #1 — NEEDS FIXES.** 3 high-sev: Playwright picker spec all 4 `.skip`'d, `fingerprintsDiffer` threshold 2→1 (~50% sensitivity drop), `emit_rom.py` standalone KeyError on v1.
- **Implement retry → Check retry — READY FOR MERGE.** 5 fixes (`4075261`, `3b339e8`, `f40de0f`, `9bf1cba`, `31beace`): un-skip tests, restore threshold + 3-sample window, nested unwrap, warn-at-min-lag, multi-raw integration test. **Test state on merge:** 107 pytest (+34), 48 Playwright (was 44 + 4 unskipped), 289 node. Squat 37.9 KB, pullup 38.6 KB.
- **Memory:** `feedback_instance_assignment.md` — planner + code-reviewer always Opus; novel-architecture sprints all Opus.
- **Deferred:** semantic `top`/`bottom` phase for pullup picker (obsoleted by SVG revert); mobile canvas perf for 22-card render; `auto_detect_cycle` preset-specific pelvis fallback for `hanging_front`; `emit_rom.py` stderr-warning integration test.

**Post-deploy phone review + signature-picker revert (same-day, `6b969da`)**

Squat regen had dropped `--mirror-x`; pullup `--start-frame 50 --end-frame 160` captured pre-rep hanging, not reps (real reps frames 180-290 with `--preset hanging_front`). Picker silhouettes from signature read as "dots + line" / missing legs at 70×62 due to low-vis landmarks (L_elbow vis=0.03, L_ankle 0.02); first-pass fix `3e713fc` (bottom-phase + limb synthesis) didn't recover.

**Decision: revert picker to SVG. Signature drives animation + ROM + future scoring; picker stays on pre-authored SVGs.** Front-view crouched poses at 70×62 are fundamentally not iconic — side-view silhouettes are what the eye reads. Revert deleted `renderPickerSilhouetteFromSignature`, `completeSkeletonForPicker`, `pickerSilhouetteCache`, `PICKER_CONNECTIONS`, picker Playwright spec. Playwright 48 → 44. Signature schema unchanged.

**Lesson:** single-source-of-truth can cost UX when source data isn't fit for rendering target. Memory: `feedback_data_consolidation_consumer_fit.md`.

## 2026-04-19 — Playwright `animation-loading.spec.ts` shipped (Step 5.5 regression guard)

Three-agent Plan/Implement/Check run; spec `docs/specs/formchecker-animation-loading-spec.md` (`11bd542`), implement (`bf523bf`), flake hardening (`aef9267`), merge (`2ce6240`).

- **Tests locked in** (6 in `tests/playwright/exercises/animation-loading.spec.ts` + 4 `_helpers.ts` exports): squat.json fetched/parseable; `#guide-canvas` has drawn pixels; fingerprint changes across 400 ms during idle; missing/malformed/empty JSON all fall back to keyframe + no `pageerror`.
- **Flake hardening** (under 2-worker http.server concurrency): Test 1 `waitForResponse` 2 s → 5 s; Test 3 exact-inequality → Hamming-distance comparator on 32×32 downsample (`fingerprintsDiffer`, ≥2 differing nibbles, per spec §6 "Iterate" fallback).
- **Verification:** 3 consecutive full-suite runs = 44/44 passing (38 baseline + 6 new). No `index.html` changes, no `window.__*` — purely DOM-observable.
- **Next session:** Scott curates remaining 20 URLs OR tries plank (first static-hold test).

## 2026-04-18 — Pullup animation finalized + pipeline test harness + normalize_loop bug fixes

Multi-sprint day — paradigm decision shipped, pipeline Steps 1-4 complete, squat aesthetic tuning shipped, pullup ran 5 iterations, test harness + 3 surgical bug fixes merged.

**Paradigm decision**

21 of 22 how-to animations failed on anatomy/physics (only pull-ups acceptable). Shipped `animation-paradigm-evaluation.md` + `animation-pipeline-implementation.md`. **Scott's 5 decisions:** YouTube OK as source (coordinates, not pixels); minimalist silhouette picker via `imagegen`; 60-frame loops; self-film decided per-exercise after first pipeline run; ROM baselines as bonus output.

**Pipeline Steps 1-4 shipped**

- `pipeline/` scaffolded with all 22 stubs; `extract_trajectory.py` smoke-tested on Pexels squat (395 frames, 100% detection, mean vis 0.809).
- **Spec deviation:** MediaPipe 0.10.33 on Py 3.13 removed `mp.solutions.pose` → migrated to Tasks API (`PoseLandmarker` + `pose_landmarker_heavy.task`). Pexels fronts Cloudflare so yt-dlp needs `curl-cffi` impersonation.
- `normalize_loop.py` (pelvis-y autocorr + 60-frame resample + 3-frame MA + seam blend) and `emit_rom.py` (vis<0.6 skip) shipped. Squat: 395→60 frames, seam 0.0488→0.0000; knee ROM 38°→173.5°.
- **Two drifts:** JSON 35.7 KB vs spec's <25 KB (float32→tolist); spec's [70°, 180°] squat knee range doesn't tolerate ATG. Curate normal reps.

**Aesthetic preview + tuning (ship-one-before-batch)**

Ship squat preview to phone BEFORE Scott curates 21 more URLs — aesthetic issues bake into the normalize pipeline, so catching them on one clip = parameter fixes, not full batch rerun. App-side wiring (`fd03e81`): `trajectoryCache` + `loadTrajectory(ex)` + split `drawHowToSkeleton` into `-FromTrajectory`/`-FromKeyframes`. 4 phone-review fixes (`0e84697`): `--mirror-x`; `PERIOD_MS_DEFAULT` 2000→3000; `anchor_feet()`; `canonicalize_to_outline()`. Cache bug `12e4346` removing `cache: 'force-cache'`; memory `feedback_aesthetic_ship_one_first.md`.

**Pullup sprint — first front-view/hanging test**

Pullup surfaced 4 pipeline issues + 1 app-side bug; all parameter fixes, batch inherits. **Presets (`0285a28`):** generalized `canonicalize_to_outline` + `anchor_feet` from squat-hardcoded ankles-to-floor into `--preset` system (`standing` + `hanging_front`); used hips (not ankles) as `hanging_front` `far_ids` since hanging clips cut off legs. **Dark-room animation freeze (`a9382f6`) — pre-existing app bug:** `drawGuide()` only ran from MediaPipe's `onResults` callback, which stalls when no pose detected. Added independent ~15fps RAF loop for idle states. **L/R label swaps (`c199170`):** MediaPipe swapped left/right labels in 27/98 pullup frames + 45/395 squat frames. `correct_lr_swaps()` Stage 1: majority sign of `L_shoulder.x - R_shoulder.x`. **X-anchor + cubic ease-in-out (`02a4192`, `0778fd1`):** `anchor_per_frame` was y-only — extended to 2D rigid translation; cubic ease-in-out on period fraction stops linear-playback bouncing at rest.

**Pullup animation finalized — anatomical-constraint stack on hanging_front preset**

Five-iteration phone-review cycle. Root cause (diagnosed via landmark data, first-hypothesis label swaps was wrong): MediaPipe shoulder/wrist span *collapses* when arms occlude head overhead. `enforce_lateral_width()` (`a6e3b16`/`e5d82c0`) clamps each L/R pair to its median half-span. Per-pair LR Stage 2 + finger rigid-bind (`f8585ec`) catches pair-specific label flips Stage 1 missed (7 elbow + 6 wrist + 6-8 finger); `lock_fingers_to_wrist()` replaces each finger with `wrist + median(dx, dy)`. `enforce_y_sync()` + `post_smooth_window=7` (`bcf20df`/`20c286a`): bilateral pairs share per-frame mean y; seam 0.25 → 0.15. **Live scoring impact:** pullup form-check uses bilateral averages + `Math.abs()` on swing — pipeline LR fixes are visual-only. Memory: `feedback_animation_anatomical_constraints.md`.

**Pipeline test harness (`cee9997`) + normalize_loop surgical bug fixes (`18a74c9`)**

`pipeline/tests/` — `conftest.py` + 3 test files, 62 tests against normalize/rom pure functions. `extract()` not covered (needs real video fixture). Must use `pipeline/.venv` (`cd pipeline && .venv/Scripts/python -m pytest tests`). Surgical fixes per `docs/specs/normalize-loop-bug-fixes-spec.md` — 3-agent Plan→Implement→Check, +7/−1 lines: Bug 1 `enforce_lateral_width` `span_before` collapsed sign on stable L/R signs (replaced with signed-half range); Bugs 2a/2b NaN guards in `correct_lr_swaps` + `pelvis_y_signal`. 73 tests pass; warnings 6 → 5.

**Next session:** Scott curates remaining 20 URLs OR moves to plank (first static-hold). Validate normalize_loop fixes on batch run.

## 2026-04-16 — architecture-map.md moved to docs/specs/ (audit fix)

`docs/architecture-map.md` → `docs/specs/architecture-map.md` via `git mv`. Updated refs in `CLAUDE.md` + `docs/specs/visual-polish-sprint.md`. Archive mentions left unchanged.

---

## 2026-04-12 — Step 4 spec update + Step 5 SVG silhouettes + how-to animation + insecure-context camera fix

**Step 4 + Step 5 SVG silhouettes:** `visual-polish-sprint.md` expanded 13 → 22 exercises with PNG-vs-canvas decision table. Fixed blank picker cards (`drawMiniSilhouette()` missing `kneeling` + `quadruped` cases). Library research: nothing on GitHub covers all 22 with clean license; niche moves (arch hang, scapular pulls, L-sit, band pull-aparts, mobility) missing from all free sets. Decision: SVG via imagegen skill — 7 unique SVGs in `assets/silhouettes/` cover all 22 via drawStyle+drawVariant. `EXERCISE_SVGS` + `getSvgKey()` embedded; `renderExercisePicker()` uses `<img src="data:image/svg+xml,...">` instead of canvas.

**Step 5 how-to animation:** `HOW_TO_KEYFRAMES` — 22 exercises × 2 keyframes in normalized [0..1] coords. `drawHowToSkeleton(w, h, ex)` lerps via `(1 - cos(t·2π)) / 2` driven by `Date.now()`, blue stick skeleton on `guideCtx`, idle-gated at 7.5fps (no separate RAF). Flakiness: full Playwright suite occasionally shows 2 failures on first run due to port collision when running sequentially; second run passes clean.

**Insecure-context camera fix:** `getUserMedia` requires HTTPS/localhost. Opening `index.html` as `file://` in Chrome isn't a secure context; `--disable-web-security` bypasses CORS but does NOT grant secure-context status — cryptic `NotAllowedError` resulted. Added `window.isSecureContext` check at top of `startCamera()` → shows `<h2>Setup Required</h2>` with `start.bat` → option 1 → `http://localhost:8080`. `catch` block now branches on `err.name` (`NotAllowedError`/`NotFoundError`/`NotReadableError`). 289 unit + 38 Playwright = 327, 0 failing.

**Next session:** Phone-test on iOS Safari: SVG picker cards + blue how-to animation. If both look good, Step 5 is done — move to Step 2 phone testing of all 22 exercises.

## 2026-04-11 — Playwright landmark injection expanded: glutebridge, pullup, legraise (38 tests)

- **glutebridge.spec.ts** (floor + rep-based + `invertedPolarity`, only exercise combining all three; collinear=180° bridged, knee-up=90° flat); **pullup.spec.ts** (`downGate` chin-over-bar — blocks phase when chin below hands, allows rep when chin clears); **legraise.spec.ts** (hanging + rep-based hip angle, simplest hanging rep).
- Net +4 tests (7 written, 3 replaced placeholders). 38/38 passing. 13 placeholder specs still need Y4M recordings.

> Earlier sessions archived in `docs/roadmap-archive.md`
