# FormCheck — Architecture Map
Quick reference for where things live in `index.html`.
File is organized: CSS → HTML → Script tags (MediaPipe CDNs) → JavaScript (state → helpers → silhouettes → gesture → state machine → exercises → events → MediaPipe init → camera).
Sections are separated by `// ===== SECTION NAME =====` comments.

| What | Where in index.html |
|------|---------------------|
| State object | `const state = { ... }` near top of `<script>` |
| Joint angle math | `function angle(a, b, c)` |
| Voice coaching | `speak()` (gated, 1 per rep) and `speakForce()` (always fires) |
| Cue cooldowns | `cueShouldFire(cueKey, cooldownMs)` |
| Silhouette guides | `drawGuide()`, `drawStandingSide()`, `drawHorizontalSide()`, `drawHangingFront()` |
| Gesture detection | `detectPalmGesture(lm)` → `isOpenPalm()` |
| Workout state machine | `setWorkoutState(newState)` — idle/countdown/active/paused |
| Exercise analyzers | `exercises.pushup.analyze(lm)`, `.squat`, `.pullup`, `.lunge`, `.plank` |
| Exercise metadata | `exerciseMeta` object — names, hints, guide coordinates |
| Camera + MediaPipe init | `startCamera()` at bottom |
