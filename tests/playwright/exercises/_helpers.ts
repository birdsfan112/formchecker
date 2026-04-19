/**
 * Shared helpers for FormChecker Playwright smoke tests.
 *
 * ARCHITECTURE NOTE — why globals aren't accessible
 * --------------------------------------------------
 * ALL app code in index.html is wrapped in window.addEventListener('load', fn).
 * This means exerciseRegistry, addExercise, and every other app variable is in
 * the load callback's CLOSURE, not the global scope. page.evaluate() / page
 * .waitForFunction() can only reach the global scope, so (window as any)
 * .exerciseRegistry is always undefined. Do not try to access app state via
 * window.* globals — it cannot work without modifying the app.
 *
 * TEST STRATEGY
 * -------------
 * Use observable DOM state instead:
 *   - Welcome screen + buttons    → confirms page loaded + HTML parsed
 *   - #exercise-select options    → confirms exercise is registered (options are
 *                                   hardcoded in HTML to match registry)
 *   - Option text "(timed)"       → proxy for isTimed
 *   - #camera-permission hidden   → confirms load callback ran + click handler
 *                                   was registered + startCamera() ran
 *   - #rep-counter text = "0"     → confirms idle state reached after camera init
 *   - #exercise-name text         → confirms exercise switcher works
 *
 * CDN MOCKING
 * -----------
 * index.html loads MediaPipe from cdn.jsdelivr.net via blocking <script> tags.
 * loadPage() uses:
 *   - page.addInitScript: pre-defines window.Pose/Camera/drawConnectors so the
 *     load callback doesn't fail when CDN scripts return empty bodies.
 *   - page.route(/cdn.jsdelivr.net/): returns empty JS bodies so the browser
 *     doesn't hang waiting for real CDN. Add CORS header to satisfy crossorigin="anonymous".
 */
import { Page, Route, expect } from '@playwright/test';

// ---------- MediaPipe stub strings ----------

// Expose each Pose instance on window.__poseInstance so tests can call
// __poseInstance._cb({poseLandmarks: [...]}) to inject fake landmark frames.
const POSE_STUB = `
window.Pose = class Pose {
  constructor(config) { this._cb = null; window.__poseInstance = this; }
  setOptions(opts) {}
  onResults(cb) { this._cb = cb; }
  async send(input) {}
  close() {}
};
`;

// Camera.start() must resolve so startCamera()'s loading screen hides.
const CAMERA_STUB = `
window.Camera = class Camera {
  constructor(videoEl, config) {}
  async start() { return; }
  stop() {}
};
`;

const DRAWING_STUB = `
window.drawConnectors   = function() {};
window.drawLandmarks    = function() {};
window.POSE_CONNECTIONS = [];
`;

// Stub HTMLVideoElement.play() so it resolves immediately.
// Without this, startCamera() hangs at `await video.play()` in headless Chrome
// and never reaches `loading.classList.add('hidden')` or setWorkoutState('idle').
// The Camera stub already skips real frame processing — this just unblocks startup.
const VIDEO_STUB = `
HTMLVideoElement.prototype.play = async function() { return; };
`;

// Combined stub injected before any page script runs.
const MEDIAPIPE_INIT_SCRIPT = POSE_STUB + CAMERA_STUB + DRAWING_STUB + VIDEO_STUB;

// ---------- Public helpers ----------

/**
 * Navigate to the app with MediaPipe CDN mocked.
 *
 * Two-layer approach:
 *  1. addInitScript: defines Pose/Camera/drawing globals BEFORE any script runs,
 *     so the inline load callback finds them when it executes.
 *  2. page.route regex: intercepts cdn.jsdelivr.net and returns empty JS bodies
 *     WITH Access-Control-Allow-Origin so crossorigin="anonymous" doesn't fail.
 *
 * By the time goto() resolves ('load' waitUntil), the window.addEventListener
 * ('load', ...) callback has completed and all 22 exercises are registered in
 * its closure.
 */
