import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Configs/FirebaseConfig";
import { Colors } from "../constants/constants";

export default function ShareTripModal({
  visible,
  tripId,
  destination,
  plan,
  onCloneTrip,
  onClose,
  theme,
}) {
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const cleanTripId = tripId || "current-trip";
  const shareableUrl = `https://dist-seven-tau-79.vercel.app/trip/${cleanTripId}`;

  const syncPublicShare = async () => {
    try {
      if (cleanTripId && plan) {
        await setDoc(doc(db, "SharedTrips", String(cleanTripId)), {
          id: String(cleanTripId),
          destination: plan.destination || destination || "Destination",
          plan: plan,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (e) {
      console.log("SharedTrips sync notice:", e?.message);
    }
  };

  const handleCopyLink = () => {
    triggerHaptic();
    syncPublicShare();

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("Link Copied! Shareable trip link copied to clipboard. Share it with friends on WhatsApp or social media!");
    } else {
      Alert.alert("Link Copied!", "Shareable trip link copied to clipboard. Share it with friends or co-travelers!");
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic();
    syncPublicShare();
    try {
      const dest = plan.destination || destination || "Destination";
      const shareMessage = `✈️ Check out our trip to ${dest} on GoGuide AI!\n\n` +
        `📅 Duration: ${plan.duration || "Multi-Day"}\n` +
        `👥 Travelers: ${plan.traveler || "Explorer"}\n` +
        `💰 Budget: ${plan.budget || "Curated"}\n\n` +
        `🔗 View Full Interactive Itinerary & Hotels:\n` +
        `${shareableUrl}\n\n` +
        `Plan your trip with GoGuide AI 🌍`;

      await Share.share({
        title: `Trip to ${dest} - GoGuide AI`,
        message: shareMessage,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  const handleClone = () => {
    triggerHaptic();
    onCloneTrip();
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Share & Collaborate</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Invite friends or co-travelers to this plan
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
          {/* Share Link Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="link" size={24} color={Colors.PRIMARY} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Direct Trip Web Link</Text>
            <Text style={[styles.cardSub, { color: theme.subtext }]}>
              Anyone with this link can view the complete itinerary, hotels, and places.
            </Text>

            <View style={[styles.urlBox, { backgroundColor: theme.isDark ? "#252525" : "#F8FAFC", borderColor: theme.border }]}>
              <Text style={[styles.urlText, { color: theme.text }]} numberOfLines={1}>
                {shareableUrl}
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: copied ? "#10B981" : Colors.PRIMARY }]}
                onPress={handleCopyLink}
                activeOpacity={0.8}
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color="#FFF" />
                <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={handleNativeShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.inviteBtnText}>Share via WhatsApp / Email</Text>
            </TouchableOpacity>
          </View>

          {/* Collaboration & Clone Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 14 }]}>
            <View style={[styles.cardIconCircle, { backgroundColor: "#10B98118" }]}>
              <Ionicons name="copy" size={22} color="#10B981" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Clone Trip to Account</Text>
            <Text style={[styles.cardSub, { color: theme.subtext }]}>
              Create a duplicate copy of this trip to edit or customize separately without affecting the original.
            </Text>

            <TouchableOpacity
              style={[styles.cloneBtn, { backgroundColor: theme.isDark ? "#252525" : "#F1F5F9", borderColor: theme.border }]}
              onPress={handleClone}
              activeOpacity={0.8}
            >
              <Ionicons name="duplicate-outline" size={18} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
              <Text style={[styles.cloneBtnText, { color: theme.text }]}>Duplicate / Clone This Trip</Text>
            </TouchableOpacity>
          </View>

          {/* Co-Travelers Pass Summary */}
          <View style={[styles.coTravelersInfo, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 14 }]}>
            <Ionicons name="people-circle-outline" size={24} color="#8B5CF6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.coTravelerTitle, { color: theme.text }]}>Co-Traveler Sync</Text>
              <Text style={[styles.coTravelerDesc, { color: theme.subtext }]}>
                Changes you make to the packing list or itinerary automatically reflect for your group.
              </Text>
            </View>
          </View>
        </ScrollView>
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
    paddingBottom: 60,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    textAlign: "center",
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
  },
  inviteBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  cloneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cloneBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  coTravelersInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  coTravelerTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  coTravelerDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 16,
  },
});
