import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/constants";
import { Radius, Spacing, Typography, useTheme } from "../constants/theme";
import { TouchableOpacity } from "./Touchable";

/**
 * The My Bookings empty-state pattern, reusable: icon, title, text and an optional accent action.
 * Also used for error/offline (pass icon="cloud-offline-outline", actionLabel="Try again").
 */
export default function EmptyState({ icon = "compass-outline", title, text, actionLabel, onAction, secondaryLabel, onSecondary, style }) {
  const theme = useTheme();
  const accent = Colors.PRIMARY || "#0A7EA4";
  return (
    <View style={[styles.wrap, style]} accessibilityRole="summary">
      <View style={[styles.iconCircle, { backgroundColor: theme.isDark ? "rgba(10,126,164,0.18)" : "rgba(10,126,164,0.10)" }]}>
        <Ionicons name={icon} size={34} color={accent} />
      </View>
      <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{title}</Text>
      {text ? <Text style={[styles.text, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{text}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={secondaryLabel} onPress={onSecondary} style={[styles.secondaryBtn, { borderColor: theme.border }]}>
          <Text style={[styles.secondaryText, { color: theme.text }]}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl * 1.5 },
  iconCircle: { width: 72, height: 72, borderRadius: Radius.full, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  title: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold, textAlign: "center" },
  text: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, textAlign: "center", marginTop: 6, lineHeight: 20 },
  primaryBtn: { minHeight: 48, minWidth: 180, paddingHorizontal: 22, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center", marginTop: Spacing.xl },
  primaryText: { color: "#FFFFFF", fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  secondaryBtn: { minHeight: 44, paddingHorizontal: 20, borderRadius: Radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  secondaryText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
});
