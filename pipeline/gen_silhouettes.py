"""Generate picker silhouette PNGs via Pollinations.ai (free, no key).

Spec: docs/specs/picker-png-rebuild.md
Output: assets/silhouettes/<id>.png (1024x1024, transparent bg target, <=60 KB)

Usage:
    python pipeline/gen_silhouettes.py --single dip
    python pipeline/gen_silhouettes.py --all
    python pipeline/gen_silhouettes.py --ids dip pushup squat
"""

import argparse
import sys
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "silhouettes"
MODEL = "flux"
ENDPOINT = "https://image.pollinations.ai/prompt/"

PROMPT_TEMPLATE = (
    "Minimalist solid-white silhouette of an athletic male figure performing "
    "{name} at {position}, {view}. Solid white body fill with thin dark "
    "anatomical contour lines for muscle definition (chest, shoulder cuts, "
    "ab crease, knee folds). {equipment} visible and rendered in matching "
    "minimalist style. Transparent background. Centered figure with breathing "
    "room on all sides. Pictogram style for a fitness app icon. No shading, "
    "no gradients, no color, no text, no scenery."
)

# (id, display_name, position, view_angle, equipment_clause)
EXERCISES = [
    ("pushup",            "Push-ups",              "the bottom of the rep with chest near floor",         "side view, facing right",       "No equipment, floor implied"),
    ("squat",             "Squats",                "the bottom of a deep rep",                            "side view, facing right",       "No equipment"),
    ("lunge",             "Lunges",                "the bottom of the rep with rear knee near floor",     "side view, facing right",       "No equipment"),
    ("pistol",            "Pistol Squats",         "the bottom of the rep on one leg",                    "side view, facing right",       "No equipment"),
    ("pullup",            "Pull-ups",              "the top of the rep with chin over the bar",           "front view",                    "A horizontal pull-up bar across the top"),
    ("pike",              "Pike Push-ups",         "the bottom of the rep with head near floor",          "side view, facing right",       "No equipment, floor implied"),
    ("dip",               "Dips",                  "the top of the rep with arms locked and knees tucked","front three-quarter view",      "Two parallel dip bars in perspective"),
    ("row",               "Inverted Rows",         "the top of the pull with chest near the bar",         "side view, facing right",       "A horizontal bar above the body"),
    ("plank",             "Plank",                 "a held position",                                     "side view, facing right",       "No equipment, floor implied"),
    ("deadhang",          "Dead Hang",             "a passive hang with arms fully extended overhead",    "front view",                    "A horizontal pull-up bar"),
    ("lsit",              "L-Sit",                 "a held position with legs straight horizontal",       "side view, facing right",       "Two parallel low bars"),
    ("glutebridge",       "Glute Bridge",          "the top of the rep with hips arched up",              "side view, facing right",       "No equipment, floor implied"),
    ("legraise",          "Hanging Leg Raises",    "the top of the rep with legs raised horizontal",      "side view, facing right",       "A horizontal pull-up bar"),
    ("archhang",          "Arch Hang",             "a held position with chest pulled up to the bar",     "side view, facing right",       "A horizontal pull-up bar"),
    ("scapularpull",      "Scapular Pulls",        "the top of the rep with shoulders pulled down (no elbow bend)", "front view",          "A horizontal pull-up bar"),
    ("shoulderdislocate", "Shoulder Dislocates",   "mid-rotation with arms wide overhead",                "front view",                    "A resistance band held wide between the hands"),
    ("hipflexor",         "Hip Flexor Stretch",    "a kneeling lunge hold with rear knee on floor",       "side view, facing right",       "No equipment, floor implied"),
    ("wristwarmup",       "Wrist Warm-up",         "a quadruped position with hands on floor, fingers forward, weight on palms", "three-quarter view", "No equipment, floor implied"),
    ("foamroller",        "Foam Roller",           "supine on a cylinder with knees bent",                "side view, facing right",       "A foam roller cylinder visible under the upper back"),
    ("bandpullapart",     "Band Pull-aparts",      "the top of the rep with arms wide at chest height",   "front view",                    "A resistance band stretched between the hands at chest height"),
    ("catcow",            "Cat-Cow",               "the cow position with back arched downward and head looking up", "side view, facing right", "No equipment, floor implied"),
    ("birddog",           "Bird Dog",              "a held position with right arm and left leg extended straight off the floor", "side view, facing right", "No equipment, floor implied"),
]

EXERCISE_MAP = {ex[0]: ex for ex in EXERCISES}


def build_prompt(ex):
    _id, name, position, view, equipment = ex
    return PROMPT_TEMPLATE.format(name=name, position=position, view=view, equipment=equipment)


def fetch_image(prompt, seed=42):
    encoded = urllib.parse.quote(prompt, safe="")
    params = urllib.parse.urlencode({
        "model": MODEL,
        "width": 1024,
        "height": 1024,
        "nologo": "true",
        "private": "true",
        "seed": seed,
    })
    url = f"{ENDPOINT}{encoded}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "FormChecker-silhouette-gen/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def generate_one(ex, seed=42, prompt_override=None, name_suffix=""):
    _id = ex[0]
    prompt = prompt_override if prompt_override else build_prompt(ex)
    print(f"\n[{_id}{name_suffix}] generating (seed={seed})...")
    print(f"  prompt: {prompt[:140]}...")

    try:
        image_bytes = fetch_image(prompt, seed=seed)
    except Exception as e:
        print(f"  FAIL ({type(e).__name__}): {e}")
        return False

    if not image_bytes:
        print("  FAIL: empty response")
        return False

    out_path = OUT_DIR / f"{_id}{name_suffix}.png"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img = Image.open(BytesIO(image_bytes))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(out_path, format="PNG", optimize=True)

    size_kb = out_path.stat().st_size / 1024
    flag = "OK" if size_kb <= 60 else f"OVER ({size_kb:.1f} KB > 60)"
    print(f"  saved {out_path.name}  {img.size[0]}x{img.size[1]}  {size_kb:.1f} KB  [{flag}]")
    return True


def main():
    parser = argparse.ArgumentParser()
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--single", help="Generate one exercise by id")
    g.add_argument("--all", action="store_true", help="Generate all 22")
    g.add_argument("--ids", nargs="+", help="Generate a specific subset by id")
    parser.add_argument("--prompt", help="Override the prompt entirely (only with --single)")
    parser.add_argument("--suffix", default="", help="Append to filename, e.g. -v2 -> dip-v2.png")
    parser.add_argument("--seed", type=int, default=42, help="Pollinations seed for variation")
    args = parser.parse_args()

    if args.single:
        targets = [EXERCISE_MAP[args.single]]
    elif args.ids:
        targets = [EXERCISE_MAP[i] for i in args.ids]
    else:
        targets = EXERCISES

    print(f"Output dir: {OUT_DIR}")
    print(f"Provider: pollinations.ai  Model: {MODEL}")
    print(f"Targets: {[t[0] for t in targets]}")

    results = {}
    for ex in targets:
        results[ex[0]] = generate_one(
            ex,
            seed=args.seed,
            prompt_override=args.prompt,
            name_suffix=args.suffix,
        )

    print("\n=== SUMMARY ===")
    ok = [k for k, v in results.items() if v]
    fail = [k for k, v in results.items() if not v]
    print(f"OK ({len(ok)}): {ok}")
    if fail:
        print(f"FAIL ({len(fail)}): {fail}")
        sys.exit(1)


if __name__ == "__main__":
    main()
