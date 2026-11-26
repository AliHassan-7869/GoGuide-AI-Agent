// What leaves the device when a trip is shared. Pure module (unit-tested).

// Only itinerary content is published. Anything else (expenses, e-mail, owner ids, new private fields) stays private.
const SHARED_PLAN_FIELDS = [
  "destination", "duration", "budget", "traveler", "origin", "startDate", "endDate", "totalDays", "totalNoOfDays",
  "itinerary", "hotels", "flights", "weatherBrief", "packingList", "overview", "logistics", "safety",
  "heroImage", "image", "coordinatesVerified", "qualityAudit",
];

export function publicPlan(plan) {
  const out = {};
  SHARED_PLAN_FIELDS.forEach((key) => {
    if (plan?.[key] !== undefined) out[key] = plan[key];
  });
  return out;
}

// Ids like "trip_1712345678901" can be guessed, and a share link is readable by anyone who has its id.
const GUESSABLE_ID = /^((trip|cloned|curated|draft|ai)[_-].*|current-trip|shared|cached|\d+)$/i;

export const needsRandomShareId = (tripId) => !tripId || GUESSABLE_ID.test(String(tripId)) || String(tripId).length < 16;

const STORE_KEY = "@goguide_share_ids";

/**
 * The id used in a trip's share link. Hard-to-guess ids (Firestore) are used as they are; others get a
 * random id that is remembered, so sharing the same trip again gives the same link.
 */
export async function resolveShareId(tripId, { storage, randomBytes }) {
  if (!needsRandomShareId(tripId)) return String(tripId);
  const local = String(tripId || "current-trip");
  let map = {};
  try {
    map = JSON.parse((await storage.getItem(STORE_KEY)) || "{}") || {};
  } catch {
    map = {};
  }
  if (!map[local]) {
    map[local] = `s_${Array.from(randomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    try {
      await storage.setItem(STORE_KEY, JSON.stringify(map));
    } catch {
      // The link still works; sharing again would simply create another one.
    }
  }
  return map[local];
}
