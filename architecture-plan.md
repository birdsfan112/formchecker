# FormChecker Architecture Plan

**Date:** 2026-04-04
**Based on:** `formchecker-architecture-research.md` (MediaPipe performance, single-file limits, iOS Safari, accessibility, privacy, monetization)
**Current state:** Phases 1–4 complete, Phase 5 (exercise library) and Phase 6 (monetization) planned but not started.
**File stats:** `index.html` is 2,542 lines / ~99 KB — comfortably within the single-file safe zone (<200 KB).

---

## Part A: Retroactive Improvements (Phases 1–4)

These are issues in the already-shipped code that should be addressed before expanding further. Each is tagged with the research section it comes from.

### A1. WebGL Context Loss Recovery (CRITICAL)
**Research ref:** §3 — Safari WebGL Context Loss
**Current state:** No handler exists. If a user backgrounds Safari mid-workout (to check a text, change music, etc.), the MediaPipe pipeline dies silently. The canvas freezes or throws an uncaught exception. Rep count and set data are preserved in `state`, but the user sees a blank/frozen screen with no way to recover except a full page reload.
**What to do:**
- Add `webglcontextlost` event listener on the main `<canvas>` element. On fire: prevent default, stop the `pose.send()` loop, show a visible "Session paused — tap to resume" overlay.
- Add `webglcontextrestored` event listener. On fire: re-create the `Pose` instance, restart the camera feed, dismiss the overlay.
- Test by backgrounding Safari during an active set on an actual iPhone.
**Complexity:** Medium
**Needs Scott:** Yes — needs phone testing. The re-initialization flow may cause a 2-3 second delay; Scott should decide if that's acceptable or if the set should auto-finish.

### A2. ARIA Live Region for Screen Reader Announcements
**Research ref:** §4 — Screen Reader Considerations
**Current state:** Zero ARIA attributes anywhere. The app is fully inaccessible to VoiceOver/TalkBack users. The canvas is opaque to the accessibility tree.
**What to do:**
- Add a visually-hidden `<div id="a11y-announcer" aria-live="polite" aria-atomic="true">` to the HTML.
- Update it on: rep count change, form cue display, set start/finish, exercise change.
- Add `role="status"` to `#exercise-name` and `#rep-counter`.
**Complexity:** Small
**Needs Scott:** No — can be done autonomously. Two lines of HTML, ~6 lines of JS.

### A3. Colorblindness: Secondary Indicators for Color-Only Signals
**Research ref:** §4 — Colorblindness
**Current state:** Green/yellow/red form score flash (Phase 3) and the green silhouette alignment tint both convey meaning through color alone. Users with red-green colorblindness (8% of males) cannot distinguish these states.
**What to do:**
- Add text labels to the rep score flash: "Good" / "Okay" / "Fix Form" alongside the numeric score.
- Add an "Aligned ✓" text indicator near the silhouette when `checkPositioning()` returns aligned (currently the only signal is the green tint).
**Complexity:** Small
**Needs Scott:** No — purely additive, no behavioral change.

### A4. Camera Permission Rationale (Pre-Prompt)
**Research ref:** §5 — User-Facing Privacy Communication
**Current state:** The app calls `getUserMedia()` immediately on load (via MediaPipe camera init). The user sees the browser's generic "wants to use your camera" prompt with no context. This is the #1 moment users deny permissions.
**What to do:**
- Before MediaPipe initializes, show a brief interstitial: "FormChecker uses your camera to detect body position. No video is recorded or transmitted. Tap Continue to start."
- Only call camera init after the user taps Continue. This also serves as the iOS audio unlock gesture (one tap for both).
**Complexity:** Small–Medium
**Needs Scott:** Yes — should review the wording and decide if the interstitial feels too heavy.

### A5. Model Complexity: Consider Downgrading to Lite (0)
**Research ref:** §1 — Model Architecture, Thermal Throttling
**Current state:** `modelComplexity: 1` (Full model). The research shows the Full model runs at roughly half the speed of Lite for modest accuracy gains. Since FormChecker uses angle-based analysis (not precise joint coordinate tracking), and the published mean angle error is ~10° regardless of model, the Lite model may be sufficient.
**What to do:**
- Test `modelComplexity: 0` on Scott's phone during a real workout. Compare: FPS (visual smoothness), thermal buildup over 5+ minutes, and whether rep detection accuracy noticeably degrades.
- If comparable, switch to Lite permanently. This extends the "thermal budget" by ~30%, meaning consistent performance deeper into workouts.
**Complexity:** Small (one line change, but needs real-world testing)
**Needs Scott:** Yes — this is a phone test. The decision depends on whether Scott perceives any quality difference.

