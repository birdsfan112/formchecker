/**
 * Smoke test placeholder — pushup (rep-counter, floor)
 *
 * Category: rep-counter, floor (isTimed: false, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/pushup-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 full push-up reps; assert rep counter increments; hipSag cue; auto-start from floor
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('pushup: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'pushup');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'pushup');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need pushup-reps.y4m
});
