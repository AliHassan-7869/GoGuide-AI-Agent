import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db, auth } from "../Configs/FirebaseConfig";
import { addHotelBooking, addFlightBooking, addActivityBooking } from "../Components/utils/BookingService";
import AddActivityModal from "../Components/MyTrips/AddActivityModal";
import ExpenseTrackerModal from "../Components/MyTrips/ExpenseTrackerModal";
import { Colors } from "../Components/constants/constants";
import { getDestinationImage } from "../Components/constants/Destinations";
import { downloadItineraryPDF } from "../Components/utils/PdfDownloadService";
import { fetchDestinationEssentials } from "../Configs/AiModel";
import FavoriteHeartButton from "../Components/FavoriteHeartButton";
import { buildFlightItinerary } from "../Components/utils/FlightEngine";
import {
  detectCurrencyFromLocation,
  getCurrencySymbol,
  convertAmount,
} from "../Components/constants/Currency";

// Curated default luxury itinerary if ID is preview or not found
const DEMO_TRIP = {
  destination: "Dubai, United Arab Emirates",
  duration: "5 Days",
  traveler: "Couple",
  budget: "Moderate",
  hotels: [
    {
      name: "Address Downtown Dubai",
      address: "Downtown Dubai, Near Burj Khalifa",
      price: "$280/night",
      rating: "4.9",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    },
    {
      name: "Rove Downtown",
      address: "Financial Center Road, Downtown",
      price: "$110/night",
      rating: "4.7",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
    },
  ],
  itinerary: [
    {
      day: 1,
      theme: "Iconic Downtown & Burj Khalifa",
      activities: [
        {
          placeName: "Burj Khalifa Top Observatory",
          placeDetails: "Take the high-speed elevator to Level 124 for panoramic views of Dubai's skyline and coastline.",
          time: "10:00 AM",
          travelTime: "15 mins",
          tickets: "$45",
        },
        {
          placeName: "Dubai Mall & Fountain Show",
          placeDetails: "Explore luxury boutiques, the Dubai Aquarium, and watch the evening choreographed dancing fountain.",
          time: "02:30 PM",
          travelTime: "Walk",
          tickets: "Free",
        },
        {
          placeName: "Dinner at Souk Al Bahar",
          placeDetails: "Waterfront Arabic & Mediterranean dining with front-row fountain views.",
          time: "07:30 PM",
          travelTime: "5 mins",
          tickets: "$60",
        },
      ],
    },
    {
      day: 2,
      theme: "Red Dune Desert Safari & Bedouin Camp",
      activities: [
        {
          placeName: "Lahbab Red Dunes 4x4 Dune Bashing",
          placeDetails: "Thrilling roller-coaster ride over golden desert dunes with sandboarding stops.",
          time: "03:00 PM",
          travelTime: "45 mins",
          tickets: "$55",
        },
        {
          placeName: "Al Khayma Traditional Camp",
          placeDetails: "Sunset camel trek, henna painting, live fire show, and a 5-star BBQ buffet under the stars.",
          time: "06:30 PM",
          travelTime: "On-site",
          tickets: "Included",
        },
      ],
    },
    {
      day: 3,
      theme: "Marina Yacht Cruise & JBR Sunset",
      activities: [
        {
          placeName: "Dubai Marina Luxury Yacht Cruise",
          placeDetails: "Scenic 2-hour cruise gliding past Bluewaters Island and Ain Dubai.",
          time: "11:00 AM",
          travelTime: "25 mins",
          tickets: "$40",
        },
        {
          placeName: "Jumeirah Beach Residence (JBR) Walk",
          placeDetails: "Beachside promenade stroll, gelato shops, and sunset swimming on the Gulf.",
          time: "05:00 PM",
          travelTime: "10 mins",
          tickets: "Free",
        },
      ],
    },
  ],
};

