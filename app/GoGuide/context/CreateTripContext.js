import { createContext, useEffect, useRef, useState } from "react";
import { auth, db } from "../Configs/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CreateTripContext = createContext(null);

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
// Shown when nobody (or only an anonymous guest) is signed in. No fake email: screens treat an empty email as "guest".
const GUEST_USER = { name: "Traveler", email: "", avatar: DEFAULT_AVATAR, userLocation: null };

export const CreateTripProvider = ({ children }) => {
  const [tripData, setTripData] = useState({});
  const [uid, setUid] = useState(null);
  const [userData, setUserData] = useState(GUEST_USER);

  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: null, // null = follow the phone setting; true/false = the user chose explicitly
    locationServices: true,
    dietary: "Halal",
    travelPace: "Balanced",
    currency: "USD",
    temperatureUnit: "C",
    weatherAlerts: true,
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
  const hadUserRef = useRef(false);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) hadUserRef.current = true;
      if (user && user.isAnonymous) {
        // Anonymous guests (used for AI access) have no profile document; keep them local-only.
        setUid(user.uid);
        setUserData(GUEST_USER);
      } else if (user) {
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
              email: user.email || "",
              avatar: user.photoURL || DEFAULT_AVATAR,
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        setUid(null);
        setUserData(GUEST_USER);
        // Clear the trip only on a real sign-out. The first "nobody signed in" event at app start must not
        // wipe a trip that was just restored from storage (a guest reloading the page would lose their plan).
        if (hadUserRef.current) {
          hadUserRef.current = false;
          setTripData({});
        }
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

  // Load saved preferences
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@goguide_preferences");
        if (saved) {
          const parsed = safeJsonParse(saved);
          if (parsed && typeof parsed === "object") {
            setPreferences((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.warn("Could not load preferences:", e);
      }
    })();
  }, []);

  // Persist preferences
  useEffect(() => {
    try {
      AsyncStorage.setItem("@goguide_preferences", JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  return (
    <CreateTripContext.Provider
      value={{ tripData, setTripData, userData, setUserData, uid, preferences, setPreferences }}
    >
      {children}
    </CreateTripContext.Provider>
  );
};