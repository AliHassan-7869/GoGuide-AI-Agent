import test from "node:test";
import assert from "node:assert/strict";
import { isPlanRequest } from "../copilotIntent.js";

test("plan requests get the 'Plan this trip' hand-off", () => {
  [
    "plan a 5 day trip to Paris",
    "Can you create a trip to Tokyo for me?",
    "I need an itinerary for a weekend in Lahore",
    "7 days in Istanbul trip please",
    "mujhe 3 din ka tour bana do",
    "make me a trip to Dubai",
  ].forEach((text) => assert.equal(isPlanRequest(text), true, `should match: ${text}`));
});

test("ordinary questions stay in the Copilot", () => {
  [
    "what's the weather like in Rome?",
    "do I need a visa for Japan?",
    "best street food in Lahore",
    "is tap water safe to drink in Istanbul",
    "how much should I tip in Dubai",
  ].forEach((text) => assert.equal(isPlanRequest(text), false, `should not match: ${text}`));
});

test("empty or missing input never matches", () => {
  assert.equal(isPlanRequest(""), false);
  assert.equal(isPlanRequest(null), false);
  assert.equal(isPlanRequest(undefined), false);
});
