/**
 * Smoke test placeholder — birddog (mobility, floor)
 *
 * Category: mobility, floor (isTimed: true, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/birddog-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~20 s; assert hip-rotation cue fires during extension
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('birddog: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'birddog');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'birddog');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need birddog-hold.y4m
});
