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
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/constants";

// Country emergency numbers lookup
const EMERGENCY_LOOKUP = {
  japan: { police: "110", ambulance: "119", touristHelp: "050-3816-2787" },
  uae: { police: "999", ambulance: "998", touristHelp: "800-4888" },
  italy: { police: "113", ambulance: "118", touristHelp: "112" },
  france: { police: "17", ambulance: "15", touristHelp: "112" },
  indonesia: { police: "110", ambulance: "118", touristHelp: "112" },
  pakistan: { police: "15", ambulance: "1122", touristHelp: "1422" },
  uk: { police: "999", ambulance: "999", touristHelp: "111" },
  usa: { police: "911", ambulance: "911", touristHelp: "911" },
  default: { police: "112", ambulance: "112", touristHelp: "112" },
};

function getEmergencyNumbers(destination = "") {
  const lower = (destination || "").toLowerCase();
  for (const key of Object.keys(EMERGENCY_LOOKUP)) {
    if (key !== "default" && lower.includes(key)) {
      return EMERGENCY_LOOKUP[key];
    }
  }
  return EMERGENCY_LOOKUP.default;
}

export default function OfflineVaultModal({
  visible,
  destination = "Destination",
  hotels = [],
  onClose,
  theme,
}) {
  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const emergency = getEmergencyNumbers(destination);

  const handleCopy = (text, label) => {
    triggerHaptic();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      Alert.alert("Copied to Clipboard", `${label} has been copied.`);
    } catch {
      Alert.alert("Note", text);
    }
  };

  const handleCall = (phoneNumber) => {
    triggerHaptic();
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Emergency Dial", `Number: ${phoneNumber}`);
    });
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
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.vaultIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.title, { color: theme.text }]}>Offline Travel Vault</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                {destination} • Always Available Offline
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.border + "40" }]}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Offline Ready Banner */}
          <View style={[styles.offlineCard, { backgroundColor: "#10B98115", borderColor: "#10B98150" }]}>
            <Ionicons name="cloud-offline" size={22} color="#10B981" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.offlineCardTitle, { color: "#10B981" }]}>
                100% Offline Accessible
              </Text>
              <Text style={[styles.offlineCardDesc, { color: theme.subtext }]}>
                Your full itinerary, booked stays, and emergency assistance numbers work anywhere without Wi-Fi or cellular roaming.
              </Text>
            </View>
          </View>

          {/* Emergency Helplines Section */}
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            🚨 Emergency Numbers ({destination.split(",")[0]})
          </Text>

          <View style={styles.emergencyGrid}>
            <TouchableOpacity
              onPress={() => handleCall(emergency.police)}
              style={[styles.emergencyBtn, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}
              activeOpacity={0.8}
            >
              <Ionicons name="shield" size={22} color="#EF4444" />
              <Text style={[styles.emergencyBtnLabel, { color: theme.text }]}>Police</Text>
              <Text style={[styles.emergencyBtnNumber, { color: "#EF4444" }]}>{emergency.police}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleCall(emergency.ambulance)}
              style={[styles.emergencyBtn, { backgroundColor: "#3B82F615", borderColor: "#3B82F640" }]}
              activeOpacity={0.8}
            >
              <Ionicons name="medical" size={22} color="#3B82F6" />
              <Text style={[styles.emergencyBtnLabel, { color: theme.text }]}>Ambulance</Text>
              <Text style={[styles.emergencyBtnNumber, { color: "#3B82F6" }]}>{emergency.ambulance}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleCall(emergency.touristHelp)}
              style={[styles.emergencyBtn, { backgroundColor: "#8B5CF615", borderColor: "#8B5CF640" }]}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={22} color="#8B5CF6" />
              <Text style={[styles.emergencyBtnLabel, { color: theme.text }]}>Tourist Help</Text>
              <Text style={[styles.emergencyBtnNumber, { color: "#8B5CF6" }]}>{emergency.touristHelp}</Text>
            </TouchableOpacity>
          </View>

          {/* Hotel Stays for Taxi Driver */}
          <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 24 }]}>
            🏨 Accommodations & Taxi Addresses
          </Text>

          {hotels && hotels.length > 0 ? (
            hotels.map((h, idx) => (
              <View
                key={idx}
                style={[styles.hotelVaultCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hotelName, { color: theme.text }]}>{h.name}</Text>
                  <Text style={[styles.hotelAddress, { color: theme.subtext }]}>{h.address || "Central Area"}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleCopy(`${h.name}\n${h.address || ""}`, h.name)}
                  style={[styles.copyPill, { backgroundColor: Colors.PRIMARY + "15", borderColor: Colors.PRIMARY + "40" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={14} color={Colors.PRIMARY} style={{ marginRight: 4 }} />
                  <Text style={[styles.copyPillText, { color: Colors.PRIMARY }]}>Copy Address</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={[styles.hotelVaultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ color: theme.subtext, fontSize: 13 }}>No hotels attached to this itinerary yet.</Text>
            </View>
          )}

          {/* Offline Survival Rules */}
          <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 24 }]}>
            💡 Offline Survival Tips
          </Text>

          <View style={[styles.tipsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.tipText, { color: theme.text }]}>
                Keep screenshots of your passport photo page and return flight ticket in your photo gallery.
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.tipText, { color: theme.text }]}>
                Pre-download your destination map in Google Maps before stepping out of Wi-Fi.
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.tipText, { color: theme.text }]}>
                Carry at least local currency cash for small transit, taxis, and kiosks that do not accept cards.
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  vaultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    justifyContent: "center",
    alignItems: "center",
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  offlineCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  offlineCardTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  offlineCardDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    marginTop: 3,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    marginBottom: 12,
  },
  emergencyGrid: {
    flexDirection: "row",
    gap: 10,
  },
  emergencyBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  emergencyBtnLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    marginTop: 4,
  },
  emergencyBtnNumber: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  hotelVaultCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hotelName: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  hotelAddress: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
    lineHeight: 17,
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  copyPillText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  tipsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
  },
});
