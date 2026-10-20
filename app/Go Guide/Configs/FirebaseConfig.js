import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClJ_kV285iw9kkGn39_MiXsaYFfa2gAm4",
  authDomain: "ai-travel-agent-e36a2.firebaseapp.com",
  projectId: "ai-travel-agent-e36a2",
  storageBucket: "ai-travel-agent-e36a2.firebasestorage.app",
  messagingSenderId: "341457186714",
  appId: "1:341457186714:web:755b5c1d88bc4558c2d423",
  measurementId: "G-98LKEQWVZ7",
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
  } catch (e) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
