"""
GoGuide AI Master Travel Orchestrator (Stack 5)
==============================================
Orchestration: LangGraph Stateful Multi-Agent Graph (Supervisor Pattern)
Decision Engine: TypeSafe AI Jev (Sub-200ms Noul Confidence Gating)
Knowledge Grounding: Lightweight Curated Data (curated_destinations.py & travel_essentials.py)
Generative Synthesis: Gemini 2.0 Flash / DeepSeek
"""

import os
import re
import json
import logging
from typing import TypedDict, List, Dict, Any, Optional

from langgraph.graph import StateGraph, START, END

from curated_destinations import get_curated_plan
from travel_essentials import (
    get_visa_guidelines,
    get_seasonal_events,
    get_emergency_and_health,
    get_currency_and_payments,
)
from jev_evaluator import jev_client

logger = logging.getLogger("goguide.orchestrator")


# ---------------------------------------------------------------------------
# 1. State Definition
# ---------------------------------------------------------------------------
class TripState(TypedDict, total=False):
    origin: str
    destination: str
    days: int
    budget_tier: str
    traveler_type: str
    interests: List[str]
    user_email: Optional[str]
    
    # Grounded factual memory
    grounded_destination: Optional[Dict[str, Any]]
    essentials: Optional[Dict[str, Any]]
    
    # Generated components
    flights: Optional[Dict[str, Any]]
    hotels: Optional[List[Dict[str, Any]]]
    itinerary: Optional[List[Dict[str, Any]]]
    total_cost: float
    
    # Quality & confidence audit
    jev_audit: Optional[Dict[str, Any]]
    iterations: int
    is_approved: bool
    
    # Final normalized payload
    final_plan: Optional[Dict[str, Any]]


def _nightly_rate(hotel: Dict[str, Any]) -> Optional[int]:
    """Best-effort nightly USD rate from a hotel dict; None when it cannot be read."""
    if not isinstance(hotel, dict):
        return None
    if isinstance(hotel.get("nightlyRate"), (int, float)):
        return int(hotel["nightlyRate"])
    m = re.search(r"\$\s*(\d[\d,]*)", str(hotel.get("price", "")))
    return int(m.group(1).replace(",", "")) if m else None


# ---------------------------------------------------------------------------
# 2. Worker Nodes
# ---------------------------------------------------------------------------
def grounding_node(state: TripState) -> Dict[str, Any]:
    """Retrieves verified coordinates, curated hotels, and essential guidelines."""
    dest = state.get("destination", "Tokyo, Japan")
    days = max(1, int(state.get("days", 5)))
    budget = state.get("budget_tier", "moderate")
    logger.info(f"[Orchestrator] Grounding destination: {dest} (days={days}, budget={budget})")
    
    curated_resp = get_curated_plan(dest, days, budget)
    # get_curated_plan returns {"data": {"plan": {"trip": {...}}}}; unwrap to the trip itself
    curated = (((curated_resp or {}).get("data") or {}).get("plan") or {}).get("trip") or None
    essentials = {
        "visa": get_visa_guidelines(dest),
        "events": get_seasonal_events(dest),
        "safety": get_emergency_and_health(dest),
        "currency": get_currency_and_payments(dest),
    }
    
    return {
        "grounded_destination": curated,
        "essentials": essentials,
        "iterations": state.get("iterations", 0),
    }


def flight_worker_node(state: TripState) -> Dict[str, Any]:
    """Generates realistic flights and transit options between origin and destination."""
    origin = state.get("origin", "Current Location")
    destination = state.get("destination", "Tokyo, Japan")
    budget_tier = state.get("budget_tier", "moderate").lower()
    
    dest_clean = destination.split(",")[0].strip()
    
    # Pricing calibration based on budget tier
    base_price = 280 if budget_tier in ["cheap", "budget"] else (650 if budget_tier == "moderate" else 1450)
    
    # Only a labelled estimate. No invented airline or flight number: the app's flight engine
    # fills carrier/route details, and users are pointed to live search for real fares.
    flights = {
        "route": f"{origin} ➔ {dest_clean}",
        "estimatedPrice": f"${base_price}",
        "priceValue": base_price,
        "isEstimate": True,
        "bookingUrl": "https://www.google.com/travel/flights",
    }

    return {"flights": flights}


