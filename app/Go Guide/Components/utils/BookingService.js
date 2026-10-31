import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../Configs/FirebaseConfig";
import { getDestinationImage } from "../constants/Destinations";

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
    details: `${travelerType} • 1 Deluxe Room • Confirmed Reservation`,
    price: hotel?.price || "$120/night",
    image: hotel?.image || destImage,
    coordinates: tripData?.toLocation?.coordinates || { lat: 0, lng: 0 },
    userEmail: userEmail,
    destination: destName,
    createdAt: new Date().toISOString(),
  };

  // 2. Create Flight / Transit Booking Entry
  const flightRefCode = `GG-F${Math.floor(10000 + Math.random() * 90000)}`;
  const flightBooking = {
    id: `bk_${Date.now()}_flight`,
    type: "Flights",
    status: "Upcoming",
    bookingRef: flightRefCode,
    title: `${destClean} Express Air Transit`,
    subtitle: `Flight to: ${destName} ✈️`,
    checkIn: `${startFormatted} • 08:30 AM`,
    checkOut: `${startFormatted} • 01:15 PM`,
    details: `Confirmed Boarding Pass • Terminal 1 • Seat 14A, 14B • ${travelerType}`,
    price: flight?.price || "$320.00",
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

  // 5. Automatically ensure this trip is saved in My Trips (@goguide_user_trips and UserTrips)
  try {
    const rawTrips = await AsyncStorage.getItem("@goguide_user_trips");
    const existingTrips = rawTrips ? JSON.parse(rawTrips) : [];
    const tripId = tripData?.id || `trip_${Date.now()}`;
    const tripRecord = {
      id: tripId,
      userEmail: userEmail,
      tripData: tripData,
      ...tripData,
      createdAt: tripData?.createdAt || new Date().toISOString(),
    };

    const isAlreadySaved = existingTrips.some(
      (t) => (t.id && t.id === tripId) || 
             (t.aiTripPlan?.destination && t.aiTripPlan.destination === destName)
    );

    if (!isAlreadySaved) {
      const updatedTrips = [tripRecord, ...existingTrips];
      await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updatedTrips));

      if (authUser?.email) {
        try {
          await addDoc(collection(db, "UserTrips"), {
            userEmail: authUser.email,
            tripData: tripData,
            createdAt: new Date().toISOString(),
          });
        } catch (fbTripErr) {
          console.warn("Could not sync trip to Firestore:", fbTripErr);
        }
      }
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
