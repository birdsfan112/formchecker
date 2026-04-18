# Spec — `pipeline/normalize_loop.py` targeted bug fixes

**Scope:** Two minimal, surgical fixes. Do not touch normalization, swap-detection, or signal-computation logic. Both bugs are about noise (bad log metric, spurious warnings), not behavior.

**Non-goals:** refactoring, renaming, changing public signatures, adjusting thresholds, touching any other function.

**Test file status:** The task brief references `pipeline/tests/test_normalize_loop.py`. That file does **not** exist in the repo. There is no existing Python test harness for the pipeline (project tests live in `tests.js`, Node, for `index.html` only). The Implementer will need to either:
- Create `pipeline/tests/test_normalize_loop.py` with pytest-style tests for the two fixes, **or**
- Confirm with Scott whether a new test file is wanted before writing one.

Recommended minimum coverage once the file exists:
- **Bug 1:** `enforce_lateral_width` log stat equals `(signed_half.max() - signed_half.min()) * 2` on a fabricated pair whose signed span values are not symmetric around zero (e.g. `-0.20, -0.10, 0.30`). The old formula would yield `0.0` on symmetric-magnitude inputs; the new formula yields the true span range.
- **Bug 2:** `correct_lr_swaps(all_nan_landmarks)` and `pelvis_y_signal(all_nan_landmarks)` raise no `RuntimeWarning` under `warnings.catch_warnings(record=True)` / `warnings.simplefilter("error", RuntimeWarning)`.

---

## Bug 1 — `enforce_lateral_width` log stat is nonsense

**Location:** [`pipeline/normalize_loop.py:336`](pipeline/normalize_loop.py:336)

**Current code (line 336, inside the `for l_id, r_id in pair_groups:` loop that starts at line 328):**

```python
        span_before = float(np.nanmax(np.abs(signed_half)) * 2 - np.nanmin(np.abs(signed_half)) * 2)
```

**Problem:** The log line is supposed to report the *range* of the pair's horizontal span across frames, so Scott can eyeball how much the width varied before the lock smoothed it out. But both operands take `np.abs(signed_half)` first, which collapses sign. The result is `(max|x| − min|x|) · 2`, which is always ≥ 0 and is zero whenever the L–R sign is stable across frames (the common case). It does not represent the actual span range.

The variable `signed_half` (computed on line 329) is `(L.x − R.x) / 2`. The true per-frame span is `L.x − R.x = 2 · signed_half`. The range of that signed quantity across frames is `(max(signed_half) − min(signed_half)) · 2`, **with no abs**.

**Replacement (line 336):**

```python
        span_before = float((np.nanmax(signed_half) - np.nanmin(signed_half)) * 2)
```

**Change scope:** this one line only. Do not touch lines 327–335 (the width-lock math itself, which is unaffected) or lines 337–340 (the `stats` dict shape — same keys, same value type).

**Why this is safe:**
- `span_before` is only used as a value in the `stats` dict under key `"raw_span_range"`.
- `stats` is only consumed by the `for (l, r), s in lat_stats.items(): print(...)` loop on line 443 in `main()`, which formats `s['median_full_span']` — not `s['raw_span_range']` — so fixing the formula will not change any printed text until someone chooses to surface it. The field remains available for future logging.
- No branching or return value depends on `span_before`. No callers outside `main()`.

**What could go wrong:** nothing behavioral. If the Implementer accidentally removes the `* 2` or drops the `float(...)` cast, downstream JSON serialization of `stats` (should anyone add it) could break. Keep the cast.

---

## Bug 2 — `correct_lr_swaps` and `pelvis_y_signal` emit `RuntimeWarning` on all-NaN input

**Locations:**
- [`pipeline/normalize_loop.py:128-179`](pipeline/normalize_loop.py:128) — `correct_lr_swaps`
- [`pipeline/normalize_loop.py:182-191`](pipeline/normalize_loop.py:182) — `pelvis_y_signal`

**Problem:** When the input landmark array is entirely NaN (all frames, all landmarks, all channels), numpy's `nanmedian` / `nanmean` emit `RuntimeWarning: All-NaN slice encountered` / `RuntimeWarning: Mean of empty slice`. The existing downstream logic handles the resulting NaN correctly — `correct_lr_swaps` falls through both stages and returns `out` unchanged; `pelvis_y_signal` reaches the `mask.sum() < 10` check and `sys.exit`s with its normal error message — but the warnings are noisy and clutter test output / logs.

