import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette, Spacing, Typography, useTheme } from "../constants/theme";

/** Small "Verified on map" pill shown on stops that were found on OpenStreetMap (or are in a curated plan). */
export default function VerifiedTag({ style }) {
  const theme = useTheme();
  const color = theme.isDark ? Palette.successLight : Palette.successDark;
  return (
    <View
      style={[styles.wrap, { backgroundColor: theme.isDark ? "rgba(52, 211, 153, 0.14)" : "rgba(4, 120, 87, 0.10)" }, style]}
      accessible
      accessibilityLabel="Place verified on the map"
    >
      <Ionicons name="checkmark-circle" size={14} color={color} />
      <Text style={[styles.text, { color }]} maxFontSizeMultiplier={1.3}>Verified on map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 2,
  },
  text: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
});
