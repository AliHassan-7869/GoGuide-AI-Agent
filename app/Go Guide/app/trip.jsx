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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../Configs/FirebaseConfig";
import { Colors } from "../Components/constants/constants";
import { getDestinationImage } from "../Components/constants/Destinations";

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

  const loadSharedTrip = async () => {
    setLoading(true);
    try {
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
        } catch (uErr) {}
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
    } catch (e) {}
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

  const handleCloneToApp = async () => {
    triggerHaptic();
    try {
      const cloned = {
        id: `cloned_${Date.now()}`,
        destination: tripPlan.destination,
        aiTripPlan: tripPlan,
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(cloned));

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Trip Saved! Opening your interactive GoGuide companion now...");
      } else {
        Alert.alert("Trip Saved!", "Opening your interactive GoGuide companion now...");
      }
      router.push("/(tabs)/mytrip");
    } catch (e) {
      console.log("Clone error:", e);
      router.push("/(tabs)/mytrip");
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
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => router.push("/(tabs)/mytrip")}
          activeOpacity={0.8}
        >
          <View style={styles.logoIcon}>
            <Ionicons name="navigate" size={16} color="#FFF" />
          </View>
          <Text style={styles.logoText}>GoGuide AI</Text>
          <View style={styles.sharedBadge}>
            <Text style={styles.sharedBadgeText}>SHARED TRIP</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCreateBtn}
          onPress={() => router.push("/create-trip/search-place")}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={13} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.navCreateBtnText}>Create Trip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Destination Banner */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <View style={styles.heroGradient} />

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
            style={styles.saveCloneBtn}
            onPress={handleCloneToApp}
            activeOpacity={0.85}
          >
            <Ionicons name="bookmark" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveCloneBtnText}>Save Trip to My Account</Text>
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
            <Text style={styles.shareBtnText}>{copiedLink ? "Copied!" : "Share Link"}</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Stays Section with Booking.com Link */}
        {hotels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>🏨 Curated Stays</Text>
              <Text style={styles.sectionCount}>{hotels.length} options</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {hotels.map((hotel, idx) => (
                <View key={idx} style={styles.hotelCard}>
                  <Image source={{ uri: hotel.image || heroImage }} style={styles.hotelImg} />
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

        {/* Day-by-Day Timeline Schedule */}
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
                <View style={styles.dayNumberBadge}>
                  <Text style={styles.dayNumberText}>Day {dayItem.day}</Text>
                </View>
                {dayItem.theme && <Text style={styles.dayThemeText}>{dayItem.theme}</Text>}
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
                  <Text style={styles.actDetails}>{act.placeDetails}</Text>

                  <View style={styles.actBottomRow}>
                    {act.travelTime && (
                      <View style={styles.travelTimeRow}>
                        <Ionicons name="footsteps-outline" size={13} color="#64748B" />
                        <Text style={styles.travelTimeText}>{act.travelTime}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.actMapBtn}
                      onPress={() => openInMaps(act.placeName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate-outline" size={13} color={Colors.PRIMARY} />
                      <Text style={styles.actMapBtnText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
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
  viralBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
});
