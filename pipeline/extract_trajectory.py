"""Extract per-frame MediaPipe Pose landmarks from a source clip.

Usage:
    python extract_trajectory.py --exercise squat

Reads sources.yaml[exercise]. Downloads the clip (yt-dlp) if url, or reads a
local file. Runs MediaPipe PoseLandmarker with the "heavy" model (highest
quality, ~equivalent to old complexity=2). Saves a compressed .npz to
pipeline/raw/<exercise>.npz.

Output dump shape: (n_frames, 33, 3), dtype float32, last axis = [x, y, visibility].
Also saves: fps (float), trim range applied, provider, original_url.
"""
from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
import yaml
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

PIPELINE_DIR = Path(__file__).resolve().parent
CACHE_DIR = PIPELINE_DIR / ".cache"
RAW_DIR = PIPELINE_DIR / "raw"
LOCAL_DIR = PIPELINE_DIR / "local"
SOURCES_YAML = PIPELINE_DIR / "sources.yaml"

POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
)
POSE_MODEL_PATH = CACHE_DIR / "pose_landmarker_heavy.task"


def load_source(exercise: str) -> dict:
    with open(SOURCES_YAML, "r", encoding="utf-8") as f:
        sources = yaml.safe_load(f)
    if exercise not in sources:
        sys.exit(f"exercise '{exercise}' not in sources.yaml")
    entry = sources[exercise]
    if not entry.get("url"):
        sys.exit(f"exercise '{exercise}' has no url; fill sources.yaml first")
    return entry


def ensure_pose_model() -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if POSE_MODEL_PATH.exists():
        return POSE_MODEL_PATH
    print(f"[model] downloading pose_landmarker_heavy.task -> {POSE_MODEL_PATH}")
    urllib.request.urlretrieve(POSE_MODEL_URL, POSE_MODEL_PATH)
    return POSE_MODEL_PATH


def resolve_clip(entry: dict) -> Path:
    """Return a local file path for the clip, downloading if necessary."""
    url = entry["url"]
    provider = entry.get("provider", "")

    if provider == "local":
        p = LOCAL_DIR / url
        if not p.exists():
            sys.exit(f"local clip missing: {p}")
        return p

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    out_template = CACHE_DIR / f"{key}.%(ext)s"
    existing = list(CACHE_DIR.glob(f"{key}.*"))
    if existing:
        return existing[0]

    print(f"[yt-dlp] downloading {url} -> {out_template}")
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-f", "best[ext=mp4]/best",
        "-o", str(out_template),
        # Pexels (and many Cloudflare-protected sites) require browser impersonation.
        # curl_cffi is installed via the yt-dlp[curl-cffi] extra.
        "--extractor-args", "generic:impersonate",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        sys.exit(f"yt-dlp failed for {url}")

    downloaded = list(CACHE_DIR.glob(f"{key}.*"))
    if not downloaded:
        sys.exit(f"yt-dlp finished but no file at {out_template}")
    return downloaded[0]


def extract(clip_path: Path, trim: list[float]) -> tuple[np.ndarray, float]:
    """Run MediaPipe PoseLandmarker over the clip. Returns (landmarks, fps)."""
    cap = cv2.VideoCapture(str(clip_path))
    if not cap.isOpened():
        sys.exit(f"cv2 could not open {clip_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    start_frame = int(trim[0] * fps) if trim and trim[0] > 0 else 0
    end_frame = int(trim[1] * fps) if trim and trim[1] > 0 else total_frames
    print(f"[extract] {clip_path.name}  fps={fps:.1f}  frames={total_frames}  using [{start_frame}:{end_frame}]")

    if start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    model_path = ensure_pose_model()
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    frames: list[np.ndarray] = []
    with mp_vision.PoseLandmarker.create_from_options(options) as landmarker:
        idx = start_frame
        while idx < end_frame:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int(idx * 1000.0 / fps)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            if result.pose_landmarks:
                lm_list = result.pose_landmarks[0]
                lm = np.array(
                    [[l.x, l.y, l.visibility] for l in lm_list],
                    dtype=np.float32,
                )
            else:
                lm = np.full((33, 3), np.nan, dtype=np.float32)
            frames.append(lm)
            idx += 1

    cap.release()

    if not frames:
        sys.exit("no frames extracted")
    landmarks = np.stack(frames, axis=0)
    return landmarks, fps


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercise", required=True, help="exercise key in sources.yaml")
    args = ap.parse_args()

    entry = load_source(args.exercise)
    clip = resolve_clip(entry)
    landmarks, fps = extract(clip, entry.get("trim") or [0, 0])

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / f"{args.exercise}.npz"
    np.savez_compressed(
        out_path,
        landmarks=landmarks,
        fps=np.float32(fps),
        trim=np.array(entry.get("trim") or [0, 0], dtype=np.float32),
        provider=entry.get("provider", ""),
        url=entry.get("url", ""),
    )

    detected = int(np.isfinite(landmarks[:, 0, 0]).sum())
    mean_vis = float(np.nanmean(landmarks[:, :, 2]))
    print(f"[saved] {out_path}")
    print(f"[stats] frames={landmarks.shape[0]}  detected={detected}  mean_vis={mean_vis:.3f}")


if __name__ == "__main__":
    main()
