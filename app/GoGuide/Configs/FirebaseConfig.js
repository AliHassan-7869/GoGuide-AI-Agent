
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQ9FLMwPGTu8GJ43fmcsdUyvcDx4EPhlE",
  authDomain: "goguideai.firebaseapp.com",
  projectId: "goguideai",
  storageBucket: "goguideai.firebasestorage.app",
  messagingSenderId: "857848448146",
  appId: "1:857848448146:web:7f06c7efa2c1f9c064924b",
  measurementId: "G-GHQESKTBYX",
};

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
