import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { INTEREST_PROMPT, DEFAULT_INTERESTS, DEFAULT_TRANSPORTS } from "../../Components/constants/Option";
import { model, generationConfig } from "../../Configs/AiModel";
import { CreateTripContext } from "../../context/CreateTripContext";

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
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

export default function YourInterest() {
  const router = useRouter();
  const theme = useTheme();

  const { tripData, setTripData } = useContext(CreateTripContext);

  const [placesList, setPlacesList] = useState([]);
  const [transportList, setTransportList] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
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
    const radius = 25000;
    const query = `
      [out:json][timeout:25];
      (
        nwr(around:${radius},${lat},${lng})[tourism~"^(attraction|museum|viewpoint)$"];
        nwr(around:${radius},${lat},${lng})[historic];
        nwr(around:${radius},${lat},${lng})[natural~"^(peak|water|beach)$"];
        nwr(around:${radius},${lat},${lng})[leisure~"^(park|beach_resort)$"];
        nwr(around:${radius},${lat},${lng})[amenity~"^(cafe|restaurant|marketplace)$"];
        nwr(around:${radius},${lat},${lng})[railway=station];
      );
      out center 120;
    `.trim();

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass error ${res.status}`);
    const data = await res.json();
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
    if (tripData?.toLocation?.name) {
      GetDynamicInterests();
    }
  }, [tripData?.toLocation?.name]);

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

      // Try OpenStreetMap / Overpass first
      const lat = parseCoord(tripData?.toLocation?.coordinates?.lat);
      const lng = parseCoord(tripData?.toLocation?.coordinates?.lng);
      if (lat != null && lng != null) {
        try {
          const osm = await fetchOverpassInterests({ lat, lng });
          if (osm?.interests?.length) setPlacesList(osm.interests);
          if (osm?.transports?.length) setTransportList(osm.transports);
          if (osm?.interests?.length || osm?.transports?.length) {
            setLoadingInterests(false);
            return;
          }
        } catch (osmErr) {
          console.log("[DEBUG] Overpass notice, falling back to AI:", osmErr.message);
        }
      }

      // Fallback: Gemini prompt
      const FINAL_PROMPT = INTEREST_PROMPT.replace("{{location}}", locationName);
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: FINAL_PROMPT }] }],
        generationConfig,
      });

      const response = await result.response.text();
      let cleanResponse = response.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      if (cleanResponse) {
        const parsedResponse = JSON.parse(cleanResponse);
        if (Array.isArray(parsedResponse.interests) && parsedResponse.interests.length > 0) {
          setPlacesList(parsedResponse.interests);
        } else {
          setPlacesList(DEFAULT_INTERESTS);
        }
        if (Array.isArray(parsedResponse.transports) && parsedResponse.transports.length > 0) {
          setTransportList(parsedResponse.transports);
        } else {
          setTransportList(DEFAULT_TRANSPORTS);
        }
      } else {
        setPlacesList(DEFAULT_INTERESTS);
        setTransportList(DEFAULT_TRANSPORTS);
      }
    } catch (error) {
      console.error("[DEBUG] Error fetching interests:", error);
      const msg = String(error?.message || "");
      const isQuota = msg.includes("[429") || /quota exceeded/i.test(msg) || /rate limit/i.test(msg);
      const retrySec = extractRetrySeconds(error);
      if (retrySec > 0) {
        nextAllowedRequestAtRef.current = Date.now() + retrySec * 1000;
        startRetryCountdown(retrySec);
      }

      // If all fails, provide curated defaults
      setPlacesList(DEFAULT_INTERESTS);
      setTransportList(DEFAULT_TRANSPORTS);
    } finally {
      setLoadingInterests(false);
    }
  };

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
    if (selectedPlaces.length > 0 && selectedTransport) {
      const selectedInterestItems = placesList.filter((p) =>
        selectedPlaces.includes(p.id)
      );
      const selectedTransportItem =
        transportList.find((t) => t.id === selectedTransport) || null;

      const chosenCategories = Array.from(
        new Set(selectedInterestItems.map((i) => i.category).filter(Boolean))
      );

      setTripData((prev) => ({
        ...prev,
        interests: selectedPlaces,
        transport: selectedTransport,
        interestsDetails: selectedInterestItems,
        transportDetails: selectedTransportItem,
        selectedCategories: chosenCategories,
      }));
      router.push("/create-trip/select-dates");
    }
  };

  const destinationName = tripData?.toLocation?.name?.split(",")[0] || "your destination";

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

            {loadingInterests && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.PRIMARY} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>
                  Curating local highlights for {destinationName}...
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
              {loadingInterests ? (
                <ActivityIndicator size="small" color={Colors.PRIMARY} />
              ) : (
                transportList.map((item) => (
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
                ))
              )}
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
            !(selectedPlaces.length > 0 && selectedTransport) && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!(selectedPlaces.length > 0 && selectedTransport)}
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
