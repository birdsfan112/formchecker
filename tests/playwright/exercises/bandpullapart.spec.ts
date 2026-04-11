/**
 * Smoke test placeholder — bandpullapart (rep-counter, mobility)
 *
 * Category: rep-counter, mobility (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/bandpullapart-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - invertedPolarity + wrist-span tracking; assert 5 spread→center reps; verify bug fixed (audit 2026-04-10)
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('bandpullapart: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'bandpullapart');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'bandpullapart');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need bandpullapart-reps.y4m
});
