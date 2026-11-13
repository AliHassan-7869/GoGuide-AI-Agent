import test from "node:test";
import assert from "node:assert/strict";
import { robustParseJson, normalizeTrip, validateTripPlan } from "../TripNormalizer.js";
import {
  getCurrencySymbol,
  convertAmount,
  convertBetweenCurrencies,
  formatCurrencyAmount,
} from "../../constants/Currency.js";

test("robustParseJson handles fenced, noisy and invalid AI output", () => {
  assert.deepEqual(robustParseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(robustParseJson('Here you go {"a":[1,2,]} thanks'), { a: [1, 2] });
  assert.equal(robustParseJson("not json"), null);
  assert.equal(robustParseJson(""), null);
  assert.equal(robustParseJson(null), null);
  const obj = { x: 1 };
  assert.equal(robustParseJson(obj), obj);
});

test("normalizeTrip returns null for empty input and fills safe defaults", () => {
  assert.equal(normalizeTrip(null), null);
  const t = normalizeTrip({ destination: "Paris", itinerary: [{ day: 1, activities: [{ name: "Louvre" }] }] });
  assert.equal(t.destination, "Paris");
  assert.equal(t.itinerary[0].activities[0].name, "Louvre");
  assert.equal(t.itinerary[0].activities[0].isVisited, false);
  assert.ok(Array.isArray(t.hotels));
  assert.ok(Array.isArray(t.packingList));
  assert.ok(Array.isArray(t.expenses));
});

test("validateTripPlan reports a missing itinerary", () => {
  const r = validateTripPlan({ itinerary: [] }, 3);
  assert.equal(r.isValid, false);
  assert.ok(r.errors.length > 0);
});

test("currency helpers fall back safely on bad input", () => {
  assert.equal(getCurrencySymbol("usd"), getCurrencySymbol("USD"));
  assert.equal(getCurrencySymbol("???"), "$");
  assert.equal(convertAmount(NaN, "EUR"), 0);
  assert.equal(convertAmount(null, "EUR"), 0);
  assert.equal(convertAmount(10, "USD"), 10);
  assert.equal(convertBetweenCurrencies(10, "USD", "USD"), 10);
  assert.equal(convertBetweenCurrencies(undefined, "USD", "EUR"), 0);
});

test("currency conversion round-trips within rounding error", () => {
  const there = convertBetweenCurrencies(1000, "USD", "EUR");
  const back = convertBetweenCurrencies(there, "EUR", "USD");
  assert.ok(Math.abs(back - 1000) <= 20, `round trip drifted: ${back}`);
});

test("formatCurrencyAmount rounds and prefixes the symbol", () => {
  const out = formatCurrencyAmount(1234.6, "USD");
  assert.ok(out.startsWith(getCurrencySymbol("USD")));
  assert.ok(out.includes("1") && out.includes("235"));
});
