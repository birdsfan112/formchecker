# Form-Cue Reachability Audit — 2026-04-26

**Scope:** All 22 exercise configs registered via `addExercise()` in `C:\Hub\FormChecker\index.html` (lines 828–1933). Audited every cue in every `formChecks` array against the framework's `goingDown` semantics (`index.html:544–551`) and `angle()` clamp `[0, 180]` (`index.html:2497–2502`).

## UNREACHABLE (7 cues)

| Exercise | Cue id | Line | Reason | Fix sketch |
|---|---|---|---|---|
| pushup | `goDeeper` | `index.html:892` | `phase === 'down' && goingDown` — `goingDown` is only set in the `'up'` phase per `index.html:545–547`; in `'down'` only `goingUp` is computed. | Either fire on entry (`phase === 'down' && angleNow > calibration.pushup.elbow_down + 12` with a per-rep latch via `state.spokenThisRep`), OR fire in `'up'` phase during descent (`phase === 'up' && goingDown && angleNow > calibration.pushup.elbow_down + 12`), so the cue arrives before bottom-out. |
| squat | `goDeeper` | `index.html:944` | Same — `goingDown` is structurally `false` whenever `phase === 'down'`. | Same redesign as pushup; if the rep didn't reach `knee_down + X`, deduct on the up-transition or fire in `'up'` while descending. |
| lunge | `goDeeper` | `index.html:1030` | Same. | Same as squat. |
| pike | `goDeeper` | `index.html:1208` | Same. | Same as pushup. |
| dip | `goDeeper` | `index.html:1252` | Same. | Same as pushup. |
| pushup | `hipsTooHigh` | `index.html:880–884` | `(leftBack + rightBack)/2 > 195` but `angle()` clamps to `[0, 180]`. | Replace with a Y-coordinate check (e.g., `avgHipY < (avgShoulderY + avgAnkleY)/2 - 0.06`) — that's how `pike.hipsHigh` (`index.html:1198–1202`) and `row.hipSag` (`index.html:1310–1318`) detect pike-shape. Or remove if `pike.hipsHigh` is the canonical pattern. |
| plank | `hipsTooHigh` | `index.html:1378–1385` | Same `> 195` against a clamped angle. (Comment at `:1379` already calls this dead.) | Same — switch to Y-shape comparison or remove; `hipSagSevere` already covers the dropped-hips case. |

(Count: 7 UNREACHABLE total — five `goDeeper` siblings + two `hipsTooHigh` siblings.)

## SUSPECT (3 cues)

| Exercise | Cue id | Line | Reason |
|---|---|---|---|
| glutebridge | `driveHigher` | `index.html:1517–1521` | Inverted polarity: enters `'down'` when `angleNow > 150`, exits when `< 110`. Cue fires on `phase === 'down' && angleNow < 145`. Window 110–145 is reachable, but only on a partial / sagging hold — never on a clean rep. Worth confirming the 145° magic number was deliberate (no rationale comment). Suggest tying to calibration: `< calibration.glutebridge.hip_down - 5`. |
| pullup | `chinOverBar` | `index.html:1143–1146` | Magic `angleNow < 100` while `calibration.pullup.elbow_top` defaults to 80 (and is dynamically calibrated at `:2107`). After calibration the gate at 100 may not align with "near top" — too loose for a deeply-bent puller, too strict for a lanky one. Tie to calibration: `angleNow < calibration.pullup.elbow_top + 20` or similar. |
| lunge | `torsoLean` | `index.html:1039–1042` | `angle(lm[11], lm[23], lm[25]) < 140` fires anywhere in the rep, including standing tall (where this angle naturally drops if camera is slightly off-axis). No phase gate. Also uses left-side-only landmarks — fragile when user faces the other way. Compare to squat's `torsoLean` (`:970–975`) which gates on `phase === 'down'` and uses a tighter threshold (45°). The 140° magic differs from squat's 45° because the joint shape differs (shoulder→hip→knee vs shoulder→hip→knee using different reference) — flagging the threshold as undocumented. |

## REACHABLE — 23 cues clean

