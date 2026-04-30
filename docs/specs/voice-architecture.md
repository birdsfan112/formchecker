# FormCheck — Voice Coaching Architecture

The voice system uses layered gating to prevent feedback overload. Do not bypass these layers — if something "needs" to speak every frame, it's a bug.

## The Three Layers

1. **`speak(text)`** — gated: max 1 voice cue per rep (`state.spokenThisRep`), plus per-cue cooldown via `cueShouldFire()`. Use for all form feedback during exercise.
2. **`speakForce(text)`** — ungated: always fires. Use only for system messages (countdown, rep milestones, set done).
3. **Cooldown system** — `cueShouldFire(cueKey, ms)` prevents the same form cue from firing more than once per cooldown window (typically 15s for form cues, 20s for plank cues).

## Regression Tips Gate
Suggestions like "try knees-down pushup" are gated behind `pastFirstSet()` — they only fire after the user has completed at least one set of that exercise. Don't remove this gate.

## Adding a New Cue
- Use `speak()` for in-rep form feedback (it will be silenced after the first cue per rep)
- Use `speakForce()` only for state transitions and milestones
- Pass a unique `cueKey` string to `cueShouldFire()` — pick something descriptive like `'pushup-depth'` or `'squat-knees'`
- Choose a cooldown: 15s for most form cues, longer for encouragement/summary cues
