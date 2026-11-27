import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Palette, Radius, Spacing, Typography, useTheme } from "../constants/theme";
import { TouchableOpacity } from "./Touchable";

/**
 * Compact quota status pill ("2 of 2 guest trips left", "7 of 10 free trips left", or "Pro Unlimited").
 * Tapping opens Account Link Modal (guest) or Paywall (free/upgrade).
 */
export default function QuotaBadge({ entitlements, onPress, style }) {
  const theme = useTheme();
  if (!entitlements) return null;

  const isPro = Boolean(entitlements.is_pro_active);
  const isAnon = Boolean(entitlements.is_anonymous);
  const limit = Number(entitlements.free_trips_limit || (isAnon ? 2 : 10));
  const remaining = Math.max(0, Number(entitlements.remaining_free_trips ?? limit - (entitlements.trips_used || 0)));
  const pack = Math.max(0, Number(entitlements.pack_credits || 0));

  let label = "";
  let icon = "sparkles-outline";
  let accent = theme.primary;

  if (isPro) {
    label = "Pro Unlimited";
    icon = "diamond";
    accent = Palette.purple;
  } else if (remaining > 0) {
    label = isAnon
      ? `${remaining} of ${limit} guest trips left`
      : `${remaining} of ${limit} free trips left`;
    icon = remaining <= 1 ? "alert-circle-outline" : "sparkles-outline";
    accent = remaining <= 1 ? Palette.warning : theme.primary;
  } else if (pack > 0) {
    label = `${pack} pack credit${pack === 1 ? "" : "s"} left`;
    icon = "ticket-outline";
    accent = Palette.success;
  } else {
    label = isAnon ? "Unlock 8 more free trips" : "Upgrade to Pro";
    icon = "lock-open-outline";
    accent = Palette.purple;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.pill,
        {
          backgroundColor: theme.isDark ? theme.card : Palette.slate50,
          borderColor: accent,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={14} color={accent} style={styles.icon} />
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      {!isPro && onPress ? (
        <View style={[styles.ctaDot, { backgroundColor: accent }]}>
          <Ionicons name="chevron-forward" size={11} color={Palette.white} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 34,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontMedium,
    flexShrink: 1,
  },
  ctaDot: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});

