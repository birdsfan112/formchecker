"""Pytest configuration — puts the pipeline directory on sys.path so the
three scripts can be imported as modules (extract_trajectory, normalize_loop,
emit_rom)."""
from __future__ import annotations

import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))
