# Framework Refactor Audit — 2026-04-10

**Commit audited:** `94c634d` — "Framework refactor: migrate all 22 exercises to single-config pattern"
**Baseline:** `94c634d^` (parent)
**Scope:** Behavioral equivalence of all 22 exercise analyzers, old hand-written `analyze()` vs. new `buildRepAnalyzer`/`buildTimedAnalyzer` driven configs.
**Method:** Read each old `analyze()` body, then the corresponding new config, then traced the config through `buildRepAnalyzer` (`index.html:514-611`) or `buildTimedAnalyzer` (`index.html:614-659`) to reconstruct per-frame behavior. Compared thresholds, form-check logic, cue messages, cooldowns, voice functions, feedback priority, and rep-phase transitions.
**Verdict:** Refactor is overwhelmingly equivalent. Three exercises diverge in documented, mostly-intentional ways. Five others share a dead-code regression (goDeeper) that the roadmap already logged as non-regression. No silent threshold changes were found. No form-check messages were reworded. No cooldowns were altered.

---

## Per-Exercise Status

| # | Exercise | Old entry | New config | Status | Notes |
|---|---|---|---|---|---|
| 1  | pushup           | `_old:433-477`  | `index.html:827-901`   | EQUIVALENT | goDeeper & hipsTooHigh dead in new, already dead in old |
| 2  | squat            | `_old:479-536`  | `index.html:904-986`   | EQUIVALENT | goDeeper dead; kneeCave + torsoLean preserved |
| 3  | pullup           | `_old:538-575`  | `index.html:1105-1162` | EQUIVALENT | chin-over-hands rep gate correctly mapped to `downGate` |
| 4  | lunge            | `_old:577-625`  | `index.html:989-1052`  | EQUIVALENT | two-knee up-gate preserved via `min()` trick; goDeeper dead |
| 5  | plank            | `_old:627-665`  | `index.html:1327-1391` | EQUIVALENT | three-branch hip sag logic split into three mutually-exclusive checks |
| 6  | pike             | `_old:669-705`  | `index.html:1165-1217` | EQUIVALENT | goDeeper dead |
| 7  | **dip**          | `_old:707-751`  | `index.html:1220-1272` | **DIVERGENT** | Camera-orientation side-effect hint dropped (roadmap §3) |
| 8  | deadhang         | `_old:753-783`  | `index.html:1394-1430` | EQUIVALENT | |
| 9  | row              | `_old:785-825`  | `index.html:1275-1324` | EQUIVALENT | |
| 10 | **lsit**         | `_old:827-860`  | `index.html:1441-1477` | **DIVERGENT** | Timer moved from feedback text to rep-counter MM:SS; voice bumped from `speak` → `speakForce`; custom 15s dedupe lost |
| 11 | pistol           | `_old:862-899`  | `index.html:1055-1102` | EQUIVALENT | |
| 12 | glutebridge      | `_old:901-935`  | `index.html:1480-1527` | EQUIVALENT | Inverted polarity mapped cleanly; `hip_down=150` / `hip_up=110` preserved |
| 13 | legraise         | `_old:937-973`  | `index.html:1530-1576` | EQUIVALENT | Standard polarity; `hip_down=110` / `hip_up=150` preserved |
| 14 | archhang         | `_old:975-1009` | `index.html:1579-1616` | EQUIVALENT | |
| 15 | scapularpull     | `_old:1011-1044`| `index.html:1619-1656` | EQUIVALENT | |
| 16 | shoulderdislocate| `_old:1048-1080`| `index.html:1659-1695` | EQUIVALENT | |
| 17 | hipflexor        | `_old:1082-1113`| `index.html:1698-1734` | EQUIVALENT | |
| 18 | wristwarmup      | `_old:1115-1146`| `index.html:1737-1773` | EQUIVALENT | |
| 19 | **bandpullapart**| `_old:1148-1179`| `index.html:1813-1853` | **DIVERGENT** | Rep counting semantics changed — old was effectively broken (stuck in `phase='up'`); new counts reps via `invertedPolarity` |
| 20 | foamroller       | `_old:1180-1199`| `index.html:1780-1805` | EQUIVALENT | |
| 21 | catcow           | `_old:1201-1233`| `index.html:1856-1892` | EQUIVALENT | |
| 22 | birddog          | `_old:1235-1266`| `index.html:1895-1931` | EQUIVALENT | |

