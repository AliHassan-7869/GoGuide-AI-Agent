import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Platform,
  Modal,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import React, { useContext, useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { generateTripWithAgent } from "../../Configs/AiModel";
import { auth } from "../../Configs/FirebaseConfig";
import { saveTripToBookings } from "../../Components/utils/BookingService";
import {
  DEFAULT_HD_TRAVEL_IMAGE,
  getDestinationImage,
  sanitizeImageUrl,
} from "../../Components/constants/Destinations";
import { toggleFavoritePlace, getFavoritePlaces, subscribeToFavorites } from "../../Components/utils/FavoriteService";
import FavoriteHeartButton from "../../Components/FavoriteHeartButton";
import { buildFlightItinerary } from "../../Components/utils/FlightEngine";

// Safe image component with error fallback and HD optimization
function SafeImage({ sourceUri, style, fallbackUri = DEFAULT_HD_TRAVEL_IMAGE }) {
  const [currentUri, setCurrentUri] = useState(() => sanitizeImageUrl(sourceUri, fallbackUri));

  useEffect(() => {
    setCurrentUri(sanitizeImageUrl(sourceUri, fallbackUri));
  }, [sourceUri, fallbackUri]);

  return (
    <Image
      source={{ uri: currentUri }}
      style={style}
      onError={() => {
        if (currentUri !== fallbackUri) {
          setCurrentUri(fallbackUri);
        }
      }}
    />
  );
}

// Pre-curated instant AI vibe trips (Verified HD 1200px)
const QUICK_AI_VIBES = [
  {
    id: "dubai",
    title: "Dubai Luxury Weekend",
    icon: "diamond-outline",
    color: "#8B5CF6",
    destination: "Dubai, United Arab Emirates",
    days: 3,
    budget: "Luxury",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    tag: "💎 Luxury • 3 Days"
  },
  {
    id: "tokyo",
    title: "Tokyo Anime & Culinary",
    icon: "restaurant-outline",
    color: "#EC4899",
    destination: "Tokyo, Japan",
    days: 4,
    budget: "Moderate",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    tag: "🍜 Food & Culture • 4 Days"
  },
  {
    id: "bali",
    title: "Bali Tropical Escape",
    icon: "sunny-outline",
    color: "#F59E0B",
    destination: "Bali, Indonesia",
    days: 5,
    budget: "Economical",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    tag: "🏖️ Beaches • 5 Days"
  },
  {
    id: "rome",
    title: "Rome Historic Holiday",
    icon: "compass-outline",
    color: "#10B981",
    destination: "Rome, Italy",
    days: 3,
    budget: "Moderate",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
    tag: "🏛️ History • 3 Days"
  }
];

// Quick Search Suggested Chips
const QUICK_SEARCH_TAGS = [
  { label: "Tokyo 🇯🇵", query: "Tokyo, Japan" },
  { label: "Paris 🇫🇷", query: "Paris, France" },
  { label: "Dubai 🇦🇪", query: "Dubai, United Arab Emirates" },
  { label: "Bali 🏖️", query: "Bali, Indonesia" },
  { label: "Rome 🏛️", query: "Rome, Italy" },
  { label: "Swiss Alps 🏔️", query: "Swiss Alps, Switzerland" },
];

// Inline Feed Filter Chips
const FEED_FILTER_CHIPS = [
  { id: "all", label: "🌟 All Trending" },
  { id: "cities", label: "🏙️ Cities" },
  { id: "beaches", label: "🏖️ Beaches" },
  { id: "history", label: "🏛️ History" },
  { id: "mountains", label: "🏔️ Nature" },
];

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;

  const safeTopPadding = Platform.select({
    android: Math.max(insets.top, StatusBar.currentHeight || 28) + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);

  // AI Magic Prompt State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [aiError, setAiError] = useState(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState("today");
  const [customDateInput, setCustomDateInput] = useState("");

  // Category Feed & Saved Wishlist State
  const [activeFeedCategory, setActiveFeedCategory] = useState("all");
  const [savedPlaces, setSavedPlaces] = useState({});

  useEffect(() => {
    const syncFavMap = (favs) => {
      const map = {};
      (favs || []).forEach((f) => {
        const k1 = f.id;
        const k2 = f.title;
        const k3 = f.name;
        if (k1) map[k1] = true;
        if (k2) map[k2] = true;
        if (k3) map[k3] = true;
      });
      setSavedPlaces(map);
    };
    getFavoritePlaces().then(syncFavMap).catch(() => {});
    const unsubscribe = subscribeToFavorites(syncFavMap);
    return () => unsubscribe();
  }, []);

  const toggleSavePlace = async (dest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const placeKey = dest.id || dest.title;
    const isCurrentlySaved = !!savedPlaces[placeKey];
    const updated = { ...savedPlaces, [placeKey]: !isCurrentlySaved };
    setSavedPlaces(updated);

    try {
      await toggleFavoritePlace({
        id: dest.id || dest.title,
        name: dest.title || dest.name,
        title: dest.title || dest.name,
        image: dest.image,
        category: dest.category || dest.vibe || "Scenic",
        rating: dest.rating || "4.8",
      });
      await AsyncStorage.setItem("@goguide_saved_places", JSON.stringify(updated));
    } catch (e) {
      console.log("Error saving place:", e);
    }
  };

  const categories = [
    { id: "cat_cities", title: "Cities", icon: "business", route: "/cities", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop" },
    { id: "cat_beaches", title: "Beaches", icon: "water", route: "/beaches", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop" },
    { id: "cat_mountains", title: "Mountains", icon: "triangle", route: "/mountains", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop" },
    { id: "cat_forest", title: "Forest", icon: "leaf", route: "/forest", image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop" },
    { id: "cat_camping", title: "Camping", icon: "bonfire", route: "/explore?category=mountains", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop" },
  ];

  const popularDestinations = [
    {
      id: "dest-1",
      title: "Paris, France",
      category: "cities",
      image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Apr - Oct",
      priceEst: "$95/night",
      vibe: "Romance & Art",
      lat: "48.8566",
      lon: "2.3522",
    },
    {
      id: "dest-2",
      title: "Tokyo, Japan",
      category: "cities",
      image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Mar - May",
      priceEst: "$85/night",
      vibe: "Tech & Ramen",
      lat: "35.6764",
      lon: "139.6500",
    },
    {
      id: "dest-3",
      title: "Bali, Indonesia",
      category: "beaches",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
      rating: "4.8",
      season: "May - Sep",
      priceEst: "$45/night",
      vibe: "Sun & Surf",
      lat: "-8.409518",
      lon: "115.188919",
    },
    {
      id: "dest-4",
      title: "Dubai, UAE",
      category: "cities",
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Nov - Mar",
      priceEst: "$120/night",
      vibe: "Luxury Skyline",
      lat: "25.2048",
      lon: "55.2708",
    },
    {
      id: "dest-5",
      title: "Rome, Italy",
      category: "history",
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
      rating: "4.8",
      season: "Apr - Jun",
      priceEst: "$75/night",
      vibe: "Ancient History",
      lat: "41.9028",
      lon: "12.4964",
    },
    {
      id: "dest-6",
      title: "Swiss Alps, Switzerland",
      category: "mountains",
      image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "Dec - Apr",
      priceEst: "$140/night",
      vibe: "Alpine Wonders",
      lat: "46.5595",
      lon: "8.5599",
    },
    {
      id: "dest-7",
      title: "Maldives",
      category: "beaches",
      image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "Nov - Apr",
      priceEst: "$180/night",
      vibe: "Overwater Villas",
      lat: "3.2028",
      lon: "73.2207",
    },
    {
      id: "dest-8",
      title: "New York, USA",
      category: "cities",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Sep - Dec",
      priceEst: "$130/night",
      vibe: "Broadway & Energy",
      lat: "40.7128",
      lon: "-74.0060",
    },
  ];

  const displayedDestinations = activeFeedCategory === "all"
    ? popularDestinations
    : popularDestinations.filter((d) => d.category === activeFeedCategory);

  const themeStyles = {
    backgroundColor: isDark ? "#121212" : "#F8F9FA",
    textColor: isDark ? "#FFFFFF" : "#1A1A1A",
    subTextColor: isDark ? "#A0A0A0" : "#666666",
    cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
    borderColor: isDark ? "#2C2C2C" : "#E2E8F0",
  };

  // Helper to normalize and title-case place names & common country shorthands
  const normalizePlaceName = (raw) => {
    if (!raw) return "";
    const aliases = {
      pak: "Pakistan",
      pk: "Pakistan",
      uk: "United Kingdom",
      uae: "United Arab Emirates",
      usa: "United States",
      us: "United States",
      ksa: "Saudi Arabia",
      nz: "New Zealand",
    };
    return raw
      .trim()
      .split(/\s+/)
      .map((word) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
        if (aliases[cleanWord]) return aliases[cleanWord];
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  // Compute selected departure Date object from preset or custom input
  const getSelectedDepartureDate = (overridePreset = null) => {
    const preset = overridePreset || selectedDatePreset;
    const now = new Date();
    if (preset === "tomorrow") {
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    }
    if (preset === "weekend") {
      const dayOfWeek = now.getDay(); // 0=Sun..6=Sat
      const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
      return new Date(now.getTime() + daysUntilSat * 24 * 60 * 60 * 1000);
    }
    if (preset === "next_week") {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    if (preset === "next_month") {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    if (preset === "custom" && customDateInput.trim()) {
      const parsed = new Date(customDateInput.trim());
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return now;
  };

  // Instant 1-Click AI Generation
  const executeAiTrip = async (
    destination,
    days = 3,
    budget = "Moderate",
    fallbackImage = null,
    origin = null,
    customStartDate = null
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    setAiError(null);
    setAiStep(1);

    // Step progression animation timer
    const stepTimer1 = setTimeout(() => setAiStep(2), 1400);
    const stepTimer2 = setTimeout(() => setAiStep(3), 2800);

    try {
      const cleanDest = normalizePlaceName(destination) || destination;
      const cleanOrigin = origin ? normalizePlaceName(origin) : (preferences?.originCountry || "Home Airport");
      const startObj =
        customStartDate instanceof Date && !isNaN(customStartDate.getTime())
          ? customStartDate
          : getSelectedDepartureDate();
      const endObj = new Date(startObj.getTime() + Math.max(1, days - 1) * 24 * 60 * 60 * 1000);
      const fmtDate = (d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const departureDateStr = fmtDate(startObj);
      const returnDateStr = fmtDate(endObj);

      console.log("[AI-Copilot] Generating instant trip for:", cleanDest, "from:", cleanOrigin);
      const result = await generateTripWithAgent({
        destination: cleanDest,
        days: days,
        budget: budget,
        interests: origin ? `Traveler flying from ${cleanOrigin} to ${cleanDest} for ${days} days` : undefined,
      });

      const responseText = await result.response.text();
      let cleanResponse = responseText.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const parsedData = JSON.parse(cleanResponse);
      const completePlan = parsedData.trip || parsedData;

      // Ensure clean destination title & origin metadata
      completePlan.destination = completePlan.destination
        ? normalizePlaceName(completePlan.destination)
        : cleanDest;
      completePlan.origin = cleanOrigin;
      completePlan.departureDate = departureDateStr;
      completePlan.returnDate = returnDateStr;
      completePlan.duration = completePlan.duration || `${days} Days ${Math.max(1, days - 1)} Nights`;

      // Ensure Outbound & Return Flight Logistics are always populated via Smart IATA Flight Engine
      completePlan.flights = buildFlightItinerary({
        origin: cleanOrigin,
        destination: cleanDest,
        startDate: startObj,
        endDate: endObj,
        days: days,
        budget: budget,
        existingFlights: completePlan.flights,
      });

      const completeTripData = {
        fromLocation: { name: cleanOrigin, coordinates: { lat: 0, lng: 0 } },
        toLocation: { name: cleanDest, coordinates: { lat: 0, lng: 0 } },
        toLocationImage: fallbackImage || getDestinationImage(cleanDest),
        startDate: startObj.toISOString(),
        endDate: endObj.toISOString(),
        totalNoOfDays: days,
        budget: budget,
        duration: `${days} Days`,
        aiTripPlan: completePlan,
      };

      setTripData(completeTripData);

      // Auto-save to My Trips (@goguide_user_trips) and My Bookings (@goguide_user_bookings)
      try {
        await saveTripToBookings(completeTripData, auth.currentUser);
      } catch (saveErr) {
        console.warn("Could not auto-save trip to bookings:", saveErr);
      }

      setAiLoading(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      router.push("/(tabs)/mytrip");
    } catch (err) {
      console.error("[AI-Copilot] Generation error:", err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAiLoading(false);
      setAiError(err.message || "Failed to generate AI trip. Please try again.");
    }
  };

  // Parse natural language from AI prompt box (supports "4 days of plan from pak to england", "from germany to pakistan", etc.)
  const handleCustomAiPrompt = () => {
    if (!aiPrompt.trim()) return;

    const lower = aiPrompt.toLowerCase();

    // Extract days if typed (e.g. 4 days)
    const daysMatch = lower.match(/(\d+)\s*day/);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 3;

    // Extract budget hint
    let budget = "Moderate";
    if (lower.includes("luxury") || lower.includes("expensive")) budget = "Luxury";
    else if (lower.includes("cheap") || lower.includes("budget") || lower.includes("economical")) budget = "Economical";

    // Detect natural language departure date hints if typed in prompt
    let promptDatePreset = null;
    if (lower.includes("tomorrow")) promptDatePreset = "tomorrow";
    else if (lower.includes("weekend")) promptDatePreset = "weekend";
    else if (lower.includes("next week")) promptDatePreset = "next_week";
    else if (lower.includes("next month")) promptDatePreset = "next_month";

    // Strip common noise phrases first
    let cleaned = aiPrompt
      .replace(/\b\d+\s*days?\b/gi, "")
      .replace(/\b(tomorrow|this weekend|weekend|next week|next month|today)\b/gi, "")
      .replace(/\bof\s+plan\b/gi, "")
      .replace(/\bplan\s+a\s+trip\b/gi, "")
      .replace(/\bplan\b/gi, "")
      .replace(/\ba\s+trip\b/gi, "")
      .replace(/\btrip\b/gi, "")
      .replace(/\bon\s+a\s+budget\b/gi, "")
      .replace(/\b(luxury|expensive|cheap|economical|moderate|budget)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    let origin = null;
    let dest = cleaned;

    // Check for "from <origin> to <destination>" pattern
    const fromToMatch = cleaned.match(/\bfrom\s+(.+?)\s+to\s+(.+)/i);
    if (fromToMatch) {
      origin = fromToMatch[1].replace(/\b(in|for|of)\b/gi, "").trim();
      dest = fromToMatch[2].replace(/\b(in|for|of)\b/gi, "").trim();
    } else {
      dest = cleaned
        .replace(/^\b(to|in|for|of|from)\b\s*/gi, "")
        .replace(/\b(for|in)\b\s*$/gi, "")
        .trim();
    }

    if (!dest) dest = aiPrompt.trim();

    const chosenStartDate = getSelectedDepartureDate(promptDatePreset);
    executeAiTrip(dest, days, budget, null, origin, chosenStartDate);
  };

  const searchPlace = (text) => {
    setSearchQuery(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${text}&addressdetails=1&accept-language=en`,
          {
            headers: {
              "User-Agent": "TripPlannerApp/1.0",
            },
          }
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.log("Search error:", error);
      }
    }, 500);
  };

  const selectPlace = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const place = {
      name: item.display_name,
      coordinates: { lat: item.lat, lng: item.lon },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: getDestinationImage(item.display_name), 
      toLocationRating: "4.8",
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));

    setSearchQuery("");
    setResults([]);
    router.push("/create-trip/trip-summer");
  };

  const selectPopularDestination = (dest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const place = {
      name: dest.title,
      coordinates: { lat: dest.lat, lng: dest.lon },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: dest.image,
      toLocationRating: dest.rating,
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));
    
    router.push("/create-trip/trip-summer");
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor, paddingTop: safeTopPadding }]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyles.textColor }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: themeStyles.subTextColor }]}>
            Explore the world with AI
          </Text>
        </View>

        {/* 🌟 AI MAGIC COMMAND BAR (Top-tier Hero Card) */}
        <View style={[styles.aiHeroCard, { backgroundColor: isDark ? "#1A1528" : "#F5F3FF", borderColor: isDark ? "#6D28D9" : "#DDD6FE" }]}>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiGlowBadge}>
              <Ionicons name="sparkles" size={13} color="#8B5CF6" />
              <Text style={styles.aiGlowBadgeText}>AI TRIP GENERATOR</Text>
            </View>
            <Text style={styles.aiStatusDot}>• Ready</Text>
          </View>

          <Text style={[styles.aiHeroTitle, { color: themeStyles.textColor }]}>
            Where should AI take you today? ✨
          </Text>
          <Text style={[styles.aiHeroSub, { color: themeStyles.subTextColor }]}>
            Type any destination to generate a full personalized itinerary instantly
          </Text>

          {/* AI Magic Prompt Input */}
          <View style={[styles.aiInputBox, { backgroundColor: isDark ? "#241D3B" : "#FFFFFF" }]}>
            <TextInput
              style={[styles.aiTextInput, { color: themeStyles.textColor }]}
              placeholder="e.g. 4 days from pak to england..."
              placeholderTextColor={themeStyles.subTextColor}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              onSubmitEditing={handleCustomAiPrompt}
              returnKeyType="go"
            />
            <TouchableOpacity 
              style={styles.aiSendBtn} 
              onPress={handleCustomAiPrompt}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={15} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.aiSendBtnText}>Plan</Text>
            </TouchableOpacity>
          </View>

          {/* 🛫 Quick Departure Date Picker for Outbound & Return Flights */}
          {(() => {
            const previewDaysMatch = aiPrompt.toLowerCase().match(/(\d+)\s*day/);
            const previewDays = previewDaysMatch ? parseInt(previewDaysMatch[1], 10) : 3;
            const depObj = getSelectedDepartureDate();
            const retObj = new Date(depObj.getTime() + Math.max(1, previewDays - 1) * 24 * 60 * 60 * 1000);
            const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const datePresets = [
              { id: "today", label: "🛫 Today" },
              { id: "tomorrow", label: "📅 Tomorrow" },
              { id: "weekend", label: "🌴 This Weekend" },
              { id: "next_week", label: "✈️ Next Week" },
              { id: "next_month", label: "🗓️ Next Month" },
              { id: "custom", label: "✏️ Custom Date" },
            ];

            return (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: themeStyles.subTextColor }}>
                    DEPARTURE DATE:
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#8B5CF6" }}>
                    🛫 {fmtShort(depObj)} ➔ 🛬 {fmtShort(retObj)}
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {datePresets.map((dp) => {
                    const isSel = selectedDatePreset === dp.id;
                    return (
                      <TouchableOpacity
                        key={dp.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDatePreset(dp.id);
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 14,
                          marginRight: 7,
                          borderWidth: 1,
                          backgroundColor: isSel ? "#8B5CF6" : isDark ? "#251F3A" : "#FFFFFF",
                          borderColor: isSel ? "#8B5CF6" : isDark ? "#3B3054" : "#DDD6FE",
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Outfit-Bold",
                            color: isSel ? "#FFFFFF" : themeStyles.textColor,
                          }}
                        >
                          {dp.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedDatePreset === "custom" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 8,
                      backgroundColor: isDark ? "#241D3B" : "#FFFFFF",
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: "#8B5CF6",
                    }}
                  >
                    <Ionicons name="calendar-outline" size={15} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <TextInput
                      placeholder="Enter Departure Date (YYYY-MM-DD, e.g. 2026-11-15)"
                      placeholderTextColor={themeStyles.subTextColor}
                      value={customDateInput}
                      onChangeText={setCustomDateInput}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontFamily: "Outfit-Medium",
                        color: themeStyles.textColor,
                        paddingVertical: 2,
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })()}

          {/* Quick-Vibe Prompt Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vibeScroll}>
            {QUICK_AI_VIBES.map((vibe) => (
              <TouchableOpacity
                key={vibe.id}
                style={[styles.vibeCard, { backgroundColor: isDark ? "#251F3A" : "#FFFFFF", borderColor: vibe.color + "40" }]}
                onPress={() => executeAiTrip(vibe.destination, vibe.days, vibe.budget, vibe.image)}
                activeOpacity={0.85}
              >
                <View style={[styles.vibeIconCircle, { backgroundColor: vibe.color + "18" }]}>
                  <Ionicons name={vibe.icon} size={15} color={vibe.color} />
                </View>
                <Text style={[styles.vibeCardTitle, { color: themeStyles.textColor }]} numberOfLines={1}>{vibe.title}</Text>
                <Text style={[styles.vibeCardTag, { color: vibe.color }]}>{vibe.tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Regular Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
          <Ionicons name="search" size={20} color={themeStyles.subTextColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeStyles.textColor }]}
            placeholder="Search specific city (e.g. London, Cairo)..."
            placeholderTextColor={themeStyles.subTextColor}
            value={searchQuery}
            onChangeText={searchPlace}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={themeStyles.subTextColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Trending Search Tags */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.quickTagsScroll}
          contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
        >
          {QUICK_SEARCH_TAGS.map((tag, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.quickTagPill,
                { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                searchPlace(tag.query);
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickTagText, { color: themeStyles.textColor }]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Results Dropdown */}
        {results.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
            {results.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={item.place_id || index}
                onPress={() => selectPlace(item)}
                style={[
                  styles.resultItem,
                  index < results.length - 1 && { borderBottomColor: themeStyles.borderColor, borderBottomWidth: 1 }
                ]}
              >
                <Ionicons name="location" size={16} color={Colors.PRIMARY} style={{ marginRight: 10 }} />
                <Text style={[{ color: themeStyles.textColor, flex: 1 }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Categories Section */}
        {results.length === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]}>Categories</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/explore");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.PRIMARY, fontFamily: "Outfit-Medium" }}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesContainer}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {categories.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.categoryCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.route) {
                      router.push(item.route);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: Colors.PRIMARY + '12' }]}>
                    <Ionicons name={item.icon} size={22} color={Colors.PRIMARY} />
                  </View>
                  <Text style={[styles.categoryText, { color: themeStyles.textColor }]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Trending Places Header */}
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]}>Trending Places</Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: themeStyles.subTextColor, marginTop: 2 }}>
                  Curated world destinations & 1-tap AI plans
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/explore");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.PRIMARY, fontFamily: "Outfit-Medium" }}>See all</Text>
              </TouchableOpacity>
            </View>

            {/* Inline Category Filter Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 8, marginBottom: 14 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {FEED_FILTER_CHIPS.map((chip) => {
                const isSelected = activeFeedCategory === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.feedFilterChip,
                      isSelected 
                        ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                        : { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveFeedCategory(chip.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text 
                      style={[
                        styles.feedFilterChipText, 
                        { color: isSelected ? "#FFFFFF" : themeStyles.textColor }
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Horizontal Destinations Carousel */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {displayedDestinations.map((dest) => {
                const isSaved = !!savedPlaces[dest.id || dest.title];
                return (
                  <View
                    key={dest.id}
                    style={[styles.popularCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                  >
                    <View style={styles.cardImageContainer}>
                      <SafeImage sourceUri={dest.image} style={styles.popularImage} />
                      
                      {/* Rating Badge */}
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>{dest.rating}</Text>
                      </View>

                      {/* Interactive Heart (Wishlist) Button */}
                      <TouchableOpacity
                        style={styles.heartButton}
                        onPress={() => toggleSavePlace(dest)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={isSaved ? "heart" : "heart-outline"} 
                          size={17} 
                          color={isSaved ? "#EF4444" : "#FFFFFF"} 
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.popularInfo}>
                      <Text style={[styles.popularTitle, { color: themeStyles.textColor }]} numberOfLines={1}>
                        {dest.title}
                      </Text>
                      
                      {/* Rich Information Badges */}
                      <View style={styles.richMetaRow}>
                        <View style={[styles.metaBadge, { backgroundColor: isDark ? "#282828" : "#F3F4F6" }]}>
                          <Ionicons name="calendar-outline" size={11} color={themeStyles.subTextColor} />
                          <Text style={[styles.metaBadgeText, { color: themeStyles.subTextColor }]}>{dest.season}</Text>
                        </View>
                        <View style={[styles.metaBadge, { backgroundColor: isDark ? "#282828" : "#F3F4F6", marginLeft: 6 }]}>
                          <Ionicons name="pricetag-outline" size={11} color={Colors.PRIMARY} />
                          <Text style={[styles.metaBadgeText, { color: Colors.PRIMARY }]}>{dest.priceEst}</Text>
                        </View>
                      </View>

                      <Text style={[styles.vibeText, { color: themeStyles.subTextColor }]} numberOfLines={1}>
                        ✨ {dest.vibe}
                      </Text>

                      {/* Action Buttons Row */}
                      <View style={styles.popularActionRow}>
                        <TouchableOpacity
                          style={[styles.aiPlanPillBtn, { backgroundColor: Colors.PRIMARY }]}
                          onPress={() => executeAiTrip(dest.title, 3, "Moderate", dest.image)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="sparkles" size={12} color="#FFF" style={{ marginRight: 3 }} />
                          <Text style={styles.aiPlanPillText}>1-Tap AI</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.wizardPillBtn, { borderColor: themeStyles.borderColor }]}
                          onPress={() => selectPopularDestination(dest)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.wizardPillText, { color: themeStyles.textColor }]}>Customize</Text>
                          <Ionicons name="chevron-forward" size={13} color={themeStyles.subTextColor} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

      </ScrollView>

      {/* 🔮 LIVE AI THINKING STREAM MODAL */}
      <Modal visible={aiLoading} transparent={true} animationType="fade">
        <View style={styles.aiModalOverlay}>
          <View style={[styles.aiModalContent, { backgroundColor: isDark ? "#1E1833" : "#FFFFFF" }]}>
            <View style={styles.aiPulseCircle}>
              <Ionicons name="sparkles" size={28} color="#8B5CF6" />
            </View>

            <Text style={[styles.aiModalTitle, { color: themeStyles.textColor }]}>
              AI Trip Generator at Work ✨
            </Text>
            <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]}>
              Crafting your seamless, personalized itinerary
            </Text>

            {/* Thinking Progress Steps */}
            <View style={styles.aiStepsBox}>
              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 1 ? "checkmark-circle" : "ellipse-outline"} 
                  size={18} 
                  color={aiStep >= 1 ? "#10B981" : "#A0A0A0"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 1 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Analyzing destination & climate
                </Text>
              </View>

              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 2 ? "checkmark-circle" : aiStep === 1 ? "sync-outline" : "ellipse-outline"} 
                  size={18} 
                  color={aiStep >= 2 ? "#10B981" : aiStep === 1 ? "#8B5CF6" : "#A0A0A0"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 2 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Curating top boutique stays & dining
                </Text>
              </View>

              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 3 ? "checkmark-circle" : "sync-outline"} 
                  size={18} 
                  color={aiStep >= 3 ? "#10B981" : "#8B5CF6"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 3 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Structuring morning-to-night itinerary
                </Text>
              </View>
            </View>

            <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 15 }} />
          </View>
        </View>
      </Modal>

      {/* Error Alert Modal if generation fails */}
      {aiError && (
        <Modal visible={!!aiError} transparent={true} animationType="fade">
          <View style={styles.aiModalOverlay}>
            <View style={[styles.aiModalContent, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              <Text style={[styles.aiModalTitle, { color: themeStyles.textColor, marginTop: 10 }]}>Oops!</Text>
              <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]}>{aiError}</Text>
              <TouchableOpacity 
                style={[styles.aiSendBtn, { width: "100%", marginTop: 15, paddingVertical: 12 }]}
                onPress={() => setAiError(null)}
              >
                <Text style={styles.aiSendBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 90 },
  header: { marginBottom: 15 },
  title: { fontSize: 28, fontFamily: "Outfit-Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit-Medium", marginTop: 2 },

  // AI Hero Card
  aiHeroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  aiBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  aiGlowBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiGlowBadgeText: { color: "#8B5CF6", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 4, letterSpacing: 0.5 },
  aiStatusDot: { color: "#10B981", fontSize: 12, fontFamily: "Outfit-Bold" },
  aiHeroTitle: { fontSize: 20, fontFamily: "Outfit-Bold", marginBottom: 4 },
  aiHeroSub: { fontSize: 12, fontFamily: "Outfit-Regular", marginBottom: 14 },

  aiInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  aiTextInput: { flex: 1, fontSize: 13, fontFamily: "Outfit-Regular", paddingVertical: 8 },
  aiSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiSendBtnText: { color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold", marginLeft: 4 },

  vibeScroll: { flexDirection: "row" },
  vibeCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    marginRight: 10,
    width: 155,
  },
  vibeIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  vibeCardTitle: { fontSize: 13, fontFamily: "Outfit-Bold", marginBottom: 2 },
  vibeCardTag: { fontSize: 10, fontFamily: "Outfit-Bold" },

  // Regular Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Outfit-Regular" },

  // Quick Search Suggested Tags
  quickTagsScroll: {
    marginBottom: 6,
  },
  quickTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickTagText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },

  searchResultsContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  resultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },

  // Categories
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Outfit-Bold" },
  categoriesContainer: { marginTop: 6 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  categoryIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 8 },
  categoryText: { fontSize: 13, fontFamily: "Outfit-Medium" },

  // Feed Filter Chips
  feedFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  feedFilterChipText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Trending Places Cards
  popularCard: {
    width: 240,
    borderRadius: 20,
    marginRight: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 10,
  },
  cardImageContainer: {
    width: "100%",
    height: 135,
    position: "relative",
  },
  popularImage: { width: "100%", height: "100%" },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 3 },
  popularInfo: { padding: 12 },
  popularTitle: { fontSize: 15, fontFamily: "Outfit-Bold", marginBottom: 2 },
  richMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    marginLeft: 3,
  },
  vibeText: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginBottom: 10,
  },
  popularActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  aiPlanPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 10,
  },
  aiPlanPillText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    marginLeft: 3,
  },
  wizardPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  wizardPillText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    marginRight: 2,
  },

  // AI Thinking Stream Modal
  aiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  aiModalContent: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  aiPulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  aiModalTitle: { fontSize: 20, fontFamily: "Outfit-Bold" },
  aiModalSub: { fontSize: 13, fontFamily: "Outfit-Regular", textAlign: "center", marginTop: 4, marginBottom: 20 },
  aiStepsBox: { width: "100%", gap: 12 },
  aiStepItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiStepText: { fontSize: 13, fontFamily: "Outfit-Medium" },
});
