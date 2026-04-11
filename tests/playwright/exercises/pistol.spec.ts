/**
 * Smoke test placeholder — pistol (rep-counter, standing)
 *
 * Category: rep-counter, standing (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/pistol-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~3 pistol squats each side; assert rep count
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('pistol: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'pistol');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'pistol');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need pistol-reps.y4m
});
