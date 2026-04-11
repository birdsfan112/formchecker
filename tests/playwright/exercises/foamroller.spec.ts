/**
 * Smoke test placeholder — foamroller (mobility, floor)
 *
 * Category: mobility, floor (isTimed: true, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/foamroller-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~30 s; timed auto-start floor exercise; no active form cue to assert
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('foamroller: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'foamroller');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'foamroller');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need foamroller-hold.y4m
});
