import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanPlaceName, significantTokens, isVerifiable, stopKey, isMatch, verifyPlace, pickStops, verifyTripStops,
} from "../PlaceVerifier.js";

const memoryStore = () => {
  const data = {};
  return { getItem: async (k) => data[k] ?? null, setItem: async (k, v) => { data[k] = v; }, data };
};
const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });
const nowFn = () => 1_000_000;
const noWait = async () => {};

const trip = (names, destination = "Paris, France") => ({
  destination,
  itinerary: names.map((day) => ({ activities: day.map((n) => ({ placeName: n })) })),
});

test("cleanPlaceName and tokens drop filler words", () => {
  assert.equal(cleanPlaceName("Dinner at Souk Al Bahar"), "Souk Al Bahar");
  assert.deepEqual(significantTokens("Visit the Eiffel Tower"), ["eiffel", "tower"]);
});

test("generic items are never looked up", () => {
  assert.equal(isVerifiable("Free time"), false);
  assert.equal(isVerifiable("Airport transfer"), false);
  assert.equal(isVerifiable("Check-in at hotel"), false);
  assert.equal(isVerifiable("Louvre Museum"), true);
});

test("isMatch needs the place words and the city", () => {
  const r = { name: "Louvre", display_name: "Louvre Museum, Paris, France" };
  assert.equal(isMatch(r, "Louvre Museum", "Paris, France"), true);
  assert.equal(isMatch(r, "Louvre Museum", "Rome, Italy"), false);
  assert.equal(isMatch({ display_name: "Some Cafe, Paris" }, "Eiffel Tower", "Paris"), false);
  assert.equal(isMatch(null, "x", "y"), false);
});

test("stopKey is stable across case, accents and filler", () => {
  assert.equal(stopKey("Dinner at Café Louvre", "Paris, France"), stopKey("café louvre", "paris"));
});

test("verifyPlace: found, not found, and failures return the right thing", async () => {
  const found = await verifyPlace("Louvre Museum", "Paris, France", {
    fetchFn: async () => jsonResponse([{ name: "Louvre", display_name: "Louvre, Paris, France", lat: "48.86", lon: "2.33" }]),
  });
  assert.deepEqual(found, { verified: true, lat: 48.86, lng: 2.33 });

  const missing = await verifyPlace("Louvre Museum", "Paris, France", { fetchFn: async () => jsonResponse([]) });
  assert.deepEqual(missing, { verified: false });

  assert.equal(await verifyPlace("Louvre Museum", "Paris", { fetchFn: async () => { throw new Error("offline"); } }), null);
  assert.equal(await verifyPlace("Louvre Museum", "Paris", { fetchFn: async () => jsonResponse({}, false) }), null);
  assert.equal(await verifyPlace("Louvre Museum", "Paris", { fetchFn: async () => jsonResponse({ not: "array" }) }), null);
  assert.equal(await verifyPlace("Free time", "Paris", { fetchFn: async () => { throw new Error("must not be called"); } }), null);
});

test("verifyPlace times out instead of hanging", async () => {
  const hang = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
  const started = Date.now();
  assert.equal(await verifyPlace("Louvre Museum", "Paris", { fetchFn: hang, timeoutMs: 50 }), null);
  assert.ok(Date.now() - started < 1000);
});

test("pickStops spreads across days, skips generic items and duplicates, and respects the limit", () => {
  const t = trip([
    ["Eiffel Tower", "Free time", "Louvre Museum"],
    ["Notre-Dame Cathedral", "Eiffel Tower", "Musee d'Orsay"],
    ["Montmartre", "Sacre Coeur Basilica"],
  ]);
  const picked = pickStops(t, 4).map((s) => s.name);
  assert.deepEqual(picked, ["Eiffel Tower", "Notre-Dame Cathedral", "Montmartre", "Sacre Coeur Basilica"]);
  assert.equal(pickStops(trip([Array.from({ length: 20 }, (_, i) => `Place number ${i} Park`)]), 8).length, 8);
});

test("verifyTripStops caches results so a repeat run makes no network calls", async () => {
  const store = memoryStore();
  let calls = 0;
  const fetchFn = async () => { calls += 1; return jsonResponse([{ name: "Louvre", display_name: "Louvre Museum, Paris, France", lat: "48.86", lon: "2.33" }]); };
  const t = trip([["Louvre Museum"]]);
  const seen = [];
  await verifyTripStops(t, { store, fetchFn, sleep: noWait, now: nowFn, onResult: (k, r) => seen.push([k, r.verified]) });
  assert.equal(calls, 1);
  assert.deepEqual(seen, [[stopKey("Louvre Museum", "Paris, France"), true]]);
  await verifyTripStops(t, { store, fetchFn, sleep: noWait, now: nowFn });
  assert.equal(calls, 1, "second run must come from the cache");
});

test("failed lookups are not cached and do not break the run", async () => {
  const store = memoryStore();
  let calls = 0;
  const fetchFn = async () => { calls += 1; throw new Error("network down"); };
  const t = trip([["Louvre Museum", "Eiffel Tower"]]);
  const out = await verifyTripStops(t, { store, fetchFn, sleep: noWait, now: nowFn });
  assert.deepEqual(out, {});
  await verifyTripStops(t, { store, fetchFn, sleep: noWait, now: nowFn });
  assert.equal(calls, 4, "unknown results are retried next time");
});

test("curated (already verified) plans are skipped, and cancelling stops the run", async () => {
  let calls = 0;
  const fetchFn = async () => { calls += 1; return jsonResponse([]); };
  const curated = { ...trip([["Louvre Museum"]]), coordinatesVerified: true };
  assert.deepEqual(await verifyTripStops(curated, { store: memoryStore(), fetchFn, sleep: noWait }), {});
  assert.equal(calls, 0);
  await verifyTripStops(trip([["Louvre Museum", "Eiffel Tower"]]), { store: memoryStore(), fetchFn, sleep: noWait, isCancelled: () => true });
  assert.equal(calls, 0);
});
