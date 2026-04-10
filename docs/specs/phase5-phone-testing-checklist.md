# Phase 5 — Phone Testing Checklist

Everything built across the 2026-04-04 sessions. Work through top to bottom and mark each ✅ or ❌.

See also: `docs/exercise-testing-protocol.md` for the repeatable per-exercise protocol (9 steps each).

---

## Pre-Phase 5 Reliability Sprint
- [ ] **Permission dialog** — does the camera permission prompt appear before the OS camera prompt (not after)?
- [ ] **Background → resume** — start a workout, background the app, return. Does voice resume? Does the skeleton reappear on camera?
- [ ] **Guide alignment at 6ft** — does the silhouette guide hold blue (aligned) without flickering while standing still?
- [ ] **Warmup calibration reps** — do reps count reliably during the calibration tracking phase (no false reps, no missed reps)?

---

## Phase 5 — Engine Refactor + Batch 1 (Pike, Dips, Dead Hang, Leg Raises)
- [ ] **All 9 exercises in dropdown** — do push-ups, squats, pull-ups, lunges, plank, pike push-ups, dips, dead hang, leg raises all appear?
- [ ] **Each new exercise shows a silhouette** — switch to each one; does a guide shape appear in idle state?
- [ ] **Pike push-ups (framework)** — reps count on full ROM; "Keep hips high" cue fires when hips drop below hands; silhouette + position detection still work post-migration.
- [ ] **Dead Hang (framework)** — timer counts upward; "15 seconds" voice cue fires at 15s; hang silhouette still turns green in position.
- [ ] **Leg Raises (framework)** — reps count as legs raise (hip angle decreases) and return to hang; no phantom reps while hanging still; straight-leg cue fires on bent knees.
- [ ] **Dips (framework)** — reps track correctly via elbow angle and increment on each full dip; elbow-flare cue fires on bad form; position detection still works.
- [ ] **Regression: pushup auto-start + framework** — lying face-down still triggers 3s countdown; reps count reliably; hip-sag cue still fires on intentional sag post-refactor.
- [ ] **Regression: plank timer + framework** — timer runs and shows elapsed seconds; auto-start from plank position still triggers; hip-sag / core cue still fires.
- [ ] **Regression: squat rep counting + framework** — squats count correctly at full depth; "go deeper" cue fires on quarter squat; no phantom reps while standing still.
- [ ] **Regression: calibration warmup counter** — does the counter show x/3 format (e.g. 0/3 → 1/3 → 2/3 → 3/3) during warmup?

---

## Phase 5 — Batch 2 (Inverted Rows, L-Sit, Pistol Squat, Glute Bridge)
- [ ] **All 13 exercises in dropdown** — do the 4 new exercises appear (inverted rows, L-sit, pistol squat, glute bridge)?
- [ ] **Glute bridge (framework, inverted polarity)** — lying-on-back auto-start still triggers 3s countdown; reps count as hips drive up and return to floor; full-extension cue fires on shallow reps; inverted polarity handled correctly post-migration.
- [ ] **Pistol squat (framework)** — rep counting tracks the bending (working) leg, not the extended leg; depth cue fires on quarter reps; no phantom reps while balancing still.
- [ ] **L-Sit (framework)** — timer counts upward; "Keep legs horizontal" cue fires when legs drop; 15s voice cue still fires.
- [ ] **Inverted rows (framework)** — reps count pulling up to bar and returning; "Keep hips up" cue fires when hips sag; position detection still works horizontally.

---

## Calibration UX + Rest Screen
- [ ] **Warmup rep counter** — during calibration tracking, does #rep-counter show 0/3 → 1/3 → 2/3 → 3/3?
- [ ] **Post-calibration message** — after calibration completes, does it say "✓ Calibrated! Tap Ready to start your [exercise]"?
- [ ] **Rest screen** — after finishing a set with reps, does the rest screen appear with a 60s countdown?
- [ ] **Skip rest** — does "Start Next Set" button end the rest early and return to idle?

---

## Framework Migration Regression (Phase 5 — Framework Refactor)

Run after each batch of exercises is migrated from hand-coded analyzers to the shared framework. Push-up is the reference — every other exercise should behave identically to pre-migration. See `docs/exercise-testing-protocol.md` for the full 9-step per-exercise recipe.

- [ ] **Pull-ups (framework)** — reps count on full ROM (chin over bar to full hang); partial-range cue fires on momentum/kipping; hanging silhouette still turns green.
- [ ] **Lunges (framework)** — reps count on the working leg; depth cue fires on quarter lunge; no phantom reps between alternating legs.
- [ ] **Arch hang (framework)** — timer counts upward; "Pack shoulders down" cue fires on shrug; 15s voice cue still fires.
- [ ] **Scapular pulls (framework)** — timer counts upward; "Keep arms straight" cue fires on bent elbows; position detection still works.
- [ ] **Shoulder dislocates (framework)** — timer counts upward; "Keep arms straight — widen your grip" cue fires on bent elbows; 15s voice cue still fires.
- [ ] **Hip flexor stretch (framework)** — timer counts upward; "Sit tall — lift your chest" cue fires on torso collapse; kneeling silhouette still turns green.
- [ ] **Wrist warm-up (framework)** — timer counts upward; "Raise arms to shoulder height" cue fires on dropped arms; 15s voice cue still fires.
- [ ] **Band pull-aparts (framework)** — timer counts upward; "Keep arms at shoulder height" cue fires on drifting arms; standing silhouette still turns green.
- [ ] **Foam roller (framework)** — timer counts upward; 15s voice cue still fires; lying position detection still holds without false "out of position" flags.
- [ ] **Cat-Cow (framework)** — timer counts upward; "Keep hips level" cue fires on sideways collapse; quadruped silhouette still turns green.
- [ ] **Bird-Dog (framework)** — timer counts upward; "Keep hips level — don't rotate" cue fires on hip rotation; quadruped silhouette still turns green.

---

## Welcome Screen + Exercise Picker (added 2026-04-07)
- [ ] **Welcome screen** — does the 3-button welcome screen appear on first load (Calibrate & Start, Load Calibration, Jump to Workout)?
- [ ] **Exercise picker** — does tapping the exercise name open the card grid modal?
- [ ] **Card grid** — do all 13 exercise cards show name + mini silhouette?
- [ ] **Exercise switch** — does selecting a card close the modal and update the active exercise?
