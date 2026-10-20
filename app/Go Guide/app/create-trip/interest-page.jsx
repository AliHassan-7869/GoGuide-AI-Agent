import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../Components/constants/constants";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { INTEREST_PROMPT, DEFAULT_INTERESTS, DEFAULT_TRANSPORTS } from "../../Components/constants/Option";
import { model, generationConfig } from "../../Configs/AiModel";
import { CreateTripContext } from "../../context/CreateTripContext";

// No static defaults - everything is fetched in real-time
const InterestCard = ({ item, index, isSelected, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => onPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.cardDescription}>{item.description}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function YourInterest() {
  const router = useRouter();

  const { tripData, setTripData } = useContext(CreateTripContext);

  const [placesList, setPlacesList] = useState([]);
  const [transportList, setTransportList] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const retryTimerRef = useRef(null);
  const nextAllowedRequestAtRef = useRef(0);

  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || "en";
  const lang = deviceLocale.split("-")[0]?.toLowerCase() || "en";

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

  const categoryFromTags = (tags = {}) => {
    if (tags.natural === "peak") return { category: "Nature", emoji: "⛰️" };
    if (tags.natural === "water" || tags.water) return { category: "Nature", emoji: "🌊" };
    if (tags.tourism === "museum") return { category: "Museum", emoji: "🏛️" };
    if (tags.tourism === "viewpoint") return { category: "Viewpoint", emoji: "👀" };
    if (tags.tourism === "attraction") return { category: "Attraction", emoji: "📍" };
    if (tags.historic) return { category: "History", emoji: "🏰" };
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
    const rail = { id: "train", name: `🚆 ${t("train")}` };

    let transports = base;
    if (hasRail) transports = [rail, ...transports.filter((t) => t.id !== "train")];
    if (isMountain) {
      transports = [
        ...mountainExtras,
        ...transports.filter((t) => !mountainExtras.some((m) => m.id === t.id)),
      ];
    }
    return transports.slice(0, 5);
  };

  const fetchOverpassInterests = async ({ lat, lng }) => {
    const radius = 15000;
    const query = `
      [out:json][timeout:25];
      (
        nwr(around:${radius},${lat},${lng})[tourism~"^(attraction|museum|viewpoint)$"];
        nwr(around:${radius},${lat},${lng})[historic];
        nwr(around:${radius},${lat},${lng})[natural~"^(peak|water)$"];
        nwr(around:${radius},${lat},${lng})[leisure=park];
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
          category === "Viewpoint"
            ? "Great spot for panoramic photos"
            : category === "Food"
              ? "Try a local favorite nearby"
              : category === "Nature"
                ? "Scenic place worth exploring"
                : category === "History"
                  ? "A local landmark with character"
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
      .slice(0, 15)
      .map(({ _distKm, ...rest }) => rest);

    const transports = makeTransportList({ isMountain: peakCount >= 3, hasRail });
    return { interests, transports };
  };

  useEffect(() => {
    console.log("Trip Data Updated:", tripData);
    if (tripData?.toLocation?.name) {
      GetDynamicInterests();
    } else {
      console.log("Waiting for location data...");
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
      console.log("[DEBUG] Fetching interests for:", locationName);
      
      if (!locationName) {
        console.warn("[DEBUG] No location name found in tripData");
        setLoadingInterests(false);
        return;
      }

      // Prefer OpenStreetMap/Overpass so this works without Gemini quota/billing.
      const lat = parseCoord(tripData?.toLocation?.coordinates?.lat);
      const lng = parseCoord(tripData?.toLocation?.coordinates?.lng);
      if (lat != null && lng != null) {
        const osm = await fetchOverpassInterests({ lat, lng });
        if (osm?.interests?.length) setPlacesList(osm.interests);
        if (osm?.transports?.length) setTransportList(osm.transports);
        if (!osm?.interests?.length && !osm?.transports?.length) {
          throw new Error("No data found from Overpass");
        }
        setErrorMessage(null);
        return;
      }

      // If we don't have coordinates, fall back to Gemini prompt (may be quota-limited).
      const FINAL_PROMPT = INTEREST_PROMPT.replace("{{location}}", locationName);
      console.log("[DEBUG] FULL PROMPT:", FINAL_PROMPT);

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: FINAL_PROMPT }] }],
        generationConfig,
      });

      const response = await result.response.text();
      console.log("[DEBUG] RAW AI RESPONSE:", response);

      let cleanResponse = response.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      console.log("[DEBUG] CLEANED RESPONSE:", cleanResponse);
      const parsedResponse = JSON.parse(cleanResponse);
      console.log("[DEBUG] PARSED RESPONSE:", parsedResponse);

      if (parsedResponse && typeof parsedResponse === "object") {
        let itemsFound = false;
        if (
          parsedResponse.interests &&
          Array.isArray(parsedResponse.interests) &&
          parsedResponse.interests.length > 0
        ) {
          setPlacesList(parsedResponse.interests);
          itemsFound = true;
        }

        if (
          parsedResponse.transports &&
          Array.isArray(parsedResponse.transports) &&
          parsedResponse.transports.length > 0
        ) {
          setTransportList(parsedResponse.transports);
          itemsFound = true;
        }

        if (!itemsFound) throw new Error("No data found in AI response");
      }
    } catch (error) {
      console.error("[DEBUG] CRITICAL ERROR IN GetDynamicInterests:", error);

      const msg = String(error?.message || "");
      const isQuota =
        msg.includes("[429") ||
        /quota exceeded/i.test(msg) ||
        /rate limit/i.test(msg);
      const retrySec = extractRetrySeconds(error);
      if (retrySec > 0) {
        nextAllowedRequestAtRef.current = Date.now() + retrySec * 1000;
        startRetryCountdown(retrySec);
      }

      // If Gemini is blocked (quota), try OpenStreetMap now (if coordinates exist).
      if (isQuota) {
        try {
          const lat = parseCoord(tripData?.toLocation?.coordinates?.lat);
          const lng = parseCoord(tripData?.toLocation?.coordinates?.lng);
          if (lat != null && lng != null) {
            const osm = await fetchOverpassInterests({ lat, lng });
            if (osm?.interests?.length) setPlacesList(osm.interests);
            if (osm?.transports?.length) setTransportList(osm.transports);
            setErrorMessage("Loaded interests from OpenStreetMap (Gemini quota exceeded)");
            return;
          }
        } catch (e) {
          console.warn("[DEBUG] Overpass fallback failed:", e);
        }
      }
      
      // FALLBACK MECHANISM: Use defaults if AI fails
      if (placesList.length === 0) {
        console.log("[DEBUG] Applying Fallback Interests");
        setPlacesList(DEFAULT_INTERESTS);
      }
      if (transportList.length === 0) {
        console.log("[DEBUG] Applying Fallback Transports");
        setTransportList(DEFAULT_TRANSPORTS);
      }
      
      if (isQuota) {
        setErrorMessage(
          retrySec > 0
            ? `Gemini quota exceeded. Retry in ${retrySec}s (showing defaults)`
            : "Gemini quota exceeded (showing defaults)"
        );
      } else {
        setErrorMessage("Using default options (AI connection issue)");
      }
    } finally {
      setLoadingInterests(false);
    }
  };

  const togglePlace = (id) => {
    if (selectedPlaces.includes(id)) {
      setSelectedPlaces(selectedPlaces.filter((p) => p !== id));
    } else {
      setSelectedPlaces([...selectedPlaces, id]);
    }
  };

  const handleContinue = () => {
    if (selectedPlaces.length > 0 && selectedTransport) {
      const selectedInterestItems = placesList.filter((p) =>
        selectedPlaces.includes(p.id)
      );
      const selectedTransportItem =
        transportList.find((t) => t.id === selectedTransport) || null;

      setTripData((prev) => ({
        ...prev,
        interests: selectedPlaces,
        transport: selectedTransport,
        interestsDetails: selectedInterestItems,
        transportDetails: selectedTransportItem,
      }));
      router.push("/create-trip/select-dates");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <StepProgressBar currentStep={3} totalSteps={6} stepTitle="Select Interests" />
        <Text style={styles.title}>Your Interests</Text>
        <Text style={styles.subtitle}>
          Discover the perfect spots in{" "}
          <Text style={styles.locationHighlight}>
            {tripData?.toLocation?.name?.split(",")[0] || "your destination"}
          </Text>
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Activities</Text>
          {!loadingInterests && (
            <TouchableOpacity onPress={GetDynamicInterests} activeOpacity={0.7}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingInterests ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={styles.loadingText}>
              Curating local experiences...
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ AI Error: {errorMessage}</Text>
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
        ) : (
          <FlatList
            data={placesList}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No activities found for this route.
                </Text>
                <TouchableOpacity
                  onPress={GetDynamicInterests}
                  style={styles.retryMinBtn}
                >
                  <Text style={styles.retryMinText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
            renderItem={({ item, index }) => (
              <InterestCard
                item={item}
                index={index}
                isSelected={selectedPlaces.includes(item.id)}
                onPress={togglePlace}
              />
            )}
          />
        )}

        <Text style={styles.sectionTitle}>Best Way to Travel</Text>

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
                  selectedTransport === item.id && styles.selectedTransport,
                ]}
                onPress={() => setSelectedTransport(item.id)}
              >
                <Text
                  style={[
                    styles.transportText,
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

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.button,
            !(selectedPlaces.length > 0 && selectedTransport) &&
            styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!(selectedPlaces.length > 0 && selectedTransport)}
        >
          <Text style={styles.buttonText}>Confirm & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.WHITE,
  },
  title: {
    fontSize: 34,
    fontFamily: "Outfit-Bold",
    color: Colors.TEXT_LIGHT,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    marginTop: 8,
    fontFamily: "Outfit-Medium",
    color: Colors.TEXT_GRAY,
    lineHeight: 24,
  },
  locationHighlight: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    marginVertical: 10,
    fontFamily: "Outfit-Bold",
    color: Colors.TEXT_LIGHT,
  },
  refreshText: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontFamily: "Outfit-Medium",
    color: Colors.TEXT_GRAY,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Outfit-Medium',
    color: Colors.TEXT_GRAY,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryMinBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  retryMinText: {
    color: Colors.PRIMARY,
    fontFamily: 'Outfit-Bold',
  },
  card: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.WHITE,
    borderWidth: 1.5,
    borderColor: Colors.LIGHT_GRAY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  selectedCard: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.BACKGROUND_LIGHT,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardName: {
    fontSize: 19,
    fontFamily: "Outfit-Bold",
    color: Colors.TEXT_LIGHT,
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: "rgba(10, 126, 164, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 15,
    fontFamily: "Outfit-Regular",
    color: Colors.TEXT_GRAY,
    lineHeight: 22,
  },
  transportContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    marginTop: 5,
    marginBottom: 30,
  },
  transportCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.LIGHT_GRAY,
    backgroundColor: Colors.WHITE,
  },
  selectedTransport: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  transportText: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    color: Colors.TEXT_LIGHT,
  },
  selectedTransportText: {
    color: Colors.WHITE,
    fontFamily: "Outfit-Bold",
  },
  footer: {
    paddingHorizontal: 25,
    paddingBottom: 40,
    paddingTop: 10,
    backgroundColor: Colors.WHITE,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.BUTTON_DISABLED,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: Colors.WHITE,
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 24,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  errorText: {
    fontFamily: 'Outfit-Medium',
    color: Colors.ERROR,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 15,
  },
  retryBtnDisabled: {
    opacity: 0.6,
  },
  retryText: {
    color: Colors.WHITE,
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
});
