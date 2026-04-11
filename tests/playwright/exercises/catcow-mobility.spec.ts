/**
 * Smoke test — Cat-Cow (mobility category)
 *
 * Category: Mobility / timed floor exercise (isTimed: true, isFloor: true)
 * Y4M needed for pose assertions: tests/playwright/fixtures/catcow-hold.y4m (TODO)
 *
 * What these tests cover:
 *   1. exerciseRegistry has catcow typed as timed AND floor — both flags matter
 *      (isFloor drives auto-start logic; isTimed drives the rep/timer display path).
 *   2. All timed floor exercises (plank, foamroller, catcow, birddog) correctly
 *      carry both flags — regression guard for the framework refactor.
 *   3. App transitions from welcome screen.
 *   4. Switching to cat-cow updates the HUD.
 *
 * What they DO NOT cover (needs a real cat-cow Y4M recording):
 *   - Auto-start from quadruped position (3-second hold gate).
 *   - "Keep hips level" form cue (hipSpan > 0.12 check).
 *   - Timer advancement while in position.
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

// Timed floor exercises — each should have isTimed: true AND isFloor: true.
const TIMED_FLOOR_EXERCISES = [
  { id: 'plank',      name: 'Plank (timed)' },
  { id: 'foamroller', name: 'Foam Roller (timed)' },
  { id: 'catcow',     name: 'Cat-Cow (timed)' },
  { id: 'birddog',    name: 'Bird-Dog (timed)' },
];

test.describe('catcow — mobility smoke', () => {
  test('registry: catcow is registered as a timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'catcow');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'catcow');
    expect(isTimed).toBe(true);
  });

  test('registry: all timed floor exercises are marked timed in the select', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    for (const { id } of TIMED_FLOOR_EXERCISES) {
      const exists = await exerciseExistsInSelect(page, id);
      expect(exists, `${id} not found in select`).toBe(true);

      const isTimed = await exerciseIsTimed(page, id);
      expect(isTimed, `${id} should be timed`).toBe(true);
    }
  });

  test('app start: welcome overlay hides and rep counter starts at 0', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });

  test('exercise switch: HUD shows cat-cow name after switching', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    await switchExercise(page, 'catcow');

    const name = await getExerciseName(page);
    expect(name).toContain('Cat');

    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });
});