**Fix strategy:** Add a single early-return guard at the top of each function that short-circuits the all-NaN case before any `nanmean` / `nanmedian` call runs. Do **not** modify stage 1, stage 2, or any signal math.

---

### Bug 2a — `correct_lr_swaps`

**Current code (lines 140–146, context):**

```python
    Returns (corrected, whole_frame_swaps, per_pair_swap_counts).
    """
    PAIR_SWAP_MIN = 0.03

    out = landmarks.copy()

    # Stage 1: whole-frame swap based on shoulder sign.
    diffs = out[:, L_SHOULDER, 0] - out[:, R_SHOULDER, 0]
```

**Insert the guard between `out = landmarks.copy()` (line 143) and the blank line above `# Stage 1:` (line 145).** The resulting section should read:

```python
    PAIR_SWAP_MIN = 0.03

    out = landmarks.copy()

    # All-NaN input: nothing to detect. Return no-op to avoid nanmedian warnings.
    if np.isnan(out).all():
        return out, 0, {}

    # Stage 1: whole-frame swap based on shoulder sign.
    diffs = out[:, L_SHOULDER, 0] - out[:, R_SHOULDER, 0]
```

**Change scope:** insertion only. No existing line is modified or deleted. Stage 1 (lines 146–158) and Stage 2 (lines 160–177) stay exactly as-is.

**Why this return shape is correct:**
- Signature on line 128 is `tuple[np.ndarray, int, dict]`.
- `out` is the NaN-filled copy (matches input).
- `0` is the `whole_swaps` count (no swaps performed).
- `{}` is the `pair_swaps` dict (no per-pair entries).
- `main()` on lines 412–417 reads all three return values; the two log blocks (`if whole_swaps:` and `if pair_swaps:`) both short-circuit on falsy values, so no spurious log line is printed.

---

### Bug 2b — `pelvis_y_signal`

**Current code (lines 182–191):**

```python
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
```

**Replacement (lines 182–191):**

```python
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
```

**Change scope:** one new `if`/`sys.exit` pair inserted ahead of the existing `np.nanmean` call. No other line is touched. The existing `mask.sum() < 10` exit remains as the path for partially-NaN input (which is the common real-world case).

**Why this preserves behavior:**
- The only caller, `auto_detect_cycle` (line 200), treats this function as sys.exit-on-failure; there is no "return empty signal" path to introduce.
- The exit message string is copied verbatim from line 187 so existing error output matches.
- The duplicated slice expression (`landmarks[:, [L_HIP, R_HIP], 1]`) is intentional — keeping it inline avoids introducing a local variable and matches the task's "do not change signal computation logic" constraint.

**What could go wrong:**
- If the Implementer changes the exit message string, tools that grep for the exact text will break. Keep the string identical.
- If the Implementer wraps the whole function in `with np.errstate(...):` or `warnings.catch_warnings()` instead of the early-return, the spec is not satisfied — the task explicitly asks for an early-return guard. Don't substitute approaches.

---

## Implementer checklist

1. Open [`pipeline/normalize_loop.py`](pipeline/normalize_loop.py).
2. Apply Bug 1 replacement on line 336 only.
3. Apply Bug 2a insertion after line 143.
4. Apply Bug 2b replacement on lines 182–191.
5. Decide with Scott (or ask) whether to create `pipeline/tests/test_normalize_loop.py`. If yes, cover the two assertions listed under "Test file status" above. If the answer is "not yet", at minimum run a one-off repro script locally to confirm:
   - `enforce_lateral_width` now reports a non-zero `raw_span_range` on asymmetric inputs.
   - `correct_lr_swaps(np.full((10, 33, 3), np.nan))` and `pelvis_y_signal(np.full((10, 33, 3), np.nan))` raise no warnings.
6. Confirm `git diff pipeline/normalize_loop.py` shows exactly three hunks (one per fix) — no incidental edits.
7. Hand off to the Check agent.

## Out of scope (do not do)

- Changing `stats` dict keys or adding new fields.
- Refactoring `enforce_lateral_width` to precompute any other shared quantity.
- Replacing `sys.exit` with raising an exception.
- Using `warnings.filterwarnings` / `np.errstate` anywhere.
- Touching any other function, import, or module-level constant in `normalize_loop.py`.
- Any change to `pipeline/extract_trajectory.py` or `pipeline/emit_rom.py`.
