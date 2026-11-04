import React from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/constants";
import { downloadItineraryPDF } from "../utils/PdfDownloadService";

export default function PrintableItineraryModal({
  visible,
  plan,
  destination,
  onClose,
  theme,
}) {
  if (!plan) return null;

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const handlePrintOrPdf = async () => {
    triggerHaptic();
    await downloadItineraryPDF(plan, destination);
  };

  const flights = plan.flights || plan.flightDetails;
  const flightDetails =
    typeof flights === "object"
      ? [flights?.airline, flights?.flightNumber, flights?.details || flights?.route].filter(Boolean).join(" • ")
      : String(flights || "");
  const flightPrice = typeof flights === "object" ? flights?.price : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.isDark ? "#282828" : "#E5E7EB" }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Export Itinerary & Pass</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Printable PDF & Travel Documentation
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.isDark ? "#282828" : "#F3F4F6" }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Document Preview Card */}
          <View style={[styles.docPreviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.docHeaderRow}>
              <View>
                <Text style={styles.brandLogo}>
                  GoGuide<Text style={{ color: Colors.SECONDARY }}>.AI</Text>
                </Text>
                <Text style={[styles.docSub, { color: theme.subtext }]}>Official Itinerary Pass</Text>
              </View>
              <View style={styles.passTag}>
                <Text style={styles.passTagText}>OFFLINE READY</Text>
              </View>
            </View>

            <Text style={[styles.destName, { color: theme.text }]}>{plan.destination}</Text>

            <View style={styles.pillRow}>
              <View style={[styles.metaPill, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F1F5F9" }]}>
                <Ionicons name="time-outline" size={12} color={Colors.PRIMARY} />
                <Text style={[styles.metaPillText, { color: theme.text }]}>{plan.duration || "Multi-Day"}</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F1F5F9" }]}>
                <Ionicons name="wallet-outline" size={12} color="#10B981" />
                <Text style={[styles.metaPillText, { color: theme.text }]}>{plan.budget || "Budget"}</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F1F5F9" }]}>
                <Ionicons name="people-outline" size={12} color="#8B5CF6" />
                <Text style={[styles.metaPillText, { color: theme.text }]}>{plan.traveler || "Explorer"}</Text>
              </View>
            </View>

            {/* Flight / Transit Route Preview Box */}
            {flights && (
              <View
                style={[
                  styles.flightPreviewBox,
                  {
                    backgroundColor: theme.isDark ? "#1E293B" : "#F0F9FF",
                    borderColor: theme.isDark ? "#334155" : "#BAE6FD",
                  },
                ]}
              >
                <View style={styles.flightHeaderRow}>
                  <Text style={[styles.flightLabel, { color: Colors.PRIMARY }]}>✈️ FLIGHT / TRANSIT SUMMARY</Text>
                  {flightPrice && <Text style={styles.flightPrice}>{flightPrice}</Text>}
                </View>
                <Text style={[styles.flightDetailsText, { color: theme.text }]}>{flightDetails}</Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.isDark ? "#2C2C2C" : "#E2E8F0" }]} />

            {/* Daily Schedule Preview List */}
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Schedule Summary</Text>
            {(plan.itinerary || []).map((day) => (
              <View key={day.day} style={styles.previewDayRow}>
                <View style={styles.dayMiniBadge}>
                  <Text style={styles.dayMiniBadgeText}>D{day.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayThemeTitle, { color: theme.text }]}>{day.theme || "Daily Tour"}</Text>
                  <Text style={[styles.dayActsSummary, { color: theme.subtext }]} numberOfLines={1}>
                    {(day.activities || []).map((a) => a.placeName).join(" • ")}
                  </Text>
                </View>
              </View>
            ))}

            {/* Packing List Preview */}
            {plan.packingList && plan.packingList.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.text }]}>Packing Essentials</Text>
                <Text style={[styles.dayActsSummary, { color: theme.subtext }]} numberOfLines={2}>
                  {plan.packingList.map((p) => (typeof p === "string" ? p : p.item)).join(", ")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.isDark ? "#282828" : "#E5E7EB" }]}>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={handlePrintOrPdf}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.printBtnText}>Download Itinerary PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  docPreviewCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  docHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandLogo: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
  },
  docSub: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    marginTop: 1,
  },
  passTag: {
    backgroundColor: "#10B98118",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passTagText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  destName: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  metaPillText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  flightPreviewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  flightHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  flightLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  flightPrice: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: "#10B981",
  },
  flightDetailsText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginBottom: 8,
  },
  previewDayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  dayMiniBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  dayMiniBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  dayThemeTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  dayActsSummary: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  printBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});
