import test from "node:test";
import assert from "node:assert/strict";
import { formatRating } from "../rating.js";
import { normalizeTrip } from "../TripNormalizer.js";
import { normalizeFavorite } from "../favoritesNormalize.js";

test("a rating is shown only when it is a real number between 0 and 5", () => {
  assert.equal(formatRating("4.3"), "4.3");
  assert.equal(formatRating(4.25), "4.3");
  assert.equal(formatRating(5), "5.0");
  assert.equal(formatRating("0"), null);
  assert.equal(formatRating(0), null);
  assert.equal(formatRating(""), null);
  assert.equal(formatRating(null), null);
  assert.equal(formatRating(undefined), null);
  assert.equal(formatRating("great"), null);
  assert.equal(formatRating("9.9"), null);
  assert.equal(formatRating({ value: 5 }), null);
});

test("hotels with no rating, name or price are not given invented ones", () => {
  const trip = normalizeTrip({
    destination: "Rome, Italy",
    hotels: [{ address: "Via Roma" }, "Hotel Solo", { name: "Casa", price: "$90 per night", rating: "4.1" }],
    itinerary: [{ day: 1, activities: [{ placeName: "Colosseum", time: "Morning" }] }],
  });
  const [noData, stringHotel, real] = trip.hotels;
  assert.equal(formatRating(noData.rating), null);
  assert.equal(formatRating(stringHotel.rating), null);
  assert.notEqual(noData.name, "Verified Stay");
  assert.notEqual(noData.price, "Competitive Rate");
  assert.equal(noData.price, "Price not listed");
  assert.equal(real.rating, "4.1");
  assert.equal(real.price, "$90 per night");
});

test("a favourite without a rating stays unrated (no made-up 4.8)", () => {
  assert.equal(formatRating(normalizeFavorite({ name: "Tokyo" }).rating), null);
  assert.equal(normalizeFavorite({ title: "Paris", rating: 4.25 }).rating, "4.3");
});
