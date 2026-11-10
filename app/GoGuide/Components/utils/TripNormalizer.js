import { sanitizeTripCoordinates } from "./mapsLinks";
/**
 * Resilient JSON Parser
 * Recovers malformed LLM outputs: unquoted property names, single quotes,
 * smart quotes, trailing commas, markdown fences, and truncated brackets.
 */
export function robustParseJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  let s = raw.trim();
  // Strip markdown code blocks ```json ... ```
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Find outermost { ... }
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct standard parse attempt
  try {
    return JSON.parse(s);
  } catch (e1) {
    // Continue to repair
  }

  // 2. Normalize smart / curly quotes
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // 3. Fix unquoted property names (e.g. { name: "...", , price: "..." or \n day: 1)
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 4. Fix single-quoted property names ({'name': "...")
  s = s.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');

  // 5. Fix single-quoted string values (: 'value')
  s = s.replace(/:\s*'([^']*)'/g, ': "$1"');

  // 6. Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 7. Remove single-line comments // ... and multi-line comments /* ... */
  s = s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  try {
    return JSON.parse(s);
  } catch (e2) {
    // Continue to bracket repair
  }

  // 8. Auto-repair truncated JSON (e.g. LLM token limits)
  const quoteCount = (s.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    s += '"';
  }
  let openBraces = (s.match(/\{/g) || []).length;
  let closeBraces = (s.match(/\}/g) || []).length;
  let openBrackets = (s.match(/\[/g) || []).length;
  let closeBrackets = (s.match(/\]/g) || []).length;

  while (openBrackets > closeBrackets) {
    s += "]";
    closeBrackets++;
  }
  while (openBraces > closeBraces) {
    s += "}";
    closeBraces++;
  }

  try {
    return JSON.parse(s);
  } catch (e3) {
    return null;
  }
}

/**
 * Universal Trip Normalizer
 * Standardizes any shape of travel plan (AI raw JSON, Firestore document, 
 * AsyncStorage cache, stringified JSON, or nested wrappers) into a clean, 
 * crash-proof structure with guaranteed array types.
 */
