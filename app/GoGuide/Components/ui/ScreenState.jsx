import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import Touchable from "./Touchable";
import { Colors } from "../constants/constants";
import { useTheme, Palette } from "../constants/theme";

/** Shared Loading / Error (retry) / Empty states. */
export default function ScreenState({ loading, error, empty, onRetry, emptyText = "Nothing here yet.", children, color = Colors.PRIMARY }) {
  const theme = useTheme();
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Something went wrong</Text>
        <Text style={[styles.sub, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
          {typeof error === "string" ? error : "Please check your connection and try again."}
        </Text>
        {onRetry ? (
          <Touchable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" style={[styles.btn, { backgroundColor: color }]}>
            <Text style={styles.btnText}>Retry</Text>
          </Touchable>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={[styles.sub, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{emptyText}</Text>
      </View>
    );
  }
  return children ?? null;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 18, fontFamily: "Outfit-Bold", marginBottom: 6, color: Palette.slate500, textAlign: "center" },
  sub: { fontSize: 14, color: Palette.slate500, textAlign: "center", marginBottom: 12, flexShrink: 1 },
  btn: { minHeight: 48, minWidth: 120, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { color: Palette.white, fontFamily: "Outfit-Bold", fontSize: 15, includeFontPadding: false },
});
