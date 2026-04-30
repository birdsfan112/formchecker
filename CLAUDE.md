# CLAUDE.md — FormCheck (AI Fitness Form Coach)
This file provides persistent instructions for Claude when working on this project. **Read this FIRST before doing any work.**

## User
Scott wants better solutions surfaced proactively — not workarounds that need to be undone later.

## Project
FormCheck — a real-time AI fitness form coach that uses phone camera + MediaPipe Pose to analyze bodyweight exercise form, count reps, give audio coaching, and log workouts. Single-file HTML app, no backend, runs entirely in the browser. Served locally via Python HTTPS or ngrok for remote access. See `roadmap.md` for the full 6-phase roadmap.

---

## The Three Principles (non-negotiable)

### Principle 1: RESEARCH BEFORE BUILDING
- Before starting any task, **read `index.html`** to understand the current state of the code. Things change between sessions.
- Before adding a new feature, **search the existing code** for related constants, thresholds, and patterns. Don't duplicate what's already there.
- Before adding a new library or model (e.g., MediaPipe Hands), **check if existing tools can solve it**. The lightest solution wins on mobile.
- **Check the "Lessons Learned" section** at the bottom of this file — past mistakes are documented so they don't repeat.

### Principle 2: ONE FIX AT A TIME, THEN TEST
- Implement **one change**, then run `node tests.js` before moving to the next.
- If a test fails, **stop and fix it** before continuing. Don't stack multiple untested changes.
- After every functional change, **verify it does what the roadmap and user asked for**, not just that it doesn't crash.
- When touching form analysis thresholds, **explain what the old vs new value does** so Scott can evaluate whether it makes sense biomechanically.

### Principle 3: SHOW YOUR WORK AND EXPLAIN TRADEOFFS
- When encountering an issue, **show Scott what you found** before jumping to a fix. He prefers understanding the "why" over a black-box patch.
- When multiple solutions exist, **explain the tradeoffs** (performance, complexity, reliability) and recommend one.
- When changing thresholds or detection logic, **explain what real-world scenario** the change addresses (e.g., "this fires when you're wearing baggy shorts and the hip landmark jitters").

---

## Critical Rules

### 1. index.html IS THE SINGLE SOURCE OF TRUTH
All code lives in `index.html`. No external JS files, no build step. Sections marked `// ===== NAME =====`. Order: CSS → HTML → MediaPipe CDNs → JS (state → helpers → silhouettes → gesture → state machine → exercises → events → MediaPipe init → camera).

### 2. UNDERSTAND THE ARCHITECTURE BEFORE CHANGING CODE
Full map: `docs/specs/architecture-map.md`. Read it before touching any section you haven't worked in recently.

### 3. MEDIAPIPE POSE LANDMARK REFERENCE
Full reference: `docs/mediapipe-reference.md`. Landmarks are 0–1 normalized; `visibility` (0–1) = confidence.

### 4. PRE-FLIGHT CHECKLIST (run before every sprint)
1. Read `roadmap.md` — know what phase we're in
2. Read this file (`CLAUDE.md`) — check lessons learned and known quirks
3. Read `index.html` — understand current state
4. Run `node tests.js` — confirm baseline is green
5. Ask clarifying questions — Scott prefers this over wrong assumptions
6. Check if existing code already handles it — search before building

### 5. TESTING PROTOCOL
- **Test file**: `tests.js`. Run with `node tests.js`.
- **Test after every change** — not just at the end of a sprint.
- **Write tests for new features AND bug fixes** — every fix gets a regression test.
- **If a test fails, stop and fix it** before moving on.
- **Tests extract pure logic** from index.html and run it in Node.js (no browser needed).
- **Real-device testing is essential** — some bugs only appear on an actual phone. Flag form-analysis or gesture changes for Scott to test.

### 6. PHONE/BROWSER CONSTRAINTS
- **iOS Safari requires a user gesture** to unlock Web Speech API. We handle this with a touchstart/click listener that speaks a silent utterance. Don't remove it.
- **Camera requires HTTPS** on iOS Safari. Use self-signed certs (port 8443) or ngrok.
- **The canvas is mirrored** (`transform: scaleX(-1)`) to feel natural. Drawing coordinates are NOT mirrored — MediaPipe handles that internally.
- **Performance matters** — this runs on a phone. Don't add heavy models (we keep MediaPipe Pose as the only ML model).
- **CDN script tags, not ES modules** — `Pose`, `Camera`, and drawing utils are global. Don't try to `import` them.

### 7. VOICE COACHING RULES
The voice system uses layered gating — **do not bypass it**. If something "needs" to speak every frame, it's a bug. Full architecture and cue-adding guide: `docs/specs/voice-architecture.md`.

