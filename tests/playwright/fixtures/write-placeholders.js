#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const placeholders = [
  { id: 'pushup',          isTimed: false, isFloor: true,  cat: 'rep-counter, floor',     recording: 'pushup-reps.y4m',        notes: '~5 full push-up reps; assert rep counter increments; hipSag cue; auto-start from floor' },
  { id: 'lunge',           isTimed: false, isFloor: false, cat: 'rep-counter, standing',  recording: 'lunge-reps.y4m',         notes: '~5 lunge reps; assert front-knee angle crosses knee_down threshold' },
  { id: 'pistol',          isTimed: false, isFloor: false, cat: 'rep-counter, standing',  recording: 'pistol-reps.y4m',        notes: '~3 pistol squats each side; assert rep count' },
  { id: 'pullup',          isTimed: false, isFloor: false, cat: 'rep-counter, hanging',   recording: 'pullup-reps.y4m',        notes: '~3 pull-ups; assert chin-over-bar gate (downGate) fires correctly' },
  { id: 'pike',            isTimed: false, isFloor: false, cat: 'rep-counter, floor-ish', recording: 'pike-reps.y4m',          notes: '~5 pike push-ups; assert hipsHigh cue behavior' },
  { id: 'dip',             isTimed: false, isFloor: false, cat: 'rep-counter, bars',      recording: 'dip-reps.y4m',           notes: '~5 dips; assert elbowFlare cue; verify Backlog §3 orientation nudge' },
  { id: 'row',             isTimed: false, isFloor: false, cat: 'rep-counter, inverted',  recording: 'row-reps.y4m',           notes: '~5 rows; assert hipSag cue fires when body sags' },
  { id: 'glutebridge',     isTimed: false, isFloor: true,  cat: 'rep-counter, floor',     recording: 'glutebridge-reps.y4m',   notes: 'invertedPolarity; assert 5 reps count with inverted phase logic' },
  { id: 'legraise',        isTimed: false, isFloor: false, cat: 'rep-counter',            recording: 'legraise-reps.y4m',      notes: '~5 leg raises; assert hip angle crosses threshold' },
  { id: 'bandpullapart',   isTimed: false, isFloor: false, cat: 'rep-counter, mobility',  recording: 'bandpullapart-reps.y4m', notes: 'invertedPolarity + wrist-span tracking; assert 5 spread→center reps; verify bug fixed (audit 2026-04-10)' },
  { id: 'plank',           isTimed: true,  isFloor: true,  cat: 'pose-hold, floor',       recording: 'plank-hold.y4m',         notes: '~30 s plank; assert timer advances; hipSagMild and hipSagSevere cues' },
  { id: 'lsit',            isTimed: true,  isFloor: false, cat: 'pose-hold',              recording: 'lsit-hold.y4m',          notes: '~15 s L-sit; assert legsDropped cue fires when hip angle drops' },
  { id: 'archhang',        isTimed: true,  isFloor: false, cat: 'pose-hold, hanging',     recording: 'archhang-hold.y4m',      notes: '~20 s arch hang; assert gripLost (shoulder-wrist gap < 0.08) cue' },
  { id: 'scapularpull',    isTimed: true,  isFloor: false, cat: 'pose-hold, hanging',     recording: 'scapularpull-hold.y4m',  notes: '~15 s scapular pulls; assert elbow-bend cue when elbow < 150 deg' },
  { id: 'shoulderdislocate', isTimed: true, isFloor: false, cat: 'mobility, standing',    recording: 'shoulderdislocate-hold.y4m', notes: '~20 s; assert elbow-angle cue when arms not straight' },
  { id: 'hipflexor',       isTimed: true,  isFloor: false, cat: 'mobility, kneeling',     recording: 'hipflexor-hold.y4m',     notes: '~30 s; assert torso-upright cue on lean' },
  { id: 'wristwarmup',     isTimed: true,  isFloor: false, cat: 'mobility, standing',     recording: 'wristwarmup-hold.y4m',   notes: '~20 s; assert arm-height cue' },
  { id: 'foamroller',      isTimed: true,  isFloor: true,  cat: 'mobility, floor',        recording: 'foamroller-hold.y4m',    notes: '~30 s; timed auto-start floor exercise; no active form cue to assert' },
  { id: 'birddog',         isTimed: true,  isFloor: true,  cat: 'mobility, floor',        recording: 'birddog-hold.y4m',       notes: '~20 s; assert hip-rotation cue fires during extension' },
];

const dir = path.join(__dirname, '..', 'exercises');

for (const ex of placeholders) {
  const content =
`/**
 * Smoke test placeholder — ${ex.id} (${ex.cat})
 *
 * Category: ${ex.cat} (isTimed: ${ex.isTimed}, isFloor: ${ex.isFloor})
 *
 * TODO: Record a Y4M video and save to:
 *   tests/playwright/fixtures/${ex.recording}
 * Then expand this placeholder with pose-detection assertions:
 *   - ${ex.notes}
 *
 * See docs/playwright-harness-guide.md for recording instructions.
 */

import { test, expect } from '@playwright/test';
import { loadPage, waitForRegistry, getExerciseConfig } from './_helpers';

test('${ex.id}: registry config is correct', async ({ page }) => {
  await loadPage(page);
  await waitForRegistry(page);
  const config = await getExerciseConfig(page, '${ex.id}');
  expect(config).not.toBeNull();
  expect(config!.id).toBe('${ex.id}');
  expect(config!.isTimed).toBe(${ex.isTimed});
  expect(config!.isFloor).toBe(${ex.isFloor});
  // TODO: full pose-detection assertions need ${ex.recording}
});
`;
  const outPath = path.join(dir, ex.id + '.spec.ts');
  fs.writeFileSync(outPath, content);
  console.log('Written', ex.id + '.spec.ts');
}
console.log('Done — ' + placeholders.length + ' placeholder files created.');
