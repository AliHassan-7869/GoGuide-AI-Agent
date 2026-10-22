import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/constants";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night"];

const PRESETS = [
  { icon: "airplane-outline", label: "Flight / Transit", time: "Morning" },
  { icon: "restaurant-outline", label: "Dining / Cafe", time: "Evening" },
  { icon: "ticket-outline", label: "Museum / Tour", time: "Afternoon" },
  { icon: "cart-outline", label: "Shopping", time: "Afternoon" },
  { icon: "camera-outline", label: "Sightseeing", time: "Morning" },
];

export default function AddActivityModal({
  visible,
  dayNumber,
  onClose,
  onAddActivity,
  theme,
}) {
  const [placeName, setPlaceName] = useState("");
  const [selectedTime, setSelectedTime] = useState("Morning");
  const [details, setDetails] = useState("");
  const [tickets, setTickets] = useState("");

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const handleApplyPreset = (preset) => {
    triggerHaptic();
    setSelectedTime(preset.time);
    if (!placeName) {
      setPlaceName(preset.label);
    }
  };

  const handleSubmit = () => {
    triggerHaptic();
    if (!placeName.trim()) {
      Alert.alert("Activity Name Required", "Please enter what you'd like to do.");
      return;
    }

    const activityData = {
      time: selectedTime,
      placeName: placeName.trim(),
      details: details.trim() || "Custom traveler activity",
      tickets: tickets.trim() || "Free",
      isCustom: true,
      id: `custom_${Date.now()}`,
    };

    onAddActivity(dayNumber, activityData);

    // Reset fields
    setPlaceName("");
    setDetails("");
    setTickets("");
    setSelectedTime("Morning");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Add Custom Activity</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Adding to Day {dayNumber} Itinerary
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.border + "40" }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Quick Presets */}
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Quick Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {PRESETS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleApplyPreset(p)}
                  style={[styles.presetChip, { borderColor: theme.border, backgroundColor: theme.bg }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={p.icon} size={14} color={Colors.PRIMARY} style={{ marginRight: 5 }} />
                  <Text style={[styles.presetText, { color: theme.text }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Slot Picker */}
            <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 14 }]}>Time Slot</Text>
            <View style={styles.timeSlotRow}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedTime(slot);
                    }}
                    style={[
                      styles.timeSlotBtn,
                      {
                        backgroundColor: isSelected ? Colors.PRIMARY : theme.bg,
                        borderColor: isSelected ? Colors.PRIMARY : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Place / Activity Title */}
            <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>
              Activity / Place Name *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Shibuya Sky Observation Deck"
              placeholderTextColor={theme.subtext + "90"}
              value={placeName}
              onChangeText={setPlaceName}
              maxLength={70}
            />

            {/* Estimated Cost / Tickets */}
            <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 14 }]}>
              Estimated Cost / Tickets (Optional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Free or $22 per person"
              placeholderTextColor={theme.subtext + "90"}
              value={tickets}
              onChangeText={setTickets}
              maxLength={40}
            />

            {/* Details & Notes */}
            <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 14 }]}>
              Notes / Description (Optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Pre-booked tickets for 4:30 PM sunset viewing. Bring camera!"
              placeholderTextColor={theme.subtext + "90"}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            {/* Action Buttons */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.saveBtn, { backgroundColor: Colors.PRIMARY }]}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
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
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    marginBottom: 6,
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  timeSlotRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeSlotBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    minHeight: 70,
    textAlignVertical: "top",
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-Medium",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
});
