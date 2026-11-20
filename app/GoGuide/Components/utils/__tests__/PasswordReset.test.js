import test from "node:test";
import assert from "node:assert/strict";
import { validateResetEmail, resetOutcome, RESET_SENT_MESSAGE } from "../passwordReset.js";

test("reset email must be a plain, valid address (trimmed)", () => {
  assert.deepEqual(validateResetEmail("  name@example.com "), { ok: true, email: "name@example.com" });
  assert.equal(validateResetEmail("").ok, false);
  assert.equal(validateResetEmail("   ").ok, false);
  assert.equal(validateResetEmail("no-at-sign.com").ok, false);
  assert.equal(validateResetEmail("a@b").ok, false);
  assert.equal(validateResetEmail("two words@example.com").ok, false);
  assert.equal(validateResetEmail(undefined).ok, false);
  assert.equal(validateResetEmail("a@b.co".padEnd(400, "x")).ok, false);
});

test("an empty or invalid email explains what to do", () => {
  assert.match(validateResetEmail("").message, /enter your email/i);
  assert.match(validateResetEmail("nope").message, /valid email/i);
});

test("success and 'no such account' look identical so accounts cannot be probed", () => {
  const sent = resetOutcome(null);
  const unknown = resetOutcome({ code: "auth/user-not-found" });
  assert.deepEqual(sent, unknown);
  assert.equal(sent.sent, true);
  assert.equal(sent.message, RESET_SENT_MESSAGE);
});

test("real failures are reported, not hidden", () => {
  assert.match(resetOutcome({ code: "auth/too-many-requests" }).message, /too many/i);
  assert.match(resetOutcome({ code: "auth/network-request-failed" }).message, /connection/i);
  assert.match(resetOutcome({ code: "auth/invalid-email" }).message, /valid email/i);
  const other = resetOutcome({ code: "auth/something-new" });
  assert.equal(other.sent, false);
  assert.match(other.message, /try again/i);
});
