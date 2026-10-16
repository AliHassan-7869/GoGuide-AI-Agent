import { createContext, useEffect, useState } from "react";
import { auth, db } from "../Configs/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CreateTripContext = createContext(null);

export const CreateTripProvider = ({ children }) => {
  const [tripData, setTripData] = useState({});
  const [uid, setUid] = useState(null);
  const [userData, setUserData] = useState({
    name: "Traveler",
    email: "user@example.com",
    avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    userLocation: null,
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    locationServices: true,
  });

  const tripStorageKey = uid ? `tripData:${uid}` : "tripData:guest";

  const serializeTripData = (data) =>
    JSON.stringify(data, (key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    });

  const safeJsonParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // Load user profile from Firestore when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            // First time login — create the user doc in Firestore
            const initialData = {
              name: user.displayName || "Traveler",
              email: user.email || "user@example.com",
              avatar: user.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        setUid(null);
        setUserData({
          name: "Traveler",
          email: "user@example.com",
          avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        });
        setTripData({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Load saved trip selections (interests, dates, etc.)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(tripStorageKey);
        if (cancelled) return;
        const parsed = raw ? safeJsonParse(raw) : null;
        if (parsed && typeof parsed === "object") {
          setTripData((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn("Failed to load tripData from storage:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripStorageKey]);

  // Persist trip selections so Review Trip always has them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!tripData || typeof tripData !== "object") return;
        await AsyncStorage.setItem(tripStorageKey, serializeTripData(tripData));
      } catch (e) {
        if (!cancelled) console.warn("Failed to persist tripData:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripData, tripStorageKey]);

  return (
    <CreateTripContext.Provider
      value={{ tripData, setTripData, userData, setUserData, uid, preferences, setPreferences }}
    >
      {children}
    </CreateTripContext.Provider>
  );
};