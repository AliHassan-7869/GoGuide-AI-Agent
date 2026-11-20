// Which environment is this build for, and which backend / Firebase project should it talk to?
// Pure resolvers (unit-tested) plus the values read from the build environment.
//
//  production   : release builds and the web site. Uses the live backend and Firebase project by default.
//  staging      : test builds (EAS "staging" profile, preview site). Must be configured explicitly.
//  development  : `expo start`. Must be configured explicitly.
//
// A non-production build never talks to production by accident. To use production on purpose
// (e.g. a quick local check), set EXPO_PUBLIC_USE_PRODUCTION_SERVICES=true. See docs/ENVIRONMENTS.md.

export const PRODUCTION_API_URL = "https://goguide-ai-agent.onrender.com";

// Firebase web config is public by design (security comes from firestore.rules).
export const PRODUCTION_FIREBASE = {
  apiKey: "AIzaSyDQ9FLMwPGTu8GJ43fmcsdUyvcDx4EPhlE",
  authDomain: "goguideai.firebaseapp.com",
  projectId: "goguideai",
  storageBucket: "goguideai.firebasestorage.app",
  messagingSenderId: "857848448146",
  appId: "1:857848448146:web:7f06c7efa2c1f9c064924b",
  measurementId: "G-GHQESKTBYX",
};

const clean = (v) => (typeof v === "string" ? v.trim() : "");
const ENVIRONMENTS = ["production", "staging", "development"];

export function resolveAppEnv(env, isDev) {
  const explicit = clean(env?.EXPO_PUBLIC_APP_ENV).toLowerCase();
  if (ENVIRONMENTS.includes(explicit)) return explicit;
  return isDev ? "development" : "production";
}

const allowsProduction = (env) => clean(env?.EXPO_PUBLIC_USE_PRODUCTION_SERVICES).toLowerCase() === "true";

/** -> { url, source: "env" | "production-default" | "missing" } */
export function resolveApiUrl(env, appEnv) {
  const explicit = clean(env?.EXPO_PUBLIC_API_URL).replace(/\/+$/, "");
  if (explicit) return { url: explicit, source: "env" };
  if (appEnv === "production" || allowsProduction(env)) return { url: PRODUCTION_API_URL, source: "production-default" };
  return { url: "", source: "missing" };
}

const FIREBASE_VARS = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
  measurementId: "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
};
const FIREBASE_REQUIRED = ["apiKey", "authDomain", "projectId", "appId"];

/** -> { config, source: "env" | "production-default" | "missing" } */
export function resolveFirebaseConfig(env, appEnv) {
  const fromEnv = {};
  for (const [key, name] of Object.entries(FIREBASE_VARS)) {
    const v = clean(env?.[name]);
    if (v) fromEnv[key] = v;
  }
  const given = Object.keys(fromEnv).length;
  if (given > 0) {
    // Never mix another project's settings with production values: all required values or nothing.
    return FIREBASE_REQUIRED.every((k) => fromEnv[k]) ? { config: fromEnv, source: "env" } : { config: null, source: "missing" };
  }
  if (appEnv === "production" || allowsProduction(env)) return { config: PRODUCTION_FIREBASE, source: "production-default" };
  return { config: null, source: "missing" };
}

// Expo only inlines values it can see written out as `process.env.EXPO_PUBLIC_NAME`, so list them here.
export const BUILD_ENV = {
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_USE_PRODUCTION_SERVICES: process.env.EXPO_PUBLIC_USE_PRODUCTION_SERVICES,
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const IS_DEV = typeof __DEV__ !== "undefined" && __DEV__ === true;
export const APP_ENV = resolveAppEnv(BUILD_ENV, IS_DEV);
export const API = resolveApiUrl(BUILD_ENV, APP_ENV);
export const FIREBASE = resolveFirebaseConfig(BUILD_ENV, APP_ENV);

export const ENV_HELP =
  "Set it in app/GoGuide/.env.local (see docs/ENVIRONMENTS.md), or set EXPO_PUBLIC_USE_PRODUCTION_SERVICES=true to knowingly use production.";
