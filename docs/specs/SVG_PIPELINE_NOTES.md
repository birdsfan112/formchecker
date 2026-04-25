# SVG Pipeline Notes — Picker Audit Fix Batch

**Purpose:** Locked-in aesthetic parameters from the dips calibration pass (2026-04-24). Apply the same params to the remaining four pickers (inverted rows, glute bridge, hip flexor stretch, foam roller) once Scott approves dips on phone review.

**Spec:** `picker-svg-audit-fix.md`.

---

## Decision: SVG fallback, not AI generation

No image API keys (`OPENAI_API_KEY`, `STABILITY_API_KEY`, `REPLICATE_API_TOKEN`) are set in the environment, and the existing 7 silhouettes are hand-coded geometric SVGs — AI-generated PNGs would not match the aesthetic anyway. The imagegen skill's SVG fallback path is the right fit. **Do not attempt AI generation for the remaining four** unless Scott provides keys and explicitly redirects.

## Source-of-truth workflow

1. Author the SVG in `assets/silhouettes/<key>.svg` (with `width`/`height` attributes and human-readable indentation/comments).
2. Hand-minify into a single-line string and add to `EXERCISE_SVGS` in `index.html` (no `width`/`height` attrs, no comments inside the string — strip them).
3. Add a routing line to `getSvgKey` (first-pass `drawVariant` check, before existing logic).
4. Set `drawVariant: '<key>'` on the matching exercise config's `silhouette`. Leave `drawStyle` alone — it drives the live-outline render path, which must stay unchanged.

## Locked aesthetic parameters

Applied to the dip silhouette. Reuse exactly for the batch.

| Element | Value | Notes |
|---|---|---|
| Stroke (primary) | `rgba(255,255,255,0.85)` | Used on `<g>` and most paths |
| Body fill | `rgba(255,255,255,0.18)` | Translucent white = "silhouette" reading on dark picker bg |
| Stroke widths | `2.5` body outline; `2.4–2.6` primary detail (visible arms/legs); `2` for secondary detail | Matches existing 7 |
| Depth/secondary opacity | `0.40–0.55` stroke, `0.55–0.65` stroke-opacity on lines | For "behind-body" elements (far arm, far leg, far bar, far rail) |
| Ground/equipment lines | `rgba(255,255,255,0.45)` width `2` for ground; `0.35–0.45` width `3–4` for bars/equipment | |
| Nose bump | `<path d="M ... L ... L ... Z" fill="rgba(255,255,255,0.85)"`, ~6–8px wide | Always points in facing direction. Use it on side / 3/4 views; skip on pure front views (see `hanging` precedent) |
| ViewBox | Per-pose, not standardized. Roughly `120×160` for vertical poses, `200×110` for horizontal poses, `130×150` for dip-style suspended. Existing examples are the reference. | Aim for the picker `70×62` aspect after preserveAspectRatio fit |
| Inline string size | ≤ 1 KB after minification | Dip came in ≈ 0.94 KB |

## Drawing technique cheatsheet

**Closed-path body parts** (filled silhouette): head circle, torso, individual leg/arm "tubes." Pattern from existing SVGs: `M start Q control mid Q control end L back ... Z`. Keep stroke + fill both set so the outline reads cleanly at 70×62.

**Open-path detail strokes**: visible arm or leg in motion. Use `path d="M ... L ... L ..."` with stroke only. The `L` points create a "Z-bend" or "L-bend" that signals joint articulation — this is the iconic move for distinguishing bent-arm from straight-arm poses.

**Depth via opacity layering**: when two of the same body part are visible (two arms in front view, two legs in side view, two bars in dip), draw the back/far one first with stroke-opacity ~0.55–0.65 and the front/near one second at full opacity. This gives layered reading without explicit z-ordering.

**Equipment markers** (bars, rings, foam rollers): draw as primary lines or small filled shapes. Add small filled `<circle>` "grip caps" where hands meet the equipment — gives visual termination so the eye knows where the body ends and the equipment starts. Used on dip; should also work for inverted-rows and foam-roller.

## Per-exercise notes (carry over to batch)

- **Inverted Rows** — Side view, body horizontal at an upward angle (chest-to-bar at top of pull). Bar above body. Visible arm bent ~90° at top of pull. Use horizontal viewBox (`~200×120`). Reuse the dip's two-bar depth cue if it's a parallel-bar setup, otherwise single bar with ring-cap or grip-cap circles at hand position.
- **Glute Bridge** — Side view, body supine (on back), hips arched up. Knees bent ~90°, feet flat on ground. Show ground line with dashed `rgba(255,255,255,0.25)` ditto-style as in `standing.svg`. ViewBox `~200×130`. No facing-direction nose bump (head on ground, in profile facing up).
- **Hip Flexor Stretch** — Side view kneeling lunge. Rear knee on ground, front foot forward, torso upright. Distinguish from `kneeling.svg` (which is quadruped/cat-cow base) by having ONE knee on ground and the other foot forward. ViewBox `~140×160`. Keep the right-facing nose bump.
- **Foam Roller** — Side view, supine on cylinder. Cylinder visible under upper back as an ellipse or short rounded rectangle. Knees bent ~45°, feet flat. Body horizontal. ViewBox `~200×130`. Cylinder fill at `rgba(255,255,255,0.30)` — slightly more opaque than body to read as "object body is on top of."

## Open questions for batch

- **Should the existing 7 source SVGs get `width`/`height` stripped to match the inline pattern?** Currently they have it; inline doesn't. Cosmetic consistency, not blocking.
- **Glute bridge vs. foam roller risk:** both are supine-on-something side views. The cylinder under the back has to be the unmistakable differentiator on foam roller — make it generously sized so it reads at 70×62.
- **Playwright unique-substring assertions:** spec calls for matching on a unique `<path d="...">` fragment per SVG. Pick one that won't collide with the other 6 existing keys. For dip, the `M 60 62 L 48 48 L 52 34` arm-bend path is unique.

## What to skip

- Don't tune width/height of the source SVGs against pixel-targets. The picker `<img width="70" height="62">` enforces sizing via aspect-fit.
- Don't add gradients, shadows, or filters. The existing aesthetic is flat translucent fill + stroke. Stay there.
- Don't introduce new colors. White-on-translucent-white only.
