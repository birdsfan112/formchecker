import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * FormChecker Playwright test configuration.
 *
 * Key design decision: Chromium's --use-file-for-fake-video-capture flag injects
 * a Y4M video file as the camera device. This lets us test the full getUserMedia()
 * → MediaPipe initialization path without a real webcam. Black-frame stubs produce
 * deterministic output (poseLandmarks = null → rep counter stays at 0).
 *
 * See docs/playwright-harness-guide.md for the full guide.
 */

// Absolute path required by Chrome's fake video capture flag.
// Forward slashes used explicitly — Chrome on Windows accepts both, but forward
// slashes avoid escaping edge cases in shell interpolation.
const Y4M_STUB = path
  .resolve(__dirname, 'tests/playwright/fixtures/black-frame-320x240.y4m')
  .replace(/\\/g, '/');

export default defineConfig({
  testDir: './tests/playwright/exercises',

  // CDN scripts are mocked in loadPage() so tests run in < 2 s.
  // 30 s is the hard cap; if a test takes longer, something is broken.
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Run tests in parallel files; within a file, keep serial order.
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,

  use: {
    baseURL: 'http://localhost:3939',
    headless: true,

    // Fake webcam: Chromium streams black-frame-320x240.y4m in a loop.
    // With no human visible, MediaPipe returns poseLandmarks = null every frame.
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${Y4M_STUB}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // MediaPipe WASM is mocked by loadPage() — no WASM actually loads.
        // Kept for when real recordings replace black-frame stubs.
      ],
    },

    // Grant camera permission automatically so tests don't hit the browser
    // permission prompt.
    permissions: ['camera'],

    // Navigation timeout: CDN is mocked so pages load in < 500 ms.
    // Set a hard cap so a missed route causes a fast, obvious failure.
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },

  // Serve FormChecker root over HTTP so MediaPipe WASM fetch() calls
  // succeed (file:// origins can hit CORS issues with CDN-fetched WASM).
  webServer: {
    command: 'python -m http.server 3939',
    url: 'http://localhost:3939',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Write HTML report to test-results/
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
  ],
});