export function normalizeTrip(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && Object.keys(raw).length === 0) return null;

  let data = raw;
  if (typeof data === "string") {
    data = robustParseJson(data);
    if (!data) return null;
  }

  // Unnest common nested wrapper keys (up to 6 levels deep)
  let depth = 0;
  while (depth < 6 && data && typeof data === "object") {
    if (data.trip && typeof data.trip === "object") {
      data = data.trip;
    } else if (data.aiTripPlan && typeof data.aiTripPlan === "object") {
      data = data.aiTripPlan;
    } else if (
      data.tripData &&
      typeof data.tripData === "object" &&
      (data.tripData.itinerary || data.tripData.destination || data.tripData.aiTripPlan || data.tripData.hotels)
    ) {
      data = data.tripData.aiTripPlan || data.tripData;
    } else if (data.travelPlan && typeof data.travelPlan === "object") {
      data = data.travelPlan;
    } else if (
      data.plan &&
      typeof data.plan === "object" &&
      (data.plan.itinerary || data.plan.destination || data.plan.hotels)
    ) {
      data = data.plan;
    } else {
      break;
    }
    depth++;
  }

  if (typeof data === "string") {
    data = robustParseJson(data) || data;
  }

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) return null;

  // Check if there is actual meaningful content
  const foundDestination =
    data.destination ||
    data.locationInfo?.name ||
    data.toLocation?.name ||
    data.toLocation ||
    raw.destination ||
    raw.toLocation?.name ||
    null;

  const rawItin = data.itinerary || data.days || data.schedule || raw.itinerary || [];
  const rawHotels = data.hotels || data.hotelList || raw.hotels || [];

  const hasContent = Boolean(
    foundDestination ||
    (Array.isArray(rawItin) && rawItin.length > 0) ||
    (typeof rawItin === "object" && Object.keys(rawItin).length > 0) ||
    (Array.isArray(rawHotels) && rawHotels.length > 0)
  );

  if (!hasContent) {
    return null;
  }

  // 1. Destination
  const destination = foundDestination || "Trip Destination";

  // 2. Duration
  const duration =
    data.duration ||
    (data.totalNoOfDays ? `${data.totalNoOfDays} Days` : null) ||
    (data.totalDays ? `${data.totalDays} Days` : null) ||
    raw.duration ||
    (raw.totalNoOfDays ? `${raw.totalNoOfDays} Days` : null) ||
    "3 Days";

  // 3. Budget
  const budget =
    typeof data.budget === "object"
      ? data.budget?.tier || data.budget?.title || "Moderate"
      : data.budget || raw.budget || "Moderate";

  // 4. Traveler
  const traveler =
    data.traveler?.title ||
    data.traveler ||
    data.travelers ||
    raw.traveler ||
    "Explorer";

  // 5. Itinerary -> Guaranteed to be an Array of { day, theme, activities: Array }
  let itinerary = [];

  if (Array.isArray(rawItin)) {
    itinerary = rawItin.map((d, idx) => {
      const dayNum = Number(d.day) || idx + 1;
      const theme = d.theme || d.title || d.heading || `Day ${dayNum} Exploration`;
      const rawActs = d.activities || d.plan || d.places || d.schedule || [];
      const activities = Array.isArray(rawActs)
        ? rawActs.map((a) => {
            if (typeof a === "string") {
              return { time: "Scheduled", placeName: a, details: a, tickets: "" };
            }
            return {
              time: a?.time || a?.timeSlot || "Scheduled",
              placeName: a?.placeName || a?.name || a?.activity || a?.title || "City Highlight",
              details: a?.details || a?.description || a?.notes || "",
              tickets: a?.tickets || a?.ticketPrice || a?.cost || "",
              coordinates: a?.coordinates || a?.geo || null,
            };
          })
        : [];
      return {
        day: dayNum,
        theme,
        activities,
      };
    });
  } else if (rawItin && typeof rawItin === "object") {
    // Handle dictionaries like { "day1": { ... }, "day2": { ... } }
    const keys = Object.keys(rawItin).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

    itinerary = keys.map((k, idx) => {
      const d = rawItin[k] || {};
      const dayNum = Number(d.day) || parseInt(k.replace(/\D/g, ""), 10) || idx + 1;
      const theme = d.theme || d.title || d.heading || `Day ${dayNum} Exploration`;
      const rawActs = d.activities || d.plan || d.places || d.schedule || [];
      const activities = Array.isArray(rawActs)
        ? rawActs.map((a) => {
            if (typeof a === "string") {
              return { time: "Scheduled", placeName: a, details: a, tickets: "" };
            }
            return {
              time: a?.time || a?.timeSlot || "Scheduled",
              placeName: a?.placeName || a?.name || a?.activity || a?.title || "City Highlight",
              details: a?.details || a?.description || a?.notes || "",
              tickets: a?.tickets || a?.ticketPrice || a?.cost || "",
              coordinates: a?.coordinates || a?.geo || null,
            };
          })
        : [];
      return {
        day: dayNum,
        theme,
        activities,
      };
    });
  }

  // 6. Hotels -> Guaranteed to be an Array
  let hotels = [];
  if (Array.isArray(rawHotels)) {
    hotels = rawHotels.map((h) => {
      if (typeof h === "string") {
        return { name: h, address: destination, price: "N/A", rating: "4.5" };
      }
      return {
        name: h?.name || h?.hotelName || "Verified Stay",
        address: h?.address || h?.hotelAddress || destination,
        price: h?.price || h?.hotelPrice || "Competitive Rate",
        rating: h?.rating || h?.hotelRating || "4.7",
        geoCoordinates: h?.geoCoordinates || h?.coordinates || null,
        description: h?.description || "",
      };
    });
  }

  // 7. Flights & Weather & PackingList
  const flights = data.flights || raw.flights || null;
  const weatherBrief = data.weatherBrief || raw.weatherBrief || "";
  const packingList = Array.isArray(data.packingList) ? data.packingList : Array.isArray(raw.packingList) ? raw.packingList : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : Array.isArray(raw.expenses) ? raw.expenses : [];

  return sanitizeTripCoordinates({
    ...data,
    destination,
    duration,
    budget,
    traveler,
    itinerary,
    hotels,
    flights,
    weatherBrief,
    packingList,
    expenses,
  });
}
