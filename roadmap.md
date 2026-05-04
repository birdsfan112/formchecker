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
