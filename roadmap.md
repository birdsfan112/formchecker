## Status
| Field | Value |
|-------|-------|
| Phase | Phase 5 — Exercise Library Expansion |
| Updated | 2026-04-09 |
| Summary | 22 exercises, 207 tests. Framework spec complete. Next: Scott reviews open questions + phone tests while framework refactor begins. |
| Autonomous | Exercise framework refactor (after open questions resolved) |
| Needs Scott | (1) Review framework spec open questions (listed below); (2) Phone test all 22 exercises (exercise-testing-protocol.md) |
| Blockers | Open questions from framework spec block the refactor |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Phase 5 — Remaining Work (in order)

### Step 1 — Scott: Review framework spec open questions
*Can run in parallel with or before phone testing. Decisions needed before refactor begins.*

From `docs/specs/exercise-framework-spec.md` § Open Questions:

1. **Scoped state:** `buildRepAnalyzer()` uses closure for `prevAngle`, `phase`, etc. Closure is cleaner; named object on config is easier to inspect in DevTools. Which do you prefer?
2. **Test scaffold generation:** DEV_MODE generates a test stub per exercise. What's the minimum useful scaffold — a blank describe block, or a pre-filled set of rep-count assertions?
3. **Picker redesign timing:** Is Step 4 (search + filter chips) in scope for the same sprint as the migration, or a follow-on sprint?
4. **visual-polish-sprint.md update timing:** The spec covers 13 exercises; needs 9 more added before PNG work begins. Update before or after framework migration?

### Step 2 — Scott: Phone test all 22 exercises
*Use `docs/exercise-testing-protocol.md` — 9-step checklist per exercise.*

- [x] Arch hangs / scapular pulls (timed hanging exercises, 14-15 in registry)
- [x] Mobility/PT batch — shoulder dislocates, hip flexor stretch, wrist warm-up, band pull-aparts, foam roller, cat-cow, bird-dog (exercises 16-22)
- [ ] Phone test all 22 exercises — use `docs/exercise-testing-protocol.md`

### Step 3 — Exercise framework refactor
*Per `docs/specs/exercise-framework-spec.md`. Single config object per exercise, shared analysis patterns, auto-wiring registration, quality gates. Migration is one exercise at a time with tests after each.*

### Step 4 — Update visual polish spec (13 → 22 exercises)
*Add the 9 exercises missing from `docs/specs/visual-polish-sprint.md` before PNG work begins.*

### Step 5 — Visual polish sprint
*PNG silhouettes + CSS-animated how-to keyframes. Framework provides clean structure for this.*

## Backlog

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)

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
