## Status
| Field | Value |
|-------|-------|
| Phase | Implement |
| Updated | 2026-04-11 |
| Summary | 22 exercises, 289 unit tests + 34 Playwright smoke tests (all passing). Harness now includes 6 real specs: squat/deadhang/catcow (Y4M) + bandpullapart/lsit/dip (landmark injection, audit D1-D3). Landmark injection pattern shipped in _helpers.ts. |
| Next Session | Scott: phone-test Session 1 exercises (bandpullapart, lsit, dip, pullup, glutebridge, lunge) per `docs/refactor-audit-2026-04-10.md` focus order — or Claude starts Step 4 (visual polish spec update, autonomous) |
| Needs Scott | Phone test all 22 exercises — use focus order in `docs/refactor-audit-2026-04-10.md` (Session 1 first: bandpullapart, lsit, dip, pullup, glutebridge, lunge). Record Y4M files to expand remaining 16 placeholder Playwright tests. |
| Autonomous | Update visual polish spec (Step 4) |
| External Blockers | None |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Current Sprint

<!-- Active work only. Steps 1 and 3 are complete (noted inline). Steps 2, 4, 5 remain.
     Pre-launch checklists, QA tasks, maintenance work, and deployment prep all belong here too — not just new features. -->

### Step 1 — Framework spec open questions ✅ RESOLVED (2026-04-10)
- Closure for scoped state (Safari phone testing makes DevTools impractical)
- Auto-scaffold = schema validation only (fields, drawStyle, landmark indices, topAngle > bottomAngle)
- Picker redesign → follow-on sprint
- Visual polish spec update → after migration

### Step 2 — Scott: Phone test all 22 exercises
*Use `docs/exercise-testing-protocol.md` — 9-step checklist per exercise.*

- [x] Arch hangs / scapular pulls (timed hanging exercises, 14-15 in registry)
- [x] Mobility/PT batch — shoulder dislocates, hip flexor stretch, wrist warm-up, band pull-aparts, foam roller, cat-cow, bird-dog (exercises 16-22)
- [ ] Phone test all 22 exercises — use `docs/exercise-testing-protocol.md`

### Step 3 — Exercise framework refactor ✅ COMPLETE (2026-04-10)
*Per `docs/specs/exercise-framework-spec.md`. All 22 exercises migrated to single config-object pattern via `addExercise(config)`. Framework extensions added: `invertedPolarity` (glute bridge, band pull-aparts), `downGate(lm)` (pull-up chin-over-bar gate). Tests: 284 passing, 0 failing — includes parallel framework implementations for rep + timed analyzers in `tests.js`. Two dead-code findings filed to backlog (see Backlog §2). One minor feature dropped: per-frame camera-orientation nudge for dips (see Backlog §3).*

### Step 4 — Update visual polish spec (13 → 22 exercises)
*Add the 9 exercises missing from `docs/specs/visual-polish-sprint.md` before PNG work begins.*

### Step 5 — Visual polish sprint
*PNG silhouettes + CSS-animated how-to keyframes. Framework provides clean structure for this.*

## Backlog

<!-- Future work, roughly priority-ordered. Not checkboxes — these aren't active yet.
     If an item needs a full spec, write the spec in docs/specs/ and link to it here. -->

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)
2. **Form-cue audit (post-framework)** — two known dormant cues surfaced during the push-up framework migration (2026-04-10):
   - `goDeeper` (push-up, and likely pike/dip too): in the new framework `goingDown` is only tracked in the 'up' phase, so the existing check `phase === 'down' && goingDown && elbow > elbow_down + 12` is unreachable. It was also effectively dead in the old hand-coded version (only fired on bounce patterns). Redesign to fire when the 'down'-phase valley is shallower than the calibrated bottom by X°.
   - `hipsTooHigh` (push-up): check `avgBack > 195` is unreachable because `angle()` clamps output to [0, 180]. Dead code in both old and new versions. Redesign using supplement angle, or remove entirely if pike push-ups covers this shape.
   - Audit all other exercises for the same two patterns once the framework migration is complete.
3. **Dip orientation nudge** — the old dip analyzer wrote `angleHint.textContent = 'Face the camera for best tracking'` every frame when `shoulderSpan < 0.10`. Dropped during framework migration (2026-04-10) to avoid adding a per-frame-side-effect hook to the framework. Restore via a small framework `onFrame(lm)` extension, or inline it into dip's trackingJoint as a side effect.

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

## Session Log

<!-- Reverse-chronological. Most recent entry first. Cap at ~15 entries.
     Archive older entries to docs/roadmap-archive.md (see Archive Pointer below).
     Multiple sessions on the same date can be consolidated into one entry. -->

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

> Earlier sessions archived in `docs/roadmap-archive.md`

## Reference Docs

<!-- Only include files that are genuinely referenced session-to-session. -->

- [`docs/refactor-audit-2026-04-10.md`](docs/refactor-audit-2026-04-10.md) — per-exercise behavioral equivalence audit; phone-test priority order
- [`docs/exercise-testing-protocol.md`](docs/exercise-testing-protocol.md) — 9-step phone testing checklist per exercise
- [`docs/specs/exercise-framework-spec.md`](docs/specs/exercise-framework-spec.md) — framework refactor spec
- [`docs/specs/visual-polish-sprint.md`](docs/specs/visual-polish-sprint.md) — visual polish sprint (Step 5)
- [`docs/roadmap-archive.md`](docs/roadmap-archive.md) — earlier session history
