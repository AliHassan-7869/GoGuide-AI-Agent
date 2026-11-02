import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { SelectTravelerList } from "../../Components/constants/Option";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function SelectTraveler() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [selectedTraveler, setSelectedTraveler] = useState(tripData?.traveler || null);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedTraveler) {
      setTripData((prev) => ({ ...prev, traveler: selectedTraveler }));
    }
  }, [selectedTraveler]);

  const handleContinue = () => {
    triggerHaptic();
    if (selectedTraveler) {
      router.push("/create-trip/interest-page");
    }
  };

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Travel Companions</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.contentWrap}>
        <StepProgressBar currentStep={2} totalSteps={6} stepTitle="Who is Traveling?" />

        <Text style={styles.heroPreTitle}>COMPANION SELECTION</Text>
        <Text style={[styles.mainHeading, { color: theme.text }]}>Who is traveling with you?</Text>
        <Text style={[styles.subHeading, { color: theme.subtext }]}>
          Choose your squad to help AI tailor the accommodations & activities.
        </Text>

        {/* TRAVELER OPTIONS LIST */}
        <FlatList
          data={SelectTravelerList}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedTraveler?.id === item?.id;
            return (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setSelectedTraveler(item);
                }}
                activeOpacity={0.8}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? activeAccent : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected
                          ? activeAccent + "18"
                          : theme.isDark
                          ? "#242436"
                          : "#F1F5F9",
                      },
                    ]}
                  >
                    <Text style={styles.emojiIcon}>{item?.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: theme.text }]}>
                      {item?.title}
                    </Text>
                    <Text style={[styles.optionDesc, { color: theme.subtext }]}>
                      {item?.desc}
                    </Text>
                  </View>
                </View>

                {/* Radio selection indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? activeAccent : theme.subtext,
                      backgroundColor: isSelected ? activeAccent : "transparent",
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* BOTTOM FOOTER */}
      <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedTraveler}
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedTraveler ? activeAccent : "#94A3B8",
              opacity: selectedTraveler ? 1 : 0.6,
            },
          ]}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue to Interests</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
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
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroPreTitle: {
    color: "#0A7EA4",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  mainHeading: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiIcon: {
    fontSize: 26,
  },
  optionTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 17,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  continueText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});
