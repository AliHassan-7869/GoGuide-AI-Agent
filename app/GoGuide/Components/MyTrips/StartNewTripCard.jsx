import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/constants";
import { Radius, Typography, useTheme, Palette } from "../constants/theme";
import FadeInView from "../ui/FadeInView";
import { CreateTripContext } from "../../context/CreateTripContext";
import FavoriteHeartButton from "../FavoriteHeartButton";
import DayRouteModal from "./DayRouteModal";

import { TouchableOpacity } from "../ui/Touchable";

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
  {
    id: "vibe_beach",
    label: "Beaches",
    category: "Beaches",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
    icon: "umbrella-outline",
    route: { pathname: "/explore", params: { category: "beaches" } },
  },
  {
    id: "vibe_mountain",
    label: "Mountains",
    category: "Mountains",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop",
    icon: "trending-up-outline",
    route: { pathname: "/explore", params: { category: "mountains" } },
  },
  {
    id: "vibe_city",
    label: "Cities",
    category: "Cities",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop",
    icon: "trail-sign-outline",
    route: { pathname: "/explore", params: { category: "cities" } },
  },
  {
    id: "vibe_forest",
    label: "Nature",
    category: "Nature & Forest",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop",
    icon: "leaf-outline",
    route: { pathname: "/explore", params: { category: "forest" } },
  },
];

const FEATURE_PILLS = [
  {
    id: "ai_plans",
    icon: "flash",
    color: Palette.success,
    bg: "rgba(16, 185, 129, 0.12)",
    label: "5s AI Plans",
    route: "/create-trip/search-place",
  },
  {
    id: "weather",
    icon: "sunny",
    color: Palette.warning,
    bg: "rgba(245, 158, 11, 0.12)",
    label: "Weather Ready",
    route: "/location",
  },
  {
    id: "packing",
    icon: "bag-check",
    color: Palette.blue,
    bg: "rgba(59, 130, 246, 0.12)",
    label: "Smart Packing",
    route: "/packing-checklist",
  },
  {
    id: "routes",
    icon: "map",
    color: Palette.purple,
    bg: "rgba(139, 92, 246, 0.12)",
    label: "Live Routes",
    route: "/explore",
  },
];

const DEFAULT_LIVE_ROUTE_DAYS = [
  {
    day: 1,
    theme: "Dubai Downtown & Iconic Skyline Route",
    activities: [
      {
        time: "09:30 AM",
        placeName: "Burj Khalifa & Dubai Mall",
        details: "Start at the world's tallest tower and observation deck in Downtown Dubai.",
        coordinates: { lat: 25.1972, lng: 55.2744 },
      },
      {
        time: "01:30 PM",
        placeName: "Museum of the Future",
        details: "Explore futuristic exhibitions along Sheikh Zayed Road.",
        coordinates: { lat: 25.2192, lng: 55.2819 },
      },
      {
        time: "05:30 PM",
        placeName: "Palm Jumeirah & The Pointe",
        details: "Sunset views over the Arabian Gulf and Atlantis skyline.",
        coordinates: { lat: 25.1124, lng: 55.139 },
      },
      {
        time: "08:00 PM",
        placeName: "Dubai Marina Yacht Promenade",
        details: "Evening waterfront dinner cruise and illuminated marina walk.",
        coordinates: { lat: 25.0805, lng: 55.1403 },
      },
    ],
  },
  {
    day: 2,
    theme: "Old Dubai Heritage & Creek Route",
    activities: [
      {
        time: "10:00 AM",
        placeName: "Al Fahidi Historical Neighbourhood",
        details: "Traditional wind-tower alleys, cultural cafes, and heritage galleries.",
        coordinates: { lat: 25.2633, lng: 55.2972 },
      },
      {
        time: "01:00 PM",
        placeName: "Dubai Creek Abra Crossing & Gold Souk",
        details: "Ride a traditional wooden boat across the creek to the historic souks.",
        coordinates: { lat: 25.2697, lng: 55.2962 },
      },
      {
        time: "05:00 PM",
        placeName: "Dubai Frame & Zabeel Park",
        details: "Panoramic glass bridge connecting Old and New Dubai.",
        coordinates: { lat: 25.2355, lng: 55.3003 },
      },
    ],
  },
];

