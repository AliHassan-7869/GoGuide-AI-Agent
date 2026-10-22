import { Stack, useRouter } from "expo-router";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import PlanIcon from "../images/svg";

import { useContext, useEffect, useState, useRef } from "react";
import { AI_PROMPT } from "../../Components/constants/Option";
import { CreateTripContext } from "../../context/CreateTripContext";
import { auth, db } from "../../Configs/FirebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const GENERATION_STEPS = [
  { text: "Scanning flights & local logistics...", icon: "airplane-outline" },
  { text: "Finding top boutique stays & hotels...", icon: "business-outline" },
  { text: "Designing day-by-day sightseeing plan...", icon: "calendar-outline" },
  { text: "Curating authentic dining & cafes...", icon: "restaurant-outline" },
  { text: "Polishing your personalized master plan...", icon: "sparkles-outline" },
];

export default function GenerateTrip() {
  const { tripData, setTripData, preferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const isDark = preferences?.darkMode;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const router = useRouter();
  const hasGenerated = useRef(false);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const radarScale = useRef(new Animated.Value(0.85)).current;
  const radarOpacity = useRef(new Animated.Value(0.65)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hover floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Radar pulse expansion loop
    Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, {
          toValue: 1.8,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(radarOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Smooth progress bar fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 8500,
      useNativeDriver: false,
    }).start();

    // Step cycler
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 1900);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tripData && !hasGenerated.current) {
      hasGenerated.current = true;
      GenerateAiTrip();
    }
  }, [tripData]);

  // Fallback realistic itinerary generator if server is offline
  const buildOfflinePlan = (destination, days, budget, interests) => {
    const destName = destination ? destination.split(",")[0].trim() : "Vacation Destination";
    const numDays = Math.min(30, Math.max(1, parseInt(days, 10) || 3));

    const sampleActivities = [
      {
        time: "09:30 AM",
        placeName: `${destName} Historic Landmark & Old Town`,
        details: "Stroll through historic cobblestone streets, iconic architecture, and vibrant city squares.",
        tickets: "Free",
      },
      {
        time: "01:00 PM",
        placeName: "Traditional Bistro & Local Dining",
        details: "Enjoy authentic regional specialties, freshly baked treats, and local refreshments.",
        tickets: "$15 - $25",
      },
      {
        time: "03:30 PM",
        placeName: `${destName} Cultural Museum & Arts Pavilion`,
        details: "Explore world-renowned exhibitions, classical sculptures, and regional heritage galleries.",
        tickets: "$12 - $18",
      },
      {
        time: "07:30 PM",
        placeName: "Scenic Sunset Promenade & Evening Stroll",
        details: "Golden hour viewpoint followed by relaxed dinner and ambient nighttime atmosphere.",
        tickets: "Free",
      },
    ];

    const itinerary = [];
    for (let i = 1; i <= numDays; i++) {
      itinerary.push({
        day: i,
        theme: i === 1 ? "Arrival & Signature Highlights" : i === 2 ? "Cultural Heritage & Fine Dining" : "Scenic Panoramas & Local Gems",
        activities: sampleActivities.map((act, idx) => ({
          ...act,
          placeName: idx === 0 ? `${destName} Discovery Spot ${i}` : act.placeName,
        })),
      });
    }

    return {
      destination: destName,
      duration: `${numDays} Days`,
      budget: budget || "Moderate",
      traveler: tripData?.traveler?.title || "Explorer",
      weatherBrief: "Pleasant seasonal temperatures with clear to partly cloudy skies. Great conditions for walking.",
      flights: { details: `Standard scheduled flight to ${destName} International Airport`, price: "$320 - $550" },
      hotels: [
        { name: `Grand ${destName} Boutique Hotel`, address: `Central District, ${destName}`, price: "$85/night", rating: "4.8" },
        { name: `${destName} Heritage Suites`, address: `Old Quarter, ${destName}`, price: "$125/night", rating: "4.9" },
      ],
      itinerary,
      packingList: [
        { item: "Valid Passport & Travel Documents", category: "Documents" },
        { item: "Comfortable Walking Shoes", category: "Clothing" },
        { item: "Universal Power Adapter", category: "Electronics" },
        { item: "Light Weather Jacket", category: "Clothing" },
      ],
    };
  };

  const handleSaveAndProceed = async (plan) => {
    const completeTripData = {
      ...tripData,
      aiTripPlan: plan,
      createdAt: new Date().toISOString(),
    };

    setTripData(completeTripData);

    const user = auth.currentUser;
    const email = user?.email || userData?.email || "traveler@goguide.com";

    // 1. Save to local persistent trips list (always instant and reliable)
    try {
      const storedTripsRaw = await AsyncStorage.getItem("@goguide_user_trips");
      const existingTrips = storedTripsRaw ? JSON.parse(storedTripsRaw) : [];
      const newTripRecord = {
        id: "trip_" + Date.now(),
        userEmail: email,
        tripData: completeTripData,
        ...completeTripData,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newTripRecord, ...existingTrips.filter(t => t.id !== newTripRecord.id)];
      await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updatedList));
      await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(completeTripData));
    } catch (localErr) {
      console.warn("Could not save to local storage:", localErr);
    }

    // 2. Save to Firebase UserTrips
    if (email) {
      try {
        await addDoc(collection(db, "UserTrips"), {
          userEmail: email,
          tripData: completeTripData,
          createdAt: new Date().toISOString(),
        });
      } catch (fbErr) {
        console.warn("Could not save to Firebase:", fbErr);
      }
    }

    setLoading(false);
    router.push("/(tabs)/mytrip");
  };

  const GenerateAiTrip = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate Days
      const start = new Date(tripData?.startDate);
      const end = new Date(tripData?.endDate);
      const diffTime = Math.abs(end - start);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 3;

      const interestNames = Array.isArray(tripData?.interestsDetails) && tripData.interestsDetails.length > 0
        ? tripData.interestsDetails.map((x) => x?.name).filter(Boolean).join(", ")
        : Array.isArray(tripData?.interests) ? tripData.interests.join(", ") : "";

      const categoriesStr = Array.isArray(tripData?.selectedCategories) && tripData.selectedCategories.length > 0
        ? tripData.selectedCategories.join(", ")
        : undefined;

      const { generateTripWithAgent } = require("../../Configs/AiModel");

      const result = await generateTripWithAgent({
        destination: tripData?.toLocation?.name || "",
        days: totalDays,
        budget: tripData?.budget || "Moderate",
        interests: interestNames || undefined,
        categories: categoriesStr,
      });

      const responseText = await result.response.text();
      let cleanResponse = responseText.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const data = JSON.parse(cleanResponse);
      const plan = data.trip || data;

      await handleSaveAndProceed(plan);
    } catch (err) {
      setLoading(false);
      console.error("[GenerateTrip] Error:", err.message);

      const isAuthError = err.message?.toLowerCase().includes("sign in");
      const isQuota = err.message?.includes("429") || err.message?.toLowerCase().includes("quota");
      setError({
        isAuthError,
        isQuota,
        message: isAuthError
          ? "Please sign in to your GoGuide account to generate AI itineraries."
          : isQuota
          ? "AI model is currently experiencing high demand. Please try again or generate an instant plan."
          : err.message?.includes("reach GoGuide server")
          ? "Could not reach GoGuide backend server. Please make sure the API is running or continue with an offline plan."
          : err.message || "Something went wrong while generating your trip.",
      });
    }
  };

  const handleUseOfflinePlan = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {}

    const start = new Date(tripData?.startDate);
    const end = new Date(tripData?.endDate);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 3;

    const offlinePlan = buildOfflinePlan(
      tripData?.toLocation?.name,
      totalDays,
      tripData?.budget,
      tripData?.interests
    );

    handleSaveAndProceed(offlinePlan);
  };

  const currentStep = GENERATION_STEPS[currentStepIndex];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Top Engine Pill */}
        <View style={styles.engineBadge}>
          <MaterialCommunityIcons name="creation" size={14} color={Colors.PRIMARY} />
          <Text style={styles.engineBadgeText}>AI TRAVEL ARCHITECT</Text>
        </View>

        {/* Animated Radar Pulse & Hovering Icon */}
        <View style={styles.radarWrapper}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: radarScale }],
                opacity: radarOpacity,
              },
            ]}
          />
          <Animated.View style={[styles.svgContainer, { transform: [{ translateY: floatAnim }] }]}>
            <PlanIcon width={95} height={95} />
          </Animated.View>
        </View>

        {/* Destination Header */}
        <Text style={[styles.title, { color: theme.text }]}>Crafting Your Journey</Text>
        
        <View style={styles.destinationRow}>
          <Ionicons name="location-sharp" size={16} color={Colors.PRIMARY} style={{ marginRight: 4 }} />
          <Text style={[styles.subtitle, { color: theme.subtext }]} numberOfLines={1}>
            {tripData?.toLocation?.name || "Your Destination"}
          </Text>
        </View>

        {/* Dynamic Animated Status Step Pill */}
        <View style={[styles.stepBox, { backgroundColor: isDark ? "#242432" : "#F0F9FF", borderColor: isDark ? "#38384C" : "#BAE6FD" }]}>
          <Ionicons
            name={currentStep.icon}
            size={16}
            color={Colors.PRIMARY}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.stepText, { color: Colors.PRIMARY }]}>{currentStep.text}</Text>
        </View>

        {/* Animated Progress Bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? "#2C2C3A" : "#E2E8F0" }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["15%", "96%"],
                }),
              },
            ]}
          />
        </View>

        {/* Tip / Live Processing Box */}
        <View style={[styles.tipBox, { backgroundColor: isDark ? "rgba(10, 126, 164, 0.08)" : "rgba(10, 126, 164, 0.05)", borderColor: isDark ? "rgba(10, 126, 164, 0.2)" : "rgba(10, 126, 164, 0.12)" }]}>
          <Ionicons name="sparkles" size={14} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
          <Text style={[styles.tip, { color: theme.subtext }]}>
            Gemini AI is structuring your morning-to-night itinerary, verified stays, and local routes.
          </Text>
        </View>

        {/* Polished Error & Fallback Card */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "#2A1818" : "#FEF2F2", borderColor: isDark ? "#4C2424" : "#FECACA" }]}>
            <View style={styles.errorHeaderRow}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorTitle}>Server Notice</Text>
            </View>
            <Text style={[styles.errorMessage, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
              {error.message}
            </Text>

            <View style={styles.errorButtonsRow}>
              {error.isAuthError ? (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: Colors.PRIMARY }]}
                  onPress={() => router.push("/auth/sign-in")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Sign In</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryBtn} onPress={GenerateAiTrip} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Retry AI</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.offlineBtn} onPress={handleUseOfflinePlan} activeOpacity={0.8}>
                <Ionicons name="flash-outline" size={15} color={Colors.PRIMARY} style={{ marginRight: 4 }} />
                <Text style={styles.offlineText}>Instant Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 26,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  engineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 126, 164, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 20,
  },
  engineBadgeText: {
    color: Colors.PRIMARY,
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginLeft: 5,
  },
  radarWrapper: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 18,
  },
  radarRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(10, 126, 164, 0.08)",
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    textAlign: "center",
  },
  stepBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
  },
  stepText: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.PRIMARY,
    borderRadius: 3,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  tip: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 18,
    flex: 1,
  },

  // Polished Error Card
  errorCard: {
    marginTop: 20,
    width: "100%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  errorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: "#EF4444",
  },
  errorMessage: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    marginBottom: 14,
  },
  errorButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  offlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.PRIMARY,
    paddingVertical: 10,
    borderRadius: 12,
  },
  offlineText: {
    color: Colors.PRIMARY,
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
});