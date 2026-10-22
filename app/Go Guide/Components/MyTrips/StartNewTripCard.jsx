import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/constants";
import { useTheme } from "../constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";

const { width } = Dimensions.get("window");

// Curated Verified HD Destination Cards (1200px)
const TRENDING_DESTINATIONS = [
  {
    id: "rec_tokyo",
    name: "Tokyo",
    country: "Japan",
    tagline: "Neon Districts & Ancient Shrines",
    days: 4,
    budget: "Moderate",
    icon: "business-outline",
    coordinates: { lat: 35.6764, lng: 139.65 },
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_bali",
    name: "Bali",
    country: "Indonesia",
    tagline: "Tropical Clifftops & Sacred Temples",
    days: 5,
    budget: "Budget",
    icon: "water-outline",
    coordinates: { lat: -8.4095, lng: 115.1889 },
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_dubai",
    name: "Dubai",
    country: "UAE",
    tagline: "Desert Safari & Modern Skylines",
    days: 3,
    budget: "Luxury",
    icon: "sunny-outline",
    coordinates: { lat: 25.2048, lng: 55.2708 },
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_rome",
    name: "Rome",
    country: "Italy",
    tagline: "Colosseum, Piazza & Secret Cafes",
    days: 3,
    budget: "Moderate",
    icon: "compass-outline",
    coordinates: { lat: 41.9028, lng: 12.4964 },
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_santorini",
    name: "Santorini",
    country: "Greece",
    tagline: "Caldera Sunsets & Aegean Domes",
    days: 4,
    budget: "Luxury",
    icon: "boat-outline",
    coordinates: { lat: 36.3932, lng: 25.4615 },
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_swiss",
    name: "Swiss Alps",
    country: "Switzerland",
    tagline: "Panoramic Glaciers & Alpine Trains",
    days: 5,
    budget: "Luxury",
    icon: "snow-outline",
    coordinates: { lat: 46.5584, lng: 8.5606 },
    image:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
  },
];

const TRAVEL_VIBES = [
  { id: "beach", label: "Beaches", icon: "umbrella-outline", route: { pathname: "/explore", params: { category: "beaches" } } },
  { id: "mountain", label: "Mountains", icon: "trending-up-outline", route: { pathname: "/explore", params: { category: "mountains" } } },
  { id: "city", label: "Historic Cities", icon: "trail-sign-outline", route: { pathname: "/explore", params: { category: "cities" } } },
  { id: "forest", label: "Nature & Forest", icon: "leaf-outline", route: { pathname: "/explore", params: { category: "forest" } } },
];

const FEATURE_PILLS = [
  {
    id: "ai_plans",
    icon: "flash",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    label: "5s AI Plans",
    route: "/create-trip/search-place",
  },
  {
    id: "weather",
    icon: "sunny",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    label: "Weather Ready",
    route: "/location",
  },
  {
    id: "packing",
    icon: "bag-check",
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.12)",
    label: "Smart Packing",
    route: "/packing-checklist",
  },
  {
    id: "routes",
    icon: "map",
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.12)",
    label: "Live Routes",
    route: "/explore",
  },
];

