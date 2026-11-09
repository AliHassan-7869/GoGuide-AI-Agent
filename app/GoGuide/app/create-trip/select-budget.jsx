import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";
import {
  CURRENCY_RATES,
  detectCurrencyFromLocation,
  detectUserHomeCurrency,
  getDailyBudgetTiers,
} from "../../Components/constants/Currency";

import { TouchableOpacity } from "../../Components/ui/Touchable";
export default function SelectBudget() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [selectedBudget, setSelectedBudget] = useState(tripData?.budget || null);
  const [customAmount, setCustomAmount] = useState(tripData?.customBudgetAmount ? String(tripData.customBudgetAmount) : "");
  const [isCustomMode, setIsCustomMode] = useState(Boolean(tripData?.isCustomBudget || (tripData?.budget && tripData.budget.startsWith("Custom:"))));

  const totalDays = Number(tripData?.totalNoOfDays || 5);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  // Detect User Origin Currency & Destination Currency dynamically
  const origin = tripData?.fromLocation?.name || "";
  const originCity = origin ? origin.split(",")[0].replace(/\s*\(Current Location\)/i, "") : "Your Location";
  const homeCurrency = detectUserHomeCurrency(origin);
  const homeCurrencyInfo = CURRENCY_RATES[homeCurrency] || CURRENCY_RATES.PKR;

  const destination =
    tripData?.toLocation?.name ||
    tripData?.locationInfo?.name ||
    tripData?.destination ||
    "";
  const destCity = destination ? destination.split(",")[0] : "Destination";
  const destCurrency = detectCurrencyFromLocation(destination);
  const destCurrencyInfo = CURRENCY_RATES[destCurrency] || CURRENCY_RATES.USD;

  const exchangeRate =
    destCurrencyInfo.rate > 0
      ? (homeCurrencyInfo.rate / destCurrencyInfo.rate).toFixed(2)
      : "1.00";

  // Generate dynamic spending ranges in both the destination's local currency AND user's home currency
  const budgets = getDailyBudgetTiers(destCurrency, homeCurrency);

  const handleSelectBudget = (val) => {
    triggerHaptic();
    setIsCustomMode(false);
    setSelectedBudget(val);
  };

  const handleCustomAmountChange = (text) => {
    // Keep only numbers
    const cleaned = text.replace(/[^0-9]/g, "");
    setCustomAmount(cleaned);
    if (cleaned && Number(cleaned) > 0) {
      setIsCustomMode(true);
      setSelectedBudget(`Custom: ${homeCurrencyInfo.symbol || ""}${Number(cleaned).toLocaleString()} ${homeCurrency}`);
    } else {
      setSelectedBudget(null);
    }
  };

  const handleContinue = () => {
    triggerHaptic();
    if (!selectedBudget) return;

    let finalBudgetString = selectedBudget;
    let numericCustom = null;

    if (isCustomMode && customAmount && Number(customAmount) > 0) {
      numericCustom = Number(customAmount);
      finalBudgetString = `Custom: ${homeCurrencyInfo.symbol || ""}${numericCustom.toLocaleString()} ${homeCurrency}`;
    }

    setTripData((prev) => ({
      ...prev,
      budget: finalBudgetString,
      isCustomBudget: Boolean(isCustomMode && numericCustom),
      customBudgetAmount: numericCustom,
      customBudgetCurrency: homeCurrency,
      destinationCurrency: destCurrency,
      homeCurrency: homeCurrency,
    }));
    router.push("/create-trip/review-trip");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bg }]}
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

        {/* DUAL-CURRENCY ROUTE BADGE (USER LOCATION -> DESTINATION) */}
        <View
          style={[
            styles.currencyBadge,
            {
              backgroundColor: theme.isDark ? "#064E3B" : "#ECFDF5",
              borderColor: theme.isDark ? "#059669" : "#A7F3D0",
            },
          ]}
        >
          <Text style={{ fontSize: 18, marginRight: 8 }}>💱</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.currencyBadgeTitle,
                { color: theme.isDark ? "#A7F3D0" : "#065F46" },
              ]}
            >
              {originCity} ({homeCurrency}) ➔ {destCity} ({destCurrency})
            </Text>
            <Text
              style={[
                styles.currencyBadgeSub,
                { color: theme.isDark ? "#6EE7B7" : "#047857" },
              ]}
            >
              {destCurrency !== homeCurrency
                ? `Showing ${destCity} currency (${destCurrencyInfo.name}) + your currency (${homeCurrencyInfo.name}) • 1 ${destCurrency} ≈ ${homeCurrencyInfo.symbol}${exchangeRate}`
                : `Local currency for both origin & destination: ${destCurrencyInfo.name} (${destCurrency})`}
            </Text>
          </View>
        </View>

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

                {/* DUAL CURRENCY RANGE PILLS (DESTINATION + HOME CURRENCY) */}
                <View style={styles.cardFooter}>
                  <View style={{ flex: 1, marginRight: 10, gap: 6 }}>
                    {/* Destination Currency Pill */}
                    <View
                      style={[
                        styles.rangePill,
                        {
                          backgroundColor: theme.isDark ? "#1E293B" : "#F1F5F9",
                          borderColor: isSelected ? activeAccent + "60" : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={isSelected ? activeAccent : theme.subtext}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.rangeText,
                          { color: isSelected ? activeAccent : theme.text },
                        ]}
                      >
                        {destCity} ({destCurrency}): {b.range}
                      </Text>
                    </View>

                    {/* User's Location / Home Currency Pill */}
                    {destCurrency !== homeCurrency && (
                      <View
                        style={[
                          styles.rangePill,
                          {
                            backgroundColor: theme.isDark ? "#064E3B30" : "#ECFDF5",
                            borderColor: theme.isDark ? "#05966960" : "#A7F3D0",
                          },
                        ]}
                      >
                        <Ionicons
                          name="home-outline"
                          size={13}
                          color={theme.isDark ? "#34D399" : "#059669"}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.rangeText,
                            {
                              color: theme.isDark ? "#34D399" : "#065F46",
                              fontSize: 12,
                            },
                          ]}
                        >
                          Your Currency ({homeCurrency}): ≈ {b.homeRange}
                        </Text>
                      </View>
                    )}
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

        {/* OR DIVIDER */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.subtext }]}>OR SET EXACT BUDGET</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* CUSTOM BUDGET INPUT CARD (PLACED AT THE END) */}
        <View
          style={[
            styles.customBudgetCard,
            {
              backgroundColor: theme.card,
              borderColor: isCustomMode ? activeAccent : theme.border,
              borderWidth: isCustomMode ? 2 : 1,
            },
          ]}
        >
          <View style={styles.customCardHeader}>
            <View style={styles.customIconCircle}>
              <Text style={{ fontSize: 20 }}>✍️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customCardTitle, { color: theme.text }]}>Custom Total Budget</Text>
              <Text style={[styles.customCardSubtitle, { color: theme.subtext }]}>
                Specify your exact target spend in {homeCurrencyInfo.name} ({homeCurrency})
              </Text>
            </View>
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: theme.isDark ? "#1E293B" : "#F8FAFC", borderColor: isCustomMode ? activeAccent : theme.border }]}>
            <Text style={[styles.currencyPrefix, { color: isCustomMode ? activeAccent : theme.subtext }]}>
              {homeCurrencyInfo.symbol || homeCurrency}
            </Text>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="e.g. 150000"
              placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              onFocus={() => {
                triggerHaptic();
                if (customAmount && Number(customAmount) > 0) {
                  setIsCustomMode(true);
                  setSelectedBudget(`Custom: ${homeCurrencyInfo.symbol || ""}${Number(customAmount).toLocaleString()} ${homeCurrency}`);
                }
              }}
            />
            {customAmount ? (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setCustomAmount("");
                  setIsCustomMode(false);
                  setSelectedBudget(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={theme.subtext} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* DYNAMIC PER-DAY BREAKDOWN PILL */}
          {customAmount && Number(customAmount) > 0 ? (
            <View style={[styles.customEstimatePill, { backgroundColor: theme.isDark ? "rgba(10, 126, 164, 0.15)" : "rgba(10, 126, 164, 0.08)", borderColor: activeAccent + "40" }]}>
              <Ionicons name="calculator-outline" size={15} color={activeAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.customEstimateText, { color: activeAccent }]}>
                ≈ {homeCurrencyInfo.symbol}{Math.round(Number(customAmount) / Math.max(1, totalDays)).toLocaleString()} / day for {totalDays} days
              </Text>
            </View>
          ) : (
            <Text style={[styles.customHintText, { color: theme.subtext }]}>
              💡 AI will automatically calibrate hotels, food, and activities to stay strictly within your target.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM BUTTON */}
      <View
        style={[
          styles.footerContainer,
          { backgroundColor: theme.bg, borderTopColor: theme.border },
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
    fontFamily: "Outfit-Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroPreTitle: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    color: "#64748B",
    marginTop: 14,
    marginBottom: 4,
  },
  mainHeading: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
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
    fontFamily: "Outfit-Bold",
  },
  currencyBadgeSub: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
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
    fontFamily: "Outfit-Bold",
  },
  meterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  meterText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  budgetDesc: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
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
    fontFamily: "Outfit-Medium",
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
    fontFamily: "Outfit-Bold",
    color: "#FFF",
  },

  // OR Divider Styles
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.2,
  },

  // Custom Budget Card Styles
  customBudgetCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  customCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  customIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(10, 126, 164, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  customCardTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  customCardSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    height: "100%",
  },
  customEstimatePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  customEstimateText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  customHintText: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
    marginTop: 2,
  },
});
