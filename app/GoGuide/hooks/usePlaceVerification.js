import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isVerifiable, stopKey, verifyTripStops } from "../Components/utils/PlaceVerifier";

const START_DELAY_MS = 1500; // let the plan render first; checking is a background extra

/**
 * Background "does this place exist on OpenStreetMap?" check for a trip.
 * Returns isPlaceVerified(name). Curated plans are pre-verified; AI plans get up to 8 stops checked.
 * Failures and timeouts simply leave stops untagged.
 */
export function usePlaceVerification(trip) {
  const destination = trip?.destination || "";
  const curated = trip?.coordinatesVerified === true;
  const signature = useMemo(
    () =>
      JSON.stringify([
        destination,
        (trip?.itinerary || []).map((d) => (d?.activities || []).map((a) => a?.placeName || a?.name || "")),
      ]),
    [trip, destination]
  );
  const [found, setFound] = useState({});

  useEffect(() => {
    if (!destination || curated) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      verifyTripStops(trip, {
        store: AsyncStorage,
        isCancelled: () => cancelled,
        onResult: (key, result) => {
          if (!cancelled && result?.verified) setFound((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
        },
      }).catch(() => {});
    }, START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `signature` captures every field the check depends on; `trip` itself changes identity too often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, destination, curated]);

  return useCallback(
    (name) => (curated ? isVerifiable(name) : Boolean(found[stopKey(name, destination)])),
    [curated, found, destination]
  );
}

export default usePlaceVerification;
