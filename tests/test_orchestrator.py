"""The LangGraph orchestrator must use verified curated data and never invent hotels/flights."""
import pytest

pytest.importorskip("langgraph")

from orchestrator import execute_trip_orchestration, _nightly_rate  # noqa: E402


def _run(dest, days=3, budget="Moderate"):
    return execute_trip_orchestration(
        origin="Karachi", destination=dest, days=days, budget_tier=budget,
        traveler_type="Solo", interests=[],
    )


def test_uses_verified_curated_hotels_and_itinerary():
    plan = _run("Tokyo")
    names = [h["name"] for h in plan["hotels"]]
    assert "Hotel Gracery Shinjuku" in names
    assert not any("Boutique Stay" in n or "Heritage Inn" in n for n in names)
    assert len(plan["itinerary"]) == 3
    assert "Historic Landmarks of" not in str(plan["itinerary"])
    assert plan["source"] == "curated" and plan["coordinatesVerified"] is True


def test_flight_is_a_labelled_estimate_without_invented_carrier():
    flights = _run("Tokyo")["flights"]
    assert flights["isEstimate"] is True
    assert "airline" not in flights and "flightNumber" not in flights


def test_unknown_city_gets_no_invented_hotels():
    plan = _run("Atlantis")
    assert plan["hotels"] == []
    assert plan["source"] == "procedural"


def test_rebalancer_never_overwrites_verified_prices():
    prices = {h["price"] for h in _run("Tokyo", budget="Cheap")["hotels"]}
    assert "$75 per night" not in prices


def test_nightly_rate_parsing():
    assert _nightly_rate({"price": "$140 per night"}) == 140
    assert _nightly_rate({"nightlyRate": 90}) == 90
    assert _nightly_rate({"price": "ask"}) is None
