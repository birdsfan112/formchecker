## Status
| Field | Value |
|-------|-------|
| Phase | Phase 5 — Exercise Library Expansion |
| Updated | 2026-04-10 |
| Summary | 22 exercises, 284 tests. Framework refactor complete — all 22 exercises migrated to single-config-object pattern. Ready for visual polish spec update + phone testing. |
| Autonomous | Update visual polish spec (Step 4) |
| Needs Scott | Phone test all 22 migrated exercises (docs/specs/phase5-phone-testing-checklist.md) |
| Blockers | None |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Phase 5 — Remaining Work (in order)

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

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)
2. **Form-cue audit (post-framework)** — two known dormant cues surfaced during the push-up framework migration (2026-04-10):
   - `goDeeper` (push-up, and likely pike/dip too): in the new framework `goingDown` is only tracked in the 'up' phase, so the existing check `phase === 'down' && goingDown && elbow > elbow_down + 12` is unreachable. It was also effectively dead in the old hand-coded version (only fired on bounce patterns). Redesign to fire when the 'down'-phase valley is shallower than the calibrated bottom by X°.
   - `hipsTooHigh` (push-up): check `avgBack > 195` is unreachable because `angle()` clamps output to [0, 180]. Dead code in both old and new versions. Redesign using supplement angle, or remove entirely if pike push-ups covers this shape.
   - Audit all other exercises for the same two patterns once the framework migration is complete.
3. **Dip orientation nudge** — the old dip analyzer wrote `angleHint.textContent = 'Face the camera for best tracking'` every frame when `shoulderSpan < 0.10`. Dropped during framework migration (2026-04-10) to avoid adding a per-frame-side-effect hook to the framework. Restore via a small framework `onFrame(lm)` extension, or inline it into dip's trackingJoint as a side effect.

## Decisions

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

### 2026-04-10 — Exercise framework refactor complete (Step 3)

- **All 22 exercises migrated** to the single-config-object pattern via `addExercise(config)`. Migration ran in 7 batches (push-up as reference + 6 additional batches), each with full regression tests after every change.
- **Framework extensions added** (both minimal additive changes to `buildRepAnalyzer`):
  - `invertedPolarity: true` — phase 'up' = rest, 'down' = active. Used by glute bridge (angle-based) and band pull-aparts (wrist span, non-angle tracking).
  - `downGate(lm) => boolean` — optional extra predicate gating the 'up'→'down' transition. Used by pull-up to require chin above hands.
- **Tests: 284 → 289 passing**, 0 failing. The testing agent added 48 parallel-implementation tests in `tests.js` covering batches 1-4; this session added 5 more for the bandpullapart framework path (`invertedPolarity` + non-angle tracking — previously uncovered).
- **Test harness extensions** (in `tests.js`): `buildTestRepAnalyzerEx` now supports `invertedPolarity` and `downGate`; `buildTestTimedAnalyzer` mirrors the production timed path; helpers for hip-angle, knee-angle, legraise, pullup, and bandpull landmarks.
- **File shrank** ~6KB (from 154K → 148K chars) after cleanup of the old hand-coded registry entries and the stale "DORMANT" framework header.
- **Two dead-code findings filed to Backlog §2** during push-up migration: `goDeeper` (unreachable after phase semantics change) and `hipsTooHigh` (clamped by `angle()`). Both were also dead in the old code — not regressions.
- **One feature dropped: Backlog §3** — the dip per-frame camera-orientation nudge (`angleHint.textContent = 'Face the camera for best tracking'`) was dropped to avoid adding a per-frame-side-effect hook. Can be restored via a small framework extension or inlined as a side effect in dip's trackingJoint.
- **Next session:** Scott phone-tests all 22 migrated exercises (Step 2), OR Claude updates visual polish spec from 13 → 22 exercises (Step 4, autonomous).

### 2026-04-09 — Framework spec, research docs, roadmap sequencing

- Research docs persisted to `docs/`: UX research (`ux-research.md`), system audit (`system-audit.md`), exercise framework spec (`specs/exercise-framework-spec.md`)
- `dispatch-protocol` skill created and installed (pre/post-flight checklist for agent dispatch)
- Roadmap updated with full sequenced plan: open questions → phone testing → framework refactor → visual polish spec update → visual polish sprint
- Open questions from framework spec surfaced in roadmap for Scott's review (Step 1 above)
- Stale worktrees pruned: loving-gauss, nifty-feistel, nostalgic-fermat, wonderful-mcclintock

