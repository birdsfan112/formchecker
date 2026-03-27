# MediaPipe Pose Landmark Reference

MediaPipe Pose provides 33 landmarks. The ones used most in FormCheck:

| Landmark | Body Part |
|---|---|
| 0 | Nose |
| 11 / 12 | Left / right shoulder |
| 13 / 14 | Left / right elbow |
| 15 / 16 | Left / right wrist |
| 17 / 18 | Left / right pinky (fingertip) |
| 19 / 20 | Left / right index finger (fingertip) |
| 21 / 22 | Left / right thumb |
| 23 / 24 | Left / right hip |
| 25 / 26 | Left / right knee |
| 27 / 28 | Left / right ankle |
| 29–32 | Feet (heel / toe) |

Landmarks are normalized 0–1 in frame coordinates. The `visibility` property (0–1) indicates confidence that the landmark is visible and not occluded.
