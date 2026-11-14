import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Spacing, Typography } from "../constants/theme";

/**
 * One flight leg (going or returning). Built so nothing can run outside the card on narrow Android screens:
 * every text sits on its own full-width line (or in a flexible middle column), so long labels, dates,
 * airline codes and stop descriptions wrap instead of being pushed off the edge.
 */
export default function FlightLegCard({
  label,
  flightCode,
  route,
  depTime,
  arrTime,
  stops,
  footer,
  accent,
  backgroundColor,
  labelColor,
  titleColor,
  subColor,
}) {
  return (
    <View style={[styles.card, { backgroundColor, borderLeftColor: accent }]}>
      <Text style={[styles.label, { color: labelColor || accent }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      {flightCode ? (
        <Text style={[styles.code, { color: subColor }]} maxFontSizeMultiplier={1.3}>
          {flightCode}
        </Text>
      ) : null}
      <Text style={[styles.route, { color: titleColor }]} maxFontSizeMultiplier={1.3}>
        {route}
      </Text>
      <View style={styles.timesRow}>
        <Text style={[styles.time, { color: titleColor }]} maxFontSizeMultiplier={1.3}>
          {depTime}
        </Text>
        <View style={styles.middle}>
          <Text style={[styles.stops, { color: subColor }]} maxFontSizeMultiplier={1.3}>
            {stops}
          </Text>
          <View style={[styles.line, { backgroundColor: subColor }]} />
        </View>
        <Text style={[styles.time, { color: titleColor }]} maxFontSizeMultiplier={1.3}>
          {arrTime}
        </Text>
      </View>
      {footer ? (
        <Text style={[styles.footer, { color: subColor }]} maxFontSizeMultiplier={1.3}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.sm + 2,
    borderLeftWidth: 3,
    overflow: "hidden",
  },
  label: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, textTransform: "uppercase", flexShrink: 1 },
  code: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, marginTop: 2, flexShrink: 1 },
  route: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold, marginTop: 6, flexShrink: 1 },
  timesRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: Spacing.sm },
  time: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold, flexShrink: 0 },
  middle: { flex: 1, minWidth: 0, alignItems: "center" },
  stops: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, textAlign: "center", flexShrink: 1 },
  line: { height: 1, alignSelf: "stretch", marginTop: 4, opacity: 0.35 },
  footer: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 8, flexShrink: 1 },
});
