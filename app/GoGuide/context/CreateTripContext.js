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
  const authSeqRef = useRef(0);
  const hydratedTripKeyRef = useRef(null);
  const prevStorageKeyRef = useRef(tripStorageKey);
  const preferencesHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const seq = ++authSeqRef.current;
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
          if (!active || seq !== authSeqRef.current) return;
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
            if (!active || seq !== authSeqRef.current) return;
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
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Load saved trip selections (interests, dates, etc.)
  useEffect(() => {
    let cancelled = false;
    const prevKey = prevStorageKeyRef.current;
    const keyChanged = prevKey !== tripStorageKey;
    prevStorageKeyRef.current = tripStorageKey;
    hydratedTripKeyRef.current = null;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(tripStorageKey);
        if (cancelled) return;
        const parsed = raw ? safeJsonParse(raw) : null;
        if (parsed && typeof parsed === "object") {
          setTripData(keyChanged ? parsed : (prev) => ({ ...prev, ...parsed }));
        } else if (keyChanged && prevKey !== "tripData:guest") {
          setTripData({});
        }
      } catch (e) {
        console.warn("Failed to load tripData from storage:", e);
      } finally {
        if (!cancelled) {
          hydratedTripKeyRef.current = tripStorageKey;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripStorageKey]);

  // Persist trip selections only after the active storage key has hydrated (prevents write-before-read wipes)
  useEffect(() => {
    if (hydratedTripKeyRef.current !== tripStorageKey) return;
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
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@goguide_preferences");
        if (cancelled) return;
        if (saved) {
          const parsed = safeJsonParse(saved);
          if (parsed && typeof parsed === "object") {
            setPreferences((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.warn("Could not load preferences:", e);
      } finally {
        if (!cancelled) {
          preferencesHydratedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist preferences only after initial hydration completes
  useEffect(() => {
    if (!preferencesHydratedRef.current) return;
    AsyncStorage.setItem("@goguide_preferences", JSON.stringify(preferences)).catch((e) => {
      console.warn("Could not persist preferences:", e);
    });
  }, [preferences]);

  return (
    <CreateTripContext.Provider
      value={{ tripData, setTripData, userData, setUserData, uid, preferences, setPreferences }}
    >
      {children}
    </CreateTripContext.Provider>
  );
};