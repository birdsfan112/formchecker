"""Normalize a raw trajectory dump to a 60-frame canonical animation loop.

Usage:
    python normalize_loop.py --exercise squat
    python normalize_loop.py --exercise squat --start-frame 80 --end-frame 140

Reads pipeline/raw/<exercise>.npz. Auto-detects one rep cycle from the
pelvis-y autocorrelation, or uses explicit --start-frame/--end-frame.
Resamples to 60 frames, applies a 3-frame moving-average smooth, blends the
loop seam if frames 0 and 59 disagree, then strips the visibility channel out
of the landmark array (saved separately).

Output: assets/animations/<exercise>.json per the canonical schema in
docs/specs/animation-pipeline-implementation.md §"Canonical JSON schema".
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

PIPELINE_DIR = Path(__file__).resolve().parent
RAW_DIR = PIPELINE_DIR / "raw"
PROJECT_ROOT = PIPELINE_DIR.parent
OUT_DIR = PROJECT_ROOT / "assets" / "animations"

FRAME_COUNT = 60
PERIOD_MS_DEFAULT = 3000
SMOOTH_WINDOW = 3
SEAM_FRAMES = 5
SEAM_THRESHOLD = 0.02  # normalized-coord units (~2% of canvas span)

# Target canvas anchors per outline style (match draw* functions in index.html).
TARGET_CENTER_X = 0.50

NOSE = 0
L_SHOULDER = 11
R_SHOULDER = 12
L_WRIST = 15
R_WRIST = 16
L_HIP = 23
R_HIP = 24
L_ANKLE = 27
R_ANKLE = 28

# Mirror-pair (L, R) landmark indices in MediaPipe's 33-landmark scheme. Used by
# correct_lr_swaps() — when MediaPipe flips a frame's side labels (common for
# front-view poses), we swap every pair in that frame together.
LR_PAIRS = [
    (1, 4), (2, 5), (3, 6),         # eyes (inner/center/outer)
    (7, 8),                          # ears
    (9, 10),                         # mouth corners
    (11, 12), (13, 14), (15, 16),   # shoulders, elbows, wrists
    (17, 18), (19, 20), (21, 22),   # pinky, index, thumb
    (23, 24), (25, 26), (27, 28),   # hips, knees, ankles
    (29, 30), (31, 32),              # heels, foot_index
]

# Each preset: which landmark(s) are "anchor" (fixed contact surface, should not drift across frames),
# which are "far" (opposite end of body), the target y for each after canonicalization, and the
# landmark(s) whose x midpoint should centre at TARGET_CENTER_X on the reference frame.
PRESETS = {
    # drawStandingSide / drawHorizontalSide (squat, lunge, pistol, dips, mobility)
    "standing": {
        "anchor_ids": [L_ANKLE, R_ANKLE],
        "far_ids": [NOSE],
        "anchor_y": 0.81,
        "far_y": 0.09,
        "center_ids": [L_HIP, R_HIP],
    },
    # drawHangingFront (pullup, deadhang, archhang, scapularpull).
    # "far" is hips, not ankles — many bar/hanging clips are framed tight and cut off the legs,
    # so ankles/knees land below y=1.0 (off-canvas, hallucinated). Hips match outline hip at y=0.49.
    "hanging_front": {
        "anchor_ids": [L_WRIST, R_WRIST],
        "far_ids": [L_HIP, R_HIP],
        "anchor_y": 0.08,
        "far_y": 0.49,
        "center_ids": [L_SHOULDER, R_SHOULDER],
    },
}


def load_raw(exercise: str) -> tuple[np.ndarray, float]:
    path = RAW_DIR / f"{exercise}.npz"
    if not path.exists():
        sys.exit(
            f"raw dump missing: {path}\n"
            f"run: python extract_trajectory.py --exercise {exercise}"
        )
    data = np.load(path)
    return data["landmarks"], float(data["fps"])


def correct_lr_swaps(landmarks: np.ndarray) -> tuple[np.ndarray, int]:
    """Fix frames where MediaPipe swapped L/R side labels.

    Determines the "correct" orientation from the majority sign of shoulder-x
    delta (L_SHOULDER.x - R_SHOULDER.x) across all valid frames. For any frame
    whose sign disagrees, swaps every mirror-pair landmark (shoulders/elbows/
    wrists/hips/knees/ankles/etc.) together. Returns (corrected_landmarks, swap_count).
    """
    diffs = landmarks[:, L_SHOULDER, 0] - landmarks[:, R_SHOULDER, 0]
    majority = np.sign(np.nanmedian(diffs))
    if majority == 0 or np.isnan(majority):
        return landmarks, 0
    out = landmarks.copy()
    swaps = 0
    for i in range(out.shape[0]):
        d = diffs[i]
        if np.isnan(d) or np.sign(d) == majority:
            continue
        for a, b in LR_PAIRS:
            tmp = out[i, a].copy()
            out[i, a] = out[i, b]
            out[i, b] = tmp
        swaps += 1
    return out, swaps


def pelvis_y_signal(landmarks: np.ndarray) -> np.ndarray:
    """Return per-frame mean pelvis y, with NaN gaps linearly interpolated."""
    y = np.nanmean(landmarks[:, [L_HIP, R_HIP], 1], axis=1)
    mask = ~np.isnan(y)
    if mask.sum() < 10:
        sys.exit("pelvis landmarks missing on too many frames")
    # fill NaN by linear interpolation over valid frames
    idx = np.arange(len(y))
    y_filled = np.interp(idx, idx[mask], y[mask])
    return y_filled


def auto_detect_cycle(landmarks: np.ndarray) -> tuple[int, int]:
    """Find one rep from pelvis-y autocorrelation.

    Returns (start_frame, end_frame_exclusive). Start is placed at the
    standing-most frame (minimum pelvis y) within the first detected period.
    """
    y = pelvis_y_signal(landmarks)
    n = len(y)
    signal = y - y.mean()

    ac_full = np.correlate(signal, signal, mode="full")
    ac = ac_full[n - 1:]  # lags 0 .. n-1
    # normalize by number of overlapping samples (drops long-lag bias)
    overlap = np.arange(n, 0, -1)
    ac = ac / np.maximum(overlap, 1)

    min_lag = max(8, int(0.3 * 30))   # >= ~0.3s at 30fps
    max_lag = min(n - 1, int(4.0 * 30))  # <= ~4s at 30fps
    if max_lag <= min_lag:
        sys.exit("clip too short to detect a cycle")
    best_lag = min_lag + int(np.argmax(ac[min_lag:max_lag]))

    window = min(2 * best_lag, n)
    start = int(np.argmin(signal[:window]))  # most-standing frame

    end = start + best_lag
    if end > n:
        start = max(0, n - best_lag)
        end = n
    return start, end


def resample_linear(seq: np.ndarray, target: int) -> np.ndarray:
    """Linearly resample (T, 33, 3) to (target, 33, 3) along axis 0."""
    src_t = np.linspace(0.0, 1.0, seq.shape[0])
    dst_t = np.linspace(0.0, 1.0, target)
    out = np.empty((target, seq.shape[1], seq.shape[2]), dtype=np.float32)
    for j in range(seq.shape[1]):
        for k in range(seq.shape[2]):
            vals = seq[:, j, k]
            mask = ~np.isnan(vals)
            if mask.sum() == 0:
                out[:, j, k] = 0.0
                continue
            out[:, j, k] = np.interp(dst_t, src_t[mask], vals[mask]).astype(np.float32)
    return out


def moving_average(seq: np.ndarray, window: int = 3) -> np.ndarray:
    """Centered moving average on axis 0 with edge replication."""
    if window < 2:
        return seq
    pad = window // 2
    padded = np.concatenate([
        np.repeat(seq[:1], pad, axis=0),
        seq,
        np.repeat(seq[-1:], pad, axis=0),
    ], axis=0)
    out = np.empty_like(seq)
    for i in range(seq.shape[0]):
        out[i] = padded[i:i + window].mean(axis=0)
    return out


def mirror_x(seq: np.ndarray) -> np.ndarray:
    """Flip landmarks horizontally around x=0.5."""
    out = seq.copy()
    out[:, :, 0] = 1.0 - out[:, :, 0]
    return out


def _mid_y(seq: np.ndarray, ids: list[int]) -> np.ndarray:
    return seq[:, ids, 1].mean(axis=1)


def _mid_x(seq: np.ndarray, ids: list[int]) -> np.ndarray:
    return seq[:, ids, 0].mean(axis=1)


def canonicalize_to_outline(seq: np.ndarray, preset: dict) -> np.ndarray:
    """Scale + shift landmarks so the skeleton matches the static silhouette's size and position.

    Uses the frame with max |anchor_y - far_y| span as the reference (extended body position).
    Scales uniformly so ref anchor_y → preset["anchor_y"], ref far_y → preset["far_y"].
    Horizontally centers the reference frame's center-landmark x at TARGET_CENTER_X.
    """
    anchor_y_series = _mid_y(seq, preset["anchor_ids"])
    far_y_series = _mid_y(seq, preset["far_ids"])
    span = np.abs(anchor_y_series - far_y_series)
    ref = int(np.argmax(span))
    ref_span = float(span[ref])
    if ref_span < 1e-6:
        return seq.copy()

    target_span = abs(preset["anchor_y"] - preset["far_y"])
    scale = target_span / ref_span

    ref_center_x = float(_mid_x(seq, preset["center_ids"])[ref])
    ref_anchor_y = float(anchor_y_series[ref])

    out = seq.copy().astype(np.float32)
    out[:, :, 0] = (out[:, :, 0] - ref_center_x) * scale + TARGET_CENTER_X
    out[:, :, 1] = (out[:, :, 1] - ref_anchor_y) * scale + preset["anchor_y"]
    return out


def anchor_per_frame(seq: np.ndarray, preset: dict) -> np.ndarray:
    """Shift each frame vertically so the anchor-landmark y stays at preset["anchor_y"].

    Kills contact-point drift (feet sliding, hands drifting off the bar) from camera motion
    or perspective change during the rep. Horizontal motion is preserved.
    """
    out = seq.copy()
    anchor_y = _mid_y(out, preset["anchor_ids"])
    for i in range(out.shape[0]):
        out[i, :, 1] += preset["anchor_y"] - anchor_y[i]
    return out


def blend_seam(seq: np.ndarray, seam_frames: int, threshold: float) -> tuple[np.ndarray, float, bool]:
    """If frame 0 and frame -1 disagree on xy, ramp last `seam_frames` toward frame 0."""
    diff = float(np.linalg.norm(seq[0, :, :2] - seq[-1, :, :2], axis=1).max())
    if diff <= threshold:
        return seq, diff, False
    out = seq.copy()
    n = seq.shape[0]
    for i in range(seam_frames):
        idx = n - seam_frames + i
        w = (i + 1) / seam_frames
        out[idx] = (1.0 - w) * seq[idx] + w * seq[0]
    return out, diff, True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercise", required=True)
    ap.add_argument("--start-frame", type=int, default=None)
    ap.add_argument("--end-frame", type=int, default=None, help="exclusive")
    ap.add_argument("--mirror-x", action="store_true",
                    help="horizontally flip landmarks (clip subject faces wrong direction)")
    ap.add_argument("--period-ms", type=int, default=PERIOD_MS_DEFAULT,
                    help=f"loop period in ms (default {PERIOD_MS_DEFAULT})")
    ap.add_argument("--preset", choices=sorted(PRESETS.keys()), default="standing",
                    help="outline-matching preset (default: standing)")
    ap.add_argument("--no-align", action="store_true",
                    help="skip outline canonicalization (keep raw MediaPipe coords)")
    args = ap.parse_args()

    landmarks, fps = load_raw(args.exercise)
    n_frames = landmarks.shape[0]
    print(f"[normalize] {args.exercise}.npz: {n_frames} frames @ {fps:.1f} fps")

    landmarks, swap_count = correct_lr_swaps(landmarks)
    if swap_count:
        print(f"[lr-swap] corrected {swap_count}/{n_frames} frames where MediaPipe flipped L/R labels")

    if args.start_frame is not None and args.end_frame is not None:
        start, end = args.start_frame, args.end_frame
        print(f"[trim] manual: [{start}:{end}]  ({end - start} frames)")
    else:
        start, end = auto_detect_cycle(landmarks)
        print(f"[trim] auto:   [{start}:{end}]  ({end - start} frames, ~{(end - start) / fps:.2f}s)")

    cycle = landmarks[start:end]
    if cycle.shape[0] < 10:
        sys.exit(f"cycle too short: {cycle.shape[0]} frames")

    resampled = resample_linear(cycle, FRAME_COUNT)
    smoothed = moving_average(resampled, window=SMOOTH_WINDOW)

    if args.mirror_x:
        smoothed = mirror_x(smoothed)
        print("[mirror] x -> 1 - x")
    if not args.no_align:
        preset = PRESETS[args.preset]
        smoothed = canonicalize_to_outline(smoothed, preset)
        smoothed = anchor_per_frame(smoothed, preset)
        print(f"[align] preset={args.preset}  anchor_y -> {preset['anchor_y']}  far_y -> {preset['far_y']}  center_x -> {TARGET_CENTER_X}")

    final, seam_diff, blended = blend_seam(smoothed, SEAM_FRAMES, SEAM_THRESHOLD)
    print(f"[seam] max xy diff frame0 vs frame-1 = {seam_diff:.4f}"
          + (f"  (blended last {SEAM_FRAMES})" if blended else "  (no blend needed)"))

    # Round via string-format so json.dump emits e.g. 0.383 not 0.382999986410141
    # (np.round on float32 leaves precision artifacts when promoted to float64).
    xy_list = [
        [[float(f"{x:.3f}"), float(f"{y:.3f}")] for x, y in frame]
        for frame in final[:, :, :2]
    ]
    vis_list = [
        [float(f"{v:.2f}") for v in frame]
        for frame in final[:, :, 2]
    ]

    payload = {
        "exercise": args.exercise,
        "period_ms": args.period_ms,
        "frame_count": FRAME_COUNT,
        "landmarks": xy_list,
        "visibility": vis_list,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.exercise}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    size_kb = out_path.stat().st_size / 1024
    print(f"[saved] {out_path}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
