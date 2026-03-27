# FormCheck — AI Fitness Form Coach
## Architecture & Roadmap

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

## Phase 4: Workout Logger with Persistence
**Goal:** Track workouts over time

- [ ] **LocalStorage persistence** — save workout history across sessions
- [ ] **Workout templates** — save and load exercise sequences (e.g., "8x3 BWF routine")
- [ ] **Progress charts** — reps, sets, form scores over time
- [ ] **Export** — CSV or JSON export of workout data
- [ ] **Session history** — view past workouts with form scores

---

## Phase 5: Exercise Library Expansion
**Goal:** Cover the full r/bodyweightfitness recommended routine + mobility/PT

### Bodyweight Strength
- [ ] Dips
- [ ] Rows (inverted)
- [ ] Pike push-ups / handstand push-up progressions
- [ ] L-sits
- [ ] Arch hangs / scapular pulls
- [ ] Leg raises (hanging)
- [ ] Single-leg squats (pistol progressions)

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
