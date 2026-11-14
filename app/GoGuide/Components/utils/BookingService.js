import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../Configs/FirebaseConfig";
import { getDestinationImage } from "../constants/Destinations";
import { buildFlightItinerary } from "./FlightEngine";
import { coordsOf } from "./mapsLinks";

/**
 * Saves hotel & flight booking passes into My Bookings and ensures the trip is saved in My Trips
 */
export async function saveTripToBookings(tripData, authUser) {
  if (!tripData) return { success: false, message: "No trip data provided" };

  const plan = tripData?.aiTripPlan || tripData;
  const destName =
    plan?.destination ||
    tripData?.toLocation?.name ||
    tripData?.destination ||
    tripData?.locationInfo?.name ||
    "Destination";
  const destClean = destName.split(",")[0].trim();

  const hotel = plan?.hotels?.[0];
  const flight = plan?.flights;
  const destImage =
    tripData?.toLocationImage ||
    tripData?.locationInfo?.photoRef ||
    hotel?.image ||
    getDestinationImage(destName);

  const startFormatted = tripData?.startDate
    ? new Date(tripData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Day 1";

  const endFormatted = tripData?.endDate
    ? new Date(tripData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : `Day ${plan?.duration || 3}`;

  const travelerType = plan?.traveler || tripData?.traveler?.title || "Explorer";
  const budgetTier = plan?.budget || tripData?.budget || "Moderate";
  const userEmail = authUser?.email || "traveler@goguide.com";

  // 1. Create Hotel Booking Entry
  const hotelRefCode = `GG-H${Math.floor(10000 + Math.random() * 90000)}`;
  const hotelBooking = {
    id: `bk_${Date.now()}_hotel`,
    type: "Hotels",
    status: "Upcoming",
    bookingRef: hotelRefCode,
    title: hotel?.name || `${destClean} Grand Boutique Hotel`,
    subtitle: hotel?.address || `${destName} (Central District)`,
    checkIn: `${startFormatted} • 03:00 PM`,
    checkOut: `${endFormatted} • 11:00 AM`,
    details: `${travelerType} • 1 Deluxe Room • Planned stay (not booked yet)`,
    price: hotel?.price || "$120/night",
    image: hotel?.image || destImage,
    coordinates: coordsOf(hotel) || null,
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  // 2. Create Flight / Transit Booking Entry with real IATA codes & airline details
  const flightRefCode = `GG-F${Math.floor(10000 + Math.random() * 90000)}`;
  const originRaw =
    flight?.origin ||
    plan?.origin ||
    tripData?.fromLocation?.name?.split(",")[0]?.trim() ||
    "Home Airport";
  const resolvedFlight = buildFlightItinerary({
    origin: originRaw,
    destination: destName,
    startDate: tripData?.startDate,
    endDate: tripData?.endDate,
    days: plan?.itinerary?.length || tripData?.totalNoOfDays || 3,
    budget: budgetTier,
    existingFlights: flight,
  });
  const flightBooking = {
    id: `bk_${Date.now()}_flight`,
    type: "Flights",
    status: "Upcoming",
    bookingRef: flightRefCode,
    title: `${resolvedFlight.airline} (${resolvedFlight.outboundFlightNo} / ${resolvedFlight.returnFlightNo})`,
    subtitle: `${resolvedFlight.originIata} (${resolvedFlight.origin}) ✈️ ${resolvedFlight.destIata} (${resolvedFlight.destination})`,
    checkIn: `Outbound: ${resolvedFlight.departureDate} • ${resolvedFlight.outboundDepTime}`,
    checkOut: `Return: ${resolvedFlight.returnDate} • ${resolvedFlight.returnDepTime}`,
    details: `${resolvedFlight.cabinClass} • ${resolvedFlight.duration} (${resolvedFlight.stops}) • ${resolvedFlight.baggage}`,
    price: resolvedFlight.price || "$680.00",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop",
    coordinates: tripData?.toLocation?.coordinates || { lat: 0, lng: 0 },
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  const newBookings = [hotelBooking, flightBooking];

  // 3. Save Bookings to Local Storage (@goguide_user_bookings)
  try {
    const rawExisting = await AsyncStorage.getItem("@goguide_user_bookings");
    const existingList = rawExisting ? JSON.parse(rawExisting) : [];
    const mergedList = [...newBookings, ...existingList.filter(
      (b) => !newBookings.some((nb) => nb.id === b.id || (nb.title === b.title && nb.destination === b.destination))
    )];
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify(mergedList));
  } catch (err) {
    console.warn("Could not save bookings to AsyncStorage:", err);
  }

  // 4. Save Bookings to Firestore if authenticated
  if (authUser?.email) {
    try {
      for (const bk of newBookings) {
        await addDoc(collection(db, "UserBookings"), bk);
      }
    } catch (fbErr) {
      console.warn("Could not sync bookings to Firestore:", fbErr);
    }
  }

  // 5. Automatically ensure this trip is saved in My Trips (@goguide_user_trips and UserTrips) without duplicates
  try {
    const rawTrips = await AsyncStorage.getItem("@goguide_user_trips");
    const existingTrips = rawTrips ? JSON.parse(rawTrips) : [];
    const destNorm = destName.toLowerCase().trim();
    let finalTripId = tripData?.id || `trip_${Date.now()}`;

    const isAlreadySaved = existingTrips.some((t) => {
      const tDest = (
        t?.aiTripPlan?.destination ||
        t?.tripData?.aiTripPlan?.destination ||
        t?.destination ||
        t?.toLocation?.name ||
        ""
      )
        .toLowerCase()
        .trim();
      return (t.id && String(t.id) === String(finalTripId)) || (destNorm && tDest === destNorm);
    });

    if (!isAlreadySaved) {
      if (authUser?.email) {
        try {
          const docRef = await addDoc(collection(db, "UserTrips"), {
            userEmail: authUser.email,
            tripData: { ...tripData, id: finalTripId },
            createdAt: new Date().toISOString(),
          });
          if (docRef?.id) {
            finalTripId = docRef.id;
          }
        } catch (fbTripErr) {
          console.warn("Could not sync trip to Firestore:", fbTripErr);
        }
      }

      const tripRecord = {
        id: finalTripId,
        userEmail: userEmail,
        destination: destName,
        tripData: { ...tripData, id: finalTripId },
        ...tripData,
        createdAt: tripData?.createdAt || new Date().toISOString(),
      };

      const updatedTrips = [
        tripRecord,
        ...existingTrips.filter((t) => {
          const tDest = (
            t?.aiTripPlan?.destination ||
            t?.tripData?.aiTripPlan?.destination ||
            t?.destination ||
            ""
          )
            .toLowerCase()
            .trim();
          return String(t.id) !== String(finalTripId) && (!destNorm || tDest !== destNorm);
        }),
      ];
      await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updatedTrips));
    }
  } catch (tripErr) {
    console.warn("Could not ensure trip saved:", tripErr);
  }

  return {
    success: true,
    destName,
    hotelBooking,
    flightBooking,
    bookingsCount: newBookings.length,
  };
}


/**
 * Manually reserves / adds a single hotel into My Bookings
 */
export async function addHotelBooking(hotel, destination, tripData, authUser) {
  if (!hotel) return null;
  const destName = destination || tripData?.destination || "Destination";
  const userEmail = authUser?.email || "traveler@goguide.com";
  const hotelRefCode = `GG-H${Math.floor(10000 + Math.random() * 90000)}`;

  const startFormatted = tripData?.startDate
    ? new Date(tripData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Day 1";
  const endFormatted = tripData?.endDate
    ? new Date(tripData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Day 3";

  const booking = {
    id: `bk_${Date.now()}_hotel`,
    type: "Hotels",
    status: "Upcoming",
    bookingRef: hotelRefCode,
    title: hotel?.name || `${destName} Boutique Hotel`,
    subtitle: hotel?.address || `${destName} (Central District)`,
    checkIn: `${startFormatted} • 03:00 PM`,
    checkOut: `${endFormatted} • 11:00 AM`,
    details: `${tripData?.traveler || "Explorer"} • 1 Deluxe Room • Planned stay (not booked yet)`,
    price: hotel?.price || "$120/night",
    image: hotel?.image || getDestinationImage(destName),
    coordinates: coordsOf(hotel) || null,
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  try {
    const rawExisting = await AsyncStorage.getItem("@goguide_user_bookings");
    const existing = rawExisting ? JSON.parse(rawExisting) : [];
    const updated = [booking, ...existing.filter((b) => b.title !== booking.title)];
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify(updated));
  } catch (e) {
    console.warn("AsyncStorage booking notice:", e);
  }

  if (authUser?.email) {
    try {
      await addDoc(collection(db, "UserBookings"), booking);
    } catch (e) {
      console.warn("Firestore booking notice:", e);
    }
  }

  return booking;
}

/**
 * Manually reserves / adds a single flight into My Bookings
 */
export async function addFlightBooking(flightInfo, destination, tripData, authUser) {
  if (!flightInfo) return null;
  const destName = destination || tripData?.destination || "Destination";
  const userEmail = authUser?.email || "traveler@goguide.com";
  const flightRefCode = `GG-F${Math.floor(10000 + Math.random() * 90000)}`;

  const booking = {
    id: `bk_${Date.now()}_flight`,
    type: "Flights",
    status: "Upcoming",
    bookingRef: flightRefCode,
    title: `${flightInfo.airline} (${flightInfo.outboundFlightNo} / ${flightInfo.returnFlightNo})`,
    subtitle: `${flightInfo.originIata} (${flightInfo.origin}) ✈️ ${flightInfo.destIata} (${flightInfo.destination})`,
    checkIn: `Outbound: ${flightInfo.departureDate} • ${flightInfo.outboundDepTime}`,
    checkOut: `Return: ${flightInfo.returnDate} • ${flightInfo.returnDepTime}`,
    details: `${flightInfo.cabinClass} • ${flightInfo.duration} (${flightInfo.stops}) • ${flightInfo.baggage}`,
    price: flightInfo.price || "$680.00",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop",
    coordinates: tripData?.toLocation?.coordinates || { lat: 0, lng: 0 },
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  try {
    const rawExisting = await AsyncStorage.getItem("@goguide_user_bookings");
    const existing = rawExisting ? JSON.parse(rawExisting) : [];
    const updated = [booking, ...existing.filter((b) => b.bookingRef !== booking.bookingRef)];
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify(updated));
  } catch (e) {
    console.warn("AsyncStorage flight booking notice:", e);
  }

  if (authUser?.email) {
    try {
      await addDoc(collection(db, "UserBookings"), booking);
    } catch (e) {
      console.warn("Firestore flight booking notice:", e);
    }
  }

  return booking;
}

/**
 * Manually reserves / adds an activity pass into My Bookings
 */
export async function addActivityBooking(activity, dayNumber, destination, tripData, authUser) {
  if (!activity) return null;
  const destName = destination || tripData?.destination || "Destination";
  const userEmail = authUser?.email || "traveler@goguide.com";
  const passRefCode = `GG-A${Math.floor(10000 + Math.random() * 90000)}`;

  const booking = {
    id: `bk_${Date.now()}_activity`,
    type: "Activities",
    status: "Upcoming",
    bookingRef: passRefCode,
    title: activity.placeName || "Day Tour & Attraction Pass",
    subtitle: `${destName} • ${dayNumber ? `Day ${dayNumber}` : "Day 1"} (${activity.time || "Scheduled"})`,
    checkIn: `${activity.time || "Morning"} • Planned entry`,
    checkOut: `${activity.travelTime || "Tour Completed"}`,
    details: activity.details || activity.placeDetails || "Standard Activity Entry & Pass",
    price: activity.tickets || "Free / Included",
    image: getDestinationImage(destName),
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  try {
    const rawExisting = await AsyncStorage.getItem("@goguide_user_bookings");
    const existing = rawExisting ? JSON.parse(rawExisting) : [];
    const updated = [booking, ...existing.filter((b) => b.title !== booking.title)];
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify(updated));
  } catch (e) {
    console.warn("AsyncStorage activity booking notice:", e);
  }

  if (authUser?.email) {
    try {
      await addDoc(collection(db, "UserBookings"), booking);
    } catch (e) {
      console.warn("Firestore activity booking notice:", e);
    }
  }

  return booking;
}
