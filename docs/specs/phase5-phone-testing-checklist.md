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
- [ ] **Pike push-ups** — does "Keep hips high" voice cue fire when hips drop below hands during the rep?
- [ ] **Dead Hang** — does the timer count upward? Does voice say "15 seconds" at 15s?
- [ ] **Leg Raises** — do reps count when legs raise (hip angle decreases) and return to hang?
- [ ] **Dips** — do reps track correctly using elbow angle? Does rep count increment on each full dip?
- [ ] **Regression: pushup auto-start** — does lying face-down trigger 3s countdown automatically?
- [ ] **Regression: plank timer** — does the plank timer run and show elapsed seconds?
- [ ] **Regression: squat rep counting** — do squats count correctly with the existing exercises?
- [ ] **Regression: calibration warmup counter** — does the counter show x/3 format (e.g. 0/3 → 1/3 → 2/3 → 3/3) during warmup?

---

## Phase 5 — Batch 2 (Inverted Rows, L-Sit, Pistol Squat, Glute Bridge)
- [ ] **All 13 exercises in dropdown** — do the 4 new exercises appear (inverted rows, L-sit, pistol squat, glute bridge)?
- [ ] **Glute bridge auto-start** — does lying on back with knees bent trigger the 3s hold countdown?
- [ ] **Glute bridge reps** — do reps count as hips drive up and return to floor?
- [ ] **Pistol squat tracking** — does rep counting track the bending (working) leg, not the extended leg?
- [ ] **L-Sit timer** — does the timer count upward? Does "Keep legs horizontal" cue fire when legs drop?
- [ ] **Inverted rows** — do reps count pulling up to bar and returning? Does "Keep hips up" cue fire when sagging?

---

## Calibration UX + Rest Screen
- [ ] **Warmup rep counter** — during calibration tracking, does #rep-counter show 0/3 → 1/3 → 2/3 → 3/3?
- [ ] **Post-calibration message** — after calibration completes, does it say "✓ Calibrated! Tap Ready to start your [exercise]"?
- [ ] **Rest screen** — after finishing a set with reps, does the rest screen appear with a 60s countdown?
- [ ] **Skip rest** — does "Start Next Set" button end the rest early and return to idle?

---

## Welcome Screen + Exercise Picker (added 2026-04-07)
- [ ] **Welcome screen** — does the 3-button welcome screen appear on first load (Calibrate & Start, Load Calibration, Jump to Workout)?
- [ ] **Exercise picker** — does tapping the exercise name open the card grid modal?
- [ ] **Card grid** — do all 13 exercise cards show name + mini silhouette?
- [ ] **Exercise switch** — does selecting a card close the modal and update the active exercise?
