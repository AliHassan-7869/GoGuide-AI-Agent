import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import Touchable from "./Touchable";

/** Shared Loading / Error (retry) / Empty states. */
export default function ScreenState({ loading, error, empty, onRetry, emptyText = "Nothing here yet.", children, color = "#7C3AED" }) {
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
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>Something went wrong</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.3}>
          {typeof error === "string" ? error : "Please check your connection and try again."}
        </Text>
        {onRetry ? (
          <Touchable onPress={onRetry} style={[styles.btn, { backgroundColor: color }]}>
            <Text style={styles.btnText}>Retry</Text>
          </Touchable>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.sub} maxFontSizeMultiplier={1.3}>{emptyText}</Text>
      </View>
    );
  }
  return children ?? null;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 18, fontFamily: "Outfit-Bold", marginBottom: 6, color: "#64748B", textAlign: "center" },
  sub: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 12, flexShrink: 1 },
  btn: { minHeight: 48, minWidth: 120, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { color: "#fff", fontFamily: "Outfit-Bold", fontSize: 15, includeFontPadding: false },
});
