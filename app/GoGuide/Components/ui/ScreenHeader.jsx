import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/constants";
import { Radius, Spacing, Typography, useTheme, Palette } from "../constants/theme";
import { TouchableOpacity } from "./Touchable";

/**
 * Universal ScreenHeader matching the golden reference standard of "My Bookings" & "Safety Alerts".
 * Reused across all sub-screens, profile sub-pages, and utility views.
 *
 * @param {string} title - Main header title (rendered in signature teal-blue accent)
 * @param {string} [subtitle] - Contextual subtitle underneath title
 * @param {() => void} [onBack] - Custom back handler (defaults to router.back())
 * @param {React.ReactNode} [rightAction] - Slot for action button on right edge
 * @param {string|number} [badgeText] - Optional badge pill next to title
 * @param {object} [style] - Custom container style overrides
 */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  badgeText,
  style,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();

  const activeAccent = Colors.PRIMARY || "#0A7EA4";
  // Pages opened from a link or after a refresh have no history: fall back to Home instead of a dead button.
  const handleBack =
    onBack || (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/mytrip")));

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 0) + 4,
          backgroundColor: theme.header || (theme.isDark ? "#0B0F17" : Palette.white),
          borderBottomColor: theme.headerBorder || (theme.isDark ? "#20202F" : Palette.slate200),
        },
        style,
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBack}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={activeAccent} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.headerTitle, { color: activeAccent }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badgeText !== undefined && badgeText !== null && (
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: theme.isDark
                    ? "rgba(10, 126, 164, 0.22)"
                    : "rgba(10, 126, 164, 0.12)",
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: activeAccent }]}>
                {badgeText}
              </Text>
            </View>
          )}
        </View>

        {subtitle ? (
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.isDark ? Palette.slate400 : Palette.slate500 },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? (
        <View style={styles.rightActionWrap}>{rightAction}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: Typography.sizeXl,
    fontFamily: Typography.fontBold,
  },
  headerSubtitle: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontRegular,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  badgeText: {
    fontSize: Typography.sizeXs,
    fontFamily: Typography.fontBold,
  },
  rightActionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

