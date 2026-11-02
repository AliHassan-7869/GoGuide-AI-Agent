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
import {
  CURRENCY_RATES,
  detectCurrencyFromLocation,
  getDailyBudgetTiers,
} from "../../Components/constants/Currency";

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

  // Detect Destination Currency dynamically (e.g. Dubai -> AED, Paris -> EUR, Lahore -> PKR)
  const destination =
    tripData?.toLocation?.name ||
    tripData?.locationInfo?.name ||
    tripData?.destination ||
    "";
  const destCurrency = detectCurrencyFromLocation(destination);
  const destCurrencyInfo = CURRENCY_RATES[destCurrency] || CURRENCY_RATES.USD;

  // Generate dynamic spending ranges in the destination's local currency
  const budgets = getDailyBudgetTiers(destCurrency);

  const handleSelectBudget = (val) => {
    triggerHaptic();
    setSelectedBudget(val);
  };

  const handleContinue = () => {
    triggerHaptic();
    if (!selectedBudget) return;
    setTripData((prev) => ({
      ...prev,
      budget: selectedBudget,
      destinationCurrency: destCurrency,
    }));
    router.push("/create-trip/review-trip");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER BAR */}
      <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
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

        {/* DESTINATION CURRENCY BADGE */}
        {destination ? (
          <View
            style={[
              styles.currencyBadge,
              {
                backgroundColor: theme.isDark ? "#064E3B" : "#ECFDF5",
                borderColor: theme.isDark ? "#059669" : "#A7F3D0",
              },
            ]}
          >
            <Text style={{ fontSize: 16, marginRight: 6 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.currencyBadgeTitle,
                  { color: theme.isDark ? "#A7F3D0" : "#065F46" },
                ]}
              >
                Local Currency for {destination.split(",")[0]}: {destCurrencyInfo.name} ({destCurrency})
              </Text>
              <Text
                style={[
                  styles.currencyBadgeSub,
                  { color: theme.isDark ? "#6EE7B7" : "#047857" },
                ]}
              >
                Prices below are automatically converted to {destCurrency}.
              </Text>
            </View>
          </View>
        ) : null}

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
                  </View>
                </View>

                {/* RANGE PILL */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.rangePill,
                      {
                        backgroundColor: theme.isDark ? "#1E293B" : "#F1F5F9",
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={14}
                      color={isSelected ? activeAccent : theme.subtext}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.rangeText,
                        { color: isSelected ? activeAccent : theme.text },
                      ]}
                    >
                      {b.range}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? activeAccent : theme.border,
                        backgroundColor: isSelected ? activeAccent : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM BUTTON */}
      <View
        style={[
          styles.footerContainer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedBudget}
          activeOpacity={0.85}
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedBudget ? activeAccent : theme.border,
              opacity: selectedBudget ? 1 : 0.6,
            },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue to Review</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "outfit-bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroPreTitle: {
    fontSize: 11,
    fontFamily: "outfit-bold",
    letterSpacing: 1.5,
    color: "#64748B",
    marginTop: 14,
    marginBottom: 4,
  },
  mainHeading: {
    fontSize: 26,
    fontFamily: "outfit-bold",
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 14,
    fontFamily: "outfit",
    lineHeight: 20,
    marginBottom: 16,
  },
  currencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  currencyBadgeTitle: {
    fontSize: 13,
    fontFamily: "outfit-bold",
  },
  currencyBadgeSub: {
    fontSize: 11,
    fontFamily: "outfit",
    marginTop: 2,
  },
  budgetList: {
    gap: 14,
  },
  budgetCard: {
    padding: 16,
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emojiText: {
    fontSize: 22,
  },
  topTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  budgetTitle: {
    fontSize: 17,
    fontFamily: "outfit-bold",
  },
  meterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  meterText: {
    fontSize: 12,
    fontFamily: "outfit-bold",
    letterSpacing: 0.5,
  },
  budgetDesc: {
    fontSize: 13,
    fontFamily: "outfit",
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  rangePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rangeText: {
    fontSize: 13,
    fontFamily: "outfit-medium",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: "#FFF",
  },
});
