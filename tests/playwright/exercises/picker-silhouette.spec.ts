/**
 * Picker silhouette tests (Step 5.6 — exercise signature schema).
 *
 * Verifies that:
 * 1. Picker cards render silhouettes from signature landmarks when available
 * 2. Picker cards fall back to SVG when signature is missing
 * 3. Version-mismatch signatures log a console.warn
 * 4. Signatures with unexpected schema_version log a console.warn
 *
 * PICKER LOAD TIMING
 * ------------------
 * renderPickerSilhouetteFromSignature reads from trajectoryCache[ex].
 * trajectoryCache is ONLY populated by loadTrajectory(), which is called from
 * drawHowToSkeleton() during the idle draw loop — i.e. when the exercise
 * becomes active. Opening the picker does NOT itself fetch trajectory JSON
 * (by design per spec §8.4 "fall back to the existing EXERCISE_SVGS path"
 * when the signature hasn't loaded yet).
 *
 * So these tests switch to the exercise first (which kicks off loadTrajectory),
 * wait for the fetch to resolve, then open the picker and inspect the card.
 *
 * CLICK DISPATCH
 * --------------
 * After jumpToWorkout(), #loading is covering the viewport (getUserMedia hangs
 * in headless Chrome). Playwright's click routes through the compositor and
 * #loading intercepts it. Use page.evaluate + dispatchEvent to hit the button
 * handler directly (same pattern as startWorkout in _helpers.ts).
 */
import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  jumpToWorkout,
  switchExercise,
  mockTrajectory,
} from './_helpers';

// Open the exercise picker by dispatching a click event directly to the button.
// See CLICK DISPATCH note above for why we can't use page.locator.click().
async function openPicker(page): Promise<void> {
  await page.evaluate(() => {
    (document.getElementById('btn-exercise-picker') as HTMLElement)
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#exercise-picker')).toBeVisible({ timeout: 5_000 });
}

test.describe('picker silhouette rendering (Step 5.6)', () => {
  test('picker card renders silhouette from signature when available', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Switch to squat — this triggers loadTrajectory('squat') on the next idle tick.
    const squatResponse = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 5000 },
    );
    await switchExercise(page, 'squat');
    await squatResponse;

    // Give validateSignature a moment to resolve and populate trajectoryCache.
    await page.waitForTimeout(150);

    // Open the picker now that squat's signature is cached.
    await openPicker(page);

    // Find the squat card's img element
    const squatImg = page.locator('.exercise-card[data-exercise="squat"] img');
    await expect(squatImg).toBeVisible();

    // Check data-silhouette-source attribute
    const source = await squatImg.getAttribute('data-silhouette-source');
    expect(source).toBe('signature');

    // Verify the src is a PNG data URL (rendered from canvas)
    const src = await squatImg.getAttribute('src');
    expect(src).toContain('data:image/png');
  });

  test('picker card falls back to SVG when signature is missing', async ({ page }) => {
    // Mock pushup as missing BEFORE loadPage so the default-exercise fetch 404s.
    // (Pushup is the default active exercise at startup, so its trajectory fetches
    // immediately during the first idle tick.)
    await mockTrajectory(page, 'pushup', 'missing');
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // After jumpToWorkout, the idle draw loop triggers loadTrajectory('pushup').
    // Give that fetch + the .catch handler time to settle trajectoryCache['pushup'] = null.
    await page.waitForTimeout(500);

    // Open the picker
    await openPicker(page);

    // Find the pushup card's img element
    const pushupImg = page.locator('.exercise-card[data-exercise="pushup"] img');
    await expect(pushupImg).toBeVisible();

    // Check data-silhouette-source attribute
    const source = await pushupImg.getAttribute('data-silhouette-source');
    expect(source).toBe('svg-fallback');

    // Verify the src is an SVG data URL
    const src = await pushupImg.getAttribute('src');
    expect(src).toContain('data:image/svg+xml');
  });

  test('console.warn fires on signature version mismatch', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    // Mock squat with version mismatch
    await mockTrajectory(page, 'squat', 'version_mismatch');
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Switching to squat triggers loadTrajectory → validateSignature → warn.
    const squatResponse = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 5000 },
    );
    await switchExercise(page, 'squat');
    await squatResponse;

    // Give validateSignature a moment to log the warn.
    await page.waitForTimeout(200);

    // Check for version mismatch warning
    const mismatchWarning = consoleMessages.find(
      msg => msg.includes('version mismatch') || msg.includes('MediaPipe version')
    );
    expect(mismatchWarning).toBeTruthy();
  });

  test('signature validation warns on unexpected schema version', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    // Create a custom mock with schema_version: 99.
    // Register the route BEFORE loadPage so the very first fetch hits this body.
    await page.route('**/assets/animations/squat.json', async (route) => {
      const badSig = {
        schema_version: 99, // Unexpected version
        exercise: 'squat',
        canonical_reps: [{
          rep_id: 0,
          period_ms: 3000,
          frame_count: 60,
          landmarks: Array(60).fill(Array(33).fill([0.5, 0.5])),
          visibility: Array(60).fill(Array(33).fill(0.9)),
          angle_timeseries: {},
          phases: [],
          rom_advisory: {},
        }],
        provenance: {
          mediapipe_app_version: '0.5.1675469404',
        },
        joint_weights: {},
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(badSig),
      });
    });

    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);

    // Trigger squat signature load via switchExercise.
    const squatResponse = page.waitForResponse(
      r => r.url().endsWith('/assets/animations/squat.json') && r.status() === 200,
      { timeout: 5000 },
    );
    await switchExercise(page, 'squat');
    await squatResponse;

    await page.waitForTimeout(200);

    // Check for schema version warning
    const schemaWarning = consoleMessages.find(
      msg => msg.includes('schema_version') || msg.includes('Unexpected schema')
    );
    expect(schemaWarning).toBeTruthy();
  });
});
