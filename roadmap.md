## Status
| Field | Value |
|-------|-------|
| Priority | active |
| Phase | Implement |
| Updated | 2026-04-30 |
| Summary | Roadmap archaeology pass 2026-04-26 (later in day): re-scoped Step-2 phone-test umbrella into a per-exercise checklist (9 of 22 done, 13 remaining); dispatched code-reviewer agent to audit form-cue dead-code (Backlog #2); parked Backlog #3 (dip orientation nudge); re-scoped 2026-04-24 Decision row to reflect manual-web-UI generation pivot. Step 5.6 Unified Exercise Signature Schema v1 shipped to main 2026-04-20. Consolidates per-exercise data into one file at `assets/animations/<ex>.json`: trajectory + ROM advisory + phase markers + angle timeseries + MediaPipe provenance + future hedges (`canonical_reps[]`, `phases[]`, `joint_weights: {}`). Squat + pullup phone-approved for animation (squat with `--mirror-x`, pullup with correct frames 180-290). **Picker silhouette path revised 2026-04-24** to all-22 PNG rebuild per `docs/specs/picker-png-rebuild.md` (supersedes `picker-svg-audit-fix.md`); SVG calibration commit `a0215d7` held in tree as placeholder. **Generation pivoted 2026-04-26** to manual web-UI workflow (ChatGPT/Gemini/DALL-E) after Pollinations Flux failed the calibration test on dip (4 attempts, all wrong pose — concept gap on calisthenics-specific moves) and free icon libraries showed insufficient coverage. 22 ready-to-paste prompts in `docs/specs/picker-png-prompts.md`. Tests: 107 pytest, 44 Playwright, 289 node. Spec: `docs/specs/exercise-signature-schema.md`. |
| Needs Scott | (1) Curate remaining 20 clip URLs in `pipeline/sources.yaml` (~2 hrs). Note each clip's facing direction. (2) Consider whether the plank/static-hold case warrants its own preset before curating statics. (3) Generate 22 picker PNGs manually using prompts in `docs/specs/picker-png-prompts.md` (paste into ChatGPT/Gemini/DALL-E web UI), drop in `assets/silhouettes/<id>.png`. Generate `dip` first as the style anchor. |
| Autonomous | Add horizontal/kneeling/quadruped presets once Scott curates an example clip of each drawStyle. Wire up the picker PNG batch (drop `EXERCISE_SVGS`/`getSvgKey`, swap render path, archive old SVGs) once Scott drops the 22 PNGs. Retire `HOW_TO_KEYFRAMES` once animation batch lands. |
| Blockers | None |

<!-- CHIEF OF STAFF NOTE: The Status block above is read by the daily review. Keep every field current.
     Format must stay as a table. Do not rename fields. "None" is a valid value for any field. -->

# FormCheck — AI Fitness Form Coach

## Current Sprint

<!-- Active work only. Completed steps 1/3/4 and superseded step 5 pruned 2026-04-20 — see docs/specs/ for spec references and Session Log for history.
     Pre-launch checklists, QA tasks, maintenance work, and deployment prep all belong here too — not just new features. -->

### [NEXT:scott] Step 2 — Scott: Phone test all 22 exercises
*Use `docs/exercise-testing-protocol.md` — 9-step checklist per exercise.*

*Re-scoped 2026-04-26: umbrella line replaced with per-exercise checklist for the 13 untested. Scott checks each off as phone-tested. Per-exercise testing uncovers cue regressions that batch testing misses.*

- [x] Arch hangs / scapular pulls (timed hanging, 14-15 in registry)
- [x] Mobility/PT batch — shoulder dislocates, hip flexor stretch, wrist warm-up, band pull-aparts, foam roller, cat-cow, bird-dog (16-22)
- [ ] Pushup
- [ ] Squat
- [ ] Pullup
- [ ] Lunge
- [ ] Plank
- [ ] Pike push-ups
- [ ] Dips
- [ ] Dead hang
- [ ] Leg raises
- [ ] Inverted rows
- [ ] L-sit
- [ ] Pistol squat
- [ ] Glute bridge

### [NEXT:scott] Picker PNG rebuild (spec'd 2026-04-24, generation pivoted 2026-04-26)
*Per `docs/specs/picker-png-rebuild.md`. Replaces all 22 picker silhouettes with solid-white PNGs (transparent bg, anatomical contour lines). Supersedes `picker-svg-audit-fix.md` after the dip-calibration commit `a0215d7` showed the hand-coded geometric SVG style can't hit iconicity at 70×62. Generation method pivoted 2026-04-26 from API-batch to manual web-UI after Pollinations Flux failed the dip calibration (4 attempts, wrong pose) and free icon libraries proved insufficient.*

- [x] Spec written (`df3661f`); old SVG-audit spec marked SUPERSEDED
- [x] API-batch experiments (2026-04-26): Gemini key blocked by free-tier image-gen quota; Pollinations Flux failed concept test on dip; Iconify search returned <30% coverage with mixed styles
- [x] 22 manual prompts written to `docs/specs/picker-png-prompts.md` (dip first as style anchor, distinguishing-pair "Note:" callouts on look-alike exercises)
- [ ] Scott: generate 22 PNGs manually via web UI, drop in `assets/silhouettes/<id>.png` (multi-day pace acceptable)
- [ ] Wire-up (autonomous post-PNGs): drop `EXERCISE_SVGS` + `getSvgKey`, swap picker render path to `<img src="assets/silhouettes/${id}.png">`, add `object-fit: contain` CSS, archive `assets/silhouettes/*.svg`, drop `drawVariant: 'dip'` from `dipConfig`, delete `SVG_PIPELINE_NOTES.md`
- [ ] Phone review all 22 cards (squint test at picker size)
- [ ] Deploy to `main`

### [NEXT:scott] Step 5.5 — Automated asset pipeline (approved 2026-04-17)
*Per `docs/specs/animation-pipeline-implementation.md`. Paradigm rationale in `docs/specs/animation-paradigm-evaluation.md`. Source → MediaPipe Pose → canonical trajectory JSON → animation + ROM baseline. Picker path updated 2026-04-20: picker stays on pre-authored SVGs (see Backlog 4); pipeline no longer generates picker assets. Signature schema v1 (Step 5.6) shipped on top of this pipeline 2026-04-20 — see `docs/specs/exercise-signature-schema.md`.*

- [x] Pipeline scripts + app-side trajectory loader + Playwright regression spec shipped 2026-04-17 → 2026-04-19 (see session logs for detail). Signature schema v1 + squat/pullup phone-approved 2026-04-20.
- [ ] Scott: curate `sources.yaml` — 22 clip URLs (2/22 done: squat, pullup)
- [ ] Batch-run pipeline; commit `assets/animations/*.json` + `assets/rom/*.json`
- [ ] Scott: review each trajectory via `pipeline/preview.py`
- [ ] Scott phone-tests all 22 with new animations
- [ ] Retire `HOW_TO_KEYFRAMES` + `assets/silhouettes/*.svg` once batch lands (picker SVG path + `EXERCISE_SVGS` + `getSvgKey()` stay per 2026-04-20 revert)
- [ ] Deploy to `main`

## Backlog

<!-- Future work, roughly priority-ordered. Not checkboxes — these aren't active yet.
     If an item needs a full spec, write the spec in docs/specs/ and link to it here. -->

1. **Phase 6 — Monetization & Distribution** — PWA install prompt, landing page, freemium model, user accounts, social sharing, app store wrapper (Capacitor/Ionic)
2. **Form-cue audit (post-framework)** — ✅ **Audit + UNREACHABLE fixes shipped 2026-04-26.** Findings + resolution: `docs/specs/form-cue-audit-2026-04-26.md`. Audit found **7 UNREACHABLE + 3 SUSPECT + 23 REACHABLE**. All 7 UNREACHABLE fixed: `goDeeper` redesigned (5 exercises) using new `goingUp + phaseExtremum` framework signature with `phaseExtremum > calibration_bottom - 12` semantics (deepest-point shallow-rep detection); `hipsTooHigh` removed (2 exercises) since `hipSag`/`hipSagSevere` cover the dropped-hips direction. 289/289 node + 44/44 Playwright tests pass. **3 SUSPECT cues** (`glutebridge.driveHigher`, `pullup.chinOverBar`, `lunge.torsoLean`) intentionally NOT touched — magic-number thresholds need phone-test verification before code change. Pick up during Sprint Step 2 phone-tests.
3. **Dip orientation nudge** — 🅿️ **Parked 2026-04-26.** Old dip analyzer wrote `angleHint.textContent = 'Face the camera for best tracking'` every frame when `shoulderSpan < 0.10`. Dropped during framework migration (2026-04-10) to avoid adding a per-frame-side-effect hook to the framework. Restore via a small framework `onFrame(lm)` extension, or inline into dip's trackingJoint as a side effect. Re-open trigger: dip-specific tracking issue surfaces during phone-test (Sprint Step 2).
4. **Step 5.7 — Multi-canonical enrichment** (after all 22 Step 5.6 signatures ship). Extend schema from 1 canonical rep per exercise to 3-5. Scott curates additional URLs per exercise in `sources.yaml` (already structured as list in 5.6); pipeline extracts, phase-aligns via DTW or top-of-rep sync, filters quality, populates `canonical_reps[]`. Unlocks: (a) MediaPipe k-NN classifier pattern for similarity scoring, (b) body-proportion matching during warmup (pick the canonical that looks most like the user), (c) ROM *bands* rather than ROM *points*, (d) golden-form bias removal. Mostly Python-side — consumer code unchanged if 5.6 schema is correct.
5. **Post-set / post-workout feedback layer** (Phase 5.x, new sprint after 5.7). Current live coaching is real-time only; users get no post-rep, post-set, or post-workout analysis. Features:
   - Rep-by-rep quality scores (leverages signature's `phase_frames` + `angle_timeseries`)
   - Post-set summary with specific form issues ("knee bottomed at 110° vs canonical 90°")
   - Post-workout dashboard: total reps, form trends, weakest points across exercises
   - Session-over-session progress tracking via localStorage/IndexedDB (no backend, privacy-preserving)
   - Requires signature schema v1 (5.6) and ideally multi-canonical (5.7) for robust scoring bands.
   - Depends on a stable `schema_version` contract — user's historical scores must remain comparable across pipeline updates.

### Grossness audit follow-ups (2026-04-26 cross-project sweep)

6. [NEXT:scott] **Form-check evaluation loop duplicated between `buildRepCounterAnalyzer` and `buildTimedAnalyzer`.** `index.html:586` and `index.html:632` — the core `try { failed = check.check(...) } catch (...) { ... }` + feedback emission + cooldown logic is nearly identical. Hand-sync required on any change to cue logic, cooldown semantics, or error handling. **Fix:** extract `evaluateFormChecks(formChecks, lm, ...args)` shared helper; both analyzers call it.
7. [NEXT:scott] **316 hardcoded threshold numbers across 22 exercise configs with inconsistent rationale comments.** `index.html:828–1924`. Angles like `145°`, ratios like `0.88`, tolerances like `0.15` appear inline with "what" comments but no "why" — no biomechanical source, no camera-distance assumption, no clothing-jitter rationale. Some have history (line 921 was loosened from 0.75 to 0.88 — context lost). When a threshold misfires on a real user's body, no one will know which thresholds are load-bearing vs. arbitrary. **Fix:** named constants table at top of script (`HIP_SAG_THRESHOLD = 145; HIP_DROP_LIMIT = 0.88; ...`) with a one-line comment per constant naming the source (calibration session, biomechanics reference, or "tuned to baggy clothing — see Lessons Learned #1"). Bigger lift: hoist all per-exercise constants into the exercise config JSON files.
8. [NEXT:scott] **`goDeeper` form check duplicated across 5+ exercise configs with identical logic.** `index.html:889` (pushup), `949` (squat), `1033` (lunge), `1212` (pike), `1255` (dip). Same ID, same shape: `phase === 'down' && goingDown && angleNow > calibration[ex].bottom + 12`. If the cooldown or threshold logic ever needs adjustment, you hand-edit 5 configs and pray you got them all. **Fix:** define reusable form-check factories (`goDeeper(calibrationKey, tolerance = 12)`) that return check objects; each exercise config calls the factory.
9. [NEXT:scott] **Color values hardcoded in 3 separate locations.** `index.html:19` (CSS), `2286–2305` (canvas fill/stroke), `4286–4299` (MediaPipe skeleton draw). `#4ade80` (green), `#fbbf24` (amber), `rgba(74, 222, 128)` etc. all defined separately. A future redesign or accessibility theme requires hunting across CSS + canvas + skeleton renderer. **Fix:** define `COLORS = { active: '#4ade80', warning: '#fbbf24', skeleton: 'rgba(74,222,128)' }` at top; reference from all three render paths. (Same shape as the lib-triple-drift pattern in STC — codify the source-of-truth principle as a project-wide rule once.)
10. [NEXT:scott] **`fetch('assets/animations/${ex}.json')` uses bare relative path; breaks on non-root deploys.** `index.html:2993`. Relative-from-document path works at root (`https://site.com/`) but fails at subpath (`https://site.com/FormChecker/`) because the URL resolves against `pathname`. CLAUDE.md says GitHub Pages deployed; if the repo is ever served at a subpath, animations 404 silently and the workout app appears to lose all exercise data. **Fix:** `new URL('assets/animations/' + ex + '.json', document.baseURI).href`, OR set `<base href="/">` explicitly and document the deploy assumption.
11. [NEXT:claude] **Playwright pushup spec passes vacuously — TODO admits no real assertions yet.** `tests/playwright/exercises/pushup.spec.ts:6–25` contains `// TODO: Record a Y4M video and save to ... Then expand this placeholder` and currently asserts nothing meaningful. CI prints "✓ pushup tests passed" but pushup detection is untested. PRs touching pushup logic look safe and aren't. **Fix:** mark with `test.skip()` or `test.todo()` so CI surfaces the incomplete coverage rather than blessing it. Bigger fix: actually record the Y4M and write the assertions.
12. [NEXT:claude] **Warmup calibration thresholds `< 165` and `firstPeak - 15` lack rationale.** `index.html:2008` gates "is this a real bend" on two magic numbers. Why 165° (rough vertical-ish)? Why 15° delta (jitter filter)? No comment. **Fix:** inline comment naming both — `// Require joint bend ≥15° from initial extension (jitter filter; tighter than this misses slow movers) AND min angle <165° (excludes near-vertical poses that aren't real bends)`. Same shape as #7; resolves to the same fix at scale.

*Source: cross-project grossness audit run 2026-04-26 (see also Smart TV Calendar Backlog 15–18, ProBonofy Backlog 12–16, LegalGuard Backlog 3–7, and Claude System Backlog 28–29). Audit lens captured as `~/.claude/skills/gross-code-auditor/SKILL.md`.*

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
| 2026-04-17 | Automated asset pipeline for animations + picker | Replace hand-authored 2-keyframe lerp + 7-shared-SVG picker with MediaPipe-extraction pipeline. YouTube allowed as source (coordinates not pixels). 60-frame loops. Minimalist silhouette picker via `imagegen`. ROM baseline as bonus output. | Accepted (animation); picker portion superseded 2026-04-24 |
| 2026-04-24 | Picker silhouette format flip: SVG → manual web-UI PNG (all 22) | Hand-coded geometric SVG worked for 17 cards but couldn't hit iconicity at 70×62 for the 5 audit-target exercises (dips, inverted rows, glute bridge, hip flexor, foam roller). Replacing only the 5 in the new style would leave a mixed picker; redoing all 22 keeps grid coherence. **Generation method pivoted 2026-04-26** from API-batch to manual web-UI workflow (ChatGPT/Gemini/DALL-E) after Pollinations Flux failed dip calibration (4 attempts, wrong pose) and free icon libraries showed insufficient coverage. PNG files at `assets/silhouettes/<id>.png`, drop `EXERCISE_SVGS`/`getSvgKey`. Specs: `docs/specs/picker-png-rebuild.md` + `docs/specs/picker-png-prompts.md`. | Accepted |

## Session Log

<!-- Reverse-chronological. Most recent entry first. Cap at ~15 entries.
     Archive older entries to docs/roadmap-archive.md (see Archive Pointer below).
     Multiple sessions on the same date can be consolidated into one entry. -->

### 2026-04-30 — Roadmap compaction + voice-architecture.md → docs/specs/

**Compaction:** trimmed 4 entries (2026-04-26, 2026-04-24, 2026-04-20, 2026-04-18; all ≤40%). No coalesce (no same-day groups), no archive (8 entries, none >30 days). Session Log: 169 → 128 lines; total: 295 → 252 lines. Also moved `docs/voice-architecture.md` → `docs/specs/voice-architecture.md` (roadmap-review spec-file violation); refs updated in `CLAUDE.md` + `docs/refactor-audit-2026-04-10.md`. Archive mentions left unchanged.

### 2026-04-26 — Roadmap archaeology + form-cue audit (Backlog #2 closed)

Ran `roadmap-archaeologist`; 4 items acted on:

- **Sprint umbrella re-scoped** — "Phone test all 22 exercises" replaced with per-exercise checklist for the 13 untested; surface real progress that the open-since-2026-04-09 umbrella lacked.
- **Backlog #2 (form-cue audit) — closed same-day.** Code-reviewer agent audited all 33 cues across 22 exercises in ~2 min. Findings: **7 UNREACHABLE + 3 SUSPECT + 23 clean** — `docs/specs/form-cue-audit-2026-04-26.md`. Both seed-hypothesis patterns from the 2026-04-10 backlog item confirmed.
- **Backlog #3 (dip orientation nudge) — parked.** Re-open trigger: dip-specific tracking issue on phone-test.
- **Decisions table 2026-04-24 row re-scoped** to capture the manual web-UI generation pivot.

**Form-cue UNREACHABLE fixes shipped same-day (commit `2ea1901`).** Framework `buildRepAnalyzer` extended to pass `goingUp` + `phaseExtremum` to form-check `check()` + dynamic-message callbacks; existing checks ignore the extra positional args. The 5× `goDeeper` cues rewritten as `phase === 'down' && goingUp && phaseExtremum > (calibration_bottom - 12)`. **Sign-flip:** audit recommended `+ 12` — wrong direction. `phaseExtremum` is monotonically ≤ `bottomThreshold` (set on phase entry, only decreases), so `> bottom + 12` is unreachable AND would false-fire on rising portion of clean deep reps. `- 12` is correct. The 2× `hipsTooHigh` cues removed (`hipSag`/`hipSagSevere` cover dropped-hips). **289/289 node + 44/44 Playwright pass.**

3 SUSPECT cues left for phone-test verification before code change: `glutebridge.driveHigher` (145°), `pullup.chinOverBar` (100° vs calibrated 80°), `lunge.torsoLean` (140° + no phase gate + left-only landmarks). Will surface during Sprint Step 2.

Picker artifacts (`docs/specs/picker-png-prompts.md`, `pipeline/gen_silhouettes.py`) committed from working tree where untracked.

**Pattern observation:** FormChecker's drift shape is **"sprint-adjacent backlog rot"** — items added when a sprint closes (form-cue audit + dip nudge both born 2026-04-10) get orphaned when the next sprint pivots. Fix: explicit deadline OR park at write time.

Skill deviation: dispatched code-reviewer (read-only) for the audit; `implementer` would have fit better for "do it with a sub agent."

### 2026-04-24 — Roadmap compaction + picker silhouette rev (SVG → PNG)

**Compaction:** trimmed 6 entries (2026-04-20 through 2026-04-11; all ≤40%). No coalesce, no archive. Session Log: 169 → 125 lines; total: 259 → 214 lines. First pass (`7344dab`) over-trimmed — reverted in `e57ea7b` before the corrected pass.

**Picker silhouette rev: SVG → PNG.** Started executing Backlog 4 with dips as calibration. Hand-coded geometric SVG (`a0215d7`): side-3/4 view with two parallel bars, Z-bend bent elbow. Aesthetic params + 4-exercise fan-out plan captured in `docs/specs/SVG_PIPELINE_NOTES.md`. Held off pushing pending phone review.

Scott countered with a Gemini-generated reference (solid white silhouette + thin black contour lines + bars in perspective + knees tucked) that read instantly at thumbnail size; hand-coded SVG was a pile of sticks at 70×62. The geometric-stick-figure aesthetic that worked for 17 cards can't hit iconicity for the equipment-and-dynamic-pose ones.

**Scope flip to all-22 PNG rebuild via Gemini.** Replacing only 5 audit targets in the new style would leave a mixed picker; coherent means redoing all 22. New spec `docs/specs/picker-png-rebuild.md` (`df3661f`); `picker-svg-audit-fix.md` SUPERSEDED. Calibration artifacts stay as placeholder; wire-up removes them post-batch.

**Skill deviation:** skipped imagegen's "ask about API keys" step — should have surfaced the Gemini-access choice (Scott had it all along). Worth a Claude System backlog item to add Gemini to imagegen's provider list.

**Next session:** Scott generates 22 PNGs, drops them in `assets/silhouettes/`. Then wire-up.

### 2026-04-20 — Step 5.6 Unified Exercise Signature Schema v1 shipped

Four-phase dev loop run by 5-agent team (2× Explore, planner, implementer + retry, code-reviewer + recheck — all Opus). Triggered by one-thing-inquiry. Single-file signature consolidates trajectory + ROM + phase markers + angle timeseries + MediaPipe provenance + picker frame.

- **Investigate** — codebase map (producers `normalize_loop.py`/`emit_rom.py`; consumers `loadTrajectory`, `drawHowToSkeletonFromTrajectory`, picker, `EXERCISE_SVGS`; `HOW_TO_KEYFRAMES` silent-fallback). Prior-art: no commercial app publishes schema; academic datasets ship raw pose; MediaPipe docs recommend k-NN classifier over single-template. **v1 is data, not algorithms.**
- **Calibrate** — `docs/specs/exercise-signature-schema.md` (~400 lines). Scott resolved 6 open questions: dual `mediapipe_pipeline_*` + `mediapipe_app_*` provenance; APP version regex from `<script src>`; `data-silhouette-source` DOM attribute for Playwright; `start`/`middle`/`end` for timed exercises; `urls: [...]` list form; `extracted_at` content-hash gated.
- **Implement** (`5287008`, `3901a4c`, `03ef8d6`). Structural hedges: `canonical_reps[]` array (v1 len=1; 5.7 grows), `phases[]` array, `joint_weights: {}` optional, `mediapipe_*` provenance. Runtime Canvas picker replaces SVGs; SVG fallback preserved.
- **Check #1 — NEEDS FIXES.** 3 high-sev: Playwright picker spec all 4 `.skip`'d, `fingerprintsDiffer` threshold 2→1 (~50% sensitivity drop), `emit_rom.py` standalone KeyError on v1.
- **Implement retry → Check retry — READY FOR MERGE.** 5 fixes (`4075261`, `3b339e8`, `f40de0f`, `9bf1cba`, `31beace`): un-skip tests, restore threshold + 3-sample window, nested unwrap, warn-at-min-lag, multi-raw integration test. **Test state on merge:** 107 pytest (+34), 48 Playwright (was 44 + 4 unskipped), 289 node. Squat 37.9 KB, pullup 38.6 KB.
- **Memory:** `feedback_instance_assignment.md` — planner + code-reviewer always Opus; novel-architecture sprints all Opus.
- **Deferred:** semantic `top`/`bottom` phase for pullup picker (obsoleted by SVG revert); mobile canvas perf for 22-card render; `auto_detect_cycle` preset-specific pelvis fallback for `hanging_front`; `emit_rom.py` stderr-warning integration test.

**Post-deploy phone review + signature-picker revert (same-day, `6b969da`)**

Squat regen had dropped `--mirror-x`; pullup `--start-frame 50 --end-frame 160` captured pre-rep hanging, not reps (real reps frames 180-290 with `--preset hanging_front`). Picker silhouettes from signature read as "dots + line" / missing legs at 70×62 due to low-vis landmarks (L_elbow vis=0.03, L_ankle 0.02); first-pass fix `3e713fc` (bottom-phase + limb synthesis) didn't recover.

**Decision: revert picker to SVG. Signature drives animation + ROM + future scoring; picker stays on pre-authored SVGs.** Front-view crouched poses at 70×62 are fundamentally not iconic — side-view silhouettes are what the eye reads. Revert deleted `renderPickerSilhouetteFromSignature`, `completeSkeletonForPicker`, `pickerSilhouetteCache`, `PICKER_CONNECTIONS`, picker Playwright spec. Playwright 48 → 44. Signature schema unchanged.

**Lesson:** single-source-of-truth can cost UX when source data isn't fit for rendering target. Memory: `feedback_data_consolidation_consumer_fit.md`.

### 2026-04-19 — Playwright `animation-loading.spec.ts` shipped (Step 5.5 regression guard)

Three-agent Plan/Implement/Check run; spec `docs/specs/formchecker-animation-loading-spec.md` (`11bd542`), implement (`bf523bf`), flake hardening (`aef9267`), merge (`2ce6240`).

- **Tests locked in** (6 in `tests/playwright/exercises/animation-loading.spec.ts` + 4 `_helpers.ts` exports): squat.json fetched/parseable; `#guide-canvas` has drawn pixels; fingerprint changes across 400 ms during idle; missing/malformed/empty JSON all fall back to keyframe + no `pageerror`.
- **Flake hardening** (under 2-worker http.server concurrency): Test 1 `waitForResponse` 2 s → 5 s; Test 3 exact-inequality → Hamming-distance comparator on 32×32 downsample (`fingerprintsDiffer`, ≥2 differing nibbles, per spec §6 "Iterate" fallback).
- **Verification:** 3 consecutive full-suite runs = 44/44 passing (38 baseline + 6 new). No `index.html` changes, no `window.__*` — purely DOM-observable.
- **Next session:** Scott curates remaining 20 URLs OR tries plank (first static-hold test).

### 2026-04-18 — Pullup animation finalized + pipeline test harness + normalize_loop bug fixes

Multi-sprint day — paradigm decision shipped, pipeline Steps 1-4 complete, squat aesthetic tuning shipped, pullup ran 5 iterations, test harness + 3 surgical bug fixes merged.

**Paradigm decision**

21 of 22 how-to animations failed on anatomy/physics (only pull-ups acceptable). Shipped `animation-paradigm-evaluation.md` + `animation-pipeline-implementation.md`. **Scott's 5 decisions:** YouTube OK as source (coordinates, not pixels); minimalist silhouette picker via `imagegen`; 60-frame loops; self-film decided per-exercise after first pipeline run; ROM baselines as bonus output.

**Pipeline Steps 1-4 shipped**

- `pipeline/` scaffolded with all 22 stubs; `extract_trajectory.py` smoke-tested on Pexels squat (395 frames, 100% detection, mean vis 0.809).
- **Spec deviation:** MediaPipe 0.10.33 on Py 3.13 removed `mp.solutions.pose` → migrated to Tasks API (`PoseLandmarker` + `pose_landmarker_heavy.task`). Pexels fronts Cloudflare so yt-dlp needs `curl-cffi` impersonation.
- `normalize_loop.py` (pelvis-y autocorr + 60-frame resample + 3-frame MA + seam blend) and `emit_rom.py` (vis<0.6 skip) shipped. Squat: 395→60 frames, seam 0.0488→0.0000; knee ROM 38°→173.5°.
- **Two drifts:** JSON 35.7 KB vs spec's <25 KB (float32→tolist); spec's [70°, 180°] squat knee range doesn't tolerate ATG. Curate normal reps.

**Aesthetic preview + tuning (ship-one-before-batch)**

Ship squat preview to phone BEFORE Scott curates 21 more URLs — aesthetic issues bake into the normalize pipeline, so catching them on one clip = parameter fixes, not full batch rerun. App-side wiring (`fd03e81`): `trajectoryCache` + `loadTrajectory(ex)` + split `drawHowToSkeleton` into `-FromTrajectory`/`-FromKeyframes`. 4 phone-review fixes (`0e84697`): `--mirror-x`; `PERIOD_MS_DEFAULT` 2000→3000; `anchor_feet()`; `canonicalize_to_outline()`. Cache bug `12e4346` removing `cache: 'force-cache'`; memory `feedback_aesthetic_ship_one_first.md`.

**Pullup sprint — first front-view/hanging test**

Pullup surfaced 4 pipeline issues + 1 app-side bug; all parameter fixes, batch inherits. **Presets (`0285a28`):** generalized `canonicalize_to_outline` + `anchor_feet` from squat-hardcoded ankles-to-floor into `--preset` system (`standing` + `hanging_front`); used hips (not ankles) as `hanging_front` `far_ids` since hanging clips cut off legs. **Dark-room animation freeze (`a9382f6`) — pre-existing app bug:** `drawGuide()` only ran from MediaPipe's `onResults` callback, which stalls when no pose detected. Added independent ~15fps RAF loop for idle states. **L/R label swaps (`c199170`):** MediaPipe swapped left/right labels in 27/98 pullup frames + 45/395 squat frames. `correct_lr_swaps()` Stage 1: majority sign of `L_shoulder.x - R_shoulder.x`. **X-anchor + cubic ease-in-out (`02a4192`, `0778fd1`):** `anchor_per_frame` was y-only — extended to 2D rigid translation; cubic ease-in-out on period fraction stops linear-playback bouncing at rest.

**Pullup animation finalized — anatomical-constraint stack on hanging_front preset**

Five-iteration phone-review cycle. Root cause (diagnosed via landmark data, first-hypothesis label swaps was wrong): MediaPipe shoulder/wrist span *collapses* when arms occlude head overhead. `enforce_lateral_width()` (`a6e3b16`/`e5d82c0`) clamps each L/R pair to its median half-span. Per-pair LR Stage 2 + finger rigid-bind (`f8585ec`) catches pair-specific label flips Stage 1 missed (7 elbow + 6 wrist + 6-8 finger); `lock_fingers_to_wrist()` replaces each finger with `wrist + median(dx, dy)`. `enforce_y_sync()` + `post_smooth_window=7` (`bcf20df`/`20c286a`): bilateral pairs share per-frame mean y; seam 0.25 → 0.15. **Live scoring impact:** pullup form-check uses bilateral averages + `Math.abs()` on swing — pipeline LR fixes are visual-only. Memory: `feedback_animation_anatomical_constraints.md`.

**Pipeline test harness (`cee9997`) + normalize_loop surgical bug fixes (`18a74c9`)**

`pipeline/tests/` — `conftest.py` + 3 test files, 62 tests against normalize/rom pure functions. `extract()` not covered (needs real video fixture). Must use `pipeline/.venv` (`cd pipeline && .venv/Scripts/python -m pytest tests`). Surgical fixes per `docs/specs/normalize-loop-bug-fixes-spec.md` — 3-agent Plan→Implement→Check, +7/−1 lines: Bug 1 `enforce_lateral_width` `span_before` collapsed sign on stable L/R signs (replaced with signed-half range); Bugs 2a/2b NaN guards in `correct_lr_swaps` + `pelvis_y_signal`. 73 tests pass; warnings 6 → 5.

**Next session:** Scott curates remaining 20 URLs OR moves to plank (first static-hold). Validate normalize_loop fixes on batch run.

### 2026-04-16 — architecture-map.md moved to docs/specs/ (audit fix)

`docs/architecture-map.md` → `docs/specs/architecture-map.md` via `git mv`. Updated refs in `CLAUDE.md` + `docs/specs/visual-polish-sprint.md`. Archive mentions left unchanged.

---

### 2026-04-12 — Step 4 spec update + Step 5 SVG silhouettes + how-to animation + insecure-context camera fix

**Step 4 + Step 5 SVG silhouettes:** `visual-polish-sprint.md` expanded 13 → 22 exercises with PNG-vs-canvas decision table. Fixed blank picker cards (`drawMiniSilhouette()` missing `kneeling` + `quadruped` cases). Library research: nothing on GitHub covers all 22 with clean license; niche moves (arch hang, scapular pulls, L-sit, band pull-aparts, mobility) missing from all free sets. Decision: SVG via imagegen skill — 7 unique SVGs in `assets/silhouettes/` cover all 22 via drawStyle+drawVariant. `EXERCISE_SVGS` + `getSvgKey()` embedded; `renderExercisePicker()` uses `<img src="data:image/svg+xml,...">` instead of canvas.

**Step 5 how-to animation:** `HOW_TO_KEYFRAMES` — 22 exercises × 2 keyframes in normalized [0..1] coords. `drawHowToSkeleton(w, h, ex)` lerps via `(1 - cos(t·2π)) / 2` driven by `Date.now()`, blue stick skeleton on `guideCtx`, idle-gated at 7.5fps (no separate RAF). Flakiness: full Playwright suite occasionally shows 2 failures on first run due to port collision when running sequentially; second run passes clean.

**Insecure-context camera fix:** `getUserMedia` requires HTTPS/localhost. Opening `index.html` as `file://` in Chrome isn't a secure context; `--disable-web-security` bypasses CORS but does NOT grant secure-context status — cryptic `NotAllowedError` resulted. Added `window.isSecureContext` check at top of `startCamera()` → shows `<h2>Setup Required</h2>` with `start.bat` → option 1 → `http://localhost:8080`. `catch` block now branches on `err.name` (`NotAllowedError`/`NotFoundError`/`NotReadableError`). 289 unit + 38 Playwright = 327, 0 failing.

**Next session:** Phone-test on iOS Safari: SVG picker cards + blue how-to animation. If both look good, Step 5 is done — move to Step 2 phone testing of all 22 exercises.

### 2026-04-11 — Playwright landmark injection expanded: glutebridge, pullup, legraise (38 tests)

- **glutebridge.spec.ts** (floor + rep-based + `invertedPolarity`, only exercise combining all three; collinear=180° bridged, knee-up=90° flat); **pullup.spec.ts** (`downGate` chin-over-bar — blocks phase when chin below hands, allows rep when chin clears); **legraise.spec.ts** (hanging + rep-based hip angle, simplest hanging rep).
- Net +4 tests (7 written, 3 replaced placeholders). 38/38 passing. 13 placeholder specs still need Y4M recordings.

> Earlier sessions archived in `docs/roadmap-archive.md`

## Reference Docs

<!-- Only include files that are genuinely referenced session-to-session. -->

- [`docs/refactor-audit-2026-04-10.md`](docs/refactor-audit-2026-04-10.md) — per-exercise behavioral equivalence audit; phone-test priority order
- [`docs/exercise-testing-protocol.md`](docs/exercise-testing-protocol.md) — 9-step phone testing checklist per exercise
- [`docs/specs/exercise-framework-spec.md`](docs/specs/exercise-framework-spec.md) — framework refactor spec
- [`docs/specs/visual-polish-sprint.md`](docs/specs/visual-polish-sprint.md) — visual polish sprint (Step 5, superseded)
- [`docs/specs/animation-paradigm-evaluation.md`](docs/specs/animation-paradigm-evaluation.md) — Step 5.5 paradigm decision doc
- [`docs/specs/animation-pipeline-implementation.md`](docs/specs/animation-pipeline-implementation.md) — Step 5.5 implementation spec
- [`docs/specs/picker-png-rebuild.md`](docs/specs/picker-png-rebuild.md) — picker silhouette PNG rebuild spec (active 2026-04-24)
- [`docs/specs/picker-svg-audit-fix.md`](docs/specs/picker-svg-audit-fix.md) — original 5-picker SVG audit spec (SUPERSEDED 2026-04-24 by picker-png-rebuild.md)
- [`docs/roadmap-archive.md`](docs/roadmap-archive.md) — earlier session history
