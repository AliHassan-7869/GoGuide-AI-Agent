import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from "react-native";

import { Colors } from "../../Components/constants/constants";
import { getDestinationImage } from "../../Components/constants/Destinations";
import { useTheme, Palette, Radius, Spacing, Typography } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import ScreenHeader from "../../Components/ui/ScreenHeader";
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
  const { tripData, setTripData, entitlements } = useContext(CreateTripContext);

  const [fromQuery, setFromQuery] = useState(tripData?.fromLocation?.name || "");
  const [toQuery, setToQuery] = useState(tripData?.toLocation?.name || "");
  const [extraCities, setExtraCities] = useState(
    Array.isArray(tripData?.destinations) ? tripData.destinations.slice(1) : []
  );
  const [extraCityInput, setExtraCityInput] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [results, setResults] = useState([]);
  const [activeField, setActiveField] = useState("to");

  const hasProScope = Boolean(entitlements?.is_pro_active || (entitlements?.pack_credits || 0) > 0);
  const maxCities = hasProScope ? 6 : 2;
  const totalSelectedCities = (toQuery.trim() ? 1 : 0) + extraCities.length;

  const timeoutRef = useRef(null);
  const searchAbortRef = useRef(null);
  const isMountedRef = useRef(true);
  const locatingRef = useRef(false);
  const activeAccent = Colors.PRIMARY || Palette.brand;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try {
        searchAbortRef.current?.abort();
      } catch {}
    };
  }, []);

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
    } else if (type === "extra") {
      setExtraCityInput(text);
      setActiveField("extra");
    } else {
      setToQuery(text);
      setActiveField("to");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      searchAbortRef.current?.abort();
    } catch {}

    timeoutRef.current = setTimeout(async () => {
      if (text.trim().length < 3) {
        setResults([]);
        return;
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text.trim()
          )}&addressdetails=1&accept-language=en&limit=6`,
          {
            headers: {
              "User-Agent": "GoGuideApp/2.0",
            },
            signal: controller.signal,
          }
        );
        const data = await response.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error?.name !== "AbortError") {
          __DEV__ && console.log("Search error:", error);
        }
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
    } else if (activeField === "extra") {
      addExtraCity(item.display_name);
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

  const addExtraCity = (rawName) => {
    const clean = String(rawName || "").trim();
    if (clean.length < 2) return;
    if (1 + extraCities.length >= maxCities) {
      if (!hasProScope) {
        router.push({ pathname: "/paywall", params: { reason: "free_cities_limit" } });
      }
      return;
    }
    const shortName = clean.split(",")[0].trim();
    const exists =
      toQuery.trim().toLowerCase().startsWith(shortName.toLowerCase()) ||
      extraCities.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      setExtraCities((prev) => [...prev, clean]);
    }
    setExtraCityInput("");
    setAddingCity(false);
    setResults([]);
  };

  const handleOpenAddCity = () => {
    triggerHaptic();
    if (!toQuery.trim()) {
      Alert.alert("Select First City", "Please choose your first destination city before adding another stop.");
      return;
    }
    if (1 + extraCities.length >= maxCities) {
      if (!hasProScope) {
        router.push({ pathname: "/paywall", params: { reason: "free_cities_limit" } });
      } else {
        Alert.alert("City Limit", `You can include up to ${maxCities} cities per itinerary.`);
      }
      return;
    }
    setAddingCity(true);
    setActiveField("extra");
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
    if (locatingRef.current) return;
    locatingRef.current = true;
    triggerHaptic();
    setFromQuery("Detecting location...");
    let reason = "error";
    let canAskAgain = true;

    try {
      const Location = require("expo-location");
      if (typeof Location.hasServicesEnabledAsync === "function") {
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          if (enabled === false) {
            reason = "services_off";
          }
        } catch {}
      }

      if (reason !== "services_off") {
        const perm = await Location.requestForegroundPermissionsAsync();
        canAskAgain = perm?.canAskAgain !== false;
        if (perm?.status !== "granted") {
          reason = "denied";
        } else {
          let gpsTimer = null;
          let pos = null;
          try {
            // Fresh fix only: no getLastKnownPositionAsync, bounded by 12s timeout
            pos = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise((_, reject) => {
                gpsTimer = setTimeout(() => reject(new Error("GPS timeout")), 12000);
              }),
            ]);
          } finally {
            if (gpsTimer) clearTimeout(gpsTimer);
          }

          if (!isMountedRef.current) return;
          const { latitude, longitude } = pos?.coords || {};
          const valid =
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            !(latitude === 0 && longitude === 0);
          if (valid) {
            let locName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            const revController = new AbortController();
            const revTimer = setTimeout(() => revController.abort(), 5000);
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=en`,
                {
                  headers: { "User-Agent": "GoGuideApp/2.0" },
                  signal: revController.signal,
                }
              );
              const data = await res.json();
              const city = data?.address?.city || data?.address?.town || data?.address?.state;
              const country = data?.address?.country;
              if (city || country) locName = [city, country].filter(Boolean).join(", ");
            } catch {
              // Reverse-geocode failed or timed out; the numeric label keeps the exact fix.
            } finally {
              clearTimeout(revTimer);
            }
            if (!isMountedRef.current) return;
            setFromQuery(locName);
            setTripData((prev) => ({
              ...prev,
              fromLocation: { name: locName, coordinates: { lat: latitude, lng: longitude } },
            }));
            return;
          }
        }
      }
    } catch {
      reason = reason === "services_off" ? "services_off" : "error";
    } finally {
      locatingRef.current = false;
    }

    if (!isMountedRef.current) return;

    // No GPS fix: clear the field and tell the user. Never invent coordinates.
    setFromQuery("");
    setTripData((prev) => ({ ...prev, fromLocation: { name: "", coordinates: null } }));
    const msg =
      reason === "services_off"
        ? "Location services (GPS) are turned off. Enable GPS in Settings or type your departure city."
        : reason === "denied"
          ? "Location permission was denied. Enable it in Settings or type your departure city."
          : "Couldn't get your location. Please type your departure city.";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(msg);
    } else if (reason === "services_off" || (reason === "denied" && !canAskAgain)) {
      Alert.alert("Location unavailable", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings().catch(() => {}) },
      ]);
    } else {
      Alert.alert("Location unavailable", msg);
    }
  };

  const goNext = () => {
    triggerHaptic();
    const cleanTo = toQuery.trim();
    if (!cleanTo || cleanTo.length < 2) {
      Alert.alert(
        "Destination Required",
        "Please enter or select a destination city (at least 2 letters) to continue."
      );
      return;
    }

    const cleanFrom = fromQuery.trim() || "Current Location";
    const destinationImage =
      tripData?.toLocation?.name === cleanTo && tripData?.toLocationImage
        ? tripData.toLocationImage
        : getDestinationImage(cleanTo);

    // Fallback coordinates resolver for top destinations if user typed directly
    const matchedDest = POPULAR_DESTINATIONS.find(
      (d) =>
        d.query.toLowerCase() === cleanTo.toLowerCase() ||
        d.name.toLowerCase() === cleanTo.toLowerCase() ||
        cleanTo.toLowerCase().includes(d.name.toLowerCase())
    );

    const allDestinations = [cleanTo, ...extraCities.filter((c) => c && c.toLowerCase() !== cleanTo.toLowerCase())];
    const sameDest =
      String(tripData?.toLocation?.name || "").trim().toLowerCase() === cleanTo.toLowerCase();
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
              coordinates: (sameDest ? prev?.toLocation?.coordinates : null) || matchedDest?.coordinates || null,
            },
      destinations: allDestinations,
      citiesCount: allDestinations.length,
      locationInfo: {
        ...(prev?.locationInfo || {}),
        name: cleanTo,
      },
      toLocationImage: destinationImage,
    }));

    router.push("/create-trip/interest-page");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header & Back Button */}
      <ScreenHeader
        title="Plan Your Route"
        onBack={() => {
          triggerHaptic();
          goBack(router);
        }}
      />

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

          {/* MULTI-CITY STOPS */}
          {extraCities.length > 0 && (
            <View style={styles.extraStopsWrap}>
              {extraCities.map((city, idx) => (
                <View
                  key={`${city}-${idx}`}
                  style={[styles.extraStopChip, { backgroundColor: theme.badgeBg, borderColor: activeAccent }]}
                >
                  <Ionicons name="navigate-outline" size={13} color={activeAccent} />
                  <Text style={[styles.extraStopText, { color: theme.text }]} numberOfLines={1}>
                    Stop {idx + 2}: {city.split(",")[0]}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${city}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      triggerHaptic();
                      setExtraCities((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.subtext} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {addingCity ? (
            <View style={[styles.addCityInputRow, { borderTopColor: theme.border }]}>
              <TextInput
                placeholder="Add another city (e.g. Kyoto)"
                placeholderTextColor={theme.isDark ? Palette.slate500 : Palette.slate400}
                value={extraCityInput}
                autoFocus
                onFocus={() => setActiveField("extra")}
                onChangeText={(text) => searchPlace(text, "extra")}
                onSubmitEditing={() => addExtraCity(extraCityInput)}
                returnKeyType="done"
                selectionColor={activeAccent}
                style={[styles.textInput, { flex: 1, color: theme.isDark ? Palette.white : Palette.slate900 }]}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add city stop"
                onPress={() => addExtraCity(extraCityInput)}
                style={[styles.addStopConfirmBtn, { backgroundColor: activeAccent }]}
              >
                <Text style={styles.addStopConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add another city stop"
              onPress={handleOpenAddCity}
              style={[styles.addCityBtn, { borderTopColor: theme.border }]}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={18} color={activeAccent} />
              <Text style={[styles.addCityBtnText, { color: activeAccent }]}>
                Add Another City ({totalSelectedCities}/{maxCities})
              </Text>
              {!hasProScope && 1 + extraCities.length >= 2 ? (
                <View style={[styles.proMiniTag, { backgroundColor: Palette.warning }]}>
                  <Text style={styles.proMiniTagText}>PRO</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH SUGGESTIONS LIST (rendered directly inside ScrollView — no nested FlatList) */}
        {results.length > 0 && (
          <View
            style={[
              styles.resultsBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {results.map((item) => (
              <TouchableOpacity
                key={String(item.place_id)}
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
            ))}
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
          <Text style={styles.continueText}>Continue to Interests</Text>
          <Ionicons name="arrow-forward" size={18} color={Palette.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
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
  extraStopsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  extraStopChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    maxWidth: "100%",
  },
  extraStopText: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontSemiBold,
    flexShrink: 1,
  },
  addCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 44,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addCityBtnText: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontSemiBold,
  },
  proMiniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginLeft: "auto",
  },
  proMiniTagText: {
    color: Palette.white,
    fontSize: 10,
    fontFamily: Typography.fontBold,
    letterSpacing: 0.5,
  },
  addCityInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addStopConfirmBtn: {
    paddingHorizontal: Spacing.md,
    minHeight: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  addStopConfirmText: {
    color: Palette.white,
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontBold,
  },
});