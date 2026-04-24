## Status
| Field | Value |
|-------|-------|
| Priority | active |
| Phase | Implement |
| Updated | 2026-04-20 |
| Summary | Step 5.6 Unified Exercise Signature Schema v1 shipped to main 2026-04-20. Consolidates per-exercise data into one file at `assets/animations/<ex>.json`: trajectory + ROM advisory + phase markers + angle timeseries + MediaPipe provenance + future hedges (`canonical_reps[]`, `phases[]`, `joint_weights: {}`). Squat + pullup phone-approved for animation (squat with `--mirror-x`, pullup with correct frames 180-290). **Picker silhouette from signature was tried and reverted same-day** — front-view crouched poses don't read as iconic exercises at 70x62px; picker stays on pre-authored SVGs. Signature drives animation + ROM + future scoring; picker is SVG. Tests: 107 pytest, 44 Playwright, 289 node. Spec: `docs/specs/exercise-signature-schema.md`. |
| Needs Scott | (1) Curate remaining 20 clip URLs in `pipeline/sources.yaml` (~2 hrs). Note each clip's facing direction. (2) Consider whether the plank/static-hold case warrants its own preset before curating statics. |
| Autonomous | Add horizontal/kneeling/quadruped presets once Scott curates an example clip of each drawStyle. `generate_picker.py` (imagegen skill). Retire `HOW_TO_KEYFRAMES` + `EXERCISE_SVGS` once batch lands. |
| Blockers | None |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Current Sprint

<!-- Active work only. Completed steps 1/3/4 and superseded step 5 pruned 2026-04-20 — see docs/specs/ for spec references and Session Log for history.
     Pre-launch checklists, QA tasks, maintenance work, and deployment prep all belong here too — not just new features. -->

### Step 2 — Scott: Phone test all 22 exercises
*Use `docs/exercise-testing-protocol.md` — 9-step checklist per exercise.*

- [x] Arch hangs / scapular pulls (timed hanging exercises, 14-15 in registry)
- [x] Mobility/PT batch — shoulder dislocates, hip flexor stretch, wrist warm-up, band pull-aparts, foam roller, cat-cow, bird-dog (exercises 16-22)
- [ ] Phone test all 22 exercises — use `docs/exercise-testing-protocol.md`

### Step 5.5 — Automated asset pipeline (approved 2026-04-17)
*Per `docs/specs/animation-pipeline-implementation.md`. Paradigm rationale in `docs/specs/animation-paradigm-evaluation.md`. Source → MediaPipe Pose → canonical trajectory JSON → animation + ROM baseline. Picker path updated 2026-04-20: picker stays on pre-authored SVGs (see Backlog 4); pipeline no longer generates picker assets. Signature schema v1 (Step 5.6) shipped on top of this pipeline 2026-04-20 — see `docs/specs/exercise-signature-schema.md`.*

- [x] Pipeline scripts + app-side trajectory loader + Playwright regression spec shipped 2026-04-17 → 2026-04-19 (see session logs for detail). Signature schema v1 + squat/pullup phone-approved 2026-04-20.
- [ ] Scott: curate `sources.yaml` — 22 clip URLs (2/22 done: squat, pullup)
- [ ] Batch-run pipeline; commit `assets/animations/*.json` + `assets/rom/*.json`
- [ ] Scott: review each trajectory via `pipeline/preview.py`
- [ ] Scott phone-tests all 22 with new animations
- [ ] Retire `HOW_TO_KEYFRAMES` + `assets/silhouettes/*.svg` once batch lands (picker SVG path + `EXERCISE_SVGS` + `getSvgKey()` stay per 2026-04-20 revert)
- [ ] Deploy to `main`

## Backlog

<!-- Future work, roughly priority-ordered. Not checkboxes — these aren't active yet.
     If an item needs a full spec, write the spec in docs/specs/ and link to it here. -->

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)
2. **Form-cue audit (post-framework)** — two known dormant cues surfaced during the push-up framework migration (2026-04-10):
   - `goDeeper` (push-up, and likely pike/dip too): in the new framework `goingDown` is only tracked in the 'up' phase, so the existing check `phase === 'down' && goingDown && elbow > elbow_down + 12` is unreachable. It was also effectively dead in the old hand-coded version (only fired on bounce patterns). Redesign to fire when the 'down'-phase valley is shallower than the calibrated bottom by X°.
   - `hipsTooHigh` (push-up): check `avgBack > 195` is unreachable because `angle()` clamps output to [0, 180]. Dead code in both old and new versions. Redesign using supplement angle, or remove entirely if pike push-ups covers this shape.
   - Audit all other exercises for the same two patterns once the framework migration is complete.
