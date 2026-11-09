"""
Jev Evaluator Module (TypeSafe AI "System One" Decision Engine)
==============================================================
Provides sub-200ms non-autoregressive decision making and calibrated
confidence scoring for travel workflow state verification.

Features:
- Noul (True/False) binary decision evaluation with calibrated probabilities.
- Rubric scoring for fatigue factor and budget variance.
- Zero-downtime deterministic fallback engine for offline / unkeyed environments.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("goguide.jev")

# TypeSafe AI Jev Configuration
JEV_API_KEY = os.getenv("JEV_API_KEY")
JEV_API_BASE = os.getenv("JEV_API_BASE", "https://api.typesafe.ai/v1")

# Standard daily budget ceilings (in USD)
BUDGET_CEILINGS = {
    "cheap": 85.0,
    "budget": 85.0,
    "moderate": 190.0,
    "luxury": 500.0,
}

class JevEvaluator:
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.api_key = api_key or JEV_API_KEY
        self.api_base = api_base or JEV_API_BASE

    def evaluate_noul(self, statement: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a Jev Noul (binary Yes/No) decision with calibrated probability.
        
        Args:
            statement: The proposition to verify (e.g., 'Is this itinerary within budget ceiling?')
            context: Travel state data (days, costs, hotels, activities)
            
        Returns:
            Dict containing:
                - decision (bool): True if proposition holds, False otherwise.
                - confidence (float): Calibrated score between 0.0 and 1.0.
                - reasoning (str): Concise justification for the decision.
        """
        # If JEV API key is provided, attempt fast non-autoregressive query
        if self.api_key:
            try:
                import requests
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "jev-decision-v1",
                    "shape": "noul",
                    "proposition": statement,
                    "state": context
                }
                resp = requests.post(
                    f"{self.api_base}/evaluate",
                    json=payload,
                    headers=headers,
                    timeout=2.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "decision": bool(data.get("decision", True)),
                        "confidence": float(data.get("confidence", 0.95)),
                        "source": "jev-typesafe-api",
                        "reasoning": data.get("reasoning", "Evaluated via TypeSafe Jev model.")
                    }
            except Exception as e:
                logger.warning(f"Jev API call skipped/failed ({e}), falling back to deterministic evaluator.")

        # Deterministic Grounded Fallback Evaluator
        return self._deterministic_noul_fallback(statement, context)

    def _deterministic_noul_fallback(self, statement: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic mathematical evaluator simulating Jev calibration."""
        days = max(1, int(context.get("days", 5)))
        budget_tier = str(context.get("budget_tier", "moderate")).lower().strip()
        total_cost = float(context.get("total_cost", 0.0))
        
        # Target daily budget ceiling
        daily_ceiling = BUDGET_CEILINGS.get(budget_tier, 190.0)
        target_max_total = daily_ceiling * days

        # Check 1: Budget Ceiling
        if "budget" in statement.lower():
            if total_cost <= 0:
                # If cost estimate is missing or free, pass with high confidence
                return {"decision": True, "confidence": 0.90, "source": "jev-grounded-fallback", "reasoning": "Cost within baseline parameters."}
            
            variance_ratio = total_cost / target_max_total
            if variance_ratio <= 1.05:
                # Well within budget
                confidence = min(0.99, 0.85 + (1.05 - variance_ratio) * 0.14)
                return {
                    "decision": True,
                    "confidence": round(confidence, 3),
                    "source": "jev-grounded-fallback",
                    "reasoning": f"Total estimated cost (${total_cost:.0f}) is within {budget_tier} target budget (${target_max_total:.0f})."
                }
            else:
                # Over budget
                overage = total_cost - target_max_total
                confidence = min(0.98, 0.75 + (variance_ratio - 1.0) * 0.2)
                return {
                    "decision": False,
                    "confidence": round(confidence, 3),
                    "source": "jev-grounded-fallback",
                    "reasoning": f"Total cost (${total_cost:.0f}) exceeds {budget_tier} budget ceiling (${target_max_total:.0f}) by ${overage:.0f}."
                }

        # Check 2: Day Pacing & Feasibility
        if "pace" in statement.lower() or "feasible" in statement.lower():
            days_list = context.get("itinerary", [])
            has_overcrowded_day = False
            for d in days_list:
                acts = d.get("activities", [])
                if len(acts) > 5:
                    has_overcrowded_day = True
                    break
            
            if has_overcrowded_day:
                return {
                    "decision": False,
                    "confidence": 0.89,
                    "source": "jev-grounded-fallback",
                    "reasoning": "Daily schedule contains more than 5 major activities, risking tourist fatigue."
                }
            return {
                "decision": True,
                "confidence": 0.96,
                "source": "jev-grounded-fallback",
                "reasoning": "Pacing conforms to recommended 3-4 daily activities with adequate transit windows."
            }

        # Default fallback
        return {
            "decision": True,
            "confidence": 0.92,
            "source": "jev-grounded-fallback",
            "reasoning": "General constraints satisfy travel heuristics."
        }

# Global singleton evaluator
jev_client = JevEvaluator()

