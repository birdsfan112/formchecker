# Picker PNG Rebuild — All 22 Silhouettes

**Status:** Spec (2026-04-24). Supersedes `picker-svg-audit-fix.md` after the dip-calibration commit (`a0215d7`) revealed the hand-coded geometric SVG approach can't hit the iconicity bar at 70×62. Old spec is preserved for history; do not work from it.

## Why the rev

The audit-fix spec scoped a bespoke SVG per problem exercise (5 of 22). The dip calibration commit shipped a hand-coded geometric SVG that, while accurate to the bottom-of-rep pose, didn't read as "dip" at picker size. A Gemini-generated reference image of the same exercise (top-of-rep, two parallel bars in perspective, solid white silhouette with thin black contour lines) read instantly. Two lessons:

1. Solid-silhouette + anatomical contour lines beat translucent-stick-figure for picker iconicity.
2. Replacing only the 5 audit targets in the new style would leave 5 polished cards next to 17 stick-figure cards — visually mixed picker. Going coherent means redoing all 22.

## Scope

- Replace **all 22** picker silhouettes.
- Format: **PNG**, transparent background, served as files from `assets/silhouettes/<id>.png`.
- Drop `EXERCISE_SVGS` and `getSvgKey` entirely. Picker `<img>` src becomes `assets/silhouettes/${id}.png` keyed on the exercise id directly.
- Live-outline render path (`drawGuideOutline` and friends) is **not touched**. `drawStyle` / `drawVariant` on each config stay as-is — they drive the in-workout overlay, not the picker.

## Asset specs

| Field | Value |
|---|---|
| Format | PNG, 8-bit RGBA |
| Source resolution | 1024 × 1024 |
| Background | Transparent |
| Figure | Solid white fill (`#FFFFFF` or near-white), thin dark contour lines (≈ 2 px at source res) for anatomical definition (chest, shoulder cuts, knee folds, ab line) |
| No | Gradients, shadows, color, text, or background elements |
| File path | `assets/silhouettes/<exerciseId>.png` (lowercase, matches config `id`) |
| Filename map | None needed — `<img src="assets/silhouettes/${id}.png">` |
| Size budget | ≤ 60 KB per PNG, ≤ 1.0 MB total across 22. PNGs of clean silhouettes compress well; if any blow past 60 KB, run through `pngquant` or equivalent. |

The dip reference image Scott generated (the one that triggered this rev) is the **style anchor**. All 22 should match its visual language: solid white body, dark contour lines for muscle/joint definition, transparent bg, equipment rendered in a coherent style, single figure centered with breathing room.

## Generation workflow

Scott generates in Gemini, drops PNGs into `assets/silhouettes/`. Per-exercise:

1. Use the **Prompt template** below, substituting the exercise name, position, view angle, and equipment from the **Per-exercise table**.
2. Save the result as `<id>.png` (transparent bg).
3. Visual check: does the silhouette read as the exercise at thumbnail size? Squint test — if it doesn't read at ~70 px, regenerate with the alternate angle.
4. Once all 22 are in, run the wire-up (next section).

### Prompt template

> Minimalist solid-white silhouette of an athletic male figure performing **[EXERCISE NAME]** at **[POSITION]**, **[VIEW ANGLE]**. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). **[EQUIPMENT]** visible and rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.

Copy-paste, fill in the four bracketed fields per the table.

## Per-exercise table

