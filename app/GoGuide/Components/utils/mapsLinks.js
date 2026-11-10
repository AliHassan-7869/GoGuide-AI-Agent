/**
 * Google Maps URL builders.
 *
 * Trust model:
 *  - Verified plans (hand-curated data, `coordinatesVerified`) carry exact, checked coordinates,
 *    so links use the exact lat/lng.
 *  - AI-generated plans contain coordinates that are frequently wrong, so links use a text search
 *    ("place name + city"), which Google resolves to the real place. Coordinates are only used
 *    when there is no usable name.
 *  - `sanitizeTripCoordinates` additionally drops coordinates that are obviously invalid
 *    (0,0, wrong city, very low precision, one point reused for many places).
 */

/** Returns { lat, lng } as finite numbers, or null if missing / (0,0) / out of range. */
export function parseCoords(input) {
  if (!input) return null;
  const rawLat = input.lat ?? input.latitude;
  const rawLng = input.lng ?? input.lon ?? input.longitude;
  const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat;
  const lng = typeof rawLng === "string" ? parseFloat(rawLng) : rawLng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // LLM templates emit 0.0/0.0 as "unknown"; "Null Island" is never a real stop.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** Coordinates for any itinerary item (activity or hotel; handles both field names). */
export function coordsOf(item) {
  return parseCoords(item?.coordinates) || parseCoords(item?.geoCoordinates) || parseCoords(item);
}

const fmt = (c) => `${c.lat},${c.lng}`;

// Names the model emits when it has nothing real to say; searching for them is pointless.
const PLACEHOLDER_NAME = /^(place or attraction name|attraction or dining name|hotel name|city highlight|verified stay|unknown)$/i;

function usableName(item) {
  const name = String(item?.placeName || item?.name || "").trim();
  return name && !PLACEHOLDER_NAME.test(name) ? name : "";
}

/** Text to search: "<name>, <address or city>". */
function searchText(item, destination) {
  const name = usableName(item);
  if (!name) return "";
  const place = String(item?.address || destination || "").trim();
  return place && !name.toLowerCase().includes(place.toLowerCase()) ? `${name}, ${place}` : name;
}

/** The location string to hand to Google for one stop: exact coords if verified, else text. */
function stopLocation(item, destination) {
  const c = coordsOf(item);
  if (c && item?.coordsVerified) return fmt(c);
  const text = searchText(item, destination);
  if (text) return text;
  if (c) return fmt(c); // no name at all: best effort with whatever coordinates survive checks
  return String(destination || "").trim();
}

/** Directions from the user's current location to one stop. */
export function directionsUrl(item, destination) {
  const loc = stopLocation(item, destination);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}&travelmode=driving`;
}

/** Pin on the map for a single place. */
export function placeUrl(item, destination) {
  const loc = stopLocation(item, destination);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
}

// Google Maps URLs accept at most 9 waypoints (11 stops including origin and destination).
const MAX_STOPS = 11;

/** Multi-stop route through the day's stops, in order. */
export function routeUrl(stops, destination) {
  const seen = new Set();
  const pts = [];
  for (const s of stops || []) {
    const loc = stopLocation(s, destination);
    const key = loc.toLowerCase();
    if (!loc || seen.has(key)) continue; // skip empty and duplicate stops
    seen.add(key);
    pts.push(loc);
  }
  if (pts.length === 0) return null;
  const limited = pts.slice(0, MAX_STOPS);
  if (limited.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(limited[0])}&travelmode=driving`;
  }
  const origin = encodeURIComponent(limited[0]);
  const dest = encodeURIComponent(limited[limited.length - 1]);
  const mid = limited.slice(1, -1);
  const waypoints = mid.length ? `&waypoints=${encodeURIComponent(mid.join("|"))}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints}&travelmode=driving`;
}

// ---------------------------------------------------------------------------------------------
// Coordinate sanity checks
// ---------------------------------------------------------------------------------------------
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const median = (arr) => {
  const s = [...arr].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const decimals = (n) => {
  const str = String(n);
  const i = str.indexOf(".");
  return i < 0 ? 0 : str.length - i - 1;
};

const MAX_FROM_CENTER_KM = 120; // allows day trips, rejects "wrong city / wrong continent"
const MAX_SAME_POINT_PLACES = 3; // one coordinate reused for 3+ places is a template default

/**
 * Returns a copy of the trip where unreliable coordinates are removed (set to null), and every
 * remaining coordinate is tagged `coordsVerified` only when the whole plan is curated.
 */
export function sanitizeTripCoordinates(trip) {
  if (!trip || typeof trip !== "object") return trip;
  const verified = trip.coordinatesVerified === true;

  const acts = [];
  (trip.itinerary || []).forEach((d) => (d?.activities || []).forEach((a) => acts.push(a)));
  const hotels = trip.hotels || [];
  const all = [...acts, ...hotels];

  // 1. Basic validity + precision (two or fewer decimals is ~1 km, and usually a guess)
  const info = new Map();
  all.forEach((item) => {
    const c = coordsOf(item);
    if (!c) return info.set(item, null);
    const lowPrecision = decimals(c.lat) <= 1 && decimals(c.lng) <= 1;
    info.set(item, lowPrecision && !verified ? null : c);
  });

  // 2. Outliers far from the median of all points (hallucinated wrong city)
  const valid = [...info.values()].filter(Boolean);
  if (valid.length >= 3 && !verified) {
    const center = { lat: median(valid.map((c) => c.lat)), lng: median(valid.map((c) => c.lng)) };
    info.forEach((c, item) => {
      if (c && distanceKm(center, c) > MAX_FROM_CENTER_KM) info.set(item, null);
    });
  }

  // 3. The same exact point used for several different places
  if (!verified) {
    const byPoint = new Map();
    info.forEach((c, item) => {
      if (!c) return;
      const k = `${c.lat},${c.lng}`;
      byPoint.set(k, [...(byPoint.get(k) || []), item]);
    });
    byPoint.forEach((items) => {
      const names = new Set(items.map((i) => usableName(i).toLowerCase()));
      if (items.length >= MAX_SAME_POINT_PLACES && names.size >= MAX_SAME_POINT_PLACES) {
        items.forEach((i) => info.set(i, null));
      }
    });
  }

  const apply = (item) => {
    const c = info.get(item);
    const next = { ...item };
    if ("coordinates" in next || !("geoCoordinates" in next)) next.coordinates = c || null;
    if ("geoCoordinates" in next) next.geoCoordinates = c || null;
    next.coordsVerified = Boolean(c && verified);
    return next;
  };

  return {
    ...trip,
    hotels: hotels.map(apply),
    itinerary: (trip.itinerary || []).map((d) => ({ ...d, activities: (d?.activities || []).map(apply) })),
  };
}