`pushup.hipSag` (`:863`), `squat.kneeCave` (`:954`), `squat.torsoLean` (`:968`), `pistol.shoulderBalance` (`:1090`), `pullup.swing` (`:1151`), `pike.hipsHigh` (`:1196`), `dip.elbowFlare` (`:1259`), `row.hipSag` (`:1310`), `plank.hipSagSevere` (`:1352`), `plank.hipSagMild` (`:1366`), `deadhang.gripLost` (`:1418`), `lsit.legsDropped` (`:1465`), `legraise.bentKnees` (`:1563`), `archhang.shouldersShrugging` (`:1603`), `scapularpull.elbowsBent` (`:1643`), `shoulderdislocate.elbowsBent` (`:1683`), `hipflexor.torsoCollapsed` (`:1722`), `wristwarmup.armsDropped` (`:1761`), `bandpullapart.armsDropped` (`:1841`), `catcow.hipsNotLevel` (`:1882`), `birddog.hipsRotating` (`:1921`). Foam roller has no cues by design (`:1803`).

## Cross-reference / calibration sanity

Verified all `calibration.<id>` reads target the cue's owning exercise — no cross-exercise leaks (e.g., dip never reads squat). Pistol borrows squat's calibration at warmup time (`:2121`) but doesn't read it inside a cue, so safe.

## Total

**33 cues across 22 exercises. 7 UNREACHABLE, 3 SUSPECT, 23 REACHABLE.**

The five `goDeeper` cues plus two `hipsTooHigh` cues account for 100% of the structurally dead cues — both patterns exactly match the dormant-pattern hypothesis seeded in the audit brief.

---

## RESOLUTION (same-day, 2026-04-26)

All 7 UNREACHABLE cues fixed and shipped. SUSPECT cues left for phone-test verification.

### Framework signature extended

`buildRepAnalyzer` now passes `goingUp` and `phaseExtremum` to form-check `check()` callbacks (and to dynamic `cue.message` callbacks). Existing checks ignore the extra args (JS positional). `buildTestRepAnalyzer` and `buildTestRepAnalyzerEx` test harnesses updated to match.

### `goDeeper` redesigned (5 exercises)

The audit recommendation suggested `phase === 'down' && angleNow > calibration_bottom + 12`. **That direction is wrong.** Trace: `phaseExtremum` in `'down'` phase tracks the valley, set on entry to `angleNow` (already `< bottomThreshold`) and only ever decreased. So `phaseExtremum` is always `≤ bottomThreshold`, never `> bottomThreshold + 12`. And firing on `angleNow > bottom + 12` in 'down' phase incorrectly fires on the rising portion of *clean* deep reps too.

**Implemented:** `phase === 'down' && goingUp && phaseExtremum > (calibration_bottom - 12)`. Reads as: "post-bottom rising, AND deepest point reached stayed within 12° of the depth threshold (= shallow rep)." Boundary semantics:
- Pushup `elbow_down=100`: cue fires when `phaseExtremum > 88`. Deep rep (e.g., elbow at 80°) → 80 > 88 false → silent. Shallow rep (elbow only got to 95°) → 95 > 88 true → "Go deeper" fires.
- Same shape for squat (`knee_down-12=88`), lunge (`knee_down-12=98`), pike/dip (`elbow_down-12=78`).

### `hipsTooHigh` removed (2 exercises)

Both pushup and plank `hipsTooHigh` cues deleted entirely. Rationale: the dead-code direction (`avgBack > 195` against `angle()` clamp `[0, 180]`) is unreachable; replacing with a working Y-shape check would change real coaching behavior. For the dropped-hips direction, `pushup.hipSag` and `plank.hipSagSevere` already cover it. Pike-shape during a regular pushup can be added later as a *new* feature if phone-testing surfaces the need; pike push-ups have their own canonical `pike.hipsHigh` cue.

### Tests

- 5 stale tests that documented the dead behavior were rewritten or replaced with anti-regression tests confirming the cues stay removed.
- New tests cover the fixed boundary semantics (phaseExtremum=88 exactly → no fire; 89 → fires; deep rep at 80 → no fire; rising in 'down' fires only when goingUp=true).
- 3 squat tests adjusted to push to 'down' at 80° (deep enough that goDeeper can't false-positive against kneeCave/torsoLean priority).
- Result: 289/289 node tests + 44/44 Playwright tests pass.

### SUSPECT cues — left as-is

`glutebridge.driveHigher`, `pullup.chinOverBar`, `lunge.torsoLean` — flagged for phone-test before any code change. These involve magic-number thresholds that may or may not be load-bearing; can't tell from static analysis.
