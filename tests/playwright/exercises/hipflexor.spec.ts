/**
 * Smoke test placeholder — hipflexor (mobility, kneeling)
 *
 * Category: mobility, kneeling (isTimed: true, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/hipflexor-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~30 s; assert torso-upright cue on lean
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('hipflexor: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'hipflexor');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'hipflexor');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need hipflexor-hold.y4m
});