Legend: `_old` = `index.html` at commit `94c634d^`. `index.html` in the new-file column always refers to HEAD.

Totals: 19 EQUIVALENT, 3 DIVERGENT, 0 UNCERTAIN.

---

## Divergences — Details

### D1. dip — camera-orientation side-effect dropped
**Old** (`_old:744-746`):
```js
if (shoulderSpan < 0.10 && cueShouldFire('dip-orient', 20000)) {
  angleHint.textContent = 'Face the camera for best tracking';
}
```
**New** (`index.html:1220-1272`): this block is not ported.

The framework has no `onFrame(lm)` hook for per-frame side effects on DOM nodes outside the feedback/score/rep-counter path, so this was deliberately dropped during migration. Roadmap Backlog §3 records the decision and proposes restoration via a small `onFrame` extension or inlining into `trackingJoint`.

**User-visible impact:** when Scott takes dips side-on to the camera (shoulderSpan < 0.10), the old build displayed the "Face the camera for best tracking" hint in the `#angleHint` element every ~20s. The new build shows nothing. Rep counting and form cues are unaffected.

### D2. lsit — display and voice changes (intentional, noted in new config comment)
**Old** (`_old:839-859`):
```js
if (!state.plankStart) state.plankStart = Date.now();
const elapsed = Math.floor((Date.now() - state.plankStart) / 1000);
showFeedback(`${elapsed}s`, 'good');                                // (1) timer written to feedback
if (elapsed > 0 && elapsed % 15 === 0 && !state.spokenThisRep) {    // (2) custom 15s dedupe
  speak(`${elapsed} seconds`);                                      // (3) speak, not speakForce
  state.spokenThisRep = true;
} else if (elapsed % 15 !== 0) {
  state.spokenThisRep = false;
}
// Form: check legs stay horizontal
const avgHip = (leftHip + rightHip) / 2;
if (avgHip > 120) {
  showFeedback('Keep legs horizontal', 'warn');
  if (cueShouldFire('lsit-form', 8000)) speak('Keep legs horizontal');   // (4) speak, not speakForce
}
return { repCounted: false, score: 100 };                            // (5) no deduction ever
```

**New** (`index.html:1441-1477`) routes through `buildTimedAnalyzer`:
- Timer goes to `repCounter.textContent` as `MM:SS` (all timed exercises now), not into the feedback text line. **(Δ from 1)**
- 15s milestone fires `speakForce(`${secs} seconds`)` with no per-second dedupe. **(Δ from 2 + 3)**
- `legsDropped` form check with `scoreDeduction: 0` preserves the "no deduction" behavior. **(preserves 5)**
- Form cue uses `speakForce` (framework rule), not `speak`. **(Δ from 4)**
- Cooldown still 8000ms. ✓

**User-visible impact:**
- `#repCounter` now shows `0:00` → `0:15` etc. on L-sit instead of `0` (old showed raw elapsed seconds as string `"5s"` in the form feedback area).
- Voice: `speakForce` bypasses parts of the voice-gating stack (see `docs/voice-architecture.md`). Expect the form cue and milestone announcements to be more insistent than before.
- Multi-fire safety: if L-sit hits 15s on multiple frames in the same second, the framework will call `speakForce(...)` multiple times. The old `state.spokenThisRep` guard prevented that. Whether this manifests as audible stutter depends on whatever dedupe lives inside `speakForce` and the browser speech queue.

### D3. bandpullapart — rep counting semantics changed (likely silent bug fix in old)
**Old** (`_old:1159-1177`):
```js
if (wristSpan < calibration.bandpullapart.wrist_center && state.phase === 'spread') {
  state.phase = 'center'; state.spokenThisRep = false; repCounted = true;
} else if (wristSpan > calibration.bandpullapart.wrist_spread && state.phase === 'center') {
  state.phase = 'spread';
}
```

