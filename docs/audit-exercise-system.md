# FormChecker Exercise System — Technical Audit

*Audited 2026-04-09. Reflects current state of index.html before Exercise Framework refactor.*

---

## Exercise Registry

**Location:** `index.html` ~415–1268  
**Format:** Single `exerciseRegistry` JS object  
**Count:** 22 exercises

### Fields per exercise entry

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name |
| `hint` | string | Short instruction shown during positioning |
| `guide` | array | **LEGACY — always empty on Phase 5+ exercises** |
| `guideLines` | array | **LEGACY — always empty on Phase 5+ exercises** |
| `isFloor` | boolean | Triggers auto-start (position hold) instead of palm gesture |
| `isTimed` | boolean | Plank, dead hang, arch hang, l-sit |
| `drawStyle` | enum | `standing \| horizontal \| hanging \| kneeling \| quadruped` |
| `drawVariant` | string | Sub-type within a drawStyle |
| `isInPosition(lm)` | function | Returns boolean — is pose valid to start? |
| `outOfPositionMsg` | string | Shown when `isInPosition` fails |
| `analyze(lm)` | function | Returns `{ repCounted, score: 0–100 }` |

### Current exercise list (22 total)

**Standing (7):** squat, lunge, pistol squat, dip, shoulder dislocates, wrist warmup, l-sit  
**Horizontal (5):** push-up, plank, pike push-up, glute bridge, inverted row  
**Hanging (4):** pull-up, dead hang, leg raise, arch hang, scapular pull  
**Kneeling (1):** hip flexor stretch  
**Quadruped (2):** cat-cow, bird-dog

*(Count discrepancy: 19 listed here vs 22 in registry — verify in index.html)*

---

## Silhouette System

**Location:** `index.html` ~2083–2632  
**Format:** 100% canvas-drawn bezier curves, zero external assets

### Main silhouette functions

| drawStyle | Function | Used by |
|-----------|----------|---------|
| `standing` | `drawStandingSide()` | squats, lunges, dips, pistol, shoulder dislocates, wrist warm-up, l-sit |
| `horizontal` | `drawHorizontalSide()` | push-ups, plank, pike, glute bridge, inverted rows |
| `hanging` | `drawHangingFront()` | pull-ups, dead hang, leg raises, arch hang, scapular pulls |
| `kneeling` | `drawKneelingStretch()` | hip flexor stretch |
| `quadruped` | `drawQuadruped()` | cat-cow, bird-dog |

### Mini silhouette system (exercise picker)

**Function:** `drawMiniSilhouette()`  
**Size:** 70×62px stick figures  
**Problem:** Entirely separate code path from the main silhouette system. Adding an exercise requires updating BOTH. They can drift out of sync silently.

---

## Exercise Picker UI

**Location:** `index.html` ~3489–3624  
**Format:** Modal with grid of cards  
**Each card:** 70×62px canvas mini silhouette + name label  
**Interaction:** Click selects exercise and closes modal  
**No search, no filtering, no muscle group tags**

---

## Test Pattern (tests.js)

Per exercise, tests cover:
- Phase transition: going down (angle decreasing)
- Phase transition: going up (angle increasing)
- Score deductions for specific bad-form conditions
- Good form path (score returns 100)
- Jitter resistance (small angle fluctuations don't trigger false reps)

Tests use mock 33-landmark arrays (no browser/MediaPipe required).

---

## Pain Points — Adding One Exercise Requires 5 Edits

| # | What | Where |
|---|------|-------|
| 1 | Exercise registry entry | `index.html` — ~80 lines per exercise |
| 2 | Calibration defaults | `index.html` — threshold object, field names must exactly match |
| 3 | HTML select dropdown | `index.html` — one `<option>` tag |
| 4 | Main silhouette | `index.html` — new `drawVariant` clause or new function |
| 5 | Mini silhouette (picker) | `index.html` — separate clause in `drawMiniSilhouette()` |

If you miss any of these, you get: a broken picker card (blank canvas), a missing silhouette during tracking, or calibration that silently reads `undefined`.

---

## Tight Couplings (the expensive ones)

### Calibration ↔ analyze()
Calibration stores threshold values under named fields (e.g., `cal.bottomAngle`). `analyze()` reads those same field names directly. A typo in either place fails silently — no error, just wrong behavior. There is no validation step.

### Global state contamination
`state.prevAngle` and `state.phase` are unscoped globals. All exercises share the same slot. Switching exercises mid-rep can corrupt state. Not a current problem (exercises only run one at a time), but fragile.

### drawStyle must be consistent in 3 places
`drawStyle` set in the registry must match the logic in:
- `isInPosition()` (which landmarks to check for starting pose)
- `drawStandingSide()` / `drawHorizontalSide()` etc. (main silhouette)
- `drawMiniSilhouette()` (picker card)

A mismatch (e.g., `drawStyle: 'standing'` but the exercise looks horizontal) produces a wrong silhouette with no warning.

### Every analyze() reimplements the same state machine
Each exercise manually re-implements:
- Direction tracking (`goingDown`, `prevAngle`)
- Phase state machine (`'up'` / `'down'` / `'top'` / `'bottom'`)
- Voice cue gating (cooldown checks)
- Score calculation (deduct points per bad-form condition)

This is ~40–60 lines of identical boilerplate in each of the 22 entries. A bug in the pattern (e.g., jitter threshold too low) requires 22 fixes.

### Dead weight fields
`guide` and `guideLines` were part of an earlier coaching system. Phase 5+ exercises leave them empty. They add noise to every registry entry and confuse anyone reading the code for the first time.

---

## Related Spec

`docs/specs/visual-polish-sprint.md` — Planned but not implemented: replace canvas silhouettes with photorealistic PNGs (base64-embedded), add how-to keyframe animations (2–4 skeleton poses per exercise during idle). Currently covers only 13 exercises; needs updating to 22 before implementation.

---

## Summary: What the Framework Needs to Fix

1. **Single definition point** — one config object per exercise, no 5-location scatter
2. **Shared state machine** — extracted rep-counting logic, not copied 22 times
3. **Unified silhouette path** — main and mini silhouettes derived from the same config
4. **Calibration validation** — catch field name mismatches at registration time, not at runtime
5. **Filter-ready metadata** — muscle group, equipment, difficulty, movement pattern
6. **Dead field cleanup** — remove `guide` / `guideLines` from the schema
