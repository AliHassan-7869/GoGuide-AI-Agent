import { View, Text, StyleSheet, ScrollView, TextInput, Image, Platform, Modal, ActivityIndicator, Keyboard } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

import { TouchableOpacity } from "../../Components/ui/Touchable";
import EmptyState from "../../Components/ui/EmptyState";
import FadeInView from "../../Components/ui/FadeInView";
import { Skeleton } from "../../Components/ui/Skeleton";
import { Radius, Spacing, Typography, useTheme } from "../../Components/constants/theme";

// Fixed overlay colours for text on photos (always white on a dark scrim, independent of theme)
const ON_IMAGE = "#FFFFFF";
const SCRIM_COLORS = ["rgba(0,0,0,0)", "rgba(0,0,0,0.78)"];
const FAVOURITE_RED = "#EF4444";
const AI_ACCENT = "#8B5CF6"; // small AI sparkle accents only
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This weekend" },
  { id: "next_week", label: "Next week" },
  { id: "next_month", label: "Next month" },
  { id: "custom", label: "Custom date" },
];

const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function detectDatePreset(text) {
  const lower = (text || "").toLowerCase();
  if (lower.includes("tomorrow")) return "tomorrow";
  if (lower.includes("weekend")) return "weekend";
  if (lower.includes("next week")) return "next_week";
  if (lower.includes("next month")) return "next_month";
  return null;
}

