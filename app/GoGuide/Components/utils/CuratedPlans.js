import CURATED from "../constants/curatedPlans.json" with { type: "json" };

/**
 * Verified, hand-curated itineraries bundled inside the app (generated from the backend's
 * curated_destinations.py by tools/export_curated.py). They work with no network and no AI,
 * so they open instantly and are a safe fallback when the server is unreachable.
 */

/** Whole-word match so "rome" does not match "chrome". Returns the catalog key or null. */
export function findCuratedKey(destination) {
  const clean = String(destination || "").trim().toLowerCase();
  if (!clean) return null;
  for (const key of Object.keys(CURATED)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(clean)) return key;
  }
  return null;
}

export function hasCuratedPlan(destination) {
  return findCuratedKey(destination) !== null;
}

/**
 * Builds a plan in the same shape the backend returns ({ trip: {...} }), or null when the
 * destination is not in the verified catalog. Never invents data and never repeats days
 * using modulo cycling.
 */
export function buildCuratedPlan(destination, days, budget, options = {}) {
  const allowPartial = Boolean(options && options.allowPartial);
  const key = findCuratedKey(destination);
  if (!key) return null;
  const entry = CURATED[key];
  const reqDays = Math.max(1, parseInt(days, 10) || 3);
  const base = entry.days;

  // Never cycle base days using modulo arithmetic. If requested days exceed available
  // verified days and allowPartial is false, return null so that the dynamic AI generator
  // crafts a bespoke multi-day plan with 100% unique attractions across all days.
  if (!allowPartial && reqDays > base.length) {
    return null;
  }

  const actualDays = Math.min(reqDays, base.length);
  const itinerary = [];
  for (let d = 1; d <= actualDays; d++) {
    const src = base[d - 1];
    itinerary.push({ ...src, day: d, activities: src.activities.map((a) => ({ ...a })) });
  }

  return {
    trip: {
      destination: entry.destination,
      duration: `${actualDays} Days ${Math.max(1, actualDays - 1)} Nights`,
      budget: budget || "Moderate",
      hotels: entry.hotels.map((h) => ({ ...h })),
      itinerary,
      coordinatesVerified: true,
      source: "curated",
    },
  };
}
