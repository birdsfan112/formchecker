# Animation Paradigm Evaluation — How-To Movement Demos

**Status:** DRAFT for Scott's review — not a decision.
**Author:** Claude (investigation; no code changes).
**Date:** 2026-04-17.

---

## Problem

The "how-to" animation layer (drawn on the guide canvas during idle state) is the visual that shows a new user *what the movement looks like* before they start. Today, pull-ups read as a human doing a pull-up. The other 21 exercises do not — the figures look broken, physics-less, anatomically wrong, or simply unreadable.

Scott wants a new paradigm, not incremental tweaks to the current one. The purpose of this doc is to evaluate four candidate paradigms and recommend one (or a hybrid), without making the call for him.

The scope is **how-to animation only** — the looping demo while the user is positioning. It does NOT cover:
- The static picker-card SVG silhouettes (`assets/silhouettes/*.svg` — already shipped, acceptable).
- The alignment-tint guide silhouette in `drawStandingSide` / `drawHorizontalSide` / etc.
- The MediaPipe skeleton overlay drawn on the user during the workout.

---

## Current State

**Paradigm:** Hand-authored 2-keyframe stick figures, interpolated on a 2D canvas.

**Implementation (`index.html`):**
- `HOW_TO_KEYFRAMES` (line 2642, ~290 lines): a JS object keyed by exercise. Each entry is `{ period: <ms>, frames: [frameA, frameB] }`. Each frame is `{ head: [x, y, r], segs: [ [[x,y],[x,y]], ... ] }` — all coordinates normalized 0–1 against the guide-canvas viewport.
- `drawHowToSkeleton(w, h, ex)` (line 2935): computes `t = (1 - cos((now % period) / period * 2π)) / 2` (cosine ease 0→1→0), linearly interpolates each segment endpoint and head position between frameA and frameB, and strokes lines + filled joint dots in blue `rgba(96,165,250,0.88)` onto `guideCtx`.
- Called from `drawGuide()` (line 3029), gated on `state.workoutState === 'idle'`. Runs on the existing 7.5fps idle throttle.

**Why pull-ups are acceptable — and why only pull-ups:**
- Pull-ups are a **front-view hanging exercise**. The dominant motion is a nearly-vertical translation of the head and shoulders between arms-extended and chin-over-bar. The 2-point linear lerp between keyframes happens to be a reasonable approximation of that trajectory, because the real-world motion *is* close to a linear translation of a rigid-ish torso along one axis.
- Every other exercise has multi-joint rotational motion (squat: ankle + knee + hip all arc; pushup: elbow + shoulder arc; lunge: asymmetric knee/hip; catcow: spine curvature). Linearly interpolating endpoint-to-endpoint between two hand-placed keyframes does not trace those arcs — it slides line segments across each other. The result reads as broken geometry rather than human movement.

**Secondary problems (independent of the keyframe count):**
- No limb-length preservation. Because segments are interpolated endpoint-by-endpoint, a "thigh" can change length mid-frame.
- No depth, no mass, no rigging. A stick skeleton at 6+ feet on a phone is already low-signal even when it moves correctly.
- Keyframes are hand-placed in pixel-normalized coordinates — tuning one exercise is a 20–30 minute fiddle.
- Two keyframes cannot express asymmetric motion (e.g., lunge: which leg is forward?). The current lunge lerp collapses both legs into a confused middle pose.

**Files in play:**
- `index.html` — all animation code + keyframes inline (single-file app constraint).
- `assets/silhouettes/*.svg` — 7 static SVGs, **picker cards only**, not involved in how-to animation.
- No external animation libraries. No build step. GitHub Pages deploy.

**Constraints that any new paradigm must respect:**
- Single-file `index.html` app (GitHub Pages auto-deploy on push to `main`).
- Runs on iOS Safari on a phone. Thermal budget is tight — MediaPipe Pose is already running at `modelComplexity: 0` to reduce GPU load.
- The user is **6+ feet from the phone** during positioning. Whatever renders needs to be legible at that distance.
- Must render during idle without fighting `checkPositioning()`'s alignment tinting or the static guide silhouette.
- No backend. No account system. Fully client-side.

---

## Candidate Comparison

Each candidate is evaluated on: **quality ceiling** (how good can it get?) · **iOS Safari integration complexity** · **licensing + cost** · **maintenance burden per exercise** · **22-exercise coverage** · **mobile performance**.

