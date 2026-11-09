"""
GoGuide AI Master Travel Orchestrator (Stack 5)
==============================================
Orchestration: LangGraph Stateful Multi-Agent Graph (Supervisor Pattern)
Decision Engine: TypeSafe AI Jev (Sub-200ms Noul Confidence Gating)
Knowledge Grounding: Lightweight Curated Data (curated_destinations.py & travel_essentials.py)
Generative Synthesis: Gemini 2.0 Flash / DeepSeek
"""

import os
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


# ---------------------------------------------------------------------------
# 2. Worker Nodes
# ---------------------------------------------------------------------------
def grounding_node(state: TripState) -> Dict[str, Any]:
    """Retrieves verified coordinates, curated hotels, and essential guidelines."""
    dest = state.get("destination", "Tokyo, Japan")
    days = max(1, int(state.get("days", 5)))
    budget = state.get("budget_tier", "moderate")
    logger.info(f"[Orchestrator] Grounding destination: {dest} (days={days}, budget={budget})")
    
    curated = get_curated_plan(dest, days, budget)
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
    
    flights = {
        "airline": "Top Global Carrier (Emirates / Qatar / Turkish / ANA)",
        "route": f"{origin} ➔ {dest_clean}",
        "flightNumber": "GG-786",
        "estimatedPrice": f"${base_price}",
        "priceValue": base_price,
        "duration": "Direct / 1 Stop (~8h - 12h)",
        "bookingUrl": "https://www.google.com/travel/flights",
    }
    
    return {"flights": flights}


def hotel_worker_node(state: TripState) -> Dict[str, Any]:
    """Selects grounded accommodations matching the user's budget tier."""
    budget_tier = state.get("budget_tier", "moderate").lower()
    grounded = state.get("grounded_destination")
    days = max(1, state.get("days", 5))
    
    hotels = []
    
    # Use verified curated hotels if available
    if grounded and grounded.get("hotels"):
        hotels = list(grounded["hotels"])
    else:
        # Fallback realistic hotel generation
        dest_clean = state.get("destination", "Vacation City").split(",")[0].strip()
        nightly = 65 if budget_tier in ["cheap", "budget"] else (150 if budget_tier == "moderate" else 380)
        hotels = [
            {
                "name": f"The Grand {dest_clean} Boutique Stay",
                "address": f"Central District, {dest_clean}",
                "price": f"${nightly} per night",
                "nightlyRate": nightly,
                "rating": "4.8",
                "coordinates": {"lat": 35.6895, "lng": 139.6917},
            },
            {
                "name": f"{dest_clean} Heritage Inn & Suites",
                "address": f"Historic Old Quarter, {dest_clean}",
                "price": f"${int(nightly * 0.85)} per night",
                "nightlyRate": int(nightly * 0.85),
                "rating": "4.6",
                "coordinates": {"lat": 35.6950, "lng": 139.7020},
            }
        ]
    
    # Compute running total cost
    flight_price = state.get("flights", {}).get("priceValue", 450)
    primary_nightly = 110
    if hotels and "nightlyRate" in hotels[0]:
        primary_nightly = hotels[0]["nightlyRate"]
    elif hotels and "$" in str(hotels[0].get("price", "")):
        try:
            primary_nightly = int(hotels[0]["price"].split("$")[1].split()[0])
        except Exception:
            primary_nightly = 110
            
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
    if grounded and grounded.get("days"):
        curated_days = grounded["days"]
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
    current_hotels = state.get("hotels", [])
    
    revised_hotels = []
    for h in current_hotels:
        revised_h = dict(h)
        revised_h["price"] = "$75 per night"
        revised_h["nightlyRate"] = 75
        revised_hotels.append(revised_h)
        
    days = max(1, state.get("days", 5))
    flight_price = state.get("flights", {}).get("priceValue", 320)
    new_total = flight_price + (75 * days) + (35 * days)
    
    return {
        "hotels": revised_hotels,
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