### A6. Visibility Score Hysteresis
**Research ref:** §1 — Visibility Score Reliability
**Current state:** `checkPositioning()` uses a flat threshold (`visibility > 0.4`). `isRaisedPalm()` uses `visibility < 0.6` / `0.2`. When a landmark hovers near the threshold, analysis toggles rapidly frame-to-frame.
**What to do:**
- Implement hysteresis: require `visibility > 0.6` to activate a landmark as "visible" and `visibility < 0.35` to deactivate it. Store a per-landmark visible/hidden state.
- This applies mainly to `checkPositioning()` and `isInPosition()` where threshold flickering causes the "grayed out rep counter" to flash on and off.
**Complexity:** Medium
**Needs Scott:** Partially — the implementation is autonomous, but Scott should test whether the flickering issue is actually visible on his phone (it may already be masked by the frame skip rate).

### A7. Web Speech Re-Unlock After Backgrounding
**Research ref:** §3 — Web Speech API: Gesture Unlock
**Current state:** The audio unlock fires once via `touchstart`/`click`. If the user backgrounds the app and returns, the unlock may have lapsed. Voice cues fail silently — no error thrown, just silence.
**What to do:**
- Before every `speechSynthesis.speak()` call, check if `speechSynthesis.speaking === false` and `state.iosAudioUnlocked === true`. If so, fire a zero-length priming utterance before the real one.
- This is a defensive wrapper, not a guaranteed fix (iOS audio session management is opaque), but it covers the most common recovery case.
**Complexity:** Small
**Needs Scott:** No — transparent change, no behavior difference when working correctly.

### A8. Consecutive-Frame Filtering Should Use Wall-Clock Time
**Research ref:** §1 — Frame Rate Reality
**Current state:** Direction reversal in `analyzeWarmup()` requires 3 consecutive frames. At 15 FPS (thermal throttle), 3 frames = 200ms. At 7 FPS (idle throttle), 3 frames = 430ms. The user experience changes based on frame rate.
**What to do:**
- Convert N-frame filters to wall-clock time: e.g., "150ms of consistent direction" instead of "3 frames." Store the timestamp when direction first flipped; confirm after the time threshold.
- This makes the feel consistent regardless of thermal state or frame skip rate.
**Complexity:** Medium
**Needs Scott:** No — behavioral difference is subtle but correct. Can be tested in unit tests.

---

## Part B: Roadmap Alignment (Future Phases)

### Phase 5: Exercise Library Expansion

**Current plan:** Add 14 new exercises (7 strength, 7 mobility/PT).

**Research alignment issues:**

1. **File size impact.** Each exercise analyzer in the current code is ~50–70 lines. Adding 14 exercises adds ~700–1,000 lines of JS. Combined with silhouette drawing code (~100 lines per exercise type), total addition could be 2,000–3,000 lines. This pushes `index.html` from ~2,500 to ~5,000+ lines and from 99 KB to ~180–200 KB. Still under the 500 KB danger zone (§2), but approaching the point where debugging by line number in mobile console becomes painful.

2. **Exercise metadata scaling.** The current `exerciseMeta` object is hardcoded. With 19 exercises, the `<select>` dropdown becomes unwieldy on mobile. The research doesn't directly address this, but the UX implication is that exercise selection needs to evolve (categories, search, or the template system becomes the primary navigation).

3. **Calibration scaling.** The current warmup calibration covers all 4 rep exercises via 2 representative movements (squat → lunge, pushup → pullup). Adding 7 new strength exercises means deciding: does each new exercise need its own calibration, or can it derive from existing movements? Most of the planned exercises (dips, rows, pike pushups, L-sits, arch hangs, leg raises, pistol squats) use different primary joints than the current 4. Lesson 14 ("smart calibration") established the derivation pattern, but it doesn't scale cleanly to exercises with unique movement patterns.

4. **Missing: exercise difficulty/progression tiers.** The r/bodyweightfitness routine has explicit progressions (e.g., knee pushups → full pushups → diamond pushups). The roadmap lists exercises but not progressions. This matters for the freemium split (§6) — progressions are a natural premium feature.

**Recommendations for Phase 5:**

- **Do retroactive items A1–A3 first.** WebGL context loss is a reliability risk that worsens as workout sessions get longer (more exercises per session = more backgrounding). Fix it before adding complexity.
- **Group exercises by movement pattern**, not alphabetically. Categories: Push (pushup, pike pushup, dips), Pull (pullup, rows, arch hangs), Legs (squat, lunge, pistol squat), Core (plank, L-sit, leg raises), Mobility (everything else). This organizes the UI and simplifies calibration derivation.
- **Start with 2–3 exercises, not all 14.** The research (§1, landmark accuracy) shows that each exercise needs real-phone tuning of thresholds. Shipping all 14 at once means 14 untested analyzers. Recommended first batch: **dips** (closest to pushup — elbow angle tracking, side view) and **rows** (inverse of pullup — similar joints). These reuse existing calibration derivations.
- **Add exercise metadata as a structured object, not more hardcoded blocks.** Each exercise should be declaratively defined: `{ primaryJoint, phases, thresholds, cameraAngle, formChecks, silhouetteType, calibrationSource }`. The `analyze()` method can become a generic engine that reads this metadata rather than a per-exercise function. This is the right time to refactor — before the library grows, not after.

