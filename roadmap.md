## Status
| Field | Value |
|-------|-------|
| Priority | active |
| Phase | Implement |
| Updated | 2026-04-18 |
| Summary | Step 5.5 pipeline phone-approved on 2 of 22 exercises (squat + pullup). Pullup iteration added 4 anatomical-constraint layers to `hanging_front` preset: per-pair LR correction, lateral width-lock (shoulders/elbows/wrists/hips), y-sync for bilaterally symmetric movements, finger-to-wrist rigid binding, and a 7-frame post-lock smoothing pass. All fixes generalize to other hanging exercises (deadhang, archhang, scapularpull) via the preset config — no per-exercise code. |
| Needs Scott | (1) Curate remaining 20 clip URLs in `pipeline/sources.yaml` (~2 hrs). Note each clip's facing direction. (2) Consider whether the plank/static-hold case warrants its own preset before curating statics. |
| Autonomous | Add horizontal/kneeling/quadruped presets once Scott curates an example clip of each drawStyle. `generate_picker.py` (imagegen skill). Playwright `animation-loading.spec.ts`. Retire `HOW_TO_KEYFRAMES` + `EXERCISE_SVGS` once batch lands. |
| Blockers | None |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Current Sprint

<!-- Active work only. Steps 1 and 3 are complete (noted inline). Steps 2, 4, 5 remain.
     Pre-launch checklists, QA tasks, maintenance work, and deployment prep all belong here too — not just new features. -->

### Step 1 — Framework spec open questions ✅ RESOLVED (2026-04-10)
- Closure for scoped state (Safari phone testing makes DevTools impractical)
- Auto-scaffold = schema validation only (fields, drawStyle, landmark indices, topAngle > bottomAngle)
- Picker redesign → follow-on sprint
- Visual polish spec update → after migration

### Step 2 — Scott: Phone test all 22 exercises
*Use `docs/exercise-testing-protocol.md` — 9-step checklist per exercise.*

- [x] Arch hangs / scapular pulls (timed hanging exercises, 14-15 in registry)
- [x] Mobility/PT batch — shoulder dislocates, hip flexor stretch, wrist warm-up, band pull-aparts, foam roller, cat-cow, bird-dog (exercises 16-22)
- [ ] Phone test all 22 exercises — use `docs/exercise-testing-protocol.md`

### Step 3 — Exercise framework refactor ✅ COMPLETE (2026-04-10)
*Per `docs/specs/exercise-framework-spec.md`. All 22 exercises migrated to single config-object pattern via `addExercise(config)`. Framework extensions added: `invertedPolarity` (glute bridge, band pull-aparts), `downGate(lm)` (pull-up chin-over-bar gate). Tests: 284 passing, 0 failing — includes parallel framework implementations for rep + timed analyzers in `tests.js`. Two dead-code findings filed to backlog (see Backlog §2). One minor feature dropped: per-frame camera-orientation nudge for dips (see Backlog §3).*

### Step 4 — Update visual polish spec (13 → 22 exercises) ✅ COMPLETE (2026-04-12)
*Spec updated; bonus fix: 3 blank exercise picker cards patched (kneeling + quadruped mini silhouettes added to `drawMiniSilhouette()`). See `docs/specs/visual-polish-sprint.md` for PNG-vs-canvas decision table.*

### Step 5 — Visual polish sprint (superseded by Step 5.5)
*Shipped but quality insufficient: 21 of 22 how-to animations fail on anatomy/physics/human-likeness; only pull-ups acceptable. Paradigm evaluated 2026-04-17; replacement (Step 5.5) approved. Phone test deferred until after Step 5.5 ships.*

- [x] SVG silhouettes added to picker cards — 7 shapes cover all 22 exercises (to be replaced per-exercise in Step 5.5)
- [x] How-to animation — 2-keyframe `HOW_TO_KEYFRAMES` (to be retired in Step 5.5)
- [ ] ~~Phone-test picker card SVG rendering~~ — folded into Step 5.5 phone test
- [ ] ~~Phone-test how-to animation~~ — folded into Step 5.5 phone test

### Step 5.5 — Automated asset pipeline (NEW — approved 2026-04-17)
*Per `docs/specs/animation-pipeline-implementation.md`. Paradigm rationale in `docs/specs/animation-paradigm-evaluation.md`. Source → MediaPipe Pose → canonical trajectory JSON → outputs (animation + picker PNG + ROM baseline).*

