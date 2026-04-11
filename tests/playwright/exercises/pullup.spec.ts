/**
 * Smoke test placeholder — pullup (rep-counter, hanging)
 *
 * Category: rep-counter, hanging (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/pullup-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~3 pull-ups; assert chin-over-bar gate (downGate) fires correctly
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('pullup: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'pullup');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'pullup');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need pullup-reps.y4m
});
