/**
 * Smoke test placeholder — legraise (rep-counter)
 *
 * Category: rep-counter (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/legraise-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 leg raises; assert hip angle crosses threshold
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('legraise: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'legraise');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'legraise');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need legraise-reps.y4m
});
