import test from "node:test";
import assert from "node:assert/strict";
import { purgeLegacyLoginData, LEGACY_LOGIN_KEY } from "../legacyLoginCleanup.js";

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    removeItem: async (k) => { delete data[k]; },
  };
};

test("removes the old stored sign-in credential and nothing else", async () => {
  const s = fakeStorage({ [LEGACY_LOGIN_KEY]: '{"user":{"stsTokenManager":{"refreshToken":"secret"}}}', "@goguide_preferences": "{}" });
  await purgeLegacyLoginData(s);
  assert.equal(LEGACY_LOGIN_KEY in s.data, false);
  assert.equal("@goguide_preferences" in s.data, true);
});

test("is a no-op when nothing is stored", async () => {
  const s = fakeStorage();
  await purgeLegacyLoginData(s);
  assert.deepEqual(s.data, {});
});

test("never throws if storage is unavailable", async () => {
  const broken = { removeItem: async () => { throw new Error("disk error"); } };
  await assert.doesNotReject(() => purgeLegacyLoginData(broken));
  await assert.doesNotReject(() => purgeLegacyLoginData(null));
});

test("the sign-in screen no longer writes or logs the credential", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../../../app/auth/sign-in/index.js", import.meta.url), "utf8");
  assert.equal(/setItem\(\s*["']loginUserData["']/.test(src), false, "must not store the credential");
  assert.equal(/console\.log\([^)]*\bres\b/.test(src), false, "must not log the credential object");
});
