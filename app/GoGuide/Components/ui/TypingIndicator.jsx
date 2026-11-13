import React, { useEffect, useMemo } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { Radius, Spacing } from "../constants/theme";

const DOT_COUNT = 3;
const AI_ACCENT = "#7C3AED"; // AI feature highlight (UI_GUIDELINES)

/**
 * Three-dot typing indicator rendered inside an AI-style bubble.
 * Dots bounce in a staggered wave; with reduce-motion they stay static.
 */
export default function TypingIndicator({ theme }) {
  const reduce = useReduceMotion();
  const anims = useMemo(() => Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)), []);

  useEffect(() => {
    if (reduce) {
      anims.forEach((a) => a.setValue(0));
      return undefined;
    }
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(a, { toValue: -5, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(a, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
          Animated.delay(300),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce, anims]);

  return (
    <View
      style={[styles.bubble, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessible
      accessibilityLabel="GoGuide is typing"
      accessibilityLiveRegion="polite"
    >
      {anims.map((a, i) => (
        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: a }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs + 1,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.card,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: AI_ACCENT,
  },
});
