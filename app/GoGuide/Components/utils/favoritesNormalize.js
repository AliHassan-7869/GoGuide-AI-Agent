// Cleans favourites so one bad entry can never break the Favourites page. Pure module (unit-tested).
// Favourites are saved from many screens (hotels, trips, bookings, destinations) and synced from Firebase,
// so the data can be messy: broken or non-link images, objects where text is expected, or duplicates.

export const FALLBACK_FAVORITE_IMAGE =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop";

const text = (v, max = 80) => {
  if (v === null || v === undefined || typeof v === "object" || typeof v === "function") return "";
  return String(v).replace(/\s+/g, " ").trim().slice(0, max);
};

/** Returns a safe https image link, or the fallback. Android release builds block plain http images. */
export function safeImageUri(value, fallback = FALLBACK_FAVORITE_IMAGE) {
  const raw = value && typeof value === "object" && typeof value.uri === "string" ? value.uri : value;
  if (typeof raw !== "string") return fallback;
  const v = raw.trim();
  if (/^https:\/\//i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return `https://${v.slice(7)}`;
  if (/^\/\//.test(v)) return `https:${v}`;
  if (/^data:image\//i.test(v)) return v;
  return fallback;
}

/** "Hotel • dubai" -> "Hotel • Dubai"; keeps the first letter of each word capital. */
export function prettyLabel(value, fallback = "Destination") {
  const t = text(value, 40);
  if (!t) return fallback;
  return t.replace(/(^|[\s•·,\-/])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function normalizeFavorite(f) {
  if (!f || typeof f !== "object") return null;
  const name = text(f.name) || text(f.title);
  if (!name) return null;
  const ratingNum = Number(f.rating);
  return {
    ...f,
    id: text(f.id, 120) || name,
    name,
    title: text(f.title) || name,
    image: safeImageUri(f.image || f.img || f.photoRef),
    category: prettyLabel(f.category || f.tag),
    rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : "",
    description: text(f.description, 200),
  };
}

/** Normalizes every entry, drops unusable ones, and keeps one entry per place name (first wins). */
export function cleanFavorites(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const f = normalizeFavorite(raw);
    if (!f) continue;
    const key = f.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
