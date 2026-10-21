import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { getDestinationImage } from "../../Components/constants/Destinations";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

const POPULAR_DESTINATIONS = [
  {
    name: "Tokyo",
    query: "Tokyo, Japan",
    emoji: "🗼",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Dubai",
    query: "Dubai, United Arab Emirates",
    emoji: "🏜️",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Bali",
    query: "Bali, Indonesia",
    emoji: "🏖️",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Rome",
    query: "Rome, Italy",
    emoji: "🏛️",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Istanbul",
    query: "Istanbul, Turkey",
    emoji: "🕌",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "Paris",
    query: "Paris, France",
    emoji: "🗼",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=240&auto=format&fit=crop",
  },
  {
    name: "London",
    query: "London, United Kingdom",
    emoji: "🇬🇧",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=240&auto=format&fit=crop",
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
  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
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

  const handleUseCurrentLocation = () => {
    triggerHaptic();
    const myLoc = "My Current Location";
    setFromQuery(myLoc);
    setTripData((prev) => ({
      ...prev,
      fromLocation: { name: myLoc },
    }));
  };

  const goNext = () => {
    triggerHaptic();
    if (!toQuery.trim()) {
      alert("Please select your destination to continue.");
      return;
    }

    // Auto-fill from location if left empty
    if (!fromQuery.trim()) {
      setTripData((prev) => ({
        ...prev,
        fromLocation: { name: "Current Location" },
      }));
    }

    router.push("/create-trip/select-traveler");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header & Back Button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
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
        <StepProgressBar currentStep={1} totalSteps={6} stepTitle="Select Route" />

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
              <Ionicons name="radio-button-on" size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.subtext }]}>DEPARTURE CITY</Text>
              <TextInput
                placeholder="Where are you starting from?"
                placeholderTextColor={theme.subtext}
                value={fromQuery}
                onFocus={() => setActiveField("from")}
                onChangeText={(text) => searchPlace(text, "from")}
                style={[styles.textInput, { color: theme.text }]}
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
            <TouchableOpacity
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
              <Ionicons name="location" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.subtext }]}>DESTINATION</Text>
              <TextInput
                placeholder="Where to? (e.g. Dubai, Tokyo, Rome)"
                placeholderTextColor={theme.subtext}
                value={toQuery}
                onFocus={() => setActiveField("to")}
                onChangeText={(text) => searchPlace(text, "to")}
                style={[styles.textInput, { color: theme.text }]}
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
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
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
    color: "#0A7EA4",
    fontSize: 11,
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
    shadowColor: "#000",
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
    fontSize: 10,
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
    color: "#10B981",
    fontSize: 11,
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
    backgroundColor: "#CBD5E1",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  continueText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});