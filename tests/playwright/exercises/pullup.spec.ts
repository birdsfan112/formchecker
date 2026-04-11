/**
 * Regression guard — Pull-ups (hanging + rep-based + downGate)
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * Pull-up is the only exercise with a downGate — an extra predicate that must
 * pass BEFORE the 'up'→'down' phase transition fires. The gate is:
 *
 *   downGate(lm) { return lm[0].y < (lm[15].y + lm[16].y) / 2; }
 *
 * In plain English: chin (nose landmark 0) must be above the hands before a rep
 * starts counting. This prevents a partial pull where the elbows bend but the
 * chin never clears the bar from counting.
 *
 * In buildRepAnalyzer, the transition condition is:
 *   if (angleNow < bottomThreshold && phase === 'up' && (!downGate || downGate(lm)))
 *
 * If downGate is broken or accidentally removed, every elbow-bend would count a
 * rep — including ones where the chin never clears the bar. This test locks in
 * both the "gate prevents rep" and "gate allows rep" paths.
 *
 * CALIBRATION DEFAULTS
 * --------------------
 * calibrationKeys: { bottom: 'elbow_top', top: 'elbow_bottom' }
 * calibrationDefaults: { elbow_top: 80, elbow_bottom: 150 }
 *
 * Phase transitions (standard polarity):
 *   elbow angle < 80 AND downGate passes → phase 'up'→'down' (arm bent, chin over bar)
 *   elbow angle > 150                    → rep counted,  phase 'down'→'up'
 *
 * LANDMARK GEOMETRY
 * -----------------
 * isInPosition: avgWristY < avgShoulderY + 0.2
 *   wrists: y=0.3, shoulders: y=0.4 → 0.3 < 0.6 ✓
 *
 * Elbow angle < 80° (arms bent at top of pull-up):
 *   lm[11] shoulder=(0.3,0.4), lm[13] elbow=(0.3,0.2), lm[15] wrist=(0.5,0.3)
 *   atan2(0.1, 0.2)=26.6°, atan2(0.2, 0)=90° → diff=63.4° < 80 ✓ (both sides)
 *
 * downGate: lm[0].y < avgWristY(0.3)
 *   Chin above bar: lm[0].y = 0.05 → 0.05 < 0.3 ✓ (gate passes)
 *   Chin below bar: lm[0].y = 0.50 → 0.50 > 0.3 ✗ (gate fails)
 *
 * Elbow angle ≈ 180° (arms straight, hanging):
 *   shoulder, elbow, wrist all at same x (vertical) → atan2 gives -90° and +90° → 180° > 150 ✓
 *
 * What these tests DO NOT cover:
 *   - Real MediaPipe detection with a camera
 *   - 'Get your chin over the bar' form cue
 *   - 'Control the swing' form cue (hip drift > 0.15)
 */

import { test, expect } from '@playwright/test';
import {
  loadPage,
  waitForApp,
  exerciseExistsInSelect,
  exerciseIsTimed,
  jumpToWorkout,
  switchExercise,
  startWorkout,
  makeLandmarks,
  injectPoseFrame,
} from './_helpers';

// ---------------------------------------------------------------------------
// Landmark helpers
// ---------------------------------------------------------------------------

/**
 * Arms bent (elbow angle ≈ 63°), chin ABOVE wrists — downGate passes.
 *
 * isInPosition: avgWristY(0.3) < avgShoulderY(0.4) + 0.2 = 0.6 ✓
 * elbow angle avg ≈ 63° < elbow_top (80) ✓
 * downGate: lm[0].y (0.05) < avgWristY (0.3) ✓
 */
const PULLUP_BENT_CHIN_ABOVE = makeLandmarks({
  0:  { x: 0.5, y: 0.05 },  // nose/chin — ABOVE wrists (gate passes)
  11: { x: 0.3, y: 0.4  },  // left shoulder
  12: { x: 0.7, y: 0.4  },  // right shoulder
  13: { x: 0.3, y: 0.2  },  // left elbow
  14: { x: 0.7, y: 0.2  },  // right elbow
  15: { x: 0.5, y: 0.3  },  // left wrist
  16: { x: 0.5, y: 0.3  },  // right wrist
});

