// Free place check against OpenStreetMap (Nominatim): "does a place with this name exist in this city?"
// Pure module (no React / React Native imports) so it can be unit-tested with fake fetch + storage.
// It never throws: any failure or timeout returns "unknown" and shows nothing in the UI.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_KEY = "@goguide_place_verify_v1";
const POSITIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // found: re-check after 30 days
const NEGATIVE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // not found: re-check after 3 days
const MAX_CACHE_ENTRIES = 400;

export const MAX_STOPS_PER_TRIP = 8;
const REQUEST_GAP_MS = 1100; // Nominatim policy: at most about 1 request per second

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "near", "visit", "tour", "trip", "walk", "stroll", "explore",
  "day", "night", "morning", "evening", "afternoon", "local", "traditional", "famous", "old", "new", "city",
  "dinner", "lunch", "breakfast", "cruise", "show", "experience", "sunset", "sunrise", "view", "views",
]);

const NOT_A_PLACE =
  /^(free time|leisure|rest|relax|check[\s-]?in|check[\s-]?out|arrival|departure|transfer|travel|flight|airport transfer|packing|sleep|buffer)\b/i;

const strip = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "Dinner at Souk Al Bahar" -> "Souk Al Bahar" */
export function cleanPlaceName(name) {
  return String(name || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(dinner|lunch|breakfast|brunch|coffee|visit|explore|walk through|walk along|stroll through|stroll along|tour of|sunset at|sunrise at)\s+(at|in|to|of)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokens(name) {
  return strip(cleanPlaceName(name))
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/** Generic items (free time, transfers) are not real places, so they are never looked up. */
export function isVerifiable(name) {
  const n = String(name || "").trim();
  return n.length >= 3 && !NOT_A_PLACE.test(n) && significantTokens(n).length > 0;
}

export function stopKey(name, city) {
  return `${strip(cleanPlaceName(name))}|${strip(String(city || "").split(",")[0])}`;
}

/** A result is a match when most of the place's own words appear in it, and so does the city. */
export function isMatch(result, name, city) {
  if (!result) return false;
  const tokens = significantTokens(name);
  if (tokens.length === 0) return false;
  const haystack = strip(`${result.name || ""} ${result.display_name || ""}`);
  const hits = tokens.filter((t) => haystack.includes(t)).length;
  if (hits / tokens.length < 0.5) return false;
  const cityToken = strip(String(city || "").split(",")[0]);
  return !cityToken || haystack.includes(cityToken);
}

/**
 * Looks one place up. Resolves to { verified, lat, lng } or null when unknown (network error,
 * timeout, bad response). null is never cached, so it is retried next time.
 */
export async function verifyPlace(name, city, { fetchFn = globalThis.fetch, timeoutMs = 6000 } = {}) {
  if (!isVerifiable(name) || typeof fetchFn !== "function") return null;
  const query = `${cleanPlaceName(name)}, ${String(city || "").trim()}`.replace(/,\s*$/, "");
  const url = `${NOMINATIM_URL}?format=json&limit=3&addressdetails=0&accept-language=en&q=${encodeURIComponent(query)}`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { headers: { "User-Agent": "GoGuideApp/2.0" }, signal: controller?.signal });
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const hit = data.find((r) => isMatch(r, name, city));
    if (!hit) return { verified: false };
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    return { verified: true, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Picks up to `max` stops, spreading them across days (first stop of each day first). */
export function pickStops(trip, max = MAX_STOPS_PER_TRIP) {
  const city = trip?.destination || "";
  const days = Array.isArray(trip?.itinerary) ? trip.itinerary : [];
  const picked = [];
  const seen = new Set();
  const maxLen = Math.max(0, ...days.map((d) => (Array.isArray(d?.activities) ? d.activities.length : 0)));
  for (let i = 0; i < maxLen && picked.length < max; i++) {
    for (const d of days) {
      const act = Array.isArray(d?.activities) ? d.activities[i] : null;
      const name = act?.placeName || act?.name;
      if (!name || !isVerifiable(name)) continue;
      const key = stopKey(name, city);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ key, name, city });
      if (picked.length >= max) break;
    }
  }
  return picked;
}

async function readCache(store) {
  try {
    const raw = await store?.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCache(store, cache) {
  try {
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0)).slice(0, keys.length - MAX_CACHE_ENTRIES).forEach((k) => delete cache[k]);
    }
    await store?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* cache is a convenience only */
  }
}

const fresh = (entry, now) =>
  entry && typeof entry.t === "number" && now - entry.t < (entry.v ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS);

/**
 * Verifies up to `max` stops of a trip in the background. Calls onResult(key, { verified, lat, lng })
 * as each result arrives (cached ones immediately). Curated plans are already verified and skipped.
 */
export async function verifyTripStops(
  trip,
  { store, fetchFn, max = MAX_STOPS_PER_TRIP, delayMs = REQUEST_GAP_MS, timeoutMs, sleep, isCancelled = () => false, onResult = () => {}, now = Date.now } = {}
) {
  if (!trip || trip.coordinatesVerified === true) return {};
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const stops = pickStops(trip, max);
  const cache = await readCache(store);
  const results = {};
  let networkCalls = 0;
  let dirty = false;

  for (const stop of stops) {
    if (isCancelled()) break;
    const cached = cache[stop.key];
    if (fresh(cached, now())) {
      results[stop.key] = { verified: !!cached.v, lat: cached.lat ?? null, lng: cached.lng ?? null };
      onResult(stop.key, results[stop.key]);
      continue;
    }
    if (networkCalls > 0) await wait(delayMs);
    if (isCancelled()) break;
    networkCalls += 1;
    const r = await verifyPlace(stop.name, stop.city, { fetchFn, timeoutMs });
    if (!r) continue; // unknown: show nothing, retry next time
    cache[stop.key] = { v: r.verified, lat: r.lat ?? null, lng: r.lng ?? null, t: now() };
    dirty = true;
    results[stop.key] = r;
    onResult(stop.key, r);
  }
  if (dirty) await writeCache(store, cache);
  return results;
}
