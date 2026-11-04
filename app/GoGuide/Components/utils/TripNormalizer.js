/**
 * Universal Trip Normalizer
 * Standardizes any shape of travel plan (AI raw JSON, Firestore document, 
 * AsyncStorage cache, stringified JSON, or nested wrappers) into a clean, 
 * crash-proof structure with guaranteed array types.
 */
export function normalizeTrip(raw) {
  if (!raw) return null;
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return null;
    }
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
    try {
      data = JSON.parse(data);
    } catch (e) {}
  }

  if (!data || typeof data !== "object") return null;

  // 1. Destination
  const destination =
    data.destination ||
    data.locationInfo?.name ||
    data.toLocation?.name ||
    data.toLocation ||
    raw.destination ||
    raw.toLocation?.name ||
    "Trip Destination";

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
  let rawItin = data.itinerary || data.days || data.schedule || raw.itinerary || [];
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
              time: a.time || a.timing || "Scheduled",
              placeName: a.placeName || a.place || a.name || a.activity || "Attraction Spot",
              details: a.details || a.placeDetails || a.description || "Sightseeing and local visit.",
              tickets: a.tickets || a.ticketPrice || a.price || "",
              travelTime: a.travelTime || a.travel_time || a.duration || "",
            };
          })
        : [];
      return { day: dayNum, theme, activities };
    });
  } else if (rawItin && typeof rawItin === "object") {
    // If itinerary was an object { day1: {...}, day2: {...} } or { "Day 1": [...] }
    itinerary = Object.keys(rawItin).map((k, idx) => {
      const d = rawItin[k];
      const dayNum = Number(d?.day) || idx + 1;
      if (Array.isArray(d)) {
        return {
          day: dayNum,
          theme: `Day ${dayNum} Exploration`,
          activities: d.map((a) =>
            typeof a === "string"
              ? { time: "Scheduled", placeName: a, details: a, tickets: "" }
              : {
                  time: a.time || a.timing || "Scheduled",
                  placeName: a.placeName || a.place || a.name || a.activity || "Attraction Spot",
                  details: a.details || a.placeDetails || a.description || "",
                  tickets: a.tickets || a.ticketPrice || a.price || "",
                  travelTime: a.travelTime || a.travel_time || "",
                }
          ),
        };
      }
      const rawActs = d?.activities || d?.plan || d?.places || [];
      return {
        day: dayNum,
        theme: d?.theme || d?.title || `Day ${dayNum} Exploration`,
        activities: Array.isArray(rawActs)
          ? rawActs.map((a) =>
              typeof a === "string"
                ? { time: "Scheduled", placeName: a, details: a, tickets: "" }
                : {
                    time: a.time || a.timing || "Scheduled",
                    placeName: a.placeName || a.place || a.name || a.activity || "Attraction Spot",
                    details: a.details || a.placeDetails || a.description || "",
                    tickets: a.tickets || a.ticketPrice || a.price || "",
                    travelTime: a.travelTime || a.travel_time || "",
                  }
            )
          : [],
      };
    });
  }

  // 6. Hotels -> Guaranteed to be an Array
  let rawHotels = data.hotels || data.hotel || data.accommodations || raw.hotels || [];
  let hotels = [];
  if (Array.isArray(rawHotels)) {
    hotels = rawHotels.map((h) => {
      if (typeof h === "string") {
        return { name: h, address: destination, price: "$95/night", rating: "4.8" };
      }
      return {
        name: h.name || h.hotelName || "Boutique Hotel",
        address: h.address || h.location || h.details || destination,
        price: h.price || h.cost || h.pricing || "$110/night",
        rating: String(h.rating || "4.8"),
      };
    });
  }

  // 7. Flights
  const flights = data.flights || data.flightDetails || data.flight || raw.flights || null;

  return {
    ...data,
    destination,
    duration,
    budget,
    traveler,
    itinerary,
    hotels,
    flights,
  };
}

