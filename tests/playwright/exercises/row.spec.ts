/**
 * Smoke test placeholder — row (rep-counter, inverted)
 *
 * Category: rep-counter, inverted (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/row-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 rows; assert hipSag cue fires when body sags
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('row: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'row');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'row');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need row-reps.y4m
});
