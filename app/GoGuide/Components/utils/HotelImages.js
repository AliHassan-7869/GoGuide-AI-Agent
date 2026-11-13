import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Finds a REAL photo of a hotel on Wikipedia (free, no key). Only famous hotels have a page, so
 * this returns null for most mid-range hotels; callers then show a photo of the city instead
 * of a random, unrelated hotel picture. A result is accepted only when the page title really
 * matches the hotel name, so we never attach another hotel's photo.
 */

const GENERIC = new Set(["hotel", "hotels", "the", "by", "and", "resort", "suites", "inn", "palace", "a", "of", "at", "in"]);
const CACHE_PREFIX = "@goguide_hotel_img_v1:";
const HIT_TTL_MS = 60 * 24 * 3600 * 1000;
const MISS_TTL_MS = 7 * 24 * 3600 * 1000;
const TIMEOUT_MS = 4500;

export function nameTokens(text) {
  return (String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 1 && !GENERIC.has(w));
}

/**
 * True only when the page title is the same hotel as `name`: every distinctive word of the hotel
 * name (city words ignored) must appear in the title. "Grand Hyatt Tokyo" must NOT match
 * "Hyatt Regency Tokyo", because that is a different hotel.
 */
export function titleMatchesHotel(title, name, city = "") {
  const cityWords = new Set(nameTokens(city));
  const want = nameTokens(name).filter((w) => !cityWords.has(w));
  if (want.length === 0) return false;
  const have = new Set(nameTokens(title));
  return want.every((w) => have.has(w));
}

const inFlight = new Map();

async function lookup(name, city) {
  const query = `${name} ${city || ""} hotel`.trim();
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3" +
    `&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=thumbnail&pithumbsize=800`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return undefined; // rate limited / error: do not cache, try again later
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index || 99) - (b.index || 99));
    for (const p of pages) {
      if (p?.thumbnail?.source && titleMatchesHotel(p.title, name, city)) return p.thumbnail.source;
    }
    return null; // searched fine, nothing matching
  } catch {
    return undefined; // offline / timeout: do not cache
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves to an image URL, or null when no verified photo exists. Cached on the device. */
export async function fetchHotelImage(name, city) {
  if (!name) return null;
  const key = `${CACHE_PREFIX}${String(name).toLowerCase()}|${String(city || "").toLowerCase()}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { url, ts } = JSON.parse(raw);
      if (Date.now() - ts < (url ? HIT_TTL_MS : MISS_TTL_MS)) return url || null;
    }
  } catch {}

  if (inFlight.has(key)) return inFlight.get(key);
  const job = (async () => {
    const result = await lookup(name, city);
    if (result !== undefined) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify({ url: result, ts: Date.now() }));
      } catch {}
    }
    return result || null;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

/** { [hotelName]: imageUrl } for hotels that have no photo of their own. Fills in as results arrive. */
export function useHotelImages(hotels, city) {
  const [photos, setPhotos] = useState({});
  const names = (hotels || []).filter((h) => h?.name && !h.image).map((h) => h.name);
  const signature = `${city || ""}::${names.join("|")}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const name of names) {
        const url = await fetchHotelImage(name, city);
        if (!alive) return;
        if (url) setPhotos((prev) => (prev[name] === url ? prev : { ...prev, [name]: url }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return photos;
}
