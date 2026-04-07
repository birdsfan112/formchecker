## Status
- **Phase:** Phase 5 — Exercise Library Expansion (in progress)
- **Updated:** 2026-04-05
- **Summary:** 165 tests passing, 13 exercises implemented. Phone testing checklist pending before adding remaining exercises (arch hangs, mobility).
- **Autonomous:** Implement arch hangs/scapular pulls and mobility exercises after phone testing results, write new tests
- **Needs Scott:** Complete phone testing checklist (test existing exercises on actual phone), confirm arch hang/mobility exercise form rules
- **Blockers:** Phone testing not yet done — blocks remaining Phase 5 exercises

# FormCheck — AI Fitness Form Coach
## Architecture & Roadmap

---

### Vision
A real-time AI fitness form coach that uses your phone camera + MediaPipe pose estimation to analyze bodyweight exercise form, count reps, give audio coaching cues, and log workouts. Personal use first, potential monetization later.

### Tech Stack
- **Pose Detection:** MediaPipe Pose (33 body landmarks, 30+ FPS, runs in browser)
- **Frontend:** Single-file Progressive Web App (HTML/JS/CSS)
- **Audio Coaching:** Web Speech API (plays alongside music)
- **Serving:** Python HTTPS server locally, ngrok for remote access; GitHub Pages for static hosting
- **Live URL:** https://birdsfan112.github.io/formchecker/
- **No backend required** — everything runs client-side

---

## Phase 1: Core Tracking MVP ✅ (Complete)
**Goal:** Working skeleton overlay + rep counting + basic form feedback

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

---

## Phase 2: UX & Positioning ✅ (Complete)
**Goal:** Make the app usable without guessing — clear positioning, start/stop flow, readable feedback

