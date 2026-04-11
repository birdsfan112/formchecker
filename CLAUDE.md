# CLAUDE.md — FormCheck (AI Fitness Form Coach)
This file provides persistent instructions for Claude when working on this project. **Read this FIRST before doing any work.**

## User
Scott is new to coding and "vibe coding." He prefers analogies, clarifying questions before detailed answers, and working efficiently without wasted tokens. He wants Claude to surface better solutions proactively rather than building workarounds that need to be undone later.

## Project
FormCheck — a real-time AI fitness form coach that uses phone camera + MediaPipe Pose to analyze bodyweight exercise form, count reps, give audio coaching, and log workouts. Single-file HTML app, no backend, runs entirely in the browser. Served locally via Python HTTPS or ngrok for remote access. See `roadmap.md` for the full 6-phase roadmap.

---

## The Three Principles (non-negotiable)

### Principle 1: RESEARCH BEFORE BUILDING
- Before starting any task, **read `index.html`** to understand the current state of the code. Things change between sessions.
- Before adding a new feature, **search the existing code** for related constants, thresholds, and patterns. Don't duplicate what's already there.
- Before adding a new library or model (e.g., MediaPipe Hands), **check if existing tools can solve it**. We avoided adding an entire Hands pipeline because Pose already tracks 4 hand landmarks per hand. The lightest solution wins on mobile.
- **Check the "Lessons Learned" section** at the bottom of this file — past mistakes are documented so they don't repeat.

### Principle 2: ONE FIX AT A TIME, THEN TEST
- Implement **one change**, then run `node tests.js` before moving to the next.
- If a test fails, **stop and fix it** before continuing. Don't stack multiple untested changes — that's how the silhouette bug survived three rounds.
- After every functional change, **verify it does what the roadmap and user asked for**, not just that it doesn't crash.
- When touching form analysis thresholds, **explain what the old vs new value does** so Scott can evaluate whether it makes sense biomechanically.

### Principle 3: SHOW YOUR WORK AND EXPLAIN TRADEOFFS
- When encountering an issue, **show Scott what you found** before jumping to a fix. He prefers understanding the "why" over a black-box patch.
- When multiple solutions exist, **explain the tradeoffs** (performance, complexity, reliability) and recommend one. Don't just pick the first thing that compiles.
- When changing thresholds or detection logic, **explain what real-world scenario** the change addresses (e.g., "this fires when you're wearing baggy shorts and the hip landmark jitters").
- Use **analogies** when explaining technical concepts — Scott finds them helpful.

---

## Critical Rules

### 1. index.html IS THE SINGLE SOURCE OF TRUTH
- All CSS, HTML, and JavaScript live in one file: `index.html`. No external JS files, no build step.
- When reading the app, always read the full `index.html` — sections are separated by `// ===== SECTION NAME =====` comments.
- The file is organized in this order: CSS → HTML → Script tags (MediaPipe CDNs) → JavaScript (state → helpers → silhouettes → gesture → state machine → exercises → events → MediaPipe init → camera).

### 2. UNDERSTAND THE ARCHITECTURE BEFORE CHANGING CODE
Before making changes, know where things live. Full map: `docs/architecture-map.md`. Read it before touching any section you haven't worked in recently.

### 3. MEDIAPIPE POSE LANDMARK REFERENCE
Full reference: `C:\Users\scott\Documents\FormChecker\docs\mediapipe-reference.md`
The 33 landmarks are normalized 0–1. `visibility` (0–1) = confidence the landmark is visible. Most-used: 11/12 shoulders, 13/14 elbows, 15/16 wrists, 17–22 hand points, 23/24 hips, 25/26 knees, 27/28 ankles.

### 4. PRE-FLIGHT CHECKLIST (run before every sprint)
Before starting any new sprint or major task:
1. **Read `roadmap.md`** — know what phase we're in and what's planned
2. **Read this file (`CLAUDE.md`)** — check lessons learned and known quirks
3. **Read `index.html`** — understand current state (things change between sessions)
4. **Run `node tests.js`** — confirm baseline is green before making changes
5. **Ask clarifying questions** — Scott prefers this over wrong assumptions
6. **Check if existing code already handles it** — search before building

