"""Provenance helpers for exercise signature generation.

Provides utilities for computing SHA256 hashes, timestamps, and MediaPipe
version metadata used in the exercise signature provenance block.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

# The MediaPipe JS version embedded in index.html. Pipeline records this in
# provenance so the app can detect version drift at load time.
# Update when index.html's @mediapipe/pose version changes.
MEDIAPIPE_APP_VERSION = "0.5.1675469404"

# Pipeline uses MediaPipe Tasks API (Python) with the heavy pose landmarker.
MEDIAPIPE_PIPELINE_API = "tasks"
MEDIAPIPE_PIPELINE_MODEL = "pose_landmarker_heavy"

# Cache for model hash so we don't rehash 22 times in a batch run.
_model_hash_cache: dict[Path, str] = {}


def model_sha256(path: Path) -> str:
    """Compute SHA256 of a model file. Cached for batch runs.

    Returns 'unknown' with a warning if the file is missing.
    """
    path = path.resolve()
    if path in _model_hash_cache:
        return _model_hash_cache[path]

    if not path.exists():
        import warnings
        warnings.warn(f"Model file not found for SHA256: {path}")
        return "unknown"

    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    digest = h.hexdigest()
    _model_hash_cache[path] = digest
    return digest


def utc_now_iso() -> str:
    """Return current UTC time as ISO 8601 string (e.g. '2026-04-20T14:12:03Z')."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def landmarks_content_hash(landmarks: list) -> str:
    """Compute SHA256 of a landmarks array for content-hash gating.

    Used to detect if trajectory data actually changed between regenerations.
    If unchanged, we preserve the existing extracted_at timestamp.
    """
    import json
    # Serialize landmarks to a stable JSON string
    serialized = json.dumps(landmarks, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()
