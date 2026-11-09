import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { INTEREST_PROMPT, DEFAULT_INTERESTS, DEFAULT_TRANSPORTS } from "../../Components/constants/Option";
import { model, generationConfig } from "../../Configs/AiModel";
import { CreateTripContext } from "../../context/CreateTripContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { TouchableOpacity } from "../../Components/ui/Touchable";
// Distinct category colors for visual distinction
const getCategoryBadgeStyle = (category, isDark) => {
  switch (category) {
    case "Beaches":
      return {
        bg: isDark ? "rgba(14, 165, 233, 0.18)" : "#E0F2FE",
        text: isDark ? "#38BDF8" : "#0284C7",
        border: isDark ? "rgba(14, 165, 233, 0.35)" : "#BAE6FD",
      };
    case "History":
    case "Museum":
      return {
        bg: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
        text: isDark ? "#FBBF24" : "#B45309",
        border: isDark ? "rgba(245, 158, 11, 0.35)" : "#FDE68A",
      };
    case "Nature":
    case "Adventure":
      return {
        bg: isDark ? "rgba(34, 197, 94, 0.18)" : "#DCFCE7",
        text: isDark ? "#4ADE80" : "#15803D",
        border: isDark ? "rgba(34, 197, 94, 0.35)" : "#BBF7D0",
      };
    case "Viewpoint":
      return {
        bg: isDark ? "rgba(168, 85, 247, 0.18)" : "#EDE9FE",
        text: isDark ? "#C084FC" : "#6D28D9",
        border: isDark ? "rgba(168, 85, 247, 0.35)" : "#DDD6FE",
      };
    case "Food":
      return {
        bg: isDark ? "rgba(244, 63, 94, 0.18)" : "#FFE4E6",
        text: isDark ? "#FB7185" : "#BE123C",
        border: isDark ? "rgba(244, 63, 94, 0.35)" : "#FECDD3",
      };
    case "Shopping":
      return {
        bg: isDark ? "rgba(139, 92, 246, 0.18)" : "#F3E8FF",
        text: isDark ? "#A78BFA" : "#7E22CE",
        border: isDark ? "rgba(139, 92, 246, 0.35)" : "#E9D5FF",
      };
    default:
      return {
        bg: isDark ? "rgba(10, 126, 164, 0.2)" : "rgba(10, 126, 164, 0.08)",
        text: isDark ? "#38BDF8" : Colors.PRIMARY,
        border: isDark ? "rgba(10, 126, 164, 0.35)" : "rgba(10, 126, 164, 0.15)",
      };
  }
};