function detectDays(text) {
  const m = (text || "").toLowerCase().match(/(\d+)\s*day/);
  const n = m ? parseInt(m[1], 10) : 3;
  return Math.min(30, Math.max(1, n || 3));
}
// Safe image component with error fallback and HD optimization
function SafeImage({ sourceUri, style, fallbackUri = DEFAULT_HD_TRAVEL_IMAGE }) {
  const [hasError, setHasError] = useState(false);
  const currentUri = hasError ? fallbackUri : (sourceUri ? sanitizeImageUrl(sourceUri, fallbackUri) : fallbackUri);

  return (
    <Image
      source={{ uri: currentUri }}
      style={style}
      onError={() => {
        if (!hasError) setHasError(true);
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
  { id: "mountains", label: "🏔️ Mountains" },
  { id: "forest", label: "🌲 Forests" },
  { id: "camping", label: "🏕️ Camping" },
  { id: "history", label: "🏛️ History" },
];

// Minimal offline itinerary used when the AI response cannot be parsed
function buildOfflinePlan(destination, days, budget) {
  const name = (destination || "Your Destination").split(",")[0].trim();
  const n = Math.min(30, Math.max(1, parseInt(days, 10) || 3));
  const itinerary = Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    theme: i === 0 ? `Arrive & Explore ${name}` : `Discover ${name} - Day ${i + 1}`,
    activities: [
      { time: "09:30 AM", placeName: `${name} Old Town & Landmarks`, details: `Guided walk through the most iconic sights of ${name}.`, tickets: "Free" },
      { time: "01:30 PM", placeName: `Local Cuisine in ${name}`, details: "Lunch at a well-reviewed local restaurant.", tickets: "Pay per dish" },
      { time: "06:30 PM", placeName: `${name} Sunset Viewpoint`, details: "Evening stroll and photos at a popular viewpoint.", tickets: "Free" },
    ],
  }));
  return {
    destination: destination || name,
    duration: `${n} Days`,
    budget: budget || "Moderate",
    traveler: "Explorer",
    weatherBrief: "Check the local forecast before you travel.",
    flights: { details: `Round-trip flights to ${name}`, price: "Varies" },
    hotels: [],
    itinerary,
  };
}

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const theme = useTheme();
  const isDark = theme.isDark;
  const accent = Colors.PRIMARY || theme.primary;

  const safeTopPadding = Platform.select({
    android: insets.top + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);
  const scrollViewRef = useRef(null);
  const searchBarYRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 260)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // AI Magic Prompt State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [aiError, setAiError] = useState(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState("today");
  const [customDateInput, setCustomDateInput] = useState("");
  const [searchStatus, setSearchStatus] = useState("idle"); // idle | loading | empty | error
  // The destination feed is bundled locally, so there is no load to wait for (no artificial delay).
  const feedLoading = false;

  // A date hint typed in the AI prompt (e.g. "tomorrow") moves the single selected chip
  const handleAiPromptChange = (text) => {
    setAiPrompt(text);
    const hint = detectDatePreset(text);
    if (hint) setSelectedDatePreset(hint);
  };

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
    { id: "cat_camping", title: "Camping", icon: "bonfire", route: "/camping", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop" },
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
      rating: "4.9",
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
    {
      id: "dest-9",
      title: "Singapore",
      category: "cities",
      image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Year-round",
      priceEst: "$110/night",
      vibe: "Futuristic Gardens",
      lat: "1.3521",
      lon: "103.8198",
    },
    {
      id: "dest-10",
      title: "Istanbul, Turkey",
      category: "history",
      image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop",
      rating: "4.8",
      season: "Apr - Oct",
      priceEst: "$65/night",
      vibe: "Bosphorus & Bazaars",
      lat: "41.0082",
      lon: "28.9784",
    },
    {
      id: "dest-11",
      title: "Barcelona, Spain",
      category: "cities",
      image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "May - Oct",
      priceEst: "$90/night",
      vibe: "Gaudi & Tapas",
      lat: "41.3879",
      lon: "2.1699",
    },
    {
      id: "dest-12",
      title: "Santorini, Greece",
      category: "beaches",
      image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "May - Oct",
      priceEst: "$150/night",
      vibe: "Blue Domes & Sunsets",
      lat: "36.3932",
      lon: "25.4615",
    },
    {
      id: "dest-13",
      title: "Karakoram & Hunza Valley, Pakistan",
      category: "mountains",
      image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "May - Oct",
      priceEst: "$40/night",
      vibe: "Passu Cones & Lakes",
      lat: "36.3167",
      lon: "74.6500",
    },
    {
      id: "dest-14",
      title: "Dolomites, Italy",
      category: "mountains",
      image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Jun - Sep",
      priceEst: "$125/night",
      vibe: "Dramatic Alpine Peaks",
      lat: "46.4102",
      lon: "11.8440",
    },
    {
      id: "dest-15",
      title: "Arashiyama Bamboo Grove, Japan",
      category: "forest",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Oct - May",
      priceEst: "$80/night",
      vibe: "Zen Bamboo Trails",
      lat: "35.0167",
      lon: "135.6713",
    },
    {
      id: "dest-16",
      title: "Merzouga Luxury Desert Camp, Morocco",
      category: "camping",
      image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop",
      rating: "4.9",
      season: "Oct - Apr",
      priceEst: "$90/night",
      vibe: "Sahara Stargazing Tents",
      lat: "31.0802",
      lon: "-4.0133",
    },
    {
      id: "dest-17",
      title: "Lake Louise Alpine Campsite, Canada",
      category: "camping",
      image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "Jun - Sep",
      priceEst: "$55/night",
      vibe: "Glacial Lake Camping",
      lat: "51.4254",
      lon: "-116.1773",
    },
    {
      id: "dest-18",
      title: "Fairy Meadows Basecamp, Pakistan",
      category: "camping",
      image: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?q=80&w=1200&auto=format&fit=crop",
      rating: "5.0",
      season: "Jun - Sep",
      priceEst: "$35/night",
      vibe: "Nanga Parbat Campfire",
      lat: "35.3853",
      lon: "74.5806",
    },
  ];

  const displayedDestinations = activeFeedCategory === "all"
    ? popularDestinations
    : popularDestinations.filter((d) => d.category === activeFeedCategory);

  const themeStyles = {
    backgroundColor: theme.bg,
    textColor: theme.text,
    subTextColor: theme.subtext,
    cardBg: theme.card,
    borderColor: theme.border,
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
      const { robustParseJson, normalizeTrip } = require("../../Components/utils/TripNormalizer");

      let parsedData = null;
      try {
        parsedData = robustParseJson(responseText);
      } catch (parseErr) {
        console.warn("[Discover] Robust parse note:", parseErr?.message);
      }

      let completePlan = parsedData ? (normalizeTrip(parsedData) || parsedData.trip || parsedData) : null;
      if (!completePlan || !completePlan.itinerary || !Array.isArray(completePlan.itinerary) || completePlan.itinerary.length === 0) {
        console.log("[Discover] Using smart offline plan fallback for:", cleanDest);
        completePlan = buildOfflinePlan(cleanDest, days, budget);
      }

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

      const generatedTripId = `trip_${Date.now()}`;
      const completeTripData = {
        id: generatedTripId,
        fromLocation: { name: cleanOrigin, coordinates: null },
        toLocation: { name: cleanDest, coordinates: null },
        toLocationImage: fallbackImage || getDestinationImage(cleanDest),
        startDate: startObj.toISOString(),
        endDate: endObj.toISOString(),
        totalNoOfDays: days,
        budget: budget,
        duration: `${days} Days`,
        aiTripPlan: completePlan,
        createdAt: new Date().toISOString(),
      };

      setTripData(completeTripData);

      // Cache active itinerary preview without creating duplicate saved entries before user clicks Save
      try {
        await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(completeTripData));
        await AsyncStorage.setItem("@goguide_active_draft", JSON.stringify(completeTripData));
      } catch (cacheErr) {
        console.warn("Could not cache active trip preview:", cacheErr);
      }

      setAiLoading(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      router.push({ pathname: "/(tabs)/mytrip", params: { view: "plan" } });
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
    const days = detectDays(aiPrompt);

    // Extract budget hint
    let budget = "Moderate";
    if (lower.includes("luxury") || lower.includes("expensive")) budget = "Luxury";
    else if (lower.includes("cheap") || lower.includes("budget") || lower.includes("economical")) budget = "Economical";

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

    const chosenStartDate = getSelectedDepartureDate();
    executeAiTrip(dest, days, budget, null, origin, chosenStartDate);
  };

  const searchPlace = (text) => {
    setSearchQuery(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (text.length < 3) {
      setResults([]);
      setSearchStatus("idle");
    }

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) return;
      setSearchStatus("loading");

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
        const list = Array.isArray(data) ? data : [];
        setResults(list);
        setSearchStatus(list.length === 0 ? "empty" : "idle");
      } catch (error) {
        console.log("Search error:", error);
        setResults([]);
        setSearchStatus("error");
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
      fromLocation: { name: "Current Location", coordinates: null },
    }));

    setSearchQuery("");
    setResults([]);
    setSearchStatus("idle");
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
      fromLocation: { name: "Current Location", coordinates: null },
    }));
    
    router.push("/create-trip/trip-summer");
  };

  const tripDays = detectDays(aiPrompt);
  const depObj = getSelectedDepartureDate();
  const retObj = new Date(depObj.getTime() + Math.max(0, tripDays - 1) * DAY_MS);
  const rangeLabel = `${fmtDay(depObj)} - ${fmtDay(retObj)} · ${tripDays} ${tripDays === 1 ? "day" : "days"}`;
  const heroGradient = isDark ? [accent + "55", theme.card] : [accent + "26", theme.card];
  const inputSurface = isDark ? theme.bg : theme.card;
  const showSearchResults = results.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor, paddingTop: safeTopPadding }]}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 84, keyboardHeight + 30) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Top Header */}
        <FadeInView index={0} style={styles.header}>
          <Text style={[styles.title, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">Discover</Text>
          <Text style={[styles.subtitle, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>
            Explore the world with AI
          </Text>
        </FadeInView>

        {/* AI generator card (teal system, purple only as a small sparkle accent) */}
        <FadeInView index={1}>
          <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.aiHeroCard, { borderColor: accent + "66" }]}>
            <View style={styles.aiBadgeRow}>
              <View style={[styles.aiGlowBadge, { backgroundColor: accent + "26" }]}>
                <Ionicons name="sparkles" size={14} color={AI_ACCENT} />
                <Text style={[styles.aiGlowBadgeText, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>Generate with AI</Text>
              </View>
              <View style={[styles.aiTinyBadge, { backgroundColor: AI_ACCENT + "26" }]}>
                <Text style={styles.aiTinyBadgeText} maxFontSizeMultiplier={1.3}>AI</Text>
              </View>
            </View>

            <Text style={[styles.aiHeroTitle, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>
              Where should AI take you today?
            </Text>
            <Text style={[styles.aiHeroSub, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>
              Describe a trip and AI plans it
            </Text>

            {/* AI prompt input */}
            <View style={[styles.aiInputBox, { backgroundColor: inputSurface, borderColor: accent + "80" }]}>
              <Ionicons name="sparkles" size={18} color={AI_ACCENT} style={styles.inputLeadIcon} />
              <TextInput
                style={[styles.aiTextInput, { color: themeStyles.textColor }]}
                placeholder="e.g. 5 days in Istanbul"
                placeholderTextColor={themeStyles.subTextColor}
                value={aiPrompt}
                onChangeText={handleAiPromptChange}
                onSubmitEditing={handleCustomAiPrompt}
                returnKeyType="go"
                accessibilityLabel="Describe a trip for AI to plan"
                maxFontSizeMultiplier={1.3}
              />
              {aiPrompt.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear trip description"
                  style={styles.clearBtn}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  onPress={() => setAiPrompt("")}
                >
                  <Ionicons name="close-circle" size={20} color={themeStyles.subTextColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.aiSendBtn, { backgroundColor: accent, opacity: aiPrompt.trim() ? 1 : 0.6 }]}
                onPress={handleCustomAiPrompt}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Plan trip with AI"
                accessibilityState={{ disabled: !aiPrompt.trim() }}
              >
                <Text style={styles.aiSendBtnText} maxFontSizeMultiplier={1.3}>Plan</Text>
              </TouchableOpacity>
            </View>

            {/* Departure date: one selected chip, range derived from start + duration */}
            <View style={[styles.innerPanel, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)", borderColor: accent + "40" }]}>
              <Text style={[styles.panelLabel, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>Departure date</Text>
              <View style={styles.rangeRow} accessibilityLabel={`Trip dates ${rangeLabel}`}>
                <Ionicons name="calendar-outline" size={16} color={accent} />
                <Text style={[styles.rangeText, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>{rangeLabel}</Text>
              </View>

              <View style={styles.chipWrap}>
                {DATE_PRESETS.map((dp) => {
                  const isSel = selectedDatePreset === dp.id;
                  return (
                    <TouchableOpacity
                      key={dp.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDatePreset(dp.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={dp.label}
                      accessibilityState={{ selected: isSel }}
                      style={[
                        styles.dateChip,
                        isSel
                          ? { backgroundColor: accent, borderColor: accent }
                          : { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor },
                      ]}
                      activeOpacity={0.8}
                    >
                      {isSel && <Ionicons name="checkmark" size={14} color={ON_IMAGE} style={{ marginRight: 4 }} />}
                      <Text style={[styles.dateChipText, { color: isSel ? ON_IMAGE : themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>
                        {dp.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedDatePreset === "custom" && (
                <View style={[styles.customDateBox, { backgroundColor: inputSurface, borderColor: accent }]}>
                  <Ionicons name="calendar-outline" size={16} color={accent} style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="YYYY-MM-DD, e.g. 2026-11-15"
                    placeholderTextColor={themeStyles.subTextColor}
                    value={customDateInput}
                    onChangeText={setCustomDateInput}
                    accessibilityLabel="Custom departure date"
                    maxFontSizeMultiplier={1.3}
                    style={[styles.customDateInput, { color: themeStyles.textColor }]}
                  />
                </View>
              )}
            </View>

            {/* Quick trip ideas */}
            <View style={[styles.innerPanel, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)", borderColor: accent + "40" }]}>
              <Text style={[styles.panelLabel, { color: themeStyles.subTextColor, marginBottom: Spacing.sm }]} maxFontSizeMultiplier={1.3}>Quick trip ideas</Text>
              <View style={styles.vibeScroll}>
                {QUICK_AI_VIBES.map((vibe) => (
                  <TouchableOpacity
                    key={vibe.id}
                    style={[styles.vibeCard, { backgroundColor: themeStyles.cardBg, borderColor: accent + "40" }]}
                    onPress={() => executeAiTrip(vibe.destination, vibe.days, vibe.budget, vibe.image)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Plan ${vibe.title}, ${vibe.days} days`}
                  >
                    <View style={[styles.vibeIconCircle, { backgroundColor: accent + "1F" }]}>
                      <Ionicons name={vibe.icon} size={16} color={accent} />
                    </View>
                    <Text style={[styles.vibeCardTitle, { color: themeStyles.textColor }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{vibe.title}</Text>
                    <Text style={[styles.vibeCardTag, { color: themeStyles.subTextColor }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{vibe.tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Search places: a plain lookup, visually separate from the AI generator */}
        <FadeInView index={2}>
          <View
            onLayout={(e) => {
              searchBarYRef.current = e.nativeEvent.layout.y;
            }}
            style={styles.searchBlock}
          >
            <View style={styles.searchLabelRow}>
              <Ionicons name="location-outline" size={18} color={themeStyles.subTextColor} />
              <Text style={[styles.searchLabel, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>Search places</Text>
            </View>
            <Text style={[styles.searchHelper, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>Find a city or landmark</Text>
            <View style={[styles.searchContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
              <Ionicons name="search" size={20} color={themeStyles.subTextColor} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: themeStyles.textColor }]}
                placeholder="Search a city (e.g. London)"
                placeholderTextColor={themeStyles.subTextColor}
                value={searchQuery}
                onChangeText={searchPlace}
                accessibilityLabel="Search places"
                maxFontSizeMultiplier={1.3}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                      y: Math.max(0, searchBarYRef.current - 16),
                      animated: true,
                    });
                  }, 120);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  style={styles.clearBtn}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  onPress={() => {
                    setSearchQuery("");
                    setResults([]);
                    setSearchStatus("idle");
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={themeStyles.subTextColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </FadeInView>

        {/* Quick trending search tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.hScroll}
          contentContainerStyle={styles.hScrollContent}
        >
          {QUICK_SEARCH_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag.query}
              style={[styles.quickTagPill, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchQuery(tag.query);
                searchPlace(tag.query);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Search ${tag.query}`}
            >
              <Text style={[styles.quickTagText, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>{tag.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search status */}
        {searchStatus === "loading" && (
          <View style={styles.searchSkeletons}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={44} radius={Radius.md} style={{ marginBottom: Spacing.sm }} />
            ))}
          </View>
        )}
        {searchStatus === "error" && (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't search right now"
            text="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => searchPlace(searchQuery)}
          />
        )}
        {searchStatus === "empty" && (
          <EmptyState icon="search-outline" title="No places found" text="Try a different city or landmark name." />
        )}

        {/* Search results */}
        {showSearchResults && (
          <View style={[styles.searchResultsContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
            {results.slice(0, 5).map((item, index, arr) => (
              <TouchableOpacity
                key={item.place_id || index}
                onPress={() => selectPlace(item)}
                accessibilityRole="button"
                accessibilityLabel={`Plan a trip to ${item.display_name}`}
                style={[
                  styles.resultItem,
                  index < arr.length - 1 && { borderBottomColor: themeStyles.borderColor, borderBottomWidth: 1 },
                ]}
              >
                <Ionicons name="location" size={16} color={accent} style={{ marginRight: 10 }} />
                <Text style={{ color: themeStyles.textColor, flex: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular }} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!showSearchResults && (
          <>
            {/* Categories */}
            <FadeInView index={3}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">Categories</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/explore");
                  }}
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="See all categories"
                >
                  <Text style={[styles.seeAllText, { color: accent }]} maxFontSizeMultiplier={1.3}>See all</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.hScroll}
              contentContainerStyle={styles.hScrollContent}
            >
              {categories.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.categoryCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.route) router.push(item.route);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} category`}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: accent + "1F" }]}>
                    <Ionicons name={item.icon} size={20} color={accent} />
                  </View>
                  <Text style={[styles.categoryText, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Trending places */}
            <FadeInView index={4} style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">Trending Places</Text>
                <Text style={[styles.sectionSub, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>
                  Curated world destinations & 1-tap AI plans
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/explore");
                }}
                style={styles.seeAllBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="See all trending places"
              >
                <Text style={[styles.seeAllText, { color: accent }]} maxFontSizeMultiplier={1.3}>See all</Text>
              </TouchableOpacity>
            </FadeInView>

            {/* Feed filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={[styles.hScroll, { marginTop: Spacing.sm, marginBottom: Spacing.md }]}
              contentContainerStyle={styles.hScrollContent}
            >
              {FEED_FILTER_CHIPS.map((chip) => {
                const isSelected = activeFeedCategory === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.feedFilterChip,
                      isSelected
                        ? { backgroundColor: accent, borderColor: accent }
                        : { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveFeedCategory(chip.id);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${chip.label.replace(/^\S+\s/, "")} filter`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color={ON_IMAGE} style={{ marginRight: 4 }} />}
                    <Text style={[styles.feedFilterChipText, { color: isSelected ? ON_IMAGE : themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Destinations carousel */}
            {feedLoading ? (
              <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
                {[0, 1].map((i) => (
                  <View key={i} style={[styles.popularCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
                    <Skeleton height={170} radius={0} />
                    <View style={styles.popularInfo}>
                      <Skeleton height={14} width="70%" style={{ marginBottom: Spacing.sm }} />
                      <Skeleton height={44} radius={Radius.sm} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : displayedDestinations.length === 0 ? (
              <EmptyState
                icon="compass-outline"
                title="No places here yet"
                text="Try another category to see more destinations."
                actionLabel="Show all"
                onAction={() => setActiveFeedCategory("all")}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.hScroll}
                contentContainerStyle={styles.hScrollContent}
              >
                {displayedDestinations.map((dest, idx) => {
                  const isSaved = !!savedPlaces[dest.id || dest.title];
                  return (
                    <FadeInView
                      key={dest.id}
                      index={idx}
                      style={[styles.popularCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                    >
                      <View style={styles.cardImageContainer}>
                        <SafeImage sourceUri={dest.image} style={styles.popularImage} />
                        <LinearGradient colors={SCRIM_COLORS} style={styles.cardScrim} pointerEvents="none" />

                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText} maxFontSizeMultiplier={1.3}>{dest.rating}</Text>
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={isSaved ? `Remove ${dest.title} from favourites` : `Save ${dest.title} to favourites`}
                          accessibilityState={{ selected: isSaved }}
                          style={styles.heartButton}
                          onPress={() => toggleSavePlace(dest)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.heartCircle}>
                            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={20} color={isSaved ? FAVOURITE_RED : ON_IMAGE} />
                          </View>
                        </TouchableOpacity>

                        <View style={styles.cardOverlayText} pointerEvents="none">
                          <Text style={styles.overlayTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>{dest.title}</Text>
                          <Text style={styles.overlaySub} numberOfLines={1} maxFontSizeMultiplier={1.3}>{dest.vibe}</Text>
                        </View>
                      </View>

                      <View style={styles.popularInfo}>
                        <View style={styles.richMetaRow}>
                          <View style={[styles.metaBadge, { backgroundColor: theme.badgeBg }]}>
                            <Ionicons name="calendar-outline" size={12} color={themeStyles.subTextColor} />
                            <Text style={[styles.metaBadgeText, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>{dest.season}</Text>
                          </View>
                          <View style={[styles.metaBadge, { backgroundColor: theme.badgeBg }]}>
                            <Ionicons name="pricetag-outline" size={12} color={accent} />
                            <Text style={[styles.metaBadgeText, { color: accent }]} maxFontSizeMultiplier={1.3}>{dest.priceEst}</Text>
                          </View>
                        </View>

                        <View style={styles.popularActionRow}>
                          <TouchableOpacity
                            style={[styles.aiPlanPillBtn, { backgroundColor: accent }]}
                            onPress={() => executeAiTrip(dest.title, 3, "Moderate", dest.image)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={`Generate a 3 day AI plan for ${dest.title}`}
                          >
                            <Ionicons name="sparkles" size={14} color={ON_IMAGE} style={{ marginRight: 4 }} />
                            <Text style={styles.aiPlanPillText} maxFontSizeMultiplier={1.3}>1-Tap AI</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.wizardPillBtn, { borderColor: themeStyles.borderColor }]}
                            onPress={() => selectPopularDestination(dest)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={`Customise trip to ${dest.title}`}
                          >
                            <Text style={[styles.wizardPillText, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>Customise</Text>
                            <Ionicons name="chevron-forward" size={14} color={themeStyles.subTextColor} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </FadeInView>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>

      {/* Live AI thinking modal */}
      <Modal statusBarTranslucent visible={aiLoading} transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.aiModalOverlay}>
          <View style={[styles.aiModalContent, { backgroundColor: themeStyles.cardBg }]}>
            <View style={[styles.aiPulseCircle, { backgroundColor: accent + "26" }]}>
              <Ionicons name="sparkles" size={28} color={AI_ACCENT} />
            </View>

            <Text style={[styles.aiModalTitle, { color: themeStyles.textColor }]} maxFontSizeMultiplier={1.3}>
              AI is planning your trip
            </Text>
            <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>
              Crafting your seamless, personalised itinerary
            </Text>

            <View style={styles.aiStepsBox}>
              {[
                { n: 1, text: "Analysing destination & climate" },
                { n: 2, text: "Curating top boutique stays & dining" },
                { n: 3, text: "Structuring morning-to-night itinerary" },
              ].map((step) => {
                const done = aiStep > step.n || (step.n === 1 && aiStep >= 1 && aiStep > 1);
                const active = aiStep === step.n;
                return (
                  <View key={step.n} style={styles.aiStepItem}>
                    <Ionicons
                      name={done ? "checkmark-circle" : active ? "sync-outline" : "ellipse-outline"}
                      size={20}
                      color={done ? accent : active ? AI_ACCENT : themeStyles.subTextColor}
                    />
                    <Text style={[styles.aiStepText, { color: done || active ? themeStyles.textColor : themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>
                      {step.text}
                    </Text>
                  </View>
                );
              })}
            </View>

            <ActivityIndicator size="small" color={accent} style={{ marginTop: Spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* Error modal if generation fails */}
      {aiError && (
        <Modal statusBarTranslucent visible={!!aiError} transparent={true} animationType="fade" onRequestClose={() => setAiError(null)}>
          <View style={styles.aiModalOverlay}>
            <View style={[styles.aiModalContent, { backgroundColor: themeStyles.cardBg }]}>
              <Ionicons name="alert-circle-outline" size={36} color={FAVOURITE_RED} />
              <Text style={[styles.aiModalTitle, { color: themeStyles.textColor, marginTop: Spacing.sm }]} maxFontSizeMultiplier={1.3}>Something went wrong</Text>
              <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]} maxFontSizeMultiplier={1.3}>{aiError}</Text>
              <TouchableOpacity
                style={[styles.aiSendBtn, { backgroundColor: accent, width: "100%", justifyContent: "center" }]}
                onPress={() => setAiError(null)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <Text style={styles.aiSendBtnText} maxFontSizeMultiplier={1.3}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  header: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  title: { fontSize: 28, fontFamily: Typography.fontBold },
  subtitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, marginTop: 2 },

  // AI hero card
  aiHeroCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  aiBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  aiGlowBadge: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  aiGlowBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, marginLeft: 6 },
  aiTinyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.xs },
  aiTinyBadgeText: { color: AI_ACCENT, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  aiHeroTitle: { fontSize: Typography.sizeXl, fontFamily: Typography.fontBold, marginBottom: 4 },
  aiHeroSub: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginBottom: Spacing.md },

  aiInputBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    marginBottom: Spacing.md,
  },
  inputLeadIcon: { marginRight: Spacing.sm },
  aiTextInput: { flex: 1, minWidth: 0, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, paddingVertical: Spacing.sm, minHeight: 44 },
  clearBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  aiSendBtn: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  aiSendBtnText: { color: ON_IMAGE, fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },

  innerPanel: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.card, borderWidth: 1 },
  panelLabel: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, letterSpacing: 0.3 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: Spacing.sm },
  rangeText: { flexShrink: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dateChipText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  customDateBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  customDateInput: { flex: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, minHeight: 44 },

  vibeScroll: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: Spacing.sm },
  vibeCard: { borderRadius: Radius.md, padding: 10, borderWidth: 1, width: "48.5%", minWidth: 0, minHeight: 44 },
  vibeIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  vibeCardTitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold, marginBottom: 2 },
  vibeCardTag: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },

  // Search places
  searchBlock: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  searchLabel: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  searchHelper: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2, marginBottom: Spacing.sm },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, minHeight: 44, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular },

  hScroll: { overflow: "visible", flexGrow: 0 },
  hScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm, alignItems: "center" },
  quickTagPill: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTagText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },

  searchSkeletons: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  searchResultsContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  resultItem: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingVertical: 10 },

  // Sections
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold },
  sectionSub: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2 },
  seeAllBtn: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xs },
  seeAllText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  categoryIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: Spacing.sm },
  categoryText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },

  feedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  feedFilterChipText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },

  // Trending cards
  popularCard: {
    width: 250,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  cardImageContainer: { width: "100%", height: 170, position: "relative" },
  popularImage: { width: "100%", height: "100%" },
  cardScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" },
  cardOverlayText: { position: "absolute", left: Spacing.md, right: Spacing.md, bottom: Spacing.md },
  overlayTitle: { color: ON_IMAGE, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  overlaySub: { color: ON_IMAGE, fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, marginTop: 2 },
  heartButton: { position: "absolute", top: 4, right: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heartCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  ratingBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  ratingText: { color: ON_IMAGE, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, marginLeft: 3 },
  popularInfo: { padding: Spacing.md },
  richMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: Spacing.md },
  metaBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.xs },
  metaBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, marginLeft: 4 },
  popularActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  aiPlanPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
  },
  aiPlanPillText: { color: ON_IMAGE, fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  wizardPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  wizardPillText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, marginRight: 2 },

  // AI modal
  aiModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: Spacing.xxl },
  aiModalContent: { width: "100%", borderRadius: 24, padding: Spacing.xxl, alignItems: "center" },
  aiPulseCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md },
  aiModalTitle: { fontSize: Typography.sizeXl, fontFamily: Typography.fontBold, textAlign: "center" },
  aiModalSub: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, textAlign: "center", marginTop: 4, marginBottom: Spacing.xl },
  aiStepsBox: { width: "100%", gap: Spacing.md },
  aiStepItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiStepText: { flex: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
});