- [x] Scaffold `pipeline/` dir: `requirements.txt`, `sources.yaml`, `picker_prompts.yaml`, `exercise_angles.yaml` (2026-04-17)
- [x] Write `extract_trajectory.py` — MediaPipe Tasks API (`pose_landmarker_heavy.task`, Py 3.13 dropped `mp.solutions`); yt-dlp[curl-cffi] for Pexels; smoke-tested on squat clip → 395/395 frames detected, mean vis 0.809 (2026-04-17)
- [x] Write `normalize_loop.py` — auto cycle-detect via pelvis-y autocorrelation + 60-frame resample + 3-frame MA + seam blend; squat test: 395→49→60 frames, seam closed to 0.0000, 35.7 KB JSON (2026-04-17)
- [x] Write `emit_rom.py` — per-joint angle min/max with vis<0.6 skip; squat: knee 38°→173.5°, hip 29.7°→175.5° (60/60 samples — source clip is ATG depth, pipeline correct) (2026-04-17)
- [ ] Scott: curate `sources.yaml` — 22 clip URLs (2/22 done: squat, pullup)
- [ ] Batch-run pipeline; commit `assets/animations/*.json` + `assets/rom/*.json`
- [ ] Scott: review each trajectory via `pipeline/preview.py`
- [ ] Write `generate_picker.py` via `imagegen` skill; batch-generate 22 silhouette PNGs
- [x] App-side: trajectory loader + cache; rewrite `drawHowToSkeleton` to use `POSE_CONNECTIONS` (2026-04-17, squat shipped + phone-approved)
- [ ] App-side: swap `EXERCISE_SVGS` for per-exercise PNG map
- [ ] Add Playwright spec: `animation-loading.spec.ts`
- [ ] Run `node tests.js` + `npx playwright test` — all green
- [ ] Scott phone-tests all 22 with new animations + picker
- [ ] Delete `HOW_TO_KEYFRAMES`, `assets/silhouettes/*.svg`, `EXERCISE_SVGS`, `getSvgKey()`
- [ ] Deploy to `main`

## Backlog

<!-- Future work, roughly priority-ordered. Not checkboxes — these aren't active yet.
     If an item needs a full spec, write the spec in docs/specs/ and link to it here. -->

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)
2. **Form-cue audit (post-framework)** — two known dormant cues surfaced during the push-up framework migration (2026-04-10):
   - `goDeeper` (push-up, and likely pike/dip too): in the new framework `goingDown` is only tracked in the 'up' phase, so the existing check `phase === 'down' && goingDown && elbow > elbow_down + 12` is unreachable. It was also effectively dead in the old hand-coded version (only fired on bounce patterns). Redesign to fire when the 'down'-phase valley is shallower than the calibrated bottom by X°.
   - `hipsTooHigh` (push-up): check `avgBack > 195` is unreachable because `angle()` clamps output to [0, 180]. Dead code in both old and new versions. Redesign using supplement angle, or remove entirely if pike push-ups covers this shape.
   - Audit all other exercises for the same two patterns once the framework migration is complete.
3. **Dip orientation nudge** — the old dip analyzer wrote `angleHint.textContent = 'Face the camera for best tracking'` every frame when `shoulderSpan < 0.10`. Dropped during framework migration (2026-04-10) to avoid adding a per-frame-side-effect hook to the framework. Restore via a small framework `onFrame(lm)` extension, or inline it into dip's trackingJoint as a side effect.

## Decisions

<!-- Lightweight ADR table. Prevents re-opening settled questions.
     Status options: Accepted | Superseded | Revisit -->

| Date | Decision | Context | Status |
|------|----------|---------|--------|
| 2025-Q1 | Single HTML file — no build step | Keeps deployment dead simple; GitHub Pages auto-deploys on push to main | Accepted |
| 2025-Q1 | MediaPipe Pose over TensorFlow.js | Faster, more accurate, better mobile support | Accepted |
| 2025-Q1 | Web Speech API for audio coaching | Plays alongside music; no audio file management needed | Accepted |
| 2025-Q1 | No backend — fully client-side | Privacy-first; no data leaves the device | Accepted |
| 2025-Q2 | GitHub Pages hosting (not Vercel) | Free, auto-deploys on push to main via GitHub Actions | Accepted |
| 2026-Q1 | Data-driven exerciseRegistry | Merged exerciseMeta + exercises — adding an exercise is now one object + one `<option>` | Accepted |
| 2026-Q1 | Lite MediaPipe model (complexity 0) | Reduced thermal load ~50% on mobile; acceptable accuracy tradeoff for bodyweight exercises | Accepted |
| 2026-Q1 | Smart calibration covers multiple exercises | Squat ROM → squat + lunge; pushup ROM → pushup + pike + pullup. 6 reps calibrates all 4 rep-based exercises | Accepted |
| 2026-04-17 | Automated asset pipeline for animations + picker | Replace hand-authored 2-keyframe lerp + 7-shared-SVG picker with MediaPipe-extraction pipeline. YouTube allowed as source (coordinates not pixels). 60-frame loops. Minimalist silhouette picker via `imagegen`. ROM baseline as bonus output. | Accepted |

