## Status
- **Phase:** Phase 5 — Exercise Library Expansion (in progress)
- **Updated:** 2026-04-07
- **Summary:** Thermal/performance pass — modelComplexity lowered to 0 (lite model, ~50% less GPU), rest period now throttles to 4fps, checkPositioning() no longer double-called per frame. 165 tests passing.
- **Autonomous:** Implement arch hangs/scapular pulls; write new exercise silhouettes once approach confirmed
- **Needs Scott:** Re-test phone heat after these fixes; decide silhouette approach (code vs. generated images); sign off to proceed with remaining Phase 5 exercises
- **Blockers:** Silhouette approach decision pending

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
Skeleton overlay, rep counting (pushup/squat/pullup/lunge), plank timer, voice coaching, set tracking, iOS audio unlock, HTTPS/ngrok serving.

---

## Phase 2: UX & Positioning ✅ (Complete)
Filled silhouettes for all exercises, palm gesture start + auto-start for floor exercises, Ready/Pause/Finish Set controls, position auto-detect (green tint + hints), exercise transition polish, debug cleanup.

---

## Phase 3: Enhanced Form Analysis + Audio ✅ (Complete)
Guided warmup calibration (squat → pushup flow, learns real ROM), relative depth cues, per-rep form score flash, end-of-set spoken summary, milestone/breathing/tempo audio cues, colorblind-safe indicators, visibility hysteresis, Web Speech re-unlock after backgrounding.

---

## Phase 4: Workout Logger with Persistence ✅ (Complete)
LocalStorage persistence (90-session cap), session history tab, stacked progress chart (last 7 days), JSON/CSV export, workout templates with auto-advance.

---

## Phase 5: Exercise Library Expansion
**Goal:** Cover the full r/bodyweightfitness recommended routine + mobility/PT
**Test count:** 165, all passing

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

### Exercise Metadata (for new additions)
Each exercise needs: primary joint angles, phase detection thresholds, camera angle requirement, form check rules with severity, regression suggestions, silhouette guide coordinates.

---

## Phase 5 Phone Testing Checklist
Everything built across the 2026-04-04 sessions, untested on real hardware. Work through top to bottom and mark each ✅ or ❌.

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

*Detailed session logs and completed phase checklists: `docs/roadmap-archive.md`*
