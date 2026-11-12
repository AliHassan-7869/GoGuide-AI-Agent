import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "../../Configs/FirebaseConfig";

/**
 * Saved trips ("My Trips"): one place to load and delete them, using the same rules the
 * Profile and My Trip screens already use. Trips live in two places:
 *  - on the device: AsyncStorage "@goguide_user_trips" (and legacy "@goguide_local_trips")
 *  - in the cloud:  Firestore "UserTrips" (when signed in)
 * They are merged without duplicates (same id, or same destination name).
 */

const LOCAL_KEY = "@goguide_user_trips";
const LEGACY_LOCAL_KEY = "@goguide_local_trips";

export function getTripDestination(trip) {
  return (
    trip?.aiTripPlan?.destination ||
    trip?.toLocation?.name ||
    trip?.destination ||
    trip?.locationInfo?.name ||
    ""
  );
}

const norm = (s) => String(s || "").toLowerCase().trim();

async function readLocal(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Newest first, de-duplicated across cloud + device. Never throws. */
export async function loadSavedTrips() {
  const localTrips = await readLocal(LOCAL_KEY);

  const remoteTrips = [];
  const email = auth.currentUser?.email;
  if (email) {
    try {
      const q = query(collection(db, "UserTrips"), where("userEmail", "==", email), orderBy("createdAt", "desc"), limit(30));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        remoteTrips.push({
          id: d.id,
          ...(data.tripData || {}),
          aiTripPlan: data.aiTripPlan || data.tripData?.aiTripPlan,
          createdAt: data.createdAt,
        });
      });
    } catch (e) {
      console.log("[SavedTrips] cloud load notice:", e?.message);
    }
  }

  const seenIds = new Set();
  const seenDests = new Set();
  const merged = [];
  [...remoteTrips, ...localTrips].forEach((t) => {
    const dest = norm(getTripDestination(t));
    if (!dest) return;
    const id = t?.id ? String(t.id) : "";
    if ((id && seenIds.has(id)) || seenDests.has(dest)) return;
    if (id) seenIds.add(id);
    seenDests.add(dest);
    merged.push(t);
  });

  merged.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));

  // Self-heal duplicates on the device
  if (localTrips.length > merged.length) {
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(merged)).catch(() => {});
  }
  return merged;
}

/** Removes a trip from the cloud (if signed in) and from the device. */
export async function deleteSavedTrip(trip) {
  if (!trip) return;
  const destNorm = norm(getTripDestination(trip));
  const keep = (t) => t?.id !== trip.id && t?.createdAt !== trip.createdAt && (!destNorm || norm(getTripDestination(t)) !== destNorm);

  if (auth.currentUser?.email && trip.id) {
    try {
      await deleteDoc(doc(db, "UserTrips", String(trip.id)));
    } catch (e) {
      console.log("[SavedTrips] cloud delete notice:", e?.message);
    }
  }
  for (const key of [LOCAL_KEY, LEGACY_LOCAL_KEY]) {
    const list = await readLocal(key);
    if (list.length) await AsyncStorage.setItem(key, JSON.stringify(list.filter(keep)));
  }
}

/** The shape the My Trip screen expects when opening a saved trip. */
export function toOpenableTrip(trip) {
  return trip?.aiTripPlan ? trip : { ...trip, aiTripPlan: trip };
}
