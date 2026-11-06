import React from "react";
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./constants/constants";
import { useTheme } from "./constants/theme";

import { TouchableOpacity } from "./ui/Touchable";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PolicyModal({ visible, onClose, type = "terms" }) {
  const theme = useTheme();
  const isDark = theme.isDark;
  const isTerms = type === "terms";

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Backdrop touch to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />

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
              {
                borderBottomColor: isDark ? "#334155" : "#E2E8F0",
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              },
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
                  Official GoGuide AI Traveler Agreement
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeCircle,
                { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#F8FAFC" : "#0F172A"}
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content with guaranteed height */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
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
                  4. User Accounts & Security
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  You are responsible for maintaining the confidentiality of your login credentials. When two-factor authentication (2FA) is used, one-time verification codes protect your account from unauthorized access.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  5. Account Deletion & Termination
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  You have the right to permanently delete your account and all associated travel records at any time from your Profile Settings. Upon deletion, your data is irreversibly purged from our servers.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  6. Contact & Disputes
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  For any legal inquiries, questions about these terms, or support assistance, reach out to support@goguide.com or submit a ticket through our in-app Help Center.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  1. Information We Collect
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  We collect information necessary to deliver personalized AI travel experiences:{"\n\n"}
                  • Account Information: Name, email address, profile avatar, and account credentials.{"\n"}
                  • Travel Preferences: Desired destinations, trip duration, traveler type, budget tier, and curated activity interests.{"\n"}
                  • Technical Data: Device model, operating system, and crash analytics for app reliability.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  2. How We Use Your Information
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  Your data is strictly utilized to:{"\n\n"}
                  • Generate hyper-personalized multi-day day-by-day travel itineraries.{"\n"}
                  • Synchronize your booked trips, wishlist favorites, and custom packing checklists across your devices.{"\n"}
                  • Send critical security verification OTPs and trip departure notifications.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  3. Zero Third-Party Data Selling
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  We do NOT sell, rent, or trade your personal information or travel history to data brokers or advertising networks. Your data remains solely yours.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  4. Data Storage & Security
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  All user data is encrypted in transit using industry-standard TLS 1.3 and at rest using enterprise Firebase Firestore rules with strict user-level authentication scoping.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  5. Your Privacy Rights (GDPR & CCPA)
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  You have full ownership of your data:{"\n\n"}
                  • Right to Access: View all your saved trips, bookings, and profile data anytime.{"\n"}
                  • Right to Export: Export your itineraries and profile records as JSON from Account Settings.{"\n"}
                  • Right to Erasure: Instantly delete your profile, trips, and authentication records permanently with one click.
                </Text>

                <Text style={[styles.sectionTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                  6. Contact Privacy Officer
                </Text>
                <Text style={[styles.paragraph, { color: isDark ? "#CBD5E1" : "#475569" }]}>
                  For privacy requests, GDPR inquiries, or data queries, contact our Data Protection Officer at privacy@goguide.com.
                </Text>
              </>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark ? "#334155" : "#E2E8F0",
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: Colors.PRIMARY || "#0A7EA4" }]}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>I Understand & Close</Text>
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
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    zIndex: 99999,
  },
  container: {
    width: "100%",
    maxWidth: 620,
    height: Platform.OS === "web" ? "82vh" : Math.min(680, SCREEN_HEIGHT * 0.82),
    minHeight: 380,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 20,
    zIndex: 100000,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 21,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  doneBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
});
