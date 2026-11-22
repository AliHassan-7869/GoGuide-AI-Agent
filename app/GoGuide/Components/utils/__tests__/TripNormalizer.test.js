import test from "node:test";
import assert from "node:assert/strict";
import { robustParseJson, normalizeTrip, validateTripPlan } from "../TripNormalizer.js";

test("robustParseJson preserves URLs inside strings while stripping real comments", () => {
  const raw = `{
    // header comment
    url: "https://example.com/path?a=1&b=2",
    note: 'Visit at 10:00, link: https://goguide.app/info', /* inline note */
    list: [1, 2,],
  }`;
  const parsed = robustParseJson(raw);
  assert.ok(parsed);
  assert.equal(parsed.url, "https://example.com/path?a=1&b=2");
  assert.equal(parsed.note, "Visit at 10:00, link: https://goguide.app/info");
  assert.deepEqual(parsed.list, [1, 2]);
});

test("robustParseJson parses standalone and stringified JSON arrays", () => {
  const arr = robustParseJson('Here: [{"placeName": "Colosseum", time: "Morning",}]');
  assert.ok(Array.isArray(arr));
  assert.equal(arr[0].placeName, "Colosseum");
});

test("normalizeTrip handles null array items, object fields, and stringified plans", () => {
  const nested = {
    plan: JSON.stringify({
      destination: { name: "Lisbon" },
      duration: { label: "2 Days" },
      budget: { tier: "Moderate" },
      traveler: { title: "Couple" },
      hotels: [null, { name: "Hotel Avenida", price: 180 }],
      itinerary: [
        null,
        {
          day: 1,
          theme: { title: "Alfama Walk" },
          activities: {
            morning: { name: "Sao Jorge Castle", tickets: 15 },
            nilStop: null,
          },
        },
      ],
    }),
  };

  const out = normalizeTrip(nested);
  assert.ok(out);
  assert.equal(out.destination, "Lisbon");
  assert.equal(out.duration, "2 Days");
  assert.equal(out.budget, "Moderate");
  assert.equal(out.traveler, "Couple");
  assert.equal(out.hotels.length, 1);
  assert.equal(out.hotels[0].name, "Hotel Avenida");
  assert.equal(out.hotels[0].price, "180");
  assert.equal(out.itinerary.length, 1);
  assert.equal(out.itinerary[0].theme, "Alfama Walk");
  assert.equal(out.itinerary[0].activities.length, 1);
  assert.equal(out.itinerary[0].activities[0].placeName, "Sao Jorge Castle");
  assert.equal(out.itinerary[0].activities[0].tickets, "15");
});

test("validateTripPlan survives null days and null activities without throwing", () => {
  const plan = {
    itinerary: [
      null,
      {
        day: 1,
        theme: "Old Town",
        activities: [null, { placeName: "Grand Mosque" }, { placeName: "Old Bazaar" }],
      },
    ],
  };
  const res = validateTripPlan(plan, 2);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some((e) => e.includes("invalid or empty")));
});
