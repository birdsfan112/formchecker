/**
 * Regression guard — L-Sit (D2 from docs/refactor-audit-2026-04-10.md)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * Three intentional display/voice changes from the refactor that must not silently
 * regress:
 *
 *   1. Timer location: OLD wrote "${elapsed}s" to the form feedback area.
 *      NEW writes MM:SS to repCounter.textContent (#rep-counter).
 *
 *   2. Milestone voice: OLD used speak() + state.spokenThisRep dedupe.
 *      NEW uses speakForce() with no per-second dedupe (shared framework pattern).
 *
 *   3. Cooldown architecture: OLD had custom 15s dedupe logic.
 *      NEW uses the framework's single speakForce call per 15s modulo.
 *
 * Voice assertions are not testable without a real speech engine in headless Chrome.
 * This spec covers #1 (DOM-observable) and guards against regression on #2/#3
 * via documentation. If voice behavior needs locking, use a speakForce spy in a
 * future session.
 *
 * LANDMARK INJECTION APPROACH
 * ---------------------------
 * L-sit isInPosition: avgShoulderY < avgHipY (upright torso pressing down).
 * After a valid frame lands in active state, buildTimedAnalyzer writes MM:SS to
 * repCounter immediately on the first frame (secs=0 → '0:00').
 *
 * What they DO NOT cover:
 *   - Real 15-second timer milestone voice cue
 *   - "Keep legs horizontal" cue on leg drop
 *   - Multi-fire double-announcement at the 15s mark (see audit D2)
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
 * Valid L-sit position: upright torso, legs extended horizontally.
 *
 * isInPosition: avgShoulderY (0.2) < avgHipY (0.5) ✓
 *
 * legsDropped form check: angle(shoulder, hip, knee) at each side.
 * With knee at same Y as hip (horizontal legs), angle ≈ 90° < 120° → check passes (good form).
 *
 * Coordinate geometry (Y increases downward in MediaPipe normalized coords):
 *   shoulder=(0.4, 0.2), hip=(0.4, 0.5), knee=(0.2, 0.5)
 *   atan2(knee.y-hip.y, knee.x-hip.x) = atan2(0, -0.2) = π
 *   atan2(shoulder.y-hip.y, shoulder.x-hip.x) = atan2(-0.3, 0) = -π/2
 *   radians = π - (-π/2) = 3π/2 → deg = 270 > 180 → 360-270 = 90°   < 120 ✓
 */
const LSIT_IN_POSITION = makeLandmarks({
  11: { x: 0.4, y: 0.2 },  // left shoulder
  12: { x: 0.6, y: 0.2 },  // right shoulder
  23: { x: 0.4, y: 0.5 },  // left hip
  24: { x: 0.6, y: 0.5 },  // right hip
  25: { x: 0.2, y: 0.5 },  // left knee — horizontal (same Y as hip)
  26: { x: 0.8, y: 0.5 },  // right knee — horizontal
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('lsit — audit-derived regression guard (D2)', () => {
  test('registry: is registered as a timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'lsit');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'lsit');
    expect(isTimed).toBe(true);
  });

  test('timer writes MM:SS to #rep-counter, not elapsed seconds to feedback area (D2 regression guard)', async ({ page }) => {
    // Old code wrote "${elapsed}s" (e.g., "5s") to the form feedback text area.
    // New code writes MM:SS (e.g., "0:00") to repCounter — the same HUD element used
    // by all other timed exercises. This test locks in the new location and format.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'lsit');
    await startWorkout(page);

    // Inject a valid L-sit frame — buildTimedAnalyzer writes MM:SS on the first frame.
    await injectPoseFrame(page, LSIT_IN_POSITION);

    // Rep counter must show MM:SS format (e.g., "0:00").
    const repText = await page.locator('#rep-counter').textContent();
    expect(repText).toMatch(/^\d+:\d{2}$/);

    // Must NOT contain the old format ("s" suffix, e.g., "0s", "5s").
    expect(repText).not.toMatch(/\d+s$/);

    // Form feedback must NOT contain the timer value — old code wrote it there.
    const feedbackText = await page.locator('#form-feedback').textContent();
    expect(feedbackText).not.toMatch(/\d+s$/);
  });
});
