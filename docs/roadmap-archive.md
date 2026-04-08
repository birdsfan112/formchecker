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