## Session Log

<!-- Reverse-chronological. Most recent entry first. Cap at ~15 entries.
     Archive older entries to docs/roadmap-archive.md (see Archive Pointer below).
     Multiple sessions on the same date can be consolidated into one entry. -->

### 2026-04-18 — Pullup animation finalized: anatomical-constraint stack added to hanging_front preset

Picked up Scott's overnight feedback: residual flip at top-of-rep + descent. Diagnosed via landmark-data inspection, not visual symptoms — first hypothesis (label swaps) was wrong; real cause was MediaPipe shoulder/wrist span *collapsing* when arms occlude the head overhead. Five iterations, each one a phone-review cycle.

- **Width-lock (commit `a6e3b16`, then extended `e5d82c0`):** `enforce_lateral_width()` — for each (L,R) pair in `preset.lateral_pairs`, replaces per-frame x with median half-span around the midpoint. Anatomically correct for pullup (shoulders, elbows, wrists, hips don't change horizontal width). Locked spans for pullup: shoulders 0.151, elbows 0.254, wrists 0.194, hips 0.113.
- **Per-pair LR correction (commit `f8585ec`):** `correct_lr_swaps` extended to a second stage. Whole-frame swap (using shoulder sign) was missing 7 elbow + 6 wrist + 6-8 finger label swaps where MediaPipe correctly labeled shoulders but mis-labeled individual pairs. New per-pair stage uses each pair's own majority sign + magnitude threshold (0.03) to physically swap mislabeled landmark data (x, y, vis).
- **Finger rigid-bind (commit `f8585ec`):** `lock_fingers_to_wrist()` — for grip-on-bar exercises, replaces each finger landmark with `wrist + median(dx, dy)` across all frames. Hands gripping a bar don't move relative to the wrist, so a rigid model beats MediaPipe's noisy per-frame finger tracking.
- **Y-sync (commit `bcf20df`):** `enforce_y_sync()` — for bilaterally symmetric movements, force each (L,R) pair to share its per-frame mean y. Fixes "one arm leading the other" jitter caused by MediaPipe's small per-side y noise.
- **Post-lock smoothing (commit `20c286a`):** `preset.post_smooth_window=7` — second moving-average pass after all locks. Wrists/fingers are constant by construction so smoothing them is a no-op; the pass cleans residual y noise on shoulders/elbows/hips that survived the initial 3-frame smooth. Bonus: pullup seam diff dropped 0.25 → 0.15.
- **Live scoring impact:** Verified pullup live form-check code uses bilateral averages — `(angle(11,13,15) + angle(12,14,16)) / 2` for tracking, average wrist y for chinOverBar, etc. The `swing` check is single-sided but uses `Math.abs(L_hip.x - L_shoulder.x)`, so symmetric L↔R swaps don't change it. Pipeline LR fixes are for visual animation only; live scoring is robust by design.
- **Memory saved:** `feedback_animation_anatomical_constraints.md` — for ML-pose animation pipelines, layered anatomical constraints beat smoothing-only approaches; pipeline order (label cleanup → resample → smooth → align → locks → final smooth → seam blend) matters; presets generalize fixes across exercises in the same view.
- **Sources curated this session:** still 2 of 22. Same as session start — this session was tuning, not curation.
- **Next session:** Scott curates remaining 20 URLs OR Claude moves to plank (first static-hold test) to validate the pipeline on a third pose profile before batch.

### 2026-04-17 — Step 5.5 approved: automated asset pipeline replaces hand-authored animations + picker

**Paradigm decision**

- **Problem:** 21 of 22 how-to animations fail on anatomy/physics (only pull-ups acceptable). 7 shared picker SVGs serve 22 exercises — weak identification.
- **Paradigm evaluation:** `docs/specs/animation-paradigm-evaluation.md` — compared Mixamo, stock video, self-filmed clips, Rive-style. First draft misread intent (clips-to-users); Scott clarified goal is *automated pipeline where sources are inputs and derived skeleton/silhouette are outputs*. Spec reworked accordingly.
- **Scott's 5 decisions:** (1) YouTube OK as source (coordinates, not pixels), (2) minimalist silhouette for picker via `imagegen`, (3) 60-frame loops (~2s, thermally equivalent to current 2-keyframe), (4) self-film decided per-exercise after first pipeline run, (5) ROM baselines as bonus output of same pass.
- **Implementation spec:** `docs/specs/animation-pipeline-implementation.md` — JSON schema, 4 pipeline scripts (extract/normalize/rom/picker), per-exercise source acquisition strategy, 14-step implementation sequence, test plan, acceptance criteria.
- **Step 5 phone test deferred** — folded into Step 5.5 phone test (test new animations, not the ones we're retiring).

**Sprint execution — Steps 1–2 complete**

- **Scaffolded `pipeline/`:** `requirements.txt`, `README.md`, `sources.yaml`, `picker_prompts.yaml` (22 pose descriptions), `exercise_angles.yaml` (22 joint-angle specs). All three YAMLs cover all 22 exercises as stubs. `.gitignore` extended for `.venv/`, `pipeline/.cache/`, `pipeline/raw/`, `*.npz`.
- **`extract_trajectory.py` written + validated:** Smoke-tested on `https://www.pexels.com/video/woman-doing-a-squat-exercise-5025965/` → `pipeline/raw/squat.npz` (133 KB, 395 frames × 33 landmarks × [x,y,visibility], **100% detection rate, mean visibility 0.809**).
- **Two spec adjustments forced by runtime reality:**
  - MediaPipe 0.10.33 on Python 3.13 removed the legacy `mp.solutions.pose` API — migrated to the Tasks API (`PoseLandmarker` + `pose_landmarker_heavy.task`, 30 MB auto-downloaded once to `pipeline/.cache/`). Same 33-landmark topology, same quality tier as old `complexity=2`.
  - Pexels fronts via Cloudflare, so yt-dlp needs `curl-cffi` impersonation (`--extractor-args "generic:impersonate"`). Added `yt-dlp[curl-cffi]` to `requirements.txt`.
- **Deviation noted:** implementation spec references `complexity=2` — reality uses Tasks API `heavy` model. Functionally equivalent; no spec rewrite needed, but worth the heads-up for future MediaPipe work.
- **Next session:** Step 3 (`normalize_loop.py`) → Step 4 (`emit_rom.py`), both testable against existing `pipeline/raw/squat.npz` without further curation. Then Scott curates `sources.yaml`.

**Sprint execution — Steps 3–4 complete**

- **Roadmap compaction:** moved 9 oldest session log entries (2026-04-04 through 2026-04-11 roadmap-migration) to `docs/roadmap-archive.md`. Roadmap 242 → 178 lines.
- **`normalize_loop.py`:** Pelvis-y autocorrelation picks one rep cycle (min_lag 8 frames, max_lag ~4s). Linear resample to 60 frames with per-coord NaN interpolation. 3-frame centered MA smoothing (edge replication). Seam-blend last 5 frames toward frame 0 if max xy diff > 0.02. Smoke test: squat.npz 395 frames → auto-trimmed [96:145] (49-frame cycle) → 60-frame loop, seam closed from 0.0488 → 0.0000 after blend, hip_y oscillates 0.47→0.72. Output **35.7 KB** — 40% over the 25 KB spec target (drift, not blocker; acceptable for v1).
- **`emit_rom.py`:** Reads canonical JSON + `exercise_angles.yaml` triplets. Computes angle-at-vertex B per frame, skips frames where any landmark vis < 0.6. Squat output: knee 38°→173.5°, hip 29.7°→175.5°, 60/60 samples. Knee-min below spec's [70°, 180°] assumption because the smoke-test clip is an ATG squat (hips_y = 0.718 ≥ knees_y = 0.716 at bottom — classic full-depth form, not a bug).
- **Bug fix along the way:** `np.round(float32).tolist()` re-inflates to float64 and serialises ~15 digits per number (e.g. `0.382999986410141`). Fix: `[float(f"{x:.3f}") for x in row]` via string-round → clean Python floats with short repr. Dropped JSON size from 101.6 KB → 35.7 KB.
- **Drift noted:** spec's <25KB target missed; spec's [70°, 180°] squat knee sanity range doesn't tolerate ATG clips. Both are source-clip dependent, so worth noting in Scott's source-curation guidance: choose "normal" reps (shoulder-width stance, thighs-parallel depth), not extremes.

**Sprint execution — aesthetic preview + tuning (ship-one-before-batch)**

- **One Thing Inquiry (single-project) ran mid-session.** Recommendation: ship the squat preview to GitHub Pages for phone review BEFORE Scott spent 2 hrs curating 21 more URLs. Rationale: aesthetic decisions (orientation, scale, tempo, floor alignment) are baked into the normalize pipeline, so catching them on ONE clip turns them into pipeline-parameter fixes instead of a full batch rerun. Scott approved the flip.
- **App-side wiring shipped (commit `fd03e81`):** `trajectoryCache` + `loadTrajectory(ex)` in `index.html`; split `drawHowToSkeleton` into `-FromTrajectory` (new, uses `POSE_CONNECTIONS`, lerps 33 landmarks between frames i/j, skips connectors/dots where avg visibility < 0.3, blue `rgba(96,165,250,0.88)` line width 5) and `-FromKeyframes` (old path kept as fallback until all 22 ship). Loader called with `cache: 'force-cache'` initially — backfired (see below).
- **Phone review surfaced 4 aesthetic issues** (all normalize-step parameter fixes, not per-exercise rework):
  1. Facing opposite direction from outline → `--mirror-x` flag + `mirror_x()` (x → 1−x).
  2. Moving too fast → `PERIOD_MS_DEFAULT` 2000 → 3000, `--period-ms` flag.
  3. Feet sliding up screen during rep → `anchor_feet()`: per-frame Y shift so ankle midpoint stays at `TARGET_ANKLE_Y` (0.81). Ankle-y range dropped 0.046 → 0.000.
  4. Not aligned with outline (height + floor) → `canonicalize_to_outline()`: uniform scale+shift using max-span (most-standing) frame as reference, so nose y → 0.09, ankle y → 0.81, hip x → 0.50. Preserves motion (same linear transform every frame).
- **Commit `0e84697`** landed the four normalize_loop fixes + regenerated `assets/animations/squat.json`. Batch run will inherit these by default (fixes generalize — they're driven by the outline-anchor constants, not hand-tuned per clip).
- **Cache bug (commit `12e4346`):** After pushing the fixes, Scott hard-refreshed and saw no change. Root cause: `fetch(url, { cache: 'force-cache' })` tells the browser to serve any cached copy *without* revalidation, even on explicit reload. Removed the option so the default `max-age=600` from GitHub Pages applies and busted URL params work. Scott confirmed "MUCH better!" after hard cache clear.
- **Validated pattern saved to memory:** "Ship one to phone before batch-running aesthetic pipelines" — for UI/UX asset generation, the default build→batch→review path is wrong; flip to build→ship-one→phone-review→iterate→batch. Saved as `feedback_aesthetic_ship_one_first.md`.

**Sprint execution — pullup (first front-view/hanging test)**

Scott picked pullup as the 2nd exercise per the "test new pose profile before batching" plan. Surfaced 4 pipeline issues + 1 app-side bug. Each one is a pipeline/runtime parameter fix, not per-exercise rework — the batch inherits them all.

- **Issue 1: presets.** Original `canonicalize_to_outline` + `anchor_feet` hardcoded ankles-to-floor. Pullup needs wrists-to-bar. Generalized into a `--preset` system (commit `0285a28`): each preset specifies `anchor_ids` (fixed-contact landmarks), `far_ids` (opposite end of body), target y for each, and x-centering landmarks. Two presets land: `standing` and `hanging_front`. Used hips (not ankles) as `hanging_front`'s `far_ids` because bar/hanging clips routinely cut off the legs (Pexels pullup clip: ankle vis = 0.018, knee vis = 0.092 — landmarks below hip are hallucinated off-canvas).
- **Issue 2: dark-room animation freeze (app bug, not pipeline).** Scott reported "animations don't move now" even for legacy keyframe exercises. Root cause: `drawGuide()` was only called from MediaPipe's `onResults` callback, which stalls when the camera can't detect a pose. Fix (commit `a9382f6`): added an independent ~15fps RAF loop that calls `drawGuide()` when in idle/countdown/warmup-positioning states. Not specific to pipeline — a pre-existing bug exposed by Scott testing with the lights off.
- **Issue 3: L/R label swaps (MediaPipe quirk).** 27 of 98 pullup frames and 45 of 395 squat frames had MediaPipe swapping which side it labeled "left" vs "right" (common for front-ish views with arms/head overlap). Caused visible rotation artifacts, especially near the loop seam where swapped and correct frames blended together. Fix (commit `c199170`): `correct_lr_swaps()` computes majority sign of `L_shoulder.x - R_shoulder.x` across all frames, then swaps all 14 mirror pairs together (shoulders, elbows, wrists, hips, knees, ankles, eyes, ears, mouth, hands, heels, feet) in any disagreeing frame.
- **Issue 4: x-anchor missing.** `anchor_per_frame` was y-only, letting wrist-mid-x drift with natural body sway. Whole skeleton appeared to translate during the rep. Fix (commit `02a4192`): 2D rigid translation — anchor midpoint pinned to `(TARGET_CENTER_X, anchor_y)` every frame. Post-fix: wrist-mid range = 0.0000 on pullup, ankle-mid range = 0.0000 on squat.
- **Issue 5: linear playback "bounces" at rest position.** Rep should pause at the bottom (pullup hang / squat standing). Fix (commit `0778fd1`): cubic ease-in-out on period fraction in `drawHowToSkeletonFromTrajectory`. Slow at loop seam (rest), fast through middle (rep peak). Applies to all trajectory animations — no regeneration needed. Keyframe fallback already uses cosine oscillation, naturally eased.
- **Residual artifact (unresolved):** Scott reports "still some flip" after the L/R swap fix. Likely per-landmark noise (individual limbs flickering) rather than whole-frame swaps — different root cause, different fix. Deferred until Scott confirms post-playback-easing behavior and, if still present, pinpoints when in the rep it occurs.
- **Sources curated this session:** 2 of 22 (squat, pullup). 20 remaining for Scott.
- **Next session:** (1) Scott phone-reviews pullup after deploy `0778fd1` settles. (2) If approved, move to plank (first static-hold test). (3) Scott begins batch curation of remaining URLs.

### 2026-04-16 — architecture-map.md moved to docs/specs/ (audit fix)

- `docs/architecture-map.md` → `docs/specs/architecture-map.md` via `git mv`
- Updated references in `CLAUDE.md` (2 places) and `docs/specs/visual-polish-sprint.md` (1 place)
- Historical mentions in `docs/roadmap-archive.md` left unchanged (session log history)

---

### 2026-04-12 — Fix: insecure context camera error + improved error messages

- **Root cause:** `getUserMedia` requires HTTPS or localhost. Opening `index.html` directly as `file://` is not a secure context in Chrome; `--disable-web-security` bypasses CORS but does NOT grant secure-context status. No check existed — the app tried `getUserMedia` and received a cryptic `NotAllowedError`.
- **Fix 1 (prevention):** Added `window.isSecureContext` check at the top of `startCamera()`, before any `getUserMedia` call. If false, shows a friendly `<h2>Setup Required</h2>` message with step-by-step instructions: double-click `start.bat` → choose option 1 → open `http://localhost:8080`.
- **Fix 2 (diagnosis):** Improved `catch` block to branch on `err.name`: `NotAllowedError` → permission denied guidance; `NotFoundError` → no camera found; `NotReadableError` → camera in use by another app; fallback → generic message. Previously all errors showed the same generic text.
- **Tests:** 289/289 unit passing. No behavioral changes to camera flow or pose pipeline.
- **Next session:** Phone-test SVG picker cards + how-to animation on iOS Safari.

### 2026-04-12 — Step 5 how-to animation (visual polish sprint)

- **How-to animation shipped:** `HOW_TO_KEYFRAMES` constant — 22 exercises × 2 keyframes each, all in normalized [0..1] canvas coords. `drawHowToSkeleton(w, h, ex)` lerps between frames using `(1 - cos(t·2π)) / 2` oscillation driven by `Date.now()`, draws blue (`rgba(96,165,250,0.88)`) stick skeleton + joint dots on `guideCtx`.
- **Integration:** Single call at end of `drawGuide()` gated on `state.workoutState === 'idle'`. Runs on existing 7.5fps idle throttle — no separate RAF loop needed. Blue color visually distinct from white static silhouette.
- **Exercise coverage:** Standing (squat, lunge, pistol, dip, lsit, shoulderdislocate, wristwarmup, bandpullapart), horizontal pushup (pushup, pike), horizontal plank (plank, row, glutebridge, foamroller), hanging front-view (pullup, deadhang, legraise, archhang, scapularpull), kneeling (hipflexor), quadruped (catcow, birddog).
- **Tests:** 289 unit + 38 Playwright = 327 total, 0 failing. Two Playwright flakes (port collision) confirmed pre-existing.
- **Flakiness note:** Full Playwright suite occasionally shows 2 failures on first run due to port collision when running sequentially after another run. Second run always passes clean. Not caused by code changes.
- **Next session:** Phone-test on iOS Safari: (1) SVG picker cards, (2) blue animation during idle. If both look good, Step 5 is done — move to Step 2 phone testing of all 22 exercises.

### 2026-04-12 — Step 4 complete + Step 5 SVG silhouettes (visual polish sprint)

- **Step 4 (spec update):** `docs/specs/visual-polish-sprint.md` expanded from 13 → 22 exercises, grouped by drawStyle, added PNG-vs-canvas decision table
- **Blank picker card bug fixed:** `drawMiniSilhouette()` was missing `kneeling` + `quadruped` cases — Hip Flexor Stretch, Cat-Cow, Bird-Dog showed blank tiles
- **Library research:** Searched GitHub + web for open-source fitness silhouette sets. Finding: nothing covers all 22 exercises with a clean (non-ShareAlike) license. Niche exercises (arch hang, scapular pulls, L-sit, band pull-aparts, mobility work) missing from all free sets.
- **Step 5 decision path:** PNG with no API keys → SVG fallback (imagegen skill). Generated 7 unique SVGs in `assets/silhouettes/` covering all 22 exercises via drawStyle+drawVariant.
- **SVG integration:** `EXERCISE_SVGS` JS constant + `getSvgKey()` embedded in index.html. `renderExercisePicker()` now uses `<img src="data:image/svg+xml,...">` instead of `<canvas>` + `drawMiniSilhouette()`. All 22 picker cards now show pose-specific illustrations.
- **Tests:** 289 unit + 38 Playwright = 327 total, 0 failing.
- **Next session:** Phone-test SVG picker cards on iOS Safari. Then continue Step 5: CSS-animated how-to keyframes (movement arc animation while idle).

### 2026-04-11 — Playwright landmark injection expanded: glutebridge, pullup, legraise (38 tests)

- **glutebridge.spec.ts** — floor + rep-based + `invertedPolarity`: only exercise combining all three. Hip angle geometry verified (collinear = 180° bridged, knee-up = 90° flat). 2 tests.
- **pullup.spec.ts** — `downGate` (chin-over-bar gate): only exercise with this constraint. Two paths tested: gate blocks phase when chin below hands; gate allows rep when chin clears. 3 tests.
- **legraise.spec.ts** — hanging + rep-based + hip angle: simplest hanging rep path, no downGate. 2 tests.
- **Net: +4 tests** (7 written, 3 replaced existing placeholder registry checks). No regressions. 38/38 passing.
- **Remaining:** 13 placeholder specs still need Y4M recordings to expand.

> Earlier sessions archived in `docs/roadmap-archive.md`

## Reference Docs

<!-- Only include files that are genuinely referenced session-to-session. -->

- [`docs/refactor-audit-2026-04-10.md`](docs/refactor-audit-2026-04-10.md) — per-exercise behavioral equivalence audit; phone-test priority order
- [`docs/exercise-testing-protocol.md`](docs/exercise-testing-protocol.md) — 9-step phone testing checklist per exercise
- [`docs/specs/exercise-framework-spec.md`](docs/specs/exercise-framework-spec.md) — framework refactor spec
- [`docs/specs/visual-polish-sprint.md`](docs/specs/visual-polish-sprint.md) — visual polish sprint (Step 5, superseded)
- [`docs/specs/animation-paradigm-evaluation.md`](docs/specs/animation-paradigm-evaluation.md) — Step 5.5 paradigm decision doc
- [`docs/specs/animation-pipeline-implementation.md`](docs/specs/animation-pipeline-implementation.md) — Step 5.5 implementation spec
- [`docs/roadmap-archive.md`](docs/roadmap-archive.md) — earlier session history