export default function SharedTripView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [tripPlan, setTripPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [essentials, setEssentials] = useState(null);

  useEffect(() => {
    const dest = tripPlan?.destination;
    if (dest) {
      fetchDestinationEssentials(dest)
        .then((data) => {
          if (data) setEssentials(data);
        })
        .catch(() => { });
    }
  }, [tripPlan?.destination]);

  // Determine active Trip ID from query params or window location
  let targetId = params.id;
  if (!targetId && Platform.OS === "web" && typeof window !== "undefined") {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "trip") {
      targetId = parts[1];
    }
  }

  useEffect(() => {
    loadSharedTrip();
  }, [targetId]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [isDraft, setIsDraft] = useState(params?.isDraft === "true");
  const [isSavedInTrips, setIsSavedInTrips] = useState(false);
  const [bookedHotels, setBookedHotels] = useState({});
  const [isFlightBooked, setIsFlightBooked] = useState(false);
  const [bookedActivities, setBookedActivities] = useState({});
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [targetDayForActivity, setTargetDayForActivity] = useState(1);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [targetDayForExpense, setTargetDayForExpense] = useState("Day 1");
  const [tripExpenses, setTripExpenses] = useState([]);

  const darkTheme = {
    bg: "#0F172A",
    card: "#1E293B",
    border: "#334155",
    text: "#F8FAFC",
    subtext: "#94A3B8",
    isDark: true,
  };

  const loadSharedTrip = async () => {
    setLoading(true);
    try {
      // Check if this trip or destination is already saved in My Trips
      try {
        const storedTripsRaw = await AsyncStorage.getItem("@goguide_user_trips");
        if (storedTripsRaw) {
          const userTrips = JSON.parse(storedTripsRaw);
          const found = userTrips.some(
            (t) =>
              (targetId && (String(t.id) === String(targetId) || String(t?.tripData?.id) === String(targetId)))
          );
          if (found) {
            setIsSavedInTrips(true);
            setIsDraft(false);
          }
        }
      } catch (checkErr) {}

      // Check which hotels or flights are already in My Bookings
      try {
        const rawBks = await AsyncStorage.getItem("@goguide_user_bookings");
        if (rawBks) {
          const bList = JSON.parse(rawBks);
          const hMap = {};
          const actMap = {};
          bList.forEach((b) => {
            if (b.type === "Hotels") hMap[b.title] = true;
            if (b.type === "Activities") actMap[b.title] = true;
          });
          setBookedHotels(hMap);
          setBookedActivities(actMap);
        }
      } catch (bErr) {}
      // 0. Check local persistent trips list (@goguide_user_trips) first for targetId
      if (targetId && targetId !== "current-trip" && targetId !== "shared") {
        try {
          const storedTripsRaw = await AsyncStorage.getItem("@goguide_user_trips");
          if (storedTripsRaw) {
            const userTrips = JSON.parse(storedTripsRaw);
            const found = userTrips.find((t) => String(t.id) === String(targetId) || String(t?.tripData?.id) === String(targetId));
            if (found) {
              setTripPlan(found.aiTripPlan || found.tripData?.aiTripPlan || found);
              setLoading(false);
              return;
            }
          }
        } catch (localErr) {
          console.log("Local trip find notice:", localErr);
        }
      }

      // 1. Try fetching from Firestore SharedTrips
      if (targetId && targetId !== "current-trip" && targetId !== "shared") {
        try {
          const snap = await getDoc(doc(db, "SharedTrips", String(targetId)));
          if (snap.exists()) {
            const data = snap.data();
            setTripPlan(data.plan || data);
            setLoading(false);
            return;
          }
        } catch (fbErr) {
          console.log("SharedTrips load notice:", fbErr?.message);
        }

        // Try UserTrips as fallback
        try {
          const userSnap = await getDoc(doc(db, "UserTrips", String(targetId)));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setTripPlan(data.tripData?.aiTripPlan || data.tripData || data);
            setLoading(false);
            return;
          }
        } catch (uErr) { }
      }

      // 2. Check local AsyncStorage cached trip
      const cached = await AsyncStorage.getItem("@goguide_cached_trip");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.aiTripPlan) {
          setTripPlan(parsed.aiTripPlan);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to curated Demo Trip
      setTripPlan(DEMO_TRIP);
    } catch (e) {
      console.log("Error loading shared trip:", e);
      setTripPlan(DEMO_TRIP);
    } finally {
      setLoading(false);
    }
  };

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) { }
  };

  const openBookingCom = (hotelName) => {
    triggerHaptic();
    const dest = tripPlan?.destination || "";
    const query = encodeURIComponent(`${hotelName} ${dest}`.trim());
    Linking.openURL(`https://www.booking.com/searchresults.html?ss=${query}`);
  };

  const openInMaps = (placeName) => {
    triggerHaptic();
    const dest = tripPlan?.destination || "";
    const query = encodeURIComponent(`${placeName} ${dest}`.trim());
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleCopyLink = () => {
    triggerHaptic();
    const currentUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.href
        : `https://dist-seven-tau-79.vercel.app/trip/${targetId || "shared"}`;

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("Link Copied! Share it with friends or co-travelers on WhatsApp!");
    } else {
      Alert.alert("Link Copied!", "Shareable trip link copied to clipboard.");
    }
  };

  const handleDownloadPdf = async () => {
    triggerHaptic();
    if (!tripPlan) return;
    try {
      setDownloadingPdf(true);
      await downloadItineraryPDF(tripPlan, tripPlan?.destination);
    } catch (e) {
      console.log("PDF download error:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveToMyTrips = async () => {
    triggerHaptic();
    if (!tripPlan) return;

    if (isSavedInTrips) {
      const msg = "This itinerary is already saved in your My Trips!";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(msg);
      else Alert.alert("Already Saved", msg);
      return;
    }

    try {
      const tripId = targetId || `trip_${Date.now()}`;
      const user = auth.currentUser;
      const email = user?.email || "traveler@goguide.com";
      const recordToSave = {
        id: tripId,
        userEmail: email,
        destination: tripPlan.destination,
        tripData: { ...tripPlan, aiTripPlan: tripPlan },
        aiTripPlan: tripPlan,
        createdAt: new Date().toISOString(),
      };

      // 1. Cache as active trip
      await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(recordToSave));

      // 2. Add to @goguide_user_trips (My Trips)
      const storedTripsRaw = await AsyncStorage.getItem("@goguide_user_trips");
      const existingTrips = storedTripsRaw ? JSON.parse(storedTripsRaw) : [];
      const updatedList = [recordToSave, ...existingTrips.filter((t) => t.id !== tripId)];
      await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updatedList));

      // 3. Sync to Firebase UserTrips if authenticated
      if (user?.email) {
        try {
          await addDoc(collection(db, "UserTrips"), {
            userEmail: user.email,
            tripData: recordToSave.tripData,
            createdAt: new Date().toISOString(),
          });
        } catch (fbErr) {
          console.warn("Could not sync trip to Firebase:", fbErr);
        }
      }

      setIsSavedInTrips(true);
      setIsDraft(false);
      setSavedLocally(true);
      setTimeout(() => setSavedLocally(false), 3000);

      const msg = "Trip Saved! You can now access this anytime in 'My Trips'.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Trip Saved! ✅", msg);
      }
    } catch (e) {
      console.log("Save error:", e);
    }
  };

  const handleBookHotel = async (hotel) => {
    triggerHaptic();
    if (!hotel) return;
    try {
      await addHotelBooking(hotel, destination, tripPlan, auth.currentUser);
      setBookedHotels((prev) => ({ ...prev, [hotel.name]: true }));
      const msg = `${hotel.name} has been added to My Bookings! View your confirmation pass under Profile -> My Bookings.`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Hotel Added to Bookings! 🏨", msg);
      }
    } catch (e) {
      console.warn("Hotel booking error:", e);
    }
  };

  const handleBookFlight = async (flightInfo) => {
    triggerHaptic();
    if (!flightInfo) return;
    try {
      await addFlightBooking(flightInfo, destination, tripPlan, auth.currentUser);
      setIsFlightBooked(true);
      const msg = `Flight pass (${flightInfo.airline}) added to My Bookings! Access your ticket under Profile -> My Bookings.`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Flight Added to Bookings! ✈️", msg);
      }
    } catch (e) {
      console.warn("Flight booking error:", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading shared itinerary...</Text>
      </View>
    );
  }

  const destination = tripPlan?.destination || "Destination";
  const heroImage = getDestinationImage(destination);
  const itinerary = tripPlan?.itinerary || [];
  const hotels = tripPlan?.hotels || [];

  const filteredDays =
    selectedDay === "all"
      ? itinerary
      : itinerary.filter((d) => String(d.day) === String(selectedDay));

  return (
    <View style={styles.outerContainer}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={styles.backNavBtn}
            onPress={() => {
              if (params?.from === "saved") {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace({
                    pathname: "/(tabs)/profile",
                    params: { openSaved: "true" },
                  });
                }
                return;
              }
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/(tabs)/mytrip");
              }
            }}
            activeOpacity={0.8}
            accessibilityLabel="Back to Trips"
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoRow}
            onPress={() => { triggerHaptic(); setTargetDayForExpense("Day 1"); setShowExpenseModal(true); }}
            activeOpacity={0.8}
          >
            <View style={styles.logoIcon}>
              <Ionicons name="navigate" size={16} color="#FFF" />
            </View>
            <Text style={styles.logoText}>GoGuide AI</Text>
            <View
              style={[
                styles.sharedBadge,
                isDraft && !isSavedInTrips
                  ? { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "#F59E0B", borderWidth: 1 }
                  : { backgroundColor: "rgba(10, 126, 164, 0.25)" },
              ]}
            >
              <Text style={[styles.sharedBadgeText, isDraft && !isSavedInTrips && { color: "#F59E0B" }]}>
                {isDraft && !isSavedInTrips ? "AI GENERATED PREVIEW" : "YOUR TRIP"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navCreateBtn}
          onPress={() => router.push("/create-trip/search-place")}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={13} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.navCreateBtnText}>New Trip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Destination Banner */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <View style={styles.heroGradient} />
          <FavoriteHeartButton
            place={{
              name: destination,
              tag: tripPlan?.budget || "Trip Destination",
              img: heroImage,
              desc: `${tripPlan?.duration || "Multi-Day"} curated itinerary in ${destination}`,
            }}
            size={18}
            style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: 19 }}
          />

          <View style={styles.heroTextContent}>
            <View style={styles.heroPillRow}>
              <View style={styles.heroPill}>
                <Ionicons name="calendar-outline" size={12} color="#FFF" />
                <Text style={styles.heroPillText}>{tripPlan?.duration || "Multi-Day"}</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="people-outline" size={12} color="#FFF" />
                <Text style={styles.heroPillText}>{tripPlan?.traveler || "Traveler"}</Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "#10B981CC" }]}>
                <Ionicons name="wallet-outline" size={12} color="#FFF" />
                <Text style={styles.heroPillText}>{tripPlan?.budget || "Moderate"}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{destination}</Text>
            <Text style={styles.heroSub}>
              Curated Day-by-Day Itinerary with Hidden Gems & Stays
            </Text>
          </View>
        </View>

        {/* Action Callout Bar */}
        <View style={styles.actionCallout}>
          <TouchableOpacity
            style={[styles.saveCloneBtn, isSavedInTrips && { backgroundColor: "#10B981" }]}
            onPress={handleSaveToMyTrips}
            activeOpacity={0.85}
          >
            <Ionicons name={isSavedInTrips ? "checkmark-circle" : "bookmark"} size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveCloneBtnText}>{isSavedInTrips ? "Saved to My Trips ✅" : "Save to My Trips"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pdfBtn, downloadingPdf && { opacity: 0.7 }]}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.pdfBtnText}>{downloadingPdf ? "Generating..." : "Download PDF"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareBtn, copiedLink && { backgroundColor: "#10B981" }]}
            onPress={handleCopyLink}
            activeOpacity={0.85}
          >
            <Ionicons
              name={copiedLink ? "checkmark" : "share-social-outline"}
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.shareBtnText}>{copiedLink ? "Copied!" : "Share"}</Text>
          </TouchableOpacity>
        </View>

