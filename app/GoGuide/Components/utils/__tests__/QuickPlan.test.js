import test from "node:test";
import assert from "node:assert/strict";
import { quickPlanFields } from "../quickPlan.js";

const NOW = new Date(2030, 4, 10, 15, 30); // 10 May 2030, afternoon

test("a quick plan starts tomorrow and ends on the right day (3 days = start + 2)", () => {
  const f = quickPlanFields({ days: 3, now: NOW });
  assert.equal(f.startDate.getFullYear(), 2030);
  assert.equal(f.startDate.getMonth(), 4);
  assert.equal(f.startDate.getDate(), 11);
  assert.equal(f.startDate.getHours(), 0);
  assert.equal(f.endDate.getDate(), 13);
  assert.equal(f.totalNoOfDays, 3);
});

test("it uses the canonical keys the wizard and generator read, and not the stray 'totalDays'", () => {
  const f = quickPlanFields({ days: 4, budget: "Luxury", now: NOW });
  assert.ok(f.startDate instanceof Date && f.endDate instanceof Date);
  assert.equal(f.budget, "Luxury");
  assert.equal("totalDays" in f, false);
  assert.deepEqual(f.traveler, { title: "Solo / Couple", people: "1 to 2" });
});

test("dates and duration always agree, including across a month end", () => {
  const f = quickPlanFields({ days: 5, now: new Date(2030, 0, 29) });
  const span = Math.round((f.endDate - f.startDate) / 86400000) + 1;
  assert.equal(span, f.totalNoOfDays);
  assert.equal(f.startDate.getMonth(), 0);
  assert.equal(f.endDate.getMonth(), 1);
});

test("duration is clamped to 1-30 and bad input falls back to 3", () => {
  assert.equal(quickPlanFields({ days: 0, now: NOW }).totalNoOfDays, 3);
  assert.equal(quickPlanFields({ days: -2, now: NOW }).totalNoOfDays, 3);
  assert.equal(quickPlanFields({ days: "x", now: NOW }).totalNoOfDays, 3);
  assert.equal(quickPlanFields({ days: 99, now: NOW }).totalNoOfDays, 30);
  assert.equal(quickPlanFields({ now: NOW }).totalNoOfDays, 3);
});

test("it clears details left over from a previous wizard run so they cannot override the quick plan", () => {
  const f = quickPlanFields({ now: NOW });
  assert.deepEqual(f.interestsDetails, []);
  assert.deepEqual(f.selectedCategories, []);
  assert.ok(f.interests.length > 0);
});