export async function loadPage(page: Page): Promise<void> {
  await page.addInitScript(MEDIAPIPE_INIT_SCRIPT);

  await page.route(/cdn\.jsdelivr\.net/, async (route) => {
    const url = route.request().url();
    if (url.endsWith('.js')) {
      // Empty JS body — Pose/Camera/drawing are already defined by initScript.
      // Include CORS header so crossorigin="anonymous" attribute is satisfied.
      return route.fulfill({
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '',
      });
    }
    // WASM / model binary files
    return route.fulfill({
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: Buffer.from(''),
    });
  });

  // waitUntil: 'load' ensures window.addEventListener('load', ...) callback
  // has completed before this resolves.
  await page.goto('/', { waitUntil: 'load' });
}

/**
 * Wait for the welcome screen to be visible. This is the safe "page is ready"
 * signal — it confirms HTML parsed correctly and no script crashed the page.
 * goto(..., { waitUntil: 'load' }) already runs the load callback synchronously,
 * so the registry is populated by the time this check runs.
 */
export async function waitForApp(page: Page): Promise<void> {
  await expect(page.locator('#camera-permission')).toBeVisible({ timeout: 10_000 });
}

/**
 * Check whether an exercise ID exists in the hidden <select> (which mirrors
 * the exerciseRegistry exactly — the HTML is the source of truth for exercise IDs).
 */
export async function exerciseExistsInSelect(page: Page, id: string): Promise<boolean> {
  return page.evaluate((exerciseId) => {
    const sel = document.getElementById('exercise-select') as HTMLSelectElement;
    return Array.from(sel.options).some(o => o.value === exerciseId);
  }, id);
}

/**
 * Check whether an exercise's <option> text contains "(timed)" — the same
 * convention used in every timed exercise's name.
 */
export async function exerciseIsTimed(page: Page, id: string): Promise<boolean> {
  return page.evaluate((exerciseId) => {
    const sel = document.getElementById('exercise-select') as HTMLSelectElement;
    const opt = Array.from(sel.options).find(o => o.value === exerciseId);
    return !!opt && opt.text.includes('(timed)');
  }, id);
}

/**
 * Get all exercise IDs from the hidden <select>.
 */
export async function getAllExerciseIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const sel = document.getElementById('exercise-select') as HTMLSelectElement;
    return Array.from(sel.options).map(o => o.value).filter(Boolean);
  });
}

/**
 * Click "Jump to Workout" and wait for welcome overlay to hide.
 *
 * startCamera() hides #camera-permission synchronously then calls
 * getUserMedia() + Camera.start() (stub, resolves immediately) + setWorkoutState('idle').
 * The app is in idle state when this resolves.
 */
export async function jumpToWorkout(page: Page): Promise<void> {
  await expect(page.locator('#camera-permission')).toBeVisible();
  await page.locator('#btn-jump-workout').click();
  await expect(page.locator('#camera-permission')).toBeHidden({ timeout: 10_000 });
}

/**
 * Switch exercise via the hidden <select> (same code path as the exercise picker).
 */
export async function switchExercise(page: Page, exerciseId: string): Promise<void> {
  await page.evaluate((id) => {
    const sel = document.getElementById('exercise-select') as HTMLSelectElement;
    sel.value = id;
    sel.dispatchEvent(new Event('change'));
  }, exerciseId);
}

/** Read #exercise-name DOM text (works while loading overlay is covering it). */
export async function getExerciseName(page: Page): Promise<string> {
  return page.evaluate(
    () => (document.getElementById('exercise-name') as HTMLElement).textContent ?? ''
  );
}

/** Read #rep-counter DOM text. */
export async function getRepCounterText(page: Page): Promise<string> {
  return page.evaluate(
    () => (document.getElementById('rep-counter') as HTMLElement).textContent ?? ''
  );
}

/**
 * Fire the "Ready" click and wait for the 3-second countdown to complete.
 *
 * WHY page.evaluate + dispatchEvent (not page.locator.click or { force: true }):
 *   After jumpToWorkout(), #loading is covering the viewport (getUserMedia hangs in
 *   headless Chrome). Playwright's { force: true } bypasses actionability checks but
 *   still fires a real mouse event — which #loading intercepts at the OS level.
 *   dispatchEvent goes directly to #btn-start's event listeners without routing
 *   through the compositor, so #loading doesn't block it.
 *
 * state.workoutState starts as 'idle', so the click handler calls startCountdown().
 * #btn-pause is visible only in 'active' state — use it as the active-state signal.
 * Takes ~3.5 s total (3 s countdown + 0.5 s setTimeout before setWorkoutState).
 */