### Phase 6: Monetization & Distribution

**Current plan:** PWA install, landing page, freemium, user accounts, social sharing, app store wrapper.

**Research alignment issues:**

1. **PWA installation requires extracting files (§2).** `manifest.json` and at least one icon must be separate files alongside `index.html` on GitHub Pages. This is a structural change to the single-file architecture. The manifest is small (~20 lines of JSON) and the icon can be a single 512px PNG. This should be the first monetization step — it enables "Add to Home Screen" which improves session persistence (camera permissions stay granted, LocalStorage is less likely to be evicted).

2. **Service worker for offline support is a bigger step (§2).** Caching the MediaPipe CDN assets locally (~10 MB) consumes a significant chunk of iOS's 50 MB Cache API quota. Recommendation: defer offline support unless user testing shows connectivity is a real problem.

3. **Payment requires a backend (§6).** Stripe integration cannot be done client-side. The research recommends serverless functions (Cloudflare Workers, Vercel Edge Functions). This is a Phase 6B step, well after the PWA basics.

4. **Ko-fi / GitHub Sponsors first (§6).** Zero infrastructure, validates willingness to pay before building payment flow. This can be added to the landing page immediately.

5. **Freemium split point.** The research recommends: core 4 exercises free, expanded library as premium. The "upgrade moment" should happen when the user tries to select a premium exercise — in-context, not a popup. This means the exercise selector needs a "locked" visual state for premium exercises.

6. **Privacy policy (§5).** Required before any public marketing push. Minimal: one static HTML page covering what's processed (camera, locally only), what's stored (LocalStorage), what's exported (user-initiated only), and contact info. Host alongside `index.html` on GitHub Pages.

7. **User accounts + cloud sync is the heaviest item.** This requires a backend, database, auth, and data migration from LocalStorage. The research (§5, GDPR) notes that any server-side storage of workout data triggers full GDPR obligations. Recommendation: defer to Phase 6C or later, after validating that users actually want cross-device sync.

**Recommended Phase 6 ordering:**
1. PWA manifest + icon (enables home screen install)
2. Privacy policy page
3. Landing page with Ko-fi link
4. Freemium exercise gating (UI only — no payment processing)
5. Stripe integration via serverless functions
6. User accounts + cloud sync (only if demand is validated)

---

## Part C: Updated Roadmap Spec

### Pre-Phase 5: Reliability & Compliance Sprint

These items should be completed before expanding the exercise library. They fix real bugs and compliance gaps in the shipped product.

| # | Item | Why | Autonomous? | Complexity | Depends on |
|---|------|-----|-------------|------------|------------|
| R1 | WebGL context loss handlers | Top reliability risk (§3). Users lose sessions when backgrounding Safari. | Needs phone test | Medium | — |
| R2 | ARIA live region for accessibility | Zero screen reader support currently (§4). Low-cost, high-impact. | Yes | Small | — |
| R3 | Colorblind-safe indicators | Color-only signals exclude 8% of male users (§4). | Yes | Small | — |
| R4 | Camera permission rationale | Reduces permission denial rate (§5). Also bundles iOS audio unlock. | Needs copy review | Small–Med | — |
| R5 | Web Speech re-unlock after backgrounding | Voice cues fail silently after app backgrounding (§3). | Yes | Small | — |
| R6 | Visibility hysteresis | Prevents flickering position detection at threshold boundaries (§1). | Needs phone test | Medium | — |
| R7 | Wall-clock direction filtering | Makes rep detection consistent across frame rates (§1). | Yes | Medium | — |
| R8 | Test modelComplexity: 0 vs 1 | May gain 30% thermal headroom with no quality loss (§1). | Needs phone test | Small | — |
| R9 | Privacy policy page | Required before public marketing (§5, GDPR). | Needs copy review | Small | — |

### Phase 5: Exercise Library Expansion (revised)

Split into sub-phases for testability. Each batch ships and gets phone-tested before the next begins.

