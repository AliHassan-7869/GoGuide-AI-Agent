import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { publicPlan, resolveShareId } from "../shareTrip.js";

const memory = () => {
  const m = new Map();
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
};

test("shared plans carry the itinerary but no private fields", () => {
  const shared = publicPlan({ destination: "Rome", itinerary: [1], hotels: [], expenses: [{ amount: 5 }], userEmail: "a@b.co", userId: "u" });
  assert.deepEqual(shared, { destination: "Rome", itinerary: [1], hotels: [] });
});

test("guessable trip ids are replaced by a stable random share id", async () => {
  const deps = { storage: memory(), randomBytes: (n) => new Uint8Array(randomBytes(n)) };
  const first = await resolveShareId("trip_1712345678901", deps);
  assert.match(first, /^s_[0-9a-f]{32}$/);
  assert.equal(await resolveShareId("trip_1712345678901", deps), first);
  assert.notEqual(await resolveShareId("current-trip", deps), first);
  assert.equal(await resolveShareId("AbCdEf0123456789WxYz", deps), "AbCdEf0123456789WxYz");
});

test("only https links to trusted sites are opened", async () => {
  const { readFileSync } = await import("node:fs");
  // openExternalUrl imports React Native, so load its pure check without that import.
  const source = readFileSync(new URL("../openExternalUrl.js", import.meta.url), "utf8")
    .replace(/^import .*react-native.*$/m, "");
  const { isSafeExternalUrl } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  for (const ok of ["https://www.booking.com/searchresults.html?ss=x", "https://calendar.google.com/calendar/render", "https://maps.google.com/maps?q=x", "https://www.skyscanner.com/transport"]) {
    assert.ok(isSafeExternalUrl(ok), ok);
  }
  for (const bad of ["http://www.booking.com", "javascript:alert(1)", "file:///etc/passwd", "intent://x#Intent;end", "https://evil.example", "https://google.com.evil.example", "https://evilgoogle.com", "https://google.com@evil.example", "tel:123"]) {
    assert.ok(!isSafeExternalUrl(bad), bad);
  }
  assert.ok(isSafeExternalUrl("tel:123", { allowContact: true }));
});
