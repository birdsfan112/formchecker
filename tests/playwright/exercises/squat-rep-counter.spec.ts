/**
 * Smoke test — Squats (rep-counter category)
 *
 * Category: Rep-counter (isTimed: false, isFloor: false)
 * Y4M needed for pose assertions: tests/playwright/fixtures/squat-reps.y4m (TODO)
 *
 * What these tests cover:
 *   1. exerciseRegistry is populated with a correct squat config.
 *   2. The welcome screen renders with all three action buttons.
 *   3. Clicking "Jump to Workout" transitions the app out of the welcome screen.
 *   4. The rep counter element exists and reads "0" after startup.
 *   5. Switching to squat updates the exercise name in the HUD.
 *
 * What they DO NOT cover (needs a real squat Y4M recording):
 *   - Rep counting on knee-angle transitions.
 *   - "Go deeper" and "Knee cave" form cues.
 *   - Out-of-position gating (hipCenter out of range).
 */

import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  exerciseExistsInSelect,
  exerciseIsTimed,
  jumpToWorkout,
  switchExercise,
  getExerciseName,
  getRepCounterText,
} from './_helpers';

test.describe('squat — rep-counter smoke', () => {
  test('registry: squat is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'squat');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'squat');
    expect(isTimed).toBe(false);
  });

  test('welcome screen: all three action buttons are visible', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    await expect(page.locator('#camera-permission')).toBeVisible();
    await expect(page.locator('#btn-calibrate')).toBeVisible();
    await expect(page.locator('#btn-calibrate')).toContainText('Calibrate');
    await expect(page.locator('#btn-welcome-load-cal')).toBeVisible();
    await expect(page.locator('#btn-jump-workout')).toBeVisible();
    await expect(page.locator('#btn-jump-workout')).toContainText('Jump to Workout');
  });

  test('app start: welcome overlay hides and rep counter initialises to 0', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    // Start the app — Camera stub makes startCamera() resolve immediately,
    // so loading screen hides and app enters idle state with rep counter = 0.
    await jumpToWorkout(page);

    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });

  test('exercise switch: HUD shows "Squats" after switching to squat', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Default exercise on load is push-ups; switch to squat.
    await switchExercise(page, 'squat');

    const name = await getExerciseName(page);
    expect(name).toBe('Squats');

    // Rep counter resets to 0 on exercise change.
    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });
});
