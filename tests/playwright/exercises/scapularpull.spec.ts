/**
 * Smoke test placeholder — scapularpull (pose-hold, hanging)
 *
 * Category: pose-hold, hanging (isTimed: true, isFloor: false)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/scapularpull-hold.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~15 s scapular pulls; assert elbow-bend cue when elbow < 150 deg
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test('scapularpull: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, 'scapularpull');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, 'scapularpull');
  expect(isTimed).toBe(true);
  // TODO: full pose-detection assertions need scapularpull-hold.y4m
});
