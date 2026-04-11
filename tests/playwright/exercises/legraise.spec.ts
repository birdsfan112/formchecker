/**
 * Regression guard — Leg Raises (hanging + rep-based + hip angle)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * Leg raise is the simplest hanging rep exercise: same isInPosition as pull-up
 * (wrists above shoulders) but tracks hip angle instead of elbow angle, and has
 * no downGate. It exercises the "hanging rep counter" code path in its purest form.
 *
 * trackingJoint: (angle(lm[11], lm[23], lm[25]) + angle(lm[12], lm[24], lm[26])) / 2
 * calibrationDefaults: { hip_down: 110, hip_up: 150 }
 *
 * Standard polarity (no invertedPolarity):
 *   hip angle < 110 (hip_down) AND phase='up' → phase 'up'→'down' (legs raised)
 *   hip angle > 150 (hip_up)   AND phase='down' → rep counted (legs lowered)
 *
 * LANDMARK GEOMETRY
 * -----------------
 * isInPosition: avgWristY < avgShoulderY + 0.2
 *   wrists: y=0.1, shoulders: y=0.3 → 0.1 < 0.5 ✓
 *
 * LEGS_UP — hip angle ≈ 37° (clearly < hip_down=110):
 *   shoulder=(0.3,0.3), hip=(0.4,0.6), knee=(0.5,0.3) [raised to shoulder height]
 *   atan2(-0.3,+0.1)≈-71.6°, atan2(-0.3,-0.1)≈-108.4° → diff≈36.8° (both sides) ✓
 *
 * LEGS_DOWN — hip angle ≈ 180° (clearly > hip_up=150):
 *   shoulder=(0.4,0.3), hip=(0.4,0.6), knee=(0.4,0.9) [vertically aligned]
 *   atan2(+0.3,0)=90°, atan2(-0.3,0)=-90° → diff=180° ✓
 *
 * What these tests DO NOT cover:
 *   - Real MediaPipe detection with a camera
 *   - 'Keep legs straighter' form cue (bent knees while legs are raised)
 *   - Partial-rep non-counting (hip angle between 110 and 150)
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
 * Legs raised to shoulder height: hip angle ≈ 37°.
 *
 * isInPosition: avgWristY(0.1) < avgShoulderY(0.3) + 0.2 = 0.5 ✓
 * Left hip angle = angle(lm[11], lm[23], lm[25]):
 *   hip=(0.4,0.6); shoulder=(0.3,0.3) → atan2(-0.3,-0.1)≈-108.4°
 *                  knee=(0.5,0.3)     → atan2(-0.3,+0.1)≈-71.6°
 *   diff = -71.6° - (-108.4°) = 36.8° < hip_down (110) → phase 'up'→'down' ✓
 */
const LEGS_UP = makeLandmarks({
  11: { x: 0.3, y: 0.3 },  // left shoulder
  12: { x: 0.7, y: 0.3 },  // right shoulder
  15: { x: 0.3, y: 0.1 },  // left wrist  — at bar
  16: { x: 0.7, y: 0.1 },  // right wrist
  23: { x: 0.4, y: 0.6 },  // left hip
  24: { x: 0.6, y: 0.6 },  // right hip
  25: { x: 0.5, y: 0.3 },  // left knee  — raised to shoulder height
  26: { x: 0.5, y: 0.3 },  // right knee
});

/**
 * Legs hanging straight down: hip angle ≈ 180°.
 *
 * isInPosition: avgWristY(0.1) < avgShoulderY(0.3) + 0.2 = 0.5 ✓
 * Left hip angle = angle(lm[11], lm[23], lm[25]):
 *   shoulder, hip, knee all at x=0.4 (vertical line)
 *   atan2(0.9-0.6, 0)=90°, atan2(0.3-0.6, 0)=-90° → diff=180° > hip_up (150) → rep counted ✓
 */
const LEGS_DOWN = makeLandmarks({
  11: { x: 0.4, y: 0.3 },  // left shoulder
  12: { x: 0.6, y: 0.3 },  // right shoulder
  15: { x: 0.4, y: 0.1 },  // left wrist  — at bar
  16: { x: 0.6, y: 0.1 },  // right wrist
  23: { x: 0.4, y: 0.6 },  // left hip
  24: { x: 0.6, y: 0.6 },  // right hip
  25: { x: 0.4, y: 0.9 },  // left knee  — hanging straight down
  26: { x: 0.6, y: 0.9 },  // right knee
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('legraise — hanging rep-based (hip angle)', () => {
  test('registry: is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'legraise');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'legraise');
    expect(isTimed).toBe(false);
  });

  test('rep counter increments on a full leg raise rep (hanging + hip angle)', async ({ page }) => {
    // Phase seeds as 'up' (legs hanging). LEGS_UP drives hip angle below hip_down (110)
    // → phase 'up'→'down'. LEGS_DOWN drives angle above hip_up (150) → rep counted.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'legraise');
    await startWorkout(page);

    // Rep 1: raise → lower
    await injectPoseFrame(page, LEGS_UP);    // angle≈37° < 110 → phase 'up'→'down'
    await injectPoseFrame(page, LEGS_DOWN);  // angle≈180° > 150 → rep counted
    await expect(page.locator('#rep-counter')).toHaveText('1');

    // Rep 2: confirms state resets correctly
    await injectPoseFrame(page, LEGS_UP);
    await injectPoseFrame(page, LEGS_DOWN);
    await expect(page.locator('#rep-counter')).toHaveText('2');
  });
});
