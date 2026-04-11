/**
 * Regression guard — Band Pull-Aparts (D3 from docs/refactor-audit-2026-04-10.md)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * The pre-refactor bandpullapart analyzer was silently broken: resetSetState() seeds
 * state.phase = 'up', but the old code only checked for phase === 'spread' and
 * phase === 'center' — neither could ever match. Rep counting never fired.
 *
 * The refactor fixed this via invertedPolarity: true. The new analyzer correctly
 * transitions 'up' → 'down' → 'up' using the wrist_spread / wrist_center thresholds.
 *
 * This spec is the regression guard: if the invertedPolarity path breaks, rep
 * counting silently stops again — and manual phone testing won't catch it because
 * there's no prior "working" memory to compare against.
 *
 * LANDMARK INJECTION APPROACH
 * ---------------------------
 * The Pose stub exposes window.__poseInstance. After the workout is active, calling
 * __poseInstance._cb({poseLandmarks: [...]}) drives the same onResults path that
 * real MediaPipe would, including isInPosition gating and analyze().
 *
 * What they DO NOT cover:
 *   - Real MediaPipe pose detection with an actual band
 *   - "Keep arms at shoulder height" form cue (needs landmark drift)
 *   - Partial-rep non-counting (wristSpan ≈ 0.25 should not count)
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
 * Standing, front-facing, arms spread wide.
 * - isInPosition: |ankleY - shoulderY| = |0.7 - 0.3| = 0.40 > 0.30 ✓
 * - wristSpan (trackingJoint): |0.1 - 0.9| = 0.80 > wrist_spread (0.32) → phase 'up'→'down'
 * - armsDropped form check: wristY (0.3) NOT > shoulderY + 0.15 (0.45) → passes (no cue)
 */
const BAND_SPREAD = makeLandmarks({
  11: { x: 0.4, y: 0.3 },  // left shoulder
  12: { x: 0.6, y: 0.3 },  // right shoulder
  15: { x: 0.1, y: 0.3 },  // left wrist — spread
  16: { x: 0.9, y: 0.3 },  // right wrist — spread
  27: { x: 0.4, y: 0.7 },  // left ankle
  28: { x: 0.6, y: 0.7 },  // right ankle
});

/**
 * Same standing position, arms pulled back to center.
 * - wristSpan: |0.42 - 0.58| = 0.16 < wrist_center (0.18) → rep counted, phase 'down'→'up'
 */
const BAND_CENTER = makeLandmarks({
  11: { x: 0.4, y: 0.3 },
  12: { x: 0.6, y: 0.3 },
  15: { x: 0.42, y: 0.3 },  // left wrist — center
  16: { x: 0.58, y: 0.3 },  // right wrist — center
  27: { x: 0.4, y: 0.7 },
  28: { x: 0.6, y: 0.7 },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('bandpullapart — audit-derived regression guard (D3)', () => {
  test('registry: is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'bandpullapart');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'bandpullapart');
    expect(isTimed).toBe(false);
  });

  test('rep counter increments on a full pull-apart rep (invertedPolarity fix)', async ({ page }) => {
    // This is the primary regression guard for D3. The old analyzer was broken:
    // resetSetState seeded phase='up' but the code only checked 'spread'/'center',
    // so no rep ever counted. invertedPolarity now makes it work correctly.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'bandpullapart');
    await startWorkout(page);

    // Rep 1: spread → center
    await injectPoseFrame(page, BAND_SPREAD);   // phase: 'up' → 'down'
    await injectPoseFrame(page, BAND_CENTER);   // phase: 'down' → 'up', repCounted = true
    await expect(page.locator('#rep-counter')).toHaveText('1');

    // Rep 2: spread → center again — confirms state resets correctly between reps
    await injectPoseFrame(page, BAND_SPREAD);
    await injectPoseFrame(page, BAND_CENTER);
    await expect(page.locator('#rep-counter')).toHaveText('2');
  });
});
