import test from "node:test";
import assert from "node:assert/strict";
import { validateTripPlan, deriveTripDates } from "../TripNormalizer.js";
import { buildCuratedPlan, findCuratedKey } from "../CuratedPlans.js";

test("deriveTripDates calculates exact canonical dates, nights, and daily tabs", () => {
  const result = deriveTripDates("2026-06-01", 5);
  assert.equal(result.departureDate, "2026-06-01");
  assert.equal(result.returnDate, "2026-06-05");
  assert.equal(result.totalDays, 5);
  assert.equal(result.nights, 4);
  assert.equal(result.durationLabel, "5 Days 4 Nights");
  assert.equal(result.days.length, 5);
  assert.equal(result.days[0].day, 1);
  assert.equal(result.days[0].date, "2026-06-01");
  assert.equal(result.days[4].day, 5);
  assert.equal(result.days[4].date, "2026-06-05");
});

test("validateTripPlan passes on valid non-repeating itinerary", () => {
  const plan = {
    itinerary: [
      {
        day: 1,
        theme: "Historic Core",
        activities: [
          { placeName: "Hagia Sophia", time: "Morning" },
          { placeName: "Blue Mosque", time: "Afternoon" },
          { placeName: "Basilica Cistern", time: "Evening" },
        ],
      },
      {
        day: 2,
        theme: "Bazaars & Modern Quarters",
        activities: [
          { placeName: "Grand Bazaar", time: "Morning" },
          { placeName: "Galata Tower", time: "Afternoon" },
        ],
      },
    ],
  };

  const validation = validateTripPlan(plan, 2);
  assert.equal(validation.isValid, true);
  assert.equal(validation.errors.length, 0);
});

test("validateTripPlan catches duplicate attractions across days", () => {
  const planWithDuplicates = {
    itinerary: [
      {
        day: 1,
        theme: "Day 1 Sultanahmet",
        activities: [
          { placeName: "Hagia Sophia", time: "Morning" },
          { placeName: "Blue Mosque", time: "Afternoon" },
        ],
      },
      {
        day: 2,
        theme: "Day 2 Galata",
        activities: [
          { placeName: "Galata Tower", time: "Morning" },
          { placeName: "Hagia Sophia", time: "Afternoon" }, // duplicate!
        ],
      },
    ],
  };

  const validation = validateTripPlan(planWithDuplicates, 2);
  assert.equal(validation.isValid, false);
  assert.match(validation.errors.join("; "), /Duplicate attraction/);
});

test("validateTripPlan catches duplicate day themes", () => {
  const planWithDuplicateThemes = {
    itinerary: [
      {
        day: 1,
        theme: "Classic Highlights",
        activities: [{ placeName: "Spot A" }, { placeName: "Spot B" }],
      },
      {
        day: 2,
        theme: "Classic Highlights", // duplicate theme!
        activities: [{ placeName: "Spot C" }, { placeName: "Spot D" }],
      },
    ],
  };

  const validation = validateTripPlan(planWithDuplicateThemes, 2);
  assert.equal(validation.isValid, false);
  assert.match(validation.errors.join("; "), /Duplicate day theme/);
});

test("buildCuratedPlan provides 5 unique days for Istanbul without modulo cycling", () => {
  const plan = buildCuratedPlan("Istanbul", 5, "Moderate");
  assert.ok(plan, "Plan should be generated for 5 days in Istanbul");
  assert.equal(plan.trip.itinerary.length, 5);

  const validation = validateTripPlan(plan.trip, 5);
  assert.equal(validation.isValid, true, `Validation failed: ${validation.errors.join(", ")}`);
});

test("buildCuratedPlan returns null when requested days exceed catalog without allowPartial", () => {
  // If someone requests 14 days, buildCuratedPlan returns null so AI generates all days
  const plan = buildCuratedPlan("Istanbul", 14, "Moderate");
  assert.equal(plan, null, "Should return null for 14 days when catalog only has 5 days");

  // With allowPartial: true, it returns the 5 days without repeating
  const partialPlan = buildCuratedPlan("Istanbul", 14, "Moderate", { allowPartial: true });
  assert.ok(partialPlan);
  assert.equal(partialPlan.trip.itinerary.length, 5);
  const partialValidation = validateTripPlan(partialPlan.trip, 5);
  assert.equal(partialValidation.isValid, true);
});
