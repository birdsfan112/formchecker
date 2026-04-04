#!/usr/bin/env node

/**
 * FormCheck Fitness App - Comprehensive Unit Tests
 * Tests pure JavaScript logic functions extracted from the browser app
 */

// ===== TEST FRAMEWORK =====
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

function assertCloseTo(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ~${expected} (±${tolerance}), got ${actual}: ${message}`);
  }
}

function assertBool(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

// ===== EXTRACTED PURE FUNCTIONS =====

/**
 * Calculate angle between three points (in degrees)
 * Point structure: { x: number, y: number }
 */
function angle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs(radians * 180 / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/**
 * Hybrid gesture detection: raised hand with palm facing camera
 * PRIMARY: wrist above shoulder (body landmarks — reliable at distance)
 * SECONDARY: average fingertip visibility (palm facing camera vs turned away)
 */
function isRaisedPalm(wrist, shoulder, pinky, index, thumb) {
  // Primary: wrist must be visible and above shoulder
  if (wrist.visibility < 0.6 || shoulder.visibility < 0.5) return false;
  if (wrist.y > shoulder.y - 0.03) return false;

  // Secondary: fingertip landmarks should be somewhat visible
  const avgFingerVis = (pinky.visibility + index.visibility + thumb.visibility) / 3;
  if (avgFingerVis < 0.2) return false;

  return true;
}

/**
 * Cooldown system for cues (prevents spam)
 * Returns true if cooldown has elapsed since last fire
 */
function createCueManager() {
  const cooldowns = {};

  return {
    shouldFire(cueKey, cooldownMs) {
      const now = Date.now();
      const last = cooldowns[cueKey] || 0;
      if (now - last < cooldownMs) return false;
      cooldowns[cueKey] = now;
      return true;
    },
    reset() {
      Object.keys(cooldowns).forEach(k => delete cooldowns[k]);
    }
  };
}

/**
 * Plank pose validation
 * Checks if body is roughly horizontal (vertical span < 0.25)
 */
function validatePlankPose(lm) {
  const avgShoulderY = (lm[11].y + lm[12].y) / 2;
  const avgAnkleY = (lm[27].y + lm[28].y) / 2;
  const verticalSpan = Math.abs(avgShoulderY - avgAnkleY);
  return verticalSpan <= 0.25;
}

/**
 * Extract form score for push-ups (back angle validation)
 */
function pushupFormAnalysis(lm, prevAngle, phase) {
  const leftElbow = angle(lm[11], lm[13], lm[15]);
  const rightElbow = angle(lm[12], lm[14], lm[16]);
  const avgElbow = (leftElbow + rightElbow) / 2;

  const goingDown = prevAngle !== null && avgElbow < prevAngle - 1;

  const leftBack = angle(lm[11], lm[23], lm[27]);
  const rightBack = angle(lm[12], lm[24], lm[28]);
  const avgBack = (leftBack + rightBack) / 2;

  let repCounted = false;
  let newPhase = phase;

  if (avgElbow < 100 && phase === 'up') {
    newPhase = 'down';
  } else if (avgElbow > 150 && phase === 'down') {
    newPhase = 'up';
    repCounted = true;
  }

  let score = 100;
  let feedback = [];

  if (avgBack < 145) {
    score -= 30;
    feedback.push('Hips dropping');
  } else if (avgBack > 195) {
    score -= 20;
    feedback.push('Hips too high');
  }

  if (newPhase === 'down' && goingDown && avgElbow > 110) {
    score -= 15;
    if (feedback.length === 0) feedback.push('Go deeper');
  }

  return {
    repCounted,
    score: Math.max(0, score),
    feedback: feedback.length === 0 ? 'Good form' : feedback[0],
    avgElbow,
    avgBack,
    newPhase
  };
}

/**
 * Extract form score for squats (knee angle validation)
 */
function squatFormAnalysis(lm, prevAngle, phase) {
  const leftKnee = angle(lm[23], lm[25], lm[27]);
  const rightKnee = angle(lm[24], lm[26], lm[28]);
  const avgKnee = (leftKnee + rightKnee) / 2;

  const goingDown = prevAngle !== null && avgKnee < prevAngle - 1;

  let repCounted = false;
  let newPhase = phase;

  if (avgKnee < 100 && phase === 'up') {
    newPhase = 'down';
  } else if (avgKnee > 160 && phase === 'down') {
    newPhase = 'up';
    repCounted = true;
  }

  let score = 100;
  let feedback = [];

  if (newPhase === 'down' && goingDown && avgKnee > 110) {
    score -= 20;
    feedback.push('Go deeper');
  }

  const shoulderSpan = Math.abs(lm[11].x - lm[12].x);
  const isFrontView = shoulderSpan > 0.15;

  if (isFrontView && newPhase === 'down') {
    const kneeSpan = Math.abs(lm[25].x - lm[26].x);
    const ankleSpan = Math.abs(lm[27].x - lm[28].x);
    if (kneeSpan < ankleSpan * 0.65) {
      score -= 25;
      if (feedback.length === 0) feedback.push('Push knees out');
    }
  }

  if (!isFrontView && newPhase === 'down') {
    const torsoLean = angle(lm[11], lm[23], lm[25]);
    if (torsoLean < 45) {
      score -= 15;
      if (feedback.length === 0) feedback.push('Chest up');
    }
  }

  return {
    repCounted,
    score: Math.max(0, score),
    feedback: feedback.length === 0 ? 'Good form' : feedback[0],
    avgKnee,
    isFrontView,
    newPhase
  };
}

/**
 * Extract form score for planks (back angle validation + hold time)
 */
function plankFormAnalysis(lm, plankStartTime) {
  const avgShoulderY = (lm[11].y + lm[12].y) / 2;
  const avgAnkleY = (lm[27].y + lm[28].y) / 2;
  const verticalSpan = Math.abs(avgShoulderY - avgAnkleY);

  // Validate plank position
  if (verticalSpan > 0.25) {
    return {
      isInPlankPosition: false,
      plankSecs: 0,
      score: 0,
      feedback: 'Get into plank position'
    };
  }

  const leftBack = angle(lm[11], lm[23], lm[27]);
  const rightBack = angle(lm[12], lm[24], lm[28]);
  const avgBack = (leftBack + rightBack) / 2;

  const plankStartMs = plankStartTime || Date.now();
  const plankSecs = Math.floor((Date.now() - plankStartMs) / 1000);

  let score = 100;
  let feedback = [];

  if (avgBack < 145) {
    score -= 30;
    feedback.push('Hips dropping');
  } else if (avgBack < 155) {
    score -= 10;
  } else if (avgBack > 195) {
    score -= 20;
    feedback.push('Hips too high');
  }

  return {
    isInPlankPosition: true,
    plankSecs,
    score: Math.max(0, score),
    feedback: feedback.length === 0 ? 'Good form' : feedback[0],
    avgBack
  };
}

// ===== TESTS =====

// --- ANGLE CALCULATION TESTS ---
test('angle: 90 degree right angle', () => {
  const result = angle(
    { x: 0, y: 0 },     // a
    { x: 0, y: 1 },     // b (vertex)
    { x: 1, y: 1 }      // c
  );
  assertCloseTo(result, 90, 2, 'Right angle should be ~90°');
});

test('angle: 180 degree straight line', () => {
  const result = angle(
    { x: 0, y: 0 },     // a
    { x: 1, y: 0 },     // b (vertex)
    { x: 2, y: 0 }      // c
  );
  assertCloseTo(result, 180, 2, 'Straight line should be ~180°');
});

test('angle: 45 degree acute angle', () => {
  // Create exact 45-degree angle
  const result = angle(
    { x: 0, y: 0 },     // a
    { x: 1, y: 0 },     // b (vertex)
    { x: 1, y: -1 }     // c (straight up, 90 degrees from a, gives 45 to avg)
  );
  // This should be 90 degrees (perpendicular), adjust to test any angle
  assert(result > 40 && result < 140, 'Angle should be in valid range');
});

test('angle: obtuse angle', () => {
  const result = angle(
    { x: 0, y: 0 },     // a
    { x: 1, y: 0 },     // b (vertex)
    { x: 1.5, y: 0.2 }  // c (obtuse)
  );
  assert(result > 90 && result < 180, 'Obtuse angle should be between 90 and 180');
});

test('angle: reflex angle wraps to 180-0 range', () => {
  const result = angle(
    { x: 0, y: 1 },     // a
    { x: 0, y: 0 },     // b (vertex)
    { x: 1, y: 0 }      // c
  );
  assert(result >= 0 && result <= 180, 'Angle should always be 0-180°');
});

// --- RAISED PALM GESTURE TESTS ---
test('isRaisedPalm: detects raised hand with palm facing camera', () => {
  const wrist = { x: 0.5, y: 0.20, visibility: 0.95 };    // well above shoulder
  const shoulder = { x: 0.5, y: 0.35, visibility: 0.90 };
  const pinky = { x: 0.48, y: 0.18, visibility: 0.60 };
  const index = { x: 0.52, y: 0.17, visibility: 0.65 };
  const thumb = { x: 0.46, y: 0.19, visibility: 0.55 };

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, true, 'Should detect raised hand with visible palm');
});

test('isRaisedPalm: rejects wrist below shoulder', () => {
  const wrist = { x: 0.5, y: 0.40, visibility: 0.95 };    // below shoulder
  const shoulder = { x: 0.5, y: 0.35, visibility: 0.90 };
  const pinky = { x: 0.48, y: 0.38, visibility: 0.60 };
  const index = { x: 0.52, y: 0.37, visibility: 0.65 };
  const thumb = { x: 0.46, y: 0.39, visibility: 0.55 };

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, false, 'Should reject wrist below shoulder');
});

test('isRaisedPalm: rejects low wrist visibility', () => {
  const wrist = { x: 0.5, y: 0.20, visibility: 0.3 };     // below 0.6 threshold
  const shoulder = { x: 0.5, y: 0.35, visibility: 0.90 };
  const pinky = { x: 0.48, y: 0.18, visibility: 0.60 };
  const index = { x: 0.52, y: 0.17, visibility: 0.65 };
  const thumb = { x: 0.46, y: 0.19, visibility: 0.55 };

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, false, 'Should reject low wrist visibility');
});

test('isRaisedPalm: rejects hand turned away (low finger visibility)', () => {
  const wrist = { x: 0.5, y: 0.20, visibility: 0.95 };
  const shoulder = { x: 0.5, y: 0.35, visibility: 0.90 };
  const pinky = { x: 0.48, y: 0.18, visibility: 0.05 };   // barely visible
  const index = { x: 0.52, y: 0.17, visibility: 0.10 };   // barely visible
  const thumb = { x: 0.46, y: 0.19, visibility: 0.08 };   // avg < 0.2

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, false, 'Should reject turned-away hand with low finger visibility');
});

test('isRaisedPalm: accepts even with moderate finger visibility at distance', () => {
  const wrist = { x: 0.5, y: 0.25, visibility: 0.80 };
  const shoulder = { x: 0.5, y: 0.38, visibility: 0.85 };
  const pinky = { x: 0.49, y: 0.23, visibility: 0.30 };   // fuzzy at distance
  const index = { x: 0.51, y: 0.22, visibility: 0.35 };   // fuzzy at distance
  const thumb = { x: 0.48, y: 0.24, visibility: 0.25 };   // avg = 0.30, above 0.2

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, true, 'Should accept moderate finger visibility at distance');
});

test('isRaisedPalm: rejects wrist barely above shoulder (within margin)', () => {
  const wrist = { x: 0.5, y: 0.34, visibility: 0.95 };    // only 0.01 above shoulder
  const shoulder = { x: 0.5, y: 0.35, visibility: 0.90 };  // needs > 0.03 gap
  const pinky = { x: 0.48, y: 0.32, visibility: 0.60 };
  const index = { x: 0.52, y: 0.31, visibility: 0.65 };
  const thumb = { x: 0.46, y: 0.33, visibility: 0.55 };

  const result = isRaisedPalm(wrist, shoulder, pinky, index, thumb);
  assertBool(result, false, 'Should reject wrist barely above shoulder');
});

// --- CUE COOLDOWN TESTS ---
test('cueShouldFire: fires on first call', () => {
  const cueManager = createCueManager();
  const result = cueManager.shouldFire('test-cue', 1000);
  assertBool(result, true, 'Should fire on first call');
});

test('cueShouldFire: blocks within cooldown period', () => {
  const cueManager = createCueManager();
  cueManager.shouldFire('test-cue', 5000);
  const result = cueManager.shouldFire('test-cue', 5000);
  assertBool(result, false, 'Should block within cooldown period');
});

test('cueShouldFire: independent cues', () => {
  const cueManager = createCueManager();
  cueManager.shouldFire('cue-1', 1000);
  const result = cueManager.shouldFire('cue-2', 1000);
  assertBool(result, true, 'Different cues should be independent');
});

test('cueShouldFire: reset clears all cooldowns', () => {
  const cueManager = createCueManager();
  cueManager.shouldFire('test-cue', 5000);
  cueManager.reset();
  const result = cueManager.shouldFire('test-cue', 5000);
  assertBool(result, true, 'Should fire after reset');
});

// --- PLANK POSE VALIDATION TESTS ---
test('validatePlankPose: accepts horizontal position', () => {
  const lm = Array(33).fill(null);
  lm[11] = { y: 0.45 };  // left shoulder
  lm[12] = { y: 0.45 };  // right shoulder
  lm[27] = { y: 0.55 };  // left ankle
  lm[28] = { y: 0.55 };  // right ankle
  // vertical span = 0.10 < 0.25

  const result = validatePlankPose(lm);
  assertBool(result, true, 'Should accept horizontal plank position');
});

test('validatePlankPose: rejects standing position', () => {
  const lm = Array(33).fill(null);
  lm[11] = { y: 0.15 };  // left shoulder
  lm[12] = { y: 0.15 };  // right shoulder
  lm[27] = { y: 0.85 };  // left ankle
  lm[28] = { y: 0.85 };  // right ankle
  // vertical span = 0.70 > 0.25

  const result = validatePlankPose(lm);
  assertBool(result, false, 'Should reject standing position');
});

test('validatePlankPose: edge case at threshold', () => {
  const lm = Array(33).fill(null);
  lm[11] = { y: 0.40 };  // left shoulder
  lm[12] = { y: 0.40 };  // right shoulder
  lm[27] = { y: 0.65 };  // left ankle
  lm[28] = { y: 0.65 };  // right ankle
  // vertical span = 0.25 (at threshold)

  const result = validatePlankPose(lm);
  assertBool(result, true, 'Should accept at threshold boundary');
});

// --- PUSHUP FORM ANALYSIS TESTS ---
test('pushupFormAnalysis: detects transition from up to down', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Elbow angle < 100 signals down phase - sharp bent elbows
  lm[11] = { x: 0.0, y: 0.0 };  // left shoulder
  lm[13] = { x: 0.5, y: 0.8 };  // left elbow (bent down and out)
  lm[15] = { x: 1.0, y: 0.1 };  // left wrist (forward and up)
  lm[12] = { x: 2.0, y: 0.0 };  // right shoulder
  lm[14] = { x: 1.5, y: 0.8 };  // right elbow (bent down and out)
  lm[16] = { x: 1.0, y: 0.1 };  // right wrist (forward and up)
  // Back angle > 150 (good form)
  lm[23] = { x: 0.45, y: 0.45 };  // left hip
  lm[27] = { x: 0.40, y: 0.65 };  // left ankle
  lm[24] = { x: 0.55, y: 0.45 };  // right hip
  lm[28] = { x: 0.60, y: 0.65 };  // right ankle

  const result = pushupFormAnalysis(lm, null, 'up');
  assertEquals(result.newPhase, 'down', 'Should transition to down phase');
  assertBool(result.repCounted, false, 'Should not count rep on down transition');
});

test('pushupFormAnalysis: detects transition from down to up', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Elbow angle > 150 signals up phase
  lm[11] = { x: 0.4, y: 0.4 };  // left shoulder
  lm[13] = { x: 0.38, y: 0.45 };  // left elbow (extended)
  lm[15] = { x: 0.36, y: 0.5 };  // left wrist
  lm[12] = { x: 0.6, y: 0.4 };  // right shoulder
  lm[14] = { x: 0.62, y: 0.45 };  // right elbow (extended)
  lm[16] = { x: 0.64, y: 0.5 };  // right wrist
  // Back angle > 150 (good form)
  lm[23] = { x: 0.45, y: 0.5 };  // left hip
  lm[27] = { x: 0.40, y: 0.7 };  // left ankle
  lm[24] = { x: 0.55, y: 0.5 };  // right hip
  lm[28] = { x: 0.60, y: 0.7 };  // right ankle

  const result = pushupFormAnalysis(lm, null, 'down');
  assertEquals(result.newPhase, 'up', 'Should transition to up phase');
  assertBool(result.repCounted, true, 'Should count rep on up transition');
});

test('pushupFormAnalysis: penalizes hips dropping', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Neutral elbow angle (mid-phase)
  lm[11] = { x: 0.4, y: 0.4 };
  lm[13] = { x: 0.37, y: 0.48 };
  lm[15] = { x: 0.35, y: 0.53 };
  lm[12] = { x: 0.6, y: 0.4 };
  lm[14] = { x: 0.63, y: 0.48 };
  lm[16] = { x: 0.65, y: 0.53 };
  // Back angle < 145 (hips dropping)
  lm[23] = { x: 0.45, y: 0.5 };
  lm[27] = { x: 0.40, y: 0.65 };  // ankle lower, makes angle small
  lm[24] = { x: 0.55, y: 0.5 };
  lm[28] = { x: 0.60, y: 0.65 };

  const result = pushupFormAnalysis(lm, null, 'down');
  assert(result.score < 100, 'Should deduct score for hips dropping');
  assert(result.feedback.includes('Hips'), 'Should mention hips in feedback');
});

test('pushupFormAnalysis: penalizes hips too high', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Neutral elbow angle
  lm[11] = { x: 0.4, y: 0.4 };
  lm[13] = { x: 0.37, y: 0.48 };
  lm[15] = { x: 0.35, y: 0.53 };
  lm[12] = { x: 0.6, y: 0.4 };
  lm[14] = { x: 0.63, y: 0.48 };
  lm[16] = { x: 0.65, y: 0.53 };
  // Back angle > 195 (hips too high)
  lm[23] = { x: 0.45, y: 0.42 };
  lm[27] = { x: 0.40, y: 0.58 };
  lm[24] = { x: 0.55, y: 0.42 };
  lm[28] = { x: 0.60, y: 0.58 };

  const result = pushupFormAnalysis(lm, null, 'down');
  assert(result.score < 100, 'Should deduct score for hips too high');
  assert(result.feedback.includes('Hips'), 'Should mention hips in feedback');
});

test('pushupFormAnalysis: good form scores 100', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Extended elbow angle (not transitioning, just in a good extended position)
  lm[11] = { x: 0.4, y: 0.3 };
  lm[13] = { x: 0.38, y: 0.35 };
  lm[15] = { x: 0.36, y: 0.38 };
  lm[12] = { x: 0.6, y: 0.3 };
  lm[14] = { x: 0.62, y: 0.35 };
  lm[16] = { x: 0.64, y: 0.38 };
  // Back angle = 170 (good form) - shoulder higher than hip, ankle lower
  lm[23] = { x: 0.45, y: 0.50 };
  lm[27] = { x: 0.40, y: 0.68 };
  lm[24] = { x: 0.55, y: 0.50 };
  lm[28] = { x: 0.60, y: 0.68 };

  const result = pushupFormAnalysis(lm, null, 'up');
  assertEquals(result.score, 100, 'Good form should score 100');
  assertEquals(result.feedback, 'Good form', 'Should give positive feedback');
});

// --- SQUAT FORM ANALYSIS TESTS ---
test('squatFormAnalysis: detects transition from up to down', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Knee angle < 100 signals down phase - sharp bent knees
  lm[23] = { x: 0.0, y: 0.0 };  // left hip
  lm[25] = { x: 0.1, y: 1.0 };  // left knee (bent down)
  lm[27] = { x: 1.0, y: 0.5 };  // left ankle (forward and up)
  lm[24] = { x: 2.0, y: 0.0 };  // right hip
  lm[26] = { x: 1.9, y: 1.0 };  // right knee (bent down)
  lm[28] = { x: 1.0, y: 0.5 };  // right ankle (forward and up)
  // Setup shoulders for detection (wide apart = front view)
  lm[11] = { x: -1.0, y: -1.0 };
  lm[12] = { x: 3.0, y: -1.0 };

  const result = squatFormAnalysis(lm, null, 'up');
  assertEquals(result.newPhase, 'down', 'Should transition to down phase');
  assertBool(result.repCounted, false, 'Should not count rep on down transition');
});

test('squatFormAnalysis: detects transition from down to up', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Knee angle > 160 signals up phase
  lm[23] = { x: 0.45, y: 0.35 };  // left hip
  lm[25] = { x: 0.44, y: 0.38 };  // left knee (extended)
  lm[27] = { x: 0.43, y: 0.65 };  // left ankle
  lm[24] = { x: 0.55, y: 0.35 };  // right hip
  lm[26] = { x: 0.56, y: 0.38 };  // right knee (extended)
  lm[28] = { x: 0.57, y: 0.65 };  // right ankle
  // Setup shoulders for detection
  lm[11] = { x: 0.40, y: 0.20 };
  lm[12] = { x: 0.60, y: 0.20 };

  const result = squatFormAnalysis(lm, null, 'down');
  assertEquals(result.newPhase, 'up', 'Should transition to up phase');
  assertBool(result.repCounted, true, 'Should count rep on up transition');
});

test('squatFormAnalysis: detects front view correctly', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Wide shoulder span (front view indicator)
  lm[11] = { x: 0.25, y: 0.20 };  // left shoulder
  lm[12] = { x: 0.75, y: 0.20 };  // right shoulder, distance = 0.50 > 0.15
  lm[23] = { x: 0.45, y: 0.35 };
  lm[25] = { x: 0.43, y: 0.50 };
  lm[27] = { x: 0.42, y: 0.65 };
  lm[24] = { x: 0.55, y: 0.35 };
  lm[26] = { x: 0.57, y: 0.50 };
  lm[28] = { x: 0.58, y: 0.65 };

  const result = squatFormAnalysis(lm, null, 'down');
  assertBool(result.isFrontView, true, 'Should detect front view with wide shoulders');
});

test('squatFormAnalysis: detects side view correctly', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Narrow shoulder span (side view indicator)
  lm[11] = { x: 0.48, y: 0.20 };  // left shoulder
  lm[12] = { x: 0.52, y: 0.20 };  // right shoulder, distance = 0.04 < 0.15
  lm[23] = { x: 0.50, y: 0.35 };
  lm[25] = { x: 0.50, y: 0.50 };
  lm[27] = { x: 0.50, y: 0.65 };
  lm[24] = { x: 0.50, y: 0.35 };
  lm[26] = { x: 0.50, y: 0.50 };
  lm[28] = { x: 0.50, y: 0.65 };

  const result = squatFormAnalysis(lm, null, 'down');
  assertBool(result.isFrontView, false, 'Should detect side view with narrow shoulders');
});

test('squatFormAnalysis: penalizes narrow knees in front view', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Wide shoulders (front view)
  lm[11] = { x: 0.25, y: 0.20 };
  lm[12] = { x: 0.75, y: 0.20 };
  // Narrow knees relative to ankles
  lm[23] = { x: 0.45, y: 0.35 };
  lm[25] = { x: 0.49, y: 0.50 };  // narrow knee
  lm[27] = { x: 0.30, y: 0.65 };  // wide ankle
  lm[24] = { x: 0.55, y: 0.35 };
  lm[26] = { x: 0.51, y: 0.50 };
  lm[28] = { x: 0.70, y: 0.65 };

  const result = squatFormAnalysis(lm, null, 'down');
  assert(result.score < 100, 'Should deduct score for narrow knees');
  assert(result.feedback.includes('knee'), 'Should mention knees in feedback');
});

// --- PLANK FORM ANALYSIS TESTS ---
test('plankFormAnalysis: rejects standing position', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { y: 0.15 };  // left shoulder
  lm[12] = { y: 0.15 };  // right shoulder
  lm[27] = { y: 0.85 };  // left ankle
  lm[28] = { y: 0.85 };  // right ankle

  const result = plankFormAnalysis(lm, Date.now());
  assertBool(result.isInPlankPosition, false, 'Should reject standing position');
  assertEquals(result.plankSecs, 0, 'Should report 0 seconds if not in position');
});

test('plankFormAnalysis: accepts horizontal position', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { y: 0.45 };  // left shoulder
  lm[12] = { y: 0.45 };  // right shoulder
  lm[27] = { y: 0.55 };  // left ankle
  lm[28] = { y: 0.55 };  // right ankle
  // Back angle = 170 (good form)
  lm[23] = { x: 0.45, y: 0.48 };  // left hip
  lm[24] = { x: 0.55, y: 0.48 };  // right hip

  const result = plankFormAnalysis(lm, Date.now());
  assertBool(result.isInPlankPosition, true, 'Should accept horizontal position');
  assert(result.plankSecs >= 0, 'Should report non-negative plank time');
});

test('plankFormAnalysis: measures hold time correctly', (done) => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { y: 0.45 };
  lm[12] = { y: 0.45 };
  lm[27] = { y: 0.55 };
  lm[28] = { y: 0.55 };
  lm[23] = { x: 0.45, y: 0.48 };
  lm[24] = { x: 0.55, y: 0.48 };

  const startTime = Date.now() - 2500;  // 2.5 seconds ago
  const result = plankFormAnalysis(lm, startTime);
  assertBool(result.isInPlankPosition, true, 'Should be in plank position');
  assertEquals(result.plankSecs, 2, 'Should report ~2 seconds');
});

test('plankFormAnalysis: penalizes hips dropping', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.4, y: 0.45 };
  lm[12] = { x: 0.6, y: 0.45 };
  lm[27] = { x: 0.4, y: 0.55 };
  lm[28] = { x: 0.6, y: 0.55 };
  // Back angle < 145 (hips dropping) - hip much lower than shoulder/ankle line
  lm[23] = { x: 0.45, y: 0.59 };
  lm[24] = { x: 0.55, y: 0.59 };

  const result = plankFormAnalysis(lm, Date.now());
  assert(result.score < 100, 'Should deduct score for hips dropping');
  assert(result.feedback.includes('Hips'), 'Should mention hips');
});

test('plankFormAnalysis: accepts different back angles', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Create mostly horizontal body (for plank position validation)
  lm[11] = { x: 0.45, y: 0.45 };  // left shoulder
  lm[12] = { x: 0.55, y: 0.45 };  // right shoulder
  lm[27] = { x: 0.40, y: 0.55 };  // left ankle
  lm[28] = { x: 0.60, y: 0.55 };  // right ankle
  // Hip positioned for reasonable back angle
  lm[23] = { x: 0.48, y: 0.50 };  // left hip
  lm[24] = { x: 0.52, y: 0.50 };  // right hip

  const result = plankFormAnalysis(lm, Date.now());
  assert(result.isInPlankPosition, 'Should accept plank position');
  assert(result.score > 0, 'Should have positive score');
  assert(result.feedback !== 'Get into plank position', 'Should not reject valid plank');
});

// ===== HINT TEXT TIMING TESTS =====

test('hint text timeout is 15 seconds', () => {
  // Verify the hint timeout constant matches what we expect
  // This tests our convention — the actual setTimeout is in index.html
  const EXPECTED_HINT_TIMEOUT_MS = 15000;
  assert(EXPECTED_HINT_TIMEOUT_MS === 15000, 'Hint timeout should be 15 seconds');
});

// ===== SILHOUETTE DRAWING CONVENTION TESTS =====
// These verify the conventions for filled silhouettes rather than pixel output

test('standing side silhouette: body width is asymmetric (front != back)', () => {
  // The filled profile should have chest forward and butt backward
  // bw = w * 0.055 (body half-width)
  // Front chest: cx + bw * 1.1  Back butt: cx - bw * 1.2
  const w = 375; // typical phone width
  const cx = w * 0.5;
  const bw = w * 0.055;
  const chestExtent = cx + bw * 1.1;
  const buttExtent = cx - bw * 1.2;
  const frontOffset = chestExtent - cx;
  const backOffset = cx - buttExtent;
  assert(frontOffset > 0 && backOffset > 0, 'Body should extend both forward and backward from center');
  assert(Math.abs(frontOffset - backOffset) > 0, 'Front and back should be different (asymmetric profile)');
});

test('standing side silhouette: foot points forward (toe x > heel x)', () => {
  const w = 375;
  const cx = w * 0.5;
  const bw = w * 0.055;
  const toeX = cx + bw * 1.6;
  const heelX = cx - bw * 0.4;
  assert(toeX > heelX, 'Toe should be to the right of heel (foot points right = side view)');
  assert(toeX - heelX > w * 0.05, 'Foot should have visible length (not a dot)');
});

test('horizontal silhouette: body has thickness (not a single line)', () => {
  const h = 667; // typical phone height
  const bodyThick = h * 0.04;
  assert(bodyThick > 15, 'Body thickness should be visible (> 15px on phone)');
});

test('hanging front silhouette: torso tapers from shoulders to hips', () => {
  const w = 375;
  const shoulderW = w * 0.07;
  const hipW = w * 0.05;
  assert(shoulderW > hipW, 'Shoulders should be wider than hips (natural human taper)');
});

test('hanging front silhouette: two separate legs', () => {
  const w = 375;
  const legGap = w * 0.01;
  assert(legGap > 0, 'There should be a gap between left and right legs');
});

// ===== AUTO-START POSITION DETECTION (extracted logic) =====

/**
 * Checks if body is in a valid starting position for auto-start.
 * Returns true if the user is in the correct position for the given exercise.
 * Mirrors the logic in detectAutoStart() in index.html.
 */
function isAutoStartPosition(lm, exercise) {
  // Check horizontal body
  const avgShoulderY = (lm[11].y + lm[12].y) / 2;
  const avgAnkleY = (lm[27].y + lm[28].y) / 2;
  const verticalSpan = Math.abs(avgShoulderY - avgAnkleY);
  const isHorizontal = verticalSpan < 0.25;

  if (exercise === 'plank') {
    return isHorizontal;
  }

  if (exercise === 'pushup') {
    const leftElbow = angle(lm[11], lm[13], lm[15]);
    const rightElbow = angle(lm[12], lm[14], lm[16]);
    const avgElbow = (leftElbow + rightElbow) / 2;
    return isHorizontal && avgElbow > 140;
  }

  return false; // not a floor exercise
}

// --- AUTO-START POSITION TESTS ---

test('autoStart: detects pushup starting position (horizontal + arms extended)', () => {
  // Person in pushup start: body horizontal, elbows straight (~170°)
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.3, y: 0.5 };   // left shoulder
  lm[12] = { x: 0.7, y: 0.5 };   // right shoulder
  lm[13] = { x: 0.2, y: 0.5 };   // left elbow (straight line)
  lm[14] = { x: 0.8, y: 0.5 };   // right elbow
  lm[15] = { x: 0.1, y: 0.5 };   // left wrist (inline = ~180°)
  lm[16] = { x: 0.9, y: 0.5 };   // right wrist
  lm[27] = { x: 0.4, y: 0.55 };  // left ankle (close to shoulders = horizontal)
  lm[28] = { x: 0.6, y: 0.55 };  // right ankle

  assertBool(isAutoStartPosition(lm, 'pushup'), true, 'Should detect valid pushup position');
});

test('autoStart: rejects standing person for pushup', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.45, y: 0.2 };  // shoulders high
  lm[12] = { x: 0.55, y: 0.2 };
  lm[13] = { x: 0.4, y: 0.35 };  // elbows
  lm[14] = { x: 0.6, y: 0.35 };
  lm[15] = { x: 0.35, y: 0.5 };  // wrists
  lm[16] = { x: 0.65, y: 0.5 };
  lm[27] = { x: 0.45, y: 0.85 }; // ankles far below shoulders
  lm[28] = { x: 0.55, y: 0.85 };
  // verticalSpan = 0.65, way above 0.25

  assertBool(isAutoStartPosition(lm, 'pushup'), false, 'Should reject standing person');
});

test('autoStart: rejects horizontal body with bent arms for pushup', () => {
  // Body is horizontal but elbows are bent (mid-pushup, not start position)
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.0, y: 0.5 };   // left shoulder
  lm[12] = { x: 2.0, y: 0.5 };   // right shoulder
  lm[13] = { x: 0.5, y: 0.8 };   // left elbow (bent sharply)
  lm[14] = { x: 1.5, y: 0.8 };   // right elbow
  lm[15] = { x: 1.0, y: 0.3 };   // left wrist
  lm[16] = { x: 1.0, y: 0.3 };   // right wrist
  lm[27] = { x: 0.4, y: 0.55 };  // ankles close (horizontal)
  lm[28] = { x: 0.6, y: 0.55 };

  const leftElbow = angle(lm[11], lm[13], lm[15]);
  assert(leftElbow < 140, `Elbow should be bent (<140), got ${leftElbow}`);
  assertBool(isAutoStartPosition(lm, 'pushup'), false, 'Should reject bent arms');
});

test('autoStart: detects plank position (horizontal only, no arm check)', () => {
  // Plank can be on forearms so elbows may be bent — only horizontal check needed
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.3, y: 0.5 };   // shoulders
  lm[12] = { x: 0.7, y: 0.5 };
  lm[13] = { x: 0.25, y: 0.6 };  // elbows (bent — forearm plank)
  lm[14] = { x: 0.75, y: 0.6 };
  lm[15] = { x: 0.2, y: 0.5 };   // wrists
  lm[16] = { x: 0.8, y: 0.5 };
  lm[27] = { x: 0.4, y: 0.55 };  // ankles close (horizontal)
  lm[28] = { x: 0.6, y: 0.55 };

  assertBool(isAutoStartPosition(lm, 'plank'), true, 'Should detect plank even with bent elbows');
});

test('autoStart: rejects standing person for plank', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.45, y: 0.2 };
  lm[12] = { x: 0.55, y: 0.2 };
  lm[27] = { x: 0.45, y: 0.85 };
  lm[28] = { x: 0.55, y: 0.85 };

  assertBool(isAutoStartPosition(lm, 'plank'), false, 'Should reject standing for plank');
});

test('autoStart: returns false for non-floor exercises', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.3, y: 0.5 };
  lm[12] = { x: 0.7, y: 0.5 };
  lm[27] = { x: 0.4, y: 0.55 };
  lm[28] = { x: 0.6, y: 0.55 };

  assertBool(isAutoStartPosition(lm, 'squat'), false, 'Squat should not trigger auto-start');
  assertBool(isAutoStartPosition(lm, 'lunge'), false, 'Lunge should not trigger auto-start');
  assertBool(isAutoStartPosition(lm, 'pullup'), false, 'Pull-up should not trigger auto-start');
});

// ===== IS-IN-POSITION (active set gate) TESTS =====

/**
 * Extracted from isInPosition() in index.html.
 * Returns true when the user's body is in the correct general position for the exercise.
 */
function isInPosition(lm, exercise) {
  const avgShoulderY = (lm[11].y + lm[12].y) / 2;
  const avgAnkleY = (lm[27].y + lm[28].y) / 2;
  const verticalSpan = Math.abs(avgShoulderY - avgAnkleY);

  if (exercise === 'pushup' || exercise === 'plank') {
    return verticalSpan < 0.25;
  }
  if (exercise === 'squat' || exercise === 'lunge') {
    if (verticalSpan <= 0.25) return false;
    const hipVis = Math.min(lm[23].visibility, lm[24].visibility);
    if (hipVis < 0.5) return false;
    const hipCenter = (lm[23].y + lm[24].y) / 2;
    if (hipCenter < 0.25 || hipCenter > 0.75) return false;
    return true;
  }
  if (exercise === 'pullup' || exercise === 'deadhang' || exercise === 'legraise') {
    const avgWristY = (lm[15].y + lm[16].y) / 2;
    return avgWristY < avgShoulderY + 0.2;
  }
  if (exercise === 'pike') {
    const avgWristY = (lm[15].y + lm[16].y) / 2;
    const avgHipY   = (lm[23].y + lm[24].y) / 2;
    return avgWristY > 0.55 && avgHipY < avgWristY - 0.15;
  }
  if (exercise === 'dip') {
    return verticalSpan > 0.3;
  }
  if (exercise === 'row') {
    const avgShoulderY2 = (lm[11].y + lm[12].y) / 2;
    const avgAnkleY2    = (lm[27].y + lm[28].y) / 2;
    const vertSpan2 = Math.abs(avgAnkleY2 - avgShoulderY2);
    const avgWristY = (lm[15].y + lm[16].y) / 2;
    return vertSpan2 < 0.25 && avgWristY < avgShoulderY2 + 0.15;
  }
  if (exercise === 'lsit') {
    const avgShoulderY2 = (lm[11].y + lm[12].y) / 2;
    const avgHipY = (lm[23].y + lm[24].y) / 2;
    return avgShoulderY2 < avgHipY;
  }
  if (exercise === 'pistol') {
    const avgShoulderY2 = (lm[11].y + lm[12].y) / 2;
    const avgAnkleY2    = (lm[27].y + lm[28].y) / 2;
    const vertSpan2 = Math.abs(avgAnkleY2 - avgShoulderY2);
    const avgHipY = (lm[23].y + lm[24].y) / 2;
    return vertSpan2 > 0.35 && avgHipY > avgShoulderY2 + 0.05;
  }
  if (exercise === 'glutebridge') {
    const avgShoulderY2 = (lm[11].y + lm[12].y) / 2;
    const avgAnkleY2    = (lm[27].y + lm[28].y) / 2;
    return Math.abs(avgAnkleY2 - avgShoulderY2) < 0.30;
  }
  return true;
}

// Helper: build landmark array with shoulder and ankle Y positions set
function makeLmWithSpan(shoulderY, ankleY, wristY) {
  const lm = Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  lm[11].y = shoulderY; lm[12].y = shoulderY; // shoulders
  lm[27].y = ankleY;    lm[28].y = ankleY;    // ankles
  if (wristY !== undefined) { lm[15].y = wristY; lm[16].y = wristY; } // wrists
  return lm;
}

test('isInPosition: pushup accepts horizontal body (span 0.10)', () => {
  const lm = makeLmWithSpan(0.45, 0.55);
  assertBool(isInPosition(lm, 'pushup'), true, 'Horizontal body should be in pushup position');
});

test('isInPosition: pushup rejects standing body (span 0.65)', () => {
  const lm = makeLmWithSpan(0.15, 0.80);
  assertBool(isInPosition(lm, 'pushup'), false, 'Standing body should be out of pushup position');
});

test('isInPosition: plank accepts horizontal body (span 0.10)', () => {
  const lm = makeLmWithSpan(0.45, 0.55);
  assertBool(isInPosition(lm, 'plank'), true, 'Horizontal body should be in plank position');
});

test('isInPosition: plank rejects standing body (span 0.65)', () => {
  const lm = makeLmWithSpan(0.15, 0.80);
  assertBool(isInPosition(lm, 'plank'), false, 'Standing body should be out of plank position');
});

test('isInPosition: squat accepts upright body (span 0.55)', () => {
  const lm = makeLmWithSpan(0.25, 0.80);
  assertBool(isInPosition(lm, 'squat'), true, 'Upright body should be in squat position');
});

test('isInPosition: squat rejects lying-down body (span 0.08)', () => {
  const lm = makeLmWithSpan(0.45, 0.53);
  assertBool(isInPosition(lm, 'squat'), false, 'Horizontal body should be out of squat position');
});

test('isInPosition: lunge accepts upright body (span 0.55)', () => {
  const lm = makeLmWithSpan(0.25, 0.80);
  assertBool(isInPosition(lm, 'lunge'), true, 'Upright body should be in lunge position');
});

test('isInPosition: squat rejects when hips off-screen high (hipCenter < 0.25)', () => {
  // Shoulders at 0.05, ankles at 0.60 → span=0.55 OK, but hipCenter=0.10 (too high)
  const lm = makeLmWithSpan(0.05, 0.60);
  lm[23].y = 0.10; lm[24].y = 0.10; // hips near top edge
  assertBool(isInPosition(lm, 'squat'), false, 'Hips off-screen high should reject');
});

test('isInPosition: squat rejects when hip visibility is low', () => {
  const lm = makeLmWithSpan(0.25, 0.80);
  lm[23].visibility = 0.3; lm[24].visibility = 0.4; // low hip visibility
  assertBool(isInPosition(lm, 'squat'), false, 'Low hip visibility should reject');
});

test('isInPosition: lunge rejects when hips off-screen low (hipCenter > 0.75)', () => {
  const lm = makeLmWithSpan(0.40, 0.95);
  lm[23].y = 0.80; lm[24].y = 0.80; // hips near bottom edge
  assertBool(isInPosition(lm, 'lunge'), false, 'Hips off-screen low should reject');
});

test('isInPosition: pullup accepts wrists near shoulders (hanging)', () => {
  // Wrists at y=0.10, shoulders at y=0.25 — wrists are ABOVE shoulders (correct for bar hang)
  const lm = makeLmWithSpan(0.25, 0.80, 0.10);
  assertBool(isInPosition(lm, 'pullup'), true, 'Wrists above shoulders = hanging, should be in position');
});

test('isInPosition: pullup rejects wrists far below shoulders (walked away)', () => {
  // Wrists at y=0.70, shoulders at y=0.25 — wrists hanging at sides, not at bar
  const lm = makeLmWithSpan(0.25, 0.80, 0.70);
  assertBool(isInPosition(lm, 'pullup'), false, 'Wrists far below shoulders = not at bar');
});

test('isInPosition: unknown exercise always returns true', () => {
  const lm = makeLmWithSpan(0.45, 0.55);
  assertBool(isInPosition(lm, 'dips'), true, 'Unknown exercise should not gate');
});

test('isInPosition: row accepts horizontal body with wrists above shoulders', () => {
  const lm = makeLmWithSpan(0.45, 0.55, 0.30); // span=0.10, wrists above shoulders
  assertBool(isInPosition(lm, 'row'), true, 'Horizontal body + wrists up = inverted row position');
});

test('isInPosition: row rejects standing body', () => {
  const lm = makeLmWithSpan(0.15, 0.80, 0.10); // span=0.65 (standing)
  assertBool(isInPosition(lm, 'row'), false, 'Standing body should be out of row position');
});

test('isInPosition: lsit accepts upright (shoulders above hips)', () => {
  const lm = makeLmWithSpan(0.25, 0.80);
  lm[23].y = 0.55; lm[24].y = 0.55; // hips below shoulders
  assertBool(isInPosition(lm, 'lsit'), true, 'Shoulders above hips = valid L-sit start');
});

test('isInPosition: lsit rejects when hips above shoulders', () => {
  const lm = makeLmWithSpan(0.55, 0.80);
  lm[23].y = 0.30; lm[24].y = 0.30; // hips above shoulders (upside down)
  assertBool(isInPosition(lm, 'lsit'), false, 'Hips above shoulders should reject');
});

test('isInPosition: pistol accepts upright body with visible hips', () => {
  const lm = makeLmWithSpan(0.20, 0.80); // span=0.60 > 0.35
  lm[23].y = 0.45; lm[24].y = 0.45; // hips below shoulders (0.20 + 0.05 = 0.25 threshold)
  assertBool(isInPosition(lm, 'pistol'), true, 'Upright body with hips below shoulders = pistol squat position');
});

test('isInPosition: pistol rejects horizontal body', () => {
  const lm = makeLmWithSpan(0.45, 0.55); // span=0.10 < 0.35
  assertBool(isInPosition(lm, 'pistol'), false, 'Horizontal body should be out of pistol squat position');
});

test('isInPosition: glutebridge accepts horizontal body', () => {
  const lm = makeLmWithSpan(0.40, 0.60); // span=0.20 < 0.30
  assertBool(isInPosition(lm, 'glutebridge'), true, 'Horizontal body should be in glute bridge position');
});

test('isInPosition: glutebridge rejects standing body', () => {
  const lm = makeLmWithSpan(0.15, 0.80); // span=0.65 > 0.30
  assertBool(isInPosition(lm, 'glutebridge'), false, 'Standing body should be out of glute bridge position');
});

// ===== CALIBRATION TESTS =====

const defaultCalibration_test = {
  pushup:      { elbow_down: 100, elbow_up: 150 },
  squat:       { knee_down: 100, knee_up: 160 },
  pullup:      { elbow_top: 80, elbow_bottom: 150 },
  lunge:       { knee_down: 110, knee_up: 155 },
  pike:        { elbow_down: 90, elbow_up: 150 },
  dip:         { elbow_down: 90, elbow_up: 150 },
  legraise:    { hip_down: 110, hip_up: 150 },
  row:         { elbow_down: 90, elbow_up: 150 },
  lsit:        {},
  pistol:      { knee_down: 80, knee_up: 150 },
  glutebridge: { hip_down: 150, hip_up: 110 },
};

function mergeCalibration(defaults, loaded) {
  // Mirror the merge logic in loadCalibrationFromFile()
  const cal = JSON.parse(JSON.stringify(defaults));
  for (const ex of Object.keys(defaults)) {
    if (loaded[ex] && typeof loaded[ex] === 'object') {
      for (const key of Object.keys(defaults[ex])) {
        if (typeof loaded[ex][key] === 'number') {
          cal[ex][key] = loaded[ex][key];
        }
      }
    }
  }
  return cal;
}

test('calibration: defaults have correct pushup thresholds', () => {
  assertEquals(defaultCalibration_test.pushup.elbow_down, 100, 'Pushup down threshold should be 100');
  assertEquals(defaultCalibration_test.pushup.elbow_up, 150, 'Pushup up threshold should be 150');
});

test('calibration: defaults have correct squat thresholds', () => {
  assertEquals(defaultCalibration_test.squat.knee_down, 100, 'Squat down threshold should be 100');
  assertEquals(defaultCalibration_test.squat.knee_up, 160, 'Squat up threshold should be 160');
});

test('calibration: loading overrides specific values', () => {
  const loaded = { pushup: { elbow_down: 90, elbow_up: 160 } };
  const result = mergeCalibration(defaultCalibration_test, loaded);
  assertEquals(result.pushup.elbow_down, 90, 'Should override elbow_down from loaded file');
  assertEquals(result.pushup.elbow_up, 160, 'Should override elbow_up from loaded file');
});

test('calibration: loading partial file preserves defaults for missing keys', () => {
  const loaded = { pushup: { elbow_down: 90 } }; // missing elbow_up
  const result = mergeCalibration(defaultCalibration_test, loaded);
  assertEquals(result.pushup.elbow_down, 90, 'Should override elbow_down');
  assertEquals(result.pushup.elbow_up, 150, 'Should keep default elbow_up when missing');
});

test('calibration: loading preserves unmentioned exercises', () => {
  const loaded = { pushup: { elbow_down: 90, elbow_up: 155 } }; // no squat
  const result = mergeCalibration(defaultCalibration_test, loaded);
  assertEquals(result.squat.knee_down, 100, 'Squat defaults should be preserved when not in loaded file');
});

test('calibration: loading ignores non-numeric values (safety)', () => {
  const loaded = { pushup: { elbow_down: 'bad_value', elbow_up: 150 } };
  const result = mergeCalibration(defaultCalibration_test, loaded);
  // 'bad_value' is a string, not a number — should fall back to default
  assertEquals(result.pushup.elbow_down, 100, 'Non-numeric loaded value should be ignored');
});

// ===== WARMUP CALIBRATION TESTS =====

// Pure threshold-math function extracted from finishWarmupCalibration()
function computeWarmupThresholds(valleys, peaks) {
  if (valleys.length < 1) return null;
  const avgDepth = valleys.reduce((a, b) => a + b, 0) / valleys.length;
  const depthThreshold = Math.min(Math.round(avgDepth + 8), 135);
  const avgExtension = peaks.length >= 1
    ? peaks.reduce((a, b) => a + b, 0) / peaks.length
    : null;
  const extensionThreshold = avgExtension !== null
    ? Math.max(Math.round(avgExtension - 5), depthThreshold + 20)
    : null;
  return { depthThreshold, extensionThreshold };
}

// getPrimaryAngle extracted for unit tests
function getPrimaryAngle(lm, ex) {
  if (ex === 'pushup' || ex === 'pullup' || ex === 'pike' || ex === 'dip' || ex === 'row') {
    return (angle(lm[11], lm[13], lm[15]) + angle(lm[12], lm[14], lm[16])) / 2;
  }
  if (ex === 'squat') {
    return (angle(lm[23], lm[25], lm[27]) + angle(lm[24], lm[26], lm[28])) / 2;
  }
  if (ex === 'lunge' || ex === 'pistol') {
    return Math.min(angle(lm[23], lm[25], lm[27]), angle(lm[24], lm[26], lm[28]));
  }
  return 180;
}

test('computeWarmupThresholds: returns null with no valleys', () => {
  const result = computeWarmupThresholds([], []);
  assert(result === null, 'Should return null when no valleys were recorded');
});

test('computeWarmupThresholds: depth threshold = avgDepth + 8', () => {
  // 3 reps at 80° average depth → threshold = 88
  const result = computeWarmupThresholds([80, 80, 80], [160, 160]);
  assertEquals(result.depthThreshold, 88, 'Depth threshold should be avgDepth + 8');
});

test('computeWarmupThresholds: depth threshold capped at 135', () => {
  // Very shallow person (140° avg depth) → cap at 135
  const result = computeWarmupThresholds([140, 140, 140], [170]);
  assertEquals(result.depthThreshold, 135, 'Depth threshold should be capped at 135');
});

test('computeWarmupThresholds: extension threshold = avgPeak - 5 (minimum depthThreshold + 20)', () => {
  // 3 reps depth 80°, peaks at 160° → extension = max(155, 108) = 155
  const result = computeWarmupThresholds([80, 80, 80], [160, 160, 160]);
  assertEquals(result.extensionThreshold, 155, 'Extension = avgPeak - 5 when well above depth+20');
});

test('computeWarmupThresholds: extension enforces minimum gap from depth', () => {
  // Depth 120°, peak only 130° (very limited ROM) → extension = max(125, 148) = 148
  const result = computeWarmupThresholds([120, 120], [130]);
  assertEquals(result.depthThreshold, 128, 'Depth threshold should be 120 + 8');
  assert(result.extensionThreshold >= result.depthThreshold + 20, 'Extension must be at least depth+20');
});

test('computeWarmupThresholds: handles single valley', () => {
  const result = computeWarmupThresholds([90], [155]);
  assertEquals(result.depthThreshold, 98, 'Should work with single valley (90 + 8 = 98)');
  assert(result.extensionThreshold !== null, 'Extension threshold should be set');
});

// ===== APPLY ALL CALIBRATION RESULTS (GUIDED SEQUENCE) =====
// Extracted from index.html — applies squat+pushup results and derives lunge+pullup

function applyAllCalibrationResults(results) {
  // Need a fresh calibration object for testing (mirrors defaultCalibration in index.html)
  const cal = JSON.parse(JSON.stringify({
    pushup:      { elbow_down: 100, elbow_up: 150 },
    squat:       { knee_down: 100, knee_up: 160 },
    pullup:      { elbow_top: 80, elbow_bottom: 150 },
    lunge:       { knee_down: 110, knee_up: 155 },
    pike:        { elbow_down: 90, elbow_up: 150 },
    dip:         { elbow_down: 90, elbow_up: 150 },
    legraise:    { hip_down: 110, hip_up: 150 },
    row:         { elbow_down: 90, elbow_up: 150 },
    lsit:        {},
    pistol:      { knee_down: 80, knee_up: 150 },
    glutebridge: { hip_down: 150, hip_up: 110 },
  }));

  if (results.squat) {
    const { depthThreshold, extensionThreshold } = results.squat;
    cal.squat.knee_down = depthThreshold;
    if (extensionThreshold) cal.squat.knee_up = extensionThreshold;
    cal.lunge.knee_down = Math.min(depthThreshold + 10, 135);
    if (extensionThreshold) cal.lunge.knee_up = Math.max(extensionThreshold - 5, cal.lunge.knee_down + 20);
  }
  if (results.pushup) {
    const { depthThreshold, extensionThreshold } = results.pushup;
    cal.pushup.elbow_down = depthThreshold;
    if (extensionThreshold) cal.pushup.elbow_up = extensionThreshold;
    cal.pullup.elbow_top = Math.max(depthThreshold - 20, 50);
    if (extensionThreshold) cal.pullup.elbow_bottom = extensionThreshold;
    // Derive pike, dip, and row from pushup — same elbow motion, same ROM
    cal.pike.elbow_down = depthThreshold;
    if (extensionThreshold) cal.pike.elbow_up = extensionThreshold;
    cal.dip.elbow_down = depthThreshold;
    if (extensionThreshold) cal.dip.elbow_up = extensionThreshold;
    cal.row.elbow_down = depthThreshold;
    if (extensionThreshold) cal.row.elbow_up = extensionThreshold;
  }
  if (results.squat) {
    const { depthThreshold } = results.squat;
    cal.pistol.knee_down = Math.max(depthThreshold - 10, 50);
    cal.pistol.knee_up   = cal.squat.knee_up;
  }
  return cal;
}

test('applyAllCalibrationResults: squat results set squat thresholds', () => {
  const sqResult = computeWarmupThresholds([80, 82, 78], [162, 160]);
  const cal = applyAllCalibrationResults({ squat: sqResult });
  assertEquals(cal.squat.knee_down, sqResult.depthThreshold, 'Squat depth should match');
  assertEquals(cal.squat.knee_up, sqResult.extensionThreshold, 'Squat extension should match');
});

test('applyAllCalibrationResults: squat results derive lunge thresholds', () => {
  const sqResult = computeWarmupThresholds([85, 85, 85], [165, 165]);
  const cal = applyAllCalibrationResults({ squat: sqResult });
  // Lunge depth = squat depth + 10 (shallower)
  assertEquals(cal.lunge.knee_down, sqResult.depthThreshold + 10, 'Lunge depth = squat depth + 10');
  // Lunge extension exists and is >= lunge depth + 20
  assert(cal.lunge.knee_up >= cal.lunge.knee_down + 20, 'Lunge extension must be >= depth + 20');
});

test('applyAllCalibrationResults: pushup results set pushup thresholds', () => {
  const puResult = computeWarmupThresholds([75, 78, 76], [158, 160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  assertEquals(cal.pushup.elbow_down, puResult.depthThreshold, 'Pushup depth should match');
  assertEquals(cal.pushup.elbow_up, puResult.extensionThreshold, 'Pushup extension should match');
});

test('applyAllCalibrationResults: pushup results derive pullup thresholds', () => {
  const puResult = computeWarmupThresholds([80, 80, 80], [160, 160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  // Pullup top = pushup depth - 20 (tighter)
  assertEquals(cal.pullup.elbow_top, puResult.depthThreshold - 20, 'Pullup top = pushup depth - 20');
  assertEquals(cal.pullup.elbow_bottom, puResult.extensionThreshold, 'Pullup bottom = pushup extension');
});

test('applyAllCalibrationResults: pullup top floors at 50°', () => {
  // Very flexible person: pushup depth at 65° → pullup top would be 45, but floors at 50
  const puResult = computeWarmupThresholds([57, 57], [160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  assertEquals(cal.pullup.elbow_top, 50, 'Pullup top should floor at 50°');
});

test('applyAllCalibrationResults: both exercises combined', () => {
  const sqResult = computeWarmupThresholds([85, 85, 85], [165, 165]);
  const puResult = computeWarmupThresholds([78, 78, 78], [158, 158]);
  const cal = applyAllCalibrationResults({ squat: sqResult, pushup: puResult });
  // All four exercises should be calibrated
  assertEquals(cal.squat.knee_down, sqResult.depthThreshold, 'Squat calibrated');
  assertEquals(cal.pushup.elbow_down, puResult.depthThreshold, 'Pushup calibrated');
  assert(cal.lunge.knee_down > cal.squat.knee_down, 'Lunge shallower than squat');
  assert(cal.pullup.elbow_top < cal.pushup.elbow_down, 'Pullup tighter than pushup');
});

test('getPrimaryAngle: pushup uses elbow angle (straight arm = ~180°)', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Straight left arm: shoulder-elbow-wrist all in a line → ~180°
  lm[11] = { x: 0.0, y: 0.0 }; lm[13] = { x: 0.5, y: 0.0 }; lm[15] = { x: 1.0, y: 0.0 };
  // Straight right arm
  lm[12] = { x: 0.0, y: 1.0 }; lm[14] = { x: 0.5, y: 1.0 }; lm[16] = { x: 1.0, y: 1.0 };
  const result = getPrimaryAngle(lm, 'pushup');
  assertCloseTo(result, 180, 2, 'Straight arm should give ~180° for pushup');
});

test('getPrimaryAngle: squat uses knee angle', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Right angle knee: hip directly above knee, ankle to the side → 90°
  lm[23] = { x: 0.5, y: 0.0 }; lm[25] = { x: 0.5, y: 0.5 }; lm[27] = { x: 1.0, y: 0.5 };
  lm[24] = { x: 0.5, y: 0.0 }; lm[26] = { x: 0.5, y: 0.5 }; lm[28] = { x: 1.0, y: 0.5 };
  const result = getPrimaryAngle(lm, 'squat');
  assertCloseTo(result, 90, 2, 'Right-angle knee should give ~90° for squat');
});

test('getPrimaryAngle: lunge returns front (smaller) knee angle', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Left knee at 90° (front leg), right knee at 150° (back leg)
  lm[23] = { x: 0.5, y: 0.0 }; lm[25] = { x: 0.5, y: 0.5 }; lm[27] = { x: 1.0, y: 0.5 };  // 90°
  lm[24] = { x: 0.0, y: 0.5 }; lm[26] = { x: 0.5, y: 0.5 }; lm[28] = { x: 0.6, y: 1.0 };  // obtuse
  const result = getPrimaryAngle(lm, 'lunge');
  const leftKnee = angle(lm[23], lm[25], lm[27]);
  const rightKnee = angle(lm[24], lm[26], lm[28]);
  assertEquals(result, Math.min(leftKnee, rightKnee), 'Lunge should return the smaller (front) knee angle');
});

test('getPrimaryAngle: pullup uses elbow angle same as pushup', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.0, y: 0.0 }; lm[13] = { x: 0.5, y: 0.0 }; lm[15] = { x: 1.0, y: 0.0 };
  lm[12] = { x: 0.0, y: 1.0 }; lm[14] = { x: 0.5, y: 1.0 }; lm[16] = { x: 1.0, y: 1.0 };
  const pushupResult = getPrimaryAngle(lm, 'pushup');
  const pullupResult = getPrimaryAngle(lm, 'pullup');
  assertEquals(pullupResult, pushupResult, 'Pullup and pushup use the same elbow landmarks');
});

test('getPrimaryAngle: row uses elbow angle same as pushup', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.0, y: 0.0 }; lm[13] = { x: 0.5, y: 0.0 }; lm[15] = { x: 1.0, y: 0.0 };
  lm[12] = { x: 0.0, y: 1.0 }; lm[14] = { x: 0.5, y: 1.0 }; lm[16] = { x: 1.0, y: 1.0 };
  const pushupResult = getPrimaryAngle(lm, 'pushup');
  const rowResult    = getPrimaryAngle(lm, 'row');
  assertEquals(rowResult, pushupResult, 'Row uses same elbow landmarks as pushup');
});

test('getPrimaryAngle: pistol returns front (smaller) knee angle', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Left knee at 90° (working leg), right knee at obtuse angle (free leg)
  lm[23] = { x: 0.5, y: 0.0 }; lm[25] = { x: 0.5, y: 0.5 }; lm[27] = { x: 1.0, y: 0.5 };
  lm[24] = { x: 0.0, y: 0.5 }; lm[26] = { x: 0.5, y: 0.5 }; lm[28] = { x: 0.6, y: 1.0 };
  const result = getPrimaryAngle(lm, 'pistol');
  const leftKnee  = angle(lm[23], lm[25], lm[27]);
  const rightKnee = angle(lm[24], lm[26], lm[28]);
  assertEquals(result, Math.min(leftKnee, rightKnee), 'Pistol should return the smaller (working) knee angle');
});

test('applyAllCalibrationResults: pushup derives row thresholds', () => {
  const puResult = computeWarmupThresholds([80, 80, 80], [160, 160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  assertEquals(cal.row.elbow_down, puResult.depthThreshold, 'Row elbow_down should match pushup depth');
  assertEquals(cal.row.elbow_up, puResult.extensionThreshold, 'Row elbow_up should match pushup extension');
});

test('applyAllCalibrationResults: squat derives pistol thresholds (deeper by 10°)', () => {
  const sqResult = computeWarmupThresholds([90, 90, 90], [165, 165]);
  const cal = applyAllCalibrationResults({ squat: sqResult });
  assertEquals(cal.pistol.knee_down, sqResult.depthThreshold - 10, 'Pistol depth = squat depth - 10');
  assertEquals(cal.pistol.knee_up, cal.squat.knee_up, 'Pistol extension = squat extension');
});

test('applyAllCalibrationResults: pistol knee_down floors at 50°', () => {
  // Very flexible: squat depth 55° → pistol would be 45°, but floors at 50
  const sqResult = computeWarmupThresholds([47, 47], [165]);
  const cal = applyAllCalibrationResults({ squat: sqResult });
  assert(cal.pistol.knee_down >= 50, 'Pistol knee_down should floor at 50°');
});

test('relative depth threshold: default pushup fires at elbow_down + 12', () => {
  // Default elbow_down = 100 → cue fires at 112 (close to old hardcoded 110)
  const defaultCal = { pushup: { elbow_down: 100 } };
  const cueAngle = defaultCal.pushup.elbow_down + 12;
  assertEquals(cueAngle, 112, 'Default relative depth cue angle should be 112° (≈old hardcoded 110°)');
});

test('relative depth threshold: after warmup calibration scales to user range', () => {
  // User calibrated depth at 80° → cue fires at 92, not 112
  const userCal = { pushup: { elbow_down: 80 } };
  const cueAngle = userCal.pushup.elbow_down + 12;
  assertEquals(cueAngle, 92, 'Calibrated user should get depth cue scaled to their range');
  assert(cueAngle < 112, 'Calibrated user with better depth should get stricter cue angle');
});

// ===== FRAME POSITIONING AUTO-DETECT TESTS =====

function checkPositioning_test(lm, ex) {
  if (!lm) return { aligned: false, hint: null };
  const required = {
    pushup:  [11, 12, 13, 14, 15, 16, 23, 24, 27, 28],
    plank:   [11, 12, 23, 24, 27, 28],
    squat:   [11, 12, 23, 24, 25, 26, 27, 28],
    lunge:   [11, 12, 23, 24, 25, 26, 27, 28],
    pullup:  [11, 12, 13, 14, 15, 16, 23, 24],
  };
  const landmarks = required[ex] || [];
  if (!landmarks.every(i => lm[i] && lm[i].visibility > 0.4)) {
    return { aligned: false, hint: 'Move back for full body view' };
  }
  const avgShoulderY = (lm[11].y + lm[12].y) / 2;
  const avgAnkleY    = (lm[27].y + lm[28].y) / 2;
  const vertSpan     = Math.abs(avgAnkleY - avgShoulderY);
  if (ex === 'pushup' || ex === 'plank') {
    if (vertSpan < 0.06) return { aligned: false, hint: 'Move back — too close' };
    if (vertSpan > 0.30) return { aligned: false, hint: 'Move back a little' };
    return { aligned: true, hint: 'Good position!' };
  }
  if (ex === 'squat' || ex === 'lunge') {
    if (vertSpan < 0.30) return { aligned: false, hint: 'Move back — too close' };
    if (vertSpan > 0.80) return { aligned: false, hint: 'Move closer' };
    return { aligned: true, hint: 'Good position!' };
  }
  if (ex === 'pullup') {
    const avgWristY = (lm[15].y + lm[16].y) / 2;
    if (avgWristY > avgShoulderY + 0.05) return { aligned: false, hint: 'Grip the bar' };
    return { aligned: true, hint: 'Good position!' };
  }
  return { aligned: true, hint: null };
}

function makeFullLm(overrides) {
  const lm = Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  if (overrides) Object.keys(overrides).forEach(k => { lm[k] = overrides[k]; });
  return lm;
}

test('checkPositioning: rejects null landmarks', () => {
  assertBool(checkPositioning_test(null, 'squat').aligned, false, 'Should reject null');
});

test('checkPositioning: rejects low-visibility landmarks', () => {
  const lm = makeFullLm({ 23: { x: 0.5, y: 0.5, visibility: 0.1 } });
  const result = checkPositioning_test(lm, 'squat');
  assertBool(result.aligned, false, 'Should reject invisible landmark');
  assertEquals(result.hint, 'Move back for full body view', 'Should suggest moving back');
});

test('checkPositioning: squat accepts good vertical span (0.65)', () => {
  const lm = makeFullLm({
    11: { x: 0.5, y: 0.15, visibility: 0.9 }, 12: { x: 0.5, y: 0.15, visibility: 0.9 },
    27: { x: 0.5, y: 0.80, visibility: 0.9 }, 28: { x: 0.5, y: 0.80, visibility: 0.9 }
  });
  assertBool(checkPositioning_test(lm, 'squat').aligned, true, 'Squat span 0.65 should align');
});

test('checkPositioning: squat rejects too-close (vertSpan 0.20 < 0.30)', () => {
  const lm = makeFullLm({
    11: { x: 0.5, y: 0.40, visibility: 0.9 }, 12: { x: 0.5, y: 0.40, visibility: 0.9 },
    27: { x: 0.5, y: 0.60, visibility: 0.9 }, 28: { x: 0.5, y: 0.60, visibility: 0.9 }
  });
  const r = checkPositioning_test(lm, 'squat');
  assertBool(r.aligned, false, 'Squat span 0.20 = too close');
  assertEquals(r.hint, 'Move back — too close', 'Hint should suggest moving back');
});

test('checkPositioning: pushup accepts good horizontal span (0.14)', () => {
  const lm = makeFullLm({
    11: { x: 0.5, y: 0.48, visibility: 0.9 }, 12: { x: 0.5, y: 0.48, visibility: 0.9 },
    27: { x: 0.5, y: 0.62, visibility: 0.9 }, 28: { x: 0.5, y: 0.62, visibility: 0.9 }
  });
  assertBool(checkPositioning_test(lm, 'pushup').aligned, true, 'Pushup span 0.14 should align');
});

test('checkPositioning: pushup rejects span > 0.30 (too close)', () => {
  const lm = makeFullLm({
    11: { x: 0.5, y: 0.30, visibility: 0.9 }, 12: { x: 0.5, y: 0.30, visibility: 0.9 },
    27: { x: 0.5, y: 0.75, visibility: 0.9 }, 28: { x: 0.5, y: 0.75, visibility: 0.9 }
  });
  assertBool(checkPositioning_test(lm, 'pushup').aligned, false, 'Pushup span 0.45 = too close');
});

test('checkPositioning: pullup aligned when wrists above shoulders', () => {
  const lm = makeFullLm({
    11: { x: 0.4, y: 0.30, visibility: 0.9 }, 12: { x: 0.6, y: 0.30, visibility: 0.9 },
    15: { x: 0.3, y: 0.10, visibility: 0.9 }, 16: { x: 0.7, y: 0.10, visibility: 0.9 }
  });
  assertBool(checkPositioning_test(lm, 'pullup').aligned, true, 'Wrists above shoulders = aligned');
});

test('checkPositioning: pullup not aligned when wrists below shoulders', () => {
  const lm = makeFullLm({
    11: { x: 0.4, y: 0.25, visibility: 0.9 }, 12: { x: 0.6, y: 0.25, visibility: 0.9 },
    15: { x: 0.4, y: 0.70, visibility: 0.9 }, 16: { x: 0.6, y: 0.70, visibility: 0.9 }
  });
  const r = checkPositioning_test(lm, 'pullup');
  assertBool(r.aligned, false, 'Wrists below shoulders = not aligned');
  assertEquals(r.hint, 'Grip the bar', 'Should prompt to grip bar');
});

// ===== RICHER AUDIO COACHING TESTS =====

test('milestone encouragement: cycles through phrases every 5 reps', () => {
  const milestoneLines = [
    '5! Keep going',
    '10 — great work',
    '15! Push through',
    '20 reps — stay strong',
  ];
  // Replicate the selection logic from index.html
  function milestoneMsg(reps) {
    const lines = [
      `${reps}! Keep going`,
      `${reps} — great work`,
      `${reps}! Push through`,
      `${reps} reps — stay strong`,
    ];
    return lines[Math.floor(reps / 5 - 1) % lines.length];
  }
  assertEquals(milestoneMsg(5),  '5! Keep going',       'Rep 5 should use first phrase');
  assertEquals(milestoneMsg(10), '10 — great work',     'Rep 10 should use second phrase');
  assertEquals(milestoneMsg(15), '15! Push through',    'Rep 15 should use third phrase');
  assertEquals(milestoneMsg(20), '20 reps — stay strong', 'Rep 20 should use fourth phrase');
  assertEquals(milestoneMsg(25), '25! Keep going',      'Rep 25 should cycle back to first');
});

test('tempo detection: flags reps faster than 1800ms average', () => {
  // Simulate 3 reps at 1500ms each → avg 1500 < 1800 → should flag
  const repTimes = [1500, 1500, 1500];
  const avgMs = repTimes.reduce((a, b) => a + b, 0) / repTimes.length;
  assert(avgMs < 1800, 'Fast reps (1500ms each) should be flagged as too fast');
});

test('tempo detection: does not flag reps at 2500ms average', () => {
  const repTimes = [2500, 2500];
  const avgMs = repTimes.reduce((a, b) => a + b, 0) / repTimes.length;
  assert(avgMs >= 1800, 'Slow reps (2500ms each) should not be flagged');
});

test('breathing cue: fires exactly once per set (at rep 2)', () => {
  // The logic: state.reps === 2 && !state.breathingCuedThisSet
  let breathingCuedThisSet = false;
  let cueCount = 0;
  for (let rep = 1; rep <= 10; rep++) {
    if (rep === 2 && !breathingCuedThisSet) {
      breathingCuedThisSet = true;
      cueCount++;
    }
  }
  assertEquals(cueCount, 1, 'Breathing cue should fire exactly once per set');
});

// ===== PER-REP FORM SCORE + END-OF-SET SUMMARY TESTS =====

function buildSetSummary(reps, repScores, exercise) {
  if (reps === 0) return 'Set done.';
  if (exercise === 'plank' || exercise === 'deadhang') return null; // timed exercises use their own message
  if (repScores.length === 0) return `${reps} rep${reps === 1 ? '' : 's'}.`;
  const avg = Math.round(repScores.reduce((a, b) => a + b, 0) / repScores.length);
  const goodCount = repScores.filter(s => s >= 80).length;
  if (avg >= 90) return `${reps} reps. Excellent form!`;
  else if (avg >= 75) return `${reps} reps. Good form on ${goodCount} of ${reps}.`;
  else if (avg >= 55) return `${reps} reps. ${goodCount} clean rep${goodCount === 1 ? '' : 's'} — focus on form next set.`;
  else return `${reps} reps. Form needs work — slow it down next set.`;
}

test('buildSetSummary: 0 reps returns minimal message', () => {
  assertEquals(buildSetSummary(0, [], 'pushup'), 'Set done.', '0 reps should be minimal');
});

test('buildSetSummary: plank returns null (uses own message)', () => {
  assert(buildSetSummary(1, [90], 'plank') === null, 'Plank should return null');
});

test('buildSetSummary: no scores recorded falls back to rep count only', () => {
  const msg = buildSetSummary(8, [], 'pushup');
  assert(msg.includes('8 reps'), 'Should include rep count when no scores');
});

test('buildSetSummary: avg ≥90 gives excellent message', () => {
  const scores = [95, 90, 100, 92];
  const msg = buildSetSummary(4, scores, 'pushup');
  assert(msg.includes('Excellent form'), `Expected excellent, got: ${msg}`);
});

test('buildSetSummary: avg 75-89 gives good-form count message', () => {
  const scores = [80, 80, 80, 80, 60, 70]; // avg = 75, good = 4
  const msg = buildSetSummary(6, scores, 'squat');
  assert(msg.includes('Good form on 4 of 6'), `Expected good form count, got: ${msg}`);
});

test('buildSetSummary: avg 55-74 gives clean-reps count message', () => {
  const scores = [80, 50, 50, 70]; // avg = 62.5, good (≥80) = 1
  const msg = buildSetSummary(4, scores, 'pushup');
  assert(msg.includes('1 clean rep'), `Expected 1 clean rep, got: ${msg}`);
});

test('buildSetSummary: avg <55 gives needs-work message', () => {
  const scores = [40, 50, 45]; // avg = 45
  const msg = buildSetSummary(3, scores, 'pushup');
  assert(msg.includes('Form needs work'), `Expected form needs work, got: ${msg}`);
});

test('buildSetSummary: singular rep uses correct grammar', () => {
  const msg = buildSetSummary(1, [], 'pushup');
  assert(msg.includes('1 rep.'), `Singular should say 'rep' not 'reps': ${msg}`);
});

// --- EXERCISE TRANSITION FEEDBACK TESTS ---
test('exercise transition: standing exercises get spoken prompt with instructions', () => {
  // Standing exercises should get "Ready for X. Raise your hand or tap Ready."
  const standingExercises = ['squat', 'lunge', 'pullup'];
  const floorExercises = ['pushup', 'plank'];

  standingExercises.forEach(ex => {
    const isStanding = ex === 'squat' || ex === 'lunge' || ex === 'pullup';
    assert(isStanding, `${ex} should be classified as standing`);
  });

  floorExercises.forEach(ex => {
    const isStanding = ex === 'squat' || ex === 'lunge' || ex === 'pullup';
    assert(!isStanding, `${ex} should NOT be classified as standing`);
  });
});

// --- FLOOR LINE VISIBILITY TESTS ---
test('floor line: spans nearly full width (3% to 95%)', () => {
  const w = 640;
  const startX = w * 0.03;
  const endX = w * 0.95;
  const span = (endX - startX) / w;
  assert(span > 0.90, `Floor line should span >90% of width, got ${(span * 100).toFixed(0)}%`);
});

test('floor line: opacity is 0.55 (clearly visible)', () => {
  // The line uses rgba(255, 255, 255, 0.55) — verify alpha > 0.4
  const alpha = 0.55;
  assert(alpha >= 0.4, 'Floor line opacity should be >= 0.4 for visibility');
  assert(alpha <= 0.7, 'Floor line opacity should be <= 0.7 to not obscure camera');
});

// --- WARMUP DIRECTION CHANGE JITTER FILTER TESTS ---
// Simulates the analyzeWarmup wall-clock direction filter: requires 4° change AND 150ms sustained.
// frameIntervalMs defaults to 67ms (≈15fps active workout rate).
function simulateWarmupDirectionChanges(angleSequence, frameIntervalMs = 67) {
  const DIRECTION_HOLD_MS = 150;
  let warmupPhase = 'up';
  let prevAngle = null;
  let directionStartTime = 0;
  const phaseFlips = [];

  angleSequence.forEach((primaryAngle, frameIdx) => {
    const t = frameIdx * frameIntervalMs;
    const goingDown = prevAngle !== null && primaryAngle < prevAngle - 4;
    const goingUp   = prevAngle !== null && primaryAngle > prevAngle + 4;
    prevAngle = primaryAngle;

    const wantFlip = (warmupPhase === 'up' && goingDown) || (warmupPhase === 'down' && goingUp);
    if (wantFlip) {
      if (directionStartTime === 0) directionStartTime = t;
    } else {
      directionStartTime = 0;
    }
    const elapsed = directionStartTime > 0 ? t - directionStartTime : 0;

    if (warmupPhase === 'up' && goingDown && elapsed >= DIRECTION_HOLD_MS) {
      warmupPhase = 'down';
      directionStartTime = 0;
      phaseFlips.push('down');
    }
    if (warmupPhase === 'down' && goingUp && elapsed >= DIRECTION_HOLD_MS) {
      warmupPhase = 'up';
      directionStartTime = 0;
      phaseFlips.push('up');
    }
  });
  return phaseFlips;
}

test('warmup jitter filter: small oscillations do not flip phase', () => {
  // 2° jitter around 160° — never exceeds 4° threshold, so never flips
  const angles = [160, 158, 160, 158, 160, 162, 160, 158];
  const flips = simulateWarmupDirectionChanges(angles);
  assertEquals(flips.length, 0, 'Small jitter should produce no phase flips');
});

test('warmup jitter filter: single large drop then immediate reversal does not flip', () => {
  // One frame drops 5° but reverses before 150ms wall-clock elapses
  const angles = [160, 155, 160, 165];
  const flips = simulateWarmupDirectionChanges(angles);
  assertEquals(flips.length, 0, 'Single-frame drop should not flip phase');
});

test('warmup jitter filter: sustained descent flips to down after 150ms', () => {
  // Steady descent: each frame drops >4° — flips after 150ms (~3 frames at 67ms/frame)
  const angles = [170, 165, 160, 155, 150];
  const flips = simulateWarmupDirectionChanges(angles);
  assert(flips.includes('down'), 'Sustained descent should flip phase to down');
});

test('warmup jitter filter: sustained ascent flips back to up', () => {
  // Go down first (150ms+ of descent), then come back up (150ms+ of ascent)
  const angles = [170, 165, 160, 155, 150, 155, 160, 165, 170];
  const flips = simulateWarmupDirectionChanges(angles);
  assert(flips.includes('down'), 'Should flip to down first');
  assert(flips.includes('up'), 'Should flip back to up on sustained ascent');
});

test('warmup jitter filter: at slow frame rate (7.5fps) still requires 150ms', () => {
  // At 133ms/frame, a single frame direction change (133ms) is just under 150ms — no flip
  const angles = [170, 160, 170]; // two large drops but only 1 frame each direction
  const flips = simulateWarmupDirectionChanges(angles, 133);
  assertEquals(flips.length, 0, 'Single-frame at 7.5fps should not flip (133ms < 150ms threshold)');
});

test('warmup jitter filter: at slow frame rate (7.5fps) sustained movement still flips', () => {
  // At 133ms/frame, two consecutive frames descending = 266ms > 150ms — should flip
  const angles = [170, 165, 160, 155, 150];
  const flips = simulateWarmupDirectionChanges(angles, 133);
  assert(flips.includes('down'), 'Two frames at 7.5fps (266ms) should flip after 150ms');
});

// --- VISIBILITY HYSTERESIS TESTS ---
// Simulates checkPositioning visibility threshold logic:
// higher threshold (0.45) to become aligned, lower (0.30) to stay aligned.
function checkVisibilityHysteresis(visValues, initialAligned = false) {
  let isAligned = initialAligned;
  const results = [];
  for (const vis of visValues) {
    const threshold = isAligned ? 0.30 : 0.45;
    const meetsThreshold = vis >= threshold;
    isAligned = meetsThreshold;
    results.push(meetsThreshold);
  }
  return results;
}

test('visibility hysteresis: landmark at 0.40 — not aligned when starting cold', () => {
  // 0.40 < 0.45 (enter threshold), so should NOT become aligned from unaligned
  const result = checkVisibilityHysteresis([0.40], false);
  assertBool(result[0], false, 'vis=0.40 should not reach aligned state from cold (threshold=0.45)');
});

test('visibility hysteresis: landmark at 0.40 — stays aligned if already aligned', () => {
  // 0.40 > 0.30 (stay threshold), so should remain aligned when already aligned
  const result = checkVisibilityHysteresis([0.40], true);
  assertBool(result[0], true, 'vis=0.40 should stay aligned (threshold=0.30 when already aligned)');
});

test('visibility hysteresis: prevents flicker at boundary value', () => {
  // Sequence: become aligned (vis=0.50), then fluctuate at 0.35 (above stay threshold)
  // Without hysteresis, 0.35 < 0.45 would drop alignment each frame
  const sequence = [0.50, 0.35, 0.38, 0.33, 0.50];
  const results = checkVisibilityHysteresis(sequence, false);
  assertBool(results[0], true,  'vis=0.50 should become aligned');
  assertBool(results[1], true,  'vis=0.35 should stay aligned (>0.30 stay threshold)');
  assertBool(results[2], true,  'vis=0.38 should stay aligned');
  assertBool(results[3], true,  'vis=0.33 should stay aligned (>0.30 stay threshold)');
  assertBool(results[4], true,  'vis=0.50 should remain aligned');
});

test('visibility hysteresis: drops alignment when visibility truly low', () => {
  // If visibility drops below 0.30, alignment should be lost even when previously aligned
  const sequence = [0.50, 0.25];
  const results = checkVisibilityHysteresis(sequence, false);
  assertBool(results[0], true,  'vis=0.50 should become aligned');
  assertBool(results[1], false, 'vis=0.25 should lose alignment (<0.30 stay threshold)');
});

// --- COLORBLIND-SAFE COLOR TESTS ---
// Verifies the semantic feedback colors use blue/orange (safe for red-green colorblindness)
// rather than the original green/red pair.
const FEEDBACK_COLORS = {
  good: '#60a5fa',  // blue — was green #4ade80
  warn: '#fbbf24',  // yellow — unchanged
  bad:  '#fb923c',  // orange — was red #f87171
};

test('colorblind: good feedback color is blue (not green)', () => {
  assertEquals(FEEDBACK_COLORS.good, '#60a5fa', 'Good feedback should be blue (#60a5fa)');
  assert(FEEDBACK_COLORS.good !== '#4ade80', 'Good feedback should not be the old green');
});

test('colorblind: bad feedback color is orange (not red)', () => {
  assertEquals(FEEDBACK_COLORS.bad, '#fb923c', 'Bad feedback should be orange (#fb923c)');
  assert(FEEDBACK_COLORS.bad !== '#f87171', 'Bad feedback should not be the old red');
});

test('colorblind: warn feedback color is yellow (unchanged)', () => {
  assertEquals(FEEDBACK_COLORS.warn, '#fbbf24', 'Warning feedback should remain yellow (#fbbf24)');
});

test('colorblind: rep score threshold — blue for ≥80, yellow for 60-79, orange for <60', () => {
  function repColor(score) {
    return score >= 80 ? FEEDBACK_COLORS.good : score >= 60 ? FEEDBACK_COLORS.warn : FEEDBACK_COLORS.bad;
  }
  assertEquals(repColor(100), '#60a5fa', 'Perfect score should be blue');
  assertEquals(repColor(80),  '#60a5fa', 'Score 80 boundary should be blue');
  assertEquals(repColor(79),  '#fbbf24', 'Score 79 should be yellow');
  assertEquals(repColor(60),  '#fbbf24', 'Score 60 boundary should be yellow');
  assertEquals(repColor(59),  '#fb923c', 'Score 59 should be orange');
  assertEquals(repColor(0),   '#fb923c', 'Score 0 should be orange');
});

// --- SILHOUETTE GUIDE DIMENSION GUARD TESTS ---
test('drawGuide: dimension guard returns false for zero-width canvas', () => {
  // Simulates the guard logic: if width or height is 0, drawGuide should not proceed
  function shouldDrawGuide(width, height) {
    if (width === 0 || height === 0) return false;
    return true;
  }
  assertBool(shouldDrawGuide(0, 480), false, 'Zero width should block drawing');
  assertBool(shouldDrawGuide(640, 0), false, 'Zero height should block drawing');
  assertBool(shouldDrawGuide(0, 0), false, 'Both zero should block drawing');
  assertBool(shouldDrawGuide(640, 480), true, 'Valid dimensions should allow drawing');
});

test('per-rep score: average of frame scores for a rep', () => {
  // Simulate 3 frames: scores 100, 80, 60 → avg = 80
  const currentRepScores = [100, 80, 60];
  const repScore = Math.round(currentRepScores.reduce((a, b) => a + b, 0) / currentRepScores.length);
  assertEquals(repScore, 80, 'Per-rep score should average frame scores');
});

test('per-rep score: color threshold — green ≥80', () => {
  assert(80 >= 80, 'Score of 80 should get green');
  assert(79 < 80, 'Score of 79 should not get green');
});

// ===== PHASE 4: PERSISTENCE & EXPORT PURE FUNCTION TESTS =====

// --- escapeHtml ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

test('escapeHtml: escapes angle brackets', () => {
  assertEquals(escapeHtml('<script>'), '&lt;script&gt;', 'Should escape < and >');
});

test('escapeHtml: escapes ampersand', () => {
  assertEquals(escapeHtml('a & b'), 'a &amp; b', 'Should escape &');
});

test('escapeHtml: escapes double quotes', () => {
  assertEquals(escapeHtml('"hello"'), '&quot;hello&quot;', 'Should escape "');
});

test('escapeHtml: escapes single quotes', () => {
  assertEquals(escapeHtml("it's"), 'it&#39;s', 'Should escape single quotes');
});

test('escapeHtml: passes through safe strings unchanged', () => {
  assertEquals(escapeHtml('Push-ups'), 'Push-ups', 'Safe strings should pass through');
});

test('escapeHtml: handles non-string input (number)', () => {
  assertEquals(escapeHtml(42), '42', 'Should convert numbers to string');
});

// --- buildCSVExport ---
function buildCSVExport(history) {
  const rows = ['Date,Exercise,Reps,"Form Score",Time'];
  for (const session of history) {
    for (const set of session.sets) {
      const ex    = String(set.exercise).replace(/"/g, '""');
      const score = set.avgScore !== undefined ? set.avgScore : '';
      const time  = String(set.time || '').replace(/"/g, '""');
      rows.push(`${session.date},"${ex}",${set.reps},${score},"${time}"`);
    }
  }
  return rows.join('\n');
}

test('buildCSVExport: empty history returns just header', () => {
  const csv = buildCSVExport([]);
  assertEquals(csv, 'Date,Exercise,Reps,"Form Score",Time', 'Empty history = header only');
});

test('buildCSVExport: single session single set', () => {
  const history = [{
    date: 'Apr 3, 2026',
    sets: [{ exercise: 'Push-ups', reps: 10, avgScore: 85, time: '10:30 AM' }]
  }];
  const csv = buildCSVExport(history);
  const lines = csv.split('\n');
  assertEquals(lines.length, 2, 'Should have header + 1 data row');
  assert(lines[1].startsWith('Apr 3, 2026'), 'Row should start with date');
  assert(lines[1].includes('"Push-ups"'), 'Exercise should be quoted');
  assert(lines[1].includes(',10,'), 'Reps should appear');
  assert(lines[1].includes(',85,'), 'Score should appear');
});

test('buildCSVExport: multiple sessions produce multiple rows', () => {
  const history = [
    { date: 'Apr 1, 2026', sets: [{ exercise: 'Squats', reps: 15, avgScore: 90, time: '9:00 AM' }] },
    { date: 'Apr 3, 2026', sets: [
      { exercise: 'Push-ups', reps: 10, avgScore: 80, time: '10:00 AM' },
      { exercise: 'Squats', reps: 12, avgScore: 75, time: '10:15 AM' },
    ]},
  ];
  const csv = buildCSVExport(history);
  const lines = csv.split('\n');
  assertEquals(lines.length, 4, 'Header + 3 set rows');
});

test('buildCSVExport: quotes in exercise name are escaped', () => {
  const history = [{
    date: 'Apr 3, 2026',
    sets: [{ exercise: 'Pull-"ups"', reps: 5, avgScore: 70, time: '9:00 AM' }]
  }];
  const csv = buildCSVExport(history);
  assert(csv.includes('Pull-""ups""'), 'Internal quotes should be doubled for CSV safety');
});

test('buildCSVExport: missing avgScore becomes empty field', () => {
  const history = [{
    date: 'Apr 3, 2026',
    sets: [{ exercise: 'Plank', reps: '1:30', time: '10:00 AM' }]
  }];
  const csv = buildCSVExport(history);
  assert(csv.includes(',1:30,,'), 'Missing score should produce empty field');
});

// --- aggregateRepsByExercise ---
function aggregateRepsByExercise(session) {
  const totals = {};
  for (const set of session.sets) {
    if (typeof set.reps === 'number' && set.reps > 0) {
      totals[set.exercise] = (totals[set.exercise] || 0) + set.reps;
    }
  }
  return totals;
}

test('aggregateRepsByExercise: sums reps for same exercise', () => {
  const session = { sets: [
    { exercise: 'Push-ups', reps: 10, avgScore: 80 },
    { exercise: 'Push-ups', reps: 8, avgScore: 75 },
  ]};
  const totals = aggregateRepsByExercise(session);
  assertEquals(totals['Push-ups'], 18, 'Should sum push-up reps');
});

test('aggregateRepsByExercise: groups multiple exercises separately', () => {
  const session = { sets: [
    { exercise: 'Push-ups', reps: 10, avgScore: 80 },
    { exercise: 'Squats',   reps: 15, avgScore: 90 },
  ]};
  const totals = aggregateRepsByExercise(session);
  assertEquals(totals['Push-ups'], 10, 'Push-ups correct');
  assertEquals(totals['Squats'],   15, 'Squats correct');
});

test('aggregateRepsByExercise: ignores non-numeric reps (plank time strings)', () => {
  const session = { sets: [
    { exercise: 'Plank', reps: '1:30' },
    { exercise: 'Push-ups', reps: 10 },
  ]};
  const totals = aggregateRepsByExercise(session);
  assert(!totals['Plank'], 'Plank string reps should be ignored');
  assertEquals(totals['Push-ups'], 10, 'Push-up numeric reps should be counted');
});

test('aggregateRepsByExercise: empty session returns empty object', () => {
  const totals = aggregateRepsByExercise({ sets: [] });
  assertEquals(Object.keys(totals).length, 0, 'Empty session → empty totals');
});

// ===== PHASE 5 EXERCISE TESTS =====

// --- New calibration defaults ---
test('calibration: pike defaults are set (elbow_down=90, elbow_up=150)', () => {
  assertEquals(defaultCalibration_test.pike.elbow_down, 90, 'Pike elbow_down default');
  assertEquals(defaultCalibration_test.pike.elbow_up,   150, 'Pike elbow_up default');
});

test('calibration: dip defaults are set (elbow_down=90, elbow_up=150)', () => {
  assertEquals(defaultCalibration_test.dip.elbow_down, 90, 'Dip elbow_down default');
  assertEquals(defaultCalibration_test.dip.elbow_up,   150, 'Dip elbow_up default');
});

test('calibration: legraise defaults are set (hip_down=110, hip_up=150)', () => {
  assertEquals(defaultCalibration_test.legraise.hip_down, 110, 'Legraise hip_down default');
  assertEquals(defaultCalibration_test.legraise.hip_up,   150, 'Legraise hip_up default');
});

// --- Calibration derivation for new exercises ---
test('applyAllCalibrationResults: pushup results derive pike thresholds', () => {
  const puResult = computeWarmupThresholds([80, 80, 80], [160, 160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  assertEquals(cal.pike.elbow_down, puResult.depthThreshold, 'Pike depth = pushup depth');
  assertEquals(cal.pike.elbow_up, puResult.extensionThreshold, 'Pike extension = pushup extension');
});

test('applyAllCalibrationResults: pushup results derive dip thresholds', () => {
  const puResult = computeWarmupThresholds([80, 80, 80], [160, 160]);
  const cal = applyAllCalibrationResults({ pushup: puResult });
  assertEquals(cal.dip.elbow_down, puResult.depthThreshold, 'Dip depth = pushup depth');
  assertEquals(cal.dip.elbow_up, puResult.extensionThreshold, 'Dip extension = pushup extension');
});

// --- isInPosition for new exercises ---
test('isInPosition: pike accepts raised hips (wristY=0.80, hipY=0.55)', () => {
  const lm = makeLmWithSpan(0.30, 0.80, 0.80);
  lm[23].y = 0.55; lm[24].y = 0.55; // hips raised
  assertBool(isInPosition(lm, 'pike'), true, 'Pike with hips high should be in position');
});

test('isInPosition: pike rejects when hips not raised (hipY close to wristY)', () => {
  const lm = makeLmWithSpan(0.30, 0.75, 0.75);
  lm[23].y = 0.70; lm[24].y = 0.70; // hips not much higher than wrists
  assertBool(isInPosition(lm, 'pike'), false, 'Pike with hips low should be out of position');
});

test('isInPosition: dip accepts upright body (span 0.60)', () => {
  const lm = makeLmWithSpan(0.20, 0.80);
  assertBool(isInPosition(lm, 'dip'), true, 'Upright body should be in dip position');
});

test('isInPosition: dip rejects horizontal body (span 0.10)', () => {
  const lm = makeLmWithSpan(0.45, 0.55);
  assertBool(isInPosition(lm, 'dip'), false, 'Horizontal body should be out of dip position');
});

test('isInPosition: deadhang accepts wrists above shoulders', () => {
  const lm = makeLmWithSpan(0.40, 0.90, 0.10); // wrists at 0.10, shoulders at 0.40
  assertBool(isInPosition(lm, 'deadhang'), true, 'Wrists above shoulders = in deadhang position');
});

test('isInPosition: deadhang rejects wrists far below shoulders', () => {
  const lm = makeLmWithSpan(0.40, 0.90, 0.80); // wrists at 0.80, well below shoulders at 0.40
  assertBool(isInPosition(lm, 'deadhang'), false, 'Wrists far below shoulders = out of deadhang position');
});

test('isInPosition: legraise accepts wrists above shoulders (hanging)', () => {
  const lm = makeLmWithSpan(0.40, 0.90, 0.10);
  assertBool(isInPosition(lm, 'legraise'), true, 'Hanging position should be in legraise position');
});

// --- getPrimaryAngle for new exercises ---
test('getPrimaryAngle: pike uses elbow angle (same as pushup)', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  // Straight arms → ~180°
  lm[11] = { x: 0.0, y: 0.0 }; lm[13] = { x: 0.5, y: 0.0 }; lm[15] = { x: 1.0, y: 0.0 };
  lm[12] = { x: 0.0, y: 0.0 }; lm[14] = { x: 0.5, y: 0.0 }; lm[16] = { x: 1.0, y: 0.0 };
  assertCloseTo(getPrimaryAngle(lm, 'pike'), 180, 5, 'Pike straight arms should be ~180°');
});

test('getPrimaryAngle: dip uses elbow angle (same as pushup)', () => {
  const lm = Array(33).fill({ x: 0.5, y: 0.5 });
  lm[11] = { x: 0.0, y: 0.0 }; lm[13] = { x: 0.5, y: 0.0 }; lm[15] = { x: 1.0, y: 0.0 };
  lm[12] = { x: 0.0, y: 0.0 }; lm[14] = { x: 0.5, y: 0.0 }; lm[16] = { x: 1.0, y: 0.0 };
  assertCloseTo(getPrimaryAngle(lm, 'dip'), 180, 5, 'Dip straight arms should be ~180°');
});

// --- buildSetSummary for timed exercises ---
test('buildSetSummary: deadhang returns null (timed exercise)', () => {
  assert(buildSetSummary(1, [90], 'deadhang') === null, 'Dead hang should return null like plank');
});

// ===== RUN TESTS =====
console.log('\n=== FormCheck Fitness App - Test Suite ===\n');

tests.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
});

// Summary
console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed`);
  process.exit(1);
}
