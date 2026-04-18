"""Tests for pipeline/normalize_loop.py — the pure-logic half of the pipeline.

Each test constructs a small synthetic landmarks array (T, 33, 3) and exercises
one function at a time. No MediaPipe or video I/O involved.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

import normalize_loop as nl


# ---------- helpers ---------------------------------------------------------

def _blank_frames(n: int) -> np.ndarray:
    """33-landmark frames filled with sensible default xy + visibility 1.0."""
    arr = np.zeros((n, 33, 3), dtype=np.float32)
    # default: put every landmark at (0.5, 0.5, 1.0) so no NaNs bite us
    arr[:, :, 0] = 0.5
    arr[:, :, 1] = 0.5
    arr[:, :, 2] = 1.0
    return arr


def _squat_like_frames(n: int = 60) -> np.ndarray:
    """Synthetic side-view squat: pelvis sinusoidally oscillates in y, ankles pinned
    at y≈0.9, nose near top of frame. Just enough structure to exercise auto-cycle
    detection and canonicalization."""
    arr = _blank_frames(n)
    t = np.linspace(0, 2 * np.pi, n)
    pelvis_y = 0.55 + 0.15 * np.sin(t)        # swings up and down
    nose_y = 0.15 + 0.10 * np.sin(t)
    # ankles stay pinned
    arr[:, nl.L_ANKLE] = np.stack([np.full(n, 0.45), np.full(n, 0.9), np.ones(n)], axis=-1)
    arr[:, nl.R_ANKLE] = np.stack([np.full(n, 0.55), np.full(n, 0.9), np.ones(n)], axis=-1)
    arr[:, nl.L_HIP]   = np.stack([np.full(n, 0.47), pelvis_y,       np.ones(n)], axis=-1)
    arr[:, nl.R_HIP]   = np.stack([np.full(n, 0.53), pelvis_y,       np.ones(n)], axis=-1)
    arr[:, nl.NOSE]    = np.stack([np.full(n, 0.50), nose_y,         np.ones(n)], axis=-1)
    # shoulders with consistent L-on-left (x_L < x_R in normalized coords)
    arr[:, nl.L_SHOULDER] = np.stack([np.full(n, 0.45), np.full(n, 0.3), np.ones(n)], axis=-1)
    arr[:, nl.R_SHOULDER] = np.stack([np.full(n, 0.55), np.full(n, 0.3), np.ones(n)], axis=-1)
    return arr


# ---------- correct_lr_swaps -----------------------------------------------

class TestCorrectLrSwaps:
    def test_no_swap_when_all_frames_consistent(self):
        frames = _squat_like_frames(30)
        out, swaps = nl.correct_lr_swaps(frames)
        assert swaps == 0
        np.testing.assert_allclose(out, frames)

    def test_swaps_outlier_frame(self):
        frames = _squat_like_frames(11)
        # Flip shoulder x on ONE frame so the sign of (L-R) disagrees with majority
        bad = 5
        frames[bad, nl.L_SHOULDER, 0], frames[bad, nl.R_SHOULDER, 0] = (
            frames[bad, nl.R_SHOULDER, 0],
            frames[bad, nl.L_SHOULDER, 0],
        )
        # Also flip hips on that frame to make sure the whole pair set is swapped back
        frames[bad, nl.L_HIP, 0], frames[bad, nl.R_HIP, 0] = (
            frames[bad, nl.R_HIP, 0],
            frames[bad, nl.L_HIP, 0],
        )
        out, swaps = nl.correct_lr_swaps(frames)
        assert swaps == 1
        # after correction: L_SHOULDER.x < R_SHOULDER.x on every frame
        assert np.all(out[:, nl.L_SHOULDER, 0] < out[:, nl.R_SHOULDER, 0])
        assert np.all(out[:, nl.L_HIP, 0] < out[:, nl.R_HIP, 0])

    def test_zero_swaps_returns_same_array(self):
        frames = _squat_like_frames(5)
        out, swaps = nl.correct_lr_swaps(frames)
        assert swaps == 0
        # Contract: when nothing to do, function still returns an ndarray of same shape
        assert out.shape == frames.shape

    def test_handles_all_nan_shoulders(self):
        frames = _blank_frames(5)
        frames[:, nl.L_SHOULDER] = np.nan
        frames[:, nl.R_SHOULDER] = np.nan
        out, swaps = nl.correct_lr_swaps(frames)
        assert swaps == 0
        # array unchanged when majority sign is undefined
        np.testing.assert_array_equal(
            np.isnan(out[:, nl.L_SHOULDER]), np.isnan(frames[:, nl.L_SHOULDER])
        )


# ---------- pelvis_y_signal -------------------------------------------------

class TestPelvisYSignal:
    def test_fills_nan_with_linear_interp(self):
        frames = _squat_like_frames(20)
        frames[5, nl.L_HIP, 1] = np.nan
        frames[5, nl.R_HIP, 1] = np.nan
        sig = nl.pelvis_y_signal(frames)
        assert sig.shape == (20,)
        assert not np.any(np.isnan(sig))
        # interpolated value should sit roughly between neighbours
        assert min(sig[4], sig[6]) - 1e-6 <= sig[5] <= max(sig[4], sig[6]) + 1e-6

    def test_exits_when_too_few_valid(self):
        frames = _squat_like_frames(20)
        frames[:, nl.L_HIP, 1] = np.nan
        frames[:, nl.R_HIP, 1] = np.nan
        with pytest.raises(SystemExit):
            nl.pelvis_y_signal(frames)


# ---------- auto_detect_cycle ----------------------------------------------

class TestAutoDetectCycle:
    def test_returns_valid_range_on_squat_signal(self):
        frames = _squat_like_frames(120)  # 4 full sines → many reps
        start, end = nl.auto_detect_cycle(frames)
        assert 0 <= start < end <= frames.shape[0]
        assert end - start >= 8   # min_lag guard

    def test_exits_on_too_short_clip(self):
        frames = _squat_like_frames(5)
        with pytest.raises(SystemExit):
            nl.auto_detect_cycle(frames)


# ---------- resample_linear -------------------------------------------------

class TestResampleLinear:
    def test_resamples_to_target_length(self):
        src = _blank_frames(17)
        out = nl.resample_linear(src, 60)
        assert out.shape == (60, 33, 3)
        assert out.dtype == np.float32

    def test_preserves_endpoints(self):
        src = _blank_frames(10)
        src[0, 0, 0] = 0.1
        src[-1, 0, 0] = 0.9
        out = nl.resample_linear(src, 60)
        assert out[0, 0, 0] == pytest.approx(0.1, abs=1e-5)
        assert out[-1, 0, 0] == pytest.approx(0.9, abs=1e-5)

    def test_handles_all_nan_channel(self):
        src = _blank_frames(10)
        src[:, 5, 0] = np.nan
        out = nl.resample_linear(src, 12)
        # fallback should zero-fill rather than producing NaN
        assert np.all(out[:, 5, 0] == 0.0)

    def test_partial_nan_interpolates(self):
        src = _blank_frames(10)
        # make channel vary so interpolation is testable
        src[:, 0, 0] = np.linspace(0.0, 1.0, 10)
        src[3, 0, 0] = np.nan
        out = nl.resample_linear(src, 10)
        # no NaN in output, and endpoints still reasonable
        assert not np.any(np.isnan(out[:, 0, 0]))
        assert out[0, 0, 0] == pytest.approx(0.0, abs=1e-5)
        assert out[-1, 0, 0] == pytest.approx(1.0, abs=1e-5)


# ---------- moving_average --------------------------------------------------

class TestMovingAverage:
    def test_window_1_returns_input(self):
        src = _squat_like_frames(20)
        out = nl.moving_average(src, window=1)
        # function early-returns for window<2 so identity is expected
        assert out is src

    def test_window_3_preserves_shape(self):
        src = _squat_like_frames(20)
        out = nl.moving_average(src, window=3)
        assert out.shape == src.shape

    def test_smooths_impulse(self):
        src = _blank_frames(7)
        src[:, 0, 0] = 0.0     # zero out the channel so default 0.5 doesn't skew the math
        src[3, 0, 0] = 1.0     # spike in middle
        out = nl.moving_average(src, window=3)
        # spike gets smoothed — neighbours pick up 1/3, center drops to 1/3
        assert out[3, 0, 0] == pytest.approx(1 / 3, abs=1e-5)
        assert out[2, 0, 0] == pytest.approx(1 / 3, abs=1e-5)
        assert out[4, 0, 0] == pytest.approx(1 / 3, abs=1e-5)

    def test_edges_use_replication(self):
        src = _blank_frames(5)
        src[0, 0, 0] = 0.2
        src[1, 0, 0] = 0.5
        out = nl.moving_average(src, window=3)
        # first frame: mean(src[0], src[0], src[1]) = mean(0.2, 0.2, 0.5) = 0.3
        assert out[0, 0, 0] == pytest.approx(0.3, abs=1e-5)


# ---------- mirror_x --------------------------------------------------------

class TestMirrorX:
    def test_flips_x_leaves_y_and_vis_alone(self):
        src = _squat_like_frames(5)
        src[:, 0, :] = [0.2, 0.4, 0.9]
        out = nl.mirror_x(src)
        assert out[0, 0, 0] == pytest.approx(0.8)
        assert out[0, 0, 1] == pytest.approx(0.4)
        assert out[0, 0, 2] == pytest.approx(0.9)

    def test_does_not_mutate_input(self):
        src = _squat_like_frames(3)
        src_copy = src.copy()
        _ = nl.mirror_x(src)
        np.testing.assert_array_equal(src, src_copy)


# ---------- canonicalize_to_outline ----------------------------------------

class TestCanonicalizeToOutline:
    def test_reference_frame_lands_on_preset_targets(self):
        frames = _squat_like_frames(40)
        preset = nl.PRESETS["standing"]
        out = nl.canonicalize_to_outline(frames, preset)

        anchor_y = nl._mid_y(out, preset["anchor_ids"])
        far_y = nl._mid_y(out, preset["far_ids"])
        span = np.abs(anchor_y - far_y)
        ref = int(np.argmax(span))

        assert anchor_y[ref] == pytest.approx(preset["anchor_y"], abs=1e-4)
        assert far_y[ref] == pytest.approx(preset["far_y"], abs=1e-4)

    def test_reference_frame_center_x_matches_target(self):
        frames = _squat_like_frames(40)
        preset = nl.PRESETS["standing"]
        out = nl.canonicalize_to_outline(frames, preset)
        anchor_y = nl._mid_y(out, preset["anchor_ids"])
        far_y = nl._mid_y(out, preset["far_ids"])
        ref = int(np.argmax(np.abs(anchor_y - far_y)))
        center_x = float(nl._mid_x(out, preset["center_ids"])[ref])
        assert center_x == pytest.approx(nl.TARGET_CENTER_X, abs=1e-4)

    def test_zero_span_returns_copy(self):
        # contrive anchor == far so span is zero on every frame
        frames = _blank_frames(10)
        # every landmark sits at (0.5, 0.5), so anchor_y == far_y
        preset = nl.PRESETS["standing"]
        out = nl.canonicalize_to_outline(frames, preset)
        np.testing.assert_allclose(out, frames)
        # must be a copy, not the same reference
        assert out is not frames


# ---------- anchor_per_frame ------------------------------------------------

class TestAnchorPerFrame:
    def test_every_frame_pins_anchor_midpoint(self):
        frames = _squat_like_frames(30)
        preset = nl.PRESETS["standing"]
        out = nl.anchor_per_frame(frames, preset)
        anchor_x = nl._mid_x(out, preset["anchor_ids"])
        anchor_y = nl._mid_y(out, preset["anchor_ids"])
        np.testing.assert_allclose(anchor_x, nl.TARGET_CENTER_X, atol=1e-5)
        np.testing.assert_allclose(anchor_y, preset["anchor_y"], atol=1e-5)

    def test_relative_geometry_preserved(self):
        """Rigid translation must not change pairwise distances within a frame."""
        frames = _squat_like_frames(5)
        preset = nl.PRESETS["standing"]
        out = nl.anchor_per_frame(frames, preset)
        # pick a handful of pairs
        pairs = [(nl.NOSE, nl.L_HIP), (nl.L_SHOULDER, nl.R_SHOULDER), (nl.L_ANKLE, nl.R_HIP)]
        for a, b in pairs:
            before = np.linalg.norm(frames[:, a, :2] - frames[:, b, :2], axis=1)
            after = np.linalg.norm(out[:, a, :2] - out[:, b, :2], axis=1)
            np.testing.assert_allclose(before, after, atol=1e-5)


# ---------- enforce_lateral_width ------------------------------------------

class TestEnforceLateralWidth:
    def test_locks_pair_to_median_span(self):
        frames = _blank_frames(7)
        # L at 0.40..0.46, R at 0.60..0.54 — span varies 0.20..0.08, median roughly 0.14
        frames[:, nl.L_SHOULDER, 0] = np.linspace(0.40, 0.46, 7)
        frames[:, nl.R_SHOULDER, 0] = np.linspace(0.60, 0.54, 7)
        out, stats = nl.enforce_lateral_width(frames, [(nl.L_SHOULDER, nl.R_SHOULDER)])
        span = out[:, nl.L_SHOULDER, 0] - out[:, nl.R_SHOULDER, 0]
        # All frames locked to same span
        assert np.allclose(span, span[0], atol=1e-6)
        # stats key present
        assert (nl.L_SHOULDER, nl.R_SHOULDER) in stats

    def test_midpoint_x_preserved(self):
        frames = _blank_frames(5)
        frames[:, nl.L_WRIST, 0] = [0.30, 0.32, 0.31, 0.34, 0.33]
        frames[:, nl.R_WRIST, 0] = [0.50, 0.48, 0.49, 0.46, 0.47]
        before_mid = (frames[:, nl.L_WRIST, 0] + frames[:, nl.R_WRIST, 0]) / 2.0
        out, _ = nl.enforce_lateral_width(frames, [(nl.L_WRIST, nl.R_WRIST)])
        after_mid = (out[:, nl.L_WRIST, 0] + out[:, nl.R_WRIST, 0]) / 2.0
        np.testing.assert_allclose(before_mid, after_mid, atol=1e-6)

    def test_y_not_touched(self):
        frames = _blank_frames(4)
        frames[:, nl.L_SHOULDER, 1] = [0.10, 0.11, 0.12, 0.13]
        frames[:, nl.R_SHOULDER, 1] = [0.20, 0.21, 0.22, 0.23]
        out, _ = nl.enforce_lateral_width(frames, [(nl.L_SHOULDER, nl.R_SHOULDER)])
        np.testing.assert_allclose(out[:, nl.L_SHOULDER, 1], frames[:, nl.L_SHOULDER, 1])
        np.testing.assert_allclose(out[:, nl.R_SHOULDER, 1], frames[:, nl.R_SHOULDER, 1])


# ---------- blend_seam ------------------------------------------------------

class TestBlendSeam:
    def test_no_blend_when_diff_small(self):
        frames = _squat_like_frames(60)
        # frame 0 == frame -1 (explicit)
        frames[-1] = frames[0]
        out, diff, blended = nl.blend_seam(frames, seam_frames=5, threshold=0.02)
        assert blended is False
        assert diff == pytest.approx(0.0, abs=1e-6)
        np.testing.assert_array_equal(out, frames)

    def test_blends_when_diff_large(self):
        frames = _blank_frames(60)
        frames[0, 0, 0] = 0.1
        frames[-1, 0, 0] = 0.9  # disagrees with frame 0 by 0.8
        out, diff, blended = nl.blend_seam(frames, seam_frames=5, threshold=0.02)
        assert blended is True
        assert diff >= 0.02
        # After blend, frame -1 should equal frame 0 (w = 1.0 on last step)
        assert out[-1, 0, 0] == pytest.approx(frames[0, 0, 0], abs=1e-5)


# ---------- PRESETS sanity --------------------------------------------------

class TestPresets:
    def test_standing_and_hanging_present(self):
        assert "standing" in nl.PRESETS
        assert "hanging_front" in nl.PRESETS

    def test_each_preset_has_required_keys(self):
        required = {"anchor_ids", "far_ids", "anchor_y", "far_y", "center_ids"}
        for name, preset in nl.PRESETS.items():
            missing = required - preset.keys()
            assert not missing, f"preset {name!r} missing keys: {missing}"


# ---------- load_raw (filesystem) ------------------------------------------

class TestLoadRaw:
    def test_missing_file_exits(self, tmp_path, monkeypatch):
        monkeypatch.setattr(nl, "RAW_DIR", tmp_path)
        with pytest.raises(SystemExit):
            nl.load_raw("nonexistent")

    def test_roundtrip(self, tmp_path, monkeypatch):
        monkeypatch.setattr(nl, "RAW_DIR", tmp_path)
        data = _squat_like_frames(20)
        np.savez_compressed(tmp_path / "squat.npz", landmarks=data, fps=np.float32(30.0))
        lm, fps = nl.load_raw("squat")
        assert lm.shape == data.shape
        assert fps == pytest.approx(30.0)
