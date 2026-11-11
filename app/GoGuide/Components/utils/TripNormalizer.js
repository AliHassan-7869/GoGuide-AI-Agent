import { sanitizeTripCoordinates } from "./mapsLinks.js";
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

/**
 * Canonical Date & Duration Derivation (Single Source of Truth)
 * Guarantees flights, hotel nights, day tabs, and calendar events are 100% aligned.
 */
export function deriveTripDates(startDateInput, totalDaysInput) {
  let start = startDateInput ? new Date(startDateInput) : new Date();
  if (isNaN(start.getTime())) {
    start = new Date();
  }
  // Normalize to start of day
  const startNorm = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const totalDays = Math.max(1, parseInt(totalDaysInput, 10) || 1);
  const endNorm = new Date(startNorm.getTime() + Math.max(0, totalDays - 1) * 86400000);

  const pad = (n) => String(n).padStart(2, "0");
  const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const departureDate = toIsoDate(startNorm);
  const returnDate = toIsoDate(endNorm);
  const nights = Math.max(1, totalDays - 1);
  const durationLabel = `${totalDays} Day${totalDays > 1 ? "s" : ""} ${nights} Night${nights > 1 ? "s" : ""}`;

  const days = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(startNorm.getTime() + i * 86400000);
    const dayIndex = i + 1;
    days.push({
      day: dayIndex,
      date: toIsoDate(cur),
      displayDate: `${dayNames[cur.getDay()]}, ${monthNames[cur.getMonth()]} ${cur.getDate()}`,
      shortDate: `${cur.getDate()} ${monthNames[cur.getMonth()]}`,
    });
  }

  return {
    startDate: startNorm,
    endDate: endNorm,
    departureDate,
    returnDate,
    totalDays,
    nights,
    durationLabel,
    days,
  };
}

/**
 * Normalizes an attraction name for deduplication comparison.
 */
function normalizePlaceName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Post-Generation Trip Plan Validator
 * Enforces quality guidelines:
 * - Expected day count matches actual days
 * - Unique attractions across the ENTIRE itinerary (no duplicate visits)
 * - Unique themes across all days
 * - Pacing: 2 to 5 stops per day
 *
 * Returns { isValid: boolean, errors: string[], warnings: string[] }
 */
export function validateTripPlan(plan, expectedDays = null) {
  const errors = [];
  const warnings = [];

  if (!plan || typeof plan !== "object") {
    return { isValid: false, errors: ["Plan payload is empty or invalid"], warnings: [] };
  }

  const itin = Array.isArray(plan.itinerary) ? plan.itinerary : [];
  if (itin.length === 0) {
    return { isValid: false, errors: ["Itinerary has 0 days"], warnings: [] };
  }

  if (expectedDays && typeof expectedDays === "number" && expectedDays > 0) {
    if (itin.length !== expectedDays) {
      errors.push(`Itinerary has ${itin.length} days; expected ${expectedDays} days`);
    }
  }

  const seenPlaces = new Map(); // normalizedName -> day
  const seenThemes = new Map(); // normalizedTheme -> day

  itin.forEach((d, idx) => {
    const dayNum = Number(d.day) || idx + 1;
    const rawTheme = (d.theme || d.title || "").trim();
    const normTheme = rawTheme.toLowerCase();

    if (normTheme) {
      if (seenThemes.has(normTheme)) {
        errors.push(`Duplicate day theme "${rawTheme}" on Day ${dayNum} (previously seen on Day ${seenThemes.get(normTheme)})`);
      } else {
        seenThemes.set(normTheme, dayNum);
      }
    }

    const activities = Array.isArray(d.activities) ? d.activities : [];
    if (activities.length === 0) {
      errors.push(`Day ${dayNum} has 0 activities`);
    } else if (activities.length < 2) {
      warnings.push(`Day ${dayNum} has only ${activities.length} activity (recommended: 2-5 stops)`);
    } else if (activities.length > 5) {
      warnings.push(`Day ${dayNum} has ${activities.length} activities (might be rushed; recommended: 2-5 stops)`);
    }

    activities.forEach((act) => {
      const rawName = act.placeName || act.name || act.activity || act.title || "";
      const normName = normalizePlaceName(rawName);

      // Skip generic placeholder labels
      if (!normName || normName === "city highlight" || normName === "scheduled") return;

      if (seenPlaces.has(normName)) {
        errors.push(`Duplicate attraction "${rawName}" found on Day ${dayNum} (already scheduled on Day ${seenPlaces.get(normName)})`);
      } else {
        seenPlaces.set(normName, dayNum);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