def hotel_worker_node(state: TripState) -> Dict[str, Any]:
    """Selects grounded accommodations matching the user's budget tier."""
    budget_tier = state.get("budget_tier", "moderate").lower()
    grounded = state.get("grounded_destination")
    days = max(1, state.get("days", 5))
    
    # Only verified curated hotels. If none exist we return an empty list (never invent names).
    hotels = [dict(h) for h in grounded["hotels"]] if grounded and grounded.get("hotels") else []

    # Compute running total cost
    flight_price = (state.get("flights") or {}).get("priceValue", 450)
    primary_nightly = _nightly_rate(hotels[0]) if hotels else None
    if primary_nightly is None:
        primary_nightly = 110  # rough estimate only; no hotel is shown in this case

    total_est = flight_price + (primary_nightly * days) + (45 * days) # 45/day food/activities
    
    return {"hotels": hotels, "total_cost": total_est}


def itinerary_worker_node(state: TripState) -> Dict[str, Any]:
    """Builds day-by-day morning, afternoon, and evening activities."""
    grounded = state.get("grounded_destination")
    days_count = max(1, state.get("days", 5))
    dest = state.get("destination", "Vacation Destination")
    dest_clean = dest.split(",")[0].strip()
    
    itinerary = []
    
    # If destination has curated daily activities, use them
    if grounded and grounded.get("itinerary"):
        curated_days = grounded["itinerary"]
        for i in range(days_count):
            base_day = curated_days[i % len(curated_days)]
            itinerary.append({
                "day": i + 1,
                "theme": base_day.get("theme", f"Exploring {dest_clean} Highlights"),
                "activities": base_day.get("activities", []),
            })
    else:
        # Procedural itinerary generation
        for day_num in range(1, days_count + 1):
            itinerary.append({
                "day": day_num,
                "theme": f"Day {day_num}: {dest_clean} Culture & Highlights",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": f"Historic Landmarks of {dest_clean}",
                        "details": "Explore iconic cultural heritage spots and architectural highlights.",
                        "tickets": "Free - $15",
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": f"Local Artisans & {dest_clean} Markets",
                        "details": "Walk through vibrant local markets, cafes, and scenic streets.",
                        "tickets": "Free",
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": f"Sunset Promenade & Authentic Dining",
                        "details": "Enjoy authentic regional cuisine and evening city views.",
                        "tickets": "$25 - $40",
                    }
                ]
            })
            
    return {"itinerary": itinerary}


def jev_audit_node(state: TripState) -> Dict[str, Any]:
    """
    TypeSafe AI Jev Decision Node:
    Performs sub-200ms Noul (Yes/No) decision evaluation with calibrated confidence.
    """
    total_cost = state.get("total_cost", 0.0)
    budget_tier = state.get("budget_tier", "moderate")
    days = state.get("days", 5)
    iterations = state.get("iterations", 0)
    
    context = {
        "total_cost": total_cost,
        "budget_tier": budget_tier,
        "days": days,
        "itinerary": state.get("itinerary", [])
    }
    
    # Proposition: "Is the estimated trip cost within the user's budget ceiling?"
    noul_result = jev_client.evaluate_noul("Is the travel itinerary within the specified budget tier?", context)
    is_valid = noul_result["decision"]
    
    logger.info(f"[JEV Evaluator] Decision: {is_valid}, Confidence: {noul_result['confidence']}, Reason: {noul_result['reasoning']}")
    
    # If iterations reach 2, force approval to prevent endless loops
    if iterations >= 2:
        is_valid = True
        
    return {
        "jev_audit": noul_result,
        "is_approved": is_valid,
        "iterations": iterations + 1,
    }


