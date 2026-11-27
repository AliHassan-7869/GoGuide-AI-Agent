import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Palette, Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { TouchableOpacity } from "../Components/ui/Touchable";
import { CreateTripContext } from "../context/CreateTripContext";
import {
  FALLBACK_PLANS,
  getAvailablePlans,
  PRODUCT_IDS,
  purchasePlan,
  restoreBillingPurchases,
} from "../Components/utils/BillingService";
import { goBack } from "../Components/utils/navigation";

const PRO_BENEFITS = [
  { icon: "infinite-outline", title: "Unlimited AI Itineraries", desc: "Generate as many custom trips as you want without trip limits." },
  { icon: "calendar-outline", title: "7+ Day & Multi-City Routes", desc: "Unlock extended 6–30 day journeys and 3+ city itineraries." },
  { icon: "flash-outline", title: "Priority Multi-Agent Planning", desc: "Deep logistics, verified stays, budget rebalancing, and route maps." },
  { icon: "document-text-outline", title: "Offline Vault & PDF Export", desc: "Export crisp passes and keep your itineraries ready anywhere." },
];

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const ctx = useContext(CreateTripContext);
  const entitlements = ctx?.entitlements;
  const refreshEntitlements = ctx?.refreshEntitlements;

  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [selectedId, setSelectedId] = useState(PRODUCT_IDS.PRO_YEARLY);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fetched = await getAvailablePlans();
        if (active && Array.isArray(fetched) && fetched.length) setPlans(fetched);
      } finally {
        if (active) setLoadingPlans(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedId) || plans[0];

  const handlePurchase = async () => {
    if (!selectedPlan || purchasing) return;
    setPurchasing(true);
    try {
      const res = await purchasePlan(selectedPlan);
      if (res.cancelled) return;
      if (!res.ok) {
        Alert.alert("Purchase Notice", res.error || "Could not complete purchase.");
        return;
      }
      // Never trust client callback alone: re-fetch entitlements from the backend source of truth.
      const updated = await refreshEntitlements?.();
      if (updated?.is_pro_active || (updated?.pack_credits || 0) > 0) {
        Alert.alert("Welcome to GoGuide Pro!", "Your plan is active and unlocked.", [
          { text: "Continue", onPress: () => goBack(router) },
        ]);
      } else {
        Alert.alert(
          "Purchase Received",
          "Your purchase is syncing with our server. Your Pro benefits will appear within a moment."
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restoreBillingPurchases();
      if (!res.ok) {
        Alert.alert("Restore Purchases", res.error || "No active purchases found.");
        return;
      }
      const updated = await refreshEntitlements?.();
      if (updated?.is_pro_active || (updated?.pack_credits || 0) > 0) {
        Alert.alert("Purchases Restored", "Your GoGuide Pro access is active!", [
          { text: "Continue", onPress: () => goBack(router) },
        ]);
      } else {
        Alert.alert("Restore Complete", "No active Pro subscription was found for this account.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const reasonBanner =
    params?.reason === "free_days_limit"
      ? "Free plans support up to 5 days. Upgrade to Pro for 7+ day itineraries."
      : params?.reason === "free_cities_limit"
      ? "Free plans support up to 2 cities. Upgrade to Pro for multi-city routes."
      : params?.reason === "free_limit_reached"
      ? "You've used all 10 free AI trips. Upgrade to keep planning without limits!"
      : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="GoGuide Pro"
        subtitle="Unlimited AI travel planning"
        onBack={() => goBack(router)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
      >
        {reasonBanner ? (
          <View style={[styles.reasonBanner, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}>
            <Ionicons name="sparkles" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.reasonText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              {reasonBanner}
            </Text>
          </View>
        ) : null}

        {entitlements?.is_pro_active ? (
          <View style={[styles.activeCard, { backgroundColor: theme.isDark ? Palette.successBgDark : Palette.mintLight, borderColor: Palette.emerald }]}>
            <Ionicons name="checkmark-circle" size={22} color={Palette.emerald} />
            <Text style={[styles.activeTitle, { color: theme.isDark ? Palette.mint : Palette.successTextDark }]} maxFontSizeMultiplier={1.3}>
              GoGuide Pro is Active ({entitlements.plan_type === "pro_yearly" ? "Annual" : "Monthly"})
            </Text>
          </View>
        ) : null}

        {/* Benefits */}
        <View style={[styles.benefitsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {PRO_BENEFITS.map((b, idx) => (
            <View key={b.title} style={[styles.benefitRow, idx < PRO_BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.badgeBg }]}>
                <Ionicons name={b.icon} size={20} color={theme.primary} />
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={[styles.benefitTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{b.title}</Text>
                <Text style={[styles.benefitDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan Selector */}
        <Text style={[styles.sectionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
          Choose Your Plan
        </Text>

        {loadingPlans ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.lg }} />
        ) : (
          plans.map((plan) => {
            const isSelected = plan.id === selectedId;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedId(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.planLeft}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                      {plan.title}
                    </Text>
                    {plan.badge ? (
                      <View style={[styles.planBadge, { backgroundColor: plan.badge === "BEST VALUE" ? Palette.purple : theme.primary }]}>
                        <Text style={styles.planBadgeText} maxFontSizeMultiplier={1.2}>{plan.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.planSub, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    {plan.subtitle}
                  </Text>
                </View>
                <Text style={[styles.planPrice, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
                  {plan.priceString}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || Boolean(entitlements?.is_pro_active)}
          style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Continue with ${selectedPlan?.title || "Pro"}`}
        >
          {purchasing ? (
            <ActivityIndicator color={Palette.white} />
          ) : (
            <Text style={styles.ctaBtnText} maxFontSizeMultiplier={1.3}>
              {entitlements?.is_pro_active ? "Pro Active" : `Continue — ${selectedPlan?.priceString || ""}`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Purchases (Required for Google Play compliance) */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
          accessibilityRole="button"
          accessibilityLabel="Restore Purchases"
        >
          <Text style={[styles.restoreText, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
            {restoring ? "Restoring..." : "Restore Purchases"}
          </Text>
        </TouchableOpacity>

        {/* Legal Links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => router.push("/terms-of-service")} style={styles.legalBtn}>
            <Text style={[styles.legalText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[styles.legalSep, { color: theme.subtext }]}>•</Text>
          <TouchableOpacity onPress={() => router.push("/privacy-policy")} style={styles.legalBtn}>
            <Text style={[styles.legalText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  reasonBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  reasonText: {
    flex: 1,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontMedium,
  },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  activeTitle: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBold,
    flex: 1,
  },
  benefitsCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextWrap: { flex: 1 },
  benefitTitle: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBold,
  },
  benefitDesc: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontRegular,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.sizeLg,
    fontFamily: Typography.fontBold,
    marginBottom: Spacing.md,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: Radius.card,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  planLeft: { flex: 1 },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  planTitle: {
    fontSize: Typography.sizeBase,
    fontFamily: Typography.fontBold,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  planBadgeText: {
    color: Palette.white,
    fontSize: 10,
    fontFamily: Typography.fontBold,
    letterSpacing: 0.5,
  },
  planSub: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontRegular,
    marginTop: 4,
  },
  planPrice: {
    fontSize: Typography.sizeBase,
    fontFamily: Typography.fontBold,
  },
  ctaBtn: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  ctaBtnText: {
    color: Palette.white,
    fontSize: Typography.sizeBase,
    fontFamily: Typography.fontBold,
  },
  restoreBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  restoreText: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontMedium,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: Spacing.xs,
  },
  legalBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  legalText: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontRegular,
  },
  legalSep: {
    fontSize: Typography.sizeSm,
  },
});

