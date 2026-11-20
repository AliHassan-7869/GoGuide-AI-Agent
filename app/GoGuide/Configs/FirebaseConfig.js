
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { APP_ENV, ENV_HELP, FIREBASE } from "./env";

// Which Firebase project this build uses depends on the environment (see Configs/env.js).
// Production builds use the live project; development/staging must be configured explicitly so a
// test build can never write to production data by accident.
if (!FIREBASE.config) {
  throw new Error(
    `Firebase is not configured for the "${APP_ENV}" environment. Set all EXPO_PUBLIC_FIREBASE_* values (API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID). ${ENV_HELP}`
  );
}
const firebaseConfig = FIREBASE.config;
if (APP_ENV !== "production") {
  console.warn(
    FIREBASE.source === "production-default"
      ? `[Firebase] WARNING: ${APP_ENV} build is using the PRODUCTION project "${firebaseConfig.projectId}" (EXPO_PUBLIC_USE_PRODUCTION_SERVICES=true).`
      : `[Firebase] ${APP_ENV} build using project "${firebaseConfig.projectId}".`
  );
}

// Initialize Firebase safely (avoid re-initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
if (Platform.OS === "web") {
  // On Web, use standard web auth with browser persistence
  authInstance = getAuth(app);
} else {
  // On Native (Android / iOS), use AsyncStorage persistence
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
