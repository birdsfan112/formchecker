/**
 * Smoke test placeholder — shoulderdislocate (mobility, standing)
 *
 * Category: mobility, standing (isTimed: true, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/shoulderdislocate-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~20 s; assert elbow-angle cue when arms not straight
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('shoulderdislocate: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'shoulderdislocate');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'shoulderdislocate');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need shoulderdislocate-hold.y4m
});