/**
 * Arms bent (same elbow angle ≈ 63°), chin BELOW wrists — downGate fails.
 *
 * Identical geometry to PULLUP_BENT_CHIN_ABOVE except lm[0].y = 0.5.
 * downGate: lm[0].y (0.5) < avgWristY (0.3) → false ✗
 */
const PULLUP_BENT_CHIN_BELOW = makeLandmarks({
  0:  { x: 0.5, y: 0.5  },  // nose/chin — BELOW wrists (gate fails)
  11: { x: 0.3, y: 0.4  },
  12: { x: 0.7, y: 0.4  },
  13: { x: 0.3, y: 0.2  },
  14: { x: 0.7, y: 0.2  },
  15: { x: 0.5, y: 0.3  },
  16: { x: 0.5, y: 0.3  },
});

/**
 * Arms straight, hanging (elbow angle ≈ 180°) — triggers rep completion.
 *
 * isInPosition: avgWristY(0.1) < avgShoulderY(0.4) + 0.2 = 0.6 ✓
 * shoulder, elbow, wrist vertically aligned (same x) →
 *   atan2(-y, 0)=-90°, atan2(+y, 0)=90° → diff=180° > elbow_bottom (150) ✓
 */
const PULLUP_HANGING = makeLandmarks({
  0:  { x: 0.5, y: 0.5  },  // chin well below wrists (irrelevant — downGate only checks 'up'→'down')
  11: { x: 0.4, y: 0.4  },  // left shoulder
  12: { x: 0.6, y: 0.4  },  // right shoulder
  13: { x: 0.4, y: 0.25 },  // left elbow  — vertically between shoulder and wrist
  14: { x: 0.6, y: 0.25 },  // right elbow
  15: { x: 0.4, y: 0.1  },  // left wrist  — at bar
  16: { x: 0.6, y: 0.1  },  // right wrist
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('pullup — downGate regression guard', () => {
  test('registry: is registered as a non-timed exercise', async ({ page }) => {
    await loadPage(page);
    await waitForApp(page);

    const exists = await exerciseExistsInSelect(page, 'pullup');
    expect(exists).toBe(true);

    const isTimed = await exerciseIsTimed(page, 'pullup');
    expect(isTimed).toBe(false);
  });

  test('rep does NOT count when chin is below the bar (downGate blocks phase transition)', async ({ page }) => {
    // The downGate must prevent 'up'→'down' when chin hasn't cleared the hands.
    // If downGate is removed or broken, the elbow-bend alone would trigger phase
    // 'down' and any subsequent hanging frame would count a rep.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'pullup');
    await startWorkout(page);

    // Arms are bent AND elbow < 80°, BUT chin is below wrists — gate fails, phase stays 'up'.
    await injectPoseFrame(page, PULLUP_BENT_CHIN_BELOW);
    // Hanging frame: elbow > 150°, but phase is still 'up' → topThreshold path never fires.
    await injectPoseFrame(page, PULLUP_HANGING);
    await expect(page.locator('#rep-counter')).toHaveText('0');
  });

  test('rep counts when chin clears the bar (downGate passes, full rep path)', async ({ page }) => {
    // Arms bent + chin above wrists → downGate passes → phase 'up'→'down'.
    // Then hanging → elbow > 150°, phase 'down' → rep counted.
    await loadPage(page);
    await waitForApp(page);
    await jumpToWorkout(page);
    await switchExercise(page, 'pullup');
    await startWorkout(page);

    // Rep 1: chin over bar → lower to hang
    await injectPoseFrame(page, PULLUP_BENT_CHIN_ABOVE);  // elbow=63° < 80, gate ✓ → phase 'down'
    await injectPoseFrame(page, PULLUP_HANGING);           // elbow=180° > 150, phase 'down' → rep counted
    await expect(page.locator('#rep-counter')).toHaveText('1');

    // Rep 2: confirms state resets correctly
    await injectPoseFrame(page, PULLUP_BENT_CHIN_ABOVE);
    await injectPoseFrame(page, PULLUP_HANGING);
    await expect(page.locator('#rep-counter')).toHaveText('2');
  });
});
