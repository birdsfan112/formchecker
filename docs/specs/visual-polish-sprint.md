## Status
| Field | Value |
|-------|-------|
| Phase | Phase 5 — Visual Polish |
| Updated | 2026-04-07 |
| Summary | Spec written; no implementation started. Parked until core exercise library is complete. |
| Next Session | Decide between PNG silhouettes vs. canvas-drawn approach before starting |

# Visual Polish Sprint — Silhouettes & How-To Animations

**Goal:** Replace drawn-in-code silhouette outlines with photorealistic PNG silhouettes, and add looping skeleton animations that show correct movement form while idle on each exercise.

---

## Approach

### Silhouettes — PNG base64 in-HTML
Generate a photorealistic transparent-background PNG silhouette for each of the 13 exercises using an image generator (one pose per exercise — the canonical "in position" view). Convert each to a base64 data URI and embed directly in `index.html` as `<img>` tags or CSS background-image values. The existing `drawGuide()` canvas overlay remains for alignment tinting and the floor line; the PNG renders beneath it as a visual reference. Single-file constraint preserved — no external assets.

### How-to animations — CSS-animated MediaPipe skeleton
For each exercise, define a small keyframe sequence (2–4 poses as arrays of [x, y] landmark positions) representing the correct movement arc. While the app is idle on that exercise, loop through the keyframe poses using CSS animations or a lightweight `requestAnimationFrame` loop, drawing the skeleton on the guide canvas. Reuses the existing `drawConnectors`/`drawLandmarks` helpers — no new dependencies. Shows the user exactly what the movement looks like before they start.

### Why this approach
- **PNGs over canvas-drawn shapes**: Canvas silhouettes required precise coordinate math per exercise; photo-quality PNGs are instantly readable at 6+ feet and don't need redrawing on every frame.
- **Base64 embed**: Keeps the single-file constraint. No CDN, no extra HTTP requests.
- **CSS-animated skeleton over video**: Consistent with the app's visual language (MediaPipe skeleton), zero file size overhead, loops infinitely without user interaction.
- **No new ML models or libraries**: Everything runs on existing draw utilities.

---

## Tasks

### Silhouettes
- [ ] Generate PNG silhouettes for all 13 exercises (transparent background, side or front profile matching current camera angle per exercise)
  - Exercises: push-ups, squats, pull-ups, lunges, plank, pike push-ups, dips, dead hang, leg raises, inverted rows, L-sit, pistol squat, glute bridge
- [ ] Convert each PNG to base64 data URI
- [ ] Add an `img` element (or CSS background) for the silhouette in the canvas container, positioned to align with the guide overlay
- [ ] Show/hide the correct silhouette when exercise changes (mirrors existing drawGuide logic)
- [ ] Confirm silhouettes render correctly on phone at 6+ feet — must be readable without labels

### How-to animations
- [ ] For each exercise, define 2–4 keyframe landmark arrays (normalized 0–1 coordinates) representing the movement arc (e.g., pushup: arms extended → arms bent at bottom)
- [ ] Build a `playHowToAnimation(exercise)` function: cycles through keyframes at ~1s per step using `setInterval` or `requestAnimationFrame`, draws skeleton on guide canvas
- [ ] Trigger animation when app enters idle state on an exercise; cancel when workout starts or exercise changes
- [ ] Confirm animation doesn't interfere with `checkPositioning` (green tint) or `drawGuide` floor line — layering order matters
- [ ] Phone test: does animation loop smoothly at 6+ feet? Is the movement arc clear?

### Integration
- [ ] Write regression tests confirming: exercise change shows correct silhouette, animation starts on idle and stops on workout start
- [ ] Update `docs/architecture-map.md` to document new silhouette layer and animation function
