import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { auth, db } from "../../Configs/FirebaseConfig";
import { collection, doc, getDocs, query, setDoc, where, deleteDoc } from "firebase/firestore";

const STORAGE_KEY = "@goguide_favorites";
const listeners = new Set();

export const subscribeToFavorites = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyListeners = (favorites) => {
  listeners.forEach((fn) => {
    try {
      fn(favorites);
    } catch {}
  });
};

/**
 * Fetch all favorite places (Local first, synced with Firebase)
 */
export async function getFavoritePlaces() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const localFavorites = raw ? JSON.parse(raw) : [];

    const user = auth.currentUser;
    if (user?.email) {
      // Async background sync with Firebase UserFavorites
      syncFromFirebase(user.email, localFavorites).catch(() => {});
    }

    return localFavorites;
  } catch (e) {
    console.log("Error loading favorites:", e);
    return [];
  }
}

async function syncFromFirebase(email, localFavorites) {
  try {
    const q = query(collection(db, "UserFavorites"), where("userEmail", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList = [];
      snap.forEach((d) => remoteList.push({ id: d.id, ...d.data() }));

      // Merge by place name / id
      const mergedMap = new Map();
      [...localFavorites, ...remoteList].forEach((p) => {
        const key = p.id || p.name || p.title;
        if (key) mergedMap.set(String(key), p);
      });
      const merged = Array.from(mergedMap.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      notifyListeners(merged);
    }
  } catch {
    // Silent offline fallback
  }
}

/**
 * Check if a place is favorited
 */
export async function isPlaceFavorite(placeIdentifier) {
  if (!placeIdentifier) return false;
  try {
    const favorites = await getFavoritePlaces();
    const idStr = String(placeIdentifier).toLowerCase().trim();
    return favorites.some(
      (f) =>
        (f.id && String(f.id).toLowerCase() === idStr) ||
        (f.name && String(f.name).toLowerCase() === idStr) ||
        (f.title && String(f.title).toLowerCase() === idStr)
    );
  } catch {
    return false;
  }
}

/**
 * Toggle favorite status of a place
 */
export async function toggleFavoritePlace(place) {
  if (!place) return false;

  try {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {}

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const favorites = raw ? JSON.parse(raw) : [];

    const placeKey = String(place.id || place.name || place.title || Date.now()).trim();
    const placeKeyLower = placeKey.toLowerCase();
    const existingIndex = favorites.findIndex(
      (f) =>
        (f.id && String(f.id).toLowerCase().trim() === placeKeyLower) ||
        (f.name && String(f.name).toLowerCase().trim() === String(place.name || "").toLowerCase().trim()) ||
        (f.title && String(f.title).toLowerCase().trim() === String(place.title || "").toLowerCase().trim())
    );

    let isNowFav = false;
    let updated = [];

    if (existingIndex >= 0) {
      // Remove
      updated = favorites.filter((_, idx) => idx !== existingIndex);
      isNowFav = false;
    } else {
      // Add
      const itemToAdd = {
        id: placeKey,
        name: place.name || place.title || "Scenic Place",
        title: place.title || place.name || "Scenic Place",
        description: place.desc || place.description || "Top rated destination to explore",
        image:
          place.image ||
          place.img ||
          place.photoRef ||
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop",
        category: place.category || place.tag || "Must Visit",
        rating: place.rating || "4.8",
        addedAt: new Date().toISOString(),
      };
      updated = [itemToAdd, ...favorites];
      isNowFav = true;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);

    // Sync with Firebase UserFavorites if user logged in
    const user = auth.currentUser;
    if (user?.email) {
      const docId = `fav_${user.email.replace(/[^a-zA-Z0-9]/g, "_")}_${placeKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
      if (isNowFav) {
        setDoc(doc(db, "UserFavorites", docId), {
          userEmail: user.email,
          placeKey,
          ...place,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } else {
        deleteDoc(doc(db, "UserFavorites", docId)).catch(() => {});
      }
    }

    return isNowFav;
  } catch (e) {
    console.log("Toggle favorite error:", e);
    return false;
  }
}
