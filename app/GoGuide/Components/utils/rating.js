// A rating is shown only when we actually have one. Never default a missing rating to a good-looking
// number. Returns "4.3"-style text, or null when there is nothing real to show. Pure module (unit-tested).
export function formatRating(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 5) return null;
  return n.toFixed(1);
}
