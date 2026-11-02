import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useState } from "react";
import {
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

export default function SelectBudget() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [selectedBudget, setSelectedBudget] = useState(tripData?.budget || null);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const budgets = [
    {
      id: "economical",
      label: "Economical / Budget",
      value: "Economical",
      meter: "$",
      badgeColor: "#10B981",
      range: "$50 - $100 / day",
      description: "Smart boutique stays, local metro & authentic street food gems.",
      icon: "🪙",
    },
    {
      id: "moderate",
      label: "Moderate / Standard",
      value: "Moderate",
      meter: "$$",
      badgeColor: "#3B82F6",
      range: "$150 - $280 / day",
      description: "Handpicked 4★ hotels, curated cafe dining & express transit.",
      icon: "💳",
    },
    {
      id: "luxury",
      label: "Luxury / VIP",
      value: "Luxury",
      meter: "$$$",
      badgeColor: "#8B5CF6",
      range: "$400+ / day",
      description: "5★ historic resorts, chauffeured transfers & Michelin dining.",
      icon: "💎",
    },
  ];

  const handleSelectBudget = (val) => {
    triggerHaptic();
    setSelectedBudget(val);
  };

  const handleContinue = () => {
    triggerHaptic();
    if (!selectedBudget) return;

    setTripData((prev) => ({ ...prev, budget: selectedBudget }));
    router.push("/create-trip/review-trip");
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Trip Budget</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StepProgressBar currentStep={5} totalSteps={6} stepTitle="Select Budget" />

        <Text style={styles.heroPreTitle}>FINANCIAL COMFORT</Text>
        <Text style={[styles.mainHeading, { color: theme.text }]}>Choose your spending style</Text>
        <Text style={[styles.subHeading, { color: theme.subtext }]}>
          Our AI tailors hotel ratings, dining experiences, and activity prices to your tier.
        </Text>

        {/* BUDGET CARDS */}
        <View style={styles.budgetList}>
          {budgets.map((b) => {
            const isSelected = selectedBudget === b.value;
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => handleSelectBudget(b.value)}
                activeOpacity={0.8}
                style={[
                  styles.budgetCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? activeAccent : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.emojiText}>{b.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.topTitleRow}>
                      <Text style={[styles.budgetTitle, { color: theme.text }]}>{b.label}</Text>
                      <View
                        style={[
                          styles.meterBadge,
                          {
                            backgroundColor: isSelected ? activeAccent + "20" : b.badgeColor + "18",
                            borderColor: isSelected ? activeAccent : b.badgeColor + "40",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.meterText,
                            { color: isSelected ? activeAccent : b.badgeColor },
                          ]}
                        >
                          {b.meter}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.budgetDesc, { color: theme.subtext }]}>
                      {b.description}
                    </Text>

                    <Text style={[styles.rangeBadgeText, { color: isSelected ? "#F59E0B" : theme.subtext }]}>
                      Est: {b.range}
                    </Text>
                  </View>
                </View>

                {/* Selection Checkmark */}
                {isSelected && (
                  <View style={styles.selectedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={activeAccent} />
                    <Text style={[styles.selectedLabel, { color: activeAccent }]}>
                      Selected Tier
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM FOOTER */}
      <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedBudget}
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedBudget ? activeAccent : "#94A3B8",
              opacity: selectedBudget ? 1 : 0.6,
            },
          ]}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Review Itinerary</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    lineHeight: 18,
  },
  budgetList: {
    gap: 14,
  },
  budgetCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  topTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 26,
  },
  budgetTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  budgetDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
    marginTop: 2,
  },
  rangeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    marginTop: 6,
  },
  meterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  meterText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
    gap: 6,
  },
  selectedLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
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
