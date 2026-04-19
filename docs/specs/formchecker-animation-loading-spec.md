# FormChecker — Animation Loading Playwright Spec

**Status:** Draft — approved for implementation once Scott signs off.
**Date:** 2026-04-18
**Related roadmap item:** Step 5.5 → "Add Playwright spec: `animation-loading.spec.ts`"
**Implementation agent:** a follow-on Implement agent (per dev-philosophy).
**Target phase:** Implement (not Investigate — paradigm + loader code already shipped).

---

## 1. Purpose

Lock in regressions for the Step 5.5 trajectory loader + how-to animation renderer (`loadTrajectory`, `drawHowToSkeletonFromTrajectory`). Two pipeline outputs (`assets/animations/squat.json`, `assets/animations/pullup.json`) already ship. This spec guards the app-side code path that consumes them so future pipeline fixes (new presets, JSON-schema tweaks, additional exercises) can't silently break rendering.

Four behaviours must be guarded:

1. **Trajectory JSON loads without error** for an exercise that has a shipped JSON (squat, pullup).
2. **Animation is present in the DOM** after load — `#guide-canvas` is visible, sized, and has non-empty pixels during idle.
3. **Animation progresses over time** — the canvas pixel state at `t = T1` differs from `t = T2 > T1` by more than a jitter threshold.
4. **Missing / malformed JSON does not crash the app** — loader falls back to the legacy `HOW_TO_KEYFRAMES` path; `#rep-counter`, `#exercise-select`, and the idle animation tick stay healthy.

---

## 2. File location

**Implementation file:** `tests/playwright/exercises/animation-loading.spec.ts`

> Flag to Scott: the roadmap lists this as `animation-loading.spec.ts` without a directory. Playwright's `testDir` is `./tests/playwright/exercises` (see [playwright.config.ts:23](../../playwright.config.ts#L23)). Dropping the file at the repo root `tests/` would leave it un-discovered. Keep it next to the other specs unless there's a reason to promote it.

Follows the same pattern as [pullup.spec.ts](../../tests/playwright/exercises/pullup.spec.ts) and [squat-rep-counter.spec.ts](../../tests/playwright/exercises/squat-rep-counter.spec.ts).

**Spec file (this doc):** `docs/specs/formchecker-animation-loading-spec.md`.

---

## 3. What the spec DOES NOT cover

- Correctness of the trajectory data itself (landmark coordinates, cycle detection, seam-closure) — that lives in `pipeline/tests/test_normalize_loop.py` (pytest).
- Visual fidelity of the rendered skeleton — Scott's phone review is the authority there; Playwright only proves "pixels were drawn".
- MediaPipe detection behaviour — MediaPipe is stubbed by `loadPage()` per the existing harness.
- Picker-card silhouette PNGs (Step 5.5 later item) — separate spec when that path lands.

---

## 4. Architecture recap (context for the test author)

