/**
 * Smoke test placeholder — plank (pose-hold, floor)
 *
 * Category: pose-hold, floor (isTimed: true, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/plank-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~30 s plank; assert timer advances; hipSagMild and hipSagSevere cues
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('plank: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'plank');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'plank');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need plank-hold.y4m
});
