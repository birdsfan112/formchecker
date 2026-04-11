/**
 * Smoke test placeholder — dip (rep-counter, bars)
 *
 * Category: rep-counter, bars (isTimed: false, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/dip-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 dips; assert elbowFlare cue; verify Backlog §3 orientation nudge
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('dip: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'dip');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'dip');
  expect(isTimed).toBe(false);
  // TODO: full pose-detection assertions need dip-reps.y4m
});