def budget_rebalancer_node(state: TripState) -> Dict[str, Any]:
    """Self-correcting loop: readjusts accommodation price downwards when Jev flags an overage."""
    logger.info("[Orchestrator] Self-healing budget loop triggered by Jev.")
    # Never rewrite verified prices. The only real lever is to put the cheapest verified hotel first.
    current_hotels = list(state.get("hotels", []))
    current_hotels.sort(key=lambda h: (_nightly_rate(h) is None, _nightly_rate(h) or 0))

    days = max(1, state.get("days", 5))
    flight_price = (state.get("flights") or {}).get("priceValue", 320)
    nightly = _nightly_rate(current_hotels[0]) if current_hotels else None
    new_total = flight_price + ((nightly if nightly is not None else 75) * days) + (35 * days)

    return {
        "hotels": current_hotels,
        "total_cost": new_total,
    }


def compiler_node(state: TripState) -> Dict[str, Any]:
    """Compiles normalized output adhering strictly to the GoGuide AI mobile contract."""
    dest = state.get("destination", "Tokyo, Japan")
    
    final_payload = {
        "destination": dest,
        "totalDays": state.get("days", 5),
        "budget": state.get("budget_tier", "Moderate"),
        "traveler": state.get("traveler_type", "Solo"),
        "flights": state.get("flights"),
        "hotels": state.get("hotels", []),
        "itinerary": state.get("itinerary", []),
        "budgetAnalysis": {
            "estimatedTotalCost": f"${state.get('total_cost', 1200):.0f}",
            "currency": "USD",
            "tier": state.get("budget_tier", "Moderate"),
        },
        "essentials": state.get("essentials", {}),
        "coordinatesVerified": bool(state.get("grounded_destination")),
        "source": "curated" if state.get("grounded_destination") else "procedural",
        "qualityAudit": {
            "orchestrator": "LangGraph Stateful Supervisor v5",
            "decisionEngine": "TypeSafe AI Jev (System One)",
            "noulConfidence": state.get("jev_audit", {}).get("confidence", 0.95),
            "reasoning": state.get("jev_audit", {}).get("reasoning", "Optimal"),
            "selfHealedLoops": max(0, state.get("iterations", 1) - 1),
        }
    }
    
    return {"final_plan": final_payload}


# ---------------------------------------------------------------------------
# 3. Assemble the LangGraph Workflow
# ---------------------------------------------------------------------------
def build_orchestrator_graph():
    builder = StateGraph(TripState)
    
    builder.add_node("grounding", grounding_node)
    builder.add_node("flight_worker", flight_worker_node)
    builder.add_node("hotel_worker", hotel_worker_node)
    builder.add_node("itinerary_worker", itinerary_worker_node)
    builder.add_node("jev_audit", jev_audit_node)
    builder.add_node("budget_rebalancer", budget_rebalancer_node)
    builder.add_node("compiler", compiler_node)
    
    # Graph execution flow
    builder.add_edge(START, "grounding")
    builder.add_edge("grounding", "flight_worker")
    builder.add_edge("flight_worker", "hotel_worker")
    builder.add_edge("hotel_worker", "itinerary_worker")
    builder.add_edge("itinerary_worker", "jev_audit")
    
    # Conditional loop: route to compiler if Jev approves; otherwise loop to budget_rebalancer
    builder.add_conditional_edges(
        "jev_audit",
        lambda s: "approved" if s.get("is_approved", True) else "rebalance",
        {
            "approved": "compiler",
            "rebalance": "budget_rebalancer",
        }
    )
    
    builder.add_edge("budget_rebalancer", "jev_audit")
    builder.add_edge("compiler", END)
    
    return builder.compile()

# Compile the master orchestrator graph singleton
travel_orchestrator = build_orchestrator_graph()


def execute_trip_orchestration(
    origin: str,
    destination: str,
    days: int,
    budget_tier: str,
    traveler_type: str = "Solo",
    interests: Optional[List[str]] = None,
    user_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Public execution entry point for Stack 5 trip generation.
    """
    initial_state: TripState = {
        "origin": origin,
        "destination": destination,
        "days": int(days),
        "budget_tier": budget_tier,
        "traveler_type": traveler_type,
        "interests": interests or ["Sightseeing", "Local Food"],
        "user_email": user_email,
        "iterations": 0,
        "is_approved": False,
    }
    
    result = travel_orchestrator.invoke(initial_state)
    return result.get("final_plan", {})
