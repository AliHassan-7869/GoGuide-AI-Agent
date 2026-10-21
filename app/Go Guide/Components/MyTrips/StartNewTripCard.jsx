import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/constants";
import { useTheme } from "../constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";

const QUICK_RECOMMENDATIONS = [
  {
    id: "rec_tokyo",
    label: "🗼 Tokyo • 4 Days",
    destination: "Tokyo, Japan",
    days: 4,
    budget: "Moderate",
    coordinates: { lat: 35.6764, lng: 139.65 },
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_bali",
    label: "🏖️ Bali • 5 Days",
    destination: "Bali, Indonesia",
    days: 5,
    budget: "Economical",
    coordinates: { lat: -8.4095, lng: 115.1889 },
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_dubai",
    label: "🏜️ Dubai • 3 Days",
    destination: "Dubai, United Arab Emirates",
    days: 3,
    budget: "Luxury",
    coordinates: { lat: 25.2048, lng: 55.2708 },
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "rec_rome",
    label: "🏛️ Rome • 3 Days",
    destination: "Rome, Italy",
    days: 3,
    budget: "Moderate",
    coordinates: { lat: 41.9028, lng: 12.4964 },
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function StartNewTripCard() {
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);

  const activeAccent = Colors.PRIMARY || "#0F172A";
  const badgeBg = theme.isDark ? "#222232" : "#F1F5F9";

  const handleSelectRecommendation = (item) => {
    setTripData({
      locationInfo: {
        name: item.destination,
        coordinates: item.coordinates,
        photoRef: item.image,
      },
      totalDays: item.days,
      budget: item.budget,
      traveler: { title: "Solo / Couple", people: "1 to 2" },
      interests: ["Sightseeing", "Local Food", "Culture"],
    });
    router.push("/create-trip/review-trip");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: badgeBg }]}>
        <Ionicons name="airplane-outline" size={44} color={activeAccent} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        No Adventures Yet
      </Text>

      <Text style={[styles.subtitle, { color: theme.subtext }]}>
        Your dream getaway is just a tap away. Plan manually or pick a trending AI itinerary below.
      </Text>

      {/* Primary Action Button */}
      <TouchableOpacity
        onPress={() => router.push("/create-trip/search-place")}
        style={[styles.button, { backgroundColor: activeAccent }]}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Plan My First Trip</Text>
        <Ionicons name="rocket-outline" size={18} color="#FFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {/* Quick Recommendations Section */}
      <View style={styles.recommendationWrap}>
        <View style={styles.dividerRow}>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          <Text style={[styles.orText, { color: theme.subtext }]}>OR START WITH AI</Text>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.chipsContainer}>
          {QUICK_RECOMMENDATIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.chipButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleSelectRecommendation(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: theme.text }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.subtext} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: "center",
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    width: "100%",
    maxWidth: 280,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  recommendationWrap: {
    width: "100%",
    marginTop: 28,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
});
