import test from "node:test";
import assert from "node:assert/strict";
import { planReference } from "../planReference.js";

test("a plan reference is clearly a plan, not a booking confirmation", () => {
  assert.match(planReference("H", "Rome", "Hotel Roma", "2030-05-01"), /^PLAN-H-[0-9A-F]{6}$/);
  assert.match(planReference("F", "Rome"), /^PLAN-F-[0-9A-F]{6}$/);
  assert.match(planReference("A", "Rome", "Colosseum", 2), /^PLAN-A-[0-9A-F]{6}$/);
});

test("it is deterministic: saving the same plan twice gives the same reference (no random numbers)", () => {
  const a = planReference("H", "Rome", "Hotel Roma", "2030-05-01");
  const b = planReference("H", "Rome", "Hotel Roma", "2030-05-01");
  assert.equal(a, b);
});

test("different plans and different kinds get different references", () => {
  const base = planReference("H", "Rome", "Hotel Roma", "2030-05-01");
  assert.notEqual(base, planReference("H", "Rome", "Hotel Roma", "2030-05-02"));
  assert.notEqual(base, planReference("H", "Paris", "Hotel Roma", "2030-05-01"));
  assert.notEqual(base, planReference("F", "Rome", "Hotel Roma", "2030-05-01"));
});

test("missing or odd parts never throw", () => {
  assert.match(planReference("H"), /^PLAN-H-[0-9A-F]{6}$/);
  assert.match(planReference("H", null, undefined, { a: 1 }), /^PLAN-H-[0-9A-F]{6}$/);
});
