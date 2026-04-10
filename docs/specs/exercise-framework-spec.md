# Exercise Framework Spec

*Version 1.0 — Drafted 2026-04-09*  
*Status: APPROVED — 2026-04-10*

---

## Problem Statement

Adding a new exercise to FormChecker currently requires 5 separate edits in 5 different locations inside `index.html`. Any missed location produces a silent failure: blank picker card, wrong silhouette, or miscalibrated thresholds. The 22 existing exercises each manually re-implement the same rep-counting state machine (~40–60 lines of boilerplate per exercise). A bug in the shared pattern requires 22 fixes.

**Goal:** Turn "add an exercise" from a 5-location hand-edit into a single config object that auto-wires everything.

---

## Analogy

Think of the current system like building a house by hand-cutting every board to custom dimensions. The framework is like switching to pre-cut dimensional lumber — you still assemble the house, but every piece fits a standard slot and you stop re-inventing the same cuts.

---

## 1. Exercise Config Schema

A single JavaScript object defines everything about one exercise. The framework reads this object and auto-wires the registry, calibration, picker, silhouette, and test scaffold.

### New format (framework)

```javascript
const pushupConfig = {
  // ── Identity ──────────────────────────────────────────────────────────
  id: 'pushup',
  name: 'Push-Up',

  // ── Taxonomy (enables filter chips in picker) ──────────────────────────
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders', 'core'],
  equipment: 'body only',
  difficulty: 'beginner',         // beginner | intermediate | advanced
  movementPattern: 'push',        // push | pull | squat | hinge | core | carry

  // ── Behavior ──────────────────────────────────────────────────────────
  isFloor: true,          // auto-start on pose hold (floor exercises)
  isTimed: false,         // rep-based vs hold-for-time

  // ── Positioning ───────────────────────────────────────────────────────
  hint: 'Get into push-up position facing sideways',
  isInPosition(lm) {
    // Returns true when MediaPipe landmarks confirm starting pose
    const leftShoulder = lm[11], leftHip = lm[23], leftAnkle = lm[27];
    const verticalSpan = Math.abs(leftShoulder.y - leftAnkle.y);
    return verticalSpan < 0.25 && leftShoulder.visibility > 0.5;
  },
  outOfPositionMsg: 'Get into push-up position facing sideways',

  // ── Silhouette ────────────────────────────────────────────────────────
  silhouette: {
    drawStyle: 'horizontal',      // standing | horizontal | hanging | kneeling | quadruped
    drawVariant: 'pushup',        // sub-type passed to the draw function
    // Future: referenceImage: 'data:image/png;base64,...'  (visual-polish-sprint)
  },

  // ── Analysis ──────────────────────────────────────────────────────────
  analysis: {
    // Which joint angle to track for rep counting
    trackingJoint: {
      a: 11,  // landmark indices: shoulder
      b: 13,  // elbow
      c: 15,  // wrist
    },

    // Calibration defaults (overridden by smart calibration)
    calibrationDefaults: {
      topAngle: 160,    // arms nearly straight at top
      bottomAngle: 90,  // 90° elbow at bottom
    },

    // Rep phase thresholds (degrees)
    phaseThresholds: {
      downTrigger: 0.85,    // fraction of range = "entered bottom phase"
      upTrigger: 0.85,      // fraction of range = "entered top phase"
      jitterFilter: 3,      // degrees — ignore direction flips smaller than this
      consecutiveFrames: 3, // frames of consistent direction before phase flip
    },

    // Form checks — each runs every frame, score deducted if failing
    formChecks: [
      {
        id: 'hipSag',
        check(lm, angle, phase) {
          const hipAngle = getAngle(lm[11], lm[23], lm[27]);
          return hipAngle < 145;  // hips dropping below straight line
        },
        scoreDeduction: 20,
        cue: { message: 'Keep your hips up', cooldown: 4000 },
      },
      {
        id: 'elbowFlare',
        check(lm, angle, phase) {
          // Returns true when elbows flaring out past 75°
          return getElbowFlareAngle(lm) > 75;
        },
        scoreDeduction: 15,
        cue: { message: 'Tuck your elbows', cooldown: 5000 },
      },
    ],
  },
};
```

### Old format (current registry)

