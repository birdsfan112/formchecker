# FormCheck Fitness App - Test Report

## Overview
Comprehensive Node.js test suite for the FormCheck fitness app's pure JavaScript logic functions. All 34 tests pass successfully.

## Test Coverage

### 1. Angle Calculation Tests (5 tests)
Tests the core `angle()` function which calculates the angle between three points in degrees.

- **90 degree right angle**: Validates correct calculation of perpendicular angles
- **180 degree straight line**: Ensures collinear points produce 180°
- **45 degree acute angle**: Tests acute angle detection
- **Obtuse angle**: Validates angles between 90-180°
- **Reflex angle wraps to 180-0 range**: Ensures angles always return 0-180° range

**Status**: ✓ All passing

### 2. Open Palm Detection Tests (7 tests)
Tests the `isOpenPalm()` function which detects open palm gesture using MediaPipe hand landmarks.

Checks include:
- **Visibility thresholds**: Wrist (0.65+), pinky (0.5+), index (0.5+), thumb (0.5+)
- **Hand elevation**: Wrist must be above hip level (y < 0.60)
- **Fingertip spread**: Fingers must be separated from wrist (index: 0.04+, pinky: 0.04+, thumb: 0.03+)
- **Triangle area**: Fingertips must form sufficient spread area (≥ 0.0008)

Test cases:
- Detects valid open palm with high visibility
- Rejects low wrist visibility
- Rejects low pinky visibility
- Rejects hand below hip level
- Rejects fingers too close (fist)
- Rejects small triangle area (bunched fingers)
- Accepts good spread fingers with large triangle area

**Status**: ✓ All passing

### 3. Cooldown System Tests (4 tests)
Tests the `cueShouldFire()` cooldown logic which prevents spam/duplicate cues.

- **Fires on first call**: New cues always trigger
- **Blocks within cooldown period**: Same cue blocked until cooldown expires
- **Independent cues**: Different cue keys maintain separate cooldowns
- **Reset clears all cooldowns**: Resetting allows all cues to fire again

**Status**: ✓ All passing

### 4. Plank Pose Validation Tests (3 tests)
Tests `validatePlankPose()` which checks if body is horizontal (shoulder-to-ankle vertical span < 0.25).

- **Accepts horizontal position**: Span 0.10 validates as plank
- **Rejects standing position**: Span 0.70 rejects as not plank
- **Edge case at threshold**: Span exactly 0.25 accepts

**Status**: ✓ All passing

### 5. Push-up Form Analysis Tests (5 tests)
Tests `pushupFormAnalysis()` for rep counting and form scoring.

**Rep Counting**:
- Detects transition from up to down when elbow angle < 100°
- Detects transition from down to up when elbow angle > 150°

**Form Scoring**:
- Penalizes hips dropping (back angle < 145°, -30 points)
- Penalizes hips too high (back angle > 195°, -20 points)
- Good form scores 100 points

**Status**: ✓ All passing

### 6. Squat Form Analysis Tests (5 tests)
Tests `squatFormAnalysis()` for rep counting, view detection, and form scoring.

**Rep Counting**:
- Detects transition from up to down when knee angle < 100°
- Detects transition from down to up when knee angle > 160°

**View Detection**:
- Detects front view when shoulders spread > 0.15
- Detects side view when shoulders spread < 0.15

**Form Scoring**:
- Penalizes shallow squat (knee angle > 110° while descending, -20 points)
- Penalizes narrow knees in front view (knees < ankles × 0.65, -25 points)

**Status**: ✓ All passing

### 7. Plank Form Analysis Tests (5 tests)
Tests `plankFormAnalysis()` for plank position validation, hold time, and form scoring.

**Position Validation**:
- Rejects standing position (vertical span > 0.25)
- Accepts horizontal position (vertical span < 0.25)
- Measures hold time correctly

**Form Scoring**:
- Penalizes hips dropping (back angle < 145°, -30 points)
- Accepts different back angles with positive scoring

**Status**: ✓ All passing

## Test Statistics
- **Total Tests**: 34
- **Passed**: 34
- **Failed**: 0
- **Success Rate**: 100%

## Functions Tested

### Core Utility Functions
1. `angle(a, b, c)` - 3-point angle calculation
2. `isOpenPalm(wrist, pinky, index, thumb)` - Palm gesture detection
3. `createCueManager()` - Cooldown system for cues

### Validation Functions
4. `validatePlankPose(lm)` - Plank position validation

### Exercise Analysis Functions
5. `pushupFormAnalysis(lm, prevAngle, phase)` - Push-up analysis
6. `squatFormAnalysis(lm, prevAngle, phase)` - Squat analysis
7. `plankFormAnalysis(lm, plankStartTime)` - Plank analysis

## Key Features Validated

✓ **Angle calculation** handles all angle ranges correctly  
✓ **Palm detection** uses multi-level validation (visibility, height, spread, area)  
✓ **Cooldown system** prevents cue spam with configurable intervals  
✓ **Plank position validation** enforces horizontal body requirement  
✓ **Rep counting** transitions correctly for pushups, squats  
✓ **Form scoring** penalizes specific form issues appropriately  
✓ **View detection** identifies front vs. side-view positioning  
✓ **Hold time tracking** measures seconds in plank position  

## How to Run

```bash
cd "C:\Users\scott\Documents\FormChecker"
node tests.js
```

## Test Architecture

The test suite uses a simple assertion-based framework with:
- `assert(condition, message)` - Basic boolean assertion
- `assertEquals(actual, expected, message)` - Equality checking
- `assertCloseTo(actual, expected, tolerance, message)` - Float comparison
- `assertBool(actual, expected, message)` - Boolean assertion

All functions are extracted from the browser app and tested in isolation with Node.js, ensuring pure JavaScript logic without DOM dependencies.
