import { Stack, useRouter } from "expo-router";
import { Alert, Animated, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../Components/constants/constants";
import { Typography, useTheme, Palette } from "../../Components/constants/theme";
import PlanIcon from "../images/svg";

import { useContext, useEffect, useState, useRef, useMemo } from "react";

import { CreateTripContext } from "../../context/CreateTripContext";
import { auth } from "../../Configs/FirebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";


import { buildFlightItinerary } from "../../Components/utils/FlightEngine";
import { hasCuratedPlan } from "../../Components/utils/CuratedPlans";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { TouchableOpacity } from "../../Components/ui/Touchable";
import { goBack } from "../../Components/utils/navigation";

const CURATED_CITIES_HINT = "Tokyo, Dubai, Paris, Istanbul, London and Lahore";

// Visual progress only (the server does not report stages): four calm steps, advancing on a timer.
const GENERATION_STEPS = [
  { text: "Analyzing preferences", icon: "options-outline" },
  { text: "Selecting stays", icon: "business-outline" },
  { text: "Mapping routes", icon: "map-outline" },
  { text: "Finalizing schedule", icon: "calendar-outline" },
];
const STEP_INTERVAL_MS = 2600;

export default function GenerateTrip() {
  const { tripData, setTripData, preferences, userData } = useContext(CreateTripContext);
  const theme = useTheme();
  const isDark = theme.isDark;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const router = useRouter();
  const hasGenerated = useRef(false);
  const cancelledRef = useRef(false);
  const reduceMotion = useReduceMotion();

  // Animations
  const floatAnim = useMemo(() => new Animated.Value(0), []);
  const radarScale = useMemo(() => new Animated.Value(0.85), []);
  const radarOpacity = useMemo(() => new Animated.Value(0.65), []);
  const progressAnim = useMemo(() => new Animated.Value(0), []);
  const stepFade = useMemo(() => new Animated.Value(1), []);

  // Light fade-in whenever the progress step changes
  useEffect(() => {
    stepFade.setValue(0.2);
    Animated.timing(stepFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [currentStepIndex, stepFade]);

  useEffect(() => {
    if (reduceMotion) {
      progressAnim.setValue(0.6);
      return undefined;
    }
    // Hover floating loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 6, duration: 1200, useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    // Radar pulse expansion loop
    const radarLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(radarOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    radarLoop.start();

    // Smooth progress bar fill
    Animated.timing(progressAnim, { toValue: 1, duration: STEP_INTERVAL_MS * GENERATION_STEPS.length, useNativeDriver: false }).start();

    return () => {
      floatLoop.stop();
      radarLoop.stop();
    };
  }, [reduceMotion, floatAnim, radarScale, radarOpacity, progressAnim]);

  // Step cycler: restarts from the first step every time (re)generation begins; stops on error.
  useEffect(() => {
    if (!loading) return undefined;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading]);

  const handleCancel = () => {
    cancelledRef.current = true;
    setLoading(false);
    goBack(router);
  };

  const handleSaveAndProceed = async (plan) => {
    if (cancelledRef.current) return;
    const cleanOrigin =
      tripData?.fromLocation?.name?.split(",")[0]?.trim() ||
      plan?.origin ||
      preferences?.originCountry ||
      "Home Airport";
    const cleanDest =
      plan?.destination ||
      tripData?.toLocation?.name?.split(",")[0]?.trim() ||
      "Trip Destination";
    const startObj = tripData?.startDate ? new Date(tripData.startDate) : new Date();
    const numDays =
      plan?.itinerary?.length ||
      tripData?.totalNoOfDays ||
      Math.max(1, Math.ceil(Math.abs((tripData?.endDate ? new Date(tripData.endDate) : startObj) - startObj) / (1000 * 60 * 60 * 24)) + 1) ||
      3;
    const endObj = tripData?.endDate
      ? new Date(tripData.endDate)
      : new Date(startObj.getTime() + Math.max(1, numDays - 1) * 24 * 60 * 60 * 1000);
    const fmtDate = (d) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const departureDateStr = fmtDate(startObj);
    const returnDateStr = fmtDate(endObj);
    const budgetTier = plan?.budget || tripData?.budget || "Moderate";
    const enrichedPlan = {
      ...plan,
      origin: cleanOrigin,
      departureDate: departureDateStr,
      returnDate: returnDateStr,
      flights: buildFlightItinerary({
        origin: cleanOrigin,
        destination: cleanDest,
        startDate: startObj,
        endDate: endObj,
        days: numDays,
        budget: budgetTier,
        existingFlights: plan?.flights,
      }),
    };

    const completeTripData = {
      ...tripData,
      aiTripPlan: enrichedPlan,
      createdAt: new Date().toISOString(),
    };

    setTripData(completeTripData);

    const user = auth.currentUser;
    const email = user?.email || userData?.email || "traveler@goguide.com";
    const createdTripId = "trip_" + Date.now();

    // Tarika A: Store as active draft preview ONLY (do not auto-save to My Trips or My Bookings)
    try {
      const draftTripRecord = {
        id: createdTripId,
        userEmail: email,
        tripData: completeTripData,
        ...completeTripData,
        isDraft: true,
        createdAt: new Date().toISOString(),
      };
      // Cache as active current trip so /trip can display it immediately
      await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(draftTripRecord));
      await AsyncStorage.setItem("@goguide_active_draft", JSON.stringify(draftTripRecord));
    } catch (localErr) {
      console.warn("Could not cache draft trip:", localErr);
    }

    setLoading(false);
    // Navigate directly to the primary, beautiful My Trips tab that the user loves!
    router.replace({ pathname: "/(tabs)/mytrip", params: { view: "plan" } });
  };

  const GenerateAiTrip = async (forceInstant = Boolean(tripData?.useInstant)) => {
    cancelledRef.current = false;
    setCurrentStepIndex(0);
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

      // Email verification bypassed for immediate trip generation

      const { generateTripWithAgent, generateDeepTripPlan } = require("../../Configs/AiModel");

      const { robustParseJson, normalizeTrip } = require("../../Components/utils/TripNormalizer");
      const { buildCuratedPlan } = require("../../Components/utils/CuratedPlans");
      const destinationName = tripData?.toLocation?.name || "";
      const budgetName = tripData?.budget || "Moderate";
      const wantsCustomPlan = Boolean(interestNames || categoriesStr);
      let plan = null;
      let apiError = null;
      let usedOfflineFallback = false;

      // 1. Instant path: verified itinerary bundled in the app. No network, no AI, no waiting.
      //    Only when the user did not ask for specific interests/themes (those need the AI).
      if (forceInstant === true || (!tripData?.isDeepPlan && !wantsCustomPlan)) {
        const curated = buildCuratedPlan(destinationName, totalDays, budgetName);
        if (curated) plan = normalizeTrip(curated);
      }

      try {
        let result = null;
        if (plan) {
          result = null;
        } else if (tripData?.isDeepPlan) {
          result = await generateDeepTripPlan(
            {
              destination: tripData?.toLocation?.name || "",
              days: totalDays,
              budget: tripData?.budget || "Moderate",
              interests: interestNames || undefined,
              categories: categoriesStr,
            },
            (progress) => {
              const stepIdx = Math.min(
                GENERATION_STEPS.length - 1,
                Math.floor((progress / 100) * GENERATION_STEPS.length)
              );
              setCurrentStepIndex(stepIdx);
            }
          );
        } else {
          result = await generateTripWithAgent({
            destination: tripData?.toLocation?.name || "",
            days: totalDays,
            budget: tripData?.budget || "Moderate",
            interests: interestNames || undefined,
            categories: categoriesStr,
          });
        }

        if (result && typeof result.response?.text === "function") {
          const responseText = await result.response.text();
          const parsedData = robustParseJson(responseText);
          if (parsedData) {
            plan = normalizeTrip(parsedData) || parsedData.trip || parsedData;
          }
        }
      } catch (apiErr) {
        apiError = apiErr;
        console.warn("[GenerateTrip] Backend AI call note:", apiErr?.message);
      }

      // 2. AI failed: fall back to the verified bundled itinerary if this city has one.
      //    This is real, checked data (never invented) and the user is told what they got.
      if (!plan || !plan.itinerary || !Array.isArray(plan.itinerary) || plan.itinerary.length === 0) {
        const curated = buildCuratedPlan(destinationName, totalDays, budgetName);
        if (curated) {
          plan = normalizeTrip(curated);
          usedOfflineFallback = true;
        }
      }

      // 3. Nothing real available: tell the user and let them retry. Never invent a plan.
      if (!plan || !plan.itinerary || !Array.isArray(plan.itinerary) || plan.itinerary.length === 0) {
        throw apiError || new Error("We couldn't build your plan right now. Please try again.");
      }

      if (usedOfflineFallback) {
        const note = wantsCustomPlan
          ? "Live AI is unavailable, so we're showing our verified highlights for this city. Your chosen interests were not included."
          : "Live AI is unavailable, so we're showing our verified highlights for this city.";
        try {
          if (Platform.OS === "web") {
            if (typeof window !== "undefined" && window.alert) window.alert(note);
          } else {
            Alert.alert("Verified highlights", note);
          }
        } catch {}
      }

      await handleSaveAndProceed(plan);
    } catch (err) {
      if (cancelledRef.current) return;
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
          ? "AI is experiencing high demand right now. Please wait a minute and try again."
          : err.message?.includes("reach GoGuide server")
          ? "Could not reach GoGuide server. Please check your internet connection and try again."
          : err.message || "Something went wrong while generating your trip.",
      });
    }
  };

  useEffect(() => {
    if (tripData && !hasGenerated.current) {
      hasGenerated.current = true;
      GenerateAiTrip();
    }
  }, [tripData]);

  const canUseInstant = hasCuratedPlan(tripData?.toLocation?.name);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Top Engine Pill */}
        <View style={styles.engineBadge}>
          <Ionicons name="sparkles" size={13} color={Colors.PRIMARY} />
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

        {/* Stepped progress (visual only) */}
        <View
          style={styles.stepList}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${Math.min(currentStepIndex + 1, GENERATION_STEPS.length)} of ${GENERATION_STEPS.length}: ${GENERATION_STEPS[currentStepIndex]?.text}`}
        >
          {GENERATION_STEPS.map((step, i) => {
            const done = !error && i < currentStepIndex;
            const active = !error && i === currentStepIndex;
            return (
              <Animated.View key={step.text} style={[styles.stepRow, active && { opacity: stepFade }]}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: done || active ? Colors.PRIMARY : "transparent",
                      borderColor: done || active ? Colors.PRIMARY : theme.border,
                    },
                  ]}
                >
                  <Ionicons name={done ? "checkmark" : step.icon} size={14} color={done || active ? Palette.white : theme.subtext} />
                </View>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.stepLabel, { color: done || active ? theme.text : theme.subtext, fontFamily: active ? "Outfit-Bold" : "Outfit-Medium" }]}
                >
                  {step.text}
                  {active ? "…" : ""}
                </Text>
                {done ? <Text style={styles.stepDoneText} accessibilityLabel="done">Done</Text> : null}
              </Animated.View>
            );
          })}
        </View>

        {/* Animated Progress Bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? "#2C2C3A" : Palette.slate200 }]}>
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
            Structuring your morning-to-night itinerary with verified stays and local routes.
          </Text>
        </View>

        {!error && (
          <TouchableOpacity
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel trip generation"
            style={[styles.cancelBtn, { borderColor: theme.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: theme.subtext }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Polished Error & Fallback Card */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "#2A1818" : "#FEF2F2", borderColor: isDark ? "#4C2424" : "#FECACA" }]}>
            <View style={styles.errorHeaderRow}>
              <Ionicons name="alert-circle-outline" size={20} color={Palette.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorTitle}>Server Notice</Text>
            </View>
            <Text style={[styles.errorMessage, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
              {error.message}
            </Text>

            {!error.isAuthError && !canUseInstant && (
              <Text style={[styles.errorMessage, { color: isDark ? "#FCA5A5" : "#991B1B", marginTop: 6 }]}>
                Instant plans (no AI needed) are available for {CURATED_CITIES_HINT}.
              </Text>
            )}

            <View style={styles.errorButtonsRow}>
              {error.isEmailUnverified ? (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: Colors.PRIMARY }]}
                  onPress={async () => {
                    try {
                      const { sendEmailVerification } = require("firebase/auth");
                      if (auth.currentUser) {
                        await sendEmailVerification(auth.currentUser);
                        alert("Verification email sent! Please check your inbox.");
                      }
                    } catch (e) {
                      alert(e.message || "Failed to send link");
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={16} color={Palette.white} style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Resend Link</Text>
                </TouchableOpacity>
              ) : error.isAuthError ? (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: Colors.PRIMARY }]}
                  onPress={() => router.push("/auth/sign-in")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={16} color={Palette.white} style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Sign In</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryBtn} onPress={() => GenerateAiTrip(false)} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={15} color={Palette.white} style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Retry AI</Text>
                </TouchableOpacity>
              )}

              {!error.isAuthError && canUseInstant && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => GenerateAiTrip(true)} activeOpacity={0.8}>
                  <Ionicons name="flash-outline" size={15} color={Palette.white} style={{ marginRight: 4 }} />
                  <Text style={styles.retryText}>Instant Plan</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.offlineBtn} onPress={() => goBack(router)} activeOpacity={0.8}>
                <Ionicons name="arrow-back-outline" size={15} color={Colors.PRIMARY} style={{ marginRight: 4 }} />
                <Text style={styles.offlineText}>Go Back</Text>
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
    shadowColor: Palette.black,
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
    fontSize: Typography.sizeSm,
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
  stepList: {
    width: "100%",
    gap: 10,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
    gap: 10,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
  },
  stepDoneText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    color: Palette.success,
  },
  cancelBtn: {
    minHeight: 44,
    minWidth: 120,
    marginTop: 14,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
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
    color: Palette.danger,
  },
  errorMessage: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    marginBottom: 14,
  },
  errorButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: Palette.white,
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  offlineBtn: {
    flex: 1,
    minWidth: 120,
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