import { Stack, useRouter } from "expo-router";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../Components/constants/constants";
import PlanIcon from "../images/svg";

import { useContext, useEffect, useState, useRef } from "react";
import { AI_PROMPT } from "../../Components/constants/Option";
import { chatSession } from "../../Configs/AiModel";
import { CreateTripContext } from "../../context/CreateTripContext";
import { auth, db } from "../../Configs/FirebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const responsiveFont = (size) => (size * width) / 390;

const GENERATION_STEPS = [
  { text: "Scanning flights & logistics...", icon: "airplane-outline" },
  { text: "Finding top boutique stays & hotels...", icon: "business-outline" },
  { text: "Designing day-by-day sightseeing plan...", icon: "calendar-outline" },
  { text: "Curating hidden local food spots...", icon: "restaurant-outline" },
  { text: "Polishing your personalized master plan...", icon: "sparkles-outline" },
];

export default function GenerateTrip() {
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const router = useRouter();
  const hasGenerated = useRef(false);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const radarScale = useRef(new Animated.Value(0.8)).current;
  const radarOpacity = useRef(new Animated.Value(0.7)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hover floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 10,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Radar pulse expansion loop
    Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, {
          toValue: 2.1,
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
      duration: 8000,
      useNativeDriver: false,
    }).start();

    // Step cycler
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tripData && !hasGenerated.current) {
      hasGenerated.current = true;
      GenerateAiTrip();
    }
  }, [tripData]);

  const GenerateAiTrip = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("[DEBUG] Starting Trip Generation via Custom API");

      // Calculate Days and Nights
      const start = new Date(tripData?.startDate);
      const end = new Date(tripData?.endDate);
      const diffTime = Math.abs(end - start);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const totalNight = totalDays > 1 ? totalDays - 1 : 1;

      const interestNames = Array.isArray(tripData?.interestsDetails) && tripData.interestsDetails.length > 0
        ? tripData.interestsDetails.map((x) => x?.name).filter(Boolean).join(", ")
        : Array.isArray(tripData?.interests) ? tripData.interests.join(", ") : "";

      const transportName = tripData?.transportDetails?.name || tripData?.transport || "Local Transport";

      let FINAL_PROMPT = AI_PROMPT
        .replace("{{fromLocation}}", tripData?.fromLocation?.name || "")
        .replace("{{toLocation}}", tripData?.toLocation?.name || "")
        .replace("{{totalDays}}", totalDays)
        .replace("{{totalNight}}", totalNight)
        .replace("{{traveler}}", tripData?.traveler?.title || "Solo")
        .replace("{{budget}}", tripData?.budget || "Moderate");

      if (interestNames) {
        FINAL_PROMPT += `\nInclude these specific activities in the plan: ${interestNames}.`;
      }
      if (transportName) {
        FINAL_PROMPT += `\nPrioritize this mode of transport where possible: ${transportName}.`;
      }

      console.log("[DEBUG] FINAL PROMPT:", FINAL_PROMPT);

      const { generateTripWithAgent } = require("../../Configs/AiModel");
      const result = await generateTripWithAgent({
        destination: tripData?.toLocation?.name || "",
        days: totalDays,
        budget: tripData?.budget || "Moderate"
      });
      const responseText = await result.response.text();
      console.log("[DEBUG] RAW AI RESPONSE:", responseText);

      let cleanResponse = responseText.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const data = JSON.parse(cleanResponse);
      console.log("[DEBUG] API Response Data:", data);

      // Save the generated trip plan in context and to Firebase
      const completeTripData = {
        ...tripData,
        aiTripPlan: data.trip || data,
      };
      
      setTripData(completeTripData);

      // Save to local storage for offline / flight mode access
      try {
        await AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(completeTripData));
        console.log("[CACHE] Trip saved to local AsyncStorage for offline access!");
      } catch (cacheErr) {
        console.warn("Could not cache trip to local storage:", cacheErr);
      }

      // Save to Firebase (non-blocking — don't let Firestore errors stop navigation)
      const user = auth.currentUser;
      if (user) {
        try {
          await addDoc(collection(db, "UserTrips"), {
            userEmail: user.email,
            tripData: completeTripData,
            createdAt: new Date().toISOString()
          });
          console.log("Trip saved to Firebase!");
        } catch (firebaseError) {
          console.warn("⚠️ Could not save trip to Firebase:", firebaseError.message);
        }
      }

      setLoading(false);
      router.push("/mytrip");
    } catch (error) {
      setLoading(false);
      console.error("[DEBUG] Trip generation error:", error.message);
      const isQuota = error.message?.includes('429') || error.message?.toLowerCase().includes('quota');
      setError(isQuota 
        ? "AI is very busy (Quota Limit). Please wait a minute and retry." 
        : `Error: ${error.message || "Something went wrong while planning your trip."}`);
    }
  };

  const currentStep = GENERATION_STEPS[currentStepIndex];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

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
          <PlanIcon width={width * 0.45} height={height * 0.22} />
        </Animated.View>
      </View>

      <Text style={styles.title}>Crafting Your Journey</Text>
      <Text style={styles.subtitle}>
        {tripData?.toLocation?.name || "Your Destination"}
      </Text>

      {/* Dynamic Animated Status Step Pill */}
      <View style={styles.stepBox}>
        <Ionicons
          name={currentStep.icon}
          size={18}
          color={Colors.PRIMARY}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.stepText}>{currentStep.text}</Text>
      </View>

      {/* Animated Progress Bar */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["15%", "95%"],
              }),
            },
          ]}
        />
      </View>

      <Text style={styles.tip}>
        Gemini AI is analyzing itineraries, live hotel ratings, and local routes.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={GenerateAiTrip}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.WHITE,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: width * 0.06,
    paddingVertical: 40,
  },
  radarWrapper: {
    width: width * 0.55,
    height: width * 0.55,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 20,
  },
  radarRing: {
    position: "absolute",
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: (width * 0.42) / 2,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(10, 126, 164, 0.08)",
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: responsiveFont(24),
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: responsiveFont(16),
    fontFamily: "Outfit-Medium",
    color: Colors.GRAY,
    marginBottom: 25,
    textAlign: "center",
  },
  stepBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 126, 164, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  stepText: {
    fontSize: responsiveFont(13),
    fontFamily: "Outfit-Medium",
    color: Colors.PRIMARY,
  },
  progressBarTrack: {
    width: "85%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.PRIMARY,
    borderRadius: 3,
  },
  tip: {
    fontSize: responsiveFont(13),
    fontFamily: "Outfit-Regular",
    color: Colors.DARK_GRAY,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  errorContainer: {
    marginTop: 30,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF5F5",
    borderRadius: 20,
  },
  errorText: {
    fontSize: responsiveFont(14),
    fontFamily: "Outfit-Medium",
    color: "#FF4B4B",
    textAlign: "center",
    marginBottom: 15,
  },
  retryBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: Colors.WHITE,
    fontFamily: "Outfit-Bold",
    fontSize: 16,
  },
});