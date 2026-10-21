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

  const handlePrintOrPdf = () => {
    triggerHaptic();

    if (Platform.OS === "web") {
      // Build a dedicated print window with clean typography and branding
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert("Pop-up Blocked", "Please allow pop-ups to open the printable PDF.");
        return;
      }

      const itineraryHtml = (plan.itinerary || [])
        .map(
          (day) => `
        <div class="day-card">
          <div class="day-header">
            <span class="day-badge">Day ${day.day}</span>
            <span class="day-theme">${day.theme || ""}</span>
          </div>
          <table class="activities-table">
            <thead>
              <tr>
                <th style="width: 20%;">Time</th>
                <th style="width: 35%;">Place</th>
                <th style="width: 45%;">Details</th>
              </tr>
            </thead>
            <tbody>
              ${(day.activities || [])
                .map(
                  (act) => `
                <tr>
                  <td><strong>${act.time || ""}</strong></td>
                  <td>${act.placeName || ""}</td>
                  <td>${act.details || ""}${act.tickets ? ` <span class="ticket-tag">(${act.tickets})</span>` : ""}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
        )
        .join("");

      const hotelsHtml = (plan.hotels || [])
        .map(
          (h) => `
        <div class="hotel-item">
          <strong>${h.name}</strong> — ${h.address || h.details || ""} 
          <span class="price-tag">${h.price || ""}</span>
        </div>
      `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>GoGuide Itinerary - ${plan.destination || destination}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; }
            .header-banner { border-bottom: 2px solid #0a7ea4; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 26px; font-weight: 800; color: #0a7ea4; letter-spacing: -0.5px; }
            .logo span { color: #f2994a; }
            .doc-title { font-size: 22px; font-weight: 700; margin: 0; }
            .meta-bar { display: flex; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 18px; border-radius: 8px; margin-bottom: 25px; }
            .meta-item { font-size: 13px; }
            .meta-item strong { color: #0a7ea4; }
            .day-card { page-break-inside: avoid; margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .day-header { background: #0a7ea4; color: white; padding: 10px 16px; display: flex; align-items: center; gap: 12px; }
            .day-badge { background: white; color: #0a7ea4; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 4px; }
            .day-theme { font-weight: 600; font-size: 15px; }
            .activities-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .activities-table th { background: #f1f5f9; text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
            .activities-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
            .ticket-tag { color: #0284c7; font-weight: 600; }
            .hotel-section { margin-top: 30px; page-break-inside: avoid; }
            .hotel-item { background: #f8fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #0a7ea4; font-size: 13px; }
            .price-tag { font-weight: 700; color: #16a34a; margin-left: 8px; }
            .footer-note { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="logo">GoGuide<span>.AI</span></div>
              <div style="font-size: 12px; color: #64748b;">Smart Travel Itinerary & Official Pass</div>
            </div>
            <div style="text-align: right;">
              <h1 class="doc-title">${plan.destination || destination}</h1>
              <div style="font-size: 12px; color: #64748b;">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="meta-bar">
            <div class="meta-item"><strong>Duration:</strong> ${plan.duration || "Multi-Day"}</div>
            <div class="meta-item"><strong>Budget:</strong> ${plan.budget || "Standard"}</div>
            <div class="meta-item"><strong>Traveler:</strong> ${plan.traveler || "Explorer"}</div>
            <div class="meta-item"><strong>Weather:</strong> ${plan.weatherBrief || "Seasonal"}</div>
          </div>

          <h3 style="font-size: 16px; margin-bottom: 12px; color: #0f172a;">Day-by-Day Itinerary</h3>
          ${itineraryHtml}

          ${
            hotelsHtml
              ? `<div class="hotel-section"><h3 style="font-size: 16px; margin-bottom: 10px; color: #0f172a;">Recommended Hotels</h3>${hotelsHtml}</div>`
              : ""
          }

          <div class="footer-note">
            This document was created automatically by GoGuide AI Agent. Keep an offline copy or print for easy access during flights and customs.
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      Alert.alert(
        "PDF Document Ready",
        "Your official GoGuide travel document is generated. You can share or save it via your device's print manager."
      );
    }
  };

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
            <Ionicons name="print-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.printBtnText}>
              {Platform.OS === "web" ? "Print / Save as PDF" : "Export Official PDF Pass"}
            </Text>
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
    marginBottom: 16,
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
