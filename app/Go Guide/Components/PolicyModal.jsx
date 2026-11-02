import React from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./constants/constants";
import { useTheme } from "./constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PolicyModal({ visible, onClose, type = "terms" }) {
  const theme = useTheme();
  const isDark = theme.isDark;
  const isTerms = type === "terms";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? "#334155" : "#E2E8F0" },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: isTerms ? "#E0F2FE" : "#DCFCE7" },
                ]}
              >
                <Ionicons
                  name={isTerms ? "document-text-outline" : "shield-checkmark-outline"}
                  size={20}
                  color={isTerms ? "#0284C7" : "#10B981"}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  {isTerms ? "Terms of Service" : "Privacy Policy"}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Last updated: October 2026
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeCircle,
                { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#F8FAFC" : "#0F172A"}
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {isTerms ? (
              <>
                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  1. Acceptance of Terms
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  By downloading, accessing, or using GoGuide AI Travel Agent ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue using the application.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  2. AI-Generated Content Disclaimer
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  GoGuide utilizes advanced artificial intelligence models (including Google Gemini and DeepSeek) to generate customized travel itineraries, suggestions, safety advisories, and budget estimates.{"\n\n"}
                  • AI recommendations are provided for informational and planning purposes only.{"\n"}
                  • Travel conditions, opening hours, local pricing, flight schedules, visa requirements, and safety advisories can change rapidly.{"\n"}
                  • Travelers are solely responsible for independently verifying details, local laws, and travel safety with official authorities.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  3. Bookings and Third-Party Links
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  The App may display links to third-party booking providers (e.g. Booking.com, Google Maps, airline portals). GoGuide does not process financial transactions for external stays, flights, or tickets and is not liable for bookings made through third-party platforms.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  4. User Accounts & Two-Factor Authentication
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  You are responsible for maintaining the confidentiality of your login credentials. When 2FA is enabled, you agree to receive verification codes at your registered email address to protect your account.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  5. Account Deletion & Termination
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  You have the right to permanently delete your account and all associated travel records at any time from your Profile Settings. Upon deletion, your data is irreversibly purged from our servers.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  1. Information We Collect
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  We collect information to provide, personalize, and secure your travel planning experience:{"\n\n"}
                  • Account Information: Name, email address, profile picture, and authentication credentials.{"\n"}
                  • Travel Data: Destination searches, travel dates, companion types, budgets, saved itineraries, and logged expenses.{"\n"}
                  • Device & Technical Data: Crash logs and device preferences (e.g., dark mode, currency preferences).
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  2. How We Use Your Information
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  • Generating and tailoring day-by-day travel itineraries.{"\n"}
                  • Syncing your travel plans securely across your devices.{"\n"}
                  • Sending security verification codes (2FA) and account alerts.{"\n"}
                  • Improving application performance and AI response accuracy.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  3. We Do Not Sell Your Data
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  GoGuide does not sell, rent, or monetize your personal information to third-party advertisers. All data is processed strictly for the service of your account.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  4. Data Security & GDPR Rights
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  • Encryption: All data transferred between the App and our servers uses industry-standard HTTPS/TLS encryption.{"\n"}
                  • Access & Export: You can export a full copy of your travel data in JSON format directly from the Edit Profile screen.{"\n"}
                  • Permanent Deletion: You can permanently erase all your data at any time via the "Delete Account" button.
                </Text>
              </>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View
            style={[
              styles.footer,
              { borderTopColor: isDark ? "#334155" : "#E2E8F0" },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.doneBtn,
                { backgroundColor: Colors.PRIMARY || "#0A7EA4" },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Close & Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 620,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  doneBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
});