export default function StartNewTripCard({ userTrips = [], onSelectTrip, onDeleteTrip }) {
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const handleSelectDestination = (item) => {
    triggerHaptic();
    setTripData({
      locationInfo: {
        name: `${item.name}, ${item.country}`,
        coordinates: item.coordinates,
        photoRef: item.image,
      },
      totalDays: item.days,
      budget: item.budget,
      traveler: { title: "Solo / Couple", people: "1 to 2" },
      interests: ["Sightseeing", "Local Food", "Culture", "Photography"],
    });
    router.push("/create-trip/review-trip");
  };

  const handleNavigate = (route) => {
    triggerHaptic();
    if (route) {
      router.push(route);
    }
  };

  const handleFeaturePillPress = (item) => {
    triggerHaptic();
    if (item.id === "ai_plans") {
      router.push("/create-trip/search-place");
      return;
    }
    if (item.id === "weather") {
      router.push("/location");
      return;
    }
    if (item.id === "packing") {
      router.push("/packing-checklist");
      return;
    }
    if (item.id === "routes") {
      if (userTrips && userTrips.length > 0) {
        if (userTrips.length === 1) {
          onSelectTrip && onSelectTrip(userTrips[0]);
        } else {
          Alert.alert(
            "Live Multi-Stop Routes",
            "Choose a trip to open its turn-by-turn Google Maps itinerary routes:",
            [
              ...userTrips.slice(0, 3).map((trip) => {
                const dest =
                  trip.aiTripPlan?.destination ||
                  trip.tripData?.locationInfo?.name ||
                  "My Trip";
                return {
                  text: `📍 ${dest.split(",")[0]}`,
                  onPress: () => onSelectTrip && onSelectTrip(trip),
                };
              }),
              {
                text: "Explore Destinations",
                onPress: () => router.push("/explore"),
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      } else {
        Alert.alert(
          "Live Multi-Stop Routes",
          "Every AI trip generates interactive multi-stop Google Maps routes with driving and walking navigation for each day. Explore destinations or plan your first trip now!",
          [
            {
              text: "Explore Destinations",
              onPress: () => router.push("/explore"),
            },
            {
              text: "Plan a Trip",
              onPress: () => router.push("/create-trip/search-place"),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
      return;
    }

    if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <View style={styles.container}>
      {/* 0. SAVED TRIPS SECTION (WHEN USER HAS SAVED TRIPS) */}
      {userTrips && userTrips.length > 0 && (
        <View style={styles.savedTripsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="bookmark" size={17} color={activeAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Saved Trips</Text>
              <View style={[styles.savedCountPill, { backgroundColor: activeAccent + "18" }]}>
                <Text style={[styles.savedCountText, { color: activeAccent }]}>
                  {userTrips.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>Tap to open</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedTripsList}
          >
            {userTrips.map((trip, idx) => {
              const destName =
                trip.aiTripPlan?.destination ||
                trip.destination ||
                trip.locationInfo?.name ||
                "Adventure";
              const duration =
                trip.aiTripPlan?.duration || `${trip.totalDays || 3} Days`;
              const photo =
                trip.toLocationImage ||
                trip.locationInfo?.photoRef ||
                "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop";

              return (
                <TouchableOpacity
                  key={trip.id || idx}
                  onPress={() => {
                    triggerHaptic();
                    if (onSelectTrip) onSelectTrip(trip);
                  }}
                  style={[
                    styles.savedTripCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo }} style={styles.savedTripImg} />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={styles.savedTripGradient}
                  />

                  {onDeleteTrip && (
                    <TouchableOpacity
                      style={styles.savedTripDeleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        onDeleteTrip(trip);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  )}

                  <View style={styles.savedTripBody}>
                    <Text style={styles.savedTripTitle} numberOfLines={1}>
                      {destName}
                    </Text>
                    <Text style={styles.savedTripDuration}>
                      {duration} • {trip.budget || "Moderate"}
                    </Text>
                    <View style={styles.viewItineraryBtn}>
                      <Text style={styles.viewItineraryText}>Open Plan</Text>
                      <Ionicons name="arrow-forward" size={11} color="#FFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 1. HERO BANNER CARD */}
      <View style={styles.heroCardWrapper}>
        <LinearGradient
          colors={theme.isDark ? ["#1E1E2F", "#0F172A"] : [activeAccent, "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Floating Glow Indicator */}
          <View style={styles.topBadgeRow}>
            <View style={styles.aiGlowPill}>
              <Ionicons name="sparkles" size={13} color="#FBBF24" />
              <Text style={styles.aiGlowText}>AI Travel Planner</Text>
            </View>
            <View style={styles.statusDotRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.readyText}>Ready to build</Text>
            </View>
          </View>

          {/* Headline & Pitch */}
          <Text style={styles.heroHeadline}>Dream. Plan. Explore.</Text>
          <Text style={styles.heroSubText}>
            Let GoGuide AI create your custom day-by-day travel itinerary with hidden gems, hotels
            & budget in seconds.
          </Text>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryPlanBtn}
            onPress={() => {
              triggerHaptic();
              router.push("/create-trip/search-place");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryPlanBtnText}>Plan My First Trip</Text>
            <View style={styles.btnIconCircle}>
              <Ionicons name="rocket-outline" size={18} color={activeAccent} />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* 2. FEATURE HIGHLIGHTS PILL ROW */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featureRow}
        style={styles.featureRowScroll}
      >
        {FEATURE_PILLS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => handleFeaturePillPress(item)}
            style={[
              styles.featurePill,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={13} color={item.color} />
            </View>
            <Text
              style={[styles.featureText, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 3. EXPLORE BY VIBE (CATEGORIES) */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="compass-outline" size={18} color={activeAccent} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Explore by Vibe</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>Tap to browse</Text>
      </View>

      <View style={styles.vibesContainer}>
        {TRAVEL_VIBES.map((vibe) => (
          <TouchableOpacity
            key={vibe.id}
            style={[
              styles.vibeCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => handleNavigate(vibe.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.vibeIconWrap, { backgroundColor: activeAccent + "14" }]}>
              <Ionicons name={vibe.icon} size={18} color={activeAccent} />
            </View>
            <Text style={[styles.vibeText, { color: theme.text }]}>{vibe.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. TRENDING DESTINATIONS SLIDER */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="flame-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular AI Itineraries</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>Instant Plan ⚡</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingSlider}
      >
        {TRENDING_DESTINATIONS.map((dest) => (
          <TouchableOpacity
            key={dest.id}
            style={[styles.destCard, { borderColor: theme.border }]}
            onPress={() => handleSelectDestination(dest)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: dest.image }} style={styles.destImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={styles.destGradient}
            />

            {/* Top Badge */}
            <View style={styles.destTopRow}>
              <View style={styles.destDurationBadge}>
                <Ionicons name="time-outline" size={11} color="#FFF" />
                <Text style={styles.destDurationText}>{dest.days} Days</Text>
              </View>
              <View style={styles.destBudgetBadge}>
                <Text style={styles.destBudgetText}>{dest.budget}</Text>
              </View>
            </View>

            {/* Bottom Details */}
            <View style={styles.destBody}>
              <Text style={styles.destName} numberOfLines={1}>
                {dest.name}
              </Text>
              <Text style={styles.destCountry}>{dest.country}</Text>
              <Text style={styles.destTagline} numberOfLines={1}>
                {dest.tagline}
              </Text>

              <View style={styles.instantPlanRow}>
                <Text style={styles.instantPlanText}>Select Itinerary</Text>
                <Ionicons name="arrow-forward-circle" size={16} color="#38BDF8" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 5. BOTTOM QUICK INSPIRATION PROMPT */}
      <View style={[styles.inspirationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="bulb-outline" size={20} color={activeAccent} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.inspireTitle, { color: theme.text }]}>Need destination advice?</Text>
          <Text style={[styles.inspireSub, { color: theme.subtext }]}>
            Chat with our AI Copilot in the bottom bar to get tailored travel suggestions.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inspireBtn, { backgroundColor: activeAccent }]}
          onPress={() => {
            triggerHaptic();
            router.push("/(tabs)/ai-assistant");
          }}
        >
          <Text style={styles.inspireBtnText}>Chat AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 24,
  },

  // Saved Trips Section
  savedTripsSection: {
    marginBottom: 20,
  },
  savedCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  savedCountText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  savedTripsList: {
    gap: 12,
    paddingRight: 10,
    paddingVertical: 4,
  },
  savedTripCard: {
    width: 175,
    height: 120,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  savedTripImg: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  savedTripGradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  savedTripBody: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  savedTripDeleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  savedTripTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
  },
  savedTripDuration: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    color: "#CBD5E1",
    marginBottom: 4,
  },
  viewItineraryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewItineraryText: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    color: "#38BDF8",
  },

  // Hero Card Styles
  heroCardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
  },
  topBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  aiGlowPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    gap: 5,
  },
  aiGlowText: {
    color: "#FBBF24",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  statusDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  readyText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  heroHeadline: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    color: "#CBD5E1",
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryPlanBtn: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 8,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryPlanBtnText: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: "#0F172A",
  },
  btnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Feature Row
  featureRowScroll: {
    marginBottom: 20,
    overflow: "visible",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  featurePill: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },

  // Vibes Container
  vibesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vibeCard: {
    width: (width - 42) / 2,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  vibeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  vibeText: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },

  // Trending Slider Cards
  trendingSlider: {
    gap: 14,
    paddingRight: 10,
    paddingVertical: 4,
  },
  destCard: {
    width: 200,
    height: 240,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  destImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  destGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  destTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destDurationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  destDurationText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Outfit-Medium",
  },
  destBudgetBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  destBudgetText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  destBody: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  destName: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
  },
  destCountry: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    color: "#94A3B8",
    marginBottom: 4,
  },
  destTagline: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    color: "#CBD5E1",
    marginBottom: 8,
  },
  instantPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  instantPlanText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },

  // Inspiration Box
  inspirationBox: {
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  inspireTitle: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    marginBottom: 2,
  },
  inspireSub: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
  },
  inspireBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginLeft: 8,
  },
  inspireBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
});
