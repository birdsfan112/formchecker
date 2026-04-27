# Picker PNG Manual Prompts

Companion to `picker-png-rebuild.md`. Use this file to generate the 22 silhouettes one at a time via ChatGPT, Gemini, DALL-E, or any other image generator. Drop each result into `assets/silhouettes/<id>.png`.

## How to use

1. **Generate `dip` first** — this is the style anchor. Compare every later image to it for visual consistency (white-fill body, thin dark contour lines, transparent or white background, equipment in matching minimalist style).
2. Copy a prompt block, paste into your generator of choice, generate.
3. If the result is clearly wrong (wrong pose, wrong equipment, color leakage), regenerate with the same prompt — diffusion models are stochastic, often the next attempt is better.
4. Save as the indicated filename (lowercase, exact spelling).
5. Squint test: at thumbnail size, can you tell which exercise it is? If not, regenerate with a different angle from `picker-png-rebuild.md` per-exercise table.
6. **Asset spec:** target 1024×1024, transparent background preferred, ≤60 KB after PNG optimization. If the generator gives you a JPEG or oversized PNG, run through https://tinypng.com or `pngquant` before dropping in.

## Distinguishing-pair reminders (highest look-alike risk)

- `glutebridge` vs `foamroller` — foam roller MUST have the cylinder unmistakably visible under the upper back.
- `catcow` vs `birddog` — cat-cow has all four limbs grounded; bird-dog has one arm + opposite leg extended off the floor.
- `deadhang` vs `archhang` vs `scapularpull` — all hang from a bar. Dead = passive arms straight. Arch = chest pulled up. Scapular = arms straight (no bend) but shoulders pulled down hard.
- `pullup` vs `legraise` — pull-up is chin over bar; leg raise is straight arms with legs lifted to ~90°.
- `shoulderdislocate` vs `bandpullapart` — dislocate is arms overhead; band pull-apart is arms at chest height.

---

## 1. `dip.png` — Dips (STYLE ANCHOR — generate first)

```
Minimalist solid-white silhouette of an athletic male figure performing a parallel bar dip at the top of the rep, front three-quarter view. Body high above the bars with arms locked straight down, knees bent and tucked up behind the body, hands gripping the two bars. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). Two parallel dip bars visible in perspective, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 2. `pushup.png` — Push-ups

```
Minimalist solid-white silhouette of an athletic male figure performing a push-up at the bottom of the rep with chest near the floor, side view facing right. Body horizontal, arms bent at the elbows, hips in line with shoulders and heels. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 3. `squat.png` — Squats

```
Minimalist solid-white silhouette of an athletic male figure performing a squat at the bottom of a deep rep, side view facing right. Hips below the knees, torso upright, arms extended forward for balance. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 4. `lunge.png` — Lunges

```
Minimalist solid-white silhouette of an athletic male figure performing a lunge at the bottom of the rep, side view facing right. Front knee bent at 90 degrees, rear knee near the floor, torso upright. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 5. `pistol.png` — Pistol Squats

```
Minimalist solid-white silhouette of an athletic male figure performing a single-leg pistol squat at the bottom of the rep, side view facing right. One leg deeply bent under the body, the other leg extended straight out forward and held parallel to the floor, arms extended forward for balance. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 6. `pike.png` — Pike Push-ups

```
Minimalist solid-white silhouette of an athletic male figure performing a pike push-up at the bottom of the rep, side view facing right. Body in an inverted V shape with hips high, head lowered between the hands near the floor, legs straight. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 7. `plank.png` — Plank

```
Minimalist solid-white silhouette of an athletic male figure holding a forearm plank position, side view facing right. Body horizontal in a straight line from head to heels, forearms on the floor with elbows directly under the shoulders, hips in line. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 8. `pullup.png` — Pull-ups

```
Minimalist solid-white silhouette of an athletic male figure performing a pull-up at the top of the rep, front view. Body hanging from a horizontal bar overhead, chin above the bar, elbows bent down at the sides, legs hanging straight below. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal pull-up bar visible across the top, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `legraise` by chin-over-bar position and bent elbows.

---

## 9. `row.png` — Inverted Rows

```
Minimalist solid-white silhouette of an athletic male figure performing an inverted row at the top of the pull, side view facing right. Body diagonal with heels on the floor, chest pulled up to a horizontal bar above, elbows bent and pulled back behind the body. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal bar visible above the body, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 10. `lsit.png` — L-Sit

```
Minimalist solid-white silhouette of an athletic male figure holding an L-sit, side view facing right. Body suspended on the hands with arms straight, hips lifted off the surface, legs held straight and parallel to the floor forming a clean L shape with the torso. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). Two parallel low bars under the hands, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 11. `deadhang.png` — Dead Hang

```
Minimalist solid-white silhouette of an athletic male figure in a passive dead hang, front view. Arms fully extended overhead gripping a horizontal pull-up bar, body relaxed and straight hanging below, shoulders relaxed up near the ears, legs hanging straight. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal pull-up bar visible above, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `archhang` and `scapularpull` by relaxed shoulders (not depressed) and straight neutral spine.

---

## 12. `archhang.png` — Arch Hang

```
Minimalist solid-white silhouette of an athletic male figure holding an arch hang, side view facing right. Hanging from a horizontal pull-up bar with arms straight overhead, chest pulled up close to the bar, shoulders depressed and pulled down, body in a slight backward arch. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal pull-up bar visible above, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `deadhang` by chest-up arched body, and from `scapularpull` by side view (vs front).

