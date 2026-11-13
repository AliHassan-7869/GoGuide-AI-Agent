/**
 * The Copilot helps with questions; full plans come from the trip planner (saved, mapped, budgeted).
 * When the user asks for a plan, the reply gets a "Plan this trip" button that opens the planner.
 */
export const PLAN_REQUEST_RE =
  /\b(plan|itinerary|schedule|bana\s*do|banao)\b[\s\S]*\b(trip|tour|days?|din|week|weekend|itinerary|vacation|holiday)\b|\b\d+\s*-?\s*(days?|din|nights?)\b[\s\S]*\b(trip|tour|plan|itinerary|in|to)\b|\b(plan|create|make|build|generate)\s+(a|my|me\s+a)\b[\s\S]*\b(trip|itinerary)\b/i;
export const isPlanRequest = (text) => PLAN_REQUEST_RE.test(String(text || ""));
