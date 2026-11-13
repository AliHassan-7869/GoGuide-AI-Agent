import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import moment from "moment";
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../Configs/FirebaseConfig";


import { Colors } from "../../Components/constants/constants";
import { detectCurrencyFromLocation, detectUserHomeCurrency, convertAmount, formatCurrencyAmount, CURRENCY_RATES } from "../../Components/constants/Currency";
import { useTheme, Palette } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";
import { hasCuratedPlan } from "../../Components/utils/CuratedPlans";

import { TouchableOpacity } from "../../Components/ui/Touchable";

import { goBack } from "../../Components/utils/navigation";
export default function ReviewTrip() {
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [isDeepPlan, setIsDeepPlan] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const [weather, setWeather] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const handleBuildTrip = async () => {
    triggerHaptic();

    if (!auth?.currentUser) {
      Alert.alert(
        "Account Required",
        "Please sign in or create an account to generate, personalize, and save your AI itinerary across devices.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In / Register",
            onPress: () => router.push("/auth/sign-in"),
          },
        ]
      );
      return;
    }

    // Email verification bypassed for immediate trip generation

    if (setTripData) {
      setTripData((prev) => ({ ...prev, isDeepPlan, useInstant: false }));
    }

    setIsGenerating(true);
    setTimeout(() => {
      router.push("/create-trip/generate-trip");
    }, 400);
  };

  // Instant Plan: verified bundled itinerary, no AI server needed (works on a sleeping/failed server).
  const canUseInstant = hasCuratedPlan(tripData?.toLocation?.name);
  const handleInstantPlan = () => {
    triggerHaptic();
    if (setTripData) {
      setTripData((prev) => ({ ...prev, isDeepPlan: false, useInstant: true }));
    }
    setIsGenerating(true);
    setTimeout(() => {
      router.push("/create-trip/generate-trip");
    }, 200);
  };

  const formatDate = (date) => {
    if (!date) return "Not Selected";
    return moment(date).format("DD MMM YYYY");
  };

  const originCity =
    tripData?.fromLocation?.name?.split(",")[0] || "Origin Hub";
  const destCity =
    tripData?.toLocation?.name?.split(",")[0] || "Destination";
  const travelerTitle =
    tripData?.traveler?.title || "Solo Explorer";
  const budgetTier =
    tripData?.budget || "Moderate";
  const durationDays =
    tripData?.totalNoOfDays || 5;

  // Currency Calculations
  const destLocationStr =
    tripData?.toLocation?.name ||
    tripData?.locationInfo?.name ||
    tripData?.destination ||
    "";
  const destCurrency =
    tripData?.destinationCurrency || detectCurrencyFromLocation(destLocationStr);
  const homeCurrency =
    tripData?.homeCurrency ||
    detectUserHomeCurrency(tripData?.fromLocation?.name || "");

  let formattedDestTotal = "";
  let formattedHomeTotal = "";

  if (tripData?.isCustomBudget && tripData?.customBudgetAmount) {
    const customAmtHome = Number(tripData.customBudgetAmount);
    formattedHomeTotal = formatCurrencyAmount(customAmtHome, homeCurrency);
    // Convert to dest currency
    const rateHome = CURRENCY_RATES[homeCurrency]?.rate || 278;
    const rateDest = CURRENCY_RATES[destCurrency]?.rate || 1;
    const customAmtDest = rateHome > 0 ? (customAmtHome / rateHome) * rateDest : customAmtHome;
    formattedDestTotal = formatCurrencyAmount(customAmtDest, destCurrency);
  } else {
    const dailyBaseUSD = budgetTier.toLowerCase().includes("econ")
      ? 75
      : budgetTier.toLowerCase().includes("lux")
      ? 450
      : 200;
    const totalUSD = dailyBaseUSD * Number(durationDays || 5);
    formattedDestTotal = formatCurrencyAmount(convertAmount(totalUSD, destCurrency), destCurrency);
    formattedHomeTotal = formatCurrencyAmount(convertAmount(totalUSD, homeCurrency), homeCurrency);
  }


  const interestCount =
    tripData?.interestsDetails?.length ||
    tripData?.interests?.length ||
    tripData?.selectedCategories?.length ||
    3;

  useEffect(() => {
    const fetchWeather = async () => {
      const lat = tripData?.toLocation?.coordinates?.lat;
      const lng = tripData?.toLocation?.coordinates?.lng;

      if (lat && lng) {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
          );
          const data = await res.json();
          if (data && data.current_weather) {
            setWeather(data.current_weather);
          }
        } catch (error) {
          console.log("Error fetching weather:", error);
        }
      }
    };
    fetchWeather();
  }, [tripData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Final Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StepProgressBar currentStep={5} totalSteps={5} stepTitle="Final Verification" />

        <Text style={styles.heroPreTitle}>FINAL VERIFICATION</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Your Itinerary Boarding Pass
        </Text>

        {/* ================= DIGITAL BOARDING PASS CARD ================= */}
        <View
          style={[
            styles.boardingPassCard,
            {
              backgroundColor: theme.isDark ? Palette.slate800 : Palette.white,
              borderColor: theme.isDark ? "rgba(10, 126, 164, 0.25)" : Palette.slate200,
            },
          ]}
        >
          {/* Ticket Cutout Notches */}
          <View
            style={[
              styles.ticketNotchLeft,
              { backgroundColor: theme.bg },
            ]}
          />
          <View
            style={[
              styles.ticketNotchRight,
              { backgroundColor: theme.bg },
            ]}
          />

          {/* Pass Top Header */}
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passLabel}>EXPEDITION SUMMARY</Text>
              <Text
                style={[
                  styles.passFlightCode,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
              >
                EXP-AI-2026
              </Text>
            </View>
            <View style={styles.vipTag}>
              <Text style={styles.vipTagText}>
                {tripData?.isCustomBudget ? "CUSTOM TIER" : `${budgetTier.toUpperCase()} CLASS`}
              </Text>
            </View>
          </View>

          {/* Connected Route Visualization */}
          <View style={styles.passRouteRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.editRow}>
                <Text style={styles.passCityTag}>ORIGIN</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit" onPress={() => router.push("/create-trip/search-place")}>
                  <Ionicons name="pencil" size={12} color={activeAccent} />
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.passCityValue,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
                numberOfLines={1}
              >
                {originCity}
              </Text>
            </View>

            <View
              style={[
                styles.planeIconContainer,
                { backgroundColor: theme.isDark ? Palette.slate900 : "#F1F5F9" },
              ]}
            >
              <Text style={{ fontSize: 20 }}>✈️</Text>
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <View style={styles.editRow}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit"
                  onPress={() => router.push("/create-trip/search-place")}
                  style={{ marginRight: 4 }}
                >
                  <Ionicons name="pencil" size={12} color={activeAccent} />
                </TouchableOpacity>
                <Text style={styles.passCityTag}>DESTINATION</Text>
              </View>
              <Text
                style={[
                  styles.passCityValue,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900, textAlign: "right" },
                ]}
                numberOfLines={1}
              >
                {destCity}
              </Text>
            </View>
          </View>

          {/* Live Weather Forecast Strip (if available) */}
          {weather && (
            <View
              style={[
                styles.weatherStrip,
                { backgroundColor: theme.isDark ? Palette.slate900 : Palette.slate50 },
              ]}
            >
              <Ionicons name="partly-sunny" size={16} color={Palette.sky} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.weatherText,
                  { color: theme.isDark ? Palette.slate400 : "#475569" },
                ]}
              >
                Current {destCity} Temp:{" "}
                <Text style={{ fontWeight: "bold", color: activeAccent }}>
                  {weather.temperature}°C
                </Text>{" "}
                • Wind: {weather.windspeed} km/h
              </Text>
            </View>
          )}

          {/* Dotted Divider */}
          <View style={styles.ticketDottedLine} />

          {/* Quick Spec Matrix */}
          <View style={styles.passMatrix}>
            {/* Duration */}
            <TouchableOpacity
              style={styles.matrixItem}
              onPress={() => router.push("/create-trip/select-dates")}
              activeOpacity={0.7}
            >
              <View style={styles.matrixHeaderRow}>
                <Text style={styles.matrixLabel}>DURATION</Text>
                <Ionicons name="pencil" size={10} color={activeAccent} />
              </View>
              <Text
                style={[
                  styles.matrixVal,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
              >
                {durationDays} Days
              </Text>
              <Text style={styles.matrixSubVal}>
                {formatDate(tripData?.startDate)}
              </Text>
            </TouchableOpacity>

            {/* Travelers */}
            <TouchableOpacity
              style={styles.matrixItem}
              onPress={() => router.push("/create-trip/select-budget")}
              activeOpacity={0.7}
            >
              <View style={styles.matrixHeaderRow}>
                <Text style={styles.matrixLabel}>PARTY</Text>
                <Ionicons name="pencil" size={10} color={activeAccent} />
              </View>
              <Text
                style={[
                  styles.matrixVal,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
                numberOfLines={1}
              >
                {travelerTitle.split(" ")[0]}
              </Text>
              <Text style={styles.matrixSubVal}>
                {tripData?.traveler?.people || "Squad"}
              </Text>
            </TouchableOpacity>

            {/* Vibes & Activities */}
            <TouchableOpacity
              style={styles.matrixItem}
              onPress={() => router.push("/create-trip/interest-page")}
              activeOpacity={0.7}
            >
              <View style={styles.matrixHeaderRow}>
                <Text style={styles.matrixLabel}>VIBES</Text>
                <Ionicons name="pencil" size={10} color={activeAccent} />
              </View>
              <Text
                style={[
                  styles.matrixVal,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
              >
                {interestCount} Styles
              </Text>
              <Text style={styles.matrixSubVal}>Curated</Text>
            </TouchableOpacity>
          </View>

                    {/* DUAL-CURRENCY BUDGET ESTIMATOR BOX */}
          <View
            style={[
              styles.budgetEstimateBox,
              { backgroundColor: theme.isDark ? Palette.slate900 : Palette.slate50, borderColor: theme.border },
            ]}
          >
            <View style={styles.budgetEstimateHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>💰</Text>
                <Text
                  style={[
                    styles.budgetEstimateTitle,
                    { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                  ]}
                >
                  ESTIMATED TRIP BUDGET
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/create-trip/select-budget")}
                style={[
                  styles.budgetTierPill,
                  { backgroundColor: activeAccent + "18", borderColor: activeAccent + "40" },
                ]}
              >
                <Text style={[styles.budgetTierPillText, { color: activeAccent }]}>
                  {tripData?.isCustomBudget ? "CUSTOM TARGET" : budgetTier.toUpperCase()}
                </Text>
                <Ionicons name="pencil" size={10} color={activeAccent} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.currencyRow}>
              <Text style={[styles.currencyLabel, { color: theme.isDark ? Palette.slate400 : Palette.slate500 }]}>
                In {destCity} ({destCurrency}):
              </Text>
              <Text style={[styles.currencyDestAmount, { color: activeAccent }]}>
                {formattedDestTotal}
              </Text>
            </View>

            {destCurrency !== homeCurrency && (
              <View
                style={[
                  styles.currencyHomeRow,
                  {
                    borderTopColor: theme.isDark ? Palette.slate800 : Palette.slate200,
                    backgroundColor: theme.isDark ? "#064E3B20" : "#ECFDF5",
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, marginRight: 5 }}>🏠</Text>
                  <Text
                    style={[
                      styles.currencyHomeLabel,
                      { color: theme.isDark ? "#A7F3D0" : "#065F46" },
                    ]}
                  >
                    In your currency ({homeCurrency}):
                  </Text>
                </View>
                <Text
                  style={[
                    styles.currencyHomeAmount,
                    { color: theme.isDark ? Palette.successLight : "#059669" },
                  ]}
                >
                  ≈ {formattedHomeTotal}
                </Text>
              </View>
            )}
          </View>

          {/* Barcode & AI Engine Status */}
          <View style={styles.passFooter}>
            <View style={styles.barcodePlaceholder}>
              <Text
                style={[
                  styles.barcodeLines,
                  { color: theme.isDark ? Palette.slate500 : Palette.slate700 },
                ]}
              >
                ||||||| | ||||| |||| || |||||| |
              </Text>
            </View>
            <View style={styles.engineStatusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.authorizedText}>AI-GENERATION ENGINE READY</Text>
            </View>
          </View>
        </View>

                {/* Deep Plan / Multi-Agent Toggle Card */}
        <TouchableOpacity
          style={[
            styles.modeCard,
            {
              backgroundColor: isDeepPlan
                ? theme.isDark ? Palette.slate800 : "#F0FDF4"
                : theme.isDark ? Palette.slate900 : Palette.slate50,
              borderColor: isDeepPlan ? Palette.success : (theme.border || Palette.slate200),
            },
          ]}
          onPress={() => {
            triggerHaptic();
            setIsDeepPlan(!isDeepPlan);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIconWrap, { backgroundColor: isDeepPlan ? "#DCFCE7" : "#E0F2FE" }]}>
            <Ionicons
              name={isDeepPlan ? "sparkles" : "flash"}
              size={20}
              color={isDeepPlan ? Palette.success : Palette.skyDark}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  styles.modeTitle,
                  { color: theme.isDark ? Palette.slate50 : Palette.slate900 },
                ]}
              >
                {isDeepPlan ? "Deep Multi-Agent AI" : "Standard Fast AI"}
              </Text>
              <View
                style={[
                  styles.modeBadge,
                  { backgroundColor: isDeepPlan ? Palette.success : Palette.skyDark },
                ]}
              >
                <Text style={styles.modeBadgeText}>
                  {isDeepPlan ? "PRO PLAN" : "FAST"}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.modeDesc,
                { color: theme.isDark ? Palette.slate400 : Palette.slate500 },
              ]}
            >
              {isDeepPlan
                ? "Thorough multi-pass itinerary with rich logistics, safety & hidden spots."
                : "Instant generation with full schedule, hotels & route highlights."}
            </Text>
          </View>
          <Ionicons
            name={isDeepPlan ? "checkbox" : "square-outline"}
            size={22}
            color={isDeepPlan ? Palette.success : Palette.slate400}
          />
        </TouchableOpacity>

        {/* Summary Notes */}
        <View style={styles.calmPacingBox}>
          <Text style={styles.calmPacingTitle}>⚡ Seamless Itinerary Synthesis</Text>
          <Text style={styles.calmPacingDesc}>
            Our AI will now structure your {durationDays}-day schedule with optimized routes,
            curated spots, daily transit links, and real-time budget estimates.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View
        style={[
          styles.floatingBottomBar,
          {
            backgroundColor: theme.isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)",
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBuildTrip}
          disabled={isGenerating}
          style={[styles.launchRocketBtn, { backgroundColor: activeAccent }]}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator size="small" color={Palette.white} style={{ marginRight: 8 }} />
              <Text style={styles.launchBtnText}>Mapping Routes & Hotels... 🚀</Text>
            </View>
          ) : (
            <View style={styles.generatingRow}>
              <Text style={styles.launchBtnText}>Generate AI Itinerary 🚀</Text>
            </View>
          )}
        </TouchableOpacity>

        {canUseInstant && (
          <TouchableOpacity
            onPress={handleInstantPlan}
            disabled={isGenerating}
            style={[styles.instantPlanBtn, { borderColor: activeAccent }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Instant plan, no AI needed"
          >
            <Text style={[styles.instantPlanBtnText, { color: activeAccent }]}>⚡ Instant Plan (verified, no AI wait)</Text>
          </TouchableOpacity>
        )}
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
    paddingBottom: 110,
  },
  heroPreTitle: {
    color: "#0A7EA4",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  // Boarding Pass Ticket Card
  boardingPassCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    position: "relative",
    borderWidth: 1,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 4,
  },
  ticketNotchLeft: {
    position: "absolute",
    left: -14,
    top: "54%",
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  ticketNotchRight: {
    position: "absolute",
    right: -14,
    top: "54%",
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  passLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: Palette.slate400,
    letterSpacing: 1,
  },
  passFlightCode: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  vipTag: {
    backgroundColor: "rgba(10, 126, 164, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  vipTagText: {
    color: "#0A7EA4",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  passRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passCityTag: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: Palette.slate400,
    letterSpacing: 0.8,
  },
  passCityValue: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  planeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  weatherStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  weatherText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  ticketDottedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: Palette.slate300,
    borderStyle: "dashed",
    marginVertical: 14,
  },
  passMatrix: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  matrixItem: {
    alignItems: "center",
    flex: 1,
  },
  matrixHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  matrixLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: Palette.slate400,
  },
  matrixVal: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginTop: 3,
  },
  matrixSubVal: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: Palette.slate400,
    marginTop: 1,
  },
  passFooter: {
    marginTop: 18,
    alignItems: "center",
  },
  barcodePlaceholder: {
    marginBottom: 6,
  },
  barcodeLines: {
    fontSize: 15,
    letterSpacing: 3,
    fontFamily: "Outfit-Bold",
  },
  engineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Palette.success,
  },
  authorizedText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: Palette.slate400,
    letterSpacing: 1,
  },
    modeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeBadgeText: {
    color: Palette.white,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  modeDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 15,
  },
  calmPacingBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderLeftWidth: 3,
    borderLeftColor: "#0A7EA4",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  calmPacingTitle: {
    color: "#0A7EA4",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  calmPacingDesc: {
    color: Palette.slate400,
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 4,
    lineHeight: 17,
  },
  floatingBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  launchRocketBtn: {
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  instantPlanBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  instantPlanBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  launchBtnText: {
    color: Palette.white,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  budgetEstimateBox: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  budgetEstimateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetEstimateTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1,
  },
  budgetTierPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  budgetTierPillText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  currencyLabel: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  currencyDestAmount: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  currencyHomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderRadius: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  currencyHomeLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  currencyHomeAmount: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
});