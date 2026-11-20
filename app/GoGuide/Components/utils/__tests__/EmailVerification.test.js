import test from "node:test";
import assert from "node:assert/strict";
import {
  needsEmailVerification,
  refreshEmailVerification,
  isEmailVerificationError,
  EMAIL_VERIFY_MESSAGE,
} from "../emailVerification.js";

const passwordUser = (over = {}) => ({
  isAnonymous: false,
  email: "a@b.co",
  emailVerified: false,
  providerData: [{ providerId: "password" }],
  reload: async () => {},
  getIdToken: async () => "tok",
  ...over,
});

test("only unverified email/password accounts need verification", () => {
  assert.equal(needsEmailVerification(passwordUser()), true);
  assert.equal(needsEmailVerification(passwordUser({ emailVerified: true })), false);
  assert.equal(needsEmailVerification(passwordUser({ isAnonymous: true, email: null, providerData: [] })), false);
  assert.equal(needsEmailVerification(passwordUser({ providerData: [{ providerId: "google.com" }] })), false);
  assert.equal(needsEmailVerification(passwordUser({ email: null })), false);
  assert.equal(needsEmailVerification(null), false);
  assert.equal(needsEmailVerification(undefined), false);
});

test("refresh picks up a verification done in the inbox and forces a fresh ID token", async () => {
  let tokenForced = false;
  const user = passwordUser({
    reload: async function () { user.emailVerified = true; },
    getIdToken: async (force) => { tokenForced = force === true; return "fresh"; },
  });
  assert.equal(await refreshEmailVerification(user), true);
  assert.equal(tokenForced, true, "server reads email_verified from the token, so it must be refreshed");
});

test("refresh reports false while the email is still unverified", async () => {
  let tokenRefreshed = false;
  const user = passwordUser({ getIdToken: async () => { tokenRefreshed = true; return "t"; } });
  assert.equal(await refreshEmailVerification(user), false);
  assert.equal(tokenRefreshed, false);
});

test("refresh never throws; offline users stay 'unverified' until it works", async () => {
  const user = passwordUser({ reload: async () => { throw new Error("network"); } });
  assert.equal(await refreshEmailVerification(user), false);
  assert.equal(await refreshEmailVerification(null), true);
});

test("a server rejection is recognised by its message", () => {
  assert.equal(isEmailVerificationError(new Error(EMAIL_VERIFY_MESSAGE)), true);
  assert.equal(isEmailVerificationError({ message: "Please verify your email to use AI features. Check…" }), true);
  assert.equal(isEmailVerificationError(new Error("Could not reach GoGuide server")), false);
  assert.equal(isEmailVerificationError(null), false);
});
