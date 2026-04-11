/**
 * Regression guard — Dips (D1 from docs/refactor-audit-2026-04-10.md)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * The pre-refactor dip analyzer had a per-frame side-effect on the #angle-hint DOM
 * element:
 *
 *   if (shoulderSpan < 0.10 && cueShouldFire('dip-orient', 20000)) {
 *     angleHint.textContent = 'Face the camera for best tracking';
 *   }
 *
 * This was dropped during the framework refactor (2026-04-10) because the framework
 * has no onFrame(lm) hook for per-frame DOM side effects outside the feedback/
 * score/rep-counter path. Roadmap Backlog §3 records the decision.
 *
 * This spec locks in the CURRENT (hint-dropped) behavior so a future change doesn't
 * silently reintroduce the hint (or re-break rep counting while trying to restore it).
 *
 * LANDMARK INJECTION APPROACH
 * ---------------------------
 * Inject a frame where:
 *   - isInPosition passes (body upright: |shoulderY - ankleY| > 0.3)
 *   - shoulderSpan < 0.10 (side-on to camera: lm[11].x ≈ lm[12].x)
 *   - Elbow angle ≈ 180° (arms fully extended, phase stays 'up' safely)
 *
 * In the old build this would set angleHint.textContent = 'Face the camera for best
 * tracking'. In the new build, nothing should write to #angle-hint from within
 * analyze() — it should stay empty.
 *
 * What they DO NOT cover:
 *   - elbowFlare form cue (needs elbow/shoulder geometry in 'down' phase)
 *   - Actual rep counting (needs calibrated elbow threshold crossing)
 *   - Restoring the orientation hint via a future onFrame hook (see Backlog §3)
 */

import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  exerciseExistsInSelect,
  exerciseIsTimed,
  jumpToWorkout,
  switchExercise,
  startWorkout,
  makeLandmarks,
  injectPoseFrame,
} from './_helpers';

// ---------------------------------------------------------------------------
// Landmark helpers
// ---------------------------------------------------------------------------

/**
 * Side-on dip position (shoulderSpan < 0.10), arms fully extended.
 *
 * isInPosition: |shoulderY - ankleY| = |0.3 - 0.7| = 0.4 > 0.3 ✓
 * shoulderSpan: |0.49 - 0.51| = 0.02 < 0.10 ← triggers old orientation hint
 *
 * Elbow angle (angle at elbow, shoulder→elbow→wrist, each in vertical line):
 *   atan2(wrist.y-elbow.y, wrist.x-elbow.x) = atan2(0.2, 0) = π/2
 *   atan2(shoulder.y-elbow.y, shoulder.x-elbow.x) = atan2(-0.2, 0) = -π/2
 *   radians = π/2 - (-π/2) = π → deg = 180° (arms straight)
 *   180° > elbow_up (150) → phase stays 'up', no rep transition fires
 */
const DIP_SIDE_ON = makeLandmarks({
  11: { x: 0.49, y: 0.3 },  // left shoulder
  12: { x: 0.51, y: 0.3 },  // right shoulder — nearly same x → small shoulderSpan
  13: { x: 0.49, y: 0.5 },  // left elbow
  14: { x: 0.51, y: 0.5 },  // right elbow
  15: { x: 0.49, y: 0.7 },  // left wrist (below elbow — arm extended downward)
  16: { x: 0.51, y: 0.7 },  // right wrist
  27: { x: 0.49, y: 0.9 },  // left ankle
  28: { x: 0.51, y: 0.9 },  // right ankle
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('dip — audit-derived regression guard (D1)', () => {
  test('registry: is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'dip');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'dip');
    expect(isTimed).toBe(false);
  });

  test('orientation hint does NOT appear when side-on to camera (per-frame side-effect dropped)', async ({ page }) => {
    // Old build: shoulderSpan < 0.10 → angleHint.textContent = 'Face the camera for best tracking'
    // New build: this block was dropped; angleHint stays empty during analyze().
    // This test guards against accidental reintroduction.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'dip');
    await startWorkout(page);

    // setWorkoutState('active') clears #angle-hint — inject a side-on frame
    // to confirm it stays clear (old code would re-populate it here).
    await injectPoseFrame(page, DIP_SIDE_ON);

    const hintText = await page.locator('#angle-hint').textContent();
    expect(hintText).not.toContain('Face the camera');
  });
});
