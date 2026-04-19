/**
 * Regression guard — How-to animation trajectory loader (Step 5.5)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * Step 5.5 shipped a canonical-JSON animation path: `assets/animations/*.json`
 * files (one per exercise) render a MediaPipe skeleton on #guide-canvas during
 * idle. The loader falls back to legacy HOW_TO_KEYFRAMES when the JSON is
 * missing or malformed. This spec locks in four behaviours so future pipeline
 * or loader changes can't silently break rendering:
 *
 *   1. Trajectory JSON is fetched when an exercise with a shipped animation
 *      becomes active.
 *   2. #guide-canvas has drawn pixels after the trajectory loads.
 *   3. The animation progresses over time — the canvas fingerprint changes
 *      across sampled frames.
 *   4. Missing / malformed JSON does not crash the app; the keyframe fallback
 *      still draws pixels and unrelated exercises still load.
 *
 * What this spec does NOT cover:
 *   - Correctness of the trajectory data itself (lives in
 *     pipeline/tests/test_normalize_loop.py, pytest).
 *   - Visual fidelity of the rendered skeleton (Scott's phone review).
 *   - MediaPipe detection — MediaPipe is stubbed by loadPage().
 *
 * PICKING 'squat' AS THE TEST EXERCISE
 * -------------------------------------
 * Pushup is the default exercise at load but has no shipped trajectory JSON
 * yet. Squat is one of the two exercises with committed
 * assets/animations/*.json (the other is pullup) and is reached by switching.
 *
 * ARCHITECTURE RECAP
 * ------------------
 * loadTrajectory(ex)           — fetches assets/animations/${ex}.json and
 *                                stores the result (or null) in trajectoryCache.
 * drawHowToSkeleton(w, h, ex)  — if trajectoryCache[ex] is truthy, renders
 *                                from trajectory; else falls back to keyframes.
 * idleGuideTick(ts)            — calls drawGuide() every ~65 ms during idle;
 *                                drawGuide() calls drawHowToSkeleton() when
 *                                workoutState === 'idle'.
 */

import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  jumpToWorkout,
  switchExercise,
  getRepCounterText,
  guideCanvasHasPixels,
  getGuideCanvasFingerprint,
  mockTrajectory,
} from './_helpers';

test.describe('how-to animation loading — trajectory path', () => {
  test('trajectory JSON is fetched when an exercise with a shipped animation is active', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Set up the waiter BEFORE triggering the exercise switch — the first idle
    // tick after switchExercise calls loadTrajectory('squat') which fires the fetch.
    const responsePromise = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 2000 },
    );
    await switchExercise(page, 'squat');
    const response = await responsePromise;

    const body = await response.json();
    expect(body).toHaveProperty('exercise');
    expect(body).toHaveProperty('period_ms');
    expect(body).toHaveProperty('frame_count');
    expect(body).toHaveProperty('landmarks');
    expect(body).toHaveProperty('visibility');
  });

  test('#guide-canvas has drawn pixels after trajectory load during idle', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    const responsePromise = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 2000 },
    );
    await switchExercise(page, 'squat');
    await responsePromise;

    await expect(page.locator('#guide-canvas')).toBeVisible();

    // Give idleGuideTick (~65 ms) a couple of cycles to draw the first trajectory frame.
    await page.waitForTimeout(200);
    expect(await guideCanvasHasPixels(page)).toBe(true);
  });

  test('how-to animation progresses over time (canvas fingerprint changes across frames)', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    const responsePromise = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 2000 },
    );
    await switchExercise(page, 'squat');
    await responsePromise;

    // Let one idle tick draw a trajectory frame before sampling f1, so f1 is
    // definitely from the trajectory path (not from a keyframe-fallback frame
    // captured before the JSON loaded).
    await page.waitForTimeout(100);
    const f1 = await getGuideCanvasFingerprint(page);
    expect(f1).not.toBe('');

    // 400 ms ≈ 13% of the 3000 ms trajectory period — well past the ease-in-out
    // inflection, so a 16x16 fingerprint will differ. idleGuideTick is 65 ms,
    // so roughly 6 fresh frames land in this gap.
    await page.waitForTimeout(400);
    const f2 = await getGuideCanvasFingerprint(page);
    expect(f2).not.toBe('');
    expect(f1).not.toBe(f2);
  });

  test('missing trajectory JSON does not crash the app (falls back to keyframes)', async ({ page }) => {
    // Mock BEFORE loadPage so the very first fetch of squat.json hits the 404.
    await mockTrajectory(page, 'squat', 'missing');

    const errors: Error[] = [];
    page.on('pageerror', (e) => errors.push(e));

    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'squat');

    // Let idle ticks run; keyframe fallback should draw pixels for squat
    // (HOW_TO_KEYFRAMES.squat exists).
    await page.waitForTimeout(300);
    expect(await guideCanvasHasPixels(page)).toBe(true);
    expect(await getRepCounterText(page)).toBe('0');

    // Unrelated exercises are unaffected — pullup's route is not mocked, so
    // its trajectory JSON should load normally.
    const pullupPromise = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/pullup.json') && r.status() === 200,
      { timeout: 2000 },
    );
    await switchExercise(page, 'pullup');
    await pullupPromise;

    expect(errors).toHaveLength(0);
  });

  test('malformed trajectory JSON does not crash the app', async ({ page }) => {
    // 200 OK + invalid JSON body → r.json() rejects → loader's .catch sets
    // trajectoryCache[ex] = null → drawHowToSkeleton falls back to keyframes.
    await mockTrajectory(page, 'squat', 'malformed');

    const errors: Error[] = [];
    page.on('pageerror', (e) => errors.push(e));

    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'squat');

    await page.waitForTimeout(300);
    expect(await guideCanvasHasPixels(page)).toBe(true);
    expect(await getRepCounterText(page)).toBe('0');
    expect(errors).toHaveLength(0);
  });

  test('empty JSON body (200 + "null") is treated as missing', async ({ page }) => {
    // 200 OK + body "null" → r.json() resolves to null → cache stores null →
    // drawHowToSkeleton falls back to keyframes. Behaviourally identical to
    // the 404 and malformed cases, but pins the third branch of the loader.
    await mockTrajectory(page, 'squat', 'empty');

    const errors: Error[] = [];
    page.on('pageerror', (e) => errors.push(e));

    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'squat');

    await page.waitForTimeout(300);
    expect(await guideCanvasHasPixels(page)).toBe(true);
    expect(await getRepCounterText(page)).toBe('0');
    expect(errors).toHaveLength(0);
  });
});
