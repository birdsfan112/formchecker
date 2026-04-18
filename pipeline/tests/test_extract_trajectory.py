"""Tests for pipeline/extract_trajectory.py.

The bulk of this script is wrapping MediaPipe + yt-dlp + OpenCV, all of which
are I/O-heavy and hard to run in a unit test. We focus on the pure pieces:
YAML source loading, local/cached clip resolution, and the model-path helper
(via monkeypatching).
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml

import extract_trajectory as et


# ---------- load_source -----------------------------------------------------

class TestLoadSource:
    def test_returns_entry_when_present(self, tmp_path, monkeypatch):
        src = {"squat": {"url": "https://example/vid.mp4",
                         "provider": "pexels",
                         "trim": [0, 5],
                         "view": "side",
                         "notes": ""}}
        path = tmp_path / "sources.yaml"
        path.write_text(yaml.safe_dump(src), encoding="utf-8")
        monkeypatch.setattr(et, "SOURCES_YAML", path)
        entry = et.load_source("squat")
        assert entry["url"] == "https://example/vid.mp4"
        assert entry["provider"] == "pexels"

    def test_exits_on_unknown_exercise(self, tmp_path, monkeypatch):
        path = tmp_path / "sources.yaml"
        path.write_text(yaml.safe_dump({"squat": {"url": "x"}}), encoding="utf-8")
        monkeypatch.setattr(et, "SOURCES_YAML", path)
        with pytest.raises(SystemExit):
            et.load_source("unknown_exercise")

    def test_exits_on_empty_url(self, tmp_path, monkeypatch):
        path = tmp_path / "sources.yaml"
        path.write_text(yaml.safe_dump({"lunge": {"url": "", "provider": ""}}),
                        encoding="utf-8")
        monkeypatch.setattr(et, "SOURCES_YAML", path)
        with pytest.raises(SystemExit):
            et.load_source("lunge")

    def test_exits_on_missing_url_key(self, tmp_path, monkeypatch):
        path = tmp_path / "sources.yaml"
        path.write_text(yaml.safe_dump({"squat": {"provider": "pexels"}}),
                        encoding="utf-8")
        monkeypatch.setattr(et, "SOURCES_YAML", path)
        with pytest.raises(SystemExit):
            et.load_source("squat")


# ---------- resolve_clip ----------------------------------------------------

class TestResolveClipLocal:
    def test_returns_path_when_local_file_exists(self, tmp_path, monkeypatch):
        monkeypatch.setattr(et, "LOCAL_DIR", tmp_path)
        (tmp_path / "clip.mp4").write_bytes(b"fake-video-bytes")
        entry = {"url": "clip.mp4", "provider": "local"}
        out = et.resolve_clip(entry)
        assert out == tmp_path / "clip.mp4"

    def test_exits_when_local_file_missing(self, tmp_path, monkeypatch):
        monkeypatch.setattr(et, "LOCAL_DIR", tmp_path)
        entry = {"url": "missing.mp4", "provider": "local"}
        with pytest.raises(SystemExit):
            et.resolve_clip(entry)


class TestResolveClipCached:
    """Non-local sources: resolve_clip hashes the URL and checks CACHE_DIR.
    If already cached, it returns the hit without running yt-dlp."""

    def test_returns_cached_download_without_invoking_ytdlp(self, tmp_path, monkeypatch):
        import hashlib

        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)
        url = "https://pexels.com/video/5025965/"
        key = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
        cached = tmp_path / f"{key}.mp4"
        cached.write_bytes(b"cached")

        # Make sure subprocess is not called — if it is, the test fails loudly.
        def boom(*a, **kw):
            raise AssertionError("yt-dlp should not be invoked when cache hit exists")
        monkeypatch.setattr(et.subprocess, "run", boom)

        out = et.resolve_clip({"url": url, "provider": "pexels"})
        assert out == cached

    def test_invokes_ytdlp_on_cache_miss(self, tmp_path, monkeypatch):
        import hashlib

        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)
        url = "https://pexels.com/video/XYZ/"
        key = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]

        calls = {"count": 0, "cmd": None}

        class Result:
            returncode = 0
            stdout = ""
            stderr = ""

        def fake_run(cmd, capture_output=True, text=True):
            calls["count"] += 1
            calls["cmd"] = cmd
            # Simulate yt-dlp writing the downloaded file
            (tmp_path / f"{key}.mp4").write_bytes(b"downloaded")
            return Result()

        monkeypatch.setattr(et.subprocess, "run", fake_run)
        out = et.resolve_clip({"url": url, "provider": "pexels"})
        assert calls["count"] == 1
        assert out == tmp_path / f"{key}.mp4"
        # Should pass the URL as a positional argument
        assert url in calls["cmd"]

    def test_ytdlp_failure_exits(self, tmp_path, monkeypatch):
        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)

        class Result:
            returncode = 1
            stdout = "nope"
            stderr = "boom"

        def fake_run(cmd, capture_output=True, text=True):
            return Result()

        monkeypatch.setattr(et.subprocess, "run", fake_run)
        with pytest.raises(SystemExit):
            et.resolve_clip({"url": "https://x/y", "provider": "pexels"})

    def test_ytdlp_success_but_no_file_exits(self, tmp_path, monkeypatch):
        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)

        class Result:
            returncode = 0
            stdout = ""
            stderr = ""

        def fake_run(cmd, capture_output=True, text=True):
            return Result()  # does NOT create any file

        monkeypatch.setattr(et.subprocess, "run", fake_run)
        with pytest.raises(SystemExit):
            et.resolve_clip({"url": "https://x/y", "provider": "pexels"})


# ---------- ensure_pose_model ----------------------------------------------

class TestEnsurePoseModel:
    def test_returns_existing_path_without_download(self, tmp_path, monkeypatch):
        target = tmp_path / "pose_landmarker_heavy.task"
        target.write_bytes(b"fake-model")
        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)
        monkeypatch.setattr(et, "POSE_MODEL_PATH", target)

        def boom(*a, **kw):
            raise AssertionError("should not download when cached")
        monkeypatch.setattr(et.urllib.request, "urlretrieve", boom)

        out = et.ensure_pose_model()
        assert out == target

    def test_downloads_when_missing(self, tmp_path, monkeypatch):
        target = tmp_path / "pose_landmarker_heavy.task"
        monkeypatch.setattr(et, "CACHE_DIR", tmp_path)
        monkeypatch.setattr(et, "POSE_MODEL_PATH", target)

        calls = {"count": 0, "args": None}

        def fake_retrieve(url, dest):
            calls["count"] += 1
            calls["args"] = (url, dest)
            Path(dest).write_bytes(b"downloaded-model")

        monkeypatch.setattr(et.urllib.request, "urlretrieve", fake_retrieve)
        out = et.ensure_pose_model()
        assert calls["count"] == 1
        assert calls["args"][0] == et.POSE_MODEL_URL
        assert out == target
        assert target.exists()


# ---------- shipped sources.yaml is well-formed ----------------------------

class TestShippedSourcesYaml:
    def test_parses_and_has_expected_structure(self):
        yaml_path = Path(et.SOURCES_YAML)
        with open(yaml_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        assert isinstance(cfg, dict)
        for exercise, entry in cfg.items():
            assert isinstance(entry, dict), f"{exercise} entry is not a dict"
            for key in ("url", "provider", "trim", "view"):
                assert key in entry, f"{exercise} missing field {key!r}"
            assert len(entry["trim"]) == 2, f"{exercise} trim is not length-2"
