/**
 * Smoke test placeholder — lunge (rep-counter, standing)
 *
 * Category: rep-counter, standing (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/lunge-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 lunge reps; assert front-knee angle crosses knee_down threshold
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('lunge: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'lunge');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'lunge');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need lunge-reps.y4m
});
