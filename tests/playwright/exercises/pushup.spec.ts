/**
 * Smoke test placeholder — pushup (rep-counter, floor)
 *
 * Category: rep-counter, floor (isTimed: false, isFloor: true)
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/pushup-reps.y4m
 * Then expand this placeholder with pose-detection assertions:
 *   - ~5 full push-up reps; assert rep counter increments; hipSag cue; auto-start from floor
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';

test.todo('pushup: detect reps and form cues (requires pushup-reps.y4m fixture)');
