/**
 * Google Maps URL builders. Always prefer exact numeric lat/lng over address
 * strings; only fall back to a text query when no valid coordinates exist.
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
const text = (name, destination) =>
  encodeURIComponent(`${name || ""} ${destination || ""}`.trim());

/** https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving */
export function directionsUrl(item, destination) {
  const c = coordsOf(item);
  const dest = c ? fmt(c) : text(item?.placeName || item?.name, destination);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

/** Pin on the map for a single place. */
export function placeUrl(item, destination) {
  const c = coordsOf(item);
  const q = c ? fmt(c) : text(item?.placeName || item?.name, destination);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Multi-stop driving route; each stop uses exact coordinates when available. */
export function routeUrl(stops, destination) {
  const pts = (stops || []).map((s) =>
    coordsOf(s) ? fmt(coordsOf(s)) : `${s?.placeName || s?.name || ""} ${destination || ""}`.trim()
  );
  if (pts.length === 0) return null;
  if (pts.length === 1) return directionsUrl(stops[0], destination);
  const origin = encodeURIComponent(pts[0]);
  const dest = encodeURIComponent(pts[pts.length - 1]);
  const mid = pts.slice(1, -1);
  const waypoints = mid.length ? `&waypoints=${encodeURIComponent(mid.join("|"))}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints}&travelmode=driving`;
}
