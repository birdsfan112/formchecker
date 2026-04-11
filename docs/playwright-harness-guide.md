# Playwright Test Harness Guide

FormChecker automated smoke tests: how the harness works, how to run it, and how to expand it.

---

## Quick start

```bash
# Install deps (once)
npm install

# Run all tests
npm run test:playwright

# Run a specific file
npx playwright test squat-rep-counter

# Show browser (headed mode, useful for debugging)
npx playwright test --headed
```

Tests run in ~25 seconds and require no real webcam.

---

## Architecture

### Why DOM state instead of JS globals

All app code in `index.html` is wrapped in a single `window.addEventListener('load', fn)` callback (line 360). This puts `exerciseRegistry`, `addExercise`, and every other app variable in a **closure** — they are not accessible on `window.*` and cannot be reached by `page.evaluate()`.

The harness works around this by reading **observable DOM state** instead:

| What to check | DOM hook |
|---|---|
| Exercise exists in registry | `#exercise-select option[value="<id>"]` |
| Exercise is timed | Option text contains `(timed)` |
| All exercises registered | Count of `#exercise-select` options |
| Page loaded + JS ran | `#camera-permission` visible |
| App in idle state | `#camera-permission` hidden after click |
| Current exercise name | `#exercise-name` text content |
| Rep/timer display | `#rep-counter` text content |

### MediaPipe CDN mocking

`index.html` loads MediaPipe v0.5 via three blocking `<script crossorigin="anonymous">` tags from `cdn.jsdelivr.net`. Without mocking, `page.goto()` hangs waiting for the CDN.

`loadPage()` in `_helpers.ts` does two things:

1. **`page.addInitScript()`** — injects stub classes (`Pose`, `Camera`, `drawConnectors`, etc.) into the page *before any script runs*, so the inline load callback finds them already defined.

2. **`page.route(/cdn\.jsdelivr\.net/)`** — intercepts all CDN requests and returns empty JavaScript bodies with `Access-Control-Allow-Origin: *`. The CORS header is required because the `<script>` tags have `crossorigin="anonymous"`.

```
addInitScript → stubs defined before page scripts run
page.route    → CDN scripts return instantly (empty body)
page.goto     → load event fires, callback runs, 22 exercises registered
```

### Fake webcam

`playwright.config.ts` passes Chrome flags to inject a Y4M file as the camera device:

```
--use-fake-device-for-media-stream
--use-file-for-fake-video-capture=tests/playwright/fixtures/black-frame-320x240.y4m
```

The stub file is a single black frame at 320×240 / 1fps. Chrome loops it indefinitely. MediaPipe receives all-black frames and returns `poseLandmarks = null` every frame — so the rep counter stays at 0 and no form cues fire.

---

## Helpers (`tests/playwright/exercises/_helpers.ts`)

| Export | Purpose |
|---|---|
| `loadPage(page)` | Navigate with CDN mocked; resolves after load callback completes |
| `waitForApp(page)` | Wait for welcome screen (confirms page + JS are healthy) |
| `exerciseExistsInSelect(page, id)` | Returns true if id is in the hidden `<select>` |
| `exerciseIsTimed(page, id)` | Returns true if option text contains `(timed)` |
| `getAllExerciseIds(page)` | Returns all option values (regression: count should be 22) |
| `jumpToWorkout(page)` | Click "Jump to Workout", wait for welcome overlay to hide |
| `switchExercise(page, id)` | Set `<select>` value + dispatch change event |
| `getExerciseName(page)` | Read `#exercise-name` text |
| `getRepCounterText(page)` | Read `#rep-counter` text |

---

## File layout

```
tests/playwright/
├── exercises/
│   ├── _helpers.ts              ← shared helpers (read before modifying)
│   ├── squat-rep-counter.spec.ts   ← real test: rep-counter category
│   ├── deadhang-pose-hold.spec.ts  ← real test: pose-hold category
│   ├── catcow-mobility.spec.ts     ← real test: mobility category
│   ├── pushup.spec.ts           ┐
│   ├── lunge.spec.ts            │  placeholder tests (19 files)
│   ├── ...                      ┘  each needs a Y4M recording to expand
└── fixtures/
    ├── black-frame-320x240.y4m  ← stub webcam input (no human = reps stay at 0)
    ├── generate-stubs.js        ← script that generated black-frame-*.y4m
    ├── write-placeholders.js    ← script that generated placeholder spec files
    └── README.md                ← Y4M format reference + ffmpeg commands
```

---

## Expanding a placeholder test

1. **Record a Y4M file** with the exercise visible:

   ```bash
   # Record 30 seconds of webcam
   ffmpeg -f avfoundation -i "0" -t 30 -pix_fmt yuv420p \
     tests/playwright/fixtures/squat-reps.y4m
   ```

2. **Update `playwright.config.ts`** to point at the new Y4M:
   ```ts
   `--use-file-for-fake-video-capture=${Y4M_STUB}` // change Y4M_STUB
   ```
   Or add a new project per exercise type if you need multiple recordings.

3. **Expand the placeholder spec** with pose-detection assertions. The test stub has a `TODO` comment listing what to assert.

4. **Simulate pose results** by calling `pose._cb({poseLandmarks: [...]})` from `page.evaluate()` after navigating to workout state. The Pose stub stores the `onResults` callback in `this._cb`.

---

## Key constraints — do not break

- **Do not modify `index.html`** to expose globals. The DOM-observation strategy keeps tests decoupled from app implementation.
- **Do not remove `Access-Control-Allow-Origin: *`** from route handlers. CDN scripts have `crossorigin="anonymous"` — missing CORS header blocks script load.
- **Do not change `waitUntil: 'load'`** in `page.goto()`. The `'load'` event is what triggers the inline callback. `'domcontentloaded'` fires too early.
- **Keep the black-frame Y4M in the repo**. It's 112 KB and is the authoritative stub for headless runs.
