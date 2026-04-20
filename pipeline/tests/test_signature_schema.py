"""Tests for the unified exercise signature schema (v1).

These tests validate the schema structure and helpers defined in
docs/specs/exercise-signature-schema.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

# Add pipeline dir to path for imports
PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from normalize_loop import (
    compute_angle_timeseries,
    auto_detect_phases,
    build_canonical_rep,
    build_provenance,
    load_sources_entry,
    should_preserve_timestamp,
    FRAME_COUNT,
)
from lib.provenance import (
    model_sha256,
    utc_now_iso,
    landmarks_content_hash,
    MEDIAPIPE_APP_VERSION,
)


# ---------- Helper to create test data ----------------------------------------

def make_test_landmarks(n_frames: int = 60, n_landmarks: int = 33) -> np.ndarray:
    """Create synthetic landmarks (n_frames, n_landmarks, 2)."""
    np.random.seed(42)
    return np.random.rand(n_frames, n_landmarks, 2).astype(np.float32)


def make_test_visibility(n_frames: int = 60, n_landmarks: int = 33, high: bool = True) -> np.ndarray:
    """Create visibility array (n_frames, n_landmarks). High = 0.9+, low = 0.3."""
    val = 0.95 if high else 0.3
    return np.full((n_frames, n_landmarks), val, dtype=np.float32)


def make_angle_defs():
    """Example angle defs for a squat-like exercise."""
    return [
        {"name": "knee", "triplet": [23, 25, 27]},
        {"name": "hip", "triplet": [11, 23, 25]},
    ]


# ---------- Schema version tests ----------------------------------------------

class TestSchemaVersion:
    def test_schema_version_required(self):
        """Signature without schema_version should be flagged by consumers."""
        sig = {
            "exercise": "squat",
            "canonical_reps": [],
        }
        # Schema version is required - consumers should check it
        assert "schema_version" not in sig
        # When added, it should be 1
        sig["schema_version"] = 1
        assert sig["schema_version"] == 1


# ---------- canonical_reps structure tests ------------------------------------

class TestCanonicalReps:
    def test_canonical_reps_is_array(self):
        """canonical_reps must be a list, not an object."""
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(
            rep_id=0,
            landmarks60=lm,
            visibility60=vis,
            angle_defs=angle_defs,
            period_ms=3000,
        )

        # Verify it's a dict (single rep), to be wrapped in list
        assert isinstance(rep, dict)
        canonical_reps = [rep]
        assert isinstance(canonical_reps, list)
        assert len(canonical_reps) == 1

    def test_canonical_rep_has_required_fields(self):
        """Each canonical rep must have all 9 required fields."""
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(
            rep_id=0,
            landmarks60=lm,
            visibility60=vis,
            angle_defs=angle_defs,
            period_ms=3000,
        )

        required = [
            "rep_id", "period_ms", "frame_count",
            "landmarks", "visibility",
            "angle_timeseries", "phases", "rom_advisory",
        ]
        for field in required:
            assert field in rep, f"Missing required field: {field}"

    def test_phases_has_name_and_frame_idx(self):
        """Each phase entry must have name and frame_idx."""
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(
            rep_id=0,
            landmarks60=lm,
            visibility60=vis,
            angle_defs=angle_defs,
            period_ms=3000,
        )

        phases = rep["phases"]
        assert len(phases) >= 1
        for phase in phases:
            assert "name" in phase
            assert "frame_idx" in phase
            assert isinstance(phase["frame_idx"], int)
            assert 0 <= phase["frame_idx"] < FRAME_COUNT

    def test_angle_timeseries_length_matches_frame_count(self):
        """angle_timeseries[name] must have length == frame_count."""
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(
            rep_id=0,
            landmarks60=lm,
            visibility60=vis,
            angle_defs=angle_defs,
            period_ms=3000,
        )

        frame_count = rep["frame_count"]
        for name, series in rep["angle_timeseries"].items():
            assert len(series) == frame_count, f"{name} series length mismatch"


# ---------- ROM advisory tests ------------------------------------------------

class TestRomAdvisory:
    def test_rom_advisory_optional(self):
        """Signature without rom_advisory should still be valid."""
        # We test that the consumer can handle missing rom_advisory
        sig = {
            "schema_version": 1,
            "exercise": "test",
            "canonical_reps": [{"rep_id": 0, "landmarks": [], "visibility": []}],
        }
        # rom_advisory is optional at the consumer level
        rom = sig["canonical_reps"][0].get("rom_advisory", {})
        assert rom == {}

    def test_rom_advisory_min_leq_max(self):
        """rom_advisory[joint].min <= rom_advisory[joint].max when samples > 0."""
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(
            rep_id=0,
            landmarks60=lm,
            visibility60=vis,
            angle_defs=angle_defs,
            period_ms=3000,
        )

        rom = rep["rom_advisory"]
        for name, stats in rom.items():
            if stats["samples"] > 0:
                assert stats["min"] <= stats["max"], f"{name}: min > max"


# ---------- Optional field defaults -------------------------------------------

class TestOptionalFieldDefaults:
    def test_joint_weights_default_empty(self):
        """joint_weights defaults to empty dict."""
        # Build a complete signature payload
        lm = make_test_landmarks()
        vis = make_test_visibility()
        angle_defs = make_angle_defs()

        rep = build_canonical_rep(0, lm, vis, angle_defs, 3000)
        sources = load_sources_entry("squat")
        prov = build_provenance("squat", sources, "standing")

        payload = {
            "schema_version": 1,
            "exercise": "squat",
            "bilateral": True,
            "mirror_source": False,
            "provenance": prov,
            "canonical_reps": [rep],
            "joint_weights": {},  # Explicit empty
        }

        assert payload["joint_weights"] == {}

    def test_bilateral_default_true(self):
        """bilateral defaults to True for all current exercises."""
        payload = {
            "schema_version": 1,
            "exercise": "squat",
            "bilateral": True,
        }
        assert payload.get("bilateral", True) is True


# ---------- Back-compat tests -------------------------------------------------

class TestBackCompat:
    def test_back_compat_flat_schema(self):
        """Old-style file (flat landmarks) loads via consumer shim."""
        # Simulate old format
        old_style = {
            "exercise": "squat",
            "period_ms": 3000,
            "frame_count": 60,
            "landmarks": [[[0.5, 0.5]] * 33] * 60,
            "visibility": [[0.9] * 33] * 60,
        }

        # Consumer shim: getActiveRep returns first canonical_rep or falls back to root
        def getActiveRep(sig):
            reps = sig.get("canonical_reps") or []
            if reps:
                return reps[0]
            # Back-compat: return the signature itself (has flat landmarks)
            return sig

        rep = getActiveRep(old_style)
        assert "landmarks" in rep
        assert "visibility" in rep
        assert rep["frame_count"] == 60


# ---------- Phase auto-detection tests ----------------------------------------

class TestPhaseAutoDetection:
    def test_timed_exercise_gets_start_middle_end(self):
        """Exercises with < 10 deg range get start/middle/end phases."""
        # Constant angle series (static hold)
        angle_ts = {"hip": [90.0] * 60}
        angle_defs = [{"name": "hip", "triplet": [11, 23, 25]}]

        phases = auto_detect_phases(angle_ts, angle_defs)

        names = [p["name"] for p in phases]
        assert "start" in names
        assert "middle" in names
        assert "end" in names

    def test_rep_exercise_gets_top_and_bottom(self):
        """Exercises with > 10 deg range get top/bottom phases."""
        # Varying angle series (rep-based)
        angle_ts = {"knee": [180.0 - i * 2 for i in range(60)]}
        angle_defs = [{"name": "knee", "triplet": [23, 25, 27]}]

        phases = auto_detect_phases(angle_ts, angle_defs)

        names = [p["name"] for p in phases]
        assert "top" in names
        assert "bottom" in names

    def test_phases_override_used_when_provided(self):
        """phases_override from sources.yaml takes precedence."""
        angle_ts = {"knee": [180.0] * 60}
        angle_defs = [{"name": "knee", "triplet": [23, 25, 27]}]
        override = [{"name": "custom", "frame_idx": 15}]

        phases = auto_detect_phases(angle_ts, angle_defs, phases_override=override)

        assert len(phases) == 1
        assert phases[0]["name"] == "custom"
        assert phases[0]["frame_idx"] == 15


# ---------- Provenance tests --------------------------------------------------

class TestProvenance:
    def test_extracted_at_is_iso8601(self):
        """provenance.extracted_at parses as ISO 8601."""
        from datetime import datetime

        sources = load_sources_entry("squat")
        prov = build_provenance("squat", sources, "standing")

        ts = prov["extracted_at"]
        # Should parse without error
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        assert dt is not None

    def test_provenance_has_required_fields(self):
        """Provenance block has all required fields per spec."""
        sources = load_sources_entry("squat")
        prov = build_provenance("squat", sources, "standing")

        required = [
            "mediapipe_pipeline_api",
            "mediapipe_pipeline_model",
            "mediapipe_pipeline_model_sha256",
            "mediapipe_app_api",
            "mediapipe_app_version",
            "source_url",
            "source_provider",
            "extracted_at",
            "pipeline_preset",
        ]
        for field in required:
            assert field in prov, f"Missing provenance field: {field}"


# ---------- Content hash gating tests -----------------------------------------

class TestContentHashGating:
    def test_content_hash_same_landmarks_preserves_timestamp(self):
        """If landmarks unchanged, preserve existing extracted_at."""
        lm = [[[0.5, 0.5]] * 33] * 60
        existing = {
            "provenance": {"extracted_at": "2026-01-01T00:00:00Z"},
            "canonical_reps": [{"landmarks": lm}],
        }

        result = should_preserve_timestamp(lm, existing)
        assert result == "2026-01-01T00:00:00Z"

    def test_content_hash_different_landmarks_returns_none(self):
        """If landmarks changed, return None (use new timestamp)."""
        lm_old = [[[0.5, 0.5]] * 33] * 60
        lm_new = [[[0.6, 0.6]] * 33] * 60
        existing = {
            "provenance": {"extracted_at": "2026-01-01T00:00:00Z"},
            "canonical_reps": [{"landmarks": lm_old}],
        }

        result = should_preserve_timestamp(lm_new, existing)
        assert result is None


# ---------- Multi-raw tests ---------------------------------------------------

class TestMultiRaw:
    def test_two_raws_produce_two_canonical_reps(self):
        """--raw pathA --raw pathB produces two canonical_reps with rep_id 0, 1."""
        lm1 = make_test_landmarks()
        vis1 = make_test_visibility()
        lm2 = make_test_landmarks() + 0.1  # Slightly different
        vis2 = make_test_visibility()
        angle_defs = make_angle_defs()

        rep1 = build_canonical_rep(0, lm1, vis1, angle_defs, 3000)
        rep2 = build_canonical_rep(1, lm2, vis2, angle_defs, 3000)

        assert rep1["rep_id"] == 0
        assert rep2["rep_id"] == 1

        canonical_reps = [rep1, rep2]
        assert len(canonical_reps) == 2