| # | Item | Why | Autonomous? | Complexity | Depends on |
|---|------|-----|-------------|------------|------------|
| 5A | Refactor exercise analyzers to data-driven engine | Current per-exercise functions don't scale to 19 exercises. Metadata-driven approach reduces code per exercise from ~60 lines to ~10 lines of config. | Yes (review plan first) | Large | — |
| 5B | Exercise category UI (Push/Pull/Legs/Core/Mobility) | Dropdown with 19 items is unusable on mobile. Group by movement pattern. | Needs UX input | Medium | 5A |
| 5C | Batch 1: Dips + Inverted Rows | Closest to existing exercises (reuse pushup/pullup calibration). | Needs phone test | Medium | 5A |
| 5D | Batch 2: Pike Pushups + L-Sits + Leg Raises | Core/advanced push exercises. New silhouette types needed. | Needs phone test | Medium | 5A |
| 5E | Batch 3: Pistol Squats + Arch Hangs + Dead Hangs | Leg/pull variations. Pistol squat needs unilateral joint tracking. | Needs phone test | Medium | 5A |
| 5F | Batch 4: Mobility exercises (shoulder dislocates, hip stretches, wrist circles, cat-cow, bird-dog, foam roller, band pull-aparts) | Completes the r/bodyweightfitness routine. These are form-display-only (no rep counting) — just a timer + form cues. | Needs phone test | Large | 5A |
| 5G | Calibration expansion | Determine which new exercises need their own calibration vs. can derive from existing. Update warmup flow if needed. | Needs analysis first | Medium | 5C–5F |

### Phase 6: Distribution & Monetization (revised)

| # | Item | Why | Autonomous? | Complexity | Depends on |
|---|------|-----|-------------|------------|------------|
| 6A | PWA manifest + app icon | Enables "Add to Home Screen" — improves retention, camera permission persistence, and perception as a "real app." (§2, §3) | Yes | Small | — |
| 6B | Privacy policy static page | Legal requirement for EU users under GDPR (§5). Hosts alongside index.html. | Needs copy review | Small | — |
| 6C | Landing page + Ko-fi link | Validates willingness to pay with zero infrastructure (§6). SEO entry point. | Needs content input | Medium | — |
| 6D | Freemium exercise gating (UI) | "Locked" state on premium exercises. Upgrade prompt appears in-context when user selects a locked exercise. No payment backend yet — just the UX pattern. (§6) | Needs pricing input | Medium | 5B |
| 6E | Stripe + serverless payment backend | Subscription or one-time purchase via Stripe. Requires Cloudflare Workers or Vercel Functions. Apple Pay via Safari PWA has no Apple commission. (§6) | Needs infra decisions | Large | 6D |
| 6F | User accounts + cloud sync | Backend + auth + database. Full GDPR compliance required. Only build if demand is validated. (§5, §6) | Needs significant input | Large | 6E |
| 6G | App store wrapper (Capacitor) | Only if organic demand justifies the 30% Apple/Google commission and the review process overhead. (§6) | Needs business decision | Large | 6F |

### Deferred / Not Recommended

| Item | Why deferred |
|------|-------------|
| Service worker / offline caching | iOS 50 MB quota (§2). MediaPipe CDN assets are ~10 MB. Connectivity hasn't been reported as an issue. Revisit if users request it. |
| Social sharing | Requires designing what to share (screenshot? stats card?) and where (native share API has iOS limitations). Low priority vs. core features. |
| Push notifications for workout reminders | iOS requires home screen install + explicit opt-in (§3). Small addressable audience. Calendar reminders are a simpler workaround. |
| Screen orientation lock | Not supported in iOS PWA context (§3). Cannot be implemented. |

---

## Priority Order (Recommended Session Sequence)

1. **R1 + R5 + R7** — WebGL recovery, speech re-unlock, wall-clock filtering. These three fix real reliability bugs.
2. **R2 + R3** — Accessibility (ARIA + colorblind). Quick wins, do in one session.
3. **R4 + R8** — Camera rationale + model complexity test. Both need Scott on phone.
4. **R9 + 6A** — Privacy policy + PWA manifest. Compliance + install prompt.
5. **5A** — Refactor to data-driven exercise engine. Prerequisite for all exercise expansion.
6. **5B + 5C** — Category UI + first exercise batch (dips, rows).
7. **5D–5F** — Remaining exercise batches.
8. **6C + 6D** — Landing page + freemium gating.
9. **6E+** — Payment and beyond.

---

## Key Decision Points for Scott

These require your input before work begins:

1. **WebGL recovery behavior (R1):** When the user returns from backgrounding, should the set auto-finish (preserving reps counted so far) or should it attempt to resume mid-set?
2. **Camera rationale wording (R4):** "FormChecker uses your camera to detect body position. No video is recorded or transmitted." — is this clear enough, or too technical?
3. **Model complexity tradeoff (R8):** Willing to test Lite vs Full during a real workout? The difference might be invisible, or it might feel laggy.
4. **Exercise categories (5B):** Push/Pull/Legs/Core/Mobility grouping, or a different scheme?
5. **Freemium split (6D):** Which exercises are free vs. premium? Research suggests keeping the current 5 (pushup, squat, pullup, lunge, plank) free and gating the expanded library.
6. **Pricing (6E):** Research suggests $4.99/month or $34.99/year as a starting point. Does that feel right?