export default function StartNewTripCard({ userTrips = [], onSelectTrip, onDeleteTrip }) {
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);
  const [liveRouteConfig, setLiveRouteConfig] = useState(null);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const openTripLiveRoutes = (tripObj) => {
    triggerHaptic();
    const plan = tripObj?.aiTripPlan || tripObj?.tripData?.aiTripPlan || tripObj;
    const days = Array.isArray(plan?.itinerary) && plan.itinerary.length > 0
      ? plan.itinerary
      : DEFAULT_LIVE_ROUTE_DAYS;
    const dest =
      plan?.destination ||
      tripObj?.destination ||
      tripObj?.toLocation?.name ||
      tripObj?.locationInfo?.name ||
      "Dubai, United Arab Emirates";

    setLiveRouteConfig({
      day: days[0],
      allDays: days,
      destination: dest,
    });
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
        openTripLiveRoutes(userTrips[0]);
      } else {
        openTripLiveRoutes(null);
      }
      return;
    }

    if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <View style={styles.container}>
      {/* 0. SAVED TRIPS SECTION */}
      {userTrips && userTrips.length > 0 && (
        <FadeInView index={0} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="bookmark" size={18} color={activeAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 18 }]}>Your Saved Trips</Text>
              <View style={{ backgroundColor: activeAccent + "18", marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: activeAccent, fontSize: 12, fontFamily: "Outfit-Bold" }}>{userTrips.length}</Text>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: "visible" }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }} decelerationRate="fast" snapToInterval={264} snapToAlignment="start">
            {userTrips.map((t, idx) => {
              const destTitle = t.aiTripPlan?.destination || t.destination || t.locationInfo?.name || "My Trip";
              const rawImg = t.toLocationImage || t.locationInfo?.photoRef || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop";
              const duration = t.aiTripPlan?.duration || `${t.totalDays || t.totalNoOfDays || 3} Days`;
              const budget = t.aiTripPlan?.budget || t.budget || "Moderate";

              return (
                <TouchableOpacity
                  key={t.id || idx}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={`Open itinerary for ${destTitle}, ${duration}`}
                  onPress={() => onSelectTrip && onSelectTrip(t)}
                  style={{
                    width: 250,
                    marginRight: 14,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    overflow: "hidden",
                    elevation: 3,
                    shadowColor: Palette.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                  }}
                >
                  <View style={{ height: 135, position: "relative" }}>
                    <Image source={{ uri: rawImg }} style={{ width: "100%", height: "100%" }} />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.85)"]}
                      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: Palette.white, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold }} maxFontSizeMultiplier={1.3}>{budget}</Text>
                    </View>
                    <FavoriteHeartButton
                      place={{
                        name: destTitle,
                        tag: budget,
                        img: rawImg,
                        desc: `${duration} itinerary in ${destTitle}`,
                      }}
                      size={16}
                      style={{ position: "absolute", top: 4, right: onDeleteTrip ? 48 : 4 }}
                    />
                    {onDeleteTrip && (
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete trip ${destTitle}`}
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteTrip(t);
                        }}
                        style={{ position: "absolute", top: 4, right: 4, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(239,68,68,0.85)", alignItems: "center", justifyContent: "center", zIndex: 20 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={Palette.white} />
                      </TouchableOpacity>
                    )}
                    <View style={{ position: "absolute", bottom: 10, left: 12, right: 12 }} pointerEvents="none">
                      <Text style={{ color: Palette.white, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                        {destTitle}
                      </Text>
                      <Text style={{ color: "#F1F5F9", fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2 }} maxFontSizeMultiplier={1.3}>
                        {duration} • Day-by-Day Plan
                      </Text>
                    </View>
                  </View>
                  <View style={{ padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: activeAccent, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold }} maxFontSizeMultiplier={1.3}>Open Itinerary</Text>
                      <Ionicons name="arrow-forward" size={14} color={activeAccent} style={{ marginLeft: 4 }} />
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        openTripLiveRoutes(t);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Live route for ${destTitle}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        minHeight: 44,
                        backgroundColor: "rgba(139, 92, 246, 0.14)",
                        paddingHorizontal: 12,
                        borderRadius: Radius.sm,
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="map" size={12} color={Palette.purple} style={{ marginRight: 4 }} />
                      <Text style={{ color: Palette.purple, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold }} maxFontSizeMultiplier={1.3}>Live Route</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </FadeInView>
      )}

      {/* 1. HERO BANNER CARD */}
      <FadeInView index={1} style={styles.heroCardWrapper}>
        <LinearGradient
          colors={theme.isDark ? ["#1E1E2F", Palette.slate900] : [activeAccent, Palette.slate800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Floating Glow Indicator */}
          <View style={styles.topBadgeRow}>
            <View style={styles.aiGlowPill}>
              <Ionicons name="sparkles" size={13} color={Palette.warningLight} />
              <Text style={styles.aiGlowText}>AI Travel Planner</Text>
            </View>
            <View style={styles.statusDotRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.readyText}>Ready to build</Text>
            </View>
          </View>

          {/* Headline & Pitch */}
          <Text style={styles.heroHeadline} maxFontSizeMultiplier={1.3}>Dream. Plan. Explore.</Text>
          <Text style={styles.heroSubText} maxFontSizeMultiplier={1.3}>
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
            accessibilityRole="button"
            accessibilityLabel="Plan my trip"
          >
            <Text style={styles.primaryPlanBtnText} maxFontSizeMultiplier={1.3}>Plan My Trip</Text>
            <View style={styles.btnIconCircle}>
              <Ionicons name="rocket-outline" size={18} color={activeAccent} />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </FadeInView>

      {/* 2. FEATURE HIGHLIGHTS PILL ROW */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featureRow}
        style={styles.featureRowScroll}
        decelerationRate="fast"
      >
        {FEATURE_PILLS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => handleFeaturePillPress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
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
              maxFontSizeMultiplier={1.3}
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

      <FadeInView index={3} style={styles.vibesGrid}>
        {/* Row 1: Beaches & Mountains */}
        <View style={styles.vibeRow}>
          {TRAVEL_VIBES.slice(0, 2).map((vibe) => (
            <TouchableOpacity
              key={vibe.id}
              style={[
                styles.vibeCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleNavigate(vibe.route)}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${vibe.label}`}
              activeOpacity={0.7}
            >
              <View style={[styles.vibeIconWrap, { backgroundColor: activeAccent + "14" }]}>
                <Ionicons name={vibe.icon} size={18} color={activeAccent} />
              </View>
              <Text style={[styles.vibeText, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {vibe.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.subtext}
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2: Historic Cities & Forest */}
        <View style={styles.vibeRow}>
          {TRAVEL_VIBES.slice(2, 4).map((vibe) => (
            <TouchableOpacity
              key={vibe.id}
              style={[
                styles.vibeCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleNavigate(vibe.route)}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${vibe.label}`}
              activeOpacity={0.7}
            >
              <View style={[styles.vibeIconWrap, { backgroundColor: activeAccent + "14" }]}>
                <Ionicons name={vibe.icon} size={18} color={activeAccent} />
              </View>
              <Text style={[styles.vibeText, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {vibe.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.subtext}
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </FadeInView>

      {/* 4. TRENDING DESTINATIONS SLIDER */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="flame-outline" size={18} color={Palette.danger} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular AI Itineraries</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>Instant Plan ⚡</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingSlider}
        style={{ overflow: "visible" }}
        decelerationRate="fast"
        snapToInterval={214}
        snapToAlignment="start"
      >
        {TRENDING_DESTINATIONS.map((dest) => (
          <TouchableOpacity
            key={dest.id}
            style={[styles.destCard, { borderColor: theme.border }]}
            onPress={() => handleSelectDestination(dest)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Select ${dest.name}, ${dest.country} itinerary, ${dest.days} days, ${dest.budget}`}
          >
            <Image source={{ uri: dest.image }} style={styles.destImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
              locations={[0.2, 0.6, 1]}
              style={styles.destGradient}
            />

            {/* Top Badge & Heart Button */}
            <View style={styles.destTopRow}>
              <View style={styles.destDurationBadge}>
                <Ionicons name="time-outline" size={11} color={Palette.white} />
                <Text style={styles.destDurationText} maxFontSizeMultiplier={1.3}>{dest.days} Days</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.destBudgetBadge}>
                  <Text style={styles.destBudgetText} maxFontSizeMultiplier={1.3}>{dest.budget}</Text>
                </View>
                <FavoriteHeartButton
                  variant="inline"
                  size={15}
                  inactiveColor={Palette.white}
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
                  item={{
                    id: dest.id,
                    name: `${dest.name}, ${dest.country}`,
                    title: `${dest.name}, ${dest.country}`,
                    image: dest.image,
                    category: dest.tagline,
                    rating: "4.9",
                  }}
                />
              </View>
            </View>

            {/* Bottom Details */}
            <View style={styles.destBody}>
              <Text style={styles.destName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {dest.name}
              </Text>
              <Text style={styles.destCountry} maxFontSizeMultiplier={1.3}>{dest.country}</Text>
              <Text style={styles.destTagline} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {dest.tagline}
              </Text>

              <View style={styles.instantPlanRow}>
                <Text style={styles.instantPlanText} maxFontSizeMultiplier={1.3}>Select Itinerary</Text>
                <Ionicons name="arrow-forward-circle" size={16} color={Palette.skyLight} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 5. BOTTOM QUICK INSPIRATION PROMPT */}
      <FadeInView index={5} style={[styles.inspirationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="bulb-outline" size={20} color={activeAccent} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.inspireTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Need destination advice?</Text>
          <Text style={[styles.inspireSub, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
            Chat with our AI Copilot in the bottom bar to get tailored travel suggestions.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Chat with AI Copilot"
          style={[styles.inspireBtn, { backgroundColor: activeAccent }]}
          onPress={() => {
            triggerHaptic();
            router.push("/(tabs)/ai-assistant");
          }}
        >
          <Text style={styles.inspireBtnText} maxFontSizeMultiplier={1.3}>Chat AI</Text>
        </TouchableOpacity>
      </FadeInView>

      {/* Live Interactive Google Maps Route Modal */}
      <DayRouteModal
        visible={!!liveRouteConfig}
        day={liveRouteConfig?.day}
        allDays={liveRouteConfig?.allDays || []}
        destination={liveRouteConfig?.destination}
        onClose={() => setLiveRouteConfig(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 24,
  },

  // Saved Trips Shortcut Banner
  savedTripsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  savedTripsBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  savedTripsBannerTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  savedTripsBannerSub: {
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },

  // Hero Card Styles
  heroCardWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 24,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
    backgroundColor: Palette.slate900,
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
    color: Palette.warningLight,
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
    backgroundColor: Palette.success,
  },
  readyText: {
    color: Palette.slate200,
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Medium",
  },
  heroHeadline: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    color: Palette.white,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubText: {
    fontSize: Typography.sizeMd,
    fontFamily: "Outfit-Regular",
    color: Palette.slate200,
    lineHeight: 21,
    marginBottom: 20,
  },
  primaryPlanBtn: {
    backgroundColor: Palette.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingVertical: 8,
    paddingLeft: 20,
    paddingRight: 8,
    borderRadius: 30,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryPlanBtnText: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: Palette.slate900,
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
    flexGrow: 0,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  featurePill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    gap: 7,
    shadowColor: Palette.black,
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
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Bold",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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

  // Vibes 2x2 Grid (Two balanced rows)
  vibesGrid: {
    paddingHorizontal: 16,
    gap: 10,
    width: "100%",
  },
  vibeRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  vibeCard: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8, // tighter so labels like "Mountains" fit on 360px phones
  },
  vibeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  vibeText: {
    fontSize: Typography.sizeMd,
    fontFamily: "Outfit-Bold",
    flex: 1,
  },

  // Trending Slider Cards
  trendingSlider: {
    gap: 14,
    paddingHorizontal: 16,
    paddingRight: 24,
    paddingVertical: 8,
  },
  destCard: {
    width: 200,
    height: 240,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    shadowColor: Palette.black,
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
    color: Palette.white,
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Medium",
  },
  destBudgetBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  destBudgetText: {
    color: Palette.white,
    fontSize: Typography.sizeSm,
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
    color: Palette.white,
  },
  destCountry: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    color: Palette.slate200,
    marginBottom: 4,
  },
  destTagline: {
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Regular",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  instantPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 12,
  },
  instantPlanText: {
    color: Palette.white,
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Bold",
  },

  // Inspiration Box
  inspirationBox: {
    marginHorizontal: 16,
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  inspireTitle: {
    fontSize: Typography.sizeMd,
    fontFamily: "Outfit-Bold",
    marginBottom: 2,
  },
  inspireSub: {
    fontSize: Typography.sizeSm,
    fontFamily: "Outfit-Regular",
    lineHeight: 17,
  },
  inspireBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  inspireBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
});