```javascript
// index.html — one of 22 entries, ~80 lines each
'pushup': {
  name: 'Push-Up',
  hint: 'Get into push-up position facing sideways',
  guide: [],        // dead weight
  guideLines: [],   // dead weight
  isFloor: true,
  isTimed: false,
  drawStyle: 'horizontal',
  drawVariant: 'pushup',
  isInPosition(lm) { /* ... */ },
  outOfPositionMsg: 'Get into push-up position facing sideways',
  analyze(lm) {
    // ~60 lines: manual direction tracking, phase state machine,
    // voice cue gating, score calculation — all reimplemented from scratch
    const angle = getAngle(lm[11], lm[13], lm[15]);
    const goingDown = angle < state.prevAngle - 1;
    const goingUp = angle > state.prevAngle + 1;
    // ... 50 more lines ...
    state.prevAngle = angle;
    return { repCounted, score };
  },
},
```

**The difference:** Old format buries behavior inside a 60-line function. New format declares WHAT to check (joint indices, thresholds, form conditions); the framework handles HOW (state machine, jitter filtering, cooldowns, scoring).

---

## 2. Registration System

```javascript
// Called once per exercise, at startup
addExercise(pushupConfig);

// What addExercise() does internally:
function addExercise(config) {
  // 1. Validate config (required fields, type checks)
  validateExerciseConfig(config);

  // 2. Register in exerciseRegistry
  exerciseRegistry[config.id] = buildRegistryEntry(config);

  // 3. Set calibration defaults
  calibrationDefaults[config.id] = config.analysis.calibrationDefaults;

  // 4. Add to picker UI
  addPickerCard(config);

  // 5. Wire silhouette
  registerSilhouette(config.id, config.silhouette);

  // 6. (Dev mode only) Generate test scaffold stub
  if (DEV_MODE) generateTestScaffold(config);
}
```

All 22 exercises get registered in a single block at startup:

```javascript
[pushupConfig, squatConfig, pullupConfig, /* ... */].forEach(addExercise);
```

---

## 3. Shared Analysis Patterns

### The problem with the current approach

Every `analyze()` function manually re-implements the same rep-counting state machine. It looks like this across all 22 exercises:

```
track angle → detect direction → filter jitter → flip phase → count rep → deduct score → gate voice cues → return
```

If the jitter filter needs tuning (it has — see Lesson 15), every exercise needs the same fix.

### The framework approach: composable analysis

The framework provides `buildRepAnalyzer(config)`, which returns a ready-to-use `analyze(lm)` function:

```javascript
function buildRepAnalyzer(config) {
  // Internal state scoped to this exercise (no global contamination)
  let prevAngle = null;
  let phase = 'top';
  let consecutiveDown = 0;
  let consecutiveUp = 0;
  const voiceCooldowns = {};

  return function analyze(lm) {
    const { trackingJoint, phaseThresholds, formChecks, calibrationDefaults } = config.analysis;
    const cal = getCalibration(config.id) ?? calibrationDefaults;

    // 1. Get current angle
    const angle = getAngle(lm[trackingJoint.a], lm[trackingJoint.b], lm[trackingJoint.c]);

    // 2. Direction with consecutive-frame filter (Lesson 15)
    const goingDown = angle < (prevAngle ?? angle) - phaseThresholds.jitterFilter;
    const goingUp   = angle > (prevAngle ?? angle) + phaseThresholds.jitterFilter;
    if (goingDown) consecutiveDown++; else consecutiveDown = 0;
    if (goingUp)   consecutiveUp++;   else consecutiveUp = 0;

    // 3. Phase transitions (only after N consecutive frames)
    let repCounted = false;
    const range = cal.topAngle - cal.bottomAngle;
    const bottomThreshold = cal.topAngle - range * phaseThresholds.downTrigger;
    const topThreshold    = cal.bottomAngle + range * phaseThresholds.upTrigger;

    if (phase === 'top' && consecutiveDown >= phaseThresholds.consecutiveFrames && angle < bottomThreshold) {
      phase = 'bottom';
    } else if (phase === 'bottom' && consecutiveUp >= phaseThresholds.consecutiveFrames && angle > topThreshold) {
      phase = 'top';
      repCounted = true;
    }

    // 4. Form checks + scoring
    let score = 100;
    for (const check of formChecks) {
      if (check.check(lm, angle, phase)) {
        score -= check.scoreDeduction;
        fireVoiceCue(check.cue, voiceCooldowns);
      }
    }

    prevAngle = angle;
    return { repCounted, score: Math.max(0, score) };
  };
}
```