export async function startWorkout(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.getElementById('btn-start') as HTMLElement)
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#btn-pause')).toBeVisible({ timeout: 8_000 });
}

/**
 * Build a full array of 33 MediaPipe pose landmarks, all defaulting to
 * { x: 0.5, y: 0.5, z: 0, visibility: 1 }, with selective overrides.
 *
 * Usage: makeLandmarks({ 15: { x: 0.1, y: 0.3 }, 16: { x: 0.9, y: 0.3 } })
 */
export function makeLandmarks(
  overrides: Record<number, Partial<{ x: number; y: number; z: number; visibility: number }>> = {}
): Array<{ x: number; y: number; z: number; visibility: number }> {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.5, y: 0.5, z: 0, visibility: 1,
    ...overrides[i],
  }));
}

/**
 * Inject a fake MediaPipe pose result frame directly into the app's onResults
 * callback. Works because the Pose stub stores the callback in __poseInstance._cb.
 *
 * The app only calls analyze() when workoutState === 'active' and isInPosition
 * returns true — callers must ensure both conditions hold.
 */
export async function injectPoseFrame(
  page: Page,
  landmarks: Array<{ x: number; y: number; z: number; visibility: number }>
): Promise<void> {
  await page.evaluate((lm) => {
    const pose = (window as any).__poseInstance;
    if (pose && typeof pose._cb === 'function') {
      pose._cb({ poseLandmarks: lm, poseWorldLandmarks: lm });
    }
  }, landmarks);
}

// ---------- Guide-canvas helpers (trajectory animation) ----------

/**
 * True iff any pixel on #guide-canvas has non-zero alpha — i.e. something was
 * drawn. Used to prove drawHowToSkeletonFromTrajectory (or its keyframe
 * fallback) ran without throwing.
 */
export async function guideCanvasHasPixels(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const c = document.getElementById('guide-canvas') as HTMLCanvasElement;
    if (!c || c.width === 0 || c.height === 0) return false;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  });
}

/**
 * Return a cheap fingerprint of the guide canvas: a hex string of a 16x16
 * nearest-neighbour downsample of the full canvas, computed inside the page
 * so we don't ship the full ImageData over the CDP wire. Two fingerprints
 * sampled at different animation phases should differ.
 */
export async function getGuideCanvasFingerprint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const c = document.getElementById('guide-canvas') as HTMLCanvasElement;
    if (!c || c.width === 0 || c.height === 0) return '';
    const tmp = document.createElement('canvas');
    tmp.width = 16;
    tmp.height = 16;
    const tctx = tmp.getContext('2d');
    if (!tctx) return '';
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(c, 0, 0, 16, 16);
    const data = tctx.getImageData(0, 0, 16, 16).data;
    let hex = '';
    for (let i = 0; i < data.length; i += 4) {
      // Pack R/G/B/A nibbles into a compact hex string — lossy but stable.
      const v = ((data[i] >> 4) << 12) | ((data[i + 1] >> 4) << 8)
              | ((data[i + 2] >> 4) << 4) | (data[i + 3] >> 4);
      hex += v.toString(16).padStart(4, '0');
    }
    return hex;
  });
}

/**
 * Route-intercept the trajectory JSON fetch for a single exercise id.
 *   'missing'   — respond HTTP 404 (loader takes the `!r.ok` → null branch)
 *   'malformed' — respond HTTP 200 with invalid JSON (loader's r.json() throws → .catch)
 *   'empty'     — respond HTTP 200 with body "null" (loader stores null directly)
 *
 * Playwright routes are additive and URL patterns are distinct from the
 * cdn.jsdelivr.net mock in loadPage(), so this can be called either before
 * or after loadPage(). Call before loadPage() to guarantee the route is
 * registered before the very first fetch.
 */
export async function mockTrajectory(
  page: Page,
  exerciseId: string,
  mode: 'missing' | 'malformed' | 'empty',
): Promise<void> {
  await page.route(`**/assets/animations/${exerciseId}.json`, async (route: Route) => {
    if (mode === 'missing') {
      return route.fulfill({ status: 404, body: '' });
    }
    if (mode === 'malformed') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{not-json',
      });
    }
    // 'empty'
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });
}