- [x] **Silhouette guide overlay** — filled human-shaped silhouettes for all exercises (side profile, horizontal, hanging)
- [x] **Ready/Start flow** — idle state with open-palm gesture or Ready button, 3-2-1 countdown
- [x] **Pause/Stop controls** — Pause button during active, Finish Set to log and return to idle
- [x] **Larger feedback text** — 28px bold with text-shadow, readable from 6+ feet
- [x] **No phantom reps** — workout state machine gates analysis to 'active' state only
- [x] **Palm gesture start** — open palm detection using Pose hand landmarks (2s hold to trigger)
- [x] **Plank pose validation** — body must be horizontal before form analysis starts
- [x] **Auto-start for floor exercises** — pushup/plank auto-detect position and start after 3s hold (no hand raise needed)
- [x] **Redraw pushup/plank silhouettes** — redrawn with better proportions: bigger figure (ground at 76% of screen), natural pushup arm angle (hand well left of shoulder), distinct plank forearm (elbow + wrist flat on ground vs pushup's extended arm)
- [x] **Exercise transition polish** — counter resets with yellow flash + scale animation, exercise name slides in, state message shows "✓ [Exercise]" for 1.6s before reverting to idle prompt
- [x] **Debug cleanup for GitHub Pages** — removed debug overlay from `detectPalmGesture` that was writing raw detection values to `#angle-hint` every frame; no other debug artifacts found

---

## Phase 3: Enhanced Form Analysis + Audio ✅ (Complete)
**Goal:** Smarter, more personalized coaching

- [x] **User calibration save/load** — Save rep detection thresholds as JSON, load from file. Compatible with static GitHub Pages hosting. "Save Cal" + "Load Cal" buttons in controls bar. Covers pushup, squat, pullup, lunge thresholds.
- [x] **Warmup calibration** — "Warmup Cal" button: 3-rep flow learns actual ROM using direction-reversal detection. Updates calibration thresholds automatically. Covers pushup, squat, pullup, lunge.
- [x] **Relative thresholds** — Depth cues now fire at `calibrated_depth + 12°` (scales to user's range). Lunge gets a depth cue for the first time.
- [x] **Frame positioning auto-detect** — Guide silhouette tints green when aligned. State message gives real-time hints ("Move back", "Good position — raise hand to start").
- [x] **Richer audio coaching** — Milestone encouragement every 5 reps (4 rotating phrases), breathing reminder once per set at rep 2, tempo cue when avg rep pace < 1.8s.
- [x] **Per-rep form score** — Form stat flashes per-rep score (green/yellow/red) after each rep, then fades to set average.
- [x] **End-of-set summary** — Spoken recap from `buildSetSummary()`: "Excellent form!", "Good form on N of N", "N clean reps — focus on form", or "Form needs work".

---

## Phase 4: Workout Logger with Persistence ✅ (Complete)
**Goal:** Track workouts over time

- [x] **LocalStorage persistence** — saves every set to `formcheck_sessions` on Finish Set; restores today's session automatically on page reload
- [x] **Session history** — Log modal History tab shows all past sessions grouped by date
- [x] **Progress charts** — stacked bar chart (canvas, no dependencies) in Progress tab: total reps per session per exercise, last 7 days, with color-coded legend
- [x] **Export** — Export JSON and Export CSV buttons in Log modal download full workout history
- [x] **Workout templates** — save today's exercise sequence as a named template; load to auto-advance exercises after each set; badge shows remaining exercises in the sequence

---

## Phase 5: Exercise Library Expansion
**Goal:** Cover the full r/bodyweightfitness recommended routine + mobility/PT

### Engine Refactor ✅
- [x] **Data-driven exerciseRegistry** — merged `exerciseMeta` + `exercises` into one registry. Each entry is self-contained: metadata, silhouette flags, `isInPosition`, `outOfPositionMsg`, and `analyze`. Adding a new exercise is now one object + one `<option>`.
- [x] **Type flags** — `isFloor`, `isTimed`, `drawStyle`, `drawVariant` replace all hardcoded `exercise === 'plank'` / `exercise === 'pushup'` checks throughout the state machine, drawGuide, and detectAutoStart.
- [x] **`isInPosition` delegated** to registry — standalone function is now a thin wrapper.
- [x] **`getOutOfPositionMsg`** replaces `OUT_OF_POSITION_MSG` lookup table — uses registry.

### Bodyweight Strength
- [x] Pike push-ups (side view, elbow angle, hips-high form check, derives calibration from pushup)
- [x] Dips (front/side view, elbow angle, elbow-flare form check, derives calibration from pushup)
- [x] Dead Hang (timed, hanging front view, same as plank-style timer)
- [x] Leg Raises (hanging, front view, hip angle tracking, straight-leg form check)
- [x] Inverted Rows (horizontal body, elbow angle, body-sag form check, derives calibration from pushup)
- [x] L-Sit (timed, seated with legs extended, hip angle form check)
- [x] Pistol Squat (single-leg, min knee angle, derives calibration from squat -10°)
- [x] Glute Bridge (floor, hip angle rep counting, full extension cue)
- [ ] Arch hangs / scapular pulls

### Mobility & PT
- [ ] Shoulder dislocates (band/dowel)
- [ ] Hip flexor stretches
- [ ] Wrist warm-up circles
- [ ] Dead hangs
- [ ] Band pull-aparts
- [ ] Foam roller positions
- [ ] Cat-cow / bird-dog

### Exercise Metadata
Each exercise will need:
- Primary joint angles to track
- Phase detection thresholds (up/down)
- Camera angle requirement (front/side/either)
- Form check rules with severity levels
- Regression suggestions
- Silhouette guide coordinates

---

## Phase 6: Monetization & Distribution
**Goal:** Make it available to others

- [ ] **PWA install prompt** — add to home screen on iOS/Android
- [ ] **Landing page** — simple marketing site
- [ ] **Freemium model** — basic exercises free, full library + progress tracking paid
- [ ] **User accounts** — cloud sync of workout data
- [ ] **Social sharing** — share workout summaries
- [ ] **App store** — consider Capacitor/Ionic wrapper for native app stores

---

## Sprint: Visual Polish — Silhouettes & How-To Animations
**Goal:** Replace drawn-in-code silhouette outlines with photorealistic PNG silhouettes, and add looping skeleton animations that show correct movement form while idle on each exercise.

### Approach

**Silhouettes — PNG base64 in-HTML**
Generate a photorealistic transparent-background PNG silhouette for each of the 13 exercises using an image generator (one pose per exercise — the canonical "in position" view). Convert each to a base64 data URI and embed directly in `index.html` as `<img>` tags or CSS background-image values. The existing `drawGuide()` canvas overlay remains for alignment tinting and the floor line; the PNG renders beneath it as a visual reference. Single-file constraint preserved — no external assets.

**How-to animations — CSS-animated MediaPipe skeleton**
For each exercise, define a small keyframe sequence (2–4 poses as arrays of [x, y] landmark positions) representing the correct movement arc. While the app is idle on that exercise, loop through the keyframe poses using CSS animations or a lightweight `requestAnimationFrame` loop, drawing the skeleton on the guide canvas. Reuses the existing `drawConnectors`/`drawLandmarks` helpers — no new dependencies. Shows the user exactly what the movement looks like before they start.

### Why this approach
- **PNGs over canvas-drawn shapes**: Canvas silhouettes required precise coordinate math per exercise; photo-quality PNGs are instantly readable at 6+ feet and don't need redrawing on every frame.
- **Base64 embed**: Keeps the single-file constraint. No CDN, no extra HTTP requests.
- **CSS-animated skeleton over video**: Consistent with the app's visual language (MediaPipe skeleton), zero file size overhead, loops infinitely without user interaction.
- **No new ML models or libraries**: Everything runs on existing draw utilities.

### Tasks

#### Silhouettes
- [ ] Generate PNG silhouettes for all 13 exercises (transparent background, side or front profile matching current camera angle per exercise)
  - Exercises: push-ups, squats, pull-ups, lunges, plank, pike push-ups, dips, dead hang, leg raises, inverted rows, L-sit, pistol squat, glute bridge
- [ ] Convert each PNG to base64 data URI
- [ ] Add an `img` element (or CSS background) for the silhouette in the canvas container, positioned to align with the guide overlay
- [ ] Show/hide the correct silhouette when exercise changes (mirrors existing drawGuide logic)
- [ ] Confirm silhouettes render correctly on phone at 6+ feet — must be readable without labels

#### How-to animations
- [ ] For each exercise, define 2–4 keyframe landmark arrays (normalized 0–1 coordinates) representing the movement arc (e.g., pushup: arms extended → arms bent at bottom)
- [ ] Build a `playHowToAnimation(exercise)` function: cycles through keyframes at ~1s per step using `setInterval` or `requestAnimationFrame`, draws skeleton on guide canvas
- [ ] Trigger animation when app enters idle state on an exercise; cancel when workout starts or exercise changes
- [ ] Confirm animation doesn't interfere with `checkPositioning` (green tint) or `drawGuide` floor line — layering order matters
- [ ] Phone test: does animation loop smoothly at 6+ feet? Is the movement arc clear?

#### Integration
- [ ] Write regression tests confirming: exercise change shows correct silhouette, animation starts on idle and stops on workout start
- [ ] Update `docs/architecture-map.md` to document new silhouette layer and animation function

---

## Key Technical Decisions
- **Single HTML file** — keeps deployment dead simple, no build step
- **MediaPipe over TensorFlow.js** — faster, more accurate, better mobile support
- **Web Speech API** — works alongside music, no audio file management
- **No backend** — privacy-first, no data leaves the device
- **Self-signed HTTPS + ngrok** — solves mobile camera access without deployment

## Known Limitations
- Baggy clothing can throw off landmark detection
- Side view vs front view affects which checks are reliable
- MediaPipe occasionally jitters on partially occluded limbs
- iOS Safari requires user gesture to unlock speech synthesis
- Self-signed certs need manual "trust" step on each device

---

## Session Log

### Session: 2026-03-26
**Completed:**
1. **Auto-pause rep counting when out of position (bug fix)** — Added `isInPosition(lm, exercise)` function that checks body pose before running exercise analysis. When user stands up mid-pushup set or leaves plank, rep counter grays out (`#rep-counter.count-paused` CSS class) and feedback shows exercise-specific message (e.g. "Get into pushup position"). Counter clears when they return. Plank timer also resets when user leaves position. Works for all 5 exercises. Removed now-redundant vertical span check from plank analyzer.
2. **Frame throttling + performance** — Camera inference resolution dropped from 1280×720 → 640×480 (fewer pixels for MediaPipe to process). Added frame skip counter: pose inference runs every 2nd frame (~15fps instead of 30fps). Video display still runs at full frame rate. Model complexity was already at 1 (confirmed, no change needed).
3. **User calibration save/load (Phase 3 start)** — `calibration` object holds rep-detection thresholds for pushup, squat, pullup, lunge. All exercise analyzers now read from `calibration` instead of hardcoded values. "Save Cal" button downloads JSON file; "Load Cal" label+file input restores it. Merge is safe against partial/old files — missing keys fall back to defaults. No backend required (static GitHub Pages compatible).

**Tests:** 45 → 61 passing (added 16 new: 10 isInPosition + 6 calibration). All green.

**Phone testing needed:** Auto-pause grayout, calibration file round-trip, confirm no perceived lag from frame throttling.

### Session: 2026-03-26 (second session)
**Completed:**
1. **Redraw pushup/plank silhouettes** — `drawHorizontalSide()` completely rewritten. Key changes: ground line moved from 68% to 76% of screen height (figure ~60% taller); pushup arm now has a clear diagonal (hand at 14% width vs shoulder at 27%); plank shows forearm flat on ground (elbow + wrist both on floor, upper arm drops nearly vertical) — unmistakably different from pushup's extended arm; body thickness increased from h*0.035 to h*0.050; both figures share the same body spine points, only arm section differs.
2. **Exercise transition polish** — Added CSS `@keyframes counterReset` (scale-pop + yellow flash) and `exerciseNameIn` (slide-in) animations. Exercise select handler now: triggers both animations on change, briefly shows "✓ [Exercise name]" in the state overlay message for 1.6s before reverting to the correct idle prompt for that exercise type. Uses `void el.offsetWidth` to force reflow and reliably restart animations on rapid exercise switches.
3. **Debug cleanup for GitHub Pages** — Removed 9-line debug block from `detectPalmGesture` that wrote raw detection values (`wrist-above`, `avgFingerVis`, etc.) to `#angle-hint` every frame while idle. Comment even said "remove after tuning." Also had a side effect: it was overwriting the legitimate camera-angle hint shown at startup. No other debug artifacts found (no console.logs, no debug buttons/panels).

**Tests:** 61/61 passing (no change to count — changes were all UI/visual, no new pure logic to unit test).

**Phase 2 status:** All items now complete. Ready to begin Phase 3 (Enhanced Form Analysis + Audio).

**Phone testing needed:** Silhouette proportions at actual 6-foot viewing distance (pushup vs plank should look clearly different), exercise transition animations at speed, confirm camera hint is now visible on app load (was being overwritten by debug text).

### Session: 2026-03-26 (end-of-session wrap)
**Summary:** Phase 2 fully complete and Phase 3 calibration feature shipped. GitHub Pages deployed at https://birdsfan112.github.io/formchecker/ — app is now publicly accessible with no local server needed.

**Phase 2 complete items (across sessions above):** Auto-pause rep counter when out of position (all 5 exercises); frame throttling + 640×480 resolution drop for phone thermals; pushup/plank silhouette redraw (larger, clearer, unmistakably different poses); exercise transition polish (yellow flash + slide-in label); debug artifact removed from `detectPalmGesture`.

**Phase 3 in progress:** Save/Load calibration JSON buttons added; all exercise thresholds now user-configurable; merge-safe against partial/old calibration files; static-hosting compatible (no backend).

**Tests:** 61/61 passing.

**Next session:** Phone test auto-pause grayout and calibration file round-trip. When ready, continue Phase 3: warmup calibration (3 slow reps to learn user's range), relative thresholds, richer audio coaching. Possibly evaluate auto exercise detection.

### Session: 2026-03-26 (fourth session — silhouette angle corrections + performance heat fixes)
**Completed:**
1. **Silhouette angle corrections** — `drawHorizontalSide()` angles corrected to realistic values: pushup body slope ~24° above horizontal (was nearly flat), plank body slope ~16° (even flatter, forearms on ground). Fixed plank forearm backward-pointing bug — wrist coordinate math was inverted, causing forearm to extend behind the elbow instead of toward camera. Both silhouettes now match real body mechanics.
2. **Heat fix 1: canvas dimension caching** — Canvas context state no longer resets on every frame when dimensions are unchanged. Width/height are now cached and compared before resetting; skips the reset when the size hasn't changed. Reduces unnecessary GPU state churn each frame on mobile.
3. **Heat fix 2: dynamic frame throttle** — Frame skip rate now adapts to workout state: skip 3 of 4 frames (effectively ~7–8 fps) when idle or in positioning mode; skip 1 of 2 frames (~15 fps) when workout is active. Balances thermal load during long idle/positioning periods against responsiveness during active exercise.
4. **CLAUDE.md cleanup** — Removed erroneous "Current phase" line that had been incorrectly added to the file.

**Phase 3 status:** Still 1/6 items done (user calibration save/load). No new Phase 3 items advanced this session — focus was silhouette accuracy and performance hardening.

**Tests:** Existing suite still passing. No new tests added (all changes were visual or performance-path, not new pure-logic branches).

**Next session:** Start by phone-testing the heat fixes (confirm no perceived lag during active workout at 2-frame throttle) and the corrected silhouettes at 6-foot viewing distance. Then continue Phase 3: warmup calibration (3 slow reps to auto-learn user's ROM), followed by relative thresholds.

### Session: 2026-03-26 (fifth session — CLAUDE.md compaction)
**Completed:**
1. **CLAUDE.md compaction** — Active behavioral layer reduced from ~12k to ~9.7k chars. Rule 2 (architecture table) extracted to `docs/architecture-map.md`; replaced with a one-line pointer. Rule 7 (voice coaching detail) extracted to `docs/voice-architecture.md`; replaced with a one-line pointer + "do not bypass" directive. Known Quirks trimmed from 5 bullets to 2: removed 3 items that were already captured in Lessons Learned (plank gate, palm gesture, camera angle detection). Redundant Lesson 2 (stick figures) deleted — fully superseded by Lesson 6. Lessons renumbered 1–12. Reference Docs table updated to include the two new docs/ files.
2. **Two new docs/ files created** — `docs/architecture-map.md` and `docs/voice-architecture.md` now carry the detail previously inline in CLAUDE.md.

**No code changes. No test changes.**

**Remaining:** Active behavioral layer is ~9.7k, still over the ~6k guideline. Remaining bulk is all behavioral prose (Rules 9–11: assumptions, plan confirmation, drift check). A second pass tightening that prose could bring it under, but it's low priority — all rules are actively load-bearing.

**Next session:** Pre-flight as normal. Phone-test heat fixes and silhouette corrections first, then Phase 3 warmup calibration.

### Session: 2026-03-27 (Phase 3 completion)
**Completed all remaining Phase 3 items (2–7):**
1. **Warmup calibration (item 2)** — "Warmup Cal" button, 3-rep flow, direction-reversal detection sets depth/extension thresholds automatically per exercise.
2. **Relative thresholds (item 3)** — Depth cues now scale to calibrated range (`elbow_down + 12°`). Lunge gets depth cue for first time.
3. **Frame positioning auto-detect (item 4)** — `checkPositioning()` checks landmark visibility + vertical span. Silhouette tints green when aligned. State message gives live positioning hints.
4. **Richer audio coaching (item 5)** — Milestone phrases every 5 reps (4 rotating), breathing reminder at rep 2, tempo cue when avg pace < 1.8s.
5. **Per-rep form score (item 6)** — Frame scores averaged per rep, form stat flashes green/yellow/red, fades to set average.
6. **End-of-set summary (item 7)** — `buildSetSummary()` (pure, tested) speaks contextual recap based on per-rep scores.

**Tests:** 61 → 95 (+34 new tests across all items).

**Git note:** Local git repo was missing — initialized fresh, connected to origin, rebased on existing remote history. All commits are in clean sequence.

**Phase 3 status:** COMPLETE ✅

**Next session:** Phone-test all Phase 3 features. Recommended test order: positioning (check green tint at 6ft), warmup calibration flow, per-rep score flash, end-of-set summary speech. Then begin Phase 4 (LocalStorage persistence).

### Session: 2026-03-28 (Phase 3 phone-test fixes)
**Based on Scott's phone testing feedback — three issues fixed:**

1. **Warmup calibration overhaul** — Complete rewrite of the calibration flow. Old: press button → instant countdown → track reps with no guidance. New: guided 2-exercise sequence (squat → pushup) that covers ROM for all 5 exercises. Each exercise gets a positioning phase (silhouette guide, green tint when aligned, 2-second hold required), voice guidance ("Get into squats position", "Do 3 slow squats"), and a 3-2-1 countdown before tracking starts. Direction reversal threshold bumped from 1° to 4° to filter MediaPipe jitter at 6+ feet. Results from squat derive lunge thresholds (+10° shallower); pushup derives pullup thresholds (-20° tighter). Original exercise restored after calibration.
2. **Pushup/plank silhouettes lowered** — Ground line moved from `h * 0.76` to `h * 0.85`. Floor exercise silhouettes now sit lower on screen where the camera actually captures you.
3. **Per-rep form score flash visibility** — Added `#rep-score-flash` element: 64px bold text, centered on camera feed, with a scale-pop animation (1.6s). Green/yellow/red coloring matches stats bar. Visible from 6+ feet instead of relying on the tiny stats bar alone.

**Working well (confirmed by phone test):** End-of-set summary speech, milestone/breathing/tempo cues, frame positioning auto-detect (green tint + hints).

**Tests:** 95 → 101 (+6 new: `applyAllCalibrationResults` — squat→lunge derivation, pushup→pullup derivation, floor at 50°, combined calibration). All green.

**Phone testing needed (priority order):**
1. **Calibration flow**: Press Warmup Cal → does squat silhouette appear? Does it tint green when aligned? Does voice guide you through squats then pushups? Do the 2-second hold and 4° threshold feel right (not too fast, not too slow)?
2. **Silhouette height**: Do pushup/plank outlines sit where your body actually appears on camera at 6ft? (Was too high before — now at 85% of screen height)
3. **Rep score flash**: During a set, can you see the big score number pop up in the center of the screen after each rep?
4. **Relative thresholds**: After completing calibration, do depth cues ("Go deeper") fire at the right point for YOUR range?

**Next session:** Phone-test the above. If calibration flow works, begin Phase 4 (LocalStorage persistence).

### Session: 2026-03-31 (Bug fixes + floor line feature)
**Completed 3 bug fixes, 1 feature, 1 transition improvement:**
1. **Bug 3: Silhouette not showing after exercise switch** — Added dimension guards to `drawGuide()`: if canvas width/height is zero, retries via `requestAnimationFrame` (max 3 attempts). Also added a second `drawGuide()` call after the 1.6s exercise-change toast clears, ensuring the silhouette always appears.
2. **Bug 1: Warmup calibration fires too easily** — Increased direction-change threshold in `analyzeWarmup()` from 1° to 4°. Added `warmupDirectionFrames` counter requiring 3 consecutive frames moving the same direction before flipping `warmupPhase`. Prevents jitter from triggering false direction reversals.
3. **Bug 4: Not pausing when moving from position (squat/lunge)** — Enhanced `isInPosition()` for squat/lunge: now checks hip landmark visibility (>0.5) and hip center Y position (must be between 0.25–0.75, i.e. roughly in frame). Rep counting pauses when user walks away from camera.
4. **Feature: Floor exercise alignment line** — `drawHorizontalSide()` ground line upgraded: opacity 0.20→0.55, width 2→4px, solid instead of dashed, spans 3%–95% of screen width (was 6%–88%). Added "FLOOR" text label at right end.
5. **Bug 2: Squat transition feedback** — Standing exercises (squat/lunge/pullup) now get a spoken prompt on switch: "Ready for [exercise]. Raise your hand or tap Ready." Ready button gets a brief scale-up + glow highlight animation on exercise change.

**Tests:** 95 → 106 (+11 new tests). All green. *(Running total after merge with 2026-03-28 work: 112.)*

### Session: 2026-04-03 (Phase 4 — Workout Logger with Persistence)
**All Phase 4 items complete in one autonomous session:**

1. **LocalStorage persistence** — `saveCurrentSession()` called on every Finish Set; `loadTodaySession()` restores today's sets on page load. Data model: `formcheck_sessions` key → array of `{ date, timestamp, sets: [...] }`. Cap at 90 sessions. Storage-full handled with graceful trim + retry.
2. **Session history view** — Log modal expanded to 3 tabs (Today / History / Progress). History tab shows all past sessions grouped by date, newest first. Both today and history tabs render through `escapeHtml()` for XSS safety.
3. **Progress chart** — `drawProgressChart()` draws a stacked bar chart on a `<canvas>` element. One bar per session (last 7), stacked by exercise with color per exercise type. No chart library dependency. `aggregateRepsByExercise()` is a pure, tested helper.
4. **Export** — `buildCSVExport(history)` is a pure, tested function. Export JSON and Export CSV buttons in Log modal trigger file downloads. Plank time strings preserved correctly in CSV.
5. **Workout templates** — `formcheck_templates` key in localStorage. Templates store ordered exercise keys. Loading a template auto-advances to next exercise after each Finish Set with voice prompts. Badge in controls bar shows remaining sequence. Security: template modal uses data-attribute + event delegation (not inline onclick) to safely handle apostrophes and quotes in template names.

**Tests:** 112 → 127 (+15 new: escapeHtml ×6, buildCSVExport ×5, aggregateRepsByExercise ×4). All passing.

**Phone testing needed:**
1. Finish a set → reload page → does the set show in the Log? (persistence check)
2. Log modal → History tab → do past sessions appear after multiple days of use?
3. Log modal → Progress tab → does the chart draw correctly on phone screen width?
4. Templates → save a template from today's exercises → load it → does it auto-advance?
5. Export CSV → does the download work on iOS Safari?

**Next:** Phase 5 exercise library expansion, or phone-test Phase 4 first.

### 2026-04-01 — Git hygiene
- Created `.gitignore` (blocks .pem private keys, large .mov video, caches, .claude/)
- Created `.claudeignore` (blocks .claude/ worktrees, .mov video, .pem files, old test reports)
- Pushed .gitignore to existing GitHub repo: birdsfan112/formchecker
- **Security note:** cert.pem and key.pem were never committed to git — .gitignore now prevents accidental staging.

### Session: 2026-04-04 (Pre-Phase 5 Reliability Sprint)
**Autonomous session — 7 reliability/accessibility improvements before Phase 5 exercise expansion:**

1. **ARIA live regions** — `#form-feedback`, `#state-message`, `#countdown-display`, `#rep-counter`, `#angle-hint`, `#rep-score-flash` all have appropriate `aria-live` / `role` / `aria-label` attributes. Screen readers can now announce coaching cues and countdown.
2. **Camera permission rationale dialog** — App now shows a plain-language explanation ("No video is recorded or sent anywhere") before calling `getUserMedia`. User taps "Enable Camera" to trigger the permission prompt. This prevents surprise on first visit. `#loading` is hidden until the button is clicked.
3. **Colorblind-safe indicators** — Semantic feedback colors changed from red/green to orange/blue: `.feedback-good` → `#60a5fa` (blue), `.feedback-bad` → `#fb923c` (orange). Per-rep flash, form score stat, and guide alignment tint all updated. Brand/skeleton colors (`#4ade80`) unchanged.
4. **Visibility hysteresis in `checkPositioning`** — Single threshold (0.4) replaced with two-speed hysteresis: 0.45 to *enter* aligned, 0.30 to *stay* aligned. Prevents guide from flickering at the landmark detection boundary (like a thermostat with separate on/off thresholds). Resets on exercise change.
5. **Wall-clock direction filtering in `analyzeWarmup`** — Frame-count filter (`warmupDirectionFrames >= 3`) replaced with 150ms wall-clock timer (`warmupDirectionStartTime`). Consistent behavior regardless of frame rate (7.5fps idle vs 15fps active). State field renamed accordingly.
6. **Web Speech re-unlock after backgrounding** — `visibilitychange` listener re-primes iOS speechSynthesis when the page returns to foreground (`speechSynthesis.cancel()` then silent utterance). Prevents stuck/silent voice coaching after switching apps.
7. **WebGL context loss recovery** — `visibilitychange` listener also runs a 5-second watchdog: if no `pose.onResults` callback has fired since returning from background, calls `poseCamera.start()` to restart the inference pipeline. `poseCamera` and `lastResultTime` extracted to module scope for this purpose.

**Tests:** 127 → 137 (+10 new: 2 wall-clock frame-rate tests, 4 visibility hysteresis tests, 4 colorblind color tests). All passing.

**Phone testing needed:**
1. First visit: does the "Enable Camera" dialog appear before the camera permission prompt?
2. Switch apps mid-workout → return: does voice coaching still work? Does pose skeleton reappear?
3. Calibration warmup: do reps still count reliably (wall-clock filter)?
4. Position yourself at 6+ feet: does the guide hold blue without flickering (hysteresis)?
5. Verify coaching cues still show in orange/blue (not red/green).

**Next:** Phone-test the above. Then Phase 5 exercise library expansion.

### Session: 2026-04-04 (Phase 5 — Engine refactor + 4 new exercises)
**Autonomous session — data-driven engine refactor + first batch of Phase 5 exercises:**

1. **exerciseRegistry** — merged `exerciseMeta` + `exercises` into one unified registry (was two separate objects). Each exercise entry is now self-contained: name, hint, guide/guideLines, `isFloor`, `isTimed`, `drawStyle`/`drawVariant`, `isInPosition(lm)`, `outOfPositionMsg`, `analyze(lm)`. Adding a new exercise = one object + one `<option>`.
2. **Type-flag-driven logic** — replaced all hardcoded `state.exercise === 'plank'` / `=== 'pushup'` checks with `exerciseRegistry[ex].isFloor` and `.isTimed` throughout: `detectAutoStart`, `setWorkoutState` (idle message), MediaPipe callback (isFloor hint), Finish Set (timer vs rep count), plank-timer reset, exercise-change event handler.
3. **`isInPosition` delegated** — thin wrapper now calls `exerciseRegistry[exercise].isInPosition(lm)`. `OUT_OF_POSITION_MSG` lookup table replaced by `getOutOfPositionMsg(exercise)` helper.
4. **`drawGuide` data-driven** — uses `exerciseRegistry[ex].drawStyle` + `drawVariant` instead of hardcoded exercise-name checks.
5. **4 new exercises added:**
   - **Pike Push-ups** (`pike`) — side view, elbow angle, hips-high form cue, `drawStyle: 'horizontal'` (pushup silhouette), calibration derived from pushup warmup.
   - **Dips** (`dip`) — front/side view, elbow angle, elbow-flare form cue, `drawStyle: 'standing'`, calibration derived from pushup.
   - **Dead Hang** (`deadhang`) — timed hold, front view, `drawStyle: 'hanging'`, grip-bar form check, 15s spoken milestone.
   - **Leg Raises** (`legraise`) — front view, hip angle tracking, straight-leg form cue, `drawStyle: 'hanging'`.
6. **Supporting updates:** `defaultCalibration` (pike, dip, legraise defaults), `applyAllCalibrationResults` (derives pike/dip from pushup), `getPrimaryAngle` (pike/dip use elbow angle), `EXERCISE_COLORS` (4 new colors), `checkPositioning` (new exercises mapped to appropriate checks), dropdown (4 new `<option>` elements).

**Tests:** 137 → 152 (+15 new: 3 calibration defaults, 2 calibration derivation, 7 isInPosition, 2 getPrimaryAngle, 1 buildSetSummary). All passing.

**Phone testing needed:**
1. Do the 4 new exercises appear in the dropdown?
2. Pike: does the pushup silhouette show? Does "Keep hips high" cue fire when hips drop?
3. Dips: does the standing silhouette show? Does rep counting work?
4. Dead Hang: does the timer count up? Does "15 seconds" voice cue fire?
5. Leg Raises: does hanging silhouette show? Do reps count when legs raise and lower?
6. Existing exercises: confirm nothing broke (pushup auto-start, plank timer, pullup reps).

**Next:** Phone-test the above. Then add remaining Phase 5 exercises (inverted rows, L-sits, arch hangs, pistol squats).

### Session: 2026-04-04 (Calibration UX polish + Rest screen)
**Autonomous session — 4 calibration/UX fixes based on Scott's phone feedback:**

1. **Warmup rep counter shows "x/3"** — During calibration tracking phase, `#rep-counter` now shows `0/3` → `1/3` → `2/3` → `3/3` instead of staying at 0. Resets to `0` when returning to idle. The big rep counter at top-right doubles as a warmup progress indicator.
2. **More guidance text during calibration** — Positioning phase now shows: step number ("Step 1 of 2"), exercise-specific camera hint in `#angle-hint` ("Side view — full body in frame"), and a more descriptive state message. Tracking phase shows live directional cues ("↓ Lower slowly..." / "↑ Come all the way up") in the feedback area each frame.
3. **Clearer post-calibration transition** — After calibration completes, `stateMessage` now reads "✓ Calibrated! Tap Ready to start your Push-ups." instead of the generic idle prompt. Scott knows exactly what to do next.
4. **Rest screen between sets** — After "Finish Set" (when a set was actually logged), the camera area goes dark (matching app background `#1a1a2e`) and shows a 60-second rest countdown in large green text. "Start Next Set" button skips the rest early. After the timer, app returns to idle. Template auto-advance now happens after rest ends (not during). If 0 reps recorded, rest is skipped.

**Tests:** 127/127 passing (no new tests needed — all changes are UI/state flow, no new pure logic branches).

**Phone testing needed:**
1. Warmup Cal → do rep counter digits count up as you do reps?
2. Calibration positioning phase → does camera hint appear? Does step number show?
3. Calibration tracking phase → do directional cues ("↓ Lower slowly...") appear?
4. After calibration → does it say "✓ Calibrated! Tap Ready to start..."?
5. Finish Set after doing reps → does rest screen appear? Does countdown work? Does "Start Next Set" skip it?

**What needs Scott's input:**
- Is 60 seconds the right default rest time? Could add a setting.
- Does the directional cue ("↑ Come all the way up") show at the right moment, or does it feel wrong given the warmup phase tracking logic?

**Next:** Phone-test the above. Then decide: Phase 5 exercise expansion, or more calibration refinement.

### Session: 2026-04-04 (Phase 5 — Second batch: 4 more exercises)
**Autonomous session — second batch of Phase 5 exercise additions:**

1. **Inverted Rows** (`row`) — horizontal body, elbow angle tracking, body-sag form cue ("Keep hips up — straight body"). `drawStyle: 'horizontal'` (plank silhouette). Calibration derived from pushup warmup (same elbow motion).
2. **L-Sit** (`lsit`) — timed hold, shoulders-above-hips gating, hip angle form cue ("Keep legs horizontal") fires when avg hip angle > 120°. `isTimed: true`, reuses `state.plankStart`. 15s spoken milestones.
3. **Pistol Squat** (`pistol`) — single-leg squat, min knee angle (working leg), shoulder-level balance check. Calibration derived from squat warmup minus 10° (deeper than regular squat, floors at 50°).
4. **Glute Bridge** (`glutebridge`) — `isFloor: true`, hip angle rep counting (flat ~90°, bridged ~160°+), full-extension cue ("Drive hips higher") when bridged angle < 145°. `drawStyle: 'horizontal'` (plank silhouette).
5. **Supporting updates:** `defaultCalibration` (row, lsit, pistol, glutebridge), `applyAllCalibrationResults` (row from pushup, pistol from squat), `getPrimaryAngle` (row = elbow, pistol = min knee), `checkPositioning` (new exercises mapped to span-based and hanging checks), `EXERCISE_COLORS` (4 new colors), dropdown (4 new `<option>` elements).

**Tests:** 152 → 165 (+13 new: 8 isInPosition, 2 getPrimaryAngle, 3 calibration derivation). All passing.

**Phone testing needed:**
1. Do 4 new exercises appear in the dropdown?
2. Inverted rows: does rep counting work? Does "Keep hips up" cue fire when sagging?
3. L-Sit: does timer count up? Does "Keep legs horizontal" cue fire if legs drop?
4. Pistol squat: does rep counting work for single-leg? Does balance check fire?
5. Glute bridge: auto-start on floor? Does rep count as hips go up and return?

**Next:** Phone-test new exercises. Then consider: arch hangs/scapular pulls (final Phase 5 exercise) or move to Phase 6.

---

## Phone Testing Checklist — 2026-04-04 Sessions

Everything built across today's three sessions, untested on real hardware. Work through these top to bottom and mark each ✅ or ❌.

### Pre-Phase 5 Reliability Sprint
- [ ] **Permission dialog** — does the camera permission prompt appear before the OS camera prompt (not after)?
- [ ] **Background → resume** — start a workout, background the app, return. Does voice resume? Does the skeleton reappear on camera?
- [ ] **Guide alignment at 6ft** — does the silhouette guide hold blue (aligned) without flickering while standing still?
- [ ] **Warmup calibration reps** — do reps count reliably during the calibration tracking phase (no false reps, no missed reps)?

### Phase 5 — Engine Refactor + Batch 1 (Pike, Dips, Dead Hang, Leg Raises)
- [ ] **All 9 exercises in dropdown** — do push-ups, squats, pull-ups, lunges, plank, pike push-ups, dips, dead hang, leg raises all appear?
- [ ] **Each new exercise shows a silhouette** — switch to each one; does a guide shape appear in idle state?
- [ ] **Pike push-ups** — does "Keep hips high" voice cue fire when hips drop below hands during the rep?
- [ ] **Dead Hang** — does the timer count upward? Does voice say "15 seconds" at 15s?
- [ ] **Leg Raises** — do reps count when legs raise (hip angle decreases) and return to hang?
- [ ] **Dips** — do reps track correctly using elbow angle? Does rep count increment on each full dip?
- [ ] **Regression: pushup auto-start** — does lying face-down trigger 3s countdown automatically?
- [ ] **Regression: plank timer** — does the plank timer run and show elapsed seconds?
- [ ] **Regression: squat rep counting** — do squats count correctly with the existing exercises?
- [ ] **Regression: calibration warmup counter** — does the counter show x/3 format (e.g. 0/3 → 1/3 → 2/3 → 3/3) during warmup?

### Phase 5 — Batch 2 (Inverted Rows, L-Sit, Pistol Squat, Glute Bridge)
- [ ] **All 13 exercises in dropdown** — do the 4 new exercises appear (inverted rows, L-sit, pistol squat, glute bridge)?
- [ ] **Glute bridge auto-start** — does lying on back with knees bent trigger the 3s hold countdown?
- [ ] **Glute bridge reps** — do reps count as hips drive up and return to floor?
- [ ] **Pistol squat tracking** — does rep counting track the bending (working) leg, not the extended leg?
- [ ] **L-Sit timer** — does the timer count upward? Does "Keep legs horizontal" cue fire when legs drop?
- [ ] **Inverted rows** — do reps count pulling up to bar and returning? Does "Keep hips up" cue fire when sagging?

### Calibration UX + Rest Screen
- [ ] **Warmup rep counter** — during calibration tracking, does #rep-counter show 0/3 → 1/3 → 2/3 → 3/3?
- [ ] **Post-calibration message** — after calibration completes, does it say "✓ Calibrated! Tap Ready to start your [exercise]"?
- [ ] **Rest screen** — after finishing a set with reps, does the rest screen appear with a 60s countdown?
- [ ] **Skip rest** — does "Start Next Set" button end the rest early and return to idle?

---

### 2026-04-02 — Git recovery + sleepy-edison merge
Two batches of work that existed but had never been committed were landed:

1. **Committed stranded main-branch work** (`a89f6a8`) — 290 lines of changes had been sitting unstaged in the main working directory. Covered: guided 2-exercise calibration sequence, per-rep score flash, silhouette height fix, smart threshold derivation (squat→lunge, pushup→pullup), 6 new tests, `.claudeignore`, `TESTING_SUMMARY.txt`, `TEST_REPORT.md`.
2. **Merged `claude/sleepy-edison`** (`d096a35`) — branch had one unmerged commit with: 3-frame consecutive-direction filter in `analyzeWarmup`, `drawGuide` dimension guards with `requestAnimationFrame` retry, squat/lunge position gate (hip visibility + Y bounds), floor exercise ground line improvements, standing exercise transition spoken prompts + Ready button glow, 11 new tests.
3. **Merge conflicts resolved** — all four conflicts were additive (both sides contributed distinct code); nothing was dropped. Final test count: **112, all green**.

**Next session:** Phone-test the calibration flow overhaul and the 2026-03-31 bug fixes (silhouette dimension guard, floor line, squat transition prompt) — these are the most recent unverified changes. If all pass, begin Phase 4 (LocalStorage persistence).
