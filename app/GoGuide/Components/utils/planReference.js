// Reference shown on "My Bookings" entries. These are saved PLANS, not reservations, so the code says
// PLAN and is derived from the plan itself (same plan -> same reference), never from random numbers
// that look like a real confirmation number. Pure module (unit-tested).

const hash6 = (text) => {
  // FNV-1a, 32 bit
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0").slice(0, 6);
};

/** kind: "H" hotel, "F" flight, "A" activity. parts: anything that identifies the plan (destination, name, dates...). */
export function planReference(kind, ...parts) {
  const seed = parts.map((p) => (p === null || p === undefined ? "" : typeof p === "object" ? JSON.stringify(p) : String(p))).join("|");
  return `PLAN-${kind}-${hash6(`${kind}|${seed}`)}`;
}