The old analyzer only reads/writes `state.phase` values of `'spread'` and `'center'`. But every other analyzer writes `'up'` / `'down'`, and — crucially — `resetSetState()` at `_old:3026-3044` unconditionally seeds `state.phase = 'up'` at the start of every set. Result: on the first frame of a band-pull-apart set, `state.phase` is `'up'`, matching neither `'spread'` nor `'center'`, so neither branch can fire. The phase is stuck at `'up'` for the entire set, no reps are ever counted.

The only way the old analyzer could have counted a rep is if the user switched mid-session from pull-up → bandpullapart after pull-up had left `state.phase === 'down'` (which still wouldn't match). In practice, the old bandpullapart rep counter was dead.

**New** (`index.html:1813-1853`) uses `invertedPolarity: true` with `calibrationKeys: { bottom: 'wrist_spread', top: 'wrist_center' }`. The framework's inverted-polarity branch (`index.html:554-566`) handles the `'up'` → `'down'` → `'up'` cycle cleanly:
- `wristSpan > 0.32 && phase==='up'` → `phase='down'`
- `wristSpan < 0.18 && phase==='down'` → `phase='up'` + `repCounted=true`

Threshold semantics (`wrist_center: 0.18`, `wrist_spread: 0.32`) are unchanged. The form check (`avgWristY > avgShoulderY + 0.15 → -20 "Keep arms at shoulder height"` / cooldown 12000ms) is unchanged.

**User-visible impact:** the band pull-apart rep counter will actually work now. If Scott's phone-testing memory of this exercise is "it never counted reps" or "it sometimes counted reps inconsistently", the new build will behave differently.

Validation note: framework validation (`validateExerciseConfig`, `index.html:486`) skips the `top > bottom` numeric check when `invertedPolarity: true`, which is correct here because `wrist_center (0.18) < wrist_spread (0.32)` would otherwise throw.

---

## Dead Code Inherited from Old Analyzers (Non-Regression)

These are **flagged for the record** — they were also dead in the parent commit. Roadmap Backlog §2 already tracks them.

### goDeeper (pushup, squat, lunge, pike, dip)
Old check:
```js
phase === 'down' && goingDown && angleNow > bottomCalibration + 12
```
with `goingDown = angle < state.prevAngle - 1` (no phase gating).

In the new framework, `buildRepAnalyzer` only tracks `goingDown`/`goingUp` inside the current phase's extremum branch (`index.html:542-550`). In the `'down'` phase, only `goingUp` is ever set; `goingDown` is always `false`. The goDeeper form-check signature `(lm, angle, phase, goingDown)` therefore always receives `goingDown === false` in `'down'` phase, and the check is completely unreachable.

**Why it was effectively dead in the old code too:** once the old analyzer entered `'down'` phase, the user's elbow/knee angle was already below the calibration bottom threshold. The check requires that elbow be 12° above the threshold while still in `'down'` phase AND the user be descending (`goingDown=true`). The only scenario that satisfies all three is a bounce pattern: user passes the bottom threshold, comes back up >12°, then starts descending again — all before hitting the up-transition threshold. That's a pathological rep, not a typical one.

Phone-testing impact: zero. Both old and new versions effectively never said "Go deeper" during these exercises.

### hipsTooHigh (pushup, plank)
Old check: `avgBack > 195`. `angle()` clamps to `[0, 180]`, so the sum-of-two-sides / 2 can never exceed 180. The branch is unreachable for any landmark input. Dead in both versions. Roadmap §2 tracks this.

---

## Framework-Level Behavioral Notes

These apply across every migrated exercise. None are regressions, but they're worth understanding before phone testing.

**F1. Direction-detection jitter threshold 1° → 3°.** Old analyzers did frame-to-frame `angle < prevAngle - 1`. The framework uses phase-local-extremum direction detection (`phaseExtremum ± JITTER` where `JITTER = 3`, `index.html:520`). Because the only place the old `goingDown` signal was consumed was the now-dead `goDeeper` check, the raised threshold has no effect on user-facing behavior in any exercise. But: if a future form check wants to read `goingDown` during the `'down'` phase, it will see `false` always until `buildRepAnalyzer` is extended.

**F2. Rep-phase transitions are still direct threshold compares.** The framework does **not** use the fractional `downTrigger: 0.85` pattern from the draft spec. It does `angleNow < cal[bottom]` / `angleNow > cal[top]` (`index.html:567-577`) — byte-for-byte the same arithmetic the old analyzers used against `calibration.pushup.elbow_down` / `elbow_up`. Rep counts are therefore preserved exactly.

**F3. State scoping changed from global to closure.** Old analyzers shared `state.phase`, `state.prevAngle`, `state.plankStart`, `state.spokenThisRep` via the global `state` object. The framework gives each analyzer its own closure-scoped `phase`, `phaseExtremum`, `prevAngle`, `plankStart`. `resetSetState()` (`index.html:3578-3599`) still clears the global fields AND walks `analyzerResets` to call each closure's `reset()`. This should eliminate a class of cross-exercise state leak bugs the old code was prone to (e.g., switching from squat mid-rep into plank would carry stale `state.phase` values). Verify nothing broken by: start an exercise → switch mid-set to another → verify rep/timer state is clean.

**F4. `state.spokenThisRep` is still touched by the new rep analyzer.** `buildRepAnalyzer` still writes `state.spokenThisRep = false` on the up-transition (`index.html:564, 574`). That global is consumed by the voice gating layer (`cueShouldFire`, breathing cues, etc.). Behavior preserved.

**F5. Timed analyzers hardcode `speakForce` and the 15s milestone.** The old plank, deadhang, archhang, scapularpull, shoulderdislocate, hipflexor, wristwarmup, foamroller, catcow, and birddog analyzers already used `speakForce` + `if (secs % 15 === 0) speakForce(...)`. L-sit was the only one that used `speak` and tracked `state.spokenThisRep` to dedupe. L-sit is now folded into the common pattern — see D2.

**F6. Upstream `isInPosition` gate is unchanged.** The main loop still calls `isInPosition` before `analyze` (both old and new). All `isInPosition` bodies are copied verbatim across the migration. Position gating behavior is identical across all 22 exercises.

**F7. `goodFormMessage` / `goodHoldMessage` defaults.** Rep analyzer defaults to `'Good form'` (`index.html:601`). Timed analyzer defaults to `'Good form — hold it!'` (`index.html:649`). Every config either sets the correct custom message or falls through to the default. One subtle case: `lsit` does NOT set `goodHoldMessage`, so it will show `'Good form — hold it!'` instead of the old `${elapsed}s` — part of D2.

---

## Top 3 Exercises at Risk of Regression in Phone Testing

1. **bandpullapart (D3)** — this is the largest behavioral change. Rep counting now works; it probably didn't before. **Validate by:** selecting bandpullapart, performing 5 slow reps, and confirming the rep counter increments 0→5. Also test one rep where the band stops halfway (wristSpan ≈ 0.25) to confirm the analyzer doesn't false-count on partial spreads. If rep counting is noisy, the `wrist_center: 0.18` / `wrist_spread: 0.32` defaults may need tuning.

2. **lsit (D2)** — the display has changed in a visible way (timer now in rep counter, not feedback text) and voice cues have escalated from `speak` to `speakForce`. **Validate by:** holding an L-sit for at least 30 seconds. Confirm (a) the rep counter shows `0:00, 0:01, 0:02...` formatted properly, (b) the feedback area shows "Good form — hold it!" or "Keep legs horizontal" depending on leg position, (c) the 15s and 30s milestones are announced, (d) there's no audible double-announcement at the 15s/30s marks.

3. **dip (D1)** — the "Face the camera for best tracking" hint is gone. If Scott habitually does dips side-on, he may notice the loss of the prompt and wonder if tracking is just broken. **Validate by:** doing dips once side-on and confirming that rep counting + the elbowFlare check still behave correctly without the hint. If the user experience feels worse, restore per roadmap §3.

After those three, the next tier of "worth testing carefully" for rep-counting correctness (because they exercise less-common framework paths):

4. **pullup** — first exercise to depend on `downGate`. Verify a rep only counts when chin clears the hands. Try a deliberate partial rep (arms bent to 90° but chin below hands) — it should NOT increment the counter.
5. **glutebridge** — only inverted-polarity angle-based exercise. Verify rep counts on the return-to-floor, not on the peak.
6. **lunge** — uses `min()` trick to enforce the old "both knees > knee_up" up-transition. Test reps where one leg is slow to extend and confirm the rep doesn't count until both legs are straight.

---

## Recommended Phone-Test Focus Order for Tomorrow

**Session 1 — the three real divergences + key framework paths (~20 min):**
1. bandpullapart — rep counter verification (5 clean reps + 1 partial)
2. lsit — display + milestone audio (30s hold)
3. dip — regression check (10 reps side-on, 10 reps front-on)
4. pullup — downGate verification (5 full reps + 1 deliberate partial)
5. glutebridge — inverted polarity (10 reps)
6. lunge — min() trick (10 reps, occasionally slow one leg)

**Session 2 — the most-used rep exercises, baseline confidence (~15 min):**

7. pushup — 10 reps, induce hip sag once to verify cue, induce good form to verify "Good form"
8. squat — 10 reps, test both front-view (kneeCave cue) and side-view (torsoLean cue)
9. pike — 5 reps, verify "Keep hips high" fires on intentional hip drop
10. row — 5 reps, verify "Keep hips up — straight body" fires on intentional sag
11. pistol — 3 reps per side, verify shoulder balance cue
12. legraise — 5 reps, verify bent-knees cue

**Session 3 — timed exercises (all share one framework path; batch-test ~15 min):**

13. plank — 30s, induce severe hip sag (confirm 30-pt deduction and cue) and mild sag (confirm silent 10-pt deduction with "Good form — hold it!" still shown)
14. deadhang — 30s + induce grip-lost cue
15. archhang — 20s
16. scapularpull — 20s
17. shoulderdislocate — 20s
18. hipflexor — 30s per side, verify torsoCollapsed cue on slouch
19. wristwarmup — 30s
20. foamroller — 30s (should say "Breathe and relax into the roller" continuously)
21. catcow — 30s
22. birddog — 30s, verify hipsRotating cue on intentional rotation

**Cross-cutting regression checks, done once during Session 1 or 2:**
- Switch exercises mid-set → verify rep counter and phase state reset cleanly (exercises F3 cross-exercise state leak coverage).
- Start any exercise, let it calibrate, then reload the page and resume → verify calibration values persist and rep counting still hits the calibrated thresholds.

If any Session 1 test surfaces a bug, stop and investigate before continuing.

---

## Reviewer Notes

- The refactor **did not** change any form-check threshold, any cue message string, any cooldown value, or any `isInPosition` body. That's the cleanest possible outcome for a 2185-line diff.
- The one non-obvious equivalence that deserves a second look is **lunge**: old code required **both** knees' angles > `knee_up` to count a rep; new code tracks `min(L, R)` and does a single compare. `min(a,b) > X ⟺ a > X ∧ b > X`, so this is mathematically exact, not approximate.
- Glute bridge's inverted polarity mapping is worth understanding before touching: `hip_down: 150` means "hip angle **above** 150° = hips are **raised**, we're in the active phase." The new config uses `invertedPolarity: true` + `calibrationKeys: { bottom: 'hip_down', top: 'hip_up' }`, and the `invertedPolarity` branch in `buildRepAnalyzer` (`index.html:554-566`) flips the comparison directions so the semantics survive.
- The test suite grew 207 → 289 tests during this refactor, with parallel framework implementations in `tests.js` covering both rep and timed analyzers, including `invertedPolarity` with angle-based (glutebridge) and non-angle (bandpullapart) tracking, and `downGate` (pullup). That is the strongest safety net the refactor has right now — stronger than any audit. But it only exercises the pure logic extracted into `tests.js`; **it does not exercise** real MediaPipe landmark streams, voice gating, DOM writes, or rest/set lifecycle. Those are still phone-only.
- This audit is static-read-only. It did not run `node tests.js` and did not run the app. Treat it as a complement to, not a replacement for, the test suite and the phone test session.

---

*Audit written 2026-04-10. Scope: behavioral equivalence of 22 exercise analyzers migrated in commit `94c634d`.*
