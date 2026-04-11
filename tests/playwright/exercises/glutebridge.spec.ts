/**
 * Smoke test placeholder — glutebridge (rep-counter, floor)
 *
 * Category: rep-counter, floor (isTimed: false, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/glutebridge-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - invertedPolarity; assert 5 reps count with inverted phase logic
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('glutebridge: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'glutebridge');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'glutebridge');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need glutebridge-reps.y4m
});
