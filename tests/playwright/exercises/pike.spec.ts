/**
 * Smoke test placeholder — pike (rep-counter, floor-ish)
 *
 * Category: rep-counter, floor-ish (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/pike-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 pike push-ups; assert hipsHigh cue behavior
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('pike: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'pike');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'pike');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need pike-reps.y4m
});
