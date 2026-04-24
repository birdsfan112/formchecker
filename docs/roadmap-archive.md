# FormCheck Roadmap Archive

Detailed session logs and completed phase checklists. Moved here from roadmap.md to keep the active roadmap lean.

---

## Completed Phase Checklists

### Phase 1: Core Tracking MVP ✅

- [x] MediaPipe Pose loaded via CDN script tags
- [x] Camera feed with mirrored skeleton overlay
- [x] Rep counting for push-ups, squats, pull-ups, lunges
- [x] Plank timer mode
- [x] Form analysis with angle-based checks
- [x] Voice coaching via Web Speech API
- [x] Set tracking and workout log
- [x] Camera angle detection (front vs side view)
- [x] iOS Safari audio unlock
- [x] Per-cue cooldowns (15s) and max 1 voice cue per rep
- [x] Movement direction tracking (no cues while ascending)
- [x] Regression-friendly suggestions after first set
- [x] Camera angle hints per exercise
- [x] HTTPS server for phone access
- [x] ngrok support for remote access

### Phase 2: UX & Positioning ✅

- [x] Silhouette guide overlay — filled human-shaped silhouettes for all exercises (side profile, horizontal, hanging)
- [x] Ready/Start flow — idle state with open-palm gesture or Ready button, 3-2-1 countdown
- [x] Pause/Stop controls — Pause button during active, Finish Set to log and return to idle
- [x] Larger feedback text — 28px bold with text-shadow, readable from 6+ feet
- [x] No phantom reps — workout state machine gates analysis to 'active' state only
- [x] Palm gesture start — open palm detection using Pose hand landmarks (2s hold to trigger)
- [x] Plank pose validation — body must be horizontal before form analysis starts
- [x] Auto-start for floor exercises — pushup/plank auto-detect position and start after 3s hold (no hand raise needed)
- [x] Redraw pushup/plank silhouettes — bigger figure (ground at 76% of screen), natural pushup arm angle, distinct plank forearm
- [x] Exercise transition polish — counter resets with yellow flash + scale animation, exercise name slides in, state message shows "✓ [Exercise]" for 1.6s
- [x] Debug cleanup for GitHub Pages — removed debug overlay from `detectPalmGesture`

### Phase 3: Enhanced Form Analysis + Audio ✅