### 5. TESTING PROTOCOL
- **Test file**: `tests.js` in the FormChecker directory. Run with `node tests.js`.
- **Test after every change** — not just at the end of a sprint.
- **Write tests for new features AND bug fixes** — every fix gets a regression test.
- **If a test fails, stop and fix it** before moving to the next task.
- **Tests extract pure logic** from index.html and run it in Node.js (no browser needed).
- **Real-device testing is essential** — some bugs only appear on an actual phone (iOS Safari quirks, camera distance, MediaPipe jitter). When making form analysis or gesture changes, flag them for Scott to test on his phone.

### 6. PHONE/BROWSER CONSTRAINTS
- **iOS Safari requires a user gesture** to unlock Web Speech API. We handle this with a touchstart/click listener that speaks a silent utterance. Don't remove it.
- **Camera requires HTTPS** on iOS Safari. We use either self-signed certs (port 8443) or ngrok.
- **The canvas is mirrored** (`transform: scaleX(-1)`) to feel natural. Drawing coordinates are NOT mirrored — MediaPipe handles that internally.
- **Performance matters** — this runs on a phone. Don't add heavy models (we keep MediaPipe Pose as the only ML model). Every frame goes through `pose.send()` → `onResults()`.
- **CDN script tags, not ES modules** — MediaPipe is loaded via `<script src="...">` tags. `Pose`, `Camera`, and drawing utils are global. Don't try to `import` them.

### 7. VOICE COACHING RULES
The voice system uses layered gating — **do not bypass it**. If something "needs" to speak every frame, it's a bug. Full architecture and cue-adding guide: `docs/voice-architecture.md`.

### 8. CONTEXT MANAGEMENT
- **Compact proactively** — don't wait until context is forced. Treat it like saving your game: do it while things are going well.
- **Before compacting**: update `CLAUDE.md` (especially Lessons Learned) and `roadmap.md` (check off completed items) so the next session picks up cleanly.
- **Tell Scott before compacting** — don't do it silently. Say: "Context is getting long — I'm going to compact. Here's where we are: [brief status]. I'll update `CLAUDE.md` and `roadmap.md` first." After compacting, confirm: "Done — here's what carried over and what's fresh."
- **After compacting**, the next session starts by reading `CLAUDE.md` → `roadmap.md` → `index.html` → running `node tests.js`. That's the handoff.

### 9. SURFACE ASSUMPTIONS EXPLICITLY — DO NOT FILL GAPS SILENTLY
This is the most common source of wasted work on this project. When you don't know something for certain, say so before acting on it.

Use this format whenever you're about to infer rather than verify:
> "I'm assuming [X] because [Y]. I haven't verified this directly. Should I confirm before proceeding?"

Examples of assumptions that must be surfaced, not silently acted on:
- Assuming a bug is caused by a specific function without reading that function first
- Assuming a landmark or threshold behaves a certain way without checking the current code
- Assuming a change is small/safe without checking what else depends on it
- Assuming the current task is the same as a similar task from a previous session

If an assumption turns out to be wrong mid-task: **stop, state what you got wrong, re-evaluate the plan, and ask Scott how to proceed.** Do not adapt silently and continue.

### 10. PLAN CONFIRMATION BEFORE IMPLEMENTING
After researching and before writing any code, present your plan and wait for Scott's go-ahead. Do not proceed to implementation without explicit confirmation.

Your plan must include:
- **What problem this solves** and how you know it's the right problem
- **What you propose to do**, in plain English
- **Why this approach** over the alternatives
- **What you're assuming** that you haven't yet verified
- **What could go wrong** if an assumption is incorrect

If Scott pushes back, explain your reasoning — but treat Scott's direction as the final call. If the plan changes mid-implementation due to something unexpected, stop and re-confirm before continuing.

