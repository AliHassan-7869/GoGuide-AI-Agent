import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useRef, useState } from "react";
import { Alert, FlatList, Image, Platform, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { getDestinationImage } from "../../Components/constants/Destinations";
import { useTheme, Palette } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

import { TouchableOpacity } from "../../Components/ui/Touchable";
import { goBack } from "../../Components/utils/navigation";
const POPULAR_DESTINATIONS = [
  {
    name: "Tokyo",
    query: "Tokyo, Japan",
    emoji: "🗼",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    name: "Dubai",
    query: "Dubai, United Arab Emirates",
    emoji: "🏜️",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 25.2048, lng: 55.2708 },
  },
  {
    name: "Bali",
    query: "Bali, Indonesia",
    emoji: "🏖️",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: -8.4095, lng: 115.1889 },
  },
  {
    name: "Rome",
    query: "Rome, Italy",
    emoji: "🏛️",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 41.9028, lng: 12.4964 },
  },
  {
    name: "Istanbul",
    query: "Istanbul, Turkey",
    emoji: "🕌",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 41.0082, lng: 28.9784 },
  },
  {
    name: "Paris",
    query: "Paris, France",
    emoji: "🗼",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  {
    name: "London",
    query: "London, United Kingdom",
    emoji: "🇬🇧",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=240&auto=format&fit=crop",
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
];

export default function SearchPlace() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [fromQuery, setFromQuery] = useState(tripData?.fromLocation?.name || "");
  const [toQuery, setToQuery] = useState(tripData?.toLocation?.name || "");
  const [results, setResults] = useState([]);
  const [activeField, setActiveField] = useState("to");

  const timeoutRef = useRef(null);
  const activeAccent = Colors.PRIMARY || Palette.brand;

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const searchPlace = (text, type) => {
    if (type === "from") {
      setFromQuery(text);
      setActiveField("from");
    } else {
      setToQuery(text);
      setActiveField("to");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&addressdetails=1&accept-language=en&limit=6`,
          {
            headers: {
              "User-Agent": "GoGuideApp/2.0",
            },
          }
        );
        const data = await response.json();
        setResults(data || []);
      } catch (error) {
        console.log("Search error:", error);
      }
    }, 450);
  };

  const selectPlace = (item) => {
    triggerHaptic();
    const place = {
      name: item.display_name,
      coordinates: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
    };

    if (activeField === "from") {
      setFromQuery(item.display_name);
      setTripData((prev) => ({
        ...prev,
        fromLocation: place,
      }));
    } else {
      setToQuery(item.display_name);
      const destinationImage = getDestinationImage(item.display_name);
      setTripData((prev) => ({
        ...prev,
        toLocation: place,
        toLocationImage: destinationImage,
      }));
    }

    setResults([]);
  };

  const handleQuickDestination = (dest) => {
    triggerHaptic();
    setToQuery(dest.query);
    const destinationImage = dest.image || getDestinationImage(dest.query);
    setTripData((prev) => ({
      ...prev,
      toLocation: {
        name: dest.query,
        coordinates: dest.coordinates || null,
      },
      toLocationImage: destinationImage,
    }));
  };

  const handleSwapRoute = () => {
    triggerHaptic();
    const tempQuery = fromQuery;
    setFromQuery(toQuery);
    setToQuery(tempQuery);

    setTripData((prev) => ({
      ...prev,
      fromLocation: prev?.toLocation || null,
      toLocation: prev?.fromLocation || null,
      toLocationImage: prev?.fromLocation?.name
        ? getDestinationImage(prev.fromLocation.name)
        : prev?.toLocationImage,
    }));
  };

  const handleUseCurrentLocation = async () => {
    triggerHaptic();
    setFromQuery("Detecting location...");
    let reason = "error";
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        reason = "denied";
      } else {
        // Fresh fix only: no getLastKnownPositionAsync, no cached coordinates.
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = pos?.coords || {};
        const valid =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          !(latitude === 0 && longitude === 0);
        if (valid) {
          let locName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`,
              { headers: { "User-Agent": "GoGuideApp/2.0" } }
            );
            const data = await res.json();
            const city = data?.address?.city || data?.address?.town || data?.address?.state;
            const country = data?.address?.country;
            if (city || country) locName = [city, country].filter(Boolean).join(", ");
          } catch {
            // Reverse-geocode failed; the numeric label keeps the exact fix.
          }
          setFromQuery(locName);
          setTripData((prev) => ({
            ...prev,
            fromLocation: { name: locName, coordinates: { lat: latitude, lng: longitude } },
          }));
          return;
        }
      }
    } catch {
      reason = "error";
    }

    // No GPS fix: clear the field and tell the user. Never invent coordinates.
    setFromQuery("");
    setTripData((prev) => ({ ...prev, fromLocation: { name: "", coordinates: null } }));
    const msg =
      reason === "denied"
        ? "Location permission was denied. Enable it in Settings or type your departure city."
        : "Couldn't get your location. Please type your departure city.";
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(msg);
    else Alert.alert("Location unavailable", msg);
  };

  const goNext = () => {
    triggerHaptic();
    const cleanTo = toQuery.trim();
    if (!cleanTo) {
      alert("Please select your destination to continue.");
      return;
    }

    const cleanFrom = fromQuery.trim() || "Pakistan (Current Location)";
    const destinationImage =
      tripData?.toLocationImage || getDestinationImage(cleanTo);

    // Fallback coordinates resolver for top destinations if user typed directly
    const matchedDest = POPULAR_DESTINATIONS.find(
      (d) =>
        d.query.toLowerCase() === cleanTo.toLowerCase() ||
        d.name.toLowerCase() === cleanTo.toLowerCase() ||
        cleanTo.toLowerCase().includes(d.name.toLowerCase())
    );

    setTripData((prev) => ({
      ...prev,
      fromLocation:
        prev?.fromLocation?.name === cleanFrom
          ? prev.fromLocation
          : { name: cleanFrom, coordinates: null },
      toLocation:
        prev?.toLocation?.name === cleanTo && prev?.toLocation?.coordinates
          ? prev.toLocation
          : {
              name: cleanTo,
              coordinates: prev?.toLocation?.coordinates || matchedDest?.coordinates || null,
            },
      locationInfo: {
        ...(prev?.locationInfo || {}),
        name: cleanTo,
      },
      toLocationImage: destinationImage,
    }));

    router.push("/create-trip/interest-page");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header & Back Button */}
      <View style={styles.headerRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => {
            triggerHaptic();
            goBack(router);
          }}
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Plan Your Route</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <StepProgressBar currentStep={1} totalSteps={5} stepTitle="Select Route" />

        <Text style={styles.heroPreTitle}>EXPLORE NEW HORIZONS</Text>
        <Text style={[styles.mainHeading, { color: theme.text }]}>Where does your journey begin?</Text>
        <Text style={[styles.subHeading, { color: theme.subtext }]}>
          Enter your starting hub and dream destination.
        </Text>

        {/* CONNECTED ROUTE INPUT CARD */}
        <View
          style={[
            styles.routeCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* FROM INPUT ROW */}
          <View style={styles.inputRow}>
            <View style={[styles.pinCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Ionicons name="radio-button-on" size={16} color={Palette.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.subtext }]}>DEPARTURE CITY</Text>
              <TextInput
                placeholder="Starting from?"
                placeholderTextColor={theme.isDark ? Palette.slate500 : Palette.slate400}
                value={fromQuery}
                onFocus={() => setActiveField("from")}
                onChangeText={(text) => searchPlace(text, "from")}
                selectionColor={activeAccent}
                style={[styles.textInput, { color: theme.isDark ? Palette.white : Palette.slate900 }]}
              />
            </View>
            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              style={styles.gpsBadge}
              activeOpacity={0.7}
              accessibilityLabel="Use Current Location"
            >
              <Text style={styles.gpsBadgeText}>GPS 🎯</Text>
            </TouchableOpacity>
          </View>

          {/* CONNECTOR LINE & SWAP BUTTON */}
          <View style={styles.connectorRow}>
            <View style={[styles.verticalDashedLine, { backgroundColor: theme.border }]} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Swap locations"
              onPress={handleSwapRoute}
              style={[
                styles.swapBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-vertical" size={16} color={activeAccent} />
            </TouchableOpacity>
          </View>

          {/* TO INPUT ROW */}
          <View style={styles.inputRow}>
            <View style={[styles.pinCircle, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <Ionicons name="location" size={18} color={Palette.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.subtext }]}>DESTINATION</Text>
              <TextInput
                placeholder="Where to? (e.g. Dubai)"
                placeholderTextColor={theme.isDark ? Palette.slate500 : Palette.slate400}
                value={toQuery}
                onFocus={() => setActiveField("to")}
                onChangeText={(text) => searchPlace(text, "to")}
                selectionColor={activeAccent}
                style={[styles.textInput, { color: theme.isDark ? Palette.white : Palette.slate900 }]}
              />
            </View>
          </View>
        </View>

        {/* SEARCH SUGGESTIONS LIST */}
        {results.length > 0 && (
          <View
            style={[
              styles.resultsBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <FlatList
              data={results}
              keyExtractor={(item) => item.place_id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectPlace(item)}
                  style={[styles.resultItem, { borderBottomColor: theme.border }]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={activeAccent}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.resultText, { color: theme.text }]} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* COMPACT WORD-SIZED TRENDING DESTINATIONS CHIPS WITH IMAGES */}
        <Text style={[styles.quickSectionTitle, { color: theme.subtext }]}>
          ✨ Trending Destinations
        </Text>
        <View style={styles.chipRow}>
          {POPULAR_DESTINATIONS.map((dest) => {
            const isSelected = toQuery.includes(dest.query.split(",")[0]);
            return (
              <TouchableOpacity
                key={dest.name}
                onPress={() => handleQuickDestination(dest)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: isSelected
                      ? theme.isDark
                        ? "rgba(10, 126, 164, 0.2)"
                        : "rgba(10, 126, 164, 0.12)"
                      : theme.card,
                    borderColor: isSelected ? activeAccent : theme.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: dest.image }}
                  style={styles.chipThumb}
                  resizeMode="cover"
                />
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: isSelected ? activeAccent : theme.text,
                      fontFamily: isSelected ? "Outfit-Bold" : "Outfit-Medium",
                    },
                  ]}
                >
                  {dest.name} {dest.emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM CONTINUE BUTTON */}
      <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={goNext}
          style={[styles.continueBtn, { backgroundColor: activeAccent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue to Travelers</Text>
          <Ionicons name="arrow-forward" size={18} color={Palette.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  heroPreTitle: {
    color: Palette.brand,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  mainHeading: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginBottom: 20,
  },
  routeCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    paddingVertical: 4,
  },
  gpsBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gpsBadgeText: {
    color: Palette.success,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 17,
    marginVertical: 4,
  },
  verticalDashedLine: {
    width: 2,
    height: 28,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  resultsBox: {
    maxHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    flex: 1,
  },
  quickSectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    marginBottom: 20,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
  },
  chipThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.slate300,
  },
  quickChipText: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  continueText: {
    color: Palette.white,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});