### 2026-04-09 — Mobility/PT Batch (exercises 16-22)

- **Shoulder Dislocates** (`shoulderdislocate`): timed; form checks elbow angle (<150° → "Keep arms straight — widen your grip"); drawStyle: `standing`
- **Hip Flexor Stretch** (`hipflexor`): timed; form checks torso upright (hip-shoulder gap < 0.10 → "Sit tall — lift your chest"); drawStyle: `kneeling` (new silhouette)
- **Wrist Warm-up** (`wristwarmup`): timed; form checks arms at shoulder height; drawStyle: `standing`
- **Band Pull-Aparts** (`bandpullapart`): rep-based; counts when wrist span goes from spread (>0.32) back to center (<0.18); form checks arm height; drawStyle: `standing`
- **Foam Roller** (`foamroller`): timed, isFloor (auto-start); no active form cue — coaching cue is just the timer; drawStyle: `horizontal`
- **Cat-Cow** (`catcow`): timed, isFloor (auto-start); form checks hip level (span > 0.12 → "Keep hips level"); drawStyle: `quadruped` (new silhouette)
- **Bird-Dog** (`birddog`): timed, isFloor (auto-start); form checks hip rotation during extension; drawStyle: `quadruped` with `birddog` variant (shows extended arm + leg)
- Two new silhouette functions: `drawKneelingStretch()` and `drawQuadruped()` (with bird-dog variant)
- 31 new tests; 207 total, 0 failing
- `docs/exercise-testing-protocol.md` updated: all 22 exercises in the testing table + form cues for each new exercise
- Next session: phone test all 22 exercises

### 2026-04-09 — Arch Hang + Scapular Pulls (exercises 14-15)

- **Arch Hang** (`archhang`): timed hanging exercise; form cue checks shoulder-wrist gap (<0.08 → "Pack shoulders down — away from the bar")
- **Scapular Pulls** (`scapularpull`): timed hanging exercise; form cue checks elbow angle (<150° → "Keep arms straight — no elbow bend")
- `buildSetSummary` refactored: checks `exerciseRegistry[exercise]?.isTimed` instead of hardcoded exercise names — scales automatically as more timed exercises are added
- Both exercises registered in `defaultCalibration` (`{}`), `EXERCISE_COLORS` (sky blue / rose), and hidden `<select>`
- 11 new tests; 176 total, 0 failing
- Next session: start by running phone test protocol for all 15 exercises

### 2026-04-07 — Thermal fix, welcome screen, exercise picker, testing protocol

- Lowered MediaPipe `modelComplexity` 1→0 (~50% less GPU); rest period throttles to 4fps via `isResting` flag; `checkPositioning()` cached per frame
- Welcome screen: "Calibrate & Start", "Load Calibration", "Jump to Workout" replace bare Enable Camera button
- Exercise dropdown replaced with visual picker modal (2-column card grid, name + mini silhouette per card)
- `docs/exercise-testing-protocol.md` — new repeatable 9-step per-exercise phone testing checklist
- 165 tests passing throughout
- Next: Arch hangs/scapular pulls, or phone test all 13 exercises

### 2026-04-04 — Batch 2 exercises (Inverted Rows, L-Sit, Pistol Squat, Glute Bridge)

- Added Inverted Rows (body-sag check), L-Sit (timed, hip angle), Pistol Squat (single-leg, derives from squat -10°), Glute Bridge (floor, hip angle, auto-start from lying on back)
- All 13 exercises in registry; 165 tests passing

### 2026-04-04 — Phase 5 engine refactor + Batch 1 (Pike, Dips, Dead Hang, Leg Raises)

- Data-driven `exerciseRegistry` merges metadata + analyzers; type flags replace hardcoded exercise-name checks
- Added pike push-ups, dips, dead hang, leg raises
- Calibration: squat ROM → squat + lunge; pushup ROM → pushup + pike + pullup (6 reps covers all)
- Consecutive-frame direction filter (3 frames) prevents jitter-triggered false reps

> Earlier sessions archived in `docs/roadmap-archive.md`
