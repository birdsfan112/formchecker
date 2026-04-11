/**
 * Smoke test placeholder — lsit (pose-hold)
 *
 * Category: pose-hold (isTimed: true, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/lsit-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~15 s L-sit; assert legsDropped cue fires when hip angle drops
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('lsit: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'lsit');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'lsit');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need lsit-hold.y4m
});
