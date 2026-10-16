import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Image, 
  Linking, 
  ActivityIndicator,
  Share,
  Platform 
} from "react-native";
import { auth, db } from "../../Configs/FirebaseConfig";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import WeatherCard from "../../Components/MyTrips/WeatherCard";
import PackingList from "../../Components/MyTrips/PackingList";
import StartNewTripCard from "../../Components/MyTrips/StartNewTripCard";

// High quality curated hotel fallbacks
const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop"
];

export default function MyTrip() {
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const theme = useTheme();
  const plan = tripData?.aiTripPlan;
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all"); // "all" or day number

  useEffect(() => {
    if (!plan && auth.currentUser) {
      GetMyTrips();
    }
  }, [auth.currentUser]);

  const GetMyTrips = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "UserTrips"),
        where("userEmail", "==", auth.currentUser.email),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        setTripData(doc.data().tripData);
      });
    } catch (e) {
      console.log("Error fetching trips:", e);
    }
    setLoading(false);
  };

  const createNewTrip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTripData({});
    router.push("/create-trip/search-place");
  };

  const shareItinerary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const message = `✈️ My Trip Plan for ${plan?.destination || "Vacation"}!\nDuration: ${plan?.duration || "N/A"}\nBudget: ${plan?.budget || "Moderate"}\n\nGenerated with GoGuide AI 🚀`;
      await Share.share({ message });
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const openInMaps = (placeName, coordinates) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let url = "";
    if (coordinates?.lat && coordinates?.lng && coordinates.lat !== 0) {
      url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " " + (plan?.destination || ""))}`;
    }
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={{ marginTop: 20, fontFamily: "Outfit-Medium", color: theme.text }}>Loading your trip...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StartNewTripCard />
      </View>
    );
  }

  const daysList = plan.itinerary || [];
  const filteredDays = selectedDay === "all" 
    ? daysList 
    : daysList.filter(d => String(d.day) === String(selectedDay));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>My Itinerary</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{plan.destination}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={shareItinerary}>
            <Ionicons name="share-social-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]} onPress={createNewTrip}>
            <Ionicons name="add-circle" size={26} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Hero Banner with Modern Glassmorphism Overlay */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: tripData?.toLocationImage || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop" }} 
            style={styles.heroImage} 
          />
          <View style={styles.heroGradient} />
          
          <View style={styles.heroGlassCard}>
            <View style={styles.badgeRow}>
              <View style={styles.glassBadge}>
                <Ionicons name="time-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.duration || "Multi-Day"}</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="wallet-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.budget || "Budget"}</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="people-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.traveler || "Traveler"}</Text>
              </View>
            </View>
            <Text style={styles.heroDestTitle}>{plan.destination}</Text>
          </View>
        </View>
        
        {/* Weather & Packing Quick Widgets */}
        <WeatherCard weatherBrief={plan.weatherBrief} />
        <PackingList items={plan.packingList} />

        {/* Flight Information Card (if available) */}
        {plan.flights && (
          <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                <Ionicons name="airplane" size={18} color={Colors.PRIMARY} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Flight Logistics</Text>
            </View>
            <Text style={[styles.infoText, { color: theme.text }]}>{plan.flights.details}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceTag}>Est. {plan.flights.price}</Text>
              {plan.flights.bookingUrl && plan.flights.bookingUrl !== "string" && (
                <TouchableOpacity style={styles.bookButton} onPress={() => Linking.openURL(plan.flights.bookingUrl)}>
                  <Text style={styles.bookButtonText}>Book Flight</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Recommended Hotels Section */}
        {plan.hotels?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🏨 Recommended Stays</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>{plan.hotels.length} options</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {plan.hotels.map((hotel, idx) => (
                <View key={idx} style={[styles.hotelCard, { backgroundColor: theme.card }]}>
                  <View style={styles.hotelImageWrap}>
                    <Image 
                      source={{ uri: HOTEL_IMAGES[idx % HOTEL_IMAGES.length] }} 
                      style={styles.hotelImage} 
                    />
                    <View style={styles.hotelRatingPill}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.hotelRatingText}>{hotel.rating || "4.8"}</Text>
                    </View>
                    <View style={styles.hotelPricePill}>
                      <Text style={styles.hotelPriceText}>{hotel.price}</Text>
                    </View>
                  </View>

                  <View style={styles.hotelBody}>
                    <Text style={[styles.hotelName, { color: theme.text }]} numberOfLines={1}>{hotel.name}</Text>
                    <Text style={[styles.hotelAddress, { color: theme.subtext }]} numberOfLines={1}>
                      {hotel.address || hotel.details || "Convenient location"}
                    </Text>

                    <TouchableOpacity 
                      style={styles.hotelMapBtn}
                      onPress={() => openInMaps(hotel.name, hotel.coordinates)}
                    >
                      <Ionicons name="navigate-circle-outline" size={16} color={Colors.PRIMARY} />
                      <Text style={styles.hotelMapBtnText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Daily Itinerary Section */}
        <View style={[styles.section, { marginTop: 25 }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🗓️ Daily Schedule</Text>
          </View>

          {/* Sticky Horizontal Day Filter Pills */}
          {daysList.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
              <TouchableOpacity 
                style={[
                  styles.dayTabPill, 
                  selectedDay === "all" ? styles.dayTabActive : { backgroundColor: theme.card }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay("all");
                }}
              >
                <Text style={[styles.dayTabText, selectedDay === "all" ? styles.dayTabTextActive : { color: theme.text }]}>
                  All Days
                </Text>
              </TouchableOpacity>

              {daysList.map((d, index) => {
                const isActive = String(selectedDay) === String(d.day);
                return (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      styles.dayTabPill, 
                      isActive ? styles.dayTabActive : { backgroundColor: theme.card }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDay(String(d.day));
                    }}
                  >
                    <Text style={[styles.dayTabText, isActive ? styles.dayTabTextActive : { color: theme.text }]}>
                      Day {d.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Activities Timeline */}
          {filteredDays.map((day, i) => (
            <View key={i} style={styles.dayContainer}>
              <View style={[styles.dayCardHeader, { backgroundColor: theme.card }]}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                </View>
                <Text style={[styles.dayThemeText, { color: theme.text }]}>{day.theme}</Text>
              </View>

              {day.activities?.map((act, j) => {
                const isLast = j === (day.activities.length - 1);
                const timeLower = (act.time || "").toLowerCase();
                
                // Color badges for Morning / Afternoon / Evening
                let timeColor = "#F59E0B"; // Amber (Morning)
                let timeIcon = "sunny-outline";
                if (timeLower.includes("afternoon")) {
                  timeColor = "#0284C7"; // Sky Blue
                  timeIcon = "partly-sunny-outline";
                } else if (timeLower.includes("evening") || timeLower.includes("night")) {
                  timeColor = "#7C3AED"; // Purple
                  timeIcon = "moon-outline";
                }

                return (
                  <View key={j} style={styles.timelineRow}>
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineNode, { borderColor: timeColor, backgroundColor: theme.bg }]}>
                        <View style={[styles.timelineInnerDot, { backgroundColor: timeColor }]} />
                      </View>
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border || "rgba(150,150,150,0.2)" }]} />}
                    </View>

                    <View style={[styles.activityCard, { backgroundColor: theme.card }]}>
                      <View style={styles.activityCardHeader}>
                        <View style={[styles.timeBadge, { backgroundColor: `${timeColor}18` }]}>
                          <Ionicons name={timeIcon} size={12} color={timeColor} />
                          <Text style={[styles.timeBadgeText, { color: timeColor }]}>{act.time}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.mapQuickBtn}
                          onPress={() => openInMaps(act.placeName, act.coordinates)}
                        >
                          <Ionicons name="location" size={13} color={Colors.PRIMARY} />
                          <Text style={styles.mapQuickText}>Map</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.activityPlaceName, { color: theme.text }]}>{act.placeName}</Text>
                      <Text style={[styles.activityDesc, { color: theme.subtext }]}>{act.details}</Text>

                      {act.tickets && (
                        <View style={styles.ticketPill}>
                          <MaterialCommunityIcons name="ticket-outline" size={13} color={Colors.PRIMARY} />
                          <Text style={styles.ticketPillText}>Tickets: {act.tickets}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.resetPlanBtn} onPress={createNewTrip}>
          <Ionicons name="refresh-outline" size={18} color="#EF4444" />
          <Text style={styles.resetPlanText}>Start a New Travel Plan</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  title: { fontSize: 28, fontFamily: "Outfit-Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit-Medium", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(150, 150, 150, 0.1)", 
    justifyContent: "center", 
    alignItems: "center" 
  },

  // Hero Section
  heroContainer: {
    height: 240,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  heroGlassCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  glassBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  glassBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Medium", marginLeft: 4 },
  heroDestTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Outfit-Bold' },

  // Sections
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mainSectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold' },
  sectionSubtitle: { fontSize: 13, fontFamily: "Outfit-Medium" },

  sectionCard: { padding: 18, borderRadius: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Outfit-Bold' },
  infoText: { fontSize: 14, fontFamily: 'Outfit-Regular', lineHeight: 21 },
  priceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 14, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(150,150,150,0.1)' 
  },
  priceTag: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#10B981' },
  bookButton: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bookButtonText: { color: "#FFF", fontSize: 13, fontFamily: "Outfit-Bold" },

  // Hotel Cards
  hotelCard: { 
    width: 230, 
    borderRadius: 20, 
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  hotelImageWrap: { height: 130, width: "100%", position: "relative" },
  hotelImage: { width: "100%", height: "100%" },
  hotelRatingPill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hotelRatingText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 3 },
  hotelPricePill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hotelPriceText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold" },
  hotelBody: { padding: 12 },
  hotelName: { fontSize: 15, fontFamily: 'Outfit-Bold', marginBottom: 2 },
  hotelAddress: { fontSize: 12, fontFamily: 'Outfit-Regular', marginBottom: 10 },
  hotelMapBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(10, 126, 164, 0.08)"
  },
  hotelMapBtnText: { color: Colors.PRIMARY, fontSize: 12, fontFamily: "Outfit-Medium", marginLeft: 4 },

  // Day Tabs Filter
  dayTabsScroll: { marginBottom: 16 },
  dayTabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  dayTabActive: {
    backgroundColor: Colors.PRIMARY,
  },
  dayTabText: { fontSize: 13, fontFamily: "Outfit-Medium" },
  dayTabTextActive: { color: "#FFF", fontFamily: "Outfit-Bold" },

  // Timeline & Itinerary
  dayContainer: { marginBottom: 22 },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  dayBadgeText: { color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold" },
  dayThemeText: { fontSize: 15, fontFamily: "Outfit-Bold", flex: 1 },

  timelineRow: { flexDirection: "row", marginBottom: 12 },
  timelineTrack: { width: 26, alignItems: "center" },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  timelineInnerDot: { width: 6, height: 6, borderRadius: 3 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },

  activityCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  timeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeBadgeText: { fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 4 },
  mapQuickBtn: { flexDirection: "row", alignItems: "center", padding: 2 },
  mapQuickText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 2 },

  activityPlaceName: { fontSize: 15, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  activityDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', lineHeight: 19 },
  ticketPill: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ticketPillText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Medium", marginLeft: 4 },

  resetPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginTop: 20,
    marginBottom: 40,
  },
  resetPlanText: { color: "#EF4444", fontSize: 14, fontFamily: "Outfit-Bold", marginLeft: 6 },
});