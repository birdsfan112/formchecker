"""Normalize a raw trajectory dump to a 60-frame canonical animation loop.

Usage:
    python normalize_loop.py --exercise squat
    python normalize_loop.py --exercise squat --start-frame 80 --end-frame 140
    python normalize_loop.py --exercise squat --raw pipeline/raw/squat.npz --raw pipeline/raw/squat_alt.npz

Reads pipeline/raw/<exercise>.npz (or explicit --raw paths). Auto-detects one
rep cycle from the pelvis-y autocorrelation, or uses explicit --start-frame/--end-frame.
Resamples to 60 frames, applies a 3-frame moving-average smooth, blends the
loop seam if frames 0 and 59 disagree, then strips the visibility channel out
of the landmark array (saved separately).

Output: assets/animations/<exercise>.json containing the unified exercise signature
with schema_version, canonical_reps[], provenance, phases, angle_timeseries, and
rom_advisory. See docs/specs/exercise-signature-schema.md for full schema.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml

from emit_rom import angle_deg, load_angle_config, compute_rom_advisory
from lib.provenance import (
    model_sha256,
    utc_now_iso,
    landmarks_content_hash,
    MEDIAPIPE_APP_VERSION,
    MEDIAPIPE_PIPELINE_API,
    MEDIAPIPE_PIPELINE_MODEL,
)

PIPELINE_DIR = Path(__file__).resolve().parent
RAW_DIR = PIPELINE_DIR / "raw"
PROJECT_ROOT = PIPELINE_DIR.parent
OUT_DIR = PROJECT_ROOT / "assets" / "animations"
ROM_DIR = PROJECT_ROOT / "assets" / "rom"
SOURCES_YAML = PIPELINE_DIR / "sources.yaml"
ANGLES_YAML = PIPELINE_DIR / "exercise_angles.yaml"
POSE_MODEL_PATH = PIPELINE_DIR / ".cache" / "pose_landmarker_heavy.task"

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
L_ELBOW = 13
R_ELBOW = 14
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
    # lateral_pairs: shoulders + wrists hold near-constant horizontal span during a pullup;
    # enforcing the median width kills MediaPipe's tendency to collapse them when arms occlude
    # the head overhead (visually reads as the body twisting away from camera).
    "hanging_front": {
        "anchor_ids": [L_WRIST, R_WRIST],
        "far_ids": [L_HIP, R_HIP],
        "anchor_y": 0.08,
        "far_y": 0.49,
        "center_ids": [L_SHOULDER, R_SHOULDER],
        "lateral_pairs": [
            (L_SHOULDER, R_SHOULDER),
            (L_ELBOW, R_ELBOW),
            (L_WRIST, R_WRIST),
            (L_HIP, R_HIP),
        ],
        # Bilaterally symmetric — both arms rise/fall together, both hips too.
        # Force each pair to share its per-frame mean y so MediaPipe's small
        # per-side y noise doesn't read as "one arm leading the other".
        "y_sync_pairs": [
            (L_SHOULDER, R_SHOULDER),
            (L_ELBOW, R_ELBOW),
            (L_WRIST, R_WRIST),
            (L_HIP, R_HIP),
        ],
        # Hands gripping a bar — fingers don't move relative to wrist. Lock each
        # finger to the median (dx, dy) offset from its wrist across all frames.
        "hand_groups": [
            {"wrist": L_WRIST, "fingers": [17, 19, 21]},
            {"wrist": R_WRIST, "fingers": [18, 20, 22]},
        ],
        # Final smoothing pass after locks — kills residual torso/shoulder y
        # jitter that survives initial smoothing. Wrists/fingers are already
        # constant by construction so smoothing them is a no-op.
        "post_smooth_window": 7,
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


def correct_lr_swaps(landmarks: np.ndarray) -> tuple[np.ndarray, int, dict]:
    """Fix frames where MediaPipe swapped L/R side labels.

    Two-stage correction:
      1. Whole-frame: if shoulder x-sign disagrees with the global majority,
         swap every mirror-pair together (catches full-body label flips).
      2. Per-pair: for each pair independently, compute its own majority sign,
         then for each frame swap just that pair's landmarks if the sign
         disagrees AND the magnitude is above PAIR_SWAP_MIN (so frames where
         L and R coincide near a centerline aren't flipped on noise).

    Returns (corrected, whole_frame_swaps, per_pair_swap_counts).
    """
    PAIR_SWAP_MIN = 0.03

    out = landmarks.copy()

    # All-NaN input: nothing to detect. Return no-op to avoid nanmedian warnings.
    if np.isnan(out).all():
        return out, 0, {}

    # Stage 1: whole-frame swap based on shoulder sign.
    diffs = out[:, L_SHOULDER, 0] - out[:, R_SHOULDER, 0]
    majority = np.sign(np.nanmedian(diffs))
    whole_swaps = 0
    if majority != 0 and not np.isnan(majority):
        for i in range(out.shape[0]):
            d = diffs[i]
            if np.isnan(d) or np.sign(d) == majority:
                continue
            for a, b in LR_PAIRS:
                tmp = out[i, a].copy()
                out[i, a] = out[i, b]
                out[i, b] = tmp
            whole_swaps += 1

    # Stage 2: per-pair correction (after whole-frame fix).
    pair_swaps: dict = {}
    for a, b in LR_PAIRS:
        pair_diff = out[:, a, 0] - out[:, b, 0]
        pair_majority = np.sign(np.nanmedian(pair_diff))
        if pair_majority == 0 or np.isnan(pair_majority):
            continue
        count = 0
        for i in range(out.shape[0]):
            d = pair_diff[i]
            if np.isnan(d) or np.sign(d) == pair_majority or abs(d) < PAIR_SWAP_MIN:
                continue
            tmp = out[i, a].copy()
            out[i, a] = out[i, b]
            out[i, b] = tmp
            count += 1
        if count:
            pair_swaps[(a, b)] = count

    return out, whole_swaps, pair_swaps


def pelvis_y_signal(landmarks: np.ndarray) -> np.ndarray:
    """Return per-frame mean pelvis y, with NaN gaps linearly interpolated."""
    if np.isnan(landmarks[:, [L_HIP, R_HIP], 1]).all():
        sys.exit("pelvis landmarks missing on too many frames")
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
    """Per-frame rigid translation so the anchor-landmark midpoint (x, y) stays pinned.

    Target is (TARGET_CENTER_X, preset["anchor_y"]) — i.e. ankles-mid stays centered at
    floor level for standing, wrists-mid stays centered at bar level for hanging, etc.
    Kills contact-point drift from camera pan, body sway, or perspective change. Applies
    the same (dx, dy) translation to all landmarks in the frame, so relative body
    geometry is preserved.
    """
    out = seq.copy()
    anchor_x = _mid_x(out, preset["anchor_ids"])
    anchor_y = _mid_y(out, preset["anchor_ids"])
    for i in range(out.shape[0]):
        dx = TARGET_CENTER_X - anchor_x[i]
        dy = preset["anchor_y"] - anchor_y[i]
        out[i, :, 0] += dx
        out[i, :, 1] += dy
    return out


def enforce_lateral_width(seq: np.ndarray, pair_groups: list[tuple[int, int]]) -> tuple[np.ndarray, dict]:
    """Lock each (L, R) pair's horizontal spread to the median across frames.

    Per-frame midpoint is preserved (so anchor_per_frame's pinning still holds).
    Only x is touched; y values are left alone. Stats returned for logging.
    """
    out = seq.copy()
    stats = {}
    for l_id, r_id in pair_groups:
        signed_half = (out[:, l_id, 0] - out[:, r_id, 0]) / 2.0
        median_half = float(np.nanmedian(signed_half))
        if np.isnan(median_half):
            continue
        mid_x = (out[:, l_id, 0] + out[:, r_id, 0]) / 2.0
        out[:, l_id, 0] = mid_x + median_half
        out[:, r_id, 0] = mid_x - median_half
        span_before = float((np.nanmax(signed_half) - np.nanmin(signed_half)) * 2)
        stats[(l_id, r_id)] = {
            "median_full_span": abs(median_half) * 2,
            "raw_span_range": span_before,
        }
    return out, stats


def enforce_y_sync(seq: np.ndarray, pair_groups: list[tuple[int, int]]) -> np.ndarray:
    """Force each (L, R) pair to share the same y value (per-frame mean).

    For bilaterally symmetric movements (pullup, deadhang), MediaPipe's small
    per-frame y noise on L vs R reads visually as one arm leading the other.
    Averaging eliminates the asynchrony.
    """
    out = seq.copy()
    for l_id, r_id in pair_groups:
        mean_y = (out[:, l_id, 1] + out[:, r_id, 1]) / 2.0
        out[:, l_id, 1] = mean_y
        out[:, r_id, 1] = mean_y
    return out


def lock_fingers_to_wrist(seq: np.ndarray, hand_groups: list[dict]) -> np.ndarray:
    """Replace each finger landmark with its wrist position + median offset.

    Anatomically correct for grip-on-bar exercises where the hand is fixed.
    """
    out = seq.copy()
    for group in hand_groups:
        w = group["wrist"]
        for f in group["fingers"]:
            dx = out[:, f, 0] - out[:, w, 0]
            dy = out[:, f, 1] - out[:, w, 1]
            med_dx = float(np.nanmedian(dx))
            med_dy = float(np.nanmedian(dy))
            if np.isnan(med_dx) or np.isnan(med_dy):
                continue
            out[:, f, 0] = out[:, w, 0] + med_dx
            out[:, f, 1] = out[:, w, 1] + med_dy
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


# --------------------------------------------------------------------------
# Signature schema helpers (v1)
# --------------------------------------------------------------------------

VISIBILITY_THRESHOLD = 0.6  # Same as emit_rom.py


def load_sources_entry(exercise: str) -> dict:
    """Load sources.yaml entry, normalizing url/urls to a consistent format.

    Accepts both legacy `url: <string>` and new `urls: [<string>]` formats.
    Returns entry with `url` set to first URL and `urls` as list.
    """
    with open(SOURCES_YAML, "r", encoding="utf-8") as f:
        sources = yaml.safe_load(f)
    if exercise not in sources:
        return {"urls": [], "url": "", "provider": ""}
    entry = sources[exercise].copy()

    # Normalize url/urls: support both legacy scalar and new list format
    urls = entry.get("urls") or []
    if not urls and entry.get("url"):
        urls = [entry["url"]]
    entry["urls"] = urls
    entry["url"] = urls[0] if urls else ""

    return entry


def compute_angle_timeseries(
    landmarks60: np.ndarray,
    visibility60: np.ndarray,
    angle_defs: list[dict],
) -> dict[str, list[float | None]]:
    """Compute per-frame angle values for each configured joint.

    Returns dict like {"knee": [173.5, 172.9, ...], "hip": [175.5, ...]}.
    Values are rounded to 1 decimal place. None (serializes as JSON null) if
    visibility too low or angle computation fails.
    """
    n_frames = landmarks60.shape[0]
    out: dict[str, list[float | None]] = {}

    for spec in angle_defs:
        name = spec["name"]
        a_idx, b_idx, c_idx = spec["triplet"]
        series: list[float | None] = []

        for i in range(n_frames):
            if (visibility60[i, a_idx] < VISIBILITY_THRESHOLD
                    or visibility60[i, b_idx] < VISIBILITY_THRESHOLD
                    or visibility60[i, c_idx] < VISIBILITY_THRESHOLD):
                series.append(None)
                continue
            a = landmarks60[i, a_idx]
            b = landmarks60[i, b_idx]
            c = landmarks60[i, c_idx]
            ang = angle_deg(a, b, c)
            # Round via string-format for consistent 1dp precision
            # Use None for NaN (JSON doesn't support NaN, but supports null)
            if np.isnan(ang):
                series.append(None)
            else:
                series.append(float(f"{ang:.1f}"))

        out[name] = series

    return out


def auto_detect_phases(
    angle_timeseries: dict[str, list[float]],
    angle_defs: list[dict],
    phases_override: list[dict] | None = None,
) -> list[dict]:
    """Detect phase markers from the primary angle's timeseries.

    For rep-based exercises: returns [{"name": "top", "frame_idx": N}, {"name": "bottom", "frame_idx": M}]
    For timed/static exercises (max-min < 10 deg): returns [{"name": "start", ...}, {"name": "middle", ...}, {"name": "end", ...}]

    phases_override: if provided, use verbatim (allows manual override in sources.yaml).
    """
    if phases_override:
        return phases_override

    # No angles configured -> timed exercise pattern
    if not angle_defs or not angle_timeseries:
        return [
            {"name": "start", "frame_idx": 0},
            {"name": "middle", "frame_idx": 30},
            {"name": "end", "frame_idx": 59},
        ]

    # Use the primary (first) angle
    primary_name = angle_defs[0]["name"]
    series = angle_timeseries.get(primary_name, [])

    if not series:
        return [
            {"name": "start", "frame_idx": 0},
            {"name": "middle", "frame_idx": 30},
            {"name": "end", "frame_idx": 59},
        ]

    # Convert to numpy, handling NaN
    arr = np.array(series, dtype=np.float64)
    valid_mask = ~np.isnan(arr)
    if valid_mask.sum() == 0:
        return [
            {"name": "start", "frame_idx": 0},
            {"name": "middle", "frame_idx": 30},
            {"name": "end", "frame_idx": 59},
        ]

    val_min = float(np.nanmin(arr))
    val_max = float(np.nanmax(arr))

    # Timed/static exercise: angle range < 10 degrees
    if val_max - val_min < 10.0:
        return [
            {"name": "start", "frame_idx": 0},
            {"name": "middle", "frame_idx": 30},
            {"name": "end", "frame_idx": 59},
        ]

    # Rep-based exercise: find top (most-extended) and bottom (most-flexed)
    top_frame = int(np.nanargmax(arr))
    bottom_frame = int(np.nanargmin(arr))

    return [
        {"name": "top", "frame_idx": top_frame},
        {"name": "bottom", "frame_idx": bottom_frame},
    ]


def build_canonical_rep(
    rep_id: int,
    landmarks60: np.ndarray,
    visibility60: np.ndarray,
    angle_defs: list[dict],
    period_ms: int,
    phases_override: list[dict] | None = None,
) -> dict:
    """Build a single canonical_reps[i] entry from processed trajectory data.

    landmarks60: shape (60, 33, 2) after all normalization steps
    visibility60: shape (60, 33)
    """
    # Round landmarks to 3dp, visibility to 2dp via string-format
    xy_list = [
        [[float(f"{x:.3f}"), float(f"{y:.3f}")] for x, y in frame]
        for frame in landmarks60
    ]
    vis_list = [
        [float(f"{v:.2f}") for v in frame]
        for frame in visibility60
    ]

    # Build trajectory dict for compute_rom_advisory (expects old flat format)
    traj_flat = {
        "landmarks": xy_list,
        "visibility": vis_list,
        "frame_count": FRAME_COUNT,
    }

    angle_ts = compute_angle_timeseries(landmarks60, visibility60, angle_defs)
    phases = auto_detect_phases(angle_ts, angle_defs, phases_override)
    rom = compute_rom_advisory(traj_flat, angle_defs)

    return {
        "rep_id": rep_id,
        "period_ms": period_ms,
        "frame_count": FRAME_COUNT,
        "landmarks": xy_list,
        "visibility": vis_list,
        "angle_timeseries": angle_ts,
        "phases": phases,
        "rom_advisory": rom,
    }


def build_provenance(
    exercise: str,
    sources_entry: dict,
    preset: str,
) -> dict:
    """Build the provenance block for a signature."""
    model_hash = model_sha256(POSE_MODEL_PATH)

    return {
        "mediapipe_pipeline_api": MEDIAPIPE_PIPELINE_API,
        "mediapipe_pipeline_model": MEDIAPIPE_PIPELINE_MODEL,
        "mediapipe_pipeline_model_sha256": model_hash,
        "mediapipe_app_api": "legacy",
        "mediapipe_app_version": MEDIAPIPE_APP_VERSION,
        "source_url": sources_entry.get("url", ""),
        "source_provider": sources_entry.get("provider", ""),
        "extracted_at": utc_now_iso(),
        "pipeline_preset": preset,
    }


def load_existing_signature(exercise: str) -> dict | None:
    """Load existing signature if present, for content-hash comparison."""
    path = OUT_DIR / f"{exercise}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def should_preserve_timestamp(new_landmarks: list, existing_sig: dict | None) -> str | None:
    """Return existing extracted_at if content hash matches, else None.

    Per spec section 15.6: content-hash gated timestamps to avoid git noise.
    """
    if not existing_sig:
        return None

    existing_reps = existing_sig.get("canonical_reps", [])
    if not existing_reps:
        return None

    existing_lm = existing_reps[0].get("landmarks")
    if not existing_lm:
        return None

    existing_prov = existing_sig.get("provenance", {})
    existing_ts = existing_prov.get("extracted_at")
    if not existing_ts:
        return None

    # Compare content hashes
    new_hash = landmarks_content_hash(new_landmarks)
    old_hash = landmarks_content_hash(existing_lm)

    if new_hash == old_hash:
        return existing_ts
    return None


def process_one_raw(
    raw_path: Path,
    args: argparse.Namespace,
    rep_id: int,
    angle_defs: list[dict],
    sources_entry: dict,
) -> tuple[dict, np.ndarray, np.ndarray]:
    """Process a single .npz raw file into a canonical_rep dict.

    Returns (canonical_rep_dict, landmarks60_xy, visibility60).
    """
    if not raw_path.exists():
        sys.exit(
            f"raw dump missing: {raw_path}\n"
            f"run: python extract_trajectory.py --exercise {args.exercise}"
        )
    data = np.load(raw_path)
    landmarks = data["landmarks"]
    fps = float(data["fps"])

    n_frames = landmarks.shape[0]
    print(f"[normalize] {raw_path.name}: {n_frames} frames @ {fps:.1f} fps")

    landmarks, whole_swaps, pair_swaps = correct_lr_swaps(landmarks)
    if whole_swaps:
        print(f"[lr-swap] whole-frame: corrected {whole_swaps}/{n_frames} frames")
    if pair_swaps:
        for (a, b), c in pair_swaps.items():
            print(f"[lr-swap] per-pair ({a},{b}): corrected {c}/{n_frames} frames")

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
        if preset.get("lateral_pairs"):
            smoothed, lat_stats = enforce_lateral_width(smoothed, preset["lateral_pairs"])
            for (l, r), s in lat_stats.items():
                print(f"[width-lock] pair ({l},{r}): locked to span={s['median_full_span']:.3f}")
        if preset.get("y_sync_pairs"):
            smoothed = enforce_y_sync(smoothed, preset["y_sync_pairs"])
            print(f"[y-sync] {len(preset['y_sync_pairs'])} pair(s) y-averaged")
        if preset.get("hand_groups"):
            smoothed = lock_fingers_to_wrist(smoothed, preset["hand_groups"])
            print(f"[hand-lock] fingers bound to wrist median offsets")
        post_window = preset.get("post_smooth_window", 0)
        if post_window > 1:
            smoothed = moving_average(smoothed, window=post_window)
            print(f"[post-smooth] window={post_window} frames")

    final, seam_diff, blended = blend_seam(smoothed, SEAM_FRAMES, SEAM_THRESHOLD)
    print(f"[seam] max xy diff frame0 vs frame-1 = {seam_diff:.4f}"
          + (f"  (blended last {SEAM_FRAMES})" if blended else "  (no blend needed)"))

    # Extract xy and visibility components
    landmarks60_xy = final[:, :, :2]  # (60, 33, 2)
    visibility60 = final[:, :, 2]     # (60, 33)

    # Get phases_override from sources.yaml if present
    phases_override = sources_entry.get("phases_override")

    canonical_rep = build_canonical_rep(
        rep_id=rep_id,
        landmarks60=landmarks60_xy,
        visibility60=visibility60,
        angle_defs=angle_defs,
        period_ms=args.period_ms,
        phases_override=phases_override,
    )

    return canonical_rep, landmarks60_xy, visibility60


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercise", required=True)
    ap.add_argument("--raw", action="append", dest="raw_paths",
                    help="path to .npz raw file (can be repeated for multi-canonical)")
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

    # Default to single raw file if --raw not specified
    if not args.raw_paths:
        args.raw_paths = [str(RAW_DIR / f"{args.exercise}.npz")]

    # Load angle config and sources entry
    try:
        angle_defs = load_angle_config(args.exercise)
    except SystemExit:
        # Exercise not in angle config - use empty list (e.g., foamroller)
        angle_defs = []
        print(f"[angles] no angles configured for '{args.exercise}'")

    sources_entry = load_sources_entry(args.exercise)

    # Process each raw file into a canonical_rep
    canonical_reps: list[dict] = []
    for rep_id, raw_path_str in enumerate(args.raw_paths):
        raw_path = Path(raw_path_str)
        rep, lm60, vis60 = process_one_raw(
            raw_path, args, rep_id, angle_defs, sources_entry
        )
        canonical_reps.append(rep)

    # Check if we should preserve existing timestamp (content-hash gating)
    existing_sig = load_existing_signature(args.exercise)
    preserved_ts = should_preserve_timestamp(
        canonical_reps[0]["landmarks"],
        existing_sig,
    )

    # Build provenance
    provenance = build_provenance(args.exercise, sources_entry, args.preset)
    if preserved_ts:
        provenance["extracted_at"] = preserved_ts
        print(f"[provenance] content unchanged — preserving existing extracted_at: {preserved_ts}")

    # Build the full signature payload
    payload = {
        "schema_version": 1,
        "exercise": args.exercise,
        "bilateral": True,  # All 22 current exercises are bilateral
        "mirror_source": args.mirror_x,
        "provenance": provenance,
        "canonical_reps": canonical_reps,
        "joint_weights": {},  # Empty in v1; reserved for future scoring
    }

    # Write signature JSON
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.exercise}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    size_kb = out_path.stat().st_size / 1024
    print(f"[saved] {out_path}  ({size_kb:.1f} KB)")

    # Also emit legacy ROM file for back-compat during transition
    ROM_DIR.mkdir(parents=True, exist_ok=True)
    rom_path = ROM_DIR / f"{args.exercise}.json"
    rom_payload = {
        "exercise": args.exercise,
        "angles": canonical_reps[0].get("rom_advisory", {}),
    }
    with open(rom_path, "w", encoding="utf-8") as f:
        json.dump(rom_payload, f, indent=2)
    print(f"[rom-compat] {rom_path}")


if __name__ == "__main__":
    main()
