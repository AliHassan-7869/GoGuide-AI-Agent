import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAppEnv,
  resolveApiUrl,
  resolveFirebaseConfig,
  PRODUCTION_API_URL,
  PRODUCTION_FIREBASE,
} from "../../../Configs/env.js";

const FB = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "stg-key",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "goguide-staging.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "goguide-staging",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:1:web:abc",
};

test("environment: explicit setting wins; otherwise dev builds are 'development' and release builds 'production'", () => {
  assert.equal(resolveAppEnv({ EXPO_PUBLIC_APP_ENV: "staging" }, false), "staging");
  assert.equal(resolveAppEnv({ EXPO_PUBLIC_APP_ENV: " Production " }, true), "production");
  assert.equal(resolveAppEnv({}, true), "development");
  assert.equal(resolveAppEnv({}, false), "production");
  assert.equal(resolveAppEnv({ EXPO_PUBLIC_APP_ENV: "banana" }, true), "development");
});

test("API: production builds keep the live backend by default", () => {
  assert.deepEqual(resolveApiUrl({}, "production"), { url: PRODUCTION_API_URL, source: "production-default" });
});

test("API: an explicit URL always wins (trailing slashes removed)", () => {
  const r = resolveApiUrl({ EXPO_PUBLIC_API_URL: " https://stg.example.com// " }, "staging");
  assert.deepEqual(r, { url: "https://stg.example.com", source: "env" });
  assert.equal(resolveApiUrl({ EXPO_PUBLIC_API_URL: "http://192.168.1.5:8000" }, "development").url, "http://192.168.1.5:8000");
});

test("API: development and staging never fall back to the live backend on their own", () => {
  assert.deepEqual(resolveApiUrl({}, "development"), { url: "", source: "missing" });
  assert.deepEqual(resolveApiUrl({}, "staging"), { url: "", source: "missing" });
});

test("API: using production from a non-production build is possible only by opting in", () => {
  const r = resolveApiUrl({ EXPO_PUBLIC_USE_PRODUCTION_SERVICES: "true" }, "development");
  assert.deepEqual(r, { url: PRODUCTION_API_URL, source: "production-default" });
  assert.equal(resolveApiUrl({ EXPO_PUBLIC_USE_PRODUCTION_SERVICES: "yes" }, "development").source, "missing");
});

test("Firebase: production builds use the live project by default", () => {
  const r = resolveFirebaseConfig({}, "production");
  assert.equal(r.source, "production-default");
  assert.deepEqual(r.config, PRODUCTION_FIREBASE);
});

test("Firebase: a complete set of EXPO_PUBLIC_FIREBASE_* values selects another project", () => {
  const r = resolveFirebaseConfig(FB, "staging");
  assert.equal(r.source, "env");
  assert.equal(r.config.projectId, "goguide-staging");
  assert.equal(r.config.apiKey, "stg-key");
  assert.notEqual(r.config.projectId, PRODUCTION_FIREBASE.projectId);
});

test("Firebase: non-production builds without configuration are refused, never silently pointed at production", () => {
  assert.equal(resolveFirebaseConfig({}, "development").source, "missing");
  assert.equal(resolveFirebaseConfig({}, "staging").source, "missing");
});

test("Firebase: a half-configured environment is refused rather than mixed with production values", () => {
  const partial = { EXPO_PUBLIC_FIREBASE_PROJECT_ID: "goguide-staging" };
  assert.equal(resolveFirebaseConfig(partial, "staging").source, "missing");
  assert.equal(resolveFirebaseConfig(partial, "production").source, "missing");
});

test("Firebase: production can be used from a non-production build only by opting in", () => {
  const r = resolveFirebaseConfig({ EXPO_PUBLIC_USE_PRODUCTION_SERVICES: "true" }, "development");
  assert.equal(r.source, "production-default");
  assert.equal(r.config.projectId, PRODUCTION_FIREBASE.projectId);
});
