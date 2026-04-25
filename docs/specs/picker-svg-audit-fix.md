# Picker SVG Audit — 5 Wrong Exercises

**Status:** SUPERSEDED (2026-04-24) by `picker-png-rebuild.md`. The hand-coded SVG approach was attempted for dips in calibration commit `a0215d7`; phone review showed the geometric-stick-figure style can't hit picker iconicity at 70×62. New approach: replace all 22 silhouettes with Gemini-generated solid-white PNGs. Do not work from this spec.

**Original status:** Spec (2026-04-20). Execution deferred to next session.

**Background:** `EXERCISE_SVGS` (in `index.html`) has 7 shared shapes covering all 22 exercises via `drawStyle` + `drawVariant` (see `getSvgKey`). Five exercises fall through to the wrong shape and don't read as the exercise they represent. Scott's phone-review 2026-04-20 identified them.

Signature-derived picker was tried and reverted same-day (front-view crouched pose landmarks aren't iconic at 70x62px; iconicity > accuracy for pickers — see `feedback_data_consolidation_consumer_fit.md`). This spec takes the bespoke-SVG path instead.

## Current wrong mappings

| Exercise | Config `silhouette` | Falls through to | Why it's wrong |
|---|---|---|---|
| Dips | `drawStyle: 'standing'` | Standing figure | Exercise requires bars + bent arms; standing figure reads as "stand still" |
| Inverted Rows | `drawStyle: 'horizontal', drawVariant: 'plank'` | Plank silhouette | Horizontal-under-bar is different pose from plank (arms above, not below) |
| Glute Bridge | `drawStyle: 'horizontal', drawVariant: 'plank'` | Plank silhouette | Lies on back with hips up; plank is face-down |
| Hip Flexor Stretch | `drawStyle: 'kneeling'` | Kneeling base (shared with cat-cow) | Quadruped kneel reads as "cat-cow"; hip flexor is one-knee-down-one-foot-forward lunge |
| Foam Roller | `drawStyle: 'horizontal', drawVariant: 'foamroller'` | Plank silhouette (via `getSvgKey` fallthrough) | Foam roller is lying on cylinder, face up; plank is face-down hold |

## Approach

Bespoke SVG per exercise via `imagegen` skill. Mix of angles — pick the angle that reads most iconically at 70x62px for each exercise (side, 3/4, or front as appropriate). All 5 must match the existing minimalist single-color-silhouette aesthetic so the picker grid stays visually coherent.

## Per-exercise design intent

| Exercise | Recommended angle | Key shape cues |
|---|---|---|
| Dips | 3/4 or side | Two parallel bars visible; body suspended; arms bent at ~90° at bottom of rep |
| Inverted Rows | Side | Horizontal body at an angle; bar/rings above; arms pulling up (chest-to-bar position) |
| Glute Bridge | Side | Supine (on back), feet flat, hips arched up, knees bent |
| Hip Flexor Stretch | Side | Rear knee on floor, front foot forward, torso upright, hip of rear leg extended |
| Foam Roller | Side | Supine on cylinder (visible cylinder shape under back), knees bent, arms relaxed |

`imagegen` should treat these as constraints, not rigid rules — if 3/4 angle reads better for glute bridge in final rendering, allow the deviation.

## Implementation

### 1. Generate 5 SVGs via `imagegen` skill

Prompt template (per exercise):
> Minimalist single-color silhouette, exercise icon for [exercise name]. [Angle]. Simple geometric shapes only, no shading or gradients. Solid dark fill on transparent background. Readable at 70x62px. Match aesthetic of existing fitness-app picker icons.

Save as inline SVG strings. Target size: each SVG ≤ 1 KB after minification (matches existing 7).

### 2. Extend `EXERCISE_SVGS` (in `index.html`)

Add 5 new keys:
- `dip` → dip bespoke SVG
- `row` → inverted-row bespoke SVG
- `glutebridge` → glute-bridge bespoke SVG
- `hipflexor` → hip-flexor bespoke SVG
- `foamroller` → foam-roller bespoke SVG

Keep the 7 existing keys untouched.

### 3. Extend `getSvgKey(drawStyle, drawVariant)`

Add a first-pass exercise-specific check. Function signature stays the same, but add an optional third argument or route via `drawVariant`:

**Option A (preferred):** Use exercise-specific `drawVariant` values and route in `getSvgKey`:

```js
function getSvgKey(drawStyle, drawVariant) {
  // Bespoke per-exercise SVGs (2026-04-21 audit fix)
  if (drawVariant === 'dip') return 'dip';
  if (drawVariant === 'row') return 'row';
  if (drawVariant === 'glutebridge') return 'glutebridge';
  if (drawVariant === 'hipflexor') return 'hipflexor';
  if (drawVariant === 'foamroller') return 'foamroller';

  // Existing logic
  if (drawStyle === 'horizontal') {
    return drawVariant === 'pushup' ? 'horizontal-pushup' : 'horizontal-plank';
  }
  if (drawStyle === 'quadruped') {
    return drawVariant === 'birddog' ? 'quadruped-birddog' : 'quadruped';
  }
  return drawStyle || 'standing';
}
```

### 4. Update 5 exercise configs

Set `drawVariant` on each:
- `dipConfig.silhouette`: add `drawVariant: 'dip'` (keep `drawStyle: 'standing'` or change to `'standing'` — the `drawStyle` still drives the live outline rendering in `drawStanding()`; only the picker uses `drawVariant` via `getSvgKey`)
- `rowConfig.silhouette`: change `drawVariant: 'plank'` → `drawVariant: 'row'`
- `glutebridgeConfig.silhouette`: change `drawVariant: 'plank'` → `drawVariant: 'glutebridge'`
- `hipflexorConfig.silhouette`: add `drawVariant: 'hipflexor'`
- `foamrollerConfig.silhouette`: change `drawVariant: 'foamroller'` → keep as-is (it's already unique — the fallthrough in `getSvgKey` was the bug)

**Compatibility:** `drawVariant` is already a documented field in the silhouette schema. The live-outline code path uses `drawStyle` exclusively (see `drawGuideOutline` at ~line 3138, branches only on `drawStyle`). Changing `drawVariant` affects the picker only.

### 5. Verify live outline still works

Before shipping: confirm that the 5 exercises' live-outline rendering (when the user is in the workout) is unchanged. The picker's `drawVariant` change must not affect `drawStanding()`, `drawHorizontalSide()`, etc.

Spot-check via the existing Playwright suite + manual testing of each of the 5.

## Test plan

### Playwright

Add a smoke test: `tests/playwright/exercises/picker-svg-audit.spec.ts` with one test per fixed exercise:
- Asserts the rendered `<img>` `src` attribute contains the bespoke SVG string (match on a unique substring from the new SVG, e.g., a specific `<path d="...">` fragment).
- Asserts the picker card is visually distinct from the previous shape (fingerprint compare against a baseline from the plank/standing/kneeling SVGs).

4 new Playwright tests (foam roller + glute bridge share "supine" shape conceptually but are different SVGs — test both).

### Manual

Scott phone-reviews all 22 picker cards after shipping. Accept/reject criterion: each of the 5 fixed exercises is recognizable as the exercise it represents at the 70x62px picker size.

## Acceptance criteria

1. All 5 new SVGs render in the picker grid.
2. Each reads as its exercise at phone-screen picker size.
3. No regressions on the other 17 exercises' pickers.
4. Live-outline rendering unchanged for all 22 exercises.
5. Playwright tests pass.
6. Final SVG sizes ≤ 1 KB each; total added index.html bytes ≤ 6 KB.

## Out of scope

- Redesigning the other 17 picker SVGs (they're already acceptable).
- Animated pickers (explicitly reverted 2026-04-20).
- Changing the picker grid layout or card size.
- Changing `drawStyle` semantics or the live-outline code path.

## Open questions

None — all resolved during interview 2026-04-20. Approach: bespoke SVG per exercise. Style: mix of angles per-exercise. Scope: deferred to next session.

## References

- `docs/specs/visual-polish-sprint.md` — original picker design (13 → 22 migration)
- `docs/specs/exercise-signature-schema.md` §7 — signature-derived picker attempt + 2026-04-20 revert note
- Memory: `feedback_data_consolidation_consumer_fit.md` — why pose data wasn't fit for picker rendering target
- Session log 2026-04-20 — "Post-deploy phone review + signature-picker revert"