**Key improvements over current approach:**
- State is scoped per-exercise (no global `state.prevAngle` contamination)
- Jitter filter and consecutive-frame requirement are config-driven (tune once, applies everywhere)
- Form checks are data, not code — easier to read, test, and extend
- Score calculation is automatic — no manual `Math.max(0, score)` in every function

### Timed exercises

`buildTimedAnalyzer(config)` handles hold-for-time exercises (plank, dead hang) with the same pattern — position gate → timer → form checks → score.

---

## 4. Quality Gate Checklist

### Automated (runs in `addExercise()`)

```javascript
function validateExerciseConfig(config) {
  const required = ['id', 'name', 'primaryMuscles', 'equipment', 'difficulty',
                    'movementPattern', 'isFloor', 'isTimed', 'hint',
                    'isInPosition', 'outOfPositionMsg', 'silhouette', 'analysis'];
  for (const field of required) {
    if (config[field] === undefined) throw new Error(`Exercise "${config.id}" missing field: ${field}`);
  }

  // Calibration field validation — catch field name mismatches early
  const defaultKeys = Object.keys(config.analysis.calibrationDefaults);
  for (const check of config.analysis.formChecks ?? []) {
    // (future: validate check.check references valid fields)
  }

  // Silhouette validation — drawStyle must be a known value
  const validStyles = ['standing', 'horizontal', 'hanging', 'kneeling', 'quadruped'];
  if (!validStyles.includes(config.silhouette.drawStyle)) {
    throw new Error(`Exercise "${config.id}" has unknown drawStyle: ${config.silhouette.drawStyle}`);
  }
}
```

### Manual checklist (Scott's phone test)

After adding a new exercise:

