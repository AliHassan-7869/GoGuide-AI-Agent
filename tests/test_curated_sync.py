import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools"))
import export_curated  # noqa: E402

import curated_destinations  # noqa: E402


def test_app_bundle_matches_server_catalog():
    with open(export_curated.OUT, encoding="utf-8") as f:
        assert f.read() == export_curated.render(), "run: python3 tools/export_curated.py"


def test_whole_word_matching():
    find = curated_destinations.find_curated_key
    assert find("paris, france") == "paris"
    assert find("jerome") is None and find("chrome city") is None


def test_curated_plan_is_marked_verified():
    plan = curated_destinations.get_curated_plan("Dubai", 2, "Moderate")
    assert plan["data"]["plan"]["trip"]["coordinatesVerified"] is True
    assert len(plan["data"]["plan"]["trip"]["itinerary"]) == 2