{/* Destination Essentials (Visa, Emergency, Money & Events) */}
        {essentials && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>🧭 Destination Essentials</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#0D9488" />
                <Text style={styles.verifiedBadgeText}>Live Travel Intel</Text>
              </View>
            </View>

            <View style={styles.essentialsGrid}>
              {/* Visa & Entry */}
              {essentials.visa && (
                <View style={styles.essentialCard}>
                  <View style={[styles.essentialIconCircle, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
                    <Ionicons name="card-outline" size={16} color="#0EA5E9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.essentialLabel}>VISA & ENTRY</Text>
                    <Text style={styles.essentialMainVal}>
                      {typeof essentials.visa === "string"
                        ? "Entry & Visa Guidelines"
                        : essentials.visa.visa_required || "Passport required"}
                    </Text>
                    <Text style={styles.essentialSubVal} numberOfLines={3}>
                      {typeof essentials.visa === "string"
                        ? essentials.visa.replace(/\*\*/g, "").replace(/^🛂\s*/, "")
                        : essentials.visa.stay_limit
                          ? `Stay limit: ${essentials.visa.stay_limit}`
                          : essentials.visa.notes || "Check your passport validity."}
                    </Text>
                  </View>
                </View>
              )}


        {/* 1. FIRST: Recommended Stays Section with Booking.com Link */}
        {hotels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>🏨 Recommended Stays</Text>
              <Text style={styles.sectionCount}>{hotels.length} options</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {hotels.map((hotel, idx) => (
                <View key={idx} style={styles.hotelCard}>
                  <View style={{ position: "relative" }}>
                    <Image source={{ uri: hotel.image || heroImage }} style={styles.hotelImg} />
                    <FavoriteHeartButton
                      place={{
                        name: hotel.name,
                        tag: `Hotel • ${destination}`,
                        img: hotel.image || heroImage,
                        desc: hotel.address || `Recommended stay in ${destination}`,
                      }}
                      size={14}
                      style={{ position: "absolute", top: 8, left: 8, width: 28, height: 28, borderRadius: 14 }}
                    />
                  </View>
                  <View style={styles.hotelRatingPill}>
                    <Ionicons name="star" size={11} color="#FFD700" />
                    <Text style={styles.hotelRatingText}>{hotel.rating || "4.8"}</Text>
                  </View>

                  <View style={styles.hotelBody}>
                    <Text style={styles.hotelName} numberOfLines={1}>
                      {hotel.name}
                    </Text>
                    <Text style={styles.hotelAddress} numberOfLines={1}>
                      {hotel.address || "Prime location"}
                    </Text>

                    {/* Dynamic Booking.com Deep Link */}
                    <TouchableOpacity
                      style={styles.hotelBookBtn}
                      onPress={() => openBookingCom(hotel.name)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="bed" size={13} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.hotelBookBtnText}>Book on Booking.com</Text>
                      <Ionicons name="open-outline" size={11} color="#93C5FD" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.hotelBookBtn,
                        {
                          marginTop: 6,
                          backgroundColor: bookedHotels[hotel.name] ? "#10B981" : "#0284C7",
                        },
                      ]}
                      onPress={() => handleBookHotel(hotel)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={bookedHotels[hotel.name] ? "checkmark-circle" : "calendar-outline"}
                        size={13}
                        color="#FFF"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.hotelBookBtnText}>
                        {bookedHotels[hotel.name] ? "Reserved in Bookings ✅" : "Reserve / Add to Bookings"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.hotelMapBtn}
                      onPress={() => openInMaps(hotel.name)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="location-outline" size={13} color={Colors.PRIMARY} />
                      <Text style={styles.hotelMapBtnText}>View Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. SECOND: Outbound & Return Flight Schedule (Departure Day & Return Day) */}
        {(() => {
          const originName = tripPlan?.flights?.origin || tripPlan?.origin || "Home Airport";
          const numDays = itinerary.length || parseInt(tripPlan?.duration, 10) || 3;
          const flightInfo = buildFlightItinerary({
            origin: originName,
            destination: destination,
            days: numDays,
            budget: tripPlan?.budget || "Moderate",
            existingFlights: tripPlan?.flights,
          });

          return (
            <View style={[styles.section, { marginTop: 22 }]}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>✈️ Outbound & Return Flights</Text>
                <Text style={styles.sectionCount}>
                  {flightInfo.originIata} ⇄ {flightInfo.destIata} • {flightInfo.airline}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: "#334155",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: 12,
                    padding: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: "#0EA5E9",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#38BDF8" }}>
                      🛫 GOING • DAY 1 ({flightInfo.departureDate})
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {flightInfo.outboundFlightNo} • {flightInfo.duration}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#F8FAFC", marginTop: 4 }}>
                    {flightInfo.origin} ({flightInfo.originIata}) ✈️ {flightInfo.destination} ({flightInfo.destIata})
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                    {flightInfo.outboundDepTime} ──({flightInfo.stops})──► {flightInfo.outboundArrTime} • {flightInfo.originAirport}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: "#10B981",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#34D399" }}>
                      🛬 RETURNING • DAY {numDays} ({flightInfo.returnDate})
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                      {flightInfo.returnFlightNo} • {flightInfo.duration}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#F8FAFC", marginTop: 4 }}>
                    {flightInfo.destination} ({flightInfo.destIata}) ✈️ {flightInfo.origin} ({flightInfo.originIata})
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                    {flightInfo.returnDepTime} ──({flightInfo.stops})──► {flightInfo.returnArrTime} • 🧳 {flightInfo.baggage}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#10B981" }}>
                    Est. Round-Trip: {flightInfo.price}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#0284C7",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                      onPress={() => Linking.openURL(flightInfo.skyscannerUrl)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>Skyscanner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: Colors.PRIMARY,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                      onPress={() => Linking.openURL(flightInfo.bookingUrl)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
                        Google Flights ✈️
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })()}

        {/* 3. THIRD: Day-by-Day Timeline Schedule */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>🗓️ Day-by-Day Schedule</Text>

          {/* Day Filter Pills */}
          {itinerary.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
              <TouchableOpacity
                style={[styles.dayTabPill, selectedDay === "all" && styles.dayTabActive]}
                onPress={() => setSelectedDay("all")}
              >
                <Text style={[styles.dayTabText, selectedDay === "all" && styles.dayTabTextActive]}>
                  All Days
                </Text>
              </TouchableOpacity>
              {itinerary.map((d) => (
                <TouchableOpacity
                  key={d.day}
                  style={[styles.dayTabPill, String(selectedDay) === String(d.day) && styles.dayTabActive]}
                  onPress={() => setSelectedDay(String(d.day))}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      String(selectedDay) === String(d.day) && styles.dayTabTextActive,
                    ]}
                  >
                    Day {d.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Activity Timeline List */}
          {filteredDays.map((dayItem) => (
            <View key={dayItem.day} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <View style={styles.dayNumberBadge}>
                    <Text style={styles.dayNumberText}>Day {dayItem.day}</Text>
                  </View>
                  {dayItem.theme && <Text style={styles.dayThemeText}>{dayItem.theme}</Text>}
                </View>

                {/* Day Action Buttons: + Add Activity, 💳 Log Expense & 💾 Save to Trips */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  <TouchableOpacity
                    style={styles.dayActionBtnAdd}
                    onPress={() => {
                      triggerHaptic();
                      setTargetDayForActivity(dayItem.day);
                      setShowAddActivityModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={13} color="#FFF" />
                    <Text style={styles.dayActionBtnText}>Add Activity</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dayActionBtnExpense}
                    onPress={() => {
                      triggerHaptic();
                      setTargetDayForExpense(`Day ${dayItem.day}`);
                      setShowExpenseModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="card-outline" size={12} color="#F59E0B" />
                    <Text style={[styles.dayActionBtnText, { color: "#F59E0B" }]}>Log Expense</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dayActionBtnSaveTrip,
                      isSavedInTrips && { backgroundColor: "#10B981" },
                    ]}
                    onPress={handleSaveToMyTrips}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSavedInTrips ? "checkmark-circle" : "bookmark"}
                      size={12}
                      color="#FFF"
                    />
                    <Text style={styles.dayActionBtnText}>
                      {isSavedInTrips ? "Saved to Trips ✅" : "Save to Trips"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(dayItem.activities || []).map((act, actIdx) => (
                <View key={actIdx} style={styles.activityCard}>
                  <View style={styles.actTopRow}>
                    <View style={styles.timePill}>
                      <Ionicons name="time-outline" size={12} color={Colors.PRIMARY} />
                      <Text style={styles.timePillText}>{act.time || "Scheduled"}</Text>
                    </View>
                    {act.tickets && (
                      <View style={styles.ticketPill}>
                        <Ionicons name="ticket-outline" size={12} color="#10B981" />
                        <Text style={styles.ticketPillText}>{act.tickets}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.actTitle}>{act.placeName}</Text>
                  <Text style={styles.actDetails}>{act.details || act.placeDetails}</Text>

                  <View style={styles.actBottomRow}>
                    {act.travelTime && (
                      <View style={styles.travelTimeRow}>
                        <Ionicons name="footsteps-outline" size={13} color="#64748B" />
                        <Text style={styles.travelTimeText}>{act.travelTime}</Text>
                      </View>
                    )}

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                      <FavoriteHeartButton
                        place={{
                          name: act.placeName,
                          tag: `Activity • Day ${dayItem.day} • ${destination}`,
                          img: heroImage,
                          desc: act.details || act.placeDetails || `Attraction in ${destination}`,
                        }}
                        size={13}
                        style={{ width: 28, height: 28, borderRadius: 14 }}
                      />

                      <TouchableOpacity
                        style={styles.actMapBtn}
                        onPress={() => openInMaps(act.placeName)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate-outline" size={12} color={Colors.PRIMARY} />
                        <Text style={styles.actMapBtnText}>Directions</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actBookBtn,
                          bookedActivities[act.placeName] && { backgroundColor: "#10B981" },
                        ]}
                        onPress={() => handleBookActivity(act, dayItem.day)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={bookedActivities[act.placeName] ? "checkmark-circle" : "ticket-outline"}
                          size={12}
                          color="#FFF"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.actBookBtnText}>
                          {bookedActivities[act.placeName] ? "Booked ✅" : "Add to Bookings"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add Custom Activity Footer Button for this Day */}
              <TouchableOpacity
                style={styles.dayAddBottomBtn}
                onPress={() => {
                  triggerHaptic();
                  setTargetDayForActivity(dayItem.day);
                  setShowAddActivityModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={15} color={Colors.PRIMARY} />
                <Text style={styles.dayAddBottomText}>+ Add custom activity to Day {dayItem.day}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>


              {/* Currency & Tipping */}
              {essentials.currency && (
                <View style={styles.essentialCard}>
                  <View style={[styles.essentialIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                    <Ionicons name="cash-outline" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.essentialLabel}>MONEY & TIPPING</Text>
                    <Text style={styles.essentialMainVal}>
                      {typeof essentials.currency === "string"
                        ? "Currency & Payments"
                        : essentials.currency.currency_code
                          ? `${essentials.currency.currency_code} · ${essentials.currency.card_vs_cash || "Cards accepted"}`
                          : "Cash & Cards"}
                    </Text>
                    <Text style={styles.essentialSubVal} numberOfLines={3}>
                      {typeof essentials.currency === "string"
                        ? essentials.currency.replace(/\*\*/g, "").replace(/^💳\s*/, "")
                        : essentials.currency.tipping || "Standard 10% tipping appreciated."}
                    </Text>
                  </View>
                </View>
              )}

              {/* Emergency Hotline */}
              {essentials.emergency && (
                <View style={styles.essentialCard}>
                  <View style={[styles.essentialIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                    <Ionicons name="call-outline" size={16} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.essentialLabel}>EMERGENCY NUMBERS</Text>
                    <Text style={styles.essentialMainVal}>
                      {typeof essentials.emergency === "string"
                        ? "Local Emergency & Health"
                        : `Police: ${essentials.emergency.police || "911/112"} · Amb: ${essentials.emergency.ambulance || "911/112"}`}
                    </Text>
                    <Text style={styles.essentialSubVal} numberOfLines={3}>
                      {typeof essentials.emergency === "string"
                        ? essentials.emergency.replace(/\*\*/g, "").replace(/^🚨\s*/, "")
                        : `General hotline: ${essentials.emergency.general || "112"}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Seasonal & Events */}
              {(essentials.events || (essentials.seasonal_events && essentials.seasonal_events.length > 0)) && (
                <View style={styles.essentialCard}>
                  <View style={[styles.essentialIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                    <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.essentialLabel}>SEASON & HIGHLIGHTS</Text>
                    <Text style={styles.essentialMainVal}>
                      {typeof essentials.events === "string"
                        ? "Seasonal Highlights"
                        : `${essentials.seasonal_events[0].event} (${essentials.seasonal_events[0].month})`}
                    </Text>
                    <Text style={styles.essentialSubVal} numberOfLines={3}>
                      {typeof essentials.events === "string"
                        ? essentials.events.replace(/\*\*/g, "").replace(/^🎉\s*/, "")
                        : essentials.seasonal_events[0].highlights || "Great regional weather and seasonal festivities."}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 4. LAST: End-of-Day Trip Budget & Log Expense Card */}
        {(() => {
          const rawTier = tripPlan?.budget || "Moderate";
          const baseBudgetUSD = rawTier.toLowerCase().includes("luxury")
            ? 3000
            : rawTier.toLowerCase().includes("economical") || rawTier.toLowerCase().includes("cheap")
            ? 600
            : 1500;
          const destCur = detectCurrencyFromLocation(destination) || "GBP";
          const origCur = detectCurrencyFromLocation(tripPlan?.origin || "") || "PKR";
          const destSym = getCurrencySymbol(destCur);
          const origSym = getCurrencySymbol(origCur);

          return (
            <View style={[styles.section, { marginTop: 22 }]}>
              <View
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#334155",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Ionicons name="wallet" size={18} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#F8FAFC" }}>
                        Trip Budget & Daily Expenses
                      </Text>
                      <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                        Est. Cap: ${baseBudgetUSD.toLocaleString()} USD • ≈ {destSym}{convertAmount(baseBudgetUSD, destCur).toLocaleString()} ({destCur}) • {origSym}{convertAmount(baseBudgetUSD, origCur).toLocaleString()} ({origCur})
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F59E0B",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                    onPress={() => { triggerHaptic(); setTargetDayForExpense("Day 1"); setShowExpenseModal(true); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={15} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>Log Expense</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Viral Bottom Call-to-Action Banner */}
        <View style={styles.viralBanner}>
          <View style={styles.viralIconCircle}>
            <Ionicons name="airplane" size={24} color="#FFF" />
          </View>
          <Text style={styles.viralTitle}>Plan Your Dream Vacation</Text>
          <Text style={styles.viralSub}>
            Let GoGuide AI create your custom day-by-day travel itinerary with flights, stays & safety intelligence in 10 seconds.
          </Text>
          <TouchableOpacity
            style={styles.viralBtn}
            onPress={() => router.push("/create-trip/search-place")}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.viralBtnText}>Generate My Free AI Trip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
          {/* Add Custom Activity Modal */}
      <AddActivityModal
        visible={showAddActivityModal}
        dayNumber={targetDayForActivity}
        onClose={() => setShowAddActivityModal(false)}
        onAddActivity={handleAddActivity}
        theme={darkTheme}
      />

      {/* Trip Budget & Expense Tracker Modal */}
      <ExpenseTrackerModal
        visible={showExpenseModal}
        initialDay={targetDayForExpense}
        expenses={tripExpenses}
        budgetTier={tripPlan?.budget || "Moderate"}
        currency="USD"
        destination={tripPlan?.destination || ""}
        origin={tripPlan?.origin || ""}
        onSaveExpenses={handleSaveExpenses}
        onClose={() => setShowExpenseModal(false)}
        theme={darkTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Outfit-Medium",
    marginTop: 12,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 14 : 50,
    paddingBottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  backNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoText: {
    color: "#FFF",
    fontSize: 17,
    fontFamily: "Outfit-Bold",
  },
  sharedBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.18)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.4)",
  },
  sharedBadgeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  navCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navCreateBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroWrap: {
    position: "relative",
    height: 260,
    width: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  heroTextContent: {
    position: "absolute",
    bottom: 20,
    left: 18,
    right: 18,
  },
  heroPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  heroPillText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 26,
    fontFamily: "Outfit-Bold",
  },
  heroSub: {
    color: "#CBD5E1",
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  actionCallout: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  saveCloneBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveCloneBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  pdfBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284C7",
    paddingVertical: 12,
    borderRadius: 14,
  },
  pdfBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  shareBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  sectionCount: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  hotelCard: {
    width: 255,
    backgroundColor: "#1E293B",
    borderRadius: 18,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  hotelImg: {
    width: "100%",
    height: 125,
  },
  hotelRatingPill: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  hotelRatingText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  hotelBody: {
    padding: 12,
  },
  hotelName: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginBottom: 2,
  },
  hotelAddress: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginBottom: 10,
  },
  hotelBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003580",
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 6,
  },
  hotelBookBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  hotelMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 126, 164, 0.15)",
    paddingVertical: 6,
    borderRadius: 8,
  },
  hotelMapBtnText: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    marginLeft: 4,
  },
  dayTabsScroll: {
    marginVertical: 12,
  },
  dayTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dayTabActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  dayTabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  dayTabTextActive: {
    color: "#FFF",
    fontFamily: "Outfit-Bold",
  },
  dayGroup: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  dayNumberBadge: {
    backgroundColor: "rgba(10, 126, 164, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(10, 126, 164, 0.4)",
    marginRight: 8,
  },
  dayNumberText: {
    color: "#38BDF8",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  dayThemeText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontFamily: "Outfit-Medium",
    flex: 1,
  },
  activityCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  actTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 126, 164, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  timePillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  ticketPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  ticketPillText: {
    color: "#10B981",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  actTitle: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    marginBottom: 4,
  },
  actDetails: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  actBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  travelTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  travelTimeText: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  actMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actMapBtnText: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  viralBanner: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(10, 126, 164, 0.3)",
  },
  viralIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  viralTitle: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  viralSub: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  viralBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(13, 148, 136, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  verifiedBadgeText: {
    color: "#2DD4BF",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  essentialsGrid: {
    marginTop: 12,
    gap: 10,
  },
  essentialCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  essentialIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  essentialLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  essentialMainVal: {
    color: "#F8FAFC",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  essentialSubVal: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 15,
  },
  viralBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  dayActionBtnAdd: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dayActionBtnExpense: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dayActionBtnSaveTrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dayActionBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  actBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actBookBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  dayAddBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    borderStyle: "dashed",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    gap: 6,
  },
  dayAddBottomText: {
    color: Colors.PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
});
