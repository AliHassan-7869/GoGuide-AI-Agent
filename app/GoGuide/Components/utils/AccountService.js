import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../../Configs/FirebaseConfig";
import { clearLocalFavorites } from "./FavoriteService";

// Firebase only allows deleting an account if the user signed in recently.
export const RECENT_LOGIN_WINDOW_MS = 4 * 60 * 1000;

export function hasRecentLogin(user = auth.currentUser) {
  const last = Date.parse(user?.metadata?.lastSignInTime || "");
  return Number.isFinite(last) && Date.now() - last < RECENT_LOGIN_WINDOW_MS;
}

// [collection, field the user is matched on]
const USER_DATA_QUERIES = (uid, email) => [
  ...(email
    ? [
        ["UserTrips", "userEmail", email],
        ["UserBookings", "userEmail", email],
        ["Bookings", "userEmail", email],
        ["UserFavorites", "userEmail", email],
      ]
    : []),
  ["UserTrips", "userId", uid],
  ["SharedTrips", "userId", uid],
];

/**
 * Deletes every Firestore document that belongs to the user (trips, bookings, favorites,
 * shared trip links, profile). Throws if anything could not be deleted, so the caller
 * must NOT delete the login in that case (otherwise the leftover data is orphaned).
 * Support tickets are write-once by design and are not deletable from the client.
 */
export async function deleteAllUserData({ uid, email }) {
  if (!uid) throw new Error("Not signed in");

  const refs = new Map(); // path -> ref (dedupes docs matched by both email and uid)
  for (const [col, field, value] of USER_DATA_QUERIES(uid, email)) {
    const snap = await getDocs(query(collection(db, col), where(field, "==", value)));
    snap.forEach((d) => refs.set(d.ref.path, d.ref));
  }

  // The profile document (deleting a missing document is a no-op)
  refs.set(`users/${uid}`, doc(db, "users", uid));
  const all = [...refs.values()];

  // Firestore batches are limited to 500 writes
  for (let i = 0; i < all.length; i += 400) {
    const batch = writeBatch(db);
    all.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return all.length;
}

const SESSION_PRIVATE_KEYS = [
  "@goguide_emergency_info",
  "@goguide_user_trips",
  "@goguide_local_trips",
  "@goguide_user_bookings",
  "@goguide_favorites",
  "@goguide_cached_trip",
  "@goguide_active_draft",
  "goguide_ai_copilot_chat_v1",
  "@goguide_saved_places",
  "@goguide_saved_interests",
  "@goguide_scheduled_reminders",
  "tripData:guest",
];

const SESSION_PRIVATE_PREFIXES = [
  "@goguide_packing_",
  "@goguide_trip_",
  "goguide_ai_copilot_chat_",
  "tripData:",
];

export async function clearSessionLocalData(uid = null) {
  try {
    const keySet = new Set(SESSION_PRIVATE_KEYS);
    if (uid) keySet.add(`tripData:${uid}`);

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      (allKeys || []).forEach((k) => {
        if (!k || k === "@goguide_preferences") return;
        if (SESSION_PRIVATE_PREFIXES.some((prefix) => k.startsWith(prefix)) || (uid && k.includes(uid))) {
          keySet.add(k);
        }
      });
    } catch {
      // Fall back to known static keys when getAllKeys is unavailable
    }

    const keysToRemove = [...keySet];
    try {
      if (typeof AsyncStorage.multiRemove === "function") {
        await AsyncStorage.multiRemove(keysToRemove);
      } else {
        await Promise.all(keysToRemove.map((k) => AsyncStorage.removeItem(k).catch(() => {})));
      }
    } catch {
      await Promise.all(keysToRemove.map((k) => AsyncStorage.removeItem(k).catch(() => {})));
    }
  } catch {
    // best effort
  }
  await clearLocalFavorites();
}

export async function clearLocalUserData() {
  try {
    await AsyncStorage.clear();
  } catch {
    // best effort
  }
  await clearLocalFavorites();
}
