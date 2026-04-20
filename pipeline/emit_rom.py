"""DEPRECATED — ROM lives in assets/animations/<ex>.json under canonical_reps[i].rom_advisory.

This script is kept only to preserve assets/rom/*.json during transition.
See docs/specs/exercise-signature-schema.md Commit D for sunset plan.

The rom_advisory data in signatures is ADVISORY ONLY. Per-user ROM from
live warmup calibration (analyzeWarmup/applyAllCalibrationResults in index.html)
always takes precedence over per-clip ROM at scoring time.

Usage:
    python emit_rom.py --exercise squat

Reads assets/animations/<exercise>.json + pipeline/exercise_angles.yaml.
For each configured joint triplet (A, B, C), computes the angle at B per
frame, skipping frames where any of the three landmarks has visibility < 0.6.
Emits min/max/samples to assets/rom/<exercise>.json.

Expected sanity ranges (per spec):
    squat knee: min/max both in [70°, 180°]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml

PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_DIR.parent
ANIM_DIR = PROJECT_ROOT / "assets" / "animations"
ROM_DIR = PROJECT_ROOT / "assets" / "rom"
ANGLES_YAML = PIPELINE_DIR / "exercise_angles.yaml"

VISIBILITY_THRESHOLD = 0.6


def load_trajectory(exercise: str) -> dict:
    path = ANIM_DIR / f"{exercise}.json"
    if not path.exists():
        sys.exit(
            f"trajectory missing: {path}\n"
            f"run: python normalize_loop.py --exercise {exercise}"
        )
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    return _unwrap_trajectory(payload)


def _unwrap_trajectory(payload: dict) -> dict:
    """Return a flat {landmarks, visibility, frame_count} dict regardless of schema.

    V1 signature (current): landmarks/visibility live inside canonical_reps[0].
    Legacy flat schema: landmarks/visibility at top level.

    This script is deprecated (see module docstring) — normalize_loop.py is the
    canonical emit path. But as long as emit_rom.py is runnable standalone, it
    must not silently break on regenerated v1 signatures.
    """
    if "canonical_reps" in payload:
        reps = payload["canonical_reps"]
        if not isinstance(reps, list) or not reps:
            raise RuntimeError(
                "signature has canonical_reps but it is empty or malformed; "
                "re-emit via `python normalize_loop.py --exercise <ex>`"
            )
        rep = reps[0]
        # Include top-level exercise for output labelling, defaulting to what's in the rep.
        merged = dict(rep)
        if "exercise" in payload:
            merged.setdefault("exercise", payload["exercise"])
        return merged
    if "landmarks" in payload and "visibility" in payload:
        # Legacy flat schema — pass through unchanged.
        return payload
    raise RuntimeError(
        "signature has neither canonical_reps nor flat landmarks/visibility; "
        "the canonical emit path is `python normalize_loop.py --exercise <ex>`"
    )


def load_angle_config(exercise: str) -> list[dict]:
    with open(ANGLES_YAML, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if exercise not in cfg:
        sys.exit(f"exercise '{exercise}' not in exercise_angles.yaml")
    return cfg[exercise] or []


def angle_deg(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle at vertex b formed by vectors b->a and b->c, in degrees."""
    ba = a - b
    bc = c - b
    nba = np.linalg.norm(ba)
    nbc = np.linalg.norm(bc)
    if nba < 1e-8 or nbc < 1e-8:
        return float("nan")
    cos_t = np.clip(np.dot(ba, bc) / (nba * nbc), -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_t)))


def compute_rom_advisory(trajectory: dict, angle_defs: list[dict]) -> dict:
    """Compute ROM from trajectory landmarks. Returns dict keyed by angle name.

    ADVISORY ONLY: This is what the reference clip's performer did, not what
    the current user should do. Live warmup calibration beats this at scoring time.
    """
    landmarks = np.asarray(trajectory["landmarks"], dtype=np.float32)   # (60, 33, 2)
    visibility = np.asarray(trajectory["visibility"], dtype=np.float32)  # (60, 33)
    n_frames = landmarks.shape[0]

    out: dict[str, dict] = {}
    for spec in angle_defs:
        name = spec["name"]
        a_idx, b_idx, c_idx = spec["triplet"]
        samples: list[float] = []
        for i in range(n_frames):
            if (visibility[i, a_idx] < VISIBILITY_THRESHOLD
                    or visibility[i, b_idx] < VISIBILITY_THRESHOLD
                    or visibility[i, c_idx] < VISIBILITY_THRESHOLD):
                continue
            a = landmarks[i, a_idx]
            b = landmarks[i, b_idx]
            c = landmarks[i, c_idx]
            ang = angle_deg(a, b, c)
            if not np.isnan(ang):
                samples.append(ang)
        if samples:
            out[name] = {
                "min": round(min(samples), 1),
                "max": round(max(samples), 1),
                "samples": len(samples),
            }
        else:
            out[name] = {"min": None, "max": None, "samples": 0}
    return out


# Back-compat alias: old code may still import compute_rom
compute_rom = compute_rom_advisory


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercise", required=True)
    args = ap.parse_args()

    trajectory = load_trajectory(args.exercise)
    angle_defs = load_angle_config(args.exercise)

    if not angle_defs:
        print(f"[rom] no angles configured for '{args.exercise}' — emitting empty")
        rom = {}
    else:
        rom = compute_rom_advisory(trajectory, angle_defs)

    payload = {"exercise": args.exercise, "angles": rom}
    ROM_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ROM_DIR / f"{args.exercise}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"[saved] {out_path}")
    for name, stats in rom.items():
        if stats["samples"] == 0:
            print(f"  {name}: no valid samples (all frames below vis threshold)")
        else:
            print(f"  {name}: min={stats['min']}  max={stats['max']}  samples={stats['samples']}/{trajectory['frame_count']}")


if __name__ == "__main__":
    main()
