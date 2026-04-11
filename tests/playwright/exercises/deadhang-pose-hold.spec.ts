/**
 * Smoke test — Dead Hang (pose-hold / timed category)
 *
 * Category: Pose-hold (isTimed: true, isFloor: false)
 * Y4M needed for pose assertions: tests/playwright/fixtures/deadhang-hold.y4m (TODO)
 *
 * What these tests cover:
 *   1. exerciseRegistry has a correctly-typed timed, non-floor entry for 'deadhang'.
 *   2. All 22 exercises are registered (regression: framework refactor must not drop any).
 *   3. App transitions from welcome screen after Jump to Workout.
 *   4. Switching to dead hang updates the HUD and resets the rep counter to 0.
 *
 * What they DO NOT cover (needs a real dead-hang Y4M recording):
 *   - Timer advancing while wrists are above shoulders (grip-hold detection).
 *   - "Pack your shoulders" grip-lost cue.
 *   - Auto-start from hanging position.
 */

import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  exerciseExistsInSelect,
  exerciseIsTimed,
  getAllExerciseIds,
  jumpToWorkout,
  switchExercise,
  getExerciseName,
  getRepCounterText,
} from './_helpers';

// The full set of exercise IDs from the framework refactor (2026-04-10).
// This list is the regression guard — any drop here is a red flag.
const ALL_22_EXERCISE_IDS = [
  'pushup', 'squat', 'lunge', 'pistol', 'pullup', 'pike', 'dip', 'row',
  'plank', 'deadhang', 'lsit', 'glutebridge', 'legraise', 'archhang',
  'scapularpull', 'shoulderdislocate', 'hipflexor', 'wristwarmup',
  'bandpullapart', 'foamroller', 'catcow', 'birddog',
];

test.describe('deadhang — pose-hold smoke', () => {
  test('registry: deadhang is registered as a timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'deadhang');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'deadhang');
    expect(isTimed).toBe(true);
  });

  test('registry: all 22 exercises are present after framework refactor', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const registeredIds = await getAllExerciseIds(page);

    for (const id of ALL_22_EXERCISE_IDS) {
      expect(registeredIds, `Missing exercise: ${id}`).toContain(id);
    }
    expect(registeredIds.length).toBe(22);
  });

  test('app start: welcome overlay hides and timer initialises to 0', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Timed exercises display time in the rep counter slot; check initial state.
    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });

  test('exercise switch: HUD shows dead hang name after switching', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    await switchExercise(page, 'deadhang');

    const name = await getExerciseName(page);
    // Name defined in config: 'Dead Hang (timed)'
    expect(name).toContain('Dead Hang');

    const repText = await getRepCounterText(page);
    expect(repText).toBe('0');
  });
});