const InterestCard = ({ item, index, isSelected, onPress, theme }) => {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 40, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  const catStyle = getCategoryBadgeStyle(item.category, theme.isDark);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isSelected
              ? Colors.PRIMARY
              : theme.isDark
              ? "#2C2C2C"
              : Colors.LIGHT_GRAY,
          },
          isSelected && [
            styles.selectedCard,
            { backgroundColor: theme.isDark ? "rgba(10, 126, 164, 0.1)" : "#F0F9FF" },
          ],
        ]}
        onPress={() => onPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
          <View style={styles.cardHeaderRight}>
            {item.category && (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: catStyle.bg, borderColor: catStyle.border },
                ]}
              >
                <Text style={[styles.categoryText, { color: catStyle.text }]}>
                  {item.category}
                </Text>
              </View>
            )}
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isSelected ? Colors.PRIMARY : theme.isDark ? "#555" : "#D1D5DB"}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>
        {item.description && (
          <Text style={[styles.cardDescription, { color: theme.subtext }]}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Curated iconic landmarks for major destinations (0ms instant render)
const CITY_SPECIFIC_HIGHLIGHTS = {
  istanbul: [
    { id: 'ist-1', name: '🕌 Hagia Sophia Grand Mosque', description: 'Legendary 6th-century Byzantine masterpiece & cultural symbol', category: 'History' },
    { id: 'ist-2', name: '🏛️ Topkapi Palace & Imperial Harem', description: 'Historic residence of Ottoman Sultans overlooking the Bosphorus', category: 'History' },
    { id: 'ist-3', name: '🕌 The Blue Mosque (Sultanahmet)', description: 'Six majestic minarets & stunning blue Iznik tiles', category: 'History' },
    { id: 'ist-4', name: '🛍️ Grand Bazaar & Spice Market', description: 'World-famous covered market with 4,000+ vibrant shops & spices', category: 'Shopping' },
    { id: 'ist-5', name: '🗼 Galata Tower & Bosphorus Views', description: 'Iconic medieval stone tower with 360° panoramas over Istanbul', category: 'Viewpoint' },
    { id: 'ist-6', name: '🌊 Bosphorus Sunset Cruise', description: 'Picturesque sailing between Europe & Asia along the historic strait', category: 'Nature' },
    { id: 'ist-7', name: '🍴 Authentic Ottoman Kebabs & Meze', description: 'Taste legendary Iskender, kebabs & fresh grilled mezes', category: 'Food' },
    { id: 'ist-8', name: '☕ Historic Turkish Coffee & Baklava', description: 'Slow-brewed sand coffee paired with flaky pistachio baklava', category: 'Food' },
  ],
  dubai: [
    { id: 'dxb-1', name: '🏙️ Burj Khalifa & Sky Deck', description: 'World’s tallest tower with stunning 360° Arabian Gulf views', category: 'Viewpoint' },
    { id: 'dxb-2', name: '🏜️ Arabian Desert Safari & Dunes', description: 'Thrilling dune bashing, camel trek & sunset Bedouin camp', category: 'Nature' },
    { id: 'dxb-3', name: '🛍️ The Dubai Mall & Dancing Fountain', description: 'Mega shopping destination with mesmerizing light & water shows', category: 'Shopping' },
    { id: 'dxb-4', name: '🏖️ Jumeirah Beach & Palm Promenade', description: 'White sands and turquoise shores overlooking Atlantis', category: 'Beaches' },
    { id: 'dxb-5', name: '🏛️ Museum of the Future', description: 'Architectural wonder showcasing futuristic innovations', category: 'History' },
    { id: 'dxb-6', name: '🍴 Arabian Dining & Street Shawarma', description: 'Authentic Emirati delicacies, shawarmas & luxury dining', category: 'Food' },
  ],
  paris: [
    { id: 'par-1', name: '🗼 Eiffel Tower & Champ de Mars', description: 'Iconic iron lattice tower with panoramic views over Paris', category: 'Viewpoint' },
    { id: 'par-2', name: '🏛️ The Louvre Museum & Glass Pyramid', description: 'Home of the Mona Lisa, Venus de Milo & world treasures', category: 'History' },
    { id: 'par-3', name: '⛪ Notre-Dame Cathedral & Seine Island', description: 'Gothic masterpiece on the Île de la Cité', category: 'History' },
    { id: 'par-4', name: '🛍️ Champs-Élysées & Arc de Triomphe', description: 'Prestigious avenue lined with luxury boutiques & cafes', category: 'Shopping' },
    { id: 'par-5', name: '☕ Authentic Parisian Bistro & Pastries', description: 'Classic cafe terrace, fresh croissants & artisanal coffee', category: 'Food' },
    { id: 'par-6', name: '🎨 Montmartre & Sacré-Cœur Basilica', description: 'Bohemian artist hilltop with breathtaking city skyline', category: 'Viewpoint' },
  ],
  tokyo: [
    { id: 'tyo-1', name: '🗼 Tokyo Tower & Shibuya Sky', description: 'Futuristic observation decks with panoramic city views', category: 'Viewpoint' },
    { id: 'tyo-2', name: '⛩️ Senso-ji Temple & Asakusa', description: 'Tokyo’s oldest Buddhist temple and traditional street shops', category: 'History' },
    { id: 'tyo-3', name: '🚶 Shibuya Crossing & Hachiko', description: 'World’s busiest pedestrian crossing & vibrant neon district', category: 'Attraction' },
    { id: 'tyo-4', name: '🍣 Tsukiji Outer Market & Omakase Sushi', description: 'World-renowned fresh seafood, wagyu skewers & matcha', category: 'Food' },
    { id: 'tyo-5', name: '🌳 Shinjuku Gyoen National Garden', description: 'Tranquil Japanese gardens, cherry blossoms & ponds', category: 'Nature' },
    { id: 'tyo-6', name: '🛍️ Akihabara & Ginza Shopping', description: 'High-tech electronics, anime culture & luxury retail', category: 'Shopping' },
  ],
  rome: [
    { id: 'rom-1', name: '🏛️ The Colosseum & Roman Forum', description: 'Ancient amphitheater & heart of the Roman Empire', category: 'History' },
    { id: 'rom-2', name: '⛲ Trevi Fountain & Spanish Steps', description: 'Baroque masterpiece fountain and elegant landmark steps', category: 'Attraction' },
    { id: 'rom-3', name: '⛪ Vatican City & St. Peter’s Basilica', description: 'Sistine Chapel, Michelangelo frescoes & sacred architecture', category: 'History' },
    { id: 'rom-4', name: '🏛️ The Pantheon & Piazza Navona', description: 'Ancient dome with central oculus & vibrant street artists', category: 'History' },
    { id: 'rom-5', name: '🍝 Authentic Trastevere Pasta & Gelato', description: 'Handmade carbonara, cacio e pepe & artisanal gelato', category: 'Food' },
  ],
  london: [
    { id: 'lon-1', name: '🕰️ Big Ben & Palace of Westminster', description: 'Iconic neo-Gothic clock tower & Houses of Parliament', category: 'History' },
    { id: 'lon-2', name: '🎡 The London Eye & River Thames', description: 'Giant observation wheel with skyline views across London', category: 'Viewpoint' },
    { id: 'lon-3', name: '🏛️ The British Museum', description: 'World-famous museum of human history, art and Rosetta Stone', category: 'History' },
    { id: 'lon-4', name: '🏰 Tower of London & Tower Bridge', description: 'Historic fortress holding the dazzling Crown Jewels', category: 'History' },
    { id: 'lon-5', name: '🌳 Hyde Park & Kensington Gardens', description: 'Sprawling royal parklands and serene boating lakes', category: 'Nature' },
    { id: 'lon-6', name: '🍴 Borough Market Gourmet Food', description: 'Historic food market with artisan cheese, pastries & street food', category: 'Food' },
  ],
};

const KNOWN_CITY_COORDINATES = {
  istanbul: { lat: 41.0082, lng: 28.9784 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  rome: { lat: 41.9028, lng: 12.4964 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  bali: { lat: -8.4095, lng: 115.1889 },
  cairo: { lat: 30.0444, lng: 31.2357 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  karachi: { lat: 24.8607, lng: 67.0011 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  barcelona: { lat: 41.3879, lng: 2.1699 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  newyork: { lat: 40.7128, lng: -74.0060 },
  "new york": { lat: 40.7128, lng: -74.0060 },
};

// Curated authentic transit modes for destinations (0ms instant render)
const CITY_TRANSPORTS = {
  istanbul: [
    { id: "ist-metro", name: "🚇 Metro & Marmaray" },
    { id: "ist-tram", name: "🚋 Historic Tram (T1)" },
    { id: "ist-ferry", name: "⛴️ Bosphorus Ferry" },
    { id: "ist-taxi", name: "🚕 Yellow Taxi & BiTaksi" },
    { id: "ist-walk", name: "🚶 Walking & Historic Alleys" },
  ],
  dubai: [
    { id: "dxb-metro", name: "🚇 Dubai Metro" },
    { id: "dxb-taxi", name: "🚕 RTA Taxi / Careem" },
    { id: "dxb-monorail", name: "🚝 Palm Monorail" },
    { id: "dxb-abra", name: "🛶 Traditional Abra" },
    { id: "dxb-walk", name: "🚶 Marina & Promenade" },
  ],
  paris: [
    { id: "par-metro", name: "🚇 Paris Métro & RER" },
    { id: "par-walk", name: "🚶 Walking Boulevards" },
    { id: "par-bus", name: "🚌 City Bus" },
    { id: "par-bike", name: "🚲 Vélib' Bike" },
    { id: "par-taxi", name: "🚕 Paris Taxi / Uber" },
  ],
  tokyo: [
    { id: "tyo-jr", name: "🚆 JR Yamanote Line" },
    { id: "tyo-subway", name: "🚇 Tokyo Subway" },
    { id: "tyo-walk", name: "🚶 Walking Neon Streets" },
    { id: "tyo-taxi", name: "🚕 Tokyo Taxi" },
    { id: "tyo-bullet", name: "🚅 Shinkansen Bullet Train" },
  ],
  rome: [
    { id: "rom-walk", name: "🚶 Walking Cobblestones" },
    { id: "rom-metro", name: "🚇 Rome Metro" },
    { id: "rom-bus", name: "🚌 City Bus & Tram" },
    { id: "rom-taxi", name: "🚕 White City Taxi" },
    { id: "rom-scooter", name: "🛵 Vespa / E-Scooter" },
  ],
  london: [
    { id: "lon-tube", name: "🚇 Underground (The Tube)" },
    { id: "lon-bus", name: "🚌 Red Double-Decker Bus" },
    { id: "lon-walk", name: "🚶 Walking Thames Riverbank" },
    { id: "lon-blackcab", name: "🚕 Traditional Black Cab" },
    { id: "lon-uberboat", name: "🛥️ Uber Thames Boat" },
  ],
  bali: [
    { id: "bali-driver", name: "🚗 Private Driver & Car" },
    { id: "bali-scooter", name: "🛵 Scooter / Gojek Rental" },
    { id: "bali-taxi", name: "🚕 Bluebird Taxi" },
    { id: "bali-shuttle", name: "🚐 Tourist Island Shuttle" },
    { id: "bali-walk", name: "🚶 Beachfront Walking" },
  ],
};

const getSmartDestinationTransports = (dest = "") => {
  const d = (dest || "").toLowerCase();
  for (const [cityName, cityTransports] of Object.entries(CITY_TRANSPORTS)) {
    if (d.includes(cityName)) {
      return cityTransports;
    }
  }
  return [
    { id: "taxi", name: "🚕 Local Taxi / Ride-Hailing" },
    { id: "metro", name: "🚇 Metro & Train" },
    { id: "walk", name: "🚶 Walking" },
    { id: "bus", name: "🚌 Local Bus" },
    { id: "rental", name: "🚗 Car Rental" },
  ];
};

// Curated highlights tailored to destination geography (0ms instant initial render)
const getSmartDestinationInterests = (dest = "") => {
  const d = (dest || "").toLowerCase();

  // If destination matches a specific top city, return authentic real landmarks immediately
  for (const [cityName, cityHighlights] of Object.entries(CITY_SPECIFIC_HIGHLIGHTS)) {
    if (d.includes(cityName)) {
      return cityHighlights;
    }
  }

  const isBeach = /beach|coast|island|bali|maldives|phuket|miami|cancun|hawaii|goa|santorini|bahamas|krabi/i.test(d);
  const isHistoric = /rome|paris|cairo|athens|kyoto|lahore|london|delhi|florence|beijing|agra/i.test(d);
  const isMountain = /alps|mountain|hike|swiss|banff|aspen|manali|nepal|queenstown|murree|swat/i.test(d);

  return [
    ...(isBeach ? [
      { id: 'smart-beach-1', name: '🏖️ Scenic Beach & Coastline', description: 'Sunbathing, turquoise waters & seaside promenades', category: 'Beaches' },
      { id: 'smart-beach-2', name: '🌊 Coastal Water Sports & Cruise', description: 'Snorkeling, paddleboarding or sunset catamaran cruise', category: 'Beaches' },
    ] : []),
    ...(isHistoric ? [
      { id: 'smart-hist-1', name: '🏛️ Iconic Ancient Monument & Heritage', description: 'World-renowned architectural marvels & ancient heritage', category: 'History' },
      { id: 'smart-hist-2', name: '🏰 National Museum & Royal Palaces', description: 'Curated historic artifacts & grand royal halls', category: 'History' },
    ] : [
      { id: 'smart-hist-def', name: '🏛️ Historic Old Town & Heritage', description: 'Explore ancient architecture, squares & local heritage', category: 'History' },
    ]),
    ...(isMountain ? [
      { id: 'smart-mount-1', name: '⛰️ Alpine Peak & Summit Viewpoint', description: 'Dramatic panoramic mountain ridges & fresh air', category: 'Nature' },
      { id: 'smart-mount-2', name: '🥾 Scenic Forest & Hiking Trails', description: 'Curated alpine trails, waterfalls & nature walks', category: 'Nature' },
    ] : [
      { id: 'smart-nat-def', name: '🌳 Scenic Nature & Urban Parks', description: 'Relaxing botanical gardens & peaceful green oases', category: 'Nature' },
    ]),
    { id: 'smart-food-1', name: '🍴 Authentic Local Dining & Bistros', description: 'Taste legendary regional dishes & chef favorites', category: 'Food' },
    { id: 'smart-food-2', name: '☕ Artisanal Cafe & Street Delights', description: 'Famous local coffee spots, bakeries & sweets', category: 'Food' },
    { id: 'smart-view-1', name: '👀 360° Sky High Observation Deck', description: 'Breathtaking bird’s-eye perspective of the destination', category: 'Viewpoint' },
    { id: 'smart-shop-1', name: '🛍️ Traditional Souk & Artisan Market', description: 'Handcrafted souvenirs, textiles & local treasures', category: 'Shopping' },
  ];
};

export default function YourInterest() {
  const router = useRouter();
  const theme = useTheme();

  const { tripData, setTripData } = useContext(CreateTripContext);
  const destinationName = tripData?.toLocation?.name?.split(",")[0] || "your destination";

  const [placesList, setPlacesList] = useState(() =>
    getSmartDestinationInterests(tripData?.toLocation?.name)
  );
  const [transportList, setTransportList] = useState(() =>
    getSmartDestinationTransports(tripData?.toLocation?.name)
  );
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(() => {
    const defaultList = getSmartDestinationTransports(tripData?.toLocation?.name);
    return tripData?.transport || defaultList[0]?.id || "taxi";
  });
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const retryTimerRef = useRef(null);
  const nextAllowedRequestAtRef = useRef(0);

  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || "en";
  const lang = deviceLocale.split("-")[0]?.toLowerCase() || "en";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const parseCoord = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const haversineKm = (aLat, aLng, bLat, bLng) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const sa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(aLat)) *
        Math.cos(toRad(bLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  };

  // Tag categorizer with Beach and coastal recognition
  const categoryFromTags = (tags = {}) => {
    if (tags.natural === "beach" || tags.leisure === "beach_resort" || tags.beach) {
      return { category: "Beaches", emoji: "🏖️" };
    }
    if (tags.natural === "peak") return { category: "Nature", emoji: "⛰️" };
    if (tags.natural === "water" || tags.water) return { category: "Nature", emoji: "🌊" };
    if (tags.tourism === "museum") return { category: "History", emoji: "🏛️" };
    if (tags.historic) return { category: "History", emoji: "🏰" };
    if (tags.tourism === "viewpoint") return { category: "Viewpoint", emoji: "👀" };
    if (tags.tourism === "attraction") return { category: "Attraction", emoji: "📍" };
    if (tags.leisure === "park") return { category: "Leisure", emoji: "🌳" };
    if (tags.amenity === "restaurant" || tags.amenity === "cafe") return { category: "Food", emoji: "🍴" };
    if (tags.amenity === "marketplace") return { category: "Shopping", emoji: "🛍️" };
    if (tags.tourism) return { category: "Tourism", emoji: "🧭" };
    return { category: "General", emoji: "✨" };
  };

  const t = (key) => {
    const dict = {
      walk: { en: "Walking", ur: "پیدل", it: "A piedi", de: "Zu Fuß", es: "A pie", fr: "À pied", ar: "مشياً" },
      bus: { en: "Local Bus", ur: "مقامی بس", it: "Autobus locale", de: "Linienbus", es: "Autobús local", fr: "Bus local", ar: "حافلة محلية" },
      taxi: { en: "Taxi", ur: "ٹیکسی", it: "Taxi", de: "Taxi", es: "Taxi", fr: "Taxi", ar: "تاكسي" },
      bike: { en: "Bike / E-bike", ur: "سائیکل / ای-بائیک", it: "Bici / E-bike", de: "Fahrrad / E‑Bike", es: "Bici / E‑bike", fr: "Vélo / VAE", ar: "دراجة / كهربائية" },
      car: { en: "Car Rental", ur: "کار کرایہ", it: "Noleggio auto", de: "Mietwagen", es: "Alquiler de coche", fr: "Location de voiture", ar: "تأجير سيارة" },
      hike: { en: "Hiking Trails", ur: "پیدل راستے", it: "Sentieri", de: "Wanderwege", es: "Senderos", fr: "Sentiers", ar: "مسارات مشي" },
      cable: { en: "Cable Car / Lift", ur: "کیبل کار / لفٹ", it: "Funivia / Impianto", de: "Seilbahn / Lift", es: "Teleférico", fr: "Téléphérique", ar: "تلفريك" },
      jeep: { en: "Mountain Shuttle / 4x4", ur: "4x4 شٹل", it: "Navetta / 4x4", de: "Shuttle / 4x4", es: "Transporte / 4x4", fr: "Navette / 4x4", ar: "مكوك / 4x4" },
      train: { en: "Regional Train", ur: "علاقائی ٹرین", it: "Treno regionale", de: "Regionalzug", es: "Tren regional", fr: "Train régional", ar: "قطار إقليمي" },
    };
    return dict[key]?.[lang] || dict[key]?.en || key;
  };

  const makeTransportList = ({ isMountain, hasRail }) => {
    const base = [
      { id: "walk", name: `🚶 ${t("walk")}` },
      { id: "bus", name: `🚌 ${t("bus")}` },
      { id: "taxi", name: `🚕 ${t("taxi")}` },
      { id: "bike", name: `🚲 ${t("bike")}` },
      { id: "car", name: `🚗 ${t("car")}` },
    ];
    const mountainExtras = [
      { id: "hike", name: `🥾 ${t("hike")}` },
      { id: "cable", name: `🚠 ${t("cable")}` },
      { id: "jeep", name: `🚙 ${t("jeep")}` },
    ];
    let transports = base;
    if (hasRail) {
      transports = [
        { id: "train", name: `🚆 ${t("train")}` },
        ...transports.filter((t) => t.id !== "train"),
      ];
    }
    if (isMountain) {
      transports = [
        ...mountainExtras,
        ...transports.filter((t) => !mountainExtras.some((m) => m.id === t.id)),
      ];
    }
    return transports.slice(0, 5);
  };

  const fetchOverpassInterests = async ({ lat, lng }) => {
    const radius = 8000; // Optimized 8km radius for high density and rapid response
    const query = `
      [out:json][timeout:3];
      (
        nwr(around:${radius},${lat},${lng})[tourism~"^(attraction|museum|viewpoint)$"];
        nwr(around:${radius},${lat},${lng})[historic];
        nwr(around:${radius},${lat},${lng})[natural~"^(peak|water|beach)$"];
        nwr(around:${radius},${lat},${lng})[leisure~"^(park|beach_resort)$"];
        nwr(around:${radius},${lat},${lng})[amenity~"^(cafe|restaurant|marketplace)$"];
        nwr(around:${radius},${lat},${lng})[railway=station];
      );
      out center 35;
    `.trim();

    // Parallel Racing over 3 fast global Overpass mirrors with individual 2.8s timeouts
    const OVERPASS_MIRRORS = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];

    const fetchFromMirror = async (mirrorUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);
      try {
        const res = await fetch(mirrorUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Mirror ${mirrorUrl} error ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Fastest responding mirror wins immediately
    const data = await Promise.any(OVERPASS_MIRRORS.map(fetchFromMirror));
    const elements = Array.isArray(data?.elements) ? data.elements : [];

    let hasRail = false;
    let peakCount = 0;
    const seen = new Set();

    const pickLocalizedName = (tags) => {
      const localized = (tags?.[`name:${lang}`] || "").trim();
      if (localized) return localized;
      const intl = (tags?.[`int_name`] || "").trim();
      const name = (tags?.name || "").trim();
      return localized || intl || name;
    };

    const interests = elements
      .map((el) => {
        const tags = el?.tags || {};
        const name = pickLocalizedName(tags);
        if (!name) return null;

        if (tags.railway === "station") hasRail = true;
        if (tags.natural === "peak") peakCount += 1;

        const centerLat = el?.lat ?? el?.center?.lat;
        const centerLng = el?.lon ?? el?.center?.lon;
        if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return null;

        const { category, emoji } = categoryFromTags(tags);
        const key = `${name.toLowerCase()}|${category}`;
        if (seen.has(key)) return null;
        seen.add(key);

        const distKm = haversineKm(lat, lng, centerLat, centerLng);
        const description =
          category === "Beaches"
            ? "Scenic coastal or waterfront relaxation"
            : category === "Viewpoint"
            ? "Great spot for panoramic photos"
            : category === "Food"
              ? "Try a local favorite nearby"
              : category === "Nature"
                ? "Scenic place worth exploring"
                : category === "History"
                  ? "A historic landmark with character"
                  : "A popular local place to check out";

        return {
          id: `${el.type}-${el.id}`,
          name: `${emoji} ${name}`,
          description,
          category,
          _distKm: distKm,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a._distKm - b._distKm)
      .slice(0, 20)
      .map(({ _distKm, ...rest }) => rest);

    const transports = makeTransportList({ isMountain: peakCount >= 3, hasRail });
    return { interests, transports };
  };

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  const startRetryCountdown = (seconds) => {
    if (!seconds || seconds <= 0) return;
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryAfterSeconds(seconds);
    retryTimerRef.current = setInterval(() => {
      setRetryAfterSeconds((s) => {
        if (s <= 1) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const extractRetrySeconds = (err) => {
    const msg = String(err?.message || "");
    const m = msg.match(/Please retry in\s+([\d.]+)s/i);
    if (!m) return 0;
    const n = Math.ceil(Number(m[1]));
    return Number.isFinite(n) ? n : 0;
  };

  const GetDynamicInterests = async () => {
    try {
      const now = Date.now();
      if (now < nextAllowedRequestAtRef.current) {
        const waitSec = Math.ceil((nextAllowedRequestAtRef.current - now) / 1000);
        startRetryCountdown(waitSec);
        setErrorMessage(`Please wait ${waitSec}s before retrying`);
        return;
      }

      setLoadingInterests(true);
      setErrorMessage(null);
      const locationName = tripData?.toLocation?.name;

      if (!locationName) {
        setLoadingInterests(false);
        return;
      }

      const cacheKey = `@goguide_interests_${destinationName.trim().toLowerCase()}`;

      // Check local cache for 0ms retrieval
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed?.interests) && parsed.interests.length > 0) {
            setPlacesList(parsed.interests);
            if (Array.isArray(parsed?.transports) && parsed.transports.length > 0) {
              setTransportList(parsed.transports);
            }
            setLoadingInterests(false);
            return;
          }
        }
      } catch (e) {}

      // Try OpenStreetMap / Overpass with fast multi-mirror race
      let lat = parseCoord(tripData?.toLocation?.coordinates?.lat);
      let lng = parseCoord(tripData?.toLocation?.coordinates?.lng);

      // Fast coordinate resolver if coordinates were not attached
      if (lat == null || lng == null) {
        const destKey = destinationName.toLowerCase().trim();
        for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
          if (destKey.includes(key)) {
            lat = coords.lat;
            lng = coords.lng;
            break;
          }
        }
      }

      if (lat == null || lng == null) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationName)}`
          );
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData[0]) {
            lat = Number(geoData[0].lat);
            lng = Number(geoData[0].lon);
          }
        } catch (e) {}
      }

      if (lat != null && lng != null) {
        try {
          const osm = await fetchOverpassInterests({ lat, lng });
          if (osm?.interests?.length) setPlacesList(osm.interests);
          if (osm?.transports?.length) setTransportList(osm.transports);
          if (osm?.interests?.length || osm?.transports?.length) {
            setLoadingInterests(false);
            try {
              await AsyncStorage.setItem(cacheKey, JSON.stringify(osm));
            } catch (e) {}
            return;
          }
        } catch (osmErr) {
          console.log("[DEBUG] Overpass fast fallback to AI:", osmErr.message);
        }
      }

      // Fast OSM Nominatim Fetch (Rapid ~300ms response without CORS/406 blocks)
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=15&q=attractions+in+${encodeURIComponent(destinationName)}`
        );
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const fetchedPlaces = nomData
            .map((item, idx) => {
              const name = (item.name || item.display_name?.split(",")[0] || "").trim();
              if (!name || name.length < 2) return null;
              return {
                id: `nom-${item.place_id || idx}`,
                name: `📍 ${name}`,
                description: item.display_name?.split(",").slice(1, 3).join(",").trim() || "Popular landmark & attraction",
                category: "Attraction",
              };
            })
            .filter(Boolean);

          if (fetchedPlaces.length > 0) {
            setPlacesList((prev) => {
              const existingNames = new Set(prev.map((p) => p.name.replace(/^[^\w\s]+/, "").trim().toLowerCase()));
              const novel = fetchedPlaces.filter(
                (p) => !existingNames.has(p.name.replace(/^[^\w\s]+/, "").trim().toLowerCase())
              );
              return [...prev, ...novel.slice(0, 8)];
            });
            setLoadingInterests(false);
            try {
              await AsyncStorage.setItem(cacheKey, JSON.stringify({ interests: fetchedPlaces, transports: transportList }));
            } catch (e) {}
            return;
          }
        }
      } catch (nomErr) {
        console.log("[DEBUG] Nominatim search note:", nomErr.message);
      }

      // Fallback: Gemini prompt via resilient backend /generate call with timeout
      const FINAL_PROMPT = INTEREST_PROMPT.replace("{{location}}", locationName);
      let parsedResponse = null;

      try {
        const result = await Promise.race([
          model.generateContent({
            contents: [{ role: "user", parts: [{ text: FINAL_PROMPT }] }],
            generationConfig,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI response timeout")), 4500))
        ]);

        const response = await result.response.text();
        let cleanResponse = response.trim();
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanResponse = jsonMatch[0];

        if (cleanResponse) {
          parsedResponse = JSON.parse(cleanResponse);
        }
      } catch (genErr) {
        console.log("[DEBUG] Fallback AI interest attempt note:", genErr.message);
      }

      if (parsedResponse) {
        if (Array.isArray(parsedResponse.interests) && parsedResponse.interests.length > 0) {
          setPlacesList(parsedResponse.interests);
        }
        if (Array.isArray(parsedResponse.transports) && parsedResponse.transports.length > 0) {
          setTransportList(parsedResponse.transports);
        }
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(parsedResponse));
        } catch (e) {}
      }
    } catch (error) {
      console.error("[DEBUG] Error fetching interests:", error);
      const msg = String(error?.message || "");
      const retrySec = extractRetrySeconds(error);
      if (retrySec > 0) {
        nextAllowedRequestAtRef.current = Date.now() + retrySec * 1000;
        startRetryCountdown(retrySec);
      }
    } finally {
      setLoadingInterests(false);
    }
  };

  useEffect(() => {
    if (tripData?.toLocation?.name) {
      GetDynamicInterests();
    }
  }, [tripData?.toLocation?.name]);

  // Compute dynamic category recommendations based on what actually exists for this destination
  const availableCategories = useMemo(() => {
    const counts = {};
    placesList.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const categories = [
      { id: "all", label: "All Spots", icon: "✨", count: placesList.length },
    ];

    const categoryMeta = {
      History: { label: "History & Heritage", icon: "🏛️" },
      Beaches: { label: "Beaches & Coastal", icon: "🏖️" },
      Nature: { label: "Nature & Adventure", icon: "⛰️" },
      Food: { label: "Food & Culinary", icon: "🍴" },
      Viewpoint: { label: "Viewpoints", icon: "👀" },
      Shopping: { label: "Shopping", icon: "🛍️" },
      Attraction: { label: "Attractions", icon: "📍" },
      Leisure: { label: "Parks & Leisure", icon: "🌳" },
    };

    Object.keys(counts).forEach((cat) => {
      const meta = categoryMeta[cat] || { label: cat, icon: "📍" };
      categories.push({
        id: cat,
        label: meta.label,
        icon: meta.icon,
        count: counts[cat],
      });
    });

    return categories;
  }, [placesList]);

  // Filter list by selected category tab
  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return placesList;
    return placesList.filter((p) => (p.category || "General") === activeCategory);
  }, [placesList, activeCategory]);

  const togglePlace = (id) => {
    triggerHaptic();
    if (selectedPlaces.includes(id)) {
      setSelectedPlaces(selectedPlaces.filter((p) => p !== id));
    } else {
      setSelectedPlaces([...selectedPlaces, id]);
    }
  };

  const handleContinue = () => {
    triggerHaptic();
    if (selectedPlaces.length > 0) {
      const finalTransport = selectedTransport || transportList[0]?.id || "taxi";
      const selectedInterestItems = placesList.filter((p) =>
        selectedPlaces.includes(p.id)
      );
      const selectedTransportItem =
        transportList.find((t) => t.id === finalTransport) || transportList[0] || null;

      const chosenCategories = Array.from(
        new Set(selectedInterestItems.map((i) => i.category).filter(Boolean))
      );

      setTripData((prev) => ({
        ...prev,
        interests: selectedPlaces,
        transport: finalTransport,
        interestsDetails: selectedInterestItems,
        transportDetails: selectedTransportItem,
        selectedCategories: chosenCategories,
      }));
      router.push("/create-trip/select-dates");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header Bar with Back Button */}
      <View style={[styles.topBar, { borderBottomColor: theme.isDark ? "#262626" : "#F3F4F6" }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: theme.isDark ? "#262626" : "#F3F4F6" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.subtext }]}>Step 3 of 6</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View style={styles.headerArea}>
            <StepProgressBar currentStep={3} totalSteps={6} stepTitle="Select Interests" />
            <Text style={styles.heroPreTitle}>TRIP DNA</Text>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.title, { color: theme.text }]}>What excites you most?</Text>
              {selectedPlaces.length > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>
                    {selectedPlaces.length} Selected
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              Curated highlights for{" "}
              <Text style={styles.locationHighlight}>{destinationName}</Text>
            </Text>

            {/* Dynamic Recommendations Chips Bar */}
            {availableCategories.length > 1 && !loadingInterests && (
              <View style={styles.categorySection}>
                <Text style={[styles.categoryHeading, { color: theme.subtext }]}>
                  RECOMMENDED CATEGORIES FOR {destinationName.toUpperCase()}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {availableCategories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isActive
                              ? Colors.PRIMARY
                              : theme.isDark
                              ? "#1F1F1F"
                              : "#F3F4F6",
                            borderColor: isActive
                              ? Colors.PRIMARY
                              : theme.isDark
                              ? "#333333"
                              : "#E5E7EB",
                          },
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setActiveCategory(cat.id);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                        <Text
                          style={[
                            styles.categoryChipLabel,
                            { color: isActive ? "#FFFFFF" : theme.text },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <View
                          style={[
                            styles.countBadge,
                            {
                              backgroundColor: isActive
                                ? "rgba(255, 255, 255, 0.25)"
                                : theme.isDark
                                ? "#333"
                                : "#E5E7EB",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.countBadgeText,
                              { color: isActive ? "#FFFFFF" : theme.subtext },
                            ]}
                          >
                            {cat.count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {activeCategory === "all"
                  ? "Popular Highlights"
                  : availableCategories.find((c) => c.id === activeCategory)?.label || "Activities"}
              </Text>
              {!loadingInterests && (
                <TouchableOpacity onPress={GetDynamicInterests} activeOpacity={0.7}>
                  <Text style={styles.refreshText}>🔄 Refresh</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingInterests && placesList.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.PRIMARY} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>
                  Curating local highlights for {destinationName}...
                </Text>
              </View>
            )}

            {loadingInterests && placesList.length > 0 && (
              <View style={[styles.loadingBannerPill, { backgroundColor: theme.isDark ? "#1F1F1F" : "#F0F9FF", borderColor: theme.isDark ? "#333" : "#BAE6FD" }]}>
                <ActivityIndicator size="small" color={Colors.PRIMARY} style={{ marginRight: 8 }} />
                <Text style={[styles.loadingBannerText, { color: theme.subtext }]}>
                  Discovering live local highlights for {destinationName}...
                </Text>
              </View>
            )}

            {errorMessage && !loadingInterests && (
              <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
                <Text style={styles.errorText}>⚠️ Notice: {errorMessage}</Text>
                <TouchableOpacity
                  onPress={GetDynamicInterests}
                  style={[styles.retryBtn, retryAfterSeconds > 0 && styles.retryBtnDisabled]}
                  disabled={retryAfterSeconds > 0}
                >
                  <Text style={styles.retryText}>
                    {retryAfterSeconds > 0 ? `Retry in ${retryAfterSeconds}s` : "Retry Connection"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        renderItem={({ item, index }) => (
          <InterestCard
            item={item}
            index={index}
            isSelected={selectedPlaces.includes(item.id)}
            onPress={togglePlace}
            theme={theme}
          />
        )}
        ListEmptyComponent={() =>
          !loadingInterests && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                No activities found in this category.
              </Text>
              <TouchableOpacity
                onPress={() => setActiveCategory("all")}
                style={styles.retryMinBtn}
              >
                <Text style={styles.retryMinText}>View All Activities</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={() => (
          <View style={styles.footerArea}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
              Best Way to Travel
            </Text>

            <View style={styles.transportContainer}>
              {transportList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  style={[
                    styles.transportCard,
                    {
                      backgroundColor: theme.card,
                      borderColor:
                        selectedTransport === item.id
                          ? Colors.PRIMARY
                          : theme.isDark
                          ? "#333"
                          : Colors.LIGHT_GRAY,
                    },
                    selectedTransport === item.id && styles.selectedTransport,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedTransport(item.id);
                  }}
                >
                  <Text
                    style={[
                      styles.transportText,
                      { color: theme.text },
                      selectedTransport === item.id && styles.selectedTransportText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />

      {/* Floating Bottom Button Bar */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.isDark ? "#262626" : "#F3F4F6" }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.button,
            selectedPlaces.length === 0 && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedPlaces.length === 0}
        >
          <Text style={styles.buttonText}>
            {selectedPlaces.length > 0
              ? `Confirm (${selectedPlaces.length}) & Continue`
              : "Select at least 1 Activity"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Medium",
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 110,
  },
  headerArea: {
    paddingTop: 16,
  },
  heroPreTitle: {
    color: "#0A7EA4",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
    flex: 1,
  },
  counterBadge: {
    backgroundColor: "rgba(10, 126, 164, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  counterBadgeText: {
    color: Colors.PRIMARY || "#0A7EA4",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    fontFamily: "Outfit-Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  locationHighlight: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeading: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  categoryChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  refreshText: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Outfit-Medium",
  },
  loadingBannerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  loadingBannerText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  errorContainer: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 10,
    alignItems: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Outfit-Medium",
    textAlign: "center",
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
  },
  retryBtnDisabled: {
    opacity: 0.5,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Outfit-Medium",
    marginBottom: 12,
  },
  retryMinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  retryMinText: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    fontSize: 13,
  },
  card: {
    marginVertical: 6,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  selectedCard: {
    borderColor: Colors.PRIMARY,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardName: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
  },
  footerArea: {
    paddingBottom: 20,
  },
  transportContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  transportCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  selectedTransport: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  transportText: {
    fontSize: 14,
    fontFamily: "Outfit-Medium",
  },
  selectedTransportText: {
    color: "#FFFFFF",
    fontFamily: "Outfit-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderTopWidth: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.BUTTON_DISABLED || "#CCCCCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});