**Trajectory loader** ([index.html:2935–2945](../../index.html#L2935)):

```js
const trajectoryCache = {};
function loadTrajectory(ex) {
  if (ex in trajectoryCache) return;
  trajectoryCache[ex] = null; // mark in-flight so we don't refetch
  fetch(`assets/animations/${ex}.json`)
    .then(r => (r.ok ? r.json() : null))
    .then(data => { trajectoryCache[ex] = data; })
    .catch(() => { trajectoryCache[ex] = null; });
}
```

**Draw switch** ([index.html:2947–2955](../../index.html#L2947)):

```js
function drawHowToSkeleton(w, h, ex) {
  if (!(ex in trajectoryCache)) loadTrajectory(ex);
  const traj = trajectoryCache[ex];
  if (traj) {
    drawHowToSkeletonFromTrajectory(w, h, traj);
  } else {
    drawHowToSkeletonFromKeyframes(w, h, ex); // legacy fallback
  }
}
```

**Animation tick** ([index.html:3098–3109](../../index.html#L3098)):
`idleGuideTick(ts)` calls `drawGuide()` every ~65 ms (≈15 fps) whenever the workout state is `idle`, `countdown`, or `warmup.positioning`. `drawGuide()` calls `drawHowToSkeleton(w, h, ex)` when `state.workoutState === 'idle'` ([index.html:3092–3095](../../index.html#L3092)).

**Canvas** ([index.html:220](../../index.html#L220) + [index.html:19](../../index.html#L19)):
`<canvas id="guide-canvas">`, full-overlay, `transform: scaleX(-1)`, `pointer-events: none`, `z-index: 4`.

**Key implication for testing:** the two states that matter are `workoutState === 'idle'` (trajectory anim runs) and `workoutState !== 'idle'` (anim does not draw). Cache key is `exercise id`. Tests do not need to touch `__poseInstance` / `injectPoseFrame` — animation renders from `Date.now()`, not pose landmarks.

---

## 5. DOM selectors & hooks to use

All observable via the existing `_helpers.ts` pattern. No new globals required.

| Hook | Purpose | Source |
|------|---------|--------|
| `#camera-permission` visible | Welcome screen shown, load callback has run | existing |
| `#btn-jump-workout` | Click to transition to idle | existing |
| `#camera-permission` hidden | App reached idle state | existing |
| `#guide-canvas` (element) | Target canvas for all pixel inspection | new usage |
| `#exercise-select` + `change` event | Switch active exercise → swaps which trajectory renders | existing (`switchExercise`) |
| `#exercise-name` text | Confirms exercise change propagated to HUD | existing |
| `#rep-counter` text | Proxy for "app didn't crash" | existing |
| `page.route('**/assets/animations/*.json', …)` | Intercept trajectory fetches to simulate 404 / malformed / known-good payloads | new pattern |
| `canvas.getContext('2d').getImageData(…)` via `page.evaluate` | Non-empty-pixel check + frame-diff check | new usage |

### 5.1 Recommended helper additions to `_helpers.ts`

Add (and export) three helpers so each test stays readable. These belong in `_helpers.ts` beside `makeLandmarks` / `injectPoseFrame`:

```ts
/**
 * Return a cheap fingerprint of the guide canvas pixels: a hex hash of a
 * 16x16 nearest-neighbour downsample of the full canvas, computed inside
 * the page so we don't ship the full ImageData over the CDP wire.
 */
export async function getGuideCanvasFingerprint(page: Page): Promise<string> { /* ... */ }

/** True iff any pixel on #guide-canvas has non-zero alpha. */
export async function guideCanvasHasPixels(page: Page): Promise<boolean> { /* ... */ }

/**
 * Route-intercept the trajectory fetch for a single exercise id. `mode` is one of:
 *   'missing'   — respond 404
 *   'malformed' — respond 200 with invalid JSON body "{not-json"
 *   'empty'     — respond 200 with `null`
 * Must be called BEFORE loadPage().
 */
export async function mockTrajectory(
  page: Page,
  exerciseId: string,
  mode: 'missing' | 'malformed' | 'empty',
): Promise<void> { /* ... */ }
```

Route glob: `**/assets/animations/${exerciseId}.json`. Place this route-install *after* `loadPage()`'s CDN route in the helper, or have `mockTrajectory` be callable both before and after `loadPage()` (before is simplest — Playwright routes are additive).

---

## 6. Test cases

All tests live in a single `test.describe('how-to animation loading — trajectory path')` block.

### Test 1 — `trajectory JSON is fetched when an exercise with a shipped animation is active`

**What it asserts:**
- After `jumpToWorkout()` + `switchExercise(page, 'squat')`, within 2 s the browser makes a GET to `assets/animations/squat.json`.
- The response is HTTP 200 and is parseable JSON.

**How to assert:**
- Attach `page.waitForResponse(r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200, { timeout: 2000 })` before the `switchExercise` call.
- Call `await response.json()` — must not throw, must have keys `exercise`, `period_ms`, `frame_count`, `landmarks`, `visibility`.

**Why squat, not pushup:** pushup is the default exercise at load but has no shipped trajectory JSON yet. Squat is one of the two exercises with a committed `assets/animations/*.json` (squat, pullup) and is reached by switching.

---

### Test 2 — `#guide-canvas has drawn pixels after trajectory load during idle`

**What it asserts:**
- After idle state and 200 ms of idle-tick time, `#guide-canvas` exists, is visible (canvas dimensions > 0), and has at least one non-transparent pixel.

**How to assert:**
- `await expect(page.locator('#guide-canvas')).toBeVisible()`.
- `await page.waitForResponse(/squat\.json$/)` — make sure the trajectory is loaded, not just the keyframe fallback. (If this test fails because the fallback drew pixels too, narrow by gating `guideCanvasHasPixels` on a post-load fingerprint check per Test 3.)
- `expect(await guideCanvasHasPixels(page)).toBe(true)`.

**Why not pixel count:** the number of pixels depends on canvas size and stroke width — brittle. Non-zero alpha is sufficient to prove "drawHowToSkeletonFromTrajectory ran without throwing".

---

### Test 3 — `how-to animation progresses over time (canvas fingerprint changes across frames)`

**What it asserts:**
- Two `guide-canvas` fingerprints sampled ~400 ms apart during idle differ from each other.

**How to assert:**
```ts
await page.waitForResponse(/squat\.json$/);
await page.waitForTimeout(100);           // let one idle tick draw
const f1 = await getGuideCanvasFingerprint(page);
await page.waitForTimeout(400);           // idle tick = 65 ms, so ~6 frames
const f2 = await getGuideCanvasFingerprint(page);
expect(f1).not.toBe(f2);
```

**Why 400 ms, not longer:** the trajectory period is 3000 ms, so 400 ms corresponds to ~13% of the animation cycle. Easily enough motion to change a 16×16 fingerprint but short enough that the test stays under the 30 s cap. The 65 ms tick in `idleGuideTick` means we get ~6 fresh frames in the gap.

**Jitter guard:** fingerprints use nearest-neighbour 16×16 downsample, so sub-pixel anti-aliasing differences don't dominate. If this turns out to be flaky on CI (shouldn't — the ease-in-out makes mid-cycle motion large), bump the downsample to 32×32 and require a Hamming distance ≥ 2 rather than exact inequality.

---

### Test 4 — `missing trajectory JSON does not crash the app (falls back to keyframes)`

**What it asserts:**
- With the squat trajectory route replying 404, the page still loads, still reaches idle, and `#guide-canvas` still has drawn pixels (from the keyframe fallback).
- `#rep-counter` reads `"0"` after idle — proves no uncaught exception froze the reducer.
- Switching to `pullup` (another shipped-trajectory exercise whose route is NOT mocked) succeeds and its trajectory does load.

**How to assert:**
```ts
await mockTrajectory(page, 'squat', 'missing');
await loadPage(page); await waitForApp(page); await jumpToWorkout(page);
await switchExercise(page, 'squat');
await page.waitForTimeout(200);
expect(await guideCanvasHasPixels(page)).toBe(true); // keyframe fallback drew
expect(await getRepCounterText(page)).toBe('0');

await switchExercise(page, 'pullup');
await page.waitForResponse(/pullup\.json$/, { timeout: 2000 }); // other exercises unaffected
```

**Why this matters:** `loadTrajectory`'s `.catch(() => { trajectoryCache[ex] = null; })` writes `null` to the cache, then `drawHowToSkeleton` re-checks `in trajectoryCache` — the `in` operator returns `true` for `null` values, which is correct (we won't retry forever). But if the null-handling ever drifts to `delete trajectoryCache[ex]`, every idle tick would trigger a new fetch — this test's pullup follow-up would still pass, but a follow-on perf test could add `page.on('request')` counting to catch that regression. Out of scope for v1.

---

### Test 5 — `malformed trajectory JSON does not crash the app`

**What it asserts:**
- With the squat trajectory route replying `200 OK` + invalid JSON body `{not-json`, the `.then(r => r.json())` rejects, the `.catch` writes `null`, and behaviour matches Test 4.

**How to assert:**
- Identical to Test 4 but with `mockTrajectory(page, 'squat', 'malformed')`.
- Confirm `#rep-counter` === `'0'` *and* `#guide-canvas` still has pixels.
- Confirm no uncaught page errors via `page.on('pageerror', …)`:
  ```ts
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  // ... run test ...
  expect(errors).toHaveLength(0);
  ```

**Why a separate test from Test 4:** the two code paths diverge at `r.ok ? r.json() : null`. 404 hits the `null` branch; malformed JSON hits the `r.json()` throw branch. Separate tests pin each.

---

### Test 6 — (optional, ship if time) `empty JSON body (200 + body "null") is treated as missing`

**What it asserts:**
- `mockTrajectory('squat', 'empty')` → `r.json()` resolves to `null` → cache stores `null` → `drawHowToSkeleton` falls back to keyframes.
- Behaviour matches Tests 4–5.

**Why optional:** behaviourally indistinguishable from 404 and malformed from the user's perspective. Include if test-author has headroom; skip with `test.skip(…)` + TODO comment otherwise.

---

## 7. Assumptions to verify during implementation

Per CLAUDE.md rule 9 (surface assumptions). Each of these should be sanity-checked by the Implement agent before writing test code:

1. **Assumed:** `page.route('**/assets/animations/*.json')` intercepts before `page.route(/cdn\.jsdelivr\.net/)` — Playwright route registration order is LIFO within a page. Verify by temporarily `console.log`-ing inside the handler, or just rely on distinct URL patterns (animations ≠ cdn.jsdelivr.net, so no overlap — no ordering issue).
2. **Assumed:** `guideCanvas.getContext('2d').getImageData(0, 0, w, h)` is cheap enough at 15 fps idle not to timeout the test when called once. If slow on CI, downsample by drawing `guideCanvas` to a 16×16 offscreen canvas first.
3. **Assumed:** the first idle tick runs within 200 ms of `jumpToWorkout()` resolving. `idleGuideTick` is kicked off by `requestAnimationFrame`, so 200 ms ≈ 12 RAFs — plenty. If flaky, bump to 500 ms.
4. **Assumed:** after `switchExercise(page, 'squat')` the browser actually fetches `squat.json`. The loader is called inside `drawHowToSkeleton` which runs on every idle tick, so unless the exercise is never rendered, the fetch will fire. Verify by watching `waitForResponse` in Test 1.
5. **Assumed:** `drawHowToSkeletonFromKeyframes` (the fallback) actually draws non-zero pixels for squat. Squat's `HOW_TO_KEYFRAMES` entry exists (Step 5 shipped all 22). If somehow missing for a future exercise, Test 4/5's pixel assertion would false-fail — switch those to use pushup (which will keep keyframes indefinitely during the staged migration).

If any of 1–5 turns out to be wrong mid-implementation, stop and re-confirm with Scott before adapting.

---

## 8. What could go wrong (risk register)

| Risk | Mitigation |
|------|------------|
| Canvas fingerprint test flakes if CI draws at different phase | Use 400 ms gap (large enough to cross ease-curve inflection); escalate to 32×32 hash + Hamming distance if needed. |
| `getImageData` is tainted if canvas has cross-origin content | Not a concern — `guide-canvas` only draws programmatically; no `drawImage(<crossOriginImg>)`. |
| Trajectory fetch races with idle tick — first fingerprint captured before JSON loads, looks like "fallback pixels", then next fingerprint is trajectory pixels — both non-empty, but the change isn't "animation progressed" | Precede fingerprint sampling with `waitForResponse(/squat\.json$/)` in Test 3, then `waitForTimeout(100)` before the first sample. |
| Port 3939 collision with a stray webServer from a prior run | Existing webServer config uses `reuseExistingServer: !CI`; matches Step 4/5 flake note — second run clean. Document in test output, don't "fix". |
| Keyframe fallback quietly "passes" tests 4–5 even if trajectory load is broken | Test 1 pins the trajectory-fetched-and-parsed happy path; Tests 4–5 only run under explicit route mocks. Keep them split. |
| Implement agent adds `const` exposure on window to make testing easier | **Do not.** Keep the "use DOM-observable state" rule from `_helpers.ts` top comment. All new assertions read the canvas pixels or use `waitForResponse` — no app-code changes needed. |

---

## 9. Acceptance criteria (for the Implement agent's Validate phase)

- [ ] File created at `tests/playwright/exercises/animation-loading.spec.ts`.
- [ ] Three helpers added to `tests/playwright/exercises/_helpers.ts` and exported (or inlined into the new spec file — implementer's call; helper file is preferred for reuse).
- [ ] `npx playwright test` on current main is green baseline (confirmed by Plan agent pre-flight).
- [ ] `npx playwright test tests/playwright/exercises/animation-loading.spec.ts` → 5 passing (6 if optional Test 6 included).
- [ ] `npx playwright test` (full suite) → total count = prior total + 5 (or 6), zero regressions.
- [ ] `node tests.js` unchanged at 284+ passing (unit tests don't touch this layer).
- [ ] No `window.__` or other global exposures added to `index.html`.
- [ ] No changes to `index.html` at all — this spec is pure test addition.

---

## 10. Non-goals

- Do **not** write tests for `pipeline/` Python code — that's pytest territory, handled by `pipeline/tests/`.
- Do **not** validate that `visibility` floor of 0.3 correctly hides occluded landmarks — that's a render-correctness concern, Scott's phone review catches it.
- Do **not** test `idleGuideTick` timing directly (no 15 fps assertion) — test what the user sees (pixels change), not the scheduler.
- Do **not** add mobile-viewport variants — existing specs run desktop Chrome only; Scott's phone test covers mobile.

---

## 11. Implementation sequence (hand-off)

1. **Investigate:** Implement agent reads this spec, then reads [pullup.spec.ts](../../tests/playwright/exercises/pullup.spec.ts) (pattern), [_helpers.ts](../../tests/playwright/exercises/_helpers.ts) (hooks), and [index.html:2935–3110](../../index.html#L2935) (loader + tick code). No other reading needed.
2. **Calibrate:** Confirm baseline green — `npx playwright test`. Note pre-existing flake count (should be 0 or 2 per Step 4 session-log note).
3. **Implement:** Add helpers → add spec file → run the new file in isolation until green → run the full suite.
4. **Validate:** Acceptance criteria in §9.
5. **Iterate:** If fingerprint test flakes on two consecutive full-suite runs, fall back to the 32×32 + Hamming distance variant in §6 Test 3.

Done = spec file + helpers land in one commit; full suite green; roadmap Step 5.5 "Add Playwright spec" checkbox ticked.
