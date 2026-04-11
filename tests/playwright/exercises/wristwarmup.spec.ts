/**
 * Smoke test placeholder — wristwarmup (mobility, standing)
 *
 * Category: mobility, standing (isTimed: true, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/wristwarmup-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~20 s; assert arm-height cue
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('wristwarmup: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'wristwarmup');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'wristwarmup');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need wristwarmup-hold.y4m
});
