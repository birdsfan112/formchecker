"""Tests for pipeline/emit_rom.py — joint-angle ROM extractor."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
import yaml

import emit_rom


# ---------- angle_deg -------------------------------------------------------

class TestAngleDeg:
    def test_right_angle(self):
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        c = np.array([0.0, 1.0], dtype=np.float32)
        assert emit_rom.angle_deg(a, b, c) == pytest.approx(90.0, abs=1e-4)

    def test_straight_line(self):
        # collinear, opposite directions → 180°
        a = np.array([-1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        c = np.array([1.0, 0.0], dtype=np.float32)
        assert emit_rom.angle_deg(a, b, c) == pytest.approx(180.0, abs=1e-4)

    def test_acute_60(self):
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        c = np.array([0.5, np.sqrt(3) / 2], dtype=np.float32)
        assert emit_rom.angle_deg(a, b, c) == pytest.approx(60.0, abs=1e-3)

    def test_same_point_returns_nan(self):
        b = np.array([0.5, 0.5], dtype=np.float32)
        result = emit_rom.angle_deg(b, b, b)
        assert np.isnan(result)

    def test_zero_length_vector(self):
        # a == b → |ba| = 0 → NaN
        p = np.array([0.2, 0.2], dtype=np.float32)
        c = np.array([0.5, 0.5], dtype=np.float32)
        assert np.isnan(emit_rom.angle_deg(p, p, c))

    def test_clamps_numeric_overshoot(self):
        """Floating-point math can push cos slightly past ±1; function must clip,
        not return NaN from arccos(>1)."""
        # Identical vectors → dot/|·|² = 1 exactly, but we've seen 1.0000001 in the wild
        a = np.array([0.3, 0.7], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        c = np.array([0.3, 0.7], dtype=np.float32)
        ang = emit_rom.angle_deg(a, b, c)
        assert ang == pytest.approx(0.0, abs=1e-3)
        assert not np.isnan(ang)


# ---------- compute_rom -----------------------------------------------------

def _mk_trajectory(n_frames: int, fixed_angle_deg: float, visibility: float = 1.0) -> dict:
    """Synthetic trajectory where the knee angle (23-25-27) is exactly `fixed_angle_deg`
    on every frame. Useful for verifying min/max math."""
    xy = np.zeros((n_frames, 33, 2), dtype=np.float32)
    vis = np.full((n_frames, 33), visibility, dtype=np.float32)
    # Hip at origin, knee at (1, 0), ankle positioned to form desired angle
    theta = np.radians(fixed_angle_deg)
    for i in range(n_frames):
        xy[i, 23] = [0.3, 0.5]   # hip
        xy[i, 25] = [0.4, 0.6]   # knee
        # ankle = knee + direction making the target angle vs (hip - knee)
        ba = np.array([0.3, 0.5]) - np.array([0.4, 0.6])  # hip - knee
        ba_unit = ba / np.linalg.norm(ba)
        # rotate ba_unit by `theta` to get bc direction
        rot = np.array([[np.cos(theta), -np.sin(theta)],
                        [np.sin(theta),  np.cos(theta)]])
        bc_unit = rot @ ba_unit
        xy[i, 27] = np.array([0.4, 0.6]) + 0.15 * bc_unit
    return {
        "exercise": "squat",
        "frame_count": n_frames,
        "landmarks": xy.tolist(),
        "visibility": vis.tolist(),
    }


class TestComputeRom:
    def test_constant_angle_min_equals_max(self):
        traj = _mk_trajectory(10, fixed_angle_deg=120.0)
        defs = [{"name": "knee", "triplet": [23, 25, 27]}]
        rom = emit_rom.compute_rom(traj, defs)
        assert rom["knee"]["samples"] == 10
        assert rom["knee"]["min"] == pytest.approx(120.0, abs=0.1)
        assert rom["knee"]["max"] == pytest.approx(120.0, abs=0.1)

    def test_filters_low_visibility_frames(self):
        traj = _mk_trajectory(10, fixed_angle_deg=100.0)
        # knock visibility below threshold on 3 frames for landmark 25 (knee)
        for i in (2, 4, 6):
            traj["visibility"][i][25] = 0.1
        defs = [{"name": "knee", "triplet": [23, 25, 27]}]
        rom = emit_rom.compute_rom(traj, defs)
        assert rom["knee"]["samples"] == 7

    def test_no_valid_samples_emits_nulls(self):
        traj = _mk_trajectory(5, fixed_angle_deg=90.0, visibility=0.0)
        defs = [{"name": "knee", "triplet": [23, 25, 27]}]
        rom = emit_rom.compute_rom(traj, defs)
        assert rom["knee"] == {"min": None, "max": None, "samples": 0}

    def test_multiple_angles_independent(self):
        traj = _mk_trajectory(4, fixed_angle_deg=90.0)
        defs = [
            {"name": "knee", "triplet": [23, 25, 27]},
            # nonsense triplet (all same point) → NaN angle → 0 samples
            {"name": "bogus", "triplet": [23, 23, 23]},
        ]
        rom = emit_rom.compute_rom(traj, defs)
        assert rom["knee"]["samples"] == 4
        assert rom["bogus"]["samples"] == 0

    def test_varying_angle_min_max_capture_range(self):
        # Build a trajectory with two angles interleaved
        a = _mk_trajectory(4, fixed_angle_deg=70.0)
        b = _mk_trajectory(4, fixed_angle_deg=170.0)
        traj = {
            "exercise": "squat",
            "frame_count": 8,
            "landmarks": a["landmarks"] + b["landmarks"],
            "visibility": a["visibility"] + b["visibility"],
        }
        defs = [{"name": "knee", "triplet": [23, 25, 27]}]
        rom = emit_rom.compute_rom(traj, defs)
        assert rom["knee"]["min"] == pytest.approx(70.0, abs=0.1)
        assert rom["knee"]["max"] == pytest.approx(170.0, abs=0.1)


# ---------- load_trajectory / load_angle_config (filesystem) ---------------

class TestLoaders:
    def test_load_trajectory_missing_exits(self, tmp_path, monkeypatch):
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        with pytest.raises(SystemExit):
            emit_rom.load_trajectory("nope")

    def test_load_trajectory_reads_json(self, tmp_path, monkeypatch):
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        payload = {"exercise": "squat", "frame_count": 1,
                   "landmarks": [[[0, 0]] * 33], "visibility": [[1.0] * 33]}
        (tmp_path / "squat.json").write_text(json.dumps(payload), encoding="utf-8")
        got = emit_rom.load_trajectory("squat")
        assert got["exercise"] == "squat"

    def test_load_trajectory_unwraps_v1_nested(self, tmp_path, monkeypatch):
        """V1 signature: canonical_reps[0] is unwrapped so callers see a flat dict."""
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        payload = {
            "schema_version": 1,
            "exercise": "squat",
            "canonical_reps": [
                {
                    "rep_id": 0,
                    "frame_count": 2,
                    "landmarks": [[[0.1, 0.2]] * 33, [[0.3, 0.4]] * 33],
                    "visibility": [[1.0] * 33, [1.0] * 33],
                }
            ],
        }
        (tmp_path / "squat.json").write_text(json.dumps(payload), encoding="utf-8")
        got = emit_rom.load_trajectory("squat")
        assert "landmarks" in got, "v1 nested landmarks were not unwrapped"
        assert "visibility" in got, "v1 nested visibility was not unwrapped"
        assert got["frame_count"] == 2
        assert got["exercise"] == "squat"

    def test_load_trajectory_legacy_flat_still_works(self, tmp_path, monkeypatch):
        """Legacy flat schema (no canonical_reps) is passed through unchanged."""
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        payload = {
            "exercise": "squat",
            "frame_count": 1,
            "landmarks": [[[0.0, 0.0]] * 33],
            "visibility": [[1.0] * 33],
        }
        (tmp_path / "squat.json").write_text(json.dumps(payload), encoding="utf-8")
        got = emit_rom.load_trajectory("squat")
        assert got["exercise"] == "squat"
        assert got["frame_count"] == 1

    def test_load_trajectory_malformed_raises_explicit_error(self, tmp_path, monkeypatch):
        """Signature with neither canonical_reps nor flat landmarks raises RuntimeError
        pointing the user at normalize_loop.py."""
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        # Empty/meaningless payload
        (tmp_path / "squat.json").write_text(json.dumps({"exercise": "squat"}), encoding="utf-8")
        with pytest.raises(RuntimeError, match="normalize_loop.py"):
            emit_rom.load_trajectory("squat")

    def test_load_trajectory_empty_canonical_reps_raises(self, tmp_path, monkeypatch):
        """Empty canonical_reps array raises explicit error (not IndexError)."""
        monkeypatch.setattr(emit_rom, "ANIM_DIR", tmp_path)
        payload = {"schema_version": 1, "exercise": "squat", "canonical_reps": []}
        (tmp_path / "squat.json").write_text(json.dumps(payload), encoding="utf-8")
        with pytest.raises(RuntimeError, match="canonical_reps"):
            emit_rom.load_trajectory("squat")

    def test_load_angle_config_returns_list(self, tmp_path, monkeypatch):
        cfg = {"squat": [{"name": "knee", "triplet": [23, 25, 27]}]}
        path = tmp_path / "exercise_angles.yaml"
        path.write_text(yaml.safe_dump(cfg), encoding="utf-8")
        monkeypatch.setattr(emit_rom, "ANGLES_YAML", path)
        defs = emit_rom.load_angle_config("squat")
        assert defs == [{"name": "knee", "triplet": [23, 25, 27]}]

    def test_load_angle_config_empty_list(self, tmp_path, monkeypatch):
        cfg = {"wristwarmup": None}
        path = tmp_path / "exercise_angles.yaml"
        path.write_text(yaml.safe_dump(cfg), encoding="utf-8")
        monkeypatch.setattr(emit_rom, "ANGLES_YAML", path)
        defs = emit_rom.load_angle_config("wristwarmup")
        assert defs == []

    def test_load_angle_config_missing_exercise_exits(self, tmp_path, monkeypatch):
        cfg = {"squat": [{"name": "knee", "triplet": [23, 25, 27]}]}
        path = tmp_path / "exercise_angles.yaml"
        path.write_text(yaml.safe_dump(cfg), encoding="utf-8")
        monkeypatch.setattr(emit_rom, "ANGLES_YAML", path)
        with pytest.raises(SystemExit):
            emit_rom.load_angle_config("missing_ex")


# ---------- shipped exercise_angles.yaml is well-formed --------------------

class TestShippedAngleConfig:
    def test_every_exercise_has_valid_triplets(self):
        """The committed config must be machine-readable with well-typed triplets."""
        yaml_path = Path(emit_rom.PIPELINE_DIR) / "exercise_angles.yaml"
        with open(yaml_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        assert isinstance(cfg, dict)
        for exercise, entries in cfg.items():
            if not entries:
                continue
            for entry in entries:
                assert "name" in entry, f"{exercise} entry missing name"
                assert "triplet" in entry, f"{exercise} entry missing triplet"
                triplet = entry["triplet"]
                assert len(triplet) == 3, f"{exercise}/{entry['name']} triplet not length-3"
                for idx in triplet:
                    assert 0 <= idx < 33, f"{exercise}/{entry['name']} idx {idx} out of range"