---

## 13. `scapularpull.png` — Scapular Pulls

```
Minimalist solid-white silhouette of an athletic male figure performing a scapular pull at the top of the rep, front view. Hanging from a horizontal pull-up bar with arms completely straight (no elbow bend), shoulders pulled down hard and back so that the body lifts slightly without any arm flexion, legs hanging straight below. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal pull-up bar visible above, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: critical that elbows remain STRAIGHT — distinguishes from `pullup`. Distinguishes from `deadhang` by depressed shoulders.

---

## 14. `legraise.png` — Hanging Leg Raises

```
Minimalist solid-white silhouette of an athletic male figure performing a hanging leg raise at the top of the rep, side view facing right. Hanging from a horizontal pull-up bar with arms completely straight overhead, legs raised straight to a horizontal position parallel to the floor at hip height. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A horizontal pull-up bar visible above, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `pullup` by straight arms and lifted legs.

---

## 15. `glutebridge.png` — Glute Bridge

```
Minimalist solid-white silhouette of an athletic male figure at the top of a glute bridge, side view facing right. Lying supine on the floor with knees bent at roughly 90 degrees and feet flat, hips lifted high so the body forms a straight line from the knees down through the shoulders, shoulders and upper back resting on the floor. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `foamroller` by NO cylinder under the back, and visible hip arch.

---

## 16. `foamroller.png` — Foam Roller

```
Minimalist solid-white silhouette of an athletic male figure lying supine on a foam roller, side view facing right. The foam roller is a horizontal cylinder placed across the upper back beneath the shoulder blades and is unmistakably visible under the body. Knees are bent with feet flat on the floor, arms relaxed at the sides or crossed on the chest. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). The foam roller cylinder rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: the cylinder is the disambiguator from `glutebridge` — make it obvious.

---

## 17. `shoulderdislocate.png` — Shoulder Dislocates

```
Minimalist solid-white silhouette of an athletic male figure performing a shoulder dislocate, mid-rotation with arms wide overhead, front view. Standing upright, both arms held wide above the head with a resistance band stretched horizontally between the hands, arms passing through the rotation overhead. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A resistance band stretched between the hands, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `bandpullapart` by arms OVERHEAD (not at chest).

---

## 18. `bandpullapart.png` — Band Pull-aparts

```
Minimalist solid-white silhouette of an athletic male figure performing a band pull-apart at the top of the rep, front view. Standing upright, arms held out horizontally at chest height with a resistance band stretched wide between the hands, palms facing down. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). A resistance band stretched between the hands at chest height, rendered in matching minimalist style. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `shoulderdislocate` by arms at CHEST HEIGHT (not overhead).

---

## 19. `hipflexor.png` — Hip Flexor Stretch

```
Minimalist solid-white silhouette of an athletic male figure holding a kneeling hip flexor stretch, side view facing right. Rear knee resting on the floor, front foot planted forward with the front knee bent at 90 degrees, hips pressed forward, torso upright with arms relaxed or hands resting on the front knee. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

---

## 20. `wristwarmup.png` — Wrist Warm-up

```
Minimalist solid-white silhouette of an athletic male figure in a quadruped wrist warm-up position, three-quarter view. On hands and knees, hands flat on the floor with fingers pointing forward and weight loaded onto the palms, wrists clearly flexed under the shoulders. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: if this doesn't read at thumbnail size, regenerate with a front view of hands held forward with wrists extended (visible wrist crease).

---

## 21. `catcow.png` — Cat-Cow

```
Minimalist solid-white silhouette of an athletic male figure in the cow position of cat-cow, side view facing right. On hands and knees in a quadruped position with all four limbs grounded, spine arched downward in a deep curve, head lifted and looking up, tailbone tilted up. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `birddog` by ALL FOUR limbs grounded and arched spine.

---

## 22. `birddog.png` — Bird Dog

```
Minimalist solid-white silhouette of an athletic male figure holding a bird dog position, side view facing right. Starting from a quadruped position on hands and knees, the right arm is extended straight forward and the left leg is extended straight back, both held parallel to the floor, hips and shoulders square to the floor. Solid white body fill with thin dark anatomical contour lines for muscle definition (chest, shoulder cuts, ab crease, knee folds). No equipment, floor implied. Transparent background. Centered figure with breathing room on all sides. Pictogram style for a fitness app icon. No shading, no gradients, no color, no text, no scenery.
```

Note: distinguishes from `catcow` by ONE arm and OPPOSITE leg lifted off the floor.

---

## After all 22 are dropped in

Run the wire-up steps from `picker-png-rebuild.md` § "Wire-up (after all 22 PNGs are dropped in)" — drop `EXERCISE_SVGS` and `getSvgKey`, swap render path to `<img src="assets/silhouettes/${id}.png">`, add `object-fit: contain` CSS, archive old SVGs, drop `dipConfig.silhouette.drawVariant`, delete `SVG_PIPELINE_NOTES.md`. Then phone-review all 22 cards at picker size for the squint test.