| id | Name | Position | View angle | Equipment | Key shape cue |
|---|---|---|---|---|---|
| `pushup` | Push-ups | bottom of rep, chest near floor | side | none (floor implied) | Body horizontal, arms bent, hips in line |
| `squat` | Squats | bottom of rep, deep | side | none | Hips below knees, torso upright-ish, arms forward |
| `lunge` | Lunges | bottom of rep | side | none | Front knee 90°, rear knee near floor, torso upright |
| `pistol` | Pistol Squats | bottom of rep | side | none | One leg deep squat, other leg straight forward |
| `pullup` | Pull-ups | top of rep, chin over bar | front | horizontal pull-up bar across top | Body high, chin above bar, elbows down at sides |
| `pike` | Pike Push-ups | bottom of rep | side | none (floor implied) | Inverted-V body, head near floor between hands |
| `dip` | Dips | top of rep | front 3/4 | two parallel dip bars in perspective | **Reference image**. Body high above bars, arms locked, knees tucked up |
| `row` | Inverted Rows | top of pull, chest to bar | side | horizontal bar above body | Body diagonal, heels on floor, chest near bar, elbows back |
| `plank` | Plank | hold position | side | none (floor implied) | Body horizontal, forearms (or hands) on floor, hips in line |
| `deadhang` | Dead Hang | passive hang | front | horizontal pull-up bar | Arms fully extended overhead, body relaxed below |
| `lsit` | L-Sit | hold position | side | two parallel low bars OR floor | Body suspended on hands, legs out horizontal forming "L" |
| `glutebridge` | Glute Bridge | top of rep, hips up | side | none (floor implied) | Supine, knees bent ~90°, hips arched up, shoulders on floor |
| `legraise` | Hanging Leg Raises | top of rep | side | horizontal pull-up bar | Hanging from bar, legs raised to ~90° (or higher) horizontal |
| `archhang` | Arch Hang | hold position, chest up | side | horizontal pull-up bar | Hanging, chest pulled up to bar, shoulders depressed, body slightly arched |
| `scapularpull` | Scapular Pulls | top of rep, scaps depressed | front | horizontal pull-up bar | Hanging, arms straight, shoulders pulled DOWN (no elbow bend) |
| `shoulderdislocate` | Shoulder Dislocates | mid-rotation, arms overhead | front | resistance band held wide between hands | Standing, arms wide overhead with band between hands |
| `hipflexor` | Hip Flexor Stretch | hold position | side | none (floor implied) | Kneeling lunge — rear knee on floor, front foot forward, torso upright |
| `wristwarmup` | Wrist Warm-up | hands on floor, fingers forward | 3/4 | none (floor implied) | Quadruped hand position with weight on palms, wrists flexed |
| `foamroller` | Foam Roller | supine on cylinder | side | foam roller cylinder under upper back | Supine, knees bent, cylinder visible under shoulder blades |
| `bandpullapart` | Band Pull-aparts | top of rep, arms wide | front | resistance band stretched between hands at chest height | Standing, arms out horizontal with band stretched between hands |
| `catcow` | Cat-Cow | cow position (back arched down) | side | none (floor implied) | Quadruped, back arched DOWN, head looking up — distinguishes from bird-dog |
| `birddog` | Bird Dog | hold position | side | none (floor implied) | Quadruped, opposite arm + leg extended (e.g., right arm + left leg straight out) |

**Side-view facing direction:** all side-view exercises face **right** (matches existing convention). Front views are symmetric.

**Distinguishing pairs** (highest risk of look-alike):

- `glutebridge` vs `foamroller` — both supine side-views. Foam-roller MUST have the cylinder unmistakably visible under the upper back; glute-bridge has no cylinder and visible hip arch.
- `catcow` vs `birddog` — both quadruped side-views. Cat-cow has all four limbs grounded with arched spine; bird-dog has one arm + opposite leg extended off the floor.
- `deadhang` vs `archhang` vs `scapularpull` — all hanging from a bar. Dead hang = passive arms straight, body relaxed. Arch hang = chest pulled up, shoulders depressed, body slightly arched. Scapular pull = arms straight (no elbow bend) but shoulders pulled down hard.
- `pullup` vs `legraise` — both at the bar. Pull-up is top-of-rep with chin over bar. Leg raise has straight arms with legs lifted.

## Wire-up (after all 22 PNGs are dropped in)

### 1. Replace the picker render path in `index.html`

Delete the `EXERCISE_SVGS` constant (lines ≈ 4667–4681) and `getSvgKey` (lines ≈ 4684–4700). Replace the picker render block (≈ line 4710):

```js
// before
const svgKey = getSvgKey(meta.drawStyle, meta.drawVariant);
const svgStr = EXERCISE_SVGS[svgKey] || EXERCISE_SVGS.standing;
img.src = 'data:image/svg+xml,' + encodeURIComponent(svgStr);

// after
img.src = `assets/silhouettes/${key}.png`;
img.loading = 'lazy';
```

