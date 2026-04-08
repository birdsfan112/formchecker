# Exercise Testing Protocol
**FormCheck — Phone Testing Checklist for Individual Exercises**

This is a repeatable protocol for testing each exercise on your phone. Run it once per exercise, in a fresh browser session. Think of it like a pilot's pre-flight checklist — go in order, don't skip steps.

---

## Before You Start (Run Once Per Session)

1. **Hard-refresh the page** — Add `?v=N` to the URL (increment the number each time) or hold Shift and tap Reload. This clears the cache so you're testing the latest code.
2. **Stand 6–7 feet from your phone**, propped up in portrait orientation.
3. **Open the app** and confirm the camera permission dialog appears before the OS camera prompt.
4. **Tap "Enable Camera"** and allow camera access.
5. **Play music** (optional but realistic — tests that voice cues work alongside audio).

---

## Per-Exercise Checklist

Run this section once for each exercise. Circle or write ✅ / ❌ next to each item.

### Exercise being tested: ____________________
**Date:** ____________  **Phone / OS:** ____________

---

### Step 1 — Select the Exercise

- [ ] **1a. Open the exercise dropdown** and find the exercise by name.
- [ ] **1b. Tap the exercise** — the exercise name should appear on screen.
- [ ] **1c. Camera angle hint** — does the app tell you which direction to face (side view, front view, etc.)? _Write what it says:_ ________________________

---

### Step 2 — Silhouette Check (Idle State)

Get into position (or just stand near the camera) *without* starting the workout yet.

- [ ] **2a. Silhouette appears** — a body-shaped outline or filled shape is visible on the camera feed.
- [ ] **2b. Silhouette matches the exercise** — it shows the right starting position (e.g., hanging for dead hang, lying on floor for glute bridge). Not just a generic standing person.
- [ ] **2c. Silhouette is readable at 6+ feet** — you can see it clearly without squinting or stepping closer.

---

### Step 3 — Position Detection (Green Tint)

Move into the correct starting position for the exercise.

- [ ] **3a. Silhouette turns green** when you're properly lined up.
- [ ] **3b. Green tint is stable** — it doesn't flicker rapidly while you hold still.
- [ ] **3c. Green tint disappears** when you step out of position.
- [ ] **3d. State message gives a useful hint** when you're NOT in position (e.g., "Move closer," "Turn sideways"). _Write what it says:_ ________________________

---

### Step 4 — Starting the Workout

**For floor exercises** (push-ups, plank, pike push-ups, glute bridge):
- [ ] **4a. Auto-start triggers** — after holding the starting position for 3 seconds, a countdown appears (3-2-1) and the workout begins automatically. No hand gesture needed.
- [ ] **4b. Countdown is audible and visible** — you can see and hear the countdown.

**For standing/hanging exercises** (squats, pull-ups, lunges, dips, dead hang, leg raises, inverted rows, L-sit, pistol squat):
- [ ] **4a. Palm gesture works** — raise an open palm toward the camera and hold for 2 seconds. Workout begins.
  *OR*
- [ ] **4a (alternate). Ready button works** — tap the Ready button on screen. Workout begins.
- [ ] **4b. Countdown is audible and visible.**

---

### Step 5 — Rep Counting / Timer

**For rep-based exercises** (push-ups, squats, pull-ups, lunges, dips, pike push-ups, leg raises, inverted rows, pistol squat, glute bridge):
- [ ] **5a. Counter starts at 0** when workout begins.
- [ ] **5b. First rep counts** — do one complete rep. Counter goes to 1.
- [ ] **5c. Reps count reliably** — do 5 reps. Did all 5 count? Did any count twice? _Write what happened:_ ________________________
- [ ] **5d. Rep fires at the right moment** — the count ticks up when you complete the movement (e.g., at the top of a squat, not at the bottom).
- [ ] **5e. No phantom reps** — hold at the bottom of the movement for 3 seconds without moving. Counter should NOT increase.