- [x] User calibration save/load — Save rep detection thresholds as JSON, load from file. "Save Cal" + "Load Cal" buttons.
- [x] Warmup calibration — "Warmup Cal" button: 3-rep flow learns actual ROM using direction-reversal detection. Covers pushup, squat, pullup, lunge.
- [x] Relative thresholds — Depth cues now fire at `calibrated_depth + 12°` (scales to user's range). Lunge gets depth cue for the first time.
- [x] Frame positioning auto-detect — Guide silhouette tints green when aligned. State message gives real-time hints.
- [x] Richer audio coaching — Milestone encouragement every 5 reps, breathing reminder at rep 2, tempo cue when avg pace < 1.8s.
- [x] Per-rep form score — Frame scores averaged per rep, form stat flashes per-rep score (green/yellow/red), fades to set average.
- [x] End-of-set summary — `buildSetSummary()`: "Excellent form!", "Good form on N of N", etc.

### Phase 4: Workout Logger with Persistence ✅

- [x] LocalStorage persistence — saves every set to `formcheck_sessions` on Finish Set; restores today's session on page reload. Cap at 90 sessions.
- [x] Session history — Log modal History tab shows all past sessions grouped by date, newest first.
- [x] Progress charts — stacked bar chart (canvas, no dependencies) in Progress tab: total reps per session per exercise, last 7 days.
- [x] Export — Export JSON and Export CSV buttons in Log modal. `buildCSVExport()` is pure and tested.
- [x] Workout templates — save today's exercise sequence as a named template; load to auto-advance after each set with voice prompts. Badge shows remaining.

---

## Session Log

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

### 2026-04-11 — Roadmap migration to template v2

- Added Next Session field, renamed Blockers → External Blockers, fixed field order; renamed Phase 5 section → Current Sprint; added section comments and Reference Docs section; no content changes
- Phase value mapped: "Phase 5 — Exercise Library Expansion" → Implement
- Next: Scott phone-test Session 1 exercises per `docs/refactor-audit-2026-04-10.md` focus order

### 2026-04-10 — Audit-derived Playwright specs: bandpullapart, lsit, dip (34 tests, all passing)

- **Why:** Three behavioral divergences from the framework audit (D1–D3) had no automated regression guard. Y4M recordings can't cover these — landmark injection lets us assert exact per-frame output without real camera or video.
- **New harness capabilities shipped in `_helpers.ts`:** `window.__poseInstance` exposure; `VIDEO_STUB` stubs `play`; `startWorkout(page)` fires `#btn-start` via `dispatchEvent`; `makeLandmarks(overrides)` builds full 33-element array; `injectPoseFrame(page, lm)` drives the real `onResults` path.
- **Key ordering constraint:** `switchExercise()` resets `state.workoutState` to 'idle'. Must call it BEFORE `startWorkout()`.
- **Specs added:** `bandpullapart.spec.ts` (invertedPolarity rep count), `lsit.spec.ts` (MM:SS in #rep-counter), `dip.spec.ts` (orientation hint NOT present). 6 new tests + 3 updated placeholder → real specs.
- **Tests: 289 unit + 34 Playwright = 323 total, 0 failing.**
- **Next session:** Scott phone-tests exercises (Step 2). Record Y4M files to expand remaining 16 placeholder Playwright specs.

### 2026-04-10 — Playwright smoke-test harness scaffolded (31 tests, all passing)

- **Why:** The framework refactor (94c634d) was a 2185-line diff with no automated browser test safety net.
- **Architecture constraint:** All app JS is closure-scoped inside `window.addEventListener('load', fn)` — `page.evaluate()` cannot reach it. Workaround: DOM-observable strategy (`#exercise-select` options mirror the registry).
- **CDN mocking:** `addInitScript` pre-defines stubs + `page.route` returns empty JS. Fake webcam: `black-frame-320x240.y4m` → `poseLandmarks=null` → rep counter stays 0 deterministically.
- **Files added:** `playwright.config.ts`, `package.json`, `tests/playwright/exercises/_helpers.ts`, 3 real specs, 19 placeholder stubs, `fixtures/black-frame-320x240.y4m`, `docs/playwright-harness-guide.md`
- **Tests: 289 unit + 31 Playwright = 320 total, 0 failing.**

### 2026-04-10 — Behavioral-equivalence audit of framework refactor (94c634d)

- **Finding: 19 EQUIVALENT, 3 DIVERGENT, 0 UNCERTAIN.** bandpullapart old rep counter was silently broken (phases never fired); lsit timer display changed MM:SS; dip orientation hint dropped.
- **Deliverable:** `docs/refactor-audit-2026-04-10.md` — per-exercise table, divergence details, 3-session phone-test focus order.

### 2026-04-10 — Exercise framework refactor complete (Step 3)

- All 22 exercises migrated to `addExercise(config)`. Extensions: `invertedPolarity`, `downGate(lm)`. Tests: 284 → 289 passing.
- Two dead-code findings → Backlog §2; dip orientation nudge dropped → Backlog §3

### 2026-04-09 — Framework spec, research docs, roadmap sequencing

- Research docs persisted: `docs/ux-research.md`, `docs/system-audit.md`, `docs/specs/exercise-framework-spec.md`
- `dispatch-protocol` skill created and installed
- Roadmap updated with full sequenced plan; Step 1 open questions surfaced for Scott's review
- Stale worktrees pruned: loving-gauss, nifty-feistel, nostalgic-fermat, wonderful-mcclintock

### 2026-04-09 — Mobility/PT Batch (exercises 16-22)

- Added: Shoulder Dislocates, Hip Flexor Stretch, Wrist Warm-up, Band Pull-Aparts, Foam Roller, Cat-Cow, Bird-Dog
- Two new silhouette functions: `drawKneelingStretch()`, `drawQuadruped()` (with bird-dog variant)
- 31 new tests; 207 total, 0 failing. `docs/exercise-testing-protocol.md` updated for all 22 exercises.

### 2026-04-09 — Arch Hang + Scapular Pulls (exercises 14-15)

- Arch Hang + Scapular Pulls added; `buildSetSummary` refactored to use `exerciseRegistry[exercise]?.isTimed`
- 11 new tests; 176 total, 0 failing

### 2026-04-07 — Thermal fix, welcome screen, exercise picker, testing protocol

- Lowered MediaPipe `modelComplexity` 1→0 (~50% less GPU); rest period throttles to 4fps via `isResting` flag
- Welcome screen: "Calibrate & Start", "Load Calibration", "Jump to Workout"
- Exercise dropdown replaced with visual picker modal (2-column card grid)
- `docs/exercise-testing-protocol.md` — new 9-step per-exercise phone testing checklist; 165 tests passing

### 2026-04-04 — Batch 2 exercises + Phase 5 engine refactor

- Batch 2: Inverted Rows, L-Sit, Pistol Squat, Glute Bridge. All 13 exercises in registry; 165 tests passing
- Data-driven `exerciseRegistry`; `invertedPolarity` + `downGate`; calibration spans multiple exercises; consecutive-frame direction filter (3 frames)

### Session: 2026-03-26
**Completed:**
1. **Auto-pause rep counting when out of position** — Added `isInPosition(lm, exercise)` function. Counter grays out with exercise-specific message. Plank timer also resets when user leaves position.
2. **Frame throttling + performance** — Camera inference dropped from 1280×720 → 640×480. Added frame skip counter: pose inference runs every 2nd frame (~15fps). Video display still at full frame rate.
3. **User calibration save/load (Phase 3 start)** — `calibration` object holds rep-detection thresholds for all exercises. "Save Cal" downloads JSON; "Load Cal" restores. Merge is safe against partial/old files.

**Tests:** 45 → 61 passing (+16: 10 isInPosition + 6 calibration).

### Session: 2026-03-26 (second session)
**Completed:**
1. **Redraw pushup/plank silhouettes** — `drawHorizontalSide()` completely rewritten. Ground line moved to 76%; pushup arm has clear diagonal; plank shows forearm flat on ground; body thickness increased.
2. **Exercise transition polish** — CSS `@keyframes counterReset` + `exerciseNameIn`. State overlay shows "✓ [Exercise name]" for 1.6s before reverting to idle prompt.
3. **Debug cleanup for GitHub Pages** — Removed 9-line debug block from `detectPalmGesture` that was overwriting the camera-angle hint.

**Tests:** 61/61 passing (no new tests — changes were all UI/visual).

**Phase 2 complete. Ready for Phase 3.**

### Session: 2026-03-26 (end-of-session wrap)
Phase 2 fully complete and Phase 3 calibration feature shipped. GitHub Pages deployed at https://birdsfan112.github.io/formchecker/

**Tests:** 61/61 passing.

### Session: 2026-03-26 (fourth session — silhouette angle corrections + performance heat fixes)
**Completed:**
1. **Silhouette angle corrections** — pushup body slope ~24° above horizontal, plank ~16°. Fixed plank forearm backward-pointing bug (wrist coordinate math was inverted).
2. **Heat fix 1: canvas dimension caching** — Canvas context state no longer resets on every frame when dimensions are unchanged.
3. **Heat fix 2: dynamic frame throttle** — Frame skip rate adapts to workout state: 3-of-4 frames skipped when idle (~7–8 fps); 1-of-2 when active (~15 fps).
4. **CLAUDE.md cleanup** — Removed erroneous "Current phase" line.

**Tests:** Existing suite still passing. No new tests.

### Session: 2026-03-26 (fifth session — CLAUDE.md compaction)
**Completed:**
1. **CLAUDE.md compaction** — Active behavioral layer reduced from ~12k to ~9.7k chars. Rule 2 extracted to `docs/architecture-map.md`. Rule 7 extracted to `docs/voice-architecture.md`. Known Quirks trimmed from 5 bullets to 2. Lessons renumbered 1–12.
2. **Two new docs/ files created** — `docs/architecture-map.md` and `docs/voice-architecture.md`.

No code changes. No test changes.

### Session: 2026-03-27 (Phase 3 completion)
**Completed all remaining Phase 3 items (2–7):**
1. Warmup calibration — "Warmup Cal" button, 3-rep flow, direction-reversal detection.
2. Relative thresholds — Depth cues scale to calibrated range.
3. Frame positioning auto-detect — `checkPositioning()` checks landmark visibility + vertical span. Silhouette tints green.
4. Richer audio coaching — Milestone phrases every 5 reps, breathing reminder at rep 2, tempo cue.
5. Per-rep form score — Frame scores averaged per rep, form stat flashes green/yellow/red.
6. End-of-set summary — `buildSetSummary()` speaks contextual recap.

**Tests:** 61 → 95 (+34 new).
**Phase 3 status: COMPLETE ✅**
**Git note:** Local git repo was missing — initialized fresh, connected to origin, rebased on existing remote history.

### Session: 2026-03-28 (Phase 3 phone-test fixes)
**Based on Scott's phone testing feedback — three issues fixed:**
1. **Warmup calibration overhaul** — Complete rewrite. Old: press button → instant countdown. New: guided 2-exercise sequence (squat → pushup), positioning phase with silhouette + green tint + 2-second hold, voice guidance, direction-reversal threshold bumped from 1° to 4°.
2. **Pushup/plank silhouettes lowered** — Ground line moved from `h * 0.76` to `h * 0.85`.
3. **Per-rep form score flash visibility** — Added `#rep-score-flash` element: 64px bold text, centered on camera feed, with scale-pop animation (1.6s).

**Tests:** 95 → 101 (+6 new).

### Session: 2026-03-31 (Bug fixes + floor line feature)
**Completed 3 bug fixes, 1 feature, 1 transition improvement:**
1. **Silhouette not showing after exercise switch** — Added dimension guards to `drawGuide()` with `requestAnimationFrame` retry (max 3 attempts).
2. **Warmup calibration fires too easily** — Direction-change threshold bumped to 4°. Added `warmupDirectionFrames` counter requiring 3 consecutive frames.
3. **Not pausing when moving from position (squat/lunge)** — Enhanced `isInPosition()` for squat/lunge: checks hip landmark visibility (>0.5) and hip center Y (0.25–0.75).
4. **Floor exercise alignment line** — `drawHorizontalSide()` ground line upgraded: opacity 0.55, width 4px, solid, spans 3%–95%. Added "FLOOR" text label.
5. **Squat transition feedback** — Standing exercises now get spoken prompt on switch. Ready button gets brief scale-up + glow highlight animation.

**Tests:** 95 → 106 (+11). Running total after merge with 2026-03-28 work: **112, all green**.

### Session: 2026-04-01 — Git hygiene
- Created `.gitignore` (blocks .pem private keys, large .mov video, caches, .claude/)
- Created `.claudeignore` (blocks .claude/ worktrees, .mov video, .pem files, old test reports)
- Pushed .gitignore to existing GitHub repo: birdsfan112/formchecker
- **Security note:** cert.pem and key.pem were never committed to git — .gitignore now prevents accidental staging.

### Session: 2026-04-02 — Git recovery + sleepy-edison merge
1. **Committed stranded main-branch work** (`a89f6a8`) — 290 lines of changes had been sitting unstaged. Covered: guided 2-exercise calibration sequence, per-rep score flash, silhouette height fix, smart threshold derivation, 6 new tests, `.claudeignore`, `TESTING_SUMMARY.txt`, `TEST_REPORT.md`.
2. **Merged `claude/sleepy-edison`** (`d096a35`) — branch had one unmerged commit with: 3-frame consecutive-direction filter in `analyzeWarmup`, `drawGuide` dimension guards with `requestAnimationFrame` retry, squat/lunge position gate, floor exercise ground line improvements, standing exercise transition spoken prompts + Ready button glow, 11 new tests.
3. **Merge conflicts resolved** — all four conflicts were additive; nothing dropped.

**Final test count: 112, all green.**

### Session: 2026-04-03 (Phase 4 — Workout Logger with Persistence)
**All Phase 4 items complete in one autonomous session:**
1. **LocalStorage persistence** — `saveCurrentSession()` on every Finish Set; `loadTodaySession()` on page load. Cap at 90 sessions. Storage-full: graceful trim + retry.
2. **Session history view** — Log modal 3 tabs (Today / History / Progress). History tab groups by date. XSS-safe via `escapeHtml()`.
3. **Progress chart** — `drawProgressChart()` stacked bar chart on `<canvas>`. `aggregateRepsByExercise()` is pure + tested. No chart library.
4. **Export** — `buildCSVExport(history)` pure + tested. Export JSON and Export CSV buttons.
5. **Workout templates** — `formcheck_templates` in localStorage. Security: data-attribute + event delegation for apostrophes/quotes in template names.

**Tests:** 112 → 127 (+15). **Phase 4: COMPLETE ✅**

### Session: 2026-04-04 (Pre-Phase 5 Reliability Sprint)
**7 reliability/accessibility improvements:**
1. **ARIA live regions** — `#form-feedback`, `#state-message`, `#countdown-display`, `#rep-counter`, `#angle-hint`, `#rep-score-flash` all have `aria-live` / `role` / `aria-label`. Screen readers can announce coaching cues.
2. **Camera permission rationale dialog** — Plain-language explanation before calling `getUserMedia`. `#loading` hidden until user taps "Enable Camera".
3. **Colorblind-safe indicators** — Semantic feedback colors changed from red/green to orange/blue: `.feedback-good` → `#60a5fa` (blue), `.feedback-bad` → `#fb923c` (orange).
4. **Visibility hysteresis in `checkPositioning`** — Two-speed hysteresis: 0.45 to enter aligned, 0.30 to stay. Prevents flickering at the detection boundary.
5. **Wall-clock direction filtering in `analyzeWarmup`** — Frame-count filter replaced with 150ms wall-clock timer (`warmupDirectionStartTime`). Consistent at all frame rates.
6. **Web Speech re-unlock after backgrounding** — `visibilitychange` listener re-primes iOS speechSynthesis when returning to foreground.
7. **WebGL context loss recovery** — `visibilitychange` listener runs 5-second watchdog; calls `poseCamera.start()` if no results since returning from background.

**Tests:** 127 → 137 (+10).

### Session: 2026-04-04 (Phase 5 — Engine refactor + 4 new exercises)
**Data-driven engine refactor + first batch of Phase 5 exercises:**
1. **exerciseRegistry** — merged `exerciseMeta` + `exercises` into one unified registry. Each entry is self-contained: name, hint, guide flags, `isInPosition`, `outOfPositionMsg`, `analyze`.
2. **Type-flag-driven logic** — replaced all hardcoded `exercise === 'plank'` / `=== 'pushup'` checks throughout state machine, drawGuide, detectAutoStart.
3. **`isInPosition` delegated** — thin wrapper calls `exerciseRegistry[exercise].isInPosition(lm)`.
4. **`drawGuide` data-driven** — uses `exerciseRegistry[ex].drawStyle` + `drawVariant`.
5. **4 new exercises:** Pike Push-ups (`pike`), Dips (`dip`), Dead Hang (`deadhang`), Leg Raises (`legraise`).
6. **Supporting updates:** `defaultCalibration`, `applyAllCalibrationResults`, `getPrimaryAngle`, `EXERCISE_COLORS`, `checkPositioning`, dropdown.

**Tests:** 137 → 152 (+15).

### Session: 2026-04-04 (Calibration UX polish + Rest screen)
**4 calibration/UX fixes:**
1. **Warmup rep counter shows "x/3"** — `#rep-counter` shows `0/3` → `1/3` → `2/3` → `3/3` during calibration tracking.
2. **More guidance text during calibration** — Positioning phase shows: step number, camera hint in `#angle-hint`, descriptive state message. Tracking phase shows live directional cues.
3. **Clearer post-calibration transition** — State message reads "✓ Calibrated! Tap Ready to start your Push-ups."
4. **Rest screen** — After "Finish Set" (with reps logged), camera area goes dark and shows 60-second rest countdown. "Start Next Set" skips early. Template auto-advance happens after rest ends.

**Tests:** 127/127 passing (no new tests — all UI/state flow).

### Session: 2026-04-04 (Phase 5 — Second batch: 4 more exercises)
**Second batch of Phase 5 exercise additions:**
1. **Inverted Rows** (`row`) — horizontal body, elbow angle, body-sag form cue. Calibration from pushup warmup.
2. **L-Sit** (`lsit`) — timed hold, shoulders-above-hips gating, hip angle form cue ("Keep legs horizontal"). 15s spoken milestones.
3. **Pistol Squat** (`pistol`) — single-leg squat, min knee angle (working leg), shoulder-level balance check. Calibration from squat minus 10°.
4. **Glute Bridge** (`glutebridge`) — `isFloor: true`, hip angle rep counting, full-extension cue.
5. **Supporting updates:** `defaultCalibration`, `applyAllCalibrationResults`, `getPrimaryAngle`, `checkPositioning`, `EXERCISE_COLORS`, dropdown.

**Tests:** 152 → 165 (+13). **Current test count: 165, all passing.**

### Session: 2026-04-07 — Thermal fix, welcome screen, exercise picker, testing protocol
1. **Thermal reduction** — `modelComplexity` lowered 1→0 (lite MediaPipe model, ~50% less GPU); rest period throttles to 4fps via `isResting` flag; `checkPositioning()` cached on `state.lastPositionResult` (called once per frame, not twice).
2. **Welcome screen** — "Calibrate & Start", "Load Calibration", "Jump to Workout" replace bare Enable Camera button with intentional onboarding.
3. **Visual exercise picker** — dropdown replaced with full-screen modal grid; 2-column card layout, each card shows name + mini stick-figure silhouette (standing/horizontal/hanging style); hidden `<select>` retained for internal state.
4. **`docs/exercise-testing-protocol.md`** — new doc: repeatable 9-step per-exercise phone testing checklist.

**Tests:** 165, all passing (no new tests — changes were all UI/performance).