Update the comment block above it — drop the "single-file constraint" callout (we're now shipping a folder of PNG assets).

### 2. CSS adjustment

Picker `<img>` is set to `width: 70; height: 62` via attribute. PNGs default to stretch; add `object-fit: contain` to the relevant CSS rule so square 1024×1024 source PNGs scale-to-fit within the 70×62 frame without distortion.

Find the `.exercise-card img` (or whatever the picker img selector is) and add:

```css
.exercise-card img {
  object-fit: contain;
}
```

If no specific selector exists, add one inline.

### 3. Remove or archive the source SVGs

`assets/silhouettes/*.svg` (7 files) become obsolete. Either delete or move to `assets/silhouettes/_archive/` for reference. The committed `dip.svg` from `a0215d7` is also archived.

### 4. Drop `drawVariant: 'dip'` from `dipConfig`

It was added in `a0215d7` solely for picker routing. With the new picker render path, it's unused. Other configs' `drawVariant` values stay because they ALSO drive in-workout overlay rendering (e.g., `pushup` variant feeds `drawHorizontalSide`).

Audit each existing `drawVariant` against the live-outline switch (`drawGuideOutline` at index.html:3138) and only remove the ones that are picker-only. From a quick scan:

- `dip` → picker-only (was added by `a0215d7`); REMOVE.
- `pushup`, `pike`, `plank`, `foamroller`, `birddog` → consumed by `drawHorizontalSide` / `drawQuadruped`; KEEP.

### 5. Delete `SVG_PIPELINE_NOTES.md`

It's calibration notes for a now-obsolete approach. Replace with a single line at the bottom of THIS spec capturing any aesthetic feedback that emerged during the batch generation.

## Test plan

### Manual (the primary gate)

Scott phone-reviews all 22 picker cards. Acceptance: each silhouette is recognizable as the exercise it represents at the 70×62 picker size. Squint test — if any are ambiguous, regenerate with a different angle/position from the per-exercise table.

### Playwright

The audit-fix spec called for picker assertions. Translate them to PNG:

- Per-exercise smoke test: assert the picker `<img>` `src` ends with `assets/silhouettes/${id}.png`.
- Asset existence check: a single test that fetches all 22 URLs and asserts 200 OK + `image/png` content-type.

Skip pixel-fingerprint tests; they're brittle for AI-generated content that may be regenerated.

## Acceptance criteria

1. All 22 PNGs present in `assets/silhouettes/`, transparent bg, ≤ 60 KB each.
2. Picker grid renders all 22 cards, each reads as its exercise at phone-screen picker size.
3. Live-outline rendering unchanged for all 22 exercises during a workout.
4. `EXERCISE_SVGS` and `getSvgKey` removed from `index.html`.
5. `dipConfig.silhouette.drawVariant` removed (post-audit cleanup).
6. Playwright smoke tests pass.

## Out of scope

- Animated pickers (already reverted 2026-04-20).
- Changing the picker grid layout, card size, or interaction behavior.
- Changing live-outline rendering — `drawStyle` / `drawVariant` semantics for in-workout overlays stay exactly as-is.
- Re-integrating the in-workout how-to skeleton with the new picker style. Separate concern.

## Open questions for the batch run

1. **Exact contour-line weight at 70 px:** the dip reference has thin black lines that read well. Some exercises (e.g., `wristwarmup`) may need lighter contour to avoid looking busy at thumbnail size. Adjust per-exercise in Gemini if the squint test fails.
2. **Hand orientation in `wristwarmup`:** quadruped hand-on-floor view with visible wrist flexion — may not read at picker size. Backup: front view of hands held forward with wrists extended (visible wrist crease). Decide on first generation.
3. **`shoulderdislocate` and `bandpullapart` both involve a band held wide:** distinguish by arm height (overhead vs chest-level) and motion direction. If they look-alike at 70 px, add a subtle indicator (e.g., motion arc on dislocate).

## Aesthetic feedback (post-batch — fill in after generation)

_(empty — fill in here as Scott iterates in Gemini, so the next session inherits the lessons)_