**For timed exercises** (plank, dead hang, L-sit):
- [ ] **5a. Timer starts at 0:00** when workout begins.
- [ ] **5b. Timer counts upward** — confirm it advances each second.
- [ ] **5c. 15-second voice cue** — at 15 seconds, the app says something (e.g., "15 seconds"). _Write what it says:_ ________________________

---

### Step 6 — Form Coaching Cues

Each exercise has at least one form check. You need to intentionally trigger the bad form to confirm the cue fires.

**What bad form to simulate per exercise:**

| Exercise | Bad form to trigger | Expected voice cue |
|---|---|---|
| Push-ups | Let your hips sag toward the floor | "Keep your hips up" or similar |
| Squats | Don't go deep enough (quarter squat) | "Go deeper" or similar |
| Pull-ups | Use momentum / partial range | Form cue about full range |
| Lunges | Don't go deep enough | Depth cue |
| Plank | Let your hips sag | "Engage your core" or similar |
| Pike push-ups | Let your hips drop to pushup position | "Keep hips high" |
| Dips | Let elbows flare out to the sides | Elbow cue |
| Dead hang | Let your shoulders shrug up | Shoulder cue (if any) |
| Leg raises | Bend your knees during the raise | Straight-leg cue |
| Inverted rows | Let your hips sag | "Keep hips up" or similar |
| L-sit | Let your legs drop below horizontal | "Keep legs horizontal" |
| Pistol squat | Use your other foot to assist | Balance cue (if any) |
| Glute bridge | Don't drive hips to full extension | Full extension cue |

- [ ] **6a. Bad form triggers a voice cue** — simulate the bad form above. Did the app say something? _Write what it said:_ ________________________
- [ ] **6b. Cue is not spammy** — the same cue doesn't fire every 2 seconds. It waits before repeating.
- [ ] **6c. Good form = no cue** — after correcting form, does the cue stop?

---

### Step 7 — Out-of-Position During Workout

Mid-set, step back so the camera can barely see you (or turn away completely).

- [ ] **7a. Counter grays out** or freezes — reps stop counting while you're out of position.
- [ ] **7b. State message shows a hint** — e.g., "Move back into position." _Write what it says:_ ________________________
- [ ] **7c. Counting resumes** when you return to position.

---

### Step 8 — Finish Set

- [ ] **8a. Tap "Finish Set"** — workout stops.
- [ ] **8b. Voice summary plays** — app says something like "Good work — 8 reps, good form." _Write what it said:_ ________________________
- [ ] **8c. Rest screen appears** — 60-second countdown is visible.
- [ ] **8d. "Start Next Set" button** ends the rest early when tapped.
- [ ] **8e. Set is logged** — open the Log modal (tap the log icon). Confirm the set appears with the correct exercise name and rep count.

---

### Step 9 — Notes

**Anything felt off? Anything that surprised you?**

_______________________________________________
_______________________________________________
_______________________________________________

---

## Exercises to Test

Track completion below. Run the full checklist above for each one.

| Exercise | Tested | Result | Notes |
|---|---|---|---|
| Push-ups | | | |
| Squats | | | |
| Pull-ups | | | |
| Lunges | | | |
| Plank | | | |
| Pike push-ups | | | |
| Dips | | | |
| Dead hang | | | |
| Leg raises | | | |
| Inverted rows | | | |
| L-sit | | | |
| Pistol squat | | | |
| Glute bridge | | | |

---

## Reporting Bugs

For each ❌, write down:
1. **Which step failed** (e.g., "Step 5c — reps counted 6 instead of 5")
2. **What you expected** vs. **what actually happened**
3. **Whether it's consistent** — did it fail every time, or just once?

Send the completed checklist to Claude at the start of the next session. If you can, screen-record the failure — that's the fastest way to diagnose it. See `docs/debug-video-workflow.md` for how to extract frames.
