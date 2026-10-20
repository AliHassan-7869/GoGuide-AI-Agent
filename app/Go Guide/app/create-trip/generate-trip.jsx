import { Stack, useRouter } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

export default function GenerateTrip() {
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const hasGenerated = useRef(false);

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
          // addDoc gives a unique id, so two users saving at the same moment never collide
          await addDoc(collection(db, "UserTrips"), {
            userEmail: user.email,
            tripData: completeTripData,
            createdAt: new Date().toISOString()
          });
          console.log("Trip saved to Firebase!");
        } catch (firebaseError) {
          console.warn("⚠️ Could not save trip to Firebase:", firebaseError.message);
          console.warn("Trip was generated successfully but not saved. Update your Firestore security rules to fix this.");
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.title}>Please Wait...</Text>

      <Text style={styles.subtitle}>
        Generating your personalized trip ✈️
      </Text>

      <View style={styles.svgContainer}>
        <PlanIcon width={width * 0.5} height={height * 0.25} />
      </View>

      <Text style={styles.tip}>
        Your trip is being prepared. Sit tight and get ready for adventure!
      </Text>

      {loading && (
        <Text style={{ marginTop: 20, color: Colors.GRAY, fontFamily: 'Outfit-Medium' }}>
          AI is planning your trip...
        </Text>
      )}

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
    paddingHorizontal: width * 0.05,
  },
  title: {
    fontSize: responsiveFont(28),
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: responsiveFont(16),
    fontFamily: "Outfit-Medium",
    color: Colors.GRAY,
    marginBottom: 40,
  },
  svgContainer: {
    marginBottom: 40,
  },
  tip: {
    fontSize: responsiveFont(14),
    fontFamily: "Outfit-Medium",
    color: Colors.DARK_GRAY,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: 30,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
  },
  errorText: {
    fontSize: responsiveFont(14),
    fontFamily: "Outfit-Medium",
    color: '#FF4B4B',
    textAlign: 'center',
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
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
});