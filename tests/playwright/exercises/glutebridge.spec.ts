/**
 * Regression guard — Glute Bridge (floor + rep-based + invertedPolarity)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * Glute bridge is the only exercise that combines all three traits:
 *   - isFloor: true  (isInPosition checks horizontal span, not vertical)
 *   - isTimed: false (rep-counter, not timer)
 *   - invertedPolarity: true (phase 'up' = resting, phase 'down' = hips raised)
 *
 * The invertedPolarity path in buildRepAnalyzer uses different threshold semantics
 * than the standard path:
 *   - cal[bottom] (hip_down = 150): angle ABOVE which we're raised → phase 'up'→'down'
 *   - cal[top]    (hip_up  = 110): angle BELOW which we've returned → rep counted
 *
 * A regression on this path (e.g., swapping threshold comparisons) would silently
 * break rep counting — the counter would stay at 0 forever.
 *
 * LANDMARK GEOMETRY
 * -----------------
 * isInPosition: Math.abs(avgAnkleY - avgShoulderY) < 0.30
 *
 * GLUTE_HIPS_RAISED — hip angle ≈ 180° (clearly > hip_down=150):
 *   Shoulder, hip, and knee at the same Y (collinear) → angle = 180°.
 *   Represents the fully-bridged position where the body is roughly flat.
 *
 * GLUTE_HIPS_DOWN — hip angle ≈ 90° (clearly < hip_up=110):
 *   Hip at ground level (same Y as shoulder), knee pointing straight up.
 *   atan2 math: direction-to-knee = -90°, direction-to-shoulder = 180° → 270° → 360-270 = 90°.
 *
 * What these tests DO NOT cover:
 *   - Real MediaPipe detection with a camera
 *   - 'Drive hips higher' form cue (phase='down' + angleNow < 145)
 *   - Partial-rep non-counting (angle between 110 and 150 should not count)
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
 * Fully bridged: shoulder, hip, and knee all at y=0.5 (collinear → hip angle = 180°).
 *
 * isInPosition: |avgAnkleY - avgShoulderY| = |0.5 - 0.5| = 0 < 0.30 ✓
 * Left hip angle = angle(lm[11], lm[23], lm[25]):
 *   All at y=0.5; atan2(0,+) = 0°, atan2(0,-) = 180° → diff = 180° > hip_down (150) ✓
 */
const GLUTE_HIPS_RAISED = makeLandmarks({
  11: { x: 0.2, y: 0.5 },   // left shoulder
  12: { x: 0.8, y: 0.5 },   // right shoulder
  23: { x: 0.35, y: 0.5 },  // left hip  — same Y → collinear
  24: { x: 0.65, y: 0.5 },  // right hip — same Y → collinear
  25: { x: 0.5, y: 0.5 },   // left knee
  26: { x: 0.5, y: 0.5 },   // right knee
  27: { x: 0.7, y: 0.5 },   // left ankle
  28: { x: 0.3, y: 0.5 },   // right ankle
});

/**
 * Lying flat, knees bent pointing up: hip angle ≈ 90°.
 *
 * isInPosition: |avgAnkleY - avgShoulderY| = |0.7 - 0.7| = 0 < 0.30 ✓
 * Left hip angle = angle(lm[11], lm[23], lm[25]):
 *   hip=(0.4,0.7), shoulder=(0.3,0.7) same Y → direction = 180°
 *   knee=(0.4,0.4) directly above hip   → direction = -90°
 *   radians = -90° - 180° = -270° → 360-270 = 90° < hip_up (110) → rep counted ✓
 */
const GLUTE_HIPS_DOWN = makeLandmarks({
  11: { x: 0.3, y: 0.7 },  // left shoulder  — at ground level
  12: { x: 0.7, y: 0.7 },  // right shoulder
  23: { x: 0.4, y: 0.7 },  // left hip  — same Y as shoulder (on ground)
  24: { x: 0.6, y: 0.7 },  // right hip
  25: { x: 0.4, y: 0.4 },  // left knee  — directly above hip (bent, pointing up)
  26: { x: 0.6, y: 0.4 },  // right knee
  27: { x: 0.3, y: 0.7 },  // left ankle  — at ground level
  28: { x: 0.7, y: 0.7 },  // right ankle
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('glutebridge — floor + rep-based + invertedPolarity', () => {
  test('registry: is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'glutebridge');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'glutebridge');
    expect(isTimed).toBe(false);
  });

  test('rep counter increments on a full glute bridge rep (invertedPolarity + floor)', async ({ page }) => {
    // Primary regression guard for the floor + invertedPolarity combination.
    // Phase seeds as 'up' (resting). RAISED pushes angle above hip_down (150)
    // → phase 'up'→'down'. DOWN returns angle below hip_up (110) → rep counted.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'glutebridge');
    await startWorkout(page);

    // Rep 1: raise → lower
    await injectPoseFrame(page, GLUTE_HIPS_RAISED);  // angle=180° > 150 → phase 'up'→'down'
    await injectPoseFrame(page, GLUTE_HIPS_DOWN);    // angle=90°  < 110 → rep counted
    await expect(page.locator('#rep-counter')).toHaveText('1');

    // Rep 2: confirms state resets correctly between reps
    await injectPoseFrame(page, GLUTE_HIPS_RAISED);
    await injectPoseFrame(page, GLUTE_HIPS_DOWN);
    await expect(page.locator('#rep-counter')).toHaveText('2');
  });
});
