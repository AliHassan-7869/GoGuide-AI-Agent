import CURATED from "../constants/curatedPlans.json";

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
 * destination is not in the verified catalog. Never invents data.
 */
export function buildCuratedPlan(destination, days, budget) {
  const key = findCuratedKey(destination);
  if (!key) return null;
  const entry = CURATED[key];
  const totalDays = Math.min(30, Math.max(1, parseInt(days, 10) || 3));
  const base = entry.days;

  const itinerary = [];
  for (let d = 1; d <= totalDays; d++) {
    const src = base[(d - 1) % base.length];
    itinerary.push({ ...src, day: d, activities: src.activities.map((a) => ({ ...a })) });
  }

  return {
    trip: {
      destination: entry.destination,
      duration: `${totalDays} Days ${Math.max(1, totalDays - 1)} Nights`,
      budget: budget || "Moderate",
      hotels: entry.hotels.map((h) => ({ ...h })),
      itinerary,
      coordinatesVerified: true,
      source: "curated",
    },
  };
}