**Tiered posture:** For simple, reversible changes — adjusting a single threshold, fixing a bug with a clear diagnosis, updating a comment or doc string — proceed and narrate what you're doing without a formal plan presentation. Reserve the full plan-and-wait for changes that are genuinely risky or hard to reverse: modifications to the state machine, voice gating architecture, MediaPipe analysis thresholds, or anything that touches multiple interconnected systems at once.

### 11. MID-SESSION DRIFT CHECK
Long sessions are where goals drift. Every 3–5 meaningful interactions, briefly re-anchor:
- "Are we still working toward [original session goal]?"
- "Have any of my assumptions changed since we started?"
- "Am I reasoning from the current code, or from memory of an earlier state?"

If you detect drift — you're solving a sub-problem and have lost the thread of the main goal — stop and surface it:
> "I want to flag that we may have drifted from [original goal]. Here's where I think we are vs. where we started. Do you want to course-correct?"

Do not silently re-orient. Always surface drift explicitly so Scott can decide whether the new direction is intentional or not.

---

## Known Quirks & Edge Cases
- **Baggy clothing** throws off hip/knee landmark detection. Thresholds were deliberately loosened to account for this (e.g., hip sag at 145° not 155°). Do not tighten them toward "biomechanically correct" without re-testing on real users.
- **MediaPipe jitter** — partially occluded limbs cause landmarks to jump. This is why we use smoothed angles and direction tracking (`state.prevAngle`) rather than raw per-frame values. New exercise analyzers must follow the same pattern.

---