### 8. SESSION HANDOFF
Next session starts by reading: `CLAUDE.md` → `roadmap.md` → `index.html` → `node tests.js`. Update Lessons Learned here and check off completed items in `roadmap.md` before ending a session.

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

**Tiered posture:** For simple, reversible changes — adjusting a single threshold, fixing a bug with a clear diagnosis, updating a comment or doc string — proceed and narrate what you're doing without a formal plan presentation. Reserve the full plan-and-wait for changes that are genuinely risky or hard to reverse: modifications to the state machine, voice gating architecture, MediaPipe analysis thresholds, or anything that touches multiple interconnected systems at once.

### 11. MID-SESSION DRIFT CHECK
Every 3–5 meaningful interactions, re-anchor against the original session goal. If you detect drift, **surface it explicitly** — don't silently re-orient. Full protocol: `docs/session-management.md`.

---

## Known Quirks & Edge Cases
- **Baggy clothing** throws off hip/knee landmark detection. Thresholds were deliberately loosened (e.g., hip sag at 145° not 155°). Do not tighten them toward "biomechanically correct" without re-testing on real users.
- **MediaPipe jitter** — partially occluded limbs cause landmarks to jump. We use smoothed angles and direction tracking (`state.prevAngle`) rather than raw per-frame values. New exercise analyzers must follow the same pattern.

---

## Lessons Learned (add to this as we go)
1. **Lighter wins on mobile.** Pose tracks 4 hand landmarks per hand — enough for gesture detection. Check existing models before adding new ones.
2. **Direction tracking prevents false cues.** Track `prevAngle` and only fire depth cues when the angle is actually moving in the expected direction. Phase state alone is not enough.
3. **Pose validation gates prevent false feedback.** Validate the pose shape first (e.g., body horizontal for plank) before running form analysis.
4. **Browser caching hides code changes.** After editing `index.html`, tell Scott to add `?v=N` or hard-refresh — the phone may still serve the cached version.
5. **Silhouettes must be filled shapes, not stick figures.** Thin lines are ambiguous at distance. Filled shapes with body thickness and directional features (nose, feet, butt) read clearly.
6. **Pose hand landmarks need loose thresholds.** At 6+ feet, fingertip landmarks (17–22) are low-resolution. Use ~(visibility 0.5, distance 0.02, area 0.0002) for palm detection.
7. **Silhouettes must match real body mechanics.** Think "what does this exercise actually look like from the side?" before drawing (e.g., pushup body slopes up from hands on the floor).
8. **Auto-start via position detection is a reusable pattern.** For floor exercises, detect the starting pose + require a 3-second hold. Standing exercises are too ambiguous — those keep the palm gesture.
9. **Skip canvas context resets when dimensions haven't changed.** Cache last-known width/height; only reset when size changes. Small per-frame savings compound on a thermal-limited phone.
10. **Frame throttle rate should adapt to workout state.** Higher skip rate when idle/positioning (e.g., 4-frame), lower when active (e.g., 2-frame).
11. **Calibration needs positioning before tracking.** Require silhouette alignment + 2-second hold before starting, and use a jitter-aware direction-reversal threshold (~4°). Any feature tracking joint angles at distance needs this.
12. **Smart calibration covers multiple exercises from fewer movements.** Squat ROM → squat + lunge; pushup ROM → pushup + pullup. 6 total reps calibrate all 4 rep-based exercises.
13. **Direction changes need consecutive-frame filtering.** Require N consecutive frames (3 works well) all moving the same direction before flipping phase — single-frame crossings are just jitter.
14. **Playwright tests can't reach app JS globals.** All app code is inside `window.addEventListener('load', fn)` — closure-scoped, not on `window`. Tests must use DOM-observable state: `#exercise-select` options, `#camera-permission` visibility, `#exercise-name` / `#rep-counter` text.

---

## Reference Docs
Project-specific supporting docs live in `./docs/`. At session start, check if they're current.

| Doc | Purpose |
|-----|---------|
| `roadmap.md` | 6-phase roadmap, current phase, completed items |
| `docs/specs/architecture-map.md` | Where everything lives in index.html (section map + function table) |
| `docs/specs/voice-architecture.md` | Voice gating layers, cue-adding guide, cooldown values |
| `docs/session-management.md` | Keeping long sessions on track, drift prevention |
| `docs/debug-video-workflow.md` | How to capture and extract debug data from phone screen recordings |
| `docs/decision-validation.md` | Pre/post checklist for every meaningful change |
| `docs/mediapipe-reference.md` | Full MediaPipe Pose landmark reference (all 33 landmarks) |
| `docs/lessons-learned.md` | Running log of session-level surprises and corrections |
