## Status
| Field | Value |
|-------|-------|
| Phase | Phase 5 — Visual Polish |
| Updated | 2026-04-12 |
| Summary | Spec updated to cover all 22 exercises (was 13). Mini silhouette bug fixed: kneeling + quadruped cases added to drawMiniSilhouette(). No PNG implementation started — awaiting Scott's call on PNG vs. canvas approach. |
| Next Session | Decide on PNG silhouettes vs. improved canvas-drawn approach, then begin Step 5 implementation |

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
- [ ] Generate PNG silhouettes for all 22 exercises (transparent background, side or front profile matching current camera angle per exercise)
  - **Standing side-view** (6): Squats, Lunges, Shoulder Dislocates, Wrist Warm-up, Band Pull-Aparts, Pistol Squat
  - **Horizontal side-view** (5): Push-ups, Plank, Pike Push-ups, Glute Bridge, Foam Roller
  - **Hanging front-view** (4): Pull-ups, Dead Hang, Arch Hang, Scapular Pulls
  - **Floor rep-based / other horizontal** (3): Inverted Rows, L-Sit, Leg Raises
  - **Kneeling side-view** (1): Hip Flexor Stretch
  - **Quadruped side-view** (2): Cat-Cow, Bird-Dog
  - **Dips** (1): Dips (front-view, arms on bars at sides)
- [ ] Convert each PNG to base64 data URI
- [ ] Add an `img` element (or CSS background) for the silhouette in the canvas container, positioned to align with the guide overlay
- [ ] Show/hide the correct silhouette when exercise changes (mirrors existing drawGuide logic)
- [ ] Confirm silhouettes render correctly on phone at 6+ feet — must be readable without labels

### How-to animations
- [ ] For each exercise, define 2–4 keyframe landmark arrays (normalized 0–1 coordinates) representing the movement arc (e.g., pushup: arms extended → arms bent at bottom)
  - Rep-based exercises (pushup, squat, pullup, lunge, dip, pike, row, pistolsquat, glutebridge, bandpullapart, legraise, pullup): top position ↔ bottom position
  - Timed exercises (plank, deadhang, archhang, scapularpull, lsit, shoulderdislocate, wristwarmup, foamroller, hipflexor, catcow, birddog): hold position + slight sway or cycle
- [ ] Build a `playHowToAnimation(exercise)` function: cycles through keyframes at ~1s per step using `setInterval` or `requestAnimationFrame`, draws skeleton on guide canvas
- [ ] Trigger animation when app enters idle state on an exercise; cancel when workout starts or exercise changes
- [ ] Confirm animation doesn't interfere with `checkPositioning` (green tint) or `drawGuide` floor line — layering order matters
- [ ] Phone test: does animation loop smoothly at 6+ feet? Is the movement arc clear?

### Mini silhouettes (exercise picker cards)
- [x] Fix `drawMiniSilhouette()`: add `kneeling` and `quadruped` cases — 3 exercises (Hip Flexor Stretch, Cat-Cow, Bird-Dog) showed blank cards in the picker (2026-04-12)
- [ ] If PNG approach chosen: replace mini silhouettes in picker cards with thumbnail PNGs (scaled-down versions of full silhouettes)
- [ ] If canvas approach kept: consider upgrading mini silhouettes from stick figures to scaled-down filled shapes

### Integration
- [ ] Write regression tests confirming: exercise change shows correct silhouette, animation starts on idle and stops on workout start
- [ ] Update `docs/specs/architecture-map.md` to document new silhouette layer and animation function

---

## Decision Needed Before Step 5

**PNG vs. improved canvas approach:**

| | PNG (original plan) | Canvas-drawn (current) |
|--|--|--|
| Visual quality | Photo-realistic, instantly readable at 6+ feet | Geometric, but already filled + shaped |
| File size | +~5KB per exercise base64 encoded (~110KB total) | Zero — already in-code |
| Maintainability | Requires image generation tooling to update | Code — editable in-session |
| Effort | High — generate 22 images, convert, embed, wire | Medium — improve existing draw functions |
| Status | Not started | 5 draw functions exist, already solid quality |

The large guide silhouettes (`drawStandingSide`, `drawHorizontalSide`, `drawHangingFront`, `drawKneelingStretch`, `drawQuadruped`) are already filled shapes and high quality. The main remaining gap is the how-to animation layer (Step 5, second half).