| Dimension | A. Mixamo rigged 3D | B. Stock video clips | C. Scott self-filmed clips | D. Abstracted Rive-style |
|---|---|---|---|---|
| **Quality ceiling** | High. Anatomically correct, physically plausible motion. Can look generic/game-engine. | Very high for common exercises; mixed for niche ones. Real humans = instantly readable. | Highest for authenticity — it's the actual movement Scott is coaching. Production quality depends on Scott's setup. | Medium. Abstract-by-design; reads as "a diagram," not "a person." Apple Fitness+ uses this effectively. |
| **iOS Safari integration** | Heavy. Needs a 3D runtime — three.js + GLTF + skeletal animation loader. Adds ~600KB–1MB JS. WebGL context on phone competes with MediaPipe's GPU work. | Light. `<video muted autoplay loop playsinline>` is a native tag. Inline playback works on iOS Safari with `playsinline`. One tag per exercise or one swapped `src`. | Same as B — it's a video file, just a different source. | Medium. Rive web runtime is ~200KB; alternative is custom SVG morph (no deps, but hand-build). Both composite cleanly over/under canvas. |
| **Licensing + cost** | Free. Adobe owns Mixamo; free for commercial + personal use (per current Mixamo ToS). No per-clip fees. Risk: Adobe has signaled Mixamo may not be maintained forever. | **Trap zone.** Pexels/Pixabay licenses are permissive but fitness-specific clips are thin; many "free" fitness clips are actually influencer-branded. Envato is paid (~$16/mo for subscription, or ~$3–10/clip). Per-clip license check needed for any public distribution. | Free, and Scott owns the license outright. One-time filming cost = Scott's time. | Free if self-authored in SVG. Rive's free tier is permissive for app use; paid tier if Scott wants the editor long-term. |
| **Maintenance per exercise** | Medium. Apply Mixamo animation to a rigged character once, export GLB. Adding exercise 23 = find a Mixamo clip that matches, export, wire up. ~30–60 min per exercise. | Low if a matching clip exists (just drop the file). High if it doesn't — you cannot edit stock video. | Medium. One filming session for 22 exercises is 1–2 hours of setup + 2–3 hours of filming + editing. Adding exercise 23 = re-film. | Medium–high. Hand-authored keyframes in Rive editor or SVG. Easier than current because the editor gives visual feedback; harder than video because you're still authoring motion. |
| **22-exercise coverage** | Strong for common exercises (squat, lunge, pushup, pullup, plank). Weak for niche: **band pull-aparts, wrist warm-ups, foam roller, scapular pulls, arch hang** unlikely to exist as Mixamo clips — you'd fall back to custom mocap or hand-author. | Strong for common lifts. Very weak for niche: foam roller, scapular pulls, arch hangs, wrist warm-ups are rare. Probably 12–15/22 covered; the rest fall back to another paradigm. | Complete by definition — Scott films all 22. No coverage gap. | Complete by definition — you author what you need. Coverage = time budget. |
| **Mobile performance** | Risk. Three.js skeletal animation on top of MediaPipe Pose on iOS Safari at `modelComplexity:0` is a known thermal pain point. Loop-playing one GLB is manageable; switching contexts between exercises isn't. | Best. `<video>` is hardware-accelerated on iOS. A 5-second loop at 480p is ~150–400KB, barely registers. | Same as B — hardware-accelerated `<video>`. Scott's files can be compressed to small sizes. | Good. Rive runtime is optimized; SVG morph is near-free. Both comfortably under MediaPipe's budget. |
| **Single-file constraint** | Breaks it. GLB files are binary; base64 in HTML would bloat `index.html` past readability. | Breaks it. Video files must be external. Acceptable if served from `assets/` alongside `index.html` (GitHub Pages serves them fine). | Same as B — files in `assets/videos/`. | Preserved if SVG. Rive runtime is external JS. |
| **Time to first working demo** | 2–3 days (rigging pipeline + runtime). | Hours (for exercises with available clips). | 1 filming session + 1 editing session (~half-day). | 1–2 days for SVG morph; similar for Rive. |

---

## Recommendation