## Lessons Learned (add to this as we go)
1. **Lighter is better on mobile**: We almost added MediaPipe Hands as a second ML model for palm detection. Turned out Pose already tracks 4 hand landmarks per hand — enough for reliable open-palm detection with zero extra processing cost. Always check if existing data can solve the problem before adding new models.
2. **Direction tracking prevents false cues**: The "go deeper" pushup cue used to fire while the user was pushing UP because `state.phase` was still 'down'. Fix: track `prevAngle` and only fire depth cues when `goingDown === true` (angle is actually decreasing). Phase state alone is not enough.
3. **ngrok needs HTTP upstream, not HTTPS**: When ngrok proxies to a local HTTPS server, it gets confused. Point ngrok at the HTTP port (8080) and let ngrok handle TLS termination.
4. **Pose validation gates prevent false feedback**: The plank analyzer used to say "good form" when the user was standing up or walking to position. Fix: check if the body is actually horizontal (vertical span < 0.25) before running form analysis. Same principle applies to any exercise — validate the pose first, analyze form second.
5. **Browser caching hides code changes**: After editing index.html, the phone browser may keep serving the old cached version. Always tell Scott to add `?v=N` to the URL or hard-refresh after code changes. This bit us when the silhouette rewrite looked "not pushed" but was actually cached.
6. **All silhouettes should be filled shapes**: Stick-figure silhouettes (thin lines connecting dots) are ambiguous at distance — they don't clearly read as a body in a specific pose. Filled shapes with body thickness, directional features (nose, feet, butt) are unmistakable. Apply this to every new exercise silhouette.
7. **Pose hand landmarks need loose thresholds**: At 6+ feet from camera, Pose landmarks 17–22 (fingertips) have much lower resolution than body joints. Initial palm detection thresholds were too strict (visibility 0.65, distance 0.04, area 0.0008) — gesture never triggered. Loosened to (0.5, 0.02, 0.0002) and it works reliably. Use debug display temporarily when tuning gesture thresholds to see actual values.
8. **Silhouettes must match real body mechanics**: The pushup/plank silhouette was originally drawn with the body parallel to the ground and feet hanging down — not how humans actually look. Real pushup position: hands on ground, body slopes at an angle up from hands, toes on floor. Always think "what does this exercise actually look like from the side?" before drawing.
9. **Phone screen recordings are the best debug tool**: When tuning thresholds that show debug overlays, have Scott screen-record on his phone rather than trying to memorize numbers at 6 feet. Extract frames with ffmpeg (`fps=1/5` gives one frame per 5 seconds) and read the debug text from still images. Way more reliable than verbal reports.
10. **Auto-start via position detection is a reusable pattern**: For floor exercises (pushup/plank), detecting the starting pose + requiring a 3-second hold is more natural than a palm gesture. This pattern should be considered for every new exercise added in Phase 5 — each exercise defines its own "key shape" (the starting position), and the system only checks for the currently selected exercise. Standing exercises are too ambiguous for auto-start (a person just looks like they're standing), so those keep the palm gesture.
11. **Skip canvas context resets when dimensions haven't changed**: The canvas GPU state was being reset on every single frame, which is unnecessary overhead on mobile. Cache the last-known width and height; only reset when the size actually changes. Small savings per frame compound significantly on a thermal-limited phone.
12. **Frame throttle rate should adapt to workout state**: A fixed frame-skip rate is a compromise that's either too slow during active exercise or too wasteful during idle. Use a higher skip rate (e.g., 4-frame cycle) when idle or positioning — the user is just standing there — and a lower skip rate (e.g., 2-frame cycle) when the workout is active and rep detection matters. This is effectively a two-speed polling mode.
13. **Calibration needs positioning before tracking**: The original warmup calibration went straight from button press → countdown → "start moving" with no positioning check. At 6+ feet, MediaPipe jitter (1° noise) was enough to count false reps before the user even moved. Fix: require silhouette alignment + 2-second hold before starting, and bump the direction-reversal threshold to 4°. Any feature that tracks joint angles at distance needs a jitter-aware threshold.
14. **Smart calibration covers multiple exercises from fewer movements**: Rather than calibrating each exercise individually (tedious, especially as the library grows), pick a small set of "representative" movements whose ROM maps to multiple exercises. Squat ROM → squat + lunge thresholds; pushup ROM → pushup + pullup thresholds. 6 total reps calibrates all 4 rep-based exercises. This pattern scales well for Phase 5 exercise expansion.
15. **Direction changes need consecutive-frame filtering**: A single frame crossing a threshold doesn't mean intentional movement — MediaPipe jitter can produce 3-5° spikes. Warmup calibration was counting false reps because a 1° threshold + single-frame flip let jitter trigger phase changes. Fix: require N consecutive frames (3 works well) all moving the same direction before flipping phase. Same principle applies anywhere direction reversal matters.
16. **Playwright tests can't reach app JS globals**: ALL app code is inside `window.addEventListener('load', fn)` — `exerciseRegistry`, `addExercise`, and everything else are closure-scoped, not on `window`. `page.evaluate()` / `(window as any).exerciseRegistry` is always undefined. Tests must use DOM-observable state instead: `#exercise-select` options mirror the registry (option text includes `(timed)` for timed exercises), `#camera-permission` visibility confirms load callback ran, `#exercise-name` and `#rep-counter` text are readable. Do not attempt to expose globals — the DOM strategy is complete and decoupled.

---

## Reference Docs
Project-specific supporting docs live in `./docs/`. At session start, check if they're current.

| Doc | Purpose |
|-----|---------|
| `roadmap.md` | 6-phase roadmap, current phase, completed items |
| `docs/architecture-map.md` | Where everything lives in index.html (section map + function table) |
| `docs/voice-architecture.md` | Voice gating layers, cue-adding guide, cooldown values |
| `docs/session-management.md` | Keeping long sessions on track, drift prevention |
| `docs/debug-video-workflow.md` | How to capture and extract debug data from phone screen recordings |
| `docs/decision-validation.md` | Pre/post checklist for every meaningful change |
| `docs/mediapipe-reference.md` | Full MediaPipe Pose landmark reference (all 33 landmarks) |

## End of Session
Follow the centralized protocol: `C:\Users\scott\Documents\ChiefOfStaff\templates\end-of-session-protocol.md`