3. **Dip orientation nudge** — the old dip analyzer wrote `angleHint.textContent = 'Face the camera for best tracking'` every frame when `shoulderSpan < 0.10`. Dropped during framework migration (2026-04-10) to avoid adding a per-frame-side-effect hook to the framework. Restore via a small framework `onFrame(lm)` extension, or inline it into dip's trackingJoint as a side effect.
4. **SVG picker audit** (spec'd 2026-04-20 — `docs/specs/picker-svg-audit-fix.md`) — 5 of 22 exercises have picker silhouettes that don't read as the exercise: **dips, inverted rows, glute bridge, hip flexor stretch, foam roller** (all fall through the 7 shared shapes in `EXERCISE_SVGS`/`getSvgKey` to the wrong pose). Approach: bespoke single-color silhouette SVG per exercise via `imagegen` skill, angle chosen per-exercise for iconicity (mix of side/3-4). Extend `getSvgKey` with exercise-id routing; update 5 configs with bespoke `drawVariant`. Live-outline code path unchanged (only the picker uses `drawVariant`). Next session: generate one (foam roller or dip), ship, phone-review, then batch the other 4.
5. **Step 5.7 — Multi-canonical enrichment** (after all 22 Step 5.6 signatures ship). Extend schema from 1 canonical rep per exercise to 3-5. Scott curates additional URLs per exercise in `sources.yaml` (already structured as list in 5.6); pipeline extracts, phase-aligns via DTW or top-of-rep sync, filters quality, populates `canonical_reps[]`. Unlocks: (a) MediaPipe k-NN classifier pattern for similarity scoring, (b) body-proportion matching during warmup (pick the canonical that looks most like the user), (c) ROM *bands* rather than ROM *points*, (d) golden-form bias removal. Mostly Python-side — consumer code unchanged if 5.6 schema is correct.
6. **Post-set / post-workout feedback layer** (Phase 5.x, new sprint after 5.7). Current live coaching is real-time only; users get no post-rep, post-set, or post-workout analysis. Features:
   - Rep-by-rep quality scores (leverages signature's `phase_frames` + `angle_timeseries`)
   - Post-set summary with specific form issues ("knee bottomed at 110° vs canonical 90°")
   - Post-workout dashboard: total reps, form trends, weakest points across exercises
   - Session-over-session progress tracking via localStorage/IndexedDB (no backend, privacy-preserving)
   - Requires signature schema v1 (5.6) and ideally multi-canonical (5.7) for robust scoring bands.
   - Depends on a stable `schema_version` contract — user's historical scores must remain comparable across pipeline updates.

## Decisions

<!-- Lightweight ADR table. Prevents re-opening settled questions.
     Status options: Accepted | Superseded | Revisit -->

| Date | Decision | Context | Status |
|------|----------|---------|--------|
| 2025-Q1 | Single HTML file — no build step | Keeps deployment dead simple; GitHub Pages auto-deploys on push to main | Accepted |
| 2025-Q1 | MediaPipe Pose over TensorFlow.js | Faster, more accurate, better mobile support | Accepted |
| 2025-Q1 | Web Speech API for audio coaching | Plays alongside music; no audio file management needed | Accepted |
| 2025-Q1 | No backend — fully client-side | Privacy-first; no data leaves the device | Accepted |
| 2025-Q2 | GitHub Pages hosting (not Vercel) | Free, auto-deploys on push to main via GitHub Actions | Accepted |
| 2026-Q1 | Data-driven exerciseRegistry | Merged exerciseMeta + exercises — adding an exercise is now one object + one `<option>` | Accepted |
| 2026-Q1 | Lite MediaPipe model (complexity 0) | Reduced thermal load ~50% on mobile; acceptable accuracy tradeoff for bodyweight exercises | Accepted |
| 2026-Q1 | Smart calibration covers multiple exercises | Squat ROM → squat + lunge; pushup ROM → pushup + pike + pullup. 6 reps calibrates all 4 rep-based exercises | Accepted |
| 2026-04-17 | Automated asset pipeline for animations + picker | Replace hand-authored 2-keyframe lerp + 7-shared-SVG picker with MediaPipe-extraction pipeline. YouTube allowed as source (coordinates not pixels). 60-frame loops. Minimalist silhouette picker via `imagegen`. ROM baseline as bonus output. | Accepted |

## Session Log

<!-- Reverse-chronological. Most recent entry first. Cap at ~15 entries.
     Archive older entries to docs/roadmap-archive.md (see Archive Pointer below).
     Multiple sessions on the same date can be consolidated into one entry. -->

### 2026-04-20 — Step 5.6 Unified Exercise Signature Schema v1 shipped

Four-phase dev loop run by 5-agent team (2× Explore for Investigate, planner for Calibrate, implementer for Implement + retry, code-reviewer for Check + re-check). All agents Opus. Triggered by one-thing-inquiry: surveyed whether clips could be mined for more than animation; concluded yes — single-file signature consolidating trajectory + ROM + phase markers + angle timeseries + MediaPipe provenance + picker frame.

- **Investigate** — 2 Explore agents in parallel. Codebase map: producers (`normalize_loop.py` emits trajectory, `emit_rom.py` emits ROM), consumers (`loadTrajectory`, `drawHowToSkeletonFromTrajectory`, `renderExercisePicker`, `EXERCISE_SVGS`, `mockTrajectory`), tests (`pipeline/tests/`, `tests/playwright/`), plus the `HOW_TO_KEYFRAMES` silent-fallback path. Prior-art research: no commercial app publishes their schema (IP); academic datasets (Fit3D, MMFit, H3WB) ship raw pose data, not canonical-rep primitives; Google's own MediaPipe docs recommend k-NN classifier over pairwise distances, not single-template comparison. Design implication: v1 is data, not algorithms.
- **Calibrate** — planner agent wrote `docs/specs/exercise-signature-schema.md` (~400 lines). 6 open questions resolved by Scott: record both `mediapipe_pipeline_*` and `mediapipe_app_*` (pipeline uses Tasks API, app uses legacy `@mediapipe/pose@0.5.1675469404`); parse APP version from `<script src>` regex; `data-silhouette-source` DOM attribute for Playwright observability (no `window.__*`); `start`/`middle`/`end` phases for timed exercises at 0/30/59; all 22 `sources.yaml` rows to `urls: [...]` list form; `extracted_at` content-hash gated.
- **Implement** (3 commits: `5287008` pipeline, `3901a4c` consumer, `03ef8d6` regenerate squat+pullup). Structural hedges baked in for future: `canonical_reps[]` as array (v1 len=1, 5.7 grows to N), `phases[]` as array, `joint_weights: {}` optional empty dict, `mediapipe_*` provenance for drift detection. Runtime Canvas picker silhouette path replaces hand-authored SVGs; SVG fallback preserved (spec mandates no deletion of `HOW_TO_KEYFRAMES`, `drawHowToSkeletonFromKeyframes`, `EXERCISE_SVGS`, `getSvgKey`, or `assets/rom/*.json` — Commit D territory, later sprint).
- **Check** (code-reviewer audit #1) — **NEEDS FIXES**. 3 high-severity findings: Playwright picker-silhouette spec all 4 tests `.skip`'d (violates §13 "passing"), `fingerprintsDiffer` threshold lowered 2→1 (sensitivity ~50%), `emit_rom.py` standalone KeyError on v1 signatures. 4 medium/low follow-ups logged.
- **Implement retry** (5 fix commits: `4075261` un-skip picker tests, `3b339e8` restore threshold 2 + 3-sample window, `f40de0f` emit_rom nested unwrap, `9bf1cba` auto_detect_cycle warn-at-min-lag + README doc, `31beace` multi-raw CLI integration test). Tighter implementer brief with explicit ban on test-skipping and threshold-lowering shortcuts. Opus model throughout this sprint.
- **Check retry** — **READY FOR MERGE**. All 5 fixes RESOLVED. No regressions vs prior 3 commits. 3 low-severity style nits deferred (follow-up fodder).
- **Test state on merge:** 107 pytest (73 → 107, +34 new), 48 Playwright passing (was 44 + 4 skipped), 289 node tests.js (unchanged). Final squat.json size 37.9 KB (+3.8%), pullup.json 38.6 KB (+4.4%). ROM files still emitted for back-compat.
- **Memory update:** `feedback_instance_assignment.md` — new global rule: planner + code-reviewer agents always Opus, novel-architecture sprints go Opus across the board.
- **Deferred to backlog (not blocking merge):** semantic `top`/`bottom` phase selection for pullup picker (may need 1-line swap to `bottom` after phone review); mobile canvas perf for 22-card picker render (unmeasured; spec §8.4); `auto_detect_cycle` preset-specific pelvis fallback for `hanging_front` (wrist_y instead of hip_y); `emit_rom.py` cross-integration test for stderr warning path.
- **Next session:** Scott phone-reviews squat + pullup on deployed GitHub Pages. If pullup picker silhouette looks wrong, 1-line fix to use `bottom` phase. Then Step 5.7 (multi-canonical enrichment) OR Scott curates remaining 20 URLs for batch run.

**Post-deploy phone review + signature-picker revert (same-day)**

Scott phone-reviewed live site after merge. Four issues surfaced:

1. **Squat facing wrong direction** — regeneration had dropped `--mirror-x`. Fixed by regenerating with `--mirror-x` (commit `6b969da`).
2. **Pullup no ROM** — implementer's manual `--start-frame 50 --end-frame 160` captured the pre-rep hanging segment, not an actual rep. Real reps in raw clip at frames 180-290 (hanging -> chin-over-bar at frame 230 -> hanging). Regenerated with `--preset hanging_front --start-frame 180 --end-frame 290` (commit `6b969da`). Nose-to-wrist gap now swings +0.124 -> -0.038 -> +0.124.
3. **Squat picker "dots + single line"** — at standing/top-phase, L_elbow vis=0.03 + L_wrist vis=0.13 caused 3 of 12 connections to skip. Partial skeleton read as dots + line at 70x62px. First-pass fix (commit `3e713fc`): switched picker to prefer `bottom` phase (mid-action, more recognizable) + added `completeSkeletonForPicker` limb-synthesis helper for missing legs/arms.
4. **Pullup picker missing legs** — L_knee vis=0.23, L_ankle vis=0.02 (legs off-frame in source clip). First-pass fix same as #3 (synthesize legs below hips at 0.18 offset).
5. **Picker doesn't update until second tap** — cache-timing issue; `trajectoryCache[ex]` only populates when exercise becomes active. Never fixed — revert killed the problem.

Post-fix #3/#4 phone review: "new shapes, but still not recognizable as human." Diagnosis: front-view crouched poses at 70x62px are fundamentally not iconic — side-view silhouettes (one leg forward, knees bent) are what the eye recognizes as "squat." We're fighting human perception. Can't tune away with better rendering.

**Decision: revert picker to SVG. Signature drives animation + ROM + future scoring. Picker stays on pre-authored SVGs.**

- Revert commit `[next]`: deleted `renderPickerSilhouetteFromSignature`, `completeSkeletonForPicker`, `pickerSilhouetteCache`, `PICKER_CONNECTIONS` from index.html. Deleted `tests/playwright/exercises/picker-silhouette.spec.ts` (all 4 tests were about the signature-picker path). Playwright count drops 48 -> 44 (back to pre-5.6 count).
- Signature schema unchanged — future scoring/animation still use the rich data. Picker is a separate UI concern where iconicity > accuracy.
- Logged `SVG picker audit` as Backlog item 4: Scott to identify the 3-4 exercises whose current SVGs don't represent the exercise well; fix via new drawVariant + SVG or imagegen-generated bespoke silhouettes.
- Spec updated with "Picker reverted" note under §7 consumer changes.

**Lesson:** Single-source-of-truth is an elegance that can cost UX if the source data isn't fit for the rendering target. Front-view pose landmarks are the right data for live form-coaching (where the user IS front-view) and wrong data for a small iconic thumbnail. Two source shapes for two rendering targets is OK.

**Memory captured:** `feedback_data_consolidation_consumer_fit.md` — per-consumer fitness check before consolidation, mineable vs. poor-fit source mapping (motion/pose data → good for motion-adjacent, poor for iconic imagery), how to apply during one-thing inquiry.

**Compaction:** coalesced 1 group (−1 line), trimmed 1 entry (2026-04-18, −58 lines, ~60%), pruned Current Sprint (−28 lines: dropped resolved Step 1, complete Steps 3/4, superseded Step 5; collapsed Step 5.5 completed items; removed picker items killed by 2026-04-20 revert). Session Log: 197 → 166 lines. Current Sprint: 51 → 23 lines. Total file: 314 → 254 lines. Still 54 over 200-line cap — remaining bulk is in Session Log but entry count is only 8 (under 15) so Phase 3 archive doesn't apply; trim of other entries was Scott-declined.

**Picker audit spec (Backlog 4)**

Scott identified the 5 wrong pickers: dips, inverted rows, glute bridge, hip flexor stretch, foam roller. All fall through `getSvgKey` to the wrong shared shape (dips → standing, inverted rows + glute bridge + foam roller → plank, hip flexor → quadruped kneeling). Spec'd the fix at `docs/specs/picker-svg-audit-fix.md`: bespoke single-color silhouette SVG per exercise via `imagegen` skill, angle per-exercise for iconicity (mix of side/3-4 view). Extend `getSvgKey` with exercise-id routing; update 5 configs with bespoke `drawVariant`. Live-outline code path unchanged. Execution deferred to next session — ship foam roller or dip first per ship-one-before-batch, then batch the other 4.

### 2026-04-19 — Playwright `animation-loading.spec.ts` shipped (Step 5.5 regression guard)

Three-agent Plan/Implement/Check run. Plan agent authored the spec on 2026-04-18 (`docs/specs/formchecker-animation-loading-spec.md`, merged as `11bd542`). Implement agent landed the test file + helpers today on `claude/clever-lederberg-1241ce` (`bf523bf`). Check agent verified, hardened for CI concurrency, and merged as `2ce6240`.

- **Files added:** `tests/playwright/exercises/animation-loading.spec.ts` (197 lines, 6 tests) and 3 new exports in `tests/playwright/exercises/_helpers.ts` — `guideCanvasHasPixels`, `getGuideCanvasFingerprint`, `mockTrajectory`, plus the `fingerprintsDiffer` Hamming-distance helper added during flake hardening.
- **Tests locked in:** (1) squat.json is fetched + parseable when squat is active; (2) `#guide-canvas` has drawn pixels after trajectory load; (3) canvas fingerprint changes across 400 ms during idle; (4) missing JSON (404) → keyframe fallback still draws + app stays healthy; (5) malformed JSON → same; (6) empty JSON (`"null"`) → same. Failure-mode tests all assert `page.on('pageerror')` stayed empty.
- **Isolated run:** 6/6 passing first try. **Full-suite runs surfaced 2 flake points** under 2-worker Python http.server concurrency: (a) Test 1's 2 s `waitForResponse` timeout was too tight — bumped to 5 s; (b) Test 3's exact-inequality fingerprint comparison failed on near-identical frames when `idleGuideTick` RAFs slipped. Applied the spec-authorised §6 Test 3 "Iterate" fallback: 16×16 → 32×32 downsample + Hamming-distance comparator (`fingerprintsDiffer`, ≥2 differing nibbles). Hardening committed as `aef9267`.
- **Verification:** 3 consecutive full-suite runs post-hardening = 44/44 passing (38 baseline + 6 new). Baseline on main (pre-merge) also confirmed clean at 38/38. No `index.html` changes, no `window.__*` exposure — purely DOM-observable via `getImageData` + `waitForResponse` + route interception.
- **Merge chain:** `11bd542` (spec) → `bf523bf` (implement) → `aef9267` (flake harden) → `2ce6240` (merge to main, pushed). GitHub Pages will inherit no behavior change — this is pure test addition.
- **Sources curated this session:** still 2 of 22. Session was pure tooling.
- **Next session:** Scott curates remaining 20 URLs OR tries plank (first static-hold test on the pipeline). Same breadcrumb as the 2026-04-18 entry.

### 2026-04-18 — Pullup animation finalized + pipeline test harness + normalize_loop bug fixes

Multi-sprint day — paradigm decision shipped, pipeline scaffolding Steps 1-4 complete, aesthetic tuning shipped for squat, pullup sprint ran through 5 iterations, test harness + 3 surgical bug fixes merged.

**Paradigm decision**

21 of 22 how-to animations failed on anatomy/physics (only pull-ups acceptable). Shipped `docs/specs/animation-paradigm-evaluation.md` + `docs/specs/animation-pipeline-implementation.md`. **Scott's 5 decisions:** YouTube OK as source (coordinates, not pixels); minimalist silhouette picker via `imagegen`; 60-frame loops; self-film decided per-exercise after first pipeline run; ROM baselines as bonus output of same pass.

**Pipeline Steps 1-4 shipped**

- `pipeline/` scaffolded: `requirements.txt`, `README.md`, `sources.yaml`, `picker_prompts.yaml`, `exercise_angles.yaml` (all 22 as stubs).
- `extract_trajectory.py` smoke-tested on Pexels squat → 395 frames, 100% detection, mean vis 0.809.
- **Spec deviation:** MediaPipe 0.10.33 on Py 3.13 removed `mp.solutions.pose` → migrated to Tasks API (`PoseLandmarker` + `pose_landmarker_heavy.task`). Pexels fronts Cloudflare so yt-dlp needs `curl-cffi` impersonation (`yt-dlp[curl-cffi]`).
- `normalize_loop.py` (pelvis-y autocorr + 60-frame resample + 3-frame MA + seam blend) and `emit_rom.py` (vis<0.6 skip) shipped. Squat: 395→60 frames, seam 0.0488→0.0000; knee ROM 38°→173.5°.
- **Two drifts worth Scott's curation guidance:** JSON 35.7 KB vs spec's <25 KB target (float32→tolist float64 inflation; fixed via string-round but still over); spec's [70°, 180°] squat knee sanity range doesn't tolerate ATG clips. Both source-clip dependent — curate "normal" reps, not extremes.
- Roadmap compaction: moved 9 oldest entries (2026-04-04 → 2026-04-11) to `docs/roadmap-archive.md`.

**Aesthetic preview + tuning (ship-one-before-batch)**

One Thing Inquiry mid-session: ship squat preview to phone BEFORE Scott curates 21 more URLs. Aesthetic issues bake into the normalize pipeline, so catching them on one clip = parameter fixes, not full batch rerun.

- App-side wiring (`fd03e81`): `trajectoryCache` + `loadTrajectory(ex)` + `drawHowToSkeleton` split into `-FromTrajectory` (new) and `-FromKeyframes` (fallback).
- 4 phone-review fixes (`0e84697`, all pipeline-parameter, generalize across exercises): `--mirror-x`; `PERIOD_MS_DEFAULT` 2000→3000; `anchor_feet()` (ankle Y → 0.81); `canonicalize_to_outline()` (uniform scale+shift, nose→0.09, ankle→0.81, hip→0.50).
- **Cache bug (`12e4346`):** `fetch(url, { cache: 'force-cache' })` serves stale cached copy *without* revalidation on explicit reload. Removed option; GitHub Pages default `max-age=600` now respects busted URL params.
- Memory: `feedback_aesthetic_ship_one_first.md`.

**Pullup sprint — first front-view/hanging test**

Pullup surfaced 4 pipeline issues + 1 app-side bug. All parameter fixes; batch inherits.

- **Presets (`0285a28`):** `canonicalize_to_outline` + `anchor_feet` hardcoded ankles-to-floor; pullup needs wrists-to-bar. Generalized into `--preset` system with `standing` + `hanging_front`. Used hips (not ankles) as `hanging_front`'s `far_ids` because hanging clips cut off legs (ankle vis 0.018, knee 0.092).
- **Dark-room animation freeze (`a9382f6`) — pre-existing app bug exposed by lights-off test:** `drawGuide()` only ran from MediaPipe's `onResults` callback, which stalls when no pose detected. Added independent ~15fps RAF loop for idle/countdown/warmup states. Not pipeline-specific.
- **L/R label swaps (`c199170`):** 27/98 pullup frames and 45/395 squat frames had MediaPipe swapping left/right labels (common for front-ish arm-over-head views). `correct_lr_swaps()` Stage 1 uses majority sign of `L_shoulder.x - R_shoulder.x`, swaps all 14 mirror pairs in disagreeing frames.
- **X-anchor missing (`02a4192`):** `anchor_per_frame` was y-only, letting wrist-mid-x drift with body sway. Fix: 2D rigid translation. Post-fix wrist-mid range = 0.0000.
- **Linear playback bounces at rest (`0778fd1`):** cubic ease-in-out on period fraction. Slow at loop seam (rest), fast through rep peak. Keyframe fallback already uses cosine oscillation, naturally eased.

**Pullup animation finalized — anatomical-constraint stack added to hanging_front preset**

Five-iteration phone-review cycle for residual flip/drift. Root cause (diagnosed via landmark data, not visual symptoms — first hypothesis of label swaps was wrong): MediaPipe shoulder/wrist span *collapses* when arms occlude head overhead.

- **Width-lock (`a6e3b16`, extended `e5d82c0`):** `enforce_lateral_width()` clamps each L/R pair's x to its median half-span — anatomically correct for pullup (shoulders/elbows/wrists/hips don't change horizontal width).
- **Per-pair LR correction Stage 2 (`f8585ec`):** Stage 1 whole-frame swap missed pair-specific MediaPipe label flips (7 elbow + 6 wrist + 6-8 finger, correctly-labeled shoulders). Stage 2 uses each pair's own majority sign + magnitude threshold 0.03.
- **Finger rigid-bind (`f8585ec`):** `lock_fingers_to_wrist()` replaces each finger with `wrist + median(dx, dy)` for grip-on-bar exercises. Hands gripping a bar don't move relative to wrist.
- **Y-sync (`bcf20df`):** `enforce_y_sync()` forces bilateral pairs to share per-frame mean y. Fixes "one arm leading" jitter.
- **Post-lock smoothing (`20c286a`):** `preset.post_smooth_window=7` cleans residual y noise after locks. Pullup seam diff 0.25 → 0.15.
- **Live scoring impact:** Verified pullup form-check uses bilateral averages + `Math.abs()` on swing check, so symmetric L↔R swaps don't affect scoring. **Pipeline LR fixes are visual-only; live scoring is robust by design.**
- Memory: `feedback_animation_anatomical_constraints.md`.

**Pipeline test harness (`cee9997`)**

- `pipeline/tests/` — `conftest.py` + 3 test files, 62 tests against post-pullup-iteration `normalize_loop.py`. Covers every pure function in normalize/rom + YAML schemas. Full MediaPipe/OpenCV `extract()` not covered (needs real video fixture).
- Must use `pipeline/.venv` (cv2/mediapipe aren't on system Python): `cd pipeline && .venv/Scripts/python -m pytest tests`.

**`normalize_loop.py` surgical bug fixes — 3-agent Plan→Implement→Check (merged `18a74c9`)**

Spec: `docs/specs/normalize-loop-bug-fixes-spec.md` (`903e6a5`). Three one-file edits, +7/−1 lines, three hunks.

- **Bug 1 — `enforce_lateral_width` log stat (`3b09e4f`):** `span_before` used `(max|x| − min|x|) · 2` which collapses sign when L/R sign is stable. Replaced with signed-half range. Stored in stats dict; not yet surfaced in `[width-lock]` log line.
- **Bug 2a — `correct_lr_swaps` all-NaN guard (`f642a87`):** 3-line early-return kills `RuntimeWarning: All-NaN slice encountered` on empty trajectories.
- **Bug 2b — `pelvis_y_signal` all-NaN guard (`d4e1b77`):** same-shape guard with same `sys.exit` string as `mask.sum() < 10` path (grep tooling preserved).
- 73 tests passing, warning count 6 → 5. Session closure: all 3 fixes + harness live on main via `18a74c9` + `f2ddc1c`.

**Next session:** (1) Scott curates remaining 20 URLs OR moves to plank (first static-hold test). (2) Validate normalize_loop fixes in real-world use on batch run.

### 2026-04-16 — architecture-map.md moved to docs/specs/ (audit fix)

- `docs/architecture-map.md` → `docs/specs/architecture-map.md` via `git mv`
- Updated references in `CLAUDE.md` (2 places) and `docs/specs/visual-polish-sprint.md` (1 place)
- Historical mentions in `docs/roadmap-archive.md` left unchanged (session log history)

---

### 2026-04-12 — Step 4 spec update + Step 5 SVG silhouettes + how-to animation + insecure-context camera fix

**Step 4 spec update + Step 5 SVG silhouettes**

- **Step 4:** `docs/specs/visual-polish-sprint.md` expanded from 13 → 22 exercises, grouped by drawStyle, added PNG-vs-canvas decision table.
- **Blank picker card bug fixed:** `drawMiniSilhouette()` was missing `kneeling` + `quadruped` cases — Hip Flexor Stretch, Cat-Cow, Bird-Dog showed blank tiles.
- **Library research:** Searched GitHub + web for open-source fitness silhouette sets. Finding: nothing covers all 22 exercises with a clean (non-ShareAlike) license. Niche exercises (arch hang, scapular pulls, L-sit, band pull-aparts, mobility work) missing from all free sets.
- **Step 5 decision path:** PNG with no API keys → SVG fallback (imagegen skill). Generated 7 unique SVGs in `assets/silhouettes/` covering all 22 exercises via drawStyle+drawVariant.
- **SVG integration:** `EXERCISE_SVGS` JS constant + `getSvgKey()` embedded in index.html. `renderExercisePicker()` now uses `<img src="data:image/svg+xml,...">` instead of `<canvas>` + `drawMiniSilhouette()`. All 22 picker cards now show pose-specific illustrations.

**Step 5 how-to animation**

- **How-to animation shipped:** `HOW_TO_KEYFRAMES` constant — 22 exercises × 2 keyframes each, all in normalized [0..1] canvas coords. `drawHowToSkeleton(w, h, ex)` lerps between frames using `(1 - cos(t·2π)) / 2` oscillation driven by `Date.now()`, draws blue (`rgba(96,165,250,0.88)`) stick skeleton + joint dots on `guideCtx`.
- **Integration:** Single call at end of `drawGuide()` gated on `state.workoutState === 'idle'`. Runs on existing 7.5fps idle throttle — no separate RAF loop needed. Blue color visually distinct from white static silhouette.
- **Exercise coverage:** Standing (squat, lunge, pistol, dip, lsit, shoulderdislocate, wristwarmup, bandpullapart), horizontal pushup (pushup, pike), horizontal plank (plank, row, glutebridge, foamroller), hanging front-view (pullup, deadhang, legraise, archhang, scapularpull), kneeling (hipflexor), quadruped (catcow, birddog).
- **Flakiness note:** Full Playwright suite occasionally shows 2 failures on first run due to port collision when running sequentially after another run. Second run always passes clean. Not caused by code changes.

**Insecure-context camera error fix**

- **Root cause:** `getUserMedia` requires HTTPS or localhost. Opening `index.html` directly as `file://` is not a secure context in Chrome; `--disable-web-security` bypasses CORS but does NOT grant secure-context status. No check existed — the app tried `getUserMedia` and received a cryptic `NotAllowedError`.
- **Fix 1 (prevention):** Added `window.isSecureContext` check at the top of `startCamera()`, before any `getUserMedia` call. If false, shows a friendly `<h2>Setup Required</h2>` message with step-by-step instructions: double-click `start.bat` → choose option 1 → open `http://localhost:8080`.
- **Fix 2 (diagnosis):** Improved `catch` block to branch on `err.name`: `NotAllowedError` → permission denied guidance; `NotFoundError` → no camera found; `NotReadableError` → camera in use by another app; fallback → generic message. Previously all errors showed the same generic text.
- **Tests:** 289 unit + 38 Playwright = 327 total, 0 failing.

**Next session:** Phone-test on iOS Safari: SVG picker cards + blue how-to animation. If both look good, Step 5 is done — move to Step 2 phone testing of all 22 exercises.

### 2026-04-11 — Playwright landmark injection expanded: glutebridge, pullup, legraise (38 tests)

- **glutebridge.spec.ts** — floor + rep-based + `invertedPolarity`: only exercise combining all three. Hip angle geometry verified (collinear = 180° bridged, knee-up = 90° flat). 2 tests.
- **pullup.spec.ts** — `downGate` (chin-over-bar gate): only exercise with this constraint. Two paths tested: gate blocks phase when chin below hands; gate allows rep when chin clears. 3 tests.
- **legraise.spec.ts** — hanging + rep-based + hip angle: simplest hanging rep path, no downGate. 2 tests.
- **Net: +4 tests** (7 written, 3 replaced existing placeholder registry checks). No regressions. 38/38 passing.
- **Remaining:** 13 placeholder specs still need Y4M recordings to expand.

> Earlier sessions archived in `docs/roadmap-archive.md`

## Reference Docs

<!-- Only include files that are genuinely referenced session-to-session. -->

- [`docs/refactor-audit-2026-04-10.md`](docs/refactor-audit-2026-04-10.md) — per-exercise behavioral equivalence audit; phone-test priority order
- [`docs/exercise-testing-protocol.md`](docs/exercise-testing-protocol.md) — 9-step phone testing checklist per exercise
- [`docs/specs/exercise-framework-spec.md`](docs/specs/exercise-framework-spec.md) — framework refactor spec
- [`docs/specs/visual-polish-sprint.md`](docs/specs/visual-polish-sprint.md) — visual polish sprint (Step 5, superseded)
- [`docs/specs/animation-paradigm-evaluation.md`](docs/specs/animation-paradigm-evaluation.md) — Step 5.5 paradigm decision doc
- [`docs/specs/animation-pipeline-implementation.md`](docs/specs/animation-pipeline-implementation.md) — Step 5.5 implementation spec
- [`docs/specs/picker-svg-audit-fix.md`](docs/specs/picker-svg-audit-fix.md) — Backlog 4 spec (5 wrong pickers)
- [`docs/roadmap-archive.md`](docs/roadmap-archive.md) — earlier session history
