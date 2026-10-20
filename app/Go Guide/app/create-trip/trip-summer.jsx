import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";

const { width, height } = Dimensions.get("window");

export default function TripSummer() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const destination = tripData?.toLocation?.name || "Tokyo, Japan";
  const image =
    tripData?.toLocationImage ||
    "https://images.unsplash.com/photo-1502602898657-3e907fa0a586?q=80&w=1000&auto=format&fit=crop";
  const rating = tripData?.toLocationRating || "4.9";
  const activeAccent = Colors.PRIMARY || "#0F172A";

  const destCity = destination.split(",")[0].trim();

  // Curated recommendations & highlights per destination
  const getHighlights = (cityName) => {
    const lower = cityName.toLowerCase();
    if (lower.includes("tokyo") || lower.includes("japan")) {
      return [
        { icon: "sparkles", title: "Electric Districts", desc: "Neon lights of Shinjuku & tech culture in Akihabara" },
        { icon: "restaurant", title: "Authentic Dining", desc: "Michelin ramen spots, street yakitori & fresh sushi" },
        { icon: "compass", title: "Historic Shrines", desc: "Tranquil Senso-ji temple & Meiji Jingu gardens" },
      ];
    }
    if (lower.includes("bali") || lower.includes("indonesia")) {
      return [
        { icon: "water", title: "Tropical Beaches", desc: "Sunset surf in Uluwatu & crystal waters in Seminyak" },
        { icon: "leaf", title: "Terraced Fields", desc: "Lush Tegallalang rice paddies & holistic Ubud retreats" },
        { icon: "compass", title: "Sacred Temples", desc: "Iconic ocean cliffside temples of Tanah Lot" },
      ];
    }
    if (lower.includes("dubai") || lower.includes("uae")) {
      return [
        { icon: "business", title: "Futuristic Skyline", desc: "Burj Khalifa observatory & Museum of the Future" },
        { icon: "sunny", title: "Desert Safari", desc: "Golden dune bashing, camel rides & bedouin camps" },
        { icon: "cart", title: "Luxury Retail", desc: "World-class Dubai Mall & traditional spice souks" },
      ];
    }
    if (lower.includes("paris") || lower.includes("france")) {
      return [
        { icon: "star", title: "Iconic Landmarks", desc: "Eiffel Tower summit, Louvre Museum & Notre-Dame" },
        { icon: "cafe", title: "Boutique Cafes", desc: "Authentic flaky croissants & sidewalk Parisian bistros" },
        { icon: "walk", title: "Chic Boulevards", desc: "Strolling through Montmartre & Champs-Élysées" },
      ];
    }
    return [
      { icon: "star", title: "Top Rated Spots", desc: "Highly popular sights loved by global travelers" },
      { icon: "restaurant", title: "Local Gastronomy", desc: "Hand-picked authentic dining & hidden eateries" },
      { icon: "camera", title: "Scenic Viewpoints", desc: "Panoramic photo opportunities and cultural gems" },
    ];
  };

  const highlights = getHighlights(destCity);

  const handleStartPlanning = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTripData((prev) => ({
      ...prev,
      locationInfo: {
        name: destination,
        photoRef: image,
      },
    }));
    router.push("/create-trip/select-traveler");
  };

  const handleInstantAIPlan = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTripData((prev) => ({
      ...prev,
      locationInfo: {
        name: destination,
        photoRef: image,
      },
      totalDays: 3,
      budget: "Moderate",
      traveler: { title: "Solo / Couple", people: "1 to 2" },
      interests: ["Sightseeing", "Local Food", "Culture"],
    }));
    router.push("/create-trip/review-trip");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.imageOverlay}>
            <Text style={styles.destName}>{destCity}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{rating} • AI Curated Destination</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentCard, { backgroundColor: theme.bg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            About {destCity}
          </Text>
          <Text style={[styles.description, { color: theme.subtext }]}>
            Experience the culture, history, and beauty of {destCity}. Our GoGuide AI agent optimizes your route so you discover both celebrated icons and secret local spots without wasting travel time.
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Highlights */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Trip Highlights
          </Text>
          {highlights.map((item, index) => (
            <View key={index} style={styles.highlightItem}>
              <View style={[styles.iconBox, { backgroundColor: theme.isDark ? "#222232" : "#F1F5F9" }]}>
                <Ionicons name={item.icon} size={20} color={activeAccent} />
              </View>
              <View style={styles.highlightText}>
                <Text style={[styles.highlightTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.highlightDesc, { color: theme.subtext }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer for Floating Footer */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Floating Action Bar */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
      >
        {/* Instant AI Generation Button */}
        <TouchableOpacity
          style={[styles.instantBtn, { backgroundColor: activeAccent }]}
          activeOpacity={0.85}
          onPress={handleInstantAIPlan}
        >
          <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.instantBtnText}>✨ Generate 3-Day Plan</Text>
        </TouchableOpacity>

        {/* Custom Wizard Button */}
        <TouchableOpacity
          style={[styles.customBtn, { borderColor: theme.border }]}
          activeOpacity={0.75}
          onPress={handleStartPlanning}
        >
          <Text style={[styles.customBtnText, { color: theme.text }]}>
            Customize Dates & Budget
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.subtext} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: width,
    height: height * 0.44,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingBottom: 35,
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 36,
    left: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  destName: {
    color: "#FFF",
    fontSize: 34,
    fontFamily: "Outfit-Bold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-Medium",
    marginLeft: 6,
  },
  contentCard: {
    marginTop: -22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Outfit-Bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  highlightText: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  highlightDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 17,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    gap: 8,
  },
  instantBtn: {
    paddingVertical: 14,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  instantBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  customBtn: {
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  customBtnText: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
});