- [ ] Picker card shows correct silhouette (not blank, not wrong style)
- [ ] `isInPosition` gates correctly — doesn't fire while standing upright
- [ ] Rep counts on clean reps at 6+ feet from camera
- [ ] No false reps from jitter while holding still
- [ ] Form cues fire at correct moments (not too early, not too late)
- [ ] Score returns 100 on clean form
- [ ] Score deducts on deliberate bad form
- [ ] Timed exercises: timer starts/stops correctly
- [ ] Voice cue cooldowns respected (cue doesn't repeat every second)
- [ ] Filter chips in picker show correct muscle groups and equipment

---

## 5. UI State Design

### Exercise Picker Modal

| State | What the user sees |
|-------|--------------------|
| Loading (< 1s) | Nothing — no indicator needed |
| Loading (1–3s) | Skeleton cards (grey placeholder shapes) |
| Default (exercises loaded) | Grid of cards with filter chips above |
| Filtered — results found | Filtered grid, active chip highlighted |
| Filtered — no results | Empty state: "No exercises match. Try removing a filter." + clear button |
| First-time user | Same as default + brief tooltip: "Tap an exercise to start" |

### Exercise Card (picker)

```
┌─────────────────┐
│  [silhouette]   │  ← 70×62px canvas or PNG
│                 │
│  Push-Up        │  ← exercise name
│  ● chest  ● tri │  ← primary muscle tags
│  ▲ Beginner     │  ← difficulty indicator
└─────────────────┘
```

### Filter Chips (above picker grid)

```
[All]  [Push]  [Pull]  [Squat]  [Core]   ← movement pattern
[Body only]  [Pull-up bar]  [Rings]       ← equipment
[Beginner]  [Intermediate]  [Advanced]    ← difficulty
```

Chips are single-select within each row, multi-row (AND logic between rows).

### Active Tracking States

| State | UI |
|-------|----|
| Positioning | Silhouette overlay + hint text |
| Holding for auto-start | Progress ring filling (3-second hold) |
| Active — rep-based | Rep counter, score, form cue overlay |
| Active — timed | Timer countdown, score |
| Rest between sets | Rest timer, last set summary |
| Exercise complete | Summary card + "Log workout" prompt |

### Error States

| Error | Message | Action |
|-------|---------|--------|
| Camera permission denied | "Camera access needed — tap to open settings" | Opens device settings (if possible) |
| Camera not found | "No camera detected on this device" | None |
| MediaPipe load failure | "Pose detection failed to load. Check your connection." | Retry button |
| Exercise config invalid | Dev-only: console error with field name | — |

---

## 6. Exercise Picker Redesign

### Current picker
- Flat grid, no search, no filtering
- Click to select, no preview
- 70×62px canvas stick figures only

### Redesigned picker

```
┌─────────────────────────────────────────────────────┐
│  🔍 Search exercises...                             │
├─────────────────────────────────────────────────────┤
│  [All] [Push] [Pull] [Squat] [Hinge] [Core]         │
│  [Body only] [Pull-up bar] [Parallettes]            │
├─────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ img  │ │ img  │ │ img  │ │ img  │              │
│  │      │ │      │ │      │ │      │              │
│  │Push-Up│ │Squat │ │Pull-Up│ │Plank │              │
│  │chest │ │legs  │ │back  │ │core  │              │
│  │▲ Beg │ │▲ Beg │ │● Int │ │▲ Beg │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
└─────────────────────────────────────────────────────┘
```

**Search:** Filters by name match (client-side, instant).  
**Filter chips:** AND logic — "Push + Body only" shows only body-weight push exercises.  
**Card tap:** Selects exercise and closes modal (same as current behavior).

---

## 7. Migration Path

### Principle
Convert one exercise at a time. Tests must pass after each conversion. The old registry and new framework coexist during migration — `addExercise()` writes into the same `exerciseRegistry` object the rest of the app already reads.

### Steps

**Step 0: Build the framework** (no behavior changes yet)
- Write `buildRepAnalyzer()`, `buildTimedAnalyzer()`, `addExercise()`, `validateExerciseConfig()`
- Write `addPickerCard()` (generates the same 70×62px card the current system does)
- Run `node tests.js` — all existing tests must still pass (framework is dormant, not wired yet)

**Step 1: Convert one exercise (push-up first)**
- Write `pushupConfig` in the new schema
- Call `addExercise(pushupConfig)` and remove the old `exerciseRegistry['pushup']` entry
- Run `node tests.js` — push-up tests must still pass
- Phone test: picker card, positioning, rep counting, form cues

**Step 2: Convert remaining exercises in batches of 3–4**
- Convert exercises with the same `drawStyle` together (they share silhouette code)
- Run tests after each batch
- Flag any exercise where behavior changes (threshold tuning needed)

**Step 3: Clean up**
- Remove `guide` / `guideLines` dead fields
- Remove `drawMiniSilhouette()` (replaced by `addPickerCard()`)
- Remove old HTML select dropdown (replaced by picker modal if not already)
- Run `node tests.js` — full pass

**Step 4: Add picker redesign**
- Add search bar + filter chip UI on top of the now-standardized card system
- Filter logic is purely client-side (no new dependencies)
- Test: filter to zero results, filter + search combined, clear filters

### Migration tracking

| Exercise | Converted | Tests pass | Phone tested |
|----------|-----------|------------|--------------|
| push-up | ☐ | ☐ | ☐ |
| squat | ☐ | ☐ | ☐ |
| pull-up | ☐ | ☐ | ☐ |
| plank | ☐ | ☐ | ☐ |
| lunge | ☐ | ☐ | ☐ |
| *...all 22...* | | | |

---

## 8. Visual Polish Integration

The visual-polish-sprint.md spec plans to replace canvas silhouettes with base64-embedded PNGs and add how-to keyframe animations. The framework accommodates this without forcing it.

### Silhouette config evolution

```javascript
// Phase 1: canvas only (current, migrated)
silhouette: {
  drawStyle: 'horizontal',
  drawVariant: 'pushup',
}

// Phase 2: PNG added (visual polish sprint)
silhouette: {
  drawStyle: 'horizontal',
  drawVariant: 'pushup',
  referenceImage: 'data:image/png;base64,...',  // base64-embedded
  referenceImageAlt: 'Side view of push-up starting position',
}

// Phase 3: how-to animation keyframes
silhouette: {
  drawStyle: 'horizontal',
  drawVariant: 'pushup',
  referenceImage: 'data:image/png;base64,...',
  keyframes: [
    { label: 'Top', image: 'data:image/png;base64,...' },
    { label: 'Mid', image: 'data:image/png;base64,...' },
    { label: 'Bottom', image: 'data:image/png;base64,...' },
  ],
}
```

`addPickerCard()` renders whichever silhouette source is available: keyframes → PNG → canvas fallback. The exercise config doesn't need to know which renderer is active.

---

## 9. Future-Proofing

### Phase 6: User-created exercises

The config schema is JSON-serializable (with the exception of `isInPosition` and form check functions). For user-created exercises:

```javascript
// User-created exercise stored in localStorage
const userExercise = {
  id: 'my-exercise',
  name: 'My Exercise',
  primaryMuscles: ['chest'],
  // ... standard fields ...
  isInPosition: null,     // user exercises skip position gate
  analysis: {
    trackingJoint: { a: 11, b: 13, c: 15 },  // user picks from a UI
    calibrationDefaults: { topAngle: 160, bottomAngle: 90 },
    formChecks: [],        // no custom form checks for user exercises (v1)
  },
};

addExercise(userExercise);
localStorage.setItem('userExercises', JSON.stringify([userExercise]));
```

User exercises are distinguished from built-in exercises by `isBuiltIn: false`. The picker shows them in a separate "My Exercises" section.

### Exercise database growth (API-backed)

If the library grows beyond ~50 exercises, an API-backed database becomes worthwhile. The framework supports this via a future `loadExercisesFromAPI()` that fetches configs and calls `addExercise()` on each:

```javascript
async function loadExercisesFromAPI(url) {
  const configs = await fetch(url).then(r => r.json());
  configs.forEach(addExercise);
}
```

The rest of the app is unchanged — it only sees the populated `exerciseRegistry`, not where the data came from.

### Standard schema compatibility

The config schema is a superset of the ExerciseDB/free-exercise-db standard schema. Adding `primaryMuscles`, `equipment`, `difficulty`, `movementPattern` now means a future import from an open-source exercise database is a thin adapter layer, not a rewrite.

---

## Decisions (resolved 2026-04-10)

1. **Scoped state:** Use **closure**. Named object was considered for DevTools inspectability, but testing happens on Safari during live exercise — DevTools are not accessible during phone testing. Closure is cleaner with no practical downside.

2. **Test scaffold generation:** Auto-generate a **schema validation test only**: required fields present, `drawStyle` is a known value, landmark indices in 0–32 range, `topAngle > bottomAngle`. Visual correctness (illustration, animation, joint biomechanics) remains on the manual phone test checklist.

3. **Picker redesign timing:** **Follow-on sprint.** Steps 1–3 (framework migration) ship first. Picker redesign (search + filter chips) is a separate sprint after migration is stable.

4. **visual-polish-sprint.md update timing:** **After migration.** The framework config already reserves the `referenceImage` slot. Update the spec to cover all 22 exercises before the visual polish sprint begins.

5. **Calibration key names — mapping, not rename (2026-04-10, Step 0):** The framework does **not** rename the existing per-exercise calibration keys (`elbow_down`, `knee_down`, `hip_down`, `wrist_center`, etc.) to generic `topAngle`/`bottomAngle`. Instead, each config declares `analysis.calibrationKeys: { bottom: 'elbow_down', top: 'elbow_up' }` as a mapping into the unchanged global `calibration` object.

   **Reasons:**
   - A rename would touch `defaultCalibration` (22 entries), `applyAllCalibrationResults`, `analyzeWarmup`, `finishWarmupCalibration`, persistence JSON format, and any saved `formcheck-calibration.json` files — out of scope for this sprint.
   - **Glute bridge** has *inverted* polarity (`hip_down: 150` = hips raised, `hip_up: 110` = hips on floor). Forcing a generic `topAngle`/`bottomAngle` would mislabel it. The framework handles this via `invertedPolarity: true`.
   - **Band pull-apart** tracks `wrist_center`/`wrist_spread` — a horizontal distance, not an angle. The generic names would be factually wrong.

   **Deferred:** Revisit if warmup calibration ever gets refactored. A future sprint could do the rename globally — the `calibrationKeys` mapping can be collapsed away at that point without framework changes.

6. **Direction detection — phase-local extremum (2026-04-10, Step 0):** Instead of the spec's `jitterFilter` + `consecutiveFrames` pattern (which fails on deliberately slow reps — e.g. 5s down / 5s up → 10°/sec → frame-to-frame delta never clears a 3° jitter threshold), the framework tracks the local peak (in `'up'` phase) or valley (in `'down'` phase) and flags direction reversal when the angle moves 3° past the extremum. Handles any tempo, including pausing at the bottom of a rep. Implemented in `buildRepAnalyzer` as `phaseExtremum`.

7. **Rep transitions use direct threshold compare:** The spec's fractional-range formulas (`downTrigger: 0.85`, etc.) produce different numbers than the current `angle < elbow_down` / `angle > elbow_up` compare, which would change rep counts. Framework uses direct compare against `cal[calibrationKeys.bottom]` / `cal[calibrationKeys.top]` to preserve current behavior exactly.

---

## Out of Scope

- New exercises (Phase 5 adds happen after framework is stable)
- Backend / API integration (Phase 6 concern)
- MediaPipe model changes (not affected by this refactor)
- Workout logging (separate system)
