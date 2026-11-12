import React, { useEffect, useMemo } from "react";
import { Animated, Platform, View } from "react-native";
import { Radius, useTheme } from "../constants/theme";
import useReduceMotion from "../../hooks/useReduceMotion";

/** Pulsing placeholder block. Static (no pulse) when reduce-motion is on. */
export function Skeleton({ width = "100%", height = 16, radius = Radius.md, style }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const pulse = useMemo(() => new Animated.Value(0.55), []);

  useEffect(() => {
    if (reduce) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 0.55, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, opacity: pulse, backgroundColor: theme.isDark ? "#243044" : "#E2E8F0" },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton: image block + two text lines. */
export function SkeletonCard({ imageHeight = 140, style }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={[
        { borderRadius: Radius.card, borderWidth: 1, padding: 12, gap: 10, backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      <Skeleton height={imageHeight} radius={Radius.md} />
      <Skeleton width="70%" height={16} />
      <Skeleton width="45%" height={12} />
    </View>
  );
}

export default Skeleton;