**Primary recommendation: Candidate C — Scott self-films the 22 exercises — with Candidate D (abstracted stick/Rive) as fallback for the 2–3 exercises that are awkward to self-film (e.g., if filming a hanging exercise requires a pull-up bar setup Scott doesn't want to build right now).**

### Why C over the others

1. **Authenticity matches the coaching.** FormCheck's coaching layer fires cues like "go deeper," "keep your hips level," "pause at the bottom." The demo animation should show the exact pose the cues describe. Only Scott's own filming guarantees that alignment, because *Scott is the one authoring the thresholds*. A Mixamo rig or a stock clip may show an acceptable rep that still triggers cues in the app.
2. **Coverage is complete by construction.** Every other paradigm has an "and then what about scapular pulls and foam roller?" hole. Scott already demonstrated all 22 exercises to himself when tuning the form-analysis thresholds — filming them is a one-time re-run of work he has already done.
3. **Mobile performance is the best of the four.** `<video muted autoplay loop playsinline>` is hardware-accelerated, free of WebGL contention with MediaPipe, and robust on iOS Safari.
4. **Cost and licensing are zero and uncomplicated.** No stock-clip license audit, no Mixamo TOS drift, no Rive subscription question.
5. **Quality ceiling is highest.** A real human doing the exact movement the app is watching for is the gold-standard reference. Even a phone-filmed clip beats a rigged abstraction for "can I tell what this exercise is from 6 feet away."

### Why not A (Mixamo)

The technical pipeline (three.js + GLB + rigged character) is a significant dependency for a single-file HTML app. It adds WebGL GPU contention with MediaPipe on a thermally-limited device. Coverage of niche mobility exercises (wrist warm-ups, scapular pulls, band pull-aparts, foam roller) is poor — you'd end up mixing paradigms anyway. The quality ceiling is game-engine-mannequin, not human.

### Why not B (stock video)

Two fatal gaps: (1) niche exercises (the back half of the 22) do not exist as quality stock clips, and (2) licensing requires per-clip verification that becomes an ongoing tax whenever Scott adds an exercise. Stock video is the "seems cheapest" option that gets expensive in edge cases.

### Why not D (abstracted Rive/stick-figure) as the primary

D is the closest kin to what's there today. It is a real upgrade (proper rigging, limb-length preservation, multi-keyframe editing in a visual tool) but still abstract — same fundamental readability ceiling as stick figures. Apple Fitness+ uses abstracted stick figures **alongside** real human trainers, not as a replacement. Going abstract-only forfeits the legibility advantage at 6 feet on a phone.

D is valuable as a **fallback** for specific exercises where self-filming is logistically painful — e.g., if Scott doesn't have a pull-up bar at home, the hanging-exercise subset can stay as abstract animations until the filming setup exists.

### Hybrid option (discuss)

If Scott wants to stage this:
- **Phase 1:** Film the 10–12 easy-to-film exercises (all standing, floor, kneeling, quadruped). Ship those.
- **Phase 2:** Film the hanging exercises once a filming setup exists. Until then, keep the current stick-figure animation (or upgrade to Rive) for just those 5 hanging exercises.

This is lower-commitment than "film all 22 in one session" and de-risks the filming bottleneck.

---

## Migration Outline

High-level only. Not an implementation spec — Scott decides first, then we write the implementation spec.

1. **Filming prep.** Scott picks a setup: camera angle per `drawStyle` (side-view for standing/horizontal/kneeling/quadruped, front-view for hanging). Plain background, consistent lighting, same framing as the app's guide silhouette. 8–12 seconds per exercise is enough for a smooth loop.
2. **Clip processing.** Trim to a clean loop. Encode as MP4 H.264 (iOS Safari's best-supported codec) at 480p or 540p. Target ~300–600KB per clip. Optionally also encode WebM for Android/Chrome with MP4 fallback — MP4 alone is fine if Scott wants simplicity.
3. **Asset layout.** `assets/videos/<exercise>.mp4`. Stays in the repo, deployed by GitHub Pages alongside `index.html`.
4. **DOM integration.** Add one `<video>` element layered beneath the guide canvas (or positioned absolutely over the camera preview during idle). Set `muted autoplay loop playsinline` on it. On exercise change, swap `video.src` to the current exercise's clip. On workout start, hide the video element.
5. **Retire the old keyframes.** Delete `HOW_TO_KEYFRAMES` and `drawHowToSkeleton`; remove the call from `drawGuide()`. The static guide silhouette (`drawStandingSide`, etc.) stays — that's the alignment reference, a different layer.
6. **Acceptance test.** Phone test all 22 exercises per `docs/exercise-testing-protocol.md`: does the video play inline on iOS Safari? Does it loop smoothly? Is it legible at 6 feet? Does it interfere with alignment tinting?
7. **Regression tests.** Playwright specs already verify the exercise picker. Add one spec that asserts a `<video>` element with a valid `src` appears on idle and disappears on workout start.

### Open questions for Scott before implementation

- Film in landscape or portrait? (Matches the app's orientation; portrait is the default on phones.)
- Wear neutral clothing, or the same clothing Scott wears when form-testing?
- Show face, or frame from neck down? (Face adds warmth; frame-from-neck is easier for re-filming if the clip needs redo.)
- One take per exercise, or intentionally film 2–3 reps per clip so the loop has variation?
- Budget: half-day filming session, or spread across multiple sessions?

---

## What's NOT in this doc

- Implementation detail (file sizes, video codecs, exact DOM structure beyond the migration sketch above). That goes in the follow-on implementation spec once Scott decides.
- A rebuild of the static guide silhouette or picker SVGs. Those are a separate layer and are working.
- Any recommendation about the alignment-tint guide — unchanged.
