import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import moment from "moment";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ReviewTrip() {
  const { tripData } = useContext(CreateTripContext);
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
    } catch (e) {}
  };

  const handleBuildTrip = () => {
    triggerHaptic();
    setIsGenerating(true);
    setTimeout(() => {
      router.push("/create-trip/generate-trip");
    }, 400);
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
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
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
        <StepProgressBar currentStep={6} totalSteps={6} stepTitle="Final Verification" />

        <Text style={styles.heroPreTitle}>FINAL VERIFICATION</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Your Itinerary Boarding Pass
        </Text>

        {/* ================= DIGITAL BOARDING PASS CARD ================= */}
        <View
          style={[
            styles.boardingPassCard,
            {
              backgroundColor: theme.isDark ? "#1E293B" : "#FFFFFF",
              borderColor: theme.isDark ? "rgba(10, 126, 164, 0.25)" : "#E2E8F0",
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
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A" },
                ]}
              >
                EXP-AI-2026
              </Text>
            </View>
            <View style={styles.vipTag}>
              <Text style={styles.vipTagText}>{budgetTier.toUpperCase()} CLASS</Text>
            </View>
          </View>

          {/* Connected Route Visualization */}
          <View style={styles.passRouteRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.editRow}>
                <Text style={styles.passCityTag}>ORIGIN</Text>
                <TouchableOpacity onPress={() => router.push("/create-trip/search-place")}>
                  <Ionicons name="pencil" size={12} color={activeAccent} />
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.passCityValue,
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A" },
                ]}
                numberOfLines={1}
              >
                {originCity}
              </Text>
            </View>

            <View
              style={[
                styles.planeIconContainer,
                { backgroundColor: theme.isDark ? "#0F172A" : "#F1F5F9" },
              ]}
            >
              <Text style={{ fontSize: 20 }}>✈️</Text>
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <View style={styles.editRow}>
                <TouchableOpacity
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
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A", textAlign: "right" },
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
                { backgroundColor: theme.isDark ? "#0F172A" : "#F8FAFC" },
              ]}
            >
              <Ionicons name="partly-sunny" size={16} color="#0EA5E9" style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.weatherText,
                  { color: theme.isDark ? "#94A3B8" : "#475569" },
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
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A" },
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
              onPress={() => router.push("/create-trip/select-traveler")}
              activeOpacity={0.7}
            >
              <View style={styles.matrixHeaderRow}>
                <Text style={styles.matrixLabel}>PARTY</Text>
                <Ionicons name="pencil" size={10} color={activeAccent} />
              </View>
              <Text
                style={[
                  styles.matrixVal,
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A" },
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
                  { color: theme.isDark ? "#F8FAFC" : "#0F172A" },
                ]}
              >
                {interestCount} Styles
              </Text>
              <Text style={styles.matrixSubVal}>Curated</Text>
            </TouchableOpacity>
          </View>

          {/* Barcode & AI Engine Status */}
          <View style={styles.passFooter}>
            <View style={styles.barcodePlaceholder}>
              <Text
                style={[
                  styles.barcodeLines,
                  { color: theme.isDark ? "#64748B" : "#334155" },
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
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.launchBtnText}>Mapping Routes & Hotels... 🚀</Text>
            </View>
          ) : (
            <View style={styles.generatingRow}>
              <Text style={styles.launchBtnText}>Generate AI Itinerary 🚀</Text>
            </View>
          )}
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
    paddingBottom: 110,
  },
  heroPreTitle: {
    color: "#0A7EA4",
    fontSize: 11,
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
    shadowColor: "#000",
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
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    color: "#94A3B8",
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
    fontSize: 11,
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
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    color: "#94A3B8",
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
    borderColor: "#CBD5E1",
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
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    color: "#94A3B8",
  },
  matrixVal: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginTop: 3,
  },
  matrixSubVal: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    color: "#94A3B8",
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
    backgroundColor: "#10B981",
  },
  authorizedText: {
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    color: "#94A3B8",
    letterSpacing: 1,
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
    color: "#94A3B8",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  launchBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
});
