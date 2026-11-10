"""Regenerates the app's bundled offline plans from curated_destinations.py.

Run from the repo root after editing curated_destinations.py:
    python3 tools/export_curated.py
tests/test_curated_sync.py fails if the generated file is out of date.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from curated_destinations import CURATED_DESTINATIONS  # noqa: E402

OUT = os.path.join(ROOT, "app", "GoGuide", "Components", "constants", "curatedPlans.json")


def render() -> str:
    return json.dumps(CURATED_DESTINATIONS, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


if __name__ == "__main__":
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(render())
    print(f"wrote {OUT} ({len(CURATED_DESTINATIONS)} destinations)